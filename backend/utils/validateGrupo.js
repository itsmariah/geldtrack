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

// Mesma regra da foto de perfil (routes/auth.js): data URL de imagem, já redimensionada no
// navegador (frontend/src/utils/resizeImage.js). null remove a foto.
const FOTO_DATA_URL_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,/;
const MAX_FOTO_LENGTH = 2_000_000; // ~1.5MB decodificado

function validateFotoGrupo(foto) {
  if (foto === null) return null;
  if (typeof foto !== 'string' || !FOTO_DATA_URL_REGEX.test(foto)) return 'Formato de imagem inválido';
  if (foto.length > MAX_FOTO_LENGTH) return 'Imagem muito grande';
  return null;
}

module.exports = { validateNomeGrupo, validateCodigoGrupo, validateNomeConvidado, validateFotoGrupo };
