import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ProfileModal from './ProfileModal'
import ThemeToggle from './ThemeToggle'
import Avatar from './Avatar'

const LINKS = [
  ['/dashboard', 'Dashboard'],
  ['/contas', 'Contas'],
  ['/relatorios', 'Relatórios'],
  ['/metas', 'Metas'],
  ['/orcamentos', 'Orçamentos'],
  ['/eventos', 'Eventos'],
  ['/recorrencias', 'Recorrências'],
  ['/categorias', 'Categorias'],
  ['/familia', 'Família'],
  ['/grupos', 'Grupos'],
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [showProfile, setShowProfile] = useState(false)
  // Só tem efeito abaixo do breakpoint do menu (ver .navbar-menu-btn no CSS) — acima
  // dele os links ficam sempre visíveis em linha e esse estado é ignorado.
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  // Rotas de detalhe (/eventos/3, /grupos/5) marcam o item da lista como ativo.
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`) ? 'active' : ''

  return (
    <header className="navbar">
      <Link to="/" state={{ fromApp: true }} className="navbar-brand">
        <span className="logo-coin">💰</span> <span className="navbar-brand-text">GeldTrack</span>
      </Link>

      <nav id="app-nav" className={`navbar-nav${menuOpen ? ' navbar-nav--open' : ''}`}>
        {LINKS.map(([path, label]) => (
          <Link key={path} to={path} className={isActive(path)}>{label}</Link>
        ))}
        <button className="btn btn-outline btn-sm navbar-nav-logout" onClick={logout}>Sair</button>
      </nav>

      <div className="navbar-user">
        <ThemeToggle />
        <button className="user-btn" onClick={() => setShowProfile(true)} aria-label="Meu perfil">
          <Avatar nome={user?.nome} foto={user?.foto} size="sm" />
          <span className="user-btn-nome">{user?.nome?.split(' ')[0]}</span>
        </button>
        <button className="btn btn-outline btn-sm navbar-logout" onClick={logout}>Sair</button>
        <button
          type="button"
          className="navbar-menu-btn"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls="app-nav"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && <div className="navbar-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </header>
  )
}
