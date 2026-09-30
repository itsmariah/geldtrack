const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { reorderHandler, ORDEM_MANUAL } = require('../utils/reorderLista');
const { validateOrcamentoInput } = require('../utils/validateOrcamento');
const { serializeOrcamento, serializeOrcamentos, withProgress } = require('../utils/serializeOrcamento');
const { getMonthDateRange } = require('../utils/reportCalculations');

const router = express.Router();
router.use(authMiddleware);

// Mesmo limite geral usado em /transactions e /metas, por usuário autenticado (não por IP)
const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
router.use(dataLimiter);

// Listar orçamentos da família com o gasto do mês pedido
router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Parâmetro month obrigatório no formato YYYY-MM' });
    }

    const orcamentos = await prisma.orcamento.findMany({
      where: { familiaId: req.familiaId },
      orderBy: ORDEM_MANUAL,
    });
    if (orcamentos.length === 0) return res.json([]);

    const { start, end } = getMonthDateRange(month);
    const gastoRows = await prisma.transacao.groupBy({
      by: ['categoria'],
      where: {
        familiaId: req.familiaId,
        tipo: 'despesa',
        data: { gte: start, lte: end },
        categoria: { in: orcamentos.map(o => o.categoria) },
      },
      _sum: { valor: true },
    });
    const gastoMap = {};
    for (const row of gastoRows) gastoMap[row.categoria] = Number(row._sum.valor || 0);

    const result = serializeOrcamentos(orcamentos).map(o => withProgress(o, gastoMap[o.categoria] || 0));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar orçamentos' });
  }
});

// Reordenar (arrastar e soltar na tela) — recebe { ids } com a lista inteira na nova
// ordem. Declarado antes de /:id pra "reorder" não ser capturado como id.
router.put('/reorder', reorderHandler('orcamento', 'Erro ao reordenar orçamentos'));

// Criar orçamento (um por categoria por família)
router.post('/', async (req, res) => {
  try {
    const { categoria, valorLimite } = req.body;

    const validationError = validateOrcamentoInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const existing = await prisma.orcamento.findFirst({ where: { familiaId: req.familiaId, categoria } });
    if (existing) return res.status(400).json({ error: 'Já existe um orçamento para esta categoria. Edite o orçamento existente.' });

    const created = await prisma.orcamento.create({
      data: { usuarioId: req.userId, familiaId: req.familiaId, categoria, valorLimite: Number(valorLimite) },
    });
    res.status(201).json(serializeOrcamento(created));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar orçamento' });
  }
});

// Editar orçamento
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { categoria, valorLimite } = req.body;

    const existing = await prisma.orcamento.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Orçamento não encontrado' });

    const validationError = validateOrcamentoInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    if (categoria !== existing.categoria) {
      const conflict = await prisma.orcamento.findFirst({ where: { familiaId: req.familiaId, categoria, NOT: { id } } });
      if (conflict) return res.status(400).json({ error: 'Já existe um orçamento para esta categoria.' });
    }

    const updated = await prisma.orcamento.update({
      where: { id },
      data: { categoria, valorLimite: Number(valorLimite) },
    });
    res.json(serializeOrcamento(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar orçamento' });
  }
});

// Excluir orçamento
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.orcamento.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Orçamento não encontrado' });

    await prisma.orcamento.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir orçamento' });
  }
});

module.exports = router;
