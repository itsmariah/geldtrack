// Com "saldoInicial" como Decimal no schema, o Prisma devolve um Prisma.Decimal em toda
// leitura. Convertemos para number uma única vez aqui, na borda entre o banco e a API.
function serializeConta(c) {
  return { id: c.id, nome: c.nome, tipo: c.tipo, moeda: c.moeda, instituicao: c.instituicao ?? null, saldoInicial: Number(c.saldoInicial), createdAt: c.createdAt };
}

function serializeContas(contas) {
  return contas.map(serializeConta);
}

// Anexa o saldo atual (nunca lido do banco — sempre saldoInicial + receitas - despesas
// dessa conta ± transferências, calculado a partir de Transacao/Transferencia na rota).
function withSaldo(conta, movimento) {
  return { ...conta, saldo: conta.saldoInicial + movimento };
}

module.exports = { serializeConta, serializeContas, withSaldo };
