import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react'

// TEMPORÁRIO — painel para comparar fontes nas telas reais antes de escolher a definitiva.
// Ativa abrindo qualquer página com "?fontes" na URL; a escolha fica salva no navegador
// enquanto o teste estiver ativo e some ao clicar em "Encerrar teste".
// Depois da escolha, este componente (e o <FontTester /> em App.jsx) deve ser removido.

const STORAGE_KEY = 'fontTester'
const SYSTEM_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const BODY_FONTS = ['Sistema (atual)', 'Inter', 'Plus Jakarta Sans', 'Manrope', 'DM Sans', 'Geist', 'Figtree', 'Outfit']
const DISPLAY_FONTS = ['Sora (atual)', 'Mesma do corpo', 'Inter', 'Plus Jakarta Sans', 'Manrope', 'Outfit', 'Space Grotesk', 'Geist', 'Lexend']

function googleFamily(label) {
  if (label === 'Sistema (atual)' || label === 'Mesma do corpo') return null
  return label === 'Sora (atual)' ? 'Sora' : label
}

function loadFont(family) {
  if (!family) return
  const id = `font-test-${family.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@400;500;600;700;800&display=swap`
  document.head.appendChild(link)
}

function stackFor(label, bodyLabel) {
  if (label === 'Mesma do corpo') return stackFor(bodyLabel)
  const family = googleFamily(label)
  return family ? `'${family}', ${SYSTEM_STACK}` : SYSTEM_STACK
}

function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.body && saved?.display) return saved
  } catch { /* storage indisponível ou valor inválido */ }
  return null
}

function isRequested() {
  return new URLSearchParams(window.location.search).has('fontes')
}

export default function FontTester() {
  const [choice, setChoice] = useState(() => readSaved() || (isRequested() ? { body: BODY_FONTS[0], display: DISPLAY_FONTS[0] } : null))
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!choice) return
    const root = document.documentElement.style
    loadFont(googleFamily(choice.body))
    loadFont(googleFamily(choice.display === 'Mesma do corpo' ? choice.body : choice.display))
    root.setProperty('--font-body', stackFor(choice.body))
    root.setProperty('--font-display', stackFor(choice.display, choice.body))
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(choice)) } catch { /* ignore */ }
  }, [choice])

  if (!choice) return null

  const set = (key, value) => setChoice(c => ({ ...c, [key]: value }))
  const step = (key, list, dir) => {
    const i = list.indexOf(choice[key])
    set(key, list[(i + dir + list.length) % list.length])
  }

  const encerrar = () => {
    const root = document.documentElement.style
    root.removeProperty('--font-body')
    root.removeProperty('--font-display')
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    setChoice(null)
  }

  const row = (key, label, list) => (
    <div className="font-tester-row">
      <span className="font-tester-label">{label}</span>
      <div className="font-tester-control">
        <button type="button" className="btn-icon" onClick={() => step(key, list, -1)} aria-label={`${label}: anterior`}><ChevronLeft size={16} /></button>
        <select value={choice[key]} onChange={e => set(key, e.target.value)} aria-label={label}>
          {list.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button type="button" className="btn-icon" onClick={() => step(key, list, 1)} aria-label={`${label}: próxima`}><ChevronRight size={16} /></button>
      </div>
    </div>
  )

  return (
    <aside className={`font-tester${collapsed ? ' font-tester--collapsed' : ''}`} aria-label="Teste de fontes">
      <div className="font-tester-header">
        <button type="button" className="font-tester-title" onClick={() => setCollapsed(c => !c)} aria-expanded={!collapsed}>
          Aa · Teste de fontes
          <ChevronDown size={16} className={`icon-chevron${collapsed ? '' : ' icon-chevron--open'}`} />
        </button>
        <button type="button" className="btn-icon" onClick={encerrar} title="Encerrar teste" aria-label="Encerrar teste"><X size={16} /></button>
      </div>
      {!collapsed && (
        <div className="font-tester-body">
          {row('body', 'Corpo', BODY_FONTS)}
          {row('display', 'Títulos', DISPLAY_FONTS)}
          <p className="font-tester-sample">R$ 12.345,67 · Saldo do mês</p>
        </div>
      )}
    </aside>
  )
}
