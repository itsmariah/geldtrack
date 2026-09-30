// Regras de "Adicionar despesas ao dashboard" (Grupos → Dashboard). O que vai pro
// dashboard é só a parte do usuário na despesa (valorDevido da divisão dele), não o total
// nem o que ele desembolsou — é o quanto aquela ocasião custou pra ele de verdade.

// Nome do grupo entre parênteses pra transação continuar identificável no dashboard
// depois que o grupo for excluído (o vínculo despesaGrupoId vira null nesse caso).
function descricaoTransacaoGrupo(descricaoDespesa, nomeGrupo) {
  return `${descricaoDespesa} (${nomeGrupo})`;
}

// Parte do membro na despesa, ou 0 se ele não participa do rateio (pode ter só pagado).
function parteDoMembro(divisoes, membroId) {
  const divisao = (divisoes || []).find(d => d.membroId === membroId);
  return divisao ? Number(divisao.valorDevido) : 0;
}

module.exports = { descricaoTransacaoGrupo, parteDoMembro };
