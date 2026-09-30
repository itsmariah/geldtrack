const prisma = require('../database/db');

// taxas: { moeda: taxaParaBRL } — quantos reais vale 1 unidade daquela moeda. BRL é
// sempre 1 (moeda-base), nunca fica guardada em TaxaCambio.
// atualizadoEm: { moeda: data } — quando cada cotação foi buscada, pra UI poder dizer "de
// acordo com a cotação de 30/09/2026" ao sugerir uma conversão.
async function buscarCotacoes() {
  const registros = await prisma.taxaCambio.findMany();
  const taxas = { BRL: 1 };
  const atualizadoEm = {};
  for (const t of registros) {
    taxas[t.moeda] = Number(t.taxaParaBRL);
    if (t.atualizadoEm) atualizadoEm[t.moeda] = t.atualizadoEm;
  }
  return { taxas, atualizadoEm };
}

async function buscarTaxas() {
  return (await buscarCotacoes()).taxas;
}

// Converte um valor numa moeda estrangeira pro equivalente em R$. Se a moeda não tiver
// cotação salva ainda (ninguém clicou em "Atualizar cotações"), cai pra 1:1 — impreciso,
// mas nunca quebra a soma nem esconde o valor.
function converterParaBRL(valor, moeda, taxas) {
  const taxa = taxas[moeda] ?? 1;
  return Number(valor) * taxa;
}

// Quantas unidades de "para" vale 1 unidade de "de", pela cotação salva — arredondada em
// 6 casas (a precisão de Transacao.taxaConversao), pra conta feita agora e a refeita na
// sincronização darem exatamente o mesmo resultado. null se faltar cotação de alguma.
function taxaEntre(de, para, taxas) {
  if (!taxas[de] || !taxas[para]) return null;
  return Number((taxas[de] / taxas[para]).toFixed(6));
}

// Data (YYYY-MM-DD, no horário de Brasília) da cotação mais antiga entre as moedas — BRL não
// tem data, é sempre 1. null se nenhuma das moedas tiver cotação datada.
function dataDaCotacao(moedas, atualizadoEm) {
  const datas = moedas.map(m => atualizadoEm[m]).filter(Boolean).map(d => new Date(d));
  if (datas.length === 0) return null;
  const maisAntiga = new Date(Math.min(...datas.map(d => d.getTime())));
  return maisAntiga.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

// Valor convertido em centavos exatos; nunca zero (uma parte de centavos convertida pra uma
// moeda mais "forte" poderia arredondar pra 0, e transação de valor 0 não existe).
function converterValor(valor, taxa) {
  return Math.max(0.01, Math.round(Number(valor) * taxa * 100) / 100);
}

// Efeito das transferências no total consolidado em R$. Transferência na mesma moeda sai
// de uma conta e entra em outra com o mesmo valor — se anula, nem é buscada. Entre moedas
// (valorDestino preenchido) sobra a diferença de câmbio: spread/IOF e a variação da cotação
// desde o dia da transferência. Sem isso, o total do Dashboard (que soma saldoInicial +
// transações) deixaria de bater com a soma dos saldos das contas.
async function efeitoTransferenciasEmBRL(familiaId, taxas, filtroData) {
  const transferencias = await prisma.transferencia.findMany({
    where: { familiaId, valorDestino: { not: null }, ...(filtroData ? { data: filtroData } : {}) },
    select: { valor: true, valorDestino: true, contaOrigem: { select: { moeda: true } }, contaDestino: { select: { moeda: true } } },
  });
  return transferencias.reduce(
    (soma, t) => soma
      + converterParaBRL(t.valorDestino, t.contaDestino.moeda, taxas)
      - converterParaBRL(t.valor, t.contaOrigem.moeda, taxas),
    0
  );
}

// Reagrupa linhas de transacao.groupBy(['contaId', 'categoria', 'tipo'], {_sum:{valor}})
// por categoria+tipo, convertendo cada subtotal pra BRL antes de somar — necessário
// porque a soma SQL bruta deixa de fazer sentido assim que duas contas envolvidas
// estão em moedas diferentes. Usado por /reports/categories e /reports/insights.
function agruparPorCategoriaTipo(rows, moedaPorConta, taxas) {
  const totais = new Map();
  for (const r of rows) {
    const moeda = moedaPorConta.get(r.contaId) || 'BRL';
    const chave = JSON.stringify([r.categoria, r.tipo]);
    const atual = totais.get(chave) || 0;
    totais.set(chave, atual + converterParaBRL(Number(r._sum.valor), moeda, taxas));
  }
  return [...totais.entries()].map(([chave, total]) => {
    const [categoria, tipo] = JSON.parse(chave);
    return { categoria, tipo, total };
  });
}

module.exports = {
  buscarCotacoes,
  buscarTaxas,
  converterParaBRL,
  taxaEntre,
  dataDaCotacao,
  converterValor,
  efeitoTransferenciasEmBRL,
  agruparPorCategoriaTipo,
};
