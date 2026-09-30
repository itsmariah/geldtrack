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

// Receita de um pagamento recebido no grupo — mesmo sufixo "(grupo)" das despesas.
function descricaoTransacaoPagamento(nomeQuemPagou, nomeGrupo) {
  return descricaoTransacaoGrupo(`Pagamento de ${nomeQuemPagou}`, nomeGrupo);
}

// O dinheiro que de fato entrou: se a dívida foi quitada em outra moeda (devia € 40, pagou
// R$ 250 por Pix), é o valor/moeda do pagamento real, não o abatido do saldo.
function valorRecebido(pagamento) {
  if (pagamento.moedaPagamento && pagamento.valorPagamento != null) {
    return { valor: Number(pagamento.valorPagamento), moeda: pagamento.moedaPagamento };
  }
  return { valor: Number(pagamento.valor), moeda: pagamento.moeda || 'BRL' };
}

// Grupo renomeado: troca só o sufixo "(nome antigo)" pelo novo. Retorna null quando a
// descrição não termina com o nome antigo — o usuário editou a transação no dashboard, e a
// edição dele vale mais que a sincronização.
function descricaoComGrupoRenomeado(descricao, nomeAntigo, nomeNovo) {
  const sufixo = ` (${nomeAntigo})`;
  if (nomeAntigo === nomeNovo || !descricao.endsWith(sufixo)) return null;
  return `${descricao.slice(0, -sufixo.length)} (${nomeNovo})`;
}

module.exports = { descricaoTransacaoGrupo, parteDoMembro, descricaoTransacaoPagamento, valorRecebido, descricaoComGrupoRenomeado };
