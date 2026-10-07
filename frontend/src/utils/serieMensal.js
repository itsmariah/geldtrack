// Transforma a evolução mensal do backend ([{ mes: 'YYYY-MM', receitas, despesas }], só com
// os meses que tiveram transação) em séries contínuas dos últimos N meses — mês sem
// movimento vira 0 — pros minigráficos dos cards do Dashboard.
export function serieMensal(evolucao, agora = new Date(), meses = 6) {
  const porMes = Object.fromEntries((evolucao || []).map(e => [e.mes, e]))
  const receitas = []
  const despesas = []
  const saldo = []
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const r = Number(porMes[chave]?.receitas) || 0
    const de = Number(porMes[chave]?.despesas) || 0
    receitas.push(r)
    despesas.push(de)
    saldo.push(r - de)
  }
  return { receitas, despesas, saldo }
}
