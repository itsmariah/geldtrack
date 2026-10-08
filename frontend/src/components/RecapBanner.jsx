import { useState, lazy, Suspense } from 'react'
import { m } from 'framer-motion'
import { Play, Sparkles, X } from 'lucide-react'
import { mesAnterior, nomeDoMes } from '../utils/retrospectiva'

// A retrospectiva só é baixada quando alguém abre (chunk próprio).
const MonthlyRecap = lazy(() => import('./MonthlyRecap'))

const DIAS_VISIVEL = 10 // nos primeiros dias do mês, convida pra ver a retrospectiva do anterior

function chaveVista(mes) { return `geldtrack:retrospectiva-vista:${mes}` }

function jaViu(mes) {
  try { return localStorage.getItem(chaveVista(mes)) === '1' } catch { return true }
}

// Card no topo do Dashboard: "Sua retrospectiva de setembro está pronta". Some depois
// de assistir ou fechar (por mês) e depois do dia 10.
export default function RecapBanner() {
  const mes = mesAnterior()
  const [visivel, setVisivel] = useState(() => new Date().getDate() <= DIAS_VISIVEL && !jaViu(mes))
  const [aberto, setAberto] = useState(false)

  const marcarVista = () => {
    try { localStorage.setItem(chaveVista(mes), '1') } catch { /* ignore */ }
  }

  if (!visivel && !aberto) return null

  return (
    <>
      {visivel && (
        <m.div
          className="recap-banner"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="recap-banner-icon" aria-hidden="true"><Sparkles size={20} /></span>
          <div className="recap-banner-text">
            <strong>Sua retrospectiva de {nomeDoMes(mes)} está pronta</strong>
            <span>Categoria campeã, maior gasto, dias sem gastar e mais.</span>
          </div>
          <button type="button" className="btn btn-sm recap-banner-play" onClick={() => { marcarVista(); setVisivel(false); setAberto(true) }}>
            <Play size={14} /> Ver agora
          </button>
          <button type="button" className="btn-icon recap-banner-close" onClick={() => { marcarVista(); setVisivel(false) }} aria-label="Dispensar">
            <X size={16} />
          </button>
        </m.div>
      )}
      {aberto && <Suspense fallback={null}><MonthlyRecap mes={mes} onClose={() => setAberto(false)} /></Suspense>}
    </>
  )
}
