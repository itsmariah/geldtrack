const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { validateTransactionInput } = require('../utils/validateTransaction');
const { validateAnexoInput } = require('../utils/validateAnexo');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { serializeTransaction, serializeTransactions } = require('../utils/serializeTransaction');
const { buildTransactionWhere } = require('../utils/buildTransactionWhere');
const { buildTransactionsCsv } = require('../utils/csvExport');
const { ensureOccurrences } = require('../utils/materializeRecorrencias');
const { TRANSACAO_SELECT_SEM_ANEXO } = require('../utils/transactionSelect');
const { buildTransactionDiff } = require('../utils/buildTransactionDiff');
const { notifyOrcamentoEstouradoSeNecessario } = require('../utils/notifyOrcamentoEstourado');
const { reorderDia } = require('../utils/reorderDia');
const { proximaOrdemDoDia } = require('../utils/proximaOrdemDoDia');

// Fire-and-forget (mesmo padrão do e-mail de reset de senha em auth.js): a resposta da
// rota não deve esperar o envio de e-mail, e uma falha aqui não pode derrubar a requisição.
function dispararAvisoOrcamentoSeDespesa(familiaId, transacao) {
  if (transacao.tipo !== 'despesa') return;
  notifyOrcamentoEstouradoSeNecessario(familiaId, transacao.categoria, transacao.data).catch(err => {
    console.error('Erro ao verificar orçamento estourado:', err.message);
  });
}

const router = express.Router();
router.use(authMiddleware);

const MAX_BULK_ITEMS = 500;

// Mesma ordem em toda listagem (Dashboard, export, evento): dia mais recente primeiro;
// dentro do dia, a ordem manual (drag-and-drop) e, no empate, a mais recente primeiro.
const ORDEM_LISTAGEM = [{ data: 'desc' }, { ordem: 'desc' }, { createdAt: 'desc' }];

// Confere que a conta existe e pertence à família do token (evita atribuir uma
// transação a uma conta de outra família via IDOR) — qualquer membro pode usar qualquer
// conta da própria família.
async function contaPertenceAFamilia(familiaId, contaId) {
  if (!contaId) return false;
  const conta = await prisma.conta.findFirst({ where: { id: Number(contaId), familiaId } });
  return Boolean(conta);
}

// Mesma checagem de IDOR do contaPertenceAFamilia, pro vínculo opcional com Evento.
async function eventoPertenceAFamilia(familiaId, eventoId) {
  if (!eventoId) return false;
  const evento = await prisma.evento.findFirst({ where: { id: Number(eventoId), familiaId } });
  return Boolean(evento);
}

// Limite geral para todas as rotas de transação, por usuário autenticado (não por IP)
const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
router.use(dataLimiter);

// Limite mais restrito só para importação em lote, por ser a operação mais custosa
const bulkImportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas importações. Tente novamente mais tarde.' },
});

// RF08 - Listar transações (com filtros RF10 e RF11), paginada
router.get('/', async (req, res) => {
  try {
    const { tipo, categoria, conta, evento, data_inicio, data_fim, busca, page, limit } = req.query;

    // Materializa aqui (não só na tela de recorrências) porque é a rota que o
    // Dashboard chama sempre que a página abre — garante que ocorrências vencidas
    // apareçam sem o usuário precisar visitar a tela de recorrências primeiro.
    await ensureOccurrences(req.familiaId);

    const where = buildTransactionWhere(req.familiaId, { tipo, categoria, contaId: conta, eventoId: evento, data_inicio, data_fim, busca });
    const { page: pageNum, limit: pageSize, skip } = parsePagination(page, limit);

    const [rawTransactions, total] = await Promise.all([
      prisma.transacao.findMany({
        where,
        select: TRANSACAO_SELECT_SEM_ANEXO,
        orderBy: ORDEM_LISTAGEM,
        skip,
        take: pageSize,
      }),
      prisma.transacao.count({ where }),
    ]);

    res.json({ transactions: serializeTransactions(rawTransactions), ...buildPaginationMeta(pageNum, pageSize, total) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar transações' });
  }
});

// Exportação em CSV (respeita os mesmos filtros de tipo/categoria/período/busca da listagem)
router.get('/export', async (req, res) => {
  try {
    const { tipo, categoria, conta, evento, data_inicio, data_fim, busca } = req.query;
    const where = buildTransactionWhere(req.familiaId, { tipo, categoria, contaId: conta, eventoId: evento, data_inicio, data_fim, busca });

    const rawTransactions = await prisma.transacao.findMany({
      where,
      select: TRANSACAO_SELECT_SEM_ANEXO,
      orderBy: ORDEM_LISTAGEM,
    });

    const csv = buildTransactionsCsv(serializeTransactions(rawTransactions));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="geldtrack-transacoes.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao exportar transações' });
  }
});

// Importação em lote (OFX)
router.post('/bulk', bulkImportLimiter, async (req, res) => {
  try {
    const { transactions, contaId } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Lista de transações inválida' });
    }
    if (transactions.length > MAX_BULK_ITEMS) {
      return res.status(400).json({ error: `Máximo de ${MAX_BULK_ITEMS} transações por importação` });
    }
    if (!(await contaPertenceAFamilia(req.familiaId, contaId))) {
      return res.status(400).json({ error: 'Conta inválida' });
    }
    for (const t of transactions) {
      const validationError = validateTransactionInput(t);
      if (validationError) return res.status(400).json({ error: validationError });
    }
    const created = await prisma.transacao.createMany({
      data: transactions.map(t => ({
        usuarioId: req.userId,
        familiaId: req.familiaId,
        contaId: Number(contaId),
        tipo: t.tipo,
        valor: Number(t.valor),
        categoria: t.categoria,
        descricao: t.descricao || '',
        data: t.data,
      })),
    });
    res.status(201).json({ count: created.count });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao importar transações' });
  }
});

// RF04/RF05 - Cadastrar receita ou despesa
router.post('/', async (req, res) => {
  try {
    const { tipo, valor, categoria, descricao, data, contaId, eventoId, anexo, anexoNome } = req.body;

    const validationError = validateTransactionInput(req.body) || validateAnexoInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    if (!(await contaPertenceAFamilia(req.familiaId, contaId))) {
      return res.status(400).json({ error: 'Conta inválida' });
    }
    if (eventoId && !(await eventoPertenceAFamilia(req.familiaId, eventoId))) {
      return res.status(400).json({ error: 'Evento inválido' });
    }

    const created = await prisma.transacao.create({
      data: {
        usuarioId: req.userId,
        familiaId: req.familiaId,
        contaId: Number(contaId),
        eventoId: eventoId ? Number(eventoId) : null,
        tipo,
        valor: Number(valor),
        categoria,
        descricao: descricao || '',
        data,
        ordem: await proximaOrdemDoDia(req.familiaId, data),
        anexo: anexo || null,
        anexoNome: anexo ? anexoNome : null,
      },
      select: TRANSACAO_SELECT_SEM_ANEXO,
    });
    dispararAvisoOrcamentoSeDespesa(req.familiaId, created);
    res.status(201).json(serializeTransaction(created));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
});

// Reordena (drag-and-drop) transações de um mesmo dia. Declarada antes de PUT /:id pra
// "reorder" não ser capturado como id. Recebe { data, ids } com ids na nova ordem (de cima
// pra baixo) — ver utils/reorderDia.js pro caso de só parte do dia estar na tela.
router.put('/reorder', async (req, res) => {
  try {
    const { data, ids } = req.body;
    if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return res.status(400).json({ error: 'Data inválida' });
    }

    const doDia = await prisma.transacao.findMany({
      where: { familiaId: req.familiaId, data },
      select: { id: true },
      orderBy: ORDEM_LISTAGEM,
    });
    const { erro, ordem } = reorderDia(doDia.map(t => t.id), ids);
    if (erro) return res.status(400).json({ error: erro });

    // Renumera o dia inteiro (topo = maior ordem), não só os itens movidos — evita empates
    // com transações que ainda estavam com ordem 0.
    await prisma.$transaction(ordem.map((id, i) =>
      prisma.transacao.update({ where: { id }, data: { ordem: ordem.length - i } })
    ));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reordenar transações' });
  }
});

// RF06 - Editar transação
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { tipo, valor, categoria, descricao, data, contaId, eventoId, anexo, anexoNome } = req.body;

    const existing = await prisma.transacao.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Transação não encontrada' });

    const validationError = validateTransactionInput(req.body) || validateAnexoInput(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    if (!(await contaPertenceAFamilia(req.familiaId, contaId))) {
      return res.status(400).json({ error: 'Conta inválida' });
    }

    // eventoId === undefined -> campo nem foi enviado, mantém o vínculo atual. null/'' ->
    // desvincula. Só valida a posse quando um id de verdade é enviado.
    let eventoIdFinal = existing.eventoId;
    if (eventoId !== undefined) {
      if (eventoId === null || eventoId === '') {
        eventoIdFinal = null;
      } else {
        if (!(await eventoPertenceAFamilia(req.familiaId, eventoId))) {
          return res.status(400).json({ error: 'Evento inválido' });
        }
        eventoIdFinal = Number(eventoId);
      }
    }

    // anexo === undefined -> campo nem foi enviado, mantém o anexo existente sem tocar.
    const anexoData = anexo === undefined ? {} : { anexo, anexoNome: anexo ? anexoNome : null };

    const novosValores = { tipo, valor: Number(valor), categoria, descricao: descricao || '', data, contaId: Number(contaId), eventoId: eventoIdFinal };
    const alteracoes = buildTransactionDiff(existing, novosValores);
    // Fora de novosValores de propósito: posição na lista não é campo financeiro, não entra no histórico.
    const ordemData = data !== existing.data ? { ordem: await proximaOrdemDoDia(req.familiaId, data) } : {};
    // Valor ou conta mudados à mão: o "US$ 20,00 pela cotação de..." não descreve mais esse
    // número, então os dados de conversão saem (e a sincronização com o grupo para de
    // mexer no valor, já que a conta não está na moeda da despesa).
    const conversaoData = existing.moedaOriginal
      && (Number(valor) !== Number(existing.valor) || Number(contaId) !== existing.contaId)
      ? { moedaOriginal: null, valorOriginal: null, taxaConversao: null, dataCotacao: null }
      : {};

    const [updated] = await prisma.$transaction([
      prisma.transacao.update({
        where: { id },
        data: { ...novosValores, ...anexoData, ...ordemData, ...conversaoData },
        select: TRANSACAO_SELECT_SEM_ANEXO,
      }),
      ...(alteracoes.length > 0
        ? [prisma.transacaoHistorico.create({ data: { transacaoId: id, alteracoes } })]
        : []),
    ]);
    dispararAvisoOrcamentoSeDespesa(req.familiaId, updated);
    res.json(serializeTransaction(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

// Busca o anexo completo (base64) de uma transação — separado da listagem/edição pra não
// pesar a paginação com blobs de imagem/PDF que a maioria das telas nunca precisa exibir.
router.get('/:id/anexo', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const transacao = await prisma.transacao.findFirst({
      where: { id, familiaId: req.familiaId },
      select: { anexo: true, anexoNome: true },
    });
    if (!transacao) return res.status(404).json({ error: 'Transação não encontrada' });
    if (!transacao.anexo) return res.status(404).json({ error: 'Esta transação não tem anexo' });
    res.json(transacao);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar anexo' });
  }
});

// Histórico de edições financeiras da transação (o que mudou e quando), mais recente primeiro.
router.get('/:id/historico', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const transacao = await prisma.transacao.findFirst({ where: { id, familiaId: req.familiaId }, select: { id: true } });
    if (!transacao) return res.status(404).json({ error: 'Transação não encontrada' });

    const historico = await prisma.transacaoHistorico.findMany({
      where: { transacaoId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(historico);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// RF07 - Excluir transação
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.transacao.findFirst({ where: { id, familiaId: req.familiaId } });
    if (!existing) return res.status(404).json({ error: 'Transação não encontrada' });

    await prisma.transacao.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir transação' });
  }
});

module.exports = router;
