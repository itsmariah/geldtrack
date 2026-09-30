const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { validateTransferenciaInput } = require('../utils/validateTransferencia');
const { serializeTransferencia, serializeTransferencias } = require('../utils/serializeTransferencia');

const router = express.Router();
router.use(authMiddleware);

const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
router.use(dataLimiter);

const transferenciaInclude = { contaOrigem: { select: { nome: true, moeda: true } }, contaDestino: { select: { nome: true, moeda: true } } };

// Listar transferências da família
router.get('/', async (req, res) => {
  try {
    const transferencias = await prisma.transferencia.findMany({
      where: { familiaId: req.familiaId },
      include: transferenciaInclude,
      orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(serializeTransferencias(transferencias));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar transferências' });
  }
});

// Criar transferência entre duas contas da família
router.post('/', async (req, res) => {
  try {
    const { contaOrigemId, contaDestinoId, valor, valorDestino, data, descricao } = req.body;

    const validationError = validateTransferenciaInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const contas = await prisma.conta.findMany({
      where: { familiaId: req.familiaId, id: { in: [Number(contaOrigemId), Number(contaDestinoId)] } },
    });
    if (contas.length !== 2) return res.status(400).json({ error: 'Conta de origem ou destino inválida' });

    // Entre moedas diferentes o usuário informa quanto chegou no destino (valorDestino) —
    // o app nunca inventa o câmbio pela cotação, porque o real já vem com spread/IOF/taxas.
    // Na mesma moeda, valorDestino é descartado: chegou exatamente o que saiu.
    const moedasDiferentes = contas[0].moeda !== contas[1].moeda;
    if (moedasDiferentes && !(Number(valorDestino) > 0)) {
      return res.status(400).json({ error: 'Informe o valor recebido na conta de destino' });
    }

    const created = await prisma.transferencia.create({
      data: {
        usuarioId: req.userId,
        familiaId: req.familiaId,
        contaOrigemId: Number(contaOrigemId),
        contaDestinoId: Number(contaDestinoId),
        valor: Number(valor),
        valorDestino: moedasDiferentes ? Number(valorDestino) : null,
        data,
        descricao: descricao || '',
      },
      include: transferenciaInclude,
    });
    res.status(201).json(serializeTransferencia(created));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar transferência' });
  }
});

// Excluir transferência (desfaz o movimento entre as contas)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.transferencia.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Transferência não encontrada' });

    await prisma.transferencia.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir transferência' });
  }
});

module.exports = router;
