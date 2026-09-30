// Monta a sequência de botões da paginação numerada: sempre a primeira e a última página,
// a atual com `vizinhas` de cada lado, e '…' no lugar dos buracos. Um buraco de uma página
// só vira o próprio número (mostrar "…" no lugar de um único número não economiza nada).
// Ex: (6, 20) -> [1, '…', 5, 6, 7, '…', 20]
export function pageItems(atual, total, vizinhas = 1) {
  if (total <= 1) return [1]
  // Primeira + última + atual com vizinhas + duas reticências: se todas as páginas cabem
  // nesse mesmo número de botões, mostra todas.
  if (total <= 2 * vizinhas + 5) return Array.from({ length: total }, (_, i) => i + 1)

  const paginas = new Set([1, total])
  for (let p = atual - vizinhas; p <= atual + vizinhas; p++) {
    if (p >= 1 && p <= total) paginas.add(p)
  }

  const ordenadas = [...paginas].sort((a, b) => a - b)
  const itens = []
  ordenadas.forEach((p, i) => {
    const anterior = ordenadas[i - 1]
    if (anterior !== undefined) {
      if (p - anterior === 2) itens.push(anterior + 1)
      else if (p - anterior > 2) itens.push('…')
    }
    itens.push(p)
  })
  return itens
}
