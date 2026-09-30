const { isValidDate } = require('./validateTransaction');
const { moedaSuportada } = require('./moedas');

// membrosValidosIds é um Set com os ids dos GrupoMembro reais do grupo — usado pra
// barrar IDOR (não dá pra injetar um membroId de outro grupo no rateio).
// moeda é opcional (a rota resolve o default), mas se vier tem que ser suportada.
function validateDespesaGrupoInput({ descricao, valorTotal, moeda, data, pagoPorMembroId, participanteIds }, membrosValidosIds) {
  if (!descricao || !String(descricao).trim()) return 'Descrição é obrigatória';
  const valorAusente = valorTotal === undefined || valorTotal === null || valorTotal === '';
  if (valorAusente || Number(valorTotal) <= 0) return 'Valor deve ser maior que zero';
  if (moeda !== undefined && !moedaSuportada(moeda)) return 'Moeda não suportada';
  if (!data || !isValidDate(data)) return 'Data deve estar no formato YYYY-MM-DD';
  if (pagoPorMembroId === undefined || pagoPorMembroId === null || Number.isNaN(Number(pagoPorMembroId))) {
    return 'Selecione quem pagou a despesa';
  }
  if (!Array.isArray(participanteIds) || participanteIds.length === 0) {
    return 'Selecione ao menos um participante';
  }
  if (participanteIds.some(id => Number.isNaN(Number(id)))) {
    return 'Lista de participantes inválida';
  }
  if (new Set(participanteIds.map(Number)).size !== participanteIds.length) {
    return 'Um participante não pode aparecer duas vezes';
  }
  if (!membrosValidosIds.has(Number(pagoPorMembroId))) {
    return 'Pagador não é membro deste grupo';
  }
  if (participanteIds.some(id => !membrosValidosIds.has(Number(id)))) {
    return 'Um ou mais participantes não são membros deste grupo';
  }
  return null;
}

module.exports = { validateDespesaGrupoInput };
