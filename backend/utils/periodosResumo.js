const { getMonthDateRange, previousMonthStr } = require('./reportCalculations');

// Períodos dos resumos por e-mail, sempre no horário de Brasília e em strings YYYY-MM-DD
// (mesmo formato de Transacao.data). A aritmética de dias roda em UTC sobre a própria string,
// então não sofre com fuso nem horário de verão.

function hojeEmSaoPaulo(agora = new Date()) {
  return agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

function somarDias(data, dias) {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Última semana completa (segunda a domingo) antes da semana de "hoje". A chave é a
// segunda-feira — é o que fica em Usuario.ultimoResumoSemanal.
function semanaAnterior(hoje) {
  const diaDaSemana = new Date(`${hoje}T00:00:00Z`).getUTCDay(); // 0 = domingo
  const segundaDestaSemana = somarDias(hoje, -((diaDaSemana + 6) % 7));
  const inicio = somarDias(segundaDestaSemana, -7);
  return { chave: inicio, inicio, fim: somarDias(inicio, 6) };
}

// Último mês completo antes do mês de "hoje". Chave YYYY-MM (Usuario.ultimoResumoMensal).
function mesAnterior(hoje) {
  const mes = previousMonthStr(hoje.slice(0, 7));
  const { start, end } = getMonthDateRange(mes);
  return { chave: mes, inicio: start, fim: end };
}

// O período imediatamente anterior a um período — base da comparação "vs semana/mês passado".
function periodoAntesDe(tipo, periodo) {
  return tipo === 'semanal' ? semanaAnterior(periodo.inicio) : mesAnterior(periodo.inicio);
}

module.exports = { hojeEmSaoPaulo, semanaAnterior, mesAnterior, periodoAntesDe };
