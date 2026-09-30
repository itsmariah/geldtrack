const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { reorderHandler, ORDEM_MANUAL } = require('../utils/reorderLista');
const { validateEventoInput } = require('../utils/validateEvento');
const { serializeEvento, serializeEventos, withProgress } = require('../utils/serializeEvento');

const router = express.Router();
router.use(authMiddleware);

// Mesmo limite geral usado em /transactions, /orcamentos e /metas, por usuário autenticado
const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
router.use(dataLimiter);

// Soma gasto (despesa) e recebido (receita) por evento a partir das Transacoes vinculadas.
async function gastoRecebidoPorEvento(familiaId, eventoIds) {
  if (eventoIds.length === 0) return {};
  const rows = await prisma.transacao.groupBy({
    by: ['eventoId', 'tipo'],
    where: { familiaId, eventoId: { in: eventoIds } },
    _sum: { valor: true },
  });
  const map = {};
  for (const id of eventoIds) map[id] = { gasto: 0, recebido: 0 };
  for (const row of rows) {
    const valor = Number(row._sum.valor || 0);
    if (row.tipo === 'despesa') map[row.eventoId].gasto = valor;
    else if (row.tipo === 'receita') map[row.eventoId].recebido = valor;
  }
  return map;
}

// Listar eventos da família (ativos e encerrados), com gasto/recebido acumulados
router.get('/', async (req, res) => {
  try {
    const eventos = await prisma.evento.findMany({
      where: { familiaId: req.familiaId },
      orderBy: ORDEM_MANUAL,
    });
    const somas = await gastoRecebidoPorEvento(req.familiaId, eventos.map(e => e.id));
    const result = serializeEventos(eventos).map(e => withProgress(e, somas[e.id] || { gasto: 0, recebido: 0 }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar eventos' });
  }
});

// Detalhe de um evento com gasto/recebido acumulados
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const evento = await prisma.evento.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });

    const somas = await gastoRecebidoPorEvento(req.familiaId, [id]);
    res.json(withProgress(serializeEvento(evento), somas[id] || { gasto: 0, recebido: 0 }));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar evento' });
  }
});

// Reordenar (arrastar e soltar na tela) — recebe { ids } com a lista inteira na nova
// ordem. Declarado antes de /:id pra "reorder" não ser capturado como id.
router.put('/reorder', reorderHandler('evento', 'Erro ao reordenar eventos'));

// Criar evento — status sempre nasce "ativo", nunca aceito do cliente
router.post('/', async (req, res) => {
  try {
    const { nome, dataInicio, dataFim, orcamento } = req.body;

    const validationError = validateEventoInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const orcamentoInformado = orcamento !== undefined && orcamento !== null && orcamento !== '';
    const created = await prisma.evento.create({
      data: {
        usuarioId: req.userId,
        familiaId: req.familiaId,
        nome,
        dataInicio,
        dataFim: dataFim || null,
        orcamento: orcamentoInformado ? Number(orcamento) : null,
        status: 'ativo',
      },
    });
    res.status(201).json(withProgress(serializeEvento(created), { gasto: 0, recebido: 0 }));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar evento' });
  }
});

// Editar evento — não mexe em status (ver POST /:id/fechar e /:id/reabrir)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, dataInicio, dataFim, orcamento } = req.body;

    const existing = await prisma.evento.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });

    const validationError = validateEventoInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const orcamentoInformado = orcamento !== undefined && orcamento !== null && orcamento !== '';
    const updated = await prisma.evento.update({
      where: { id },
      data: {
        nome,
        dataInicio,
        dataFim: dataFim || null,
        orcamento: orcamentoInformado ? Number(orcamento) : null,
      },
    });
    const somas = await gastoRecebidoPorEvento(req.familiaId, [id]);
    res.json(withProgress(serializeEvento(updated), somas[id] || { gasto: 0, recebido: 0 }));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar evento' });
  }
});

// Encerrar evento — some do seletor de novas transações, mas não desvincula nada
router.post('/:id/fechar', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.evento.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });

    const updated = await prisma.evento.update({ where: { id }, data: { status: 'encerrado' } });
    res.json(serializeEvento(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao encerrar evento' });
  }
});

// Reabrir evento encerrado
router.post('/:id/reabrir', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.evento.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });

    const updated = await prisma.evento.update({ where: { id }, data: { status: 'ativo' } });
    res.json(serializeEvento(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reabrir evento' });
  }
});

// Excluir evento — as transações vinculadas sobrevivem com eventoId: null (onDelete: SetNull)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.evento.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Evento não encontrado' });

    await prisma.evento.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir evento' });
  }
});

module.exports = router;
