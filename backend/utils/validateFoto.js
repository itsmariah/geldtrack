// Foto de grupo/família — mesma regra da foto de perfil (routes/auth.js): data URL de
// imagem, já redimensionada no navegador (frontend/src/utils/resizeImage.js). null remove.
const FOTO_DATA_URL_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,/;
const MAX_FOTO_LENGTH = 2_000_000; // ~1.5MB decodificado

function validateFoto(foto) {
  if (foto === null) return null;
  if (typeof foto !== 'string' || !FOTO_DATA_URL_REGEX.test(foto)) return 'Formato de imagem inválido';
  if (foto.length > MAX_FOTO_LENGTH) return 'Imagem muito grande';
  return null;
}

module.exports = { validateFoto };
