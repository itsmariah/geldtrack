// Cálculos da retrospectiva do mês (stories) e do calendário de gastos, a partir das
// transações de /reports/monthly — que vêm na moeda da própria conta, por isso tudo passa
// pela conversão com as taxas de /cambio (mesmo critério da tela de Relatórios).

const paraBRL = (t, taxas) => Number(t.valor) * ((taxas || {})[t.conta?.moeda || 'BRL'] ?? 1)

// Total de despesas por dia: { 'YYYY-MM-DD': total }
export function gastosPorDia(transacoes, taxas) {
  const dias = {}
  for (const t of transacoes || []) {
    if (t.tipo !== 'despesa') continue
    dias[t.data] = (dias[t.data] || 0) + paraBRL(t, taxas)
  }
  return dias
}

// Nível de 0 a 4 de um valor em relação ao maior dia do mês (pra cor do mapa de calor).
export function nivelDoDia(valor, maximo) {
  if (!valor || !maximo) return 0
  const r = valor / maximo
  if (r > 0.75) return 4
  if (r > 0.5) return 3
  if (r > 0.25) return 2
  return 1
}

// mes: 'YYYY-MM'. evolucao: [{ mes, receitas, despesas }] (pra comparar com o mês anterior).
export function calcularRetrospectiva(transacoes, { mes, taxas, evolucao = [], hoje = new Date() }) {
  const lista = (transacoes || []).map(t => ({ ...t, valorBRL: paraBRL(t, taxas) }))
  const despesas = lista.filter(t => t.tipo === 'despesa')
  const receitas = lista.filter(t => t.tipo === 'receita')
  const totalDespesas = despesas.reduce((s, t) => s + t.valorBRL, 0)
  const totalReceitas = receitas.reduce((s, t) => s + t.valorBRL, 0)

  const porCategoria = {}
  for (const t of despesas) porCategoria[t.categoria] = (porCategoria[t.categoria] || 0) + t.valorBRL
  const topCategorias = Object.entries(porCategoria)
    .map(([categoria, total]) => ({ categoria, total, pct: totalDespesas ? Math.round((total / totalDespesas) * 100) : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  const maiorDespesa = despesas.reduce((m, t) => (!m || t.valorBRL > m.valorBRL ? t : m), null)

  const porDia = gastosPorDia(transacoes, taxas)
  const diaMaisGastador = Object.entries(porDia).reduce((m, [data, total]) => (!m || total > m.total ? { data, total } : m), null)

  // Dias sem nenhuma despesa — no mês corrente, só conta até hoje.
  const [ano, m] = mes.split('-').map(Number)
  const ultimoDia = new Date(ano, m, 0).getDate()
  const mesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === m
  const diasConsiderados = mesAtual ? hoje.getDate() : ultimoDia
  const diasComGasto = Object.keys(porDia).filter(d => Number(d.slice(8, 10)) <= diasConsiderados).length
  const diasSemGastar = Math.max(0, diasConsiderados - diasComGasto)

  const anterior = new Date(ano, m - 2, 1)
  const chaveAnterior = `${anterior.getFullYear()}-${String(anterior.getMonth() + 1).padStart(2, '0')}`
  const despesasAnterior = Number(evolucao.find(e => e.mes === chaveAnterior)?.despesas) || 0
  const variacaoPct = despesasAnterior > 0 ? Math.round(((totalDespesas - despesasAnterior) / despesasAnterior) * 100) : null

  return {
    mes,
    qtdTransacoes: lista.length,
    receitas: totalReceitas,
    despesas: totalDespesas,
    saldo: totalReceitas - totalDespesas,
    topCategorias,
    maiorDespesa: maiorDespesa && { descricao: maiorDespesa.descricao || maiorDespesa.categoria, categoria: maiorDespesa.categoria, valor: maiorDespesa.valorBRL, data: maiorDespesa.data },
    diaMaisGastador,
    diasSemGastar,
    diasConsiderados,
    comparacao: { mesAnterior: chaveAnterior, despesasAnterior, variacaoPct },
  }
}

// "2026-09" → "setembro" / "setembro de 2026"
export function nomeDoMes(mes, { comAno = false } = {}) {
  const [ano, m] = mes.split('-').map(Number)
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', comAno ? { month: 'long', year: 'numeric' } : { month: 'long' })
}

// Mês anterior ao de `hoje`, no formato YYYY-MM.
export function mesAnterior(hoje = new Date()) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
