// Foto de perfil quando existe; senão, a inicial do nome (convidados de grupo nunca têm foto).
export default function Avatar({ nome, foto, size = 'md' }) {
  return (
    <div className={`avatar avatar--${size}`} aria-hidden="true">
      {foto ? <img src={foto} alt="" /> : nome?.[0]?.toUpperCase()}
    </div>
  )
}
