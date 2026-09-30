// Com "valor" como Decimal no schema, o Prisma devolve um Prisma.Decimal em toda
// leitura. Convertemos para number uma única vez aqui, na borda entre o banco e a API.
// Espera contaOrigem/contaDestino incluídos (só o nome é usado) para a UI não precisar
// cruzar ids de conta na mão.
function serializeTransferencia(t) {
  return {
    id: t.id,
    contaOrigemId: t.contaOrigemId,
    contaOrigemNome: t.contaOrigem?.nome,
    contaDestinoId: t.contaDestinoId,
    contaDestinoNome: t.contaDestino?.nome,
    // "valor"/"moeda" são o que saiu da origem; "valorDestino"/"moedaDestino" o que chegou.
    // Na mesma moeda (valorDestino nulo no banco), os dois lados são iguais.
    moeda: t.contaOrigem?.moeda || 'BRL',
    valor: Number(t.valor),
    moedaDestino: t.contaDestino?.moeda || t.contaOrigem?.moeda || 'BRL',
    valorDestino: t.valorDestino == null ? Number(t.valor) : Number(t.valorDestino),
    data: t.data,
    descricao: t.descricao,
    createdAt: t.createdAt,
  };
}

function serializeTransferencias(transferencias) {
  return transferencias.map(serializeTransferencia);
}

module.exports = { serializeTransferencia, serializeTransferencias };
