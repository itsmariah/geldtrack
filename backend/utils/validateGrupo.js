function validateNomeGrupo(nome) {
  if (!nome || !String(nome).trim()) return 'Nome do grupo é obrigatório';
  if (String(nome).trim().length > 60) return 'Nome muito longo (máximo 60 caracteres)';
  return null;
}

function validateCodigoGrupo(codigo) {
  if (!codigo || !String(codigo).trim()) return 'Código é obrigatório';
  return null;
}

function validateNomeConvidado(nome) {
  if (!nome || !String(nome).trim()) return 'Nome do convidado é obrigatório';
  if (String(nome).trim().length > 60) return 'Nome muito longo (máximo 60 caracteres)';
  return null;
}

module.exports = { validateNomeGrupo, validateCodigoGrupo, validateNomeConvidado };
