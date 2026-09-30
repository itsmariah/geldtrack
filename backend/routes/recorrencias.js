const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { reorderHandler, ORDEM_MANUAL } = require('../utils/reorderLista');
const { validateRecorrenciaInput } = require('../utils/validateRecorrencia');
const { serializeRecorrencia, serializeRecorrencias } = require('../utils/serializeRecorrencia');
const { ensureOccurrences } = require('../utils/materializeRecorrencias');

const router = express.Router();
router.use(authMiddleware);

// Mesmo limite geral usado em /transactions, /metas e /orcamentos, por usuário (não por IP)
const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
router.use(dataLimiter);

// Confere que a conta existe e pertence à família do token (evita atribuir uma
// recorrência a uma conta de outra família via IDOR).
async function contaPertenceAFamilia(familiaId, contaId) {
  if (!contaId) return false;
  const conta = await prisma.conta.findFirst({ where: { id: Number(contaId), familiaId } });
  return Boolean(conta);
}

// Listar recorrências da família — materializa antes qualquer ocorrência já vencida
router.get('/', async (req, res) => {
  try {
    await ensureOccurrences(req.familiaId);
    const recorrencias = await prisma.recorrencia.findMany({
      where: { familiaId: req.familiaId },
      orderBy: ORDEM_MANUAL,
    });
    res.json(serializeRecorrencias(recorrencias));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar recorrências' });
  }
});

// Reordenar (arrastar e soltar na tela) — recebe { ids } com a lista inteira na nova
// ordem. Declarado antes de /:id pra "reorder" não ser capturado como id.
router.put('/reorder', reorderHandler('recorrencia', 'Erro ao reordenar recorrências'));

// Criar recorrência
router.post('/', async (req, res) => {
  try {
    const { tipo, valor, categoria, descricao, diaDoMes, dataInicio, dataFim, contaId } = req.body;

    const validationError = validateRecorrenciaInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    if (!(await contaPertenceAFamilia(req.familiaId, contaId))) {
      return res.status(400).json({ error: 'Conta inválida' });
    }

    const created = await prisma.recorrencia.create({
      data: {
        usuarioId: req.userId,
        familiaId: req.familiaId,
        contaId: Number(contaId),
        tipo,
        valor: Number(valor),
        categoria,
        descricao: descricao || '',
        diaDoMes: Number(diaDoMes),
        dataInicio,
        dataFim: dataFim || null,
      },
    });

    // Se dataInicio já é passado/hoje, gera de imediato as ocorrências já vencidas.
    await ensureOccurrences(req.familiaId);

    res.status(201).json(serializeRecorrencia(created));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar recorrência' });
  }
});

// Editar recorrência — dataInicio não pode mudar (é a âncora de tudo já gerado)
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { tipo, valor, categoria, descricao, diaDoMes, dataFim, ativa, contaId } = req.body;

    const existing = await prisma.recorrencia.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Recorrência não encontrada' });

    const validationError = validateRecorrenciaInput({ tipo, valor, categoria, diaDoMes, dataInicio: existing.dataInicio, dataFim, contaId });
    if (validationError) return res.status(400).json({ error: validationError });
    if (!(await contaPertenceAFamilia(req.familiaId, contaId))) {
      return res.status(400).json({ error: 'Conta inválida' });
    }

    const updated = await prisma.recorrencia.update({
      where: { id },
      data: {
        tipo,
        valor: Number(valor),
        categoria,
        descricao: descricao || '',
        diaDoMes: Number(diaDoMes),
        dataFim: dataFim || null,
        ativa: ativa === undefined ? existing.ativa : Boolean(ativa),
        contaId: Number(contaId),
      },
    });

    if (updated.ativa) await ensureOccurrences(req.familiaId);

    res.json(serializeRecorrencia(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar recorrência' });
  }
});

// Excluir recorrência — as transações já geradas por ela permanecem (recorrenciaId vira null)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.recorrencia.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Recorrência não encontrada' });

    await prisma.recorrencia.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir recorrência' });
  }
});

module.exports = router;
