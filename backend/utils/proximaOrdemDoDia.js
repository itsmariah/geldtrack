const prisma = require('../database/db');

// Transação nova (ou que mudou de dia) entra no topo do dia — sem isso ela cairia abaixo
// de qualquer transação que o usuário já tivesse arrastado pra cima naquele dia.
async function proximaOrdemDoDia(familiaId, data) {
  const agg = await prisma.transacao.aggregate({ where: { familiaId, data }, _max: { ordem: true } });
  return (agg?._max?.ordem ?? -1) + 1;
}

module.exports = { proximaOrdemDoDia };
