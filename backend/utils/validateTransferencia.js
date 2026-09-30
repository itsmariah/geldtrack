const { isValidDate } = require('./validateTransaction');

// Retorna a mensagem de erro (string) se os dados da transferência forem inválidos, ou
// null se ok. Ownership das contas (pertencerem ao usuário) é conferido na rota, não aqui.
// valorDestino é opcional aqui — se é obrigatório (contas em moedas diferentes) só dá pra
// saber na rota, depois de buscar as contas.
function validateTransferenciaInput({ contaOrigemId, contaDestinoId, valor, valorDestino, data }) {
  if (!contaOrigemId || !contaDestinoId) {
    return 'Conta de origem e conta de destino são obrigatórias';
  }
  if (Number(contaOrigemId) === Number(contaDestinoId)) {
    return 'A conta de origem deve ser diferente da conta de destino';
  }
  const valorAusente = valor === undefined || valor === null || valor === '';
  if (valorAusente || Number(valor) <= 0) {
    return 'Valor deve ser maior que zero';
  }
  const valorDestinoInformado = valorDestino !== undefined && valorDestino !== null && valorDestino !== '';
  if (valorDestinoInformado && !(Number(valorDestino) > 0)) {
    return 'Valor recebido deve ser maior que zero';
  }
  if (!data || !isValidDate(data)) {
    return 'Data deve estar no formato YYYY-MM-DD';
  }
  return null;
}

module.exports = { validateTransferenciaInput };
