import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'

export default function GrupoCard({ grupo }) {
  const navigate = useNavigate()

  return (
    <div
      className="evento-card budget-card"
      onClick={() => navigate(`/grupos/${grupo.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') navigate(`/grupos/${grupo.id}`) }}
    >
      <div className="meta-card-header">
        <div className="grupo-card-titulo">
          <Avatar nome={grupo.nome} foto={grupo.foto} size="lg" />
          <div>
            <h3>{grupo.nome}</h3>
            <span className={`familia-papel-badge familia-papel-badge--${grupo.papel}`}>
              {grupo.papel === 'admin' ? 'Admin' : 'Membro'}
            </span>
          </div>
        </div>
      </div>
      <div className="meta-card-status">
        <span>{grupo.totalMembros} {grupo.totalMembros === 1 ? 'membro' : 'membros'} · código {grupo.codigo}</span>
      </div>
    </div>
  )
}
