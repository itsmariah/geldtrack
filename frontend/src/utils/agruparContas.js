// Agrupa as contas pela instituição (ex: "Wise · Real", "Wise · Dólar" e "Wise · Euro"
// debaixo de "Wise"), comparando sem diferenciar maiúsculas/espaços — "wise" e "Wise "
// caem no mesmo grupo, exibido com a grafia da primeira conta. Os grupos seguem a ordem
// em que a primeira conta de cada um aparece; contas sem instituição ficam à parte.
export function agruparContasPorInstituicao(contas) {
  const grupos = new Map()
  const semInstituicao = []
  for (const conta of contas) {
    const nome = conta.instituicao?.trim()
    if (!nome) {
      semInstituicao.push(conta)
      continue
    }
    const chave = nome.toLocaleLowerCase('pt-BR')
    if (!grupos.has(chave)) grupos.set(chave, { nome, contas: [] })
    grupos.get(chave).contas.push(conta)
  }
  return { grupos: [...grupos.values()], semInstituicao }
}

// Total do grupo: exato na própria moeda quando todas as contas usam a mesma; senão,
// convertido pra R$ pela cotação salva (aproximado — por isso o "aproximado: true").
export function totalDoGrupo(contas, taxas = { BRL: 1 }) {
  const moedas = new Set(contas.map(c => c.moeda || 'BRL'))
  if (moedas.size === 1) {
    return { valor: contas.reduce((soma, c) => soma + c.saldo, 0), moeda: [...moedas][0], aproximado: false }
  }
  const valor = contas.reduce((soma, c) => soma + c.saldo * (taxas[c.moeda || 'BRL'] ?? 1), 0)
  return { valor, moeda: 'BRL', aproximado: true }
}

// Lista das instituições já usadas, sem repetir — sugestões pro campo do ContaModal.
export function instituicoesUsadas(contas) {
  return agruparContasPorInstituicao(contas).grupos.map(g => g.nome)
}
