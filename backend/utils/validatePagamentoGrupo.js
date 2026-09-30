const { isValidDate } = require('./validateTransaction');
const { moedaSuportada } = require('./moedas');

// membrosValidosIds é um Set com os ids dos GrupoMembro reais do grupo — mesma proteção
// contra IDOR usada em validateDespesaGrupo.js.
function validatePagamentoGrupoInput({ deMembroId, paraMembroId, valor, moeda, data }, membrosValidosIds) {
  if (deMembroId === undefined || deMembroId === null || Number.isNaN(Number(deMembroId))) {
    return 'Selecione quem pagou';
  }
  if (paraMembroId === undefined || paraMembroId === null || Number.isNaN(Number(paraMembroId))) {
    return 'Selecione quem recebeu';
  }
  if (Number(deMembroId) === Number(paraMembroId)) return 'Quem pagou e quem recebeu não podem ser a mesma pessoa';
  const valorAusente = valor === undefined || valor === null || valor === '';
  if (valorAusente || Number(valor) <= 0) return 'Valor deve ser maior que zero';
  if (moeda !== undefined && !moedaSuportada(moeda)) return 'Moeda não suportada';
  if (!data || !isValidDate(data)) return 'Data deve estar no formato YYYY-MM-DD';
  if (!membrosValidosIds.has(Number(deMembroId))) return 'Quem pagou não é membro deste grupo';
  if (!membrosValidosIds.has(Number(paraMembroId))) return 'Quem recebeu não é membro deste grupo';
  return null;
}

module.exports = { validatePagamentoGrupoInput };
