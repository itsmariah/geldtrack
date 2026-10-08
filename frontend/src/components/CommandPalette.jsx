import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, CornerDownLeft, Eye, EyeOff, Loader2, LogOut, Moon, Plus, Search, Sparkles, Sun } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { usePrivacy } from '../context/PrivacyContext'
import { NAV_LINKS } from '../utils/navLinks'
import { normalizarDescricao } from '../utils/categoriaInteligente'
import { fmt, fmtDate } from '../utils/format'
import { mesAnterior, nomeDoMes } from '../utils/retrospectiva'
import { haptic } from '../utils/haptics'

// A retrospectiva só é baixada quando alguém abre (chunk próprio).
const MonthlyRecap = lazy(() => import('./MonthlyRecap'))

// Evento que abre a busca de qualquer lugar (ex: botão de lupa da navbar).
export const ABRIR_BUSCA = 'geldtrack:abrir-busca'
export const abrirBusca = () => window.dispatchEvent(new Event(ABRIR_BUSCA))

const combina = (texto, termo) => normalizarDescricao(texto).includes(normalizarDescricao(termo))

// Busca global / paleta de comandos (Ctrl+K, ⌘K ou "/"): páginas, ações rápidas e
// transações (busca na API com o mesmo filtro de texto do Dashboard).
export default function CommandPalette() {
  const [aberta, setAberta] = useState(false)
  const [termo, setTermo] = useState('')
  const [ativo, setAtivo] = useState(0)
  const [transacoes, setTransacoes] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [recap, setRecap] = useState(false)
  const inputRef = useRef(null)
  const listaRef = useRef(null)
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { hidden, togglePrivacy } = usePrivacy()

  const fechar = () => { setAberta(false); setTermo(''); setTransacoes([]); setAtivo(0) }

  // Atalhos globais de teclado.
  useEffect(() => {
    const onKey = (e) => {
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAberta(a => !a) }
      else if (e.key === '/' && !digitando && !aberta) { e.preventDefault(); setAberta(true) }
    }
    const onAbrir = () => setAberta(true)
    document.addEventListener('keydown', onKey)
    window.addEventListener(ABRIR_BUSCA, onAbrir)
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener(ABRIR_BUSCA, onAbrir) }
  }, [aberta])

  // Transações: busca na API depois de uma pausa na digitação.
  useEffect(() => {
    if (!aberta || termo.trim().length < 2) { setTransacoes([]); setBuscando(false); return }
    setBuscando(true)
    const t = setTimeout(() => {
      api.get('/transactions', { params: { busca: termo.trim(), limit: 6 } })
        .then(r => setTransacoes(r.data.transactions || []))
        .catch(() => setTransacoes([]))
        .finally(() => setBuscando(false))
    }, 250)
    return () => clearTimeout(t)
  }, [termo, aberta])

  const grupos = useMemo(() => {
    const acoes = [
      { id: 'nova', label: 'Nova transação', icon: Plus, palavras: 'adicionar lançar despesa receita', run: () => navigate('/dashboard', { state: { novaTransacao: true } }) },
      { id: 'retro', label: `Retrospectiva de ${nomeDoMes(mesAnterior())}`, icon: Sparkles, palavras: 'resumo stories mês', run: () => setRecap(true) },
      { id: 'tema', label: theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro', icon: theme === 'light' ? Moon : Sun, palavras: 'tema dark light aparência', run: toggleTheme },
      { id: 'privacidade', label: hidden ? 'Mostrar valores' : 'Esconder valores', icon: hidden ? Eye : EyeOff, palavras: 'privacidade ocultar borrar', run: togglePrivacy },
      { id: 'sair', label: 'Sair da conta', icon: LogOut, palavras: 'logout deslogar', run: logout },
    ]
    const paginas = NAV_LINKS.map(l => ({ id: l.path, label: l.label, icon: l.icon, palavras: `ir página ${l.short || ''}`, run: () => navigate(l.path) }))
    const filtra = (itens) => (termo ? itens.filter(i => combina(`${i.label} ${i.palavras}`, termo)) : itens)
    const tx = transacoes.map(t => ({
      id: `tx-${t.id}`,
      label: t.descricao || t.categoria,
      icon: t.tipo === 'receita' ? ArrowDownLeft : ArrowUpRight,
      detalhe: `${t.categoria} · ${fmtDate(t.data)}`,
      valor: `${t.tipo === 'receita' ? '+' : '-'}${fmt(t.valor, t.conta?.moeda)}`,
      tipo: t.tipo,
      run: () => navigate('/dashboard', { state: { busca: t.descricao || t.categoria } }),
    }))
    return [
      { titulo: 'Ações', itens: filtra(acoes) },
      { titulo: 'Páginas', itens: filtra(paginas) },
      { titulo: 'Transações', itens: tx },
    ].filter(g => g.itens.length > 0)
  }, [termo, transacoes, theme, hidden, navigate, toggleTheme, togglePrivacy, logout])

  const planos = grupos.flatMap(g => g.itens)

  useEffect(() => { setAtivo(0) }, [termo])
  useEffect(() => {
    listaRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [ativo])

  const executar = (item) => {
    if (!item) return
    haptic('light')
    fechar()
    item.run()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo(a => (a + 1) % Math.max(1, planos.length)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo(a => (a - 1 + planos.length) % Math.max(1, planos.length)) }
    else if (e.key === 'Enter') { e.preventDefault(); executar(planos[ativo]) }
    else if (e.key === 'Escape') { e.preventDefault(); fechar() }
  }

  let indice = -1
  return (
    <>
      <AnimatePresence>
        {aberta && (
          <m.div className="cmdk-overlay" onClick={fechar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <m.div
              className="cmdk"
              role="dialog"
              aria-modal="true"
              aria-label="Busca"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
            >
              <div className="cmdk-input">
                {buscando ? <Loader2 size={18} className="icon-spin" /> : <Search size={18} />}
                <input
                  ref={inputRef}
                  autoFocus
                  value={termo}
                  onChange={e => setTermo(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Buscar transações, páginas e ações..."
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="cmdk-lista"
                  aria-activedescendant={planos[ativo] ? `cmdk-${planos[ativo].id}` : undefined}
                  autoComplete="off"
                  spellCheck="false"
                />
                <kbd className="cmdk-kbd">Esc</kbd>
              </div>

              <div className="cmdk-list" id="cmdk-lista" role="listbox" ref={listaRef}>
                {planos.length === 0 && !buscando && (
                  <p className="cmdk-empty">Nada encontrado pra “{termo}”.</p>
                )}
                {grupos.map(g => (
                  <div key={g.titulo} role="group" aria-label={g.titulo}>
                    <p className="cmdk-group">{g.titulo}</p>
                    {g.itens.map(item => {
                      indice++
                      const i = indice
                      const Icon = item.icon
                      return (
                        <div
                          key={item.id}
                          id={`cmdk-${item.id}`}
                          role="option"
                          aria-selected={i === ativo}
                          className={`cmdk-item${i === ativo ? ' cmdk-item--active' : ''}${item.tipo ? ` cmdk-item--${item.tipo}` : ''}`}
                          onMouseMove={() => setAtivo(i)}
                          onClick={() => executar(item)}
                        >
                          <span className="cmdk-item-icon"><Icon size={16} /></span>
                          <span className="cmdk-item-text">
                            {item.label}
                            {item.detalhe && <small>{item.detalhe}</small>}
                          </span>
                          {item.valor && <span className="cmdk-item-valor money">{item.valor}</span>}
                          {i === ativo && <CornerDownLeft size={14} className="cmdk-item-enter" aria-hidden="true" />}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="cmdk-footer" aria-hidden="true">
                <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
                <span><kbd>Enter</kbd> abrir</span>
                <span><kbd>Ctrl</kbd><kbd>K</kbd> abre de qualquer lugar</span>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
      {recap && <Suspense fallback={null}><MonthlyRecap mes={mesAnterior()} onClose={() => setRecap(false)} /></Suspense>}
    </>
  )
}
