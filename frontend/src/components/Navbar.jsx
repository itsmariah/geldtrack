import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ProfileModal from './ProfileModal'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [showProfile, setShowProfile] = useState(false)

  const isActive = (path) => location.pathname === path ? 'active' : ''

  return (
    <header className="navbar">
      <Link to="/" state={{ fromApp: true }} className="navbar-brand">
        <span className="logo-coin">💰</span> <span className="navbar-brand-text">GeldTrack</span>
      </Link>

      <nav className="navbar-nav">
        <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
        <Link to="/contas" className={isActive('/contas')}>Contas</Link>
        <Link to="/relatorios" className={isActive('/relatorios')}>Relatórios</Link>
        <Link to="/metas" className={isActive('/metas')}>Metas</Link>
        <Link to="/orcamentos" className={isActive('/orcamentos')}>Orçamentos</Link>
        <Link to="/eventos" className={isActive('/eventos')}>Eventos</Link>
        <Link to="/recorrencias" className={isActive('/recorrencias')}>Recorrências</Link>
        <Link to="/categorias" className={isActive('/categorias')}>Categorias</Link>
        <Link to="/familia" className={isActive('/familia')}>Família</Link>
        <Link to="/grupos" className={isActive('/grupos')}>Grupos</Link>
      </nav>

      <div className="navbar-user">
        <ThemeToggle />
        <button className="user-btn" onClick={() => setShowProfile(true)}>
          <div className="avatar">
            {user?.foto ? <img src={user.foto} alt="" /> : user?.nome?.[0]?.toUpperCase()}
          </div>
          <span>{user?.nome?.split(' ')[0]}</span>
        </button>
        <button className="btn btn-outline btn-sm" onClick={logout}>Sair</button>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </header>
  )
}
