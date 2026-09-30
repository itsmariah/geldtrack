// Com "valor" como Decimal no schema, o Prisma devolve um Prisma.Decimal em toda leitura
// (não um number). Convertemos para number uma única vez aqui, na borda entre o banco e a
// API, para que o resto do backend, os testes existentes e o frontend continuem
// trabalhando com números simples exatamente como antes.
function serializeTransaction(t) {
  const serializada = { ...t, valor: Number(t.valor) };
  // Mesma conversão pros campos de câmbio (Decimal? — só presentes quando o select os pede).
  if (t.valorOriginal !== undefined) serializada.valorOriginal = t.valorOriginal === null ? null : Number(t.valorOriginal);
  if (t.taxaConversao !== undefined) serializada.taxaConversao = t.taxaConversao === null ? null : Number(t.taxaConversao);
  return serializada;
}

function serializeTransactions(transactions) {
  return transactions.map(serializeTransaction);
}

module.exports = { serializeTransaction, serializeTransactions };
