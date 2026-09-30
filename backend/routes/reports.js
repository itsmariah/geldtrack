const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const {
  calculateBalance,
  summarizeTransactions,
  getMonthDateRange,
  buildMonthlyEvolution,
  currentMonthStr,
  previousMonthStr,
} = require('../utils/reportCalculations');
const { serializeTransactions } = require('../utils/serializeTransaction');
const { generateInsights } = require('../utils/generateInsights');
const { futureOccurrenceThisMonth, projectBalance } = require('../utils/projectBalance');
const { ensureOccurrences } = require('../utils/materializeRecorrencias');
const { TRANSACAO_SELECT_SEM_ANEXO } = require('../utils/transactionSelect');
const { buscarTaxas, converterParaBRL, efeitoTransferenciasEmBRL, agruparPorCategoriaTipo } = require('../utils/currency');

const router = express.Router();
router.use(authMiddleware);

// Limite geral para as rotas de relatório, por usuário autenticado (não por IP)
const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
router.use(dataLimiter);

// RF09 - Saldo (receitas - despesas)
router.get('/balance', async (req, res) => {
  try {
    const { start, end } = req.query;
    const where = { familiaId: req.familiaId };
    if (start || end) {
      where.data = {};
      if (start) where.data.gte = start;
      if (end) where.data.lte = end;
    }

    const [rows, contas, taxas] = await Promise.all([
      prisma.transacao.groupBy({ by: ['contaId', 'tipo'], where, _sum: { valor: true } }),
      prisma.conta.findMany({ where: { familiaId: req.familiaId }, select: { id: true, moeda: true, saldoInicial: true } }),
      buscarTaxas(),
    ]);

    const moedaPorConta = new Map(contas.map(c => [c.id, c.moeda]));

    // saldoInicial de cada conta é convertido pra BRL antes de somar — contas em moedas
    // diferentes não podem ser somadas direto.
    const saldoInicialTotal = contas.reduce(
      (soma, c) => soma + converterParaBRL(c.saldoInicial, c.moeda, taxas), 0
    ) + await efeitoTransferenciasEmBRL(req.familiaId, taxas, where.data);

    // Total geral convertido (por tipo) + detalhamento por moeda com o valor original,
    // sem conversão — o front mostra os dois, nunca só o número blended escondendo a conta.
    const porTipoConvertido = { receita: 0, despesa: 0 };
    const porMoedaMap = new Map();
    for (const r of rows) {
      const moeda = moedaPorConta.get(r.contaId) || 'BRL';
      const valorOriginal = Number(r._sum.valor);
      porTipoConvertido[r.tipo] += converterParaBRL(valorOriginal, moeda, taxas);

      if (!porMoedaMap.has(moeda)) porMoedaMap.set(moeda, { moeda, receitas: 0, despesas: 0 });
      porMoedaMap.get(moeda)[r.tipo === 'receita' ? 'receitas' : 'despesas'] += valorOriginal;
    }

    const normalized = [
      { tipo: 'receita', _sum: { valor: porTipoConvertido.receita } },
      { tipo: 'despesa', _sum: { valor: porTipoConvertido.despesa } },
    ];
    res.json({ ...calculateBalance(normalized, saldoInicialTotal), porMoeda: [...porMoedaMap.values()] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular saldo' });
  }
});

// RF12 - Relatório mensal
router.get('/monthly', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Parâmetro month obrigatório no formato YYYY-MM' });
    }

    const { start, end } = getMonthDateRange(month);

    const [rawTransactions, taxas] = await Promise.all([
      prisma.transacao.findMany({
        where: {
          familiaId: req.familiaId,
          data: { gte: start, lte: end },
        },
        select: TRANSACAO_SELECT_SEM_ANEXO,
        orderBy: { data: 'asc' },
      }),
      buscarTaxas(),
    ]);

    // A lista mostra cada transação na moeda da própria conta (nunca convertida linha a
    // linha); só o resumo agregado precisa de tudo na mesma moeda pra poder somar.
    const transactions = serializeTransactions(rawTransactions);
    const transactionsConvertidas = transactions.map(t => ({
      ...t, valor: converterParaBRL(t.valor, t.conta?.moeda || 'BRL', taxas),
    }));
    res.json({ month, transactions, resumo: summarizeTransactions(transactionsConvertidas) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// RF13 - Gastos por categoria
router.get('/categories', async (req, res) => {
  try {
    const { start, end } = req.query;
    const where = { familiaId: req.familiaId };
    if (start || end) {
      where.data = {};
      if (start) where.data.gte = start;
      if (end) where.data.lte = end;
    }

    const [rows, contas, taxas] = await Promise.all([
      prisma.transacao.groupBy({ by: ['contaId', 'categoria', 'tipo'], where, _sum: { valor: true } }),
      prisma.conta.findMany({ where: { familiaId: req.familiaId }, select: { id: true, moeda: true } }),
      buscarTaxas(),
    ]);

    const moedaPorConta = new Map(contas.map(c => [c.id, c.moeda]));
    // A ordenação por total passa a ser em JS (não mais via orderBy do Prisma), já que o
    // total só existe depois de converter e reagregar por categoria+tipo.
    const resultado = agruparPorCategoriaTipo(rows, moedaPorConta, taxas).sort((a, b) => b.total - a.total);

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Evolução mensal (últimos 6 meses)
router.get('/evolution', async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const startDate = sixMonthsAgo.toISOString().slice(0, 10);

    const [rawTransactions, taxas] = await Promise.all([
      prisma.transacao.findMany({
        where: { familiaId: req.familiaId, data: { gte: startDate } },
        select: { tipo: true, valor: true, data: true, conta: { select: { moeda: true } } },
      }),
      buscarTaxas(),
    ]);

    const transactions = serializeTransactions(rawTransactions).map(t => ({
      ...t, valor: converterParaBRL(t.valor, t.conta?.moeda || 'BRL', taxas),
    }));
    res.json(buildMonthlyEvolution(transactions));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar evolução' });
  }
});

// Insights automáticos — compara categorias do mês atual com o anterior, cruza com
// orçamentos e metas já cadastrados. Nenhum dado novo é guardado, tudo é derivado na hora.
router.get('/insights', async (req, res) => {
  try {
    const mesAtual = currentMonthStr();
    const mesAnterior = previousMonthStr(mesAtual);
    const { start: startAtual, end: endAtual } = getMonthDateRange(mesAtual);
    const { start: startAnterior, end: endAnterior } = getMonthDateRange(mesAnterior);

    const [rowsAtual, rowsAnterior, orcamentos, metas, contas, taxas] = await Promise.all([
      prisma.transacao.groupBy({
        by: ['contaId', 'categoria', 'tipo'],
        where: { familiaId: req.familiaId, data: { gte: startAtual, lte: endAtual } },
        _sum: { valor: true },
      }),
      prisma.transacao.groupBy({
        by: ['contaId', 'categoria', 'tipo'],
        where: { familiaId: req.familiaId, data: { gte: startAnterior, lte: endAnterior } },
        _sum: { valor: true },
      }),
      prisma.orcamento.findMany({ where: { familiaId: req.familiaId } }),
      prisma.meta.findMany({ where: { familiaId: req.familiaId }, include: { aportes: true } }),
      prisma.conta.findMany({ where: { familiaId: req.familiaId }, select: { id: true, moeda: true } }),
      buscarTaxas(),
    ]);

    const moedaPorConta = new Map(contas.map(c => [c.id, c.moeda]));
    // Orçamentos e metas continuam sempre em R$ (não têm conta associada) — só as
    // categorias vindas de transações precisam de conversão antes de comparar com eles.
    const categoriasMesAtual = agruparPorCategoriaTipo(rowsAtual, moedaPorConta, taxas);
    const categoriasMesAnterior = agruparPorCategoriaTipo(rowsAnterior, moedaPorConta, taxas);

    const orcamentosComGasto = orcamentos.map(o => ({
      categoria: o.categoria,
      valorLimite: Number(o.valorLimite),
      gasto: categoriasMesAtual.find(c => c.categoria === o.categoria && c.tipo === 'despesa')?.total || 0,
    }));

    const metasComProgresso = metas.map(m => {
      const valorAtual = m.aportes.reduce((soma, a) => soma + Number(a.valor), 0);
      const valorAlvo = Number(m.valorAlvo);
      return { titulo: m.titulo, valorAtual, valorAlvo, concluida: valorAtual >= valorAlvo };
    });

    res.json(generateInsights({
      categoriasMesAtual,
      categoriasMesAnterior,
      orcamentos: orcamentosComGasto,
      metas: metasComProgresso,
    }));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar insights' });
  }
});

// Projeção de saldo até o fim do mês — combina o que ainda deve acontecer com certeza
// (recorrências futuras) com uma estimativa de gasto avulso baseada no ritmo do mês até
// hoje. Nada disso é guardado, é recalculado a cada chamada.
router.get('/projecao', async (req, res) => {
  try {
    // Materializa antes de projetar — sem isso, uma recorrência já vencida hoje entraria
    // duas vezes: uma como "recorrência futura" e outra quando finalmente fosse gerada.
    await ensureOccurrences(req.familiaId);

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const diaAtual = hoje.getDate();
    const mesStr = `${ano}-${String(mes).padStart(2, '0')}`;
    const hojeStr = `${mesStr}-${String(diaAtual).padStart(2, '0')}`;
    const { start, end } = getMonthDateRange(mesStr);
    const totalDiasNoMes = Number(end.slice(-2));

    const [balanceRows, contas, despesasNaoRecRows, recorrencias, taxas] = await Promise.all([
      prisma.transacao.groupBy({ by: ['contaId', 'tipo'], where: { familiaId: req.familiaId }, _sum: { valor: true } }),
      prisma.conta.findMany({ where: { familiaId: req.familiaId }, select: { id: true, moeda: true, saldoInicial: true } }),
      prisma.transacao.groupBy({
        by: ['contaId'],
        where: { familiaId: req.familiaId, tipo: 'despesa', recorrenciaId: null, data: { gte: start, lte: hojeStr } },
        _sum: { valor: true },
      }),
      prisma.recorrencia.findMany({ where: { familiaId: req.familiaId, ativa: true } }),
      buscarTaxas(),
    ]);

    const moedaPorConta = new Map(contas.map(c => [c.id, c.moeda]));

    const porTipoConvertido = { receita: 0, despesa: 0 };
    for (const r of balanceRows) {
      porTipoConvertido[r.tipo] += converterParaBRL(r._sum.valor, moedaPorConta.get(r.contaId) || 'BRL', taxas);
    }
    const normalized = [
      { tipo: 'receita', _sum: { valor: porTipoConvertido.receita } },
      { tipo: 'despesa', _sum: { valor: porTipoConvertido.despesa } },
    ];
    const saldoInicialTotal = contas.reduce(
      (soma, c) => soma + converterParaBRL(c.saldoInicial, c.moeda, taxas), 0
    ) + await efeitoTransferenciasEmBRL(req.familiaId, taxas);
    const { saldo: saldoAtual } = calculateBalance(normalized, saldoInicialTotal);

    const despesasNaoRecorrentesAteHoje = despesasNaoRecRows.reduce(
      (soma, r) => soma + converterParaBRL(r._sum.valor || 0, moedaPorConta.get(r.contaId) || 'BRL', taxas), 0
    );
    // futureOccurrenceThisMonth não sabe nada de moeda — convertemos o valor da
    // recorrência (na moeda da conta dela) antes de passar pra função.
    const recorrenciasFuturas = recorrencias
      .map(r => ({ ...r, valor: converterParaBRL(r.valor, moedaPorConta.get(r.contaId) || 'BRL', taxas) }))
      .map(r => futureOccurrenceThisMonth(r, { ano, mes, hojeStr }))
      .filter(Boolean);

    const resultado = projectBalance({
      saldoAtual,
      diaAtual,
      totalDiasNoMes,
      despesasNaoRecorrentesAteHoje,
      recorrenciasFuturas,
    });

    res.json({ ...resultado, mes: mesStr, fimDoMes: end });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular projeção de saldo' });
  }
});

module.exports = router;
