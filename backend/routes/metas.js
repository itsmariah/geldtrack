const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { reorderHandler, ORDEM_MANUAL } = require('../utils/reorderLista');
const { validateMetaInput, validateAporteInput } = require('../utils/validateMeta');
const { serializeMeta, serializeMetas } = require('../utils/serializeMeta');

const router = express.Router();
router.use(authMiddleware);

// Mesmo limite geral usado em /transactions, por usuário autenticado (não por IP)
const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
router.use(dataLimiter);

const metaInclude = { aportes: { orderBy: [{ data: 'desc' }, { createdAt: 'desc' }] } };

// Listar metas da família
router.get('/', async (req, res) => {
  try {
    const metas = await prisma.meta.findMany({
      where: { familiaId: req.familiaId },
      include: metaInclude,
      orderBy: ORDEM_MANUAL,
    });
    res.json(serializeMetas(metas));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar metas' });
  }
});

// Reordenar (arrastar e soltar na tela) — recebe { ids } com a lista inteira na nova
// ordem. Declarado antes de /:id pra "reorder" não ser capturado como id.
router.put('/reorder', reorderHandler('meta', 'Erro ao reordenar metas'));

// Criar meta
router.post('/', async (req, res) => {
  try {
    const { titulo, valorAlvo, prazo } = req.body;

    const validationError = validateMetaInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const created = await prisma.meta.create({
      data: {
        usuarioId: req.userId,
        familiaId: req.familiaId,
        titulo: titulo.trim(),
        valorAlvo: Number(valorAlvo),
        prazo: prazo || null,
      },
      include: metaInclude,
    });
    res.status(201).json(serializeMeta(created));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

// Editar meta
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { titulo, valorAlvo, prazo } = req.body;

    const existing = await prisma.meta.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Meta não encontrada' });

    const validationError = validateMetaInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const updated = await prisma.meta.update({
      where: { id },
      data: { titulo: titulo.trim(), valorAlvo: Number(valorAlvo), prazo: prazo || null },
      include: metaInclude,
    });
    res.json(serializeMeta(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

// Excluir meta (cascata apaga os aportes junto)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.meta.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Meta não encontrada' });

    await prisma.meta.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir meta' });
  }
});

// Adicionar aporte a uma meta
router.post('/:id/aportes', async (req, res) => {
  try {
    const metaId = Number(req.params.id);
    const { valor, data, descricao } = req.body;

    const meta = await prisma.meta.findFirst({ where: { id: metaId, familiaId: req.familiaId } });
    if (!meta) return res.status(404).json({ error: 'Meta não encontrada' });

    const validationError = validateAporteInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    await prisma.aporte.create({
      data: { metaId, valor: Number(valor), data, descricao: descricao || '' },
    });

    const updated = await prisma.meta.findFirst({ where: { id: metaId }, include: metaInclude });
    res.status(201).json(serializeMeta(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar aporte' });
  }
});

// Remover um aporte (ex: lançado por engano)
router.delete('/:id/aportes/:aporteId', async (req, res) => {
  try {
    const metaId = Number(req.params.id);
    const aporteId = Number(req.params.aporteId);

    // Confere posse pela Meta (Aporte não guarda familiaId próprio) — evita IDOR via aporteId de outra família.
    const aporte = await prisma.aporte.findFirst({ where: { id: aporteId, metaId, meta: { familiaId: req.familiaId } } });
    if (!aporte) return res.status(404).json({ error: 'Aporte não encontrado' });

    await prisma.aporte.delete({ where: { id: aporteId } });

    const updated = await prisma.meta.findFirst({ where: { id: metaId }, include: metaInclude });
    res.json(serializeMeta(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover aporte' });
  }
});

module.exports = router;
