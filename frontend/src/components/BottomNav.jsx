import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { LayoutGrid, LogOut, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { NAV_LINKS, isPathActive } from '../utils/navLinks'
import Avatar from './Avatar'
import ProfileModal from './ProfileModal'
import { haptic } from '../utils/haptics'

const PRIMARY = NAV_LINKS.filter(l => l.primary)
const SECONDARY = NAV_LINKS.filter(l => !l.primary)
const SPRING = { type: 'spring', stiffness: 520, damping: 40 }

// Tocar de novo na aba em que já se está sobe a página pro topo (como nos apps nativos),
// em vez de "navegar" pra mesma rota sem efeito nenhum.
function voltarAoTopo(e) {
  e.preventDefault()
  haptic('light')
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}

// Barra de navegação inferior — só aparece no layout de celular/tablet (ver .bottom-nav
// no CSS). Abas: Início, Contas, [+], Relatórios, Mais. O "+" leva pro Dashboard já
// abrindo o modal de nova transação (Dashboard lê location.state.novaTransacao).
export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => { setMoreOpen(false) }, [pathname])

  const moreActive = SECONDARY.some(l => isPathActive(pathname, l.path))
  const [inicio, contas, relatorios] = PRIMARY

  const tab = ({ path, label, short, icon: Icon }) => {
    const active = isPathActive(pathname, path)
    return (
      <Link
        key={path}
        to={path}
        className={`bottom-nav-tab${active ? ' active' : ''}`}
        aria-current={active ? 'page' : undefined}
        onClick={pathname === path ? voltarAoTopo : undefined}
      >
        <span className="bottom-nav-icon">
          {active && <m.span layoutId="bottom-nav-pill" className="bottom-nav-pill" transition={SPRING} />}
          <Icon size={22} strokeWidth={active ? 2.4 : 2} />
        </span>
        <span className="bottom-nav-label">{short || label}</span>
      </Link>
    )
  }

  return (
    <>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {tab(inicio)}
        {tab(contas)}
        <div className="bottom-nav-fab-slot">
          <m.button
            type="button"
            className="bottom-nav-fab"
            onClick={() => { haptic('light'); navigate('/dashboard', { state: { novaTransacao: true } }) }}
            whileTap={{ scale: 0.88 }}
            aria-label="Nova transação"
          >
            <Plus size={26} strokeWidth={2.5} />
          </m.button>
        </div>
        {tab(relatorios)}
        <button
          type="button"
          className={`bottom-nav-tab${moreActive || moreOpen ? ' active' : ''}`}
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <span className="bottom-nav-icon">
            {moreActive && !moreOpen && <m.span layoutId="bottom-nav-pill" className="bottom-nav-pill" transition={SPRING} />}
            <LayoutGrid size={22} strokeWidth={moreActive ? 2.4 : 2} />
          </span>
          <span className="bottom-nav-label">Mais</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && <MoreSheet pathname={pathname} onClose={() => setMoreOpen(false)} />}
      </AnimatePresence>
    </>
  )
}

function MoreSheet({ pathname, onClose }) {
  const { user, logout } = useAuth()
  const [showProfile, setShowProfile] = useState(false)
  const sheetRef = useRef(null)

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    sheetRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <>
      <m.div
        className="sheet-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        aria-hidden="true"
      />
      <m.div
        ref={sheetRef}
        className="more-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Mais páginas"
        tabIndex={-1}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 40 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 90 || info.velocity.y > 500) onClose() }}
      >
        <div className="sheet-handle" aria-hidden="true" />

        <div className="more-sheet-grid">
          {SECONDARY.map(({ path, label, icon: Icon }, i) => (
            <m.div
              key={path}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.25 }}
            >
              <Link
                to={path}
                className={`more-sheet-item${isPathActive(pathname, path) ? ' active' : ''}`}
                onClick={onClose}
              >
                <span className="more-sheet-icon"><Icon size={22} /></span>
                {label}
              </Link>
            </m.div>
          ))}
        </div>

        <div className="more-sheet-footer">
          <button type="button" className="more-sheet-user" onClick={() => setShowProfile(true)}>
            <Avatar nome={user?.nome} foto={user?.foto} />
            <span>
              <strong>{user?.nome}</strong>
              <small>Meu perfil</small>
            </span>
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={logout}>
            <LogOut size={16} /> Sair
          </button>
        </div>
      </m.div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  )
}
