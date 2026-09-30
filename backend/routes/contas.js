const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { validateContaInput } = require('../utils/validateConta');
const { serializeConta, serializeContas, withSaldo } = require('../utils/serializeConta');

const router = express.Router();
router.use(authMiddleware);

// Mesmo limite geral usado em /transactions, /metas, /orcamentos e /recorrencias
const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
router.use(dataLimiter);

// Listar contas da família com o saldo atual de cada uma
router.get('/', async (req, res) => {
  try {
    const contas = await prisma.conta.findMany({ where: { familiaId: req.familiaId }, orderBy: { createdAt: 'asc' } });
    if (contas.length === 0) return res.json([]);

    const contaIds = contas.map(c => c.id);
    // Entrada de transferência soma valorDestino quando ele existe (moedas diferentes) e
    // valor quando é nulo (mesma moeda) — daí as duas consultas separadas pro destino.
    const [porTipo, saidas, entradasMesmaMoeda, entradasCambio] = await Promise.all([
      prisma.transacao.groupBy({ by: ['contaId', 'tipo'], where: { contaId: { in: contaIds } }, _sum: { valor: true } }),
      prisma.transferencia.groupBy({ by: ['contaOrigemId'], where: { contaOrigemId: { in: contaIds } }, _sum: { valor: true } }),
      prisma.transferencia.groupBy({ by: ['contaDestinoId'], where: { contaDestinoId: { in: contaIds }, valorDestino: null }, _sum: { valor: true } }),
      prisma.transferencia.groupBy({ by: ['contaDestinoId'], where: { contaDestinoId: { in: contaIds }, valorDestino: { not: null } }, _sum: { valorDestino: true } }),
    ]);

    const movimento = {};
    for (const id of contaIds) movimento[id] = 0;
    for (const row of porTipo) {
      const valor = Number(row._sum.valor || 0);
      movimento[row.contaId] += row.tipo === 'receita' ? valor : -valor;
    }
    for (const row of saidas) movimento[row.contaOrigemId] -= Number(row._sum.valor || 0);
    for (const row of entradasMesmaMoeda) movimento[row.contaDestinoId] += Number(row._sum.valor || 0);
    for (const row of entradasCambio) movimento[row.contaDestinoId] += Number(row._sum.valorDestino || 0);

    res.json(serializeContas(contas).map(c => withSaldo(c, movimento[c.id] || 0)));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar contas' });
  }
});

// Criar conta
router.post('/', async (req, res) => {
  try {
    const { nome, tipo, saldoInicial } = req.body;
    const moeda = req.body.moeda || 'BRL';

    const validationError = validateContaInput({ ...req.body, moeda });
    if (validationError) return res.status(400).json({ error: validationError });

    const created = await prisma.conta.create({
      data: { usuarioId: req.userId, familiaId: req.familiaId, nome: nome.trim(), tipo, moeda, saldoInicial: Number(saldoInicial) },
    });
    res.status(201).json(serializeConta(created));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// Editar conta
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, tipo, saldoInicial } = req.body;

    const existing = await prisma.conta.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Conta não encontrada' });

    const validationError = validateContaInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    // moeda nunca entra aqui, mesmo que venha no body — é fixada na criação e não pode
    // mudar depois (mudar mudaria a interpretação de toda transação já lançada na conta).
    const updated = await prisma.conta.update({
      where: { id },
      data: { nome: nome.trim(), tipo, saldoInicial: Number(saldoInicial) },
    });
    res.json(serializeConta(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
});

// Excluir conta — cascata apaga as transações e transferências dela junto (o
// modal de confirmação no frontend avisa isso). Nunca deixa a família sem nenhuma conta.
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.conta.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Conta não encontrada' });

    const total = await prisma.conta.count({ where: { familiaId: req.familiaId } });
    if (total <= 1) return res.status(400).json({ error: 'Sua família precisa ter pelo menos uma conta' });

    await prisma.conta.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

module.exports = router;
