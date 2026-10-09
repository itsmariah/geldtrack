import { useRef } from 'react'
import { resizeImage } from '../utils/resizeImage'

// Prévia redonda + "Escolher foto"/"Remover" — usado no perfil e nos grupos. Devolve a
// imagem já redimensionada (data URL de 256px) em onChange, ou null ao remover; erros de
// arquivo inválido vão pra onError, pra cada tela mostrar no próprio Alert.
export default function FotoPicker({ foto, nome, alt, onChange, onError }) {
  const inputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      return onError('Selecione um arquivo de imagem')
    }
    if (file.size > 8 * 1024 * 1024) {
      return onError('Imagem muito grande (máximo 8MB)')
    }

    try {
      onError('')
      onChange(await resizeImage(file))
    } catch {
      onError('Não foi possível processar a imagem')
    }
  }

  return (
    <div className="profile-photo-field">
      {foto ? (
        <img src={foto} alt={alt} className="profile-photo-preview" />
      ) : (
        <div className="profile-photo-preview profile-photo-placeholder">
          {nome?.[0]?.toUpperCase()}
        </div>
      )}
      <div className="profile-photo-actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()}>
          Escolher foto
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} hidden />
        {foto && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange(null)}>
            Remover
          </button>
        )}
      </div>
    </div>
  )
}
