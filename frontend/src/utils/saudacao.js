// Saudação do topo do Dashboard conforme a hora ("Bom dia", "Boa tarde", "Boa noite").
export function saudacao(agora = new Date()) {
  const h = agora.getHours()
  if (h >= 5 && h < 12) return { texto: 'Bom dia', emoji: '☀️' }
  if (h >= 12 && h < 18) return { texto: 'Boa tarde', emoji: '🌤️' }
  return { texto: 'Boa noite', emoji: '🌙' }
}

// Linha de contexto embaixo da saudação: "quarta-feira, 7 de outubro · faltam 24 dias pro fim do mês".
export function contextoDoDia(agora = new Date()) {
  const data = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const faltam = ultimoDia - agora.getDate()
  const fim = faltam === 0 ? 'último dia do mês'
    : faltam === 1 ? 'falta 1 dia pro fim do mês'
    : `faltam ${faltam} dias pro fim do mês`
  return `${data} · ${fim}`
}
