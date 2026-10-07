import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { haptic } from '../utils/haptics'

const THRESHOLD = 72 // px puxados (já com resistência) pra disparar
const MAX = 110

// "Puxar pra atualizar" no topo da página, só em telas de toque. Enquanto montado, desliga
// o pull-to-refresh nativo do navegador (que recarregaria a página inteira) via
// overscroll-behavior. Não age com modal/sheet aberto.
export default function PullToRefresh({ onRefresh }) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const pullRef = useRef(0)
  const armed = useRef(false)
  // refs pra os handlers (registrados uma vez só) enxergarem o estado/callback atuais
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (!window.matchMedia?.('(pointer: coarse)').matches) return

    const html = document.documentElement
    const prevOverscroll = html.style.overscrollBehaviorY
    html.style.overscrollBehaviorY = 'contain'

    const bloqueado = () => document.querySelector('.modal-overlay, .more-sheet')

    const onStart = (e) => {
      if (refreshingRef.current || window.scrollY > 0 || bloqueado()) { startY.current = null; return }
      startY.current = e.touches[0].clientY
      armed.current = false
    }
    const onMove = (e) => {
      if (startY.current === null) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0 || window.scrollY > 0) { if (pullRef.current) { pullRef.current = 0; setPull(0) } return }
      // Resistência: quanto mais puxa, menos anda.
      const p = Math.min(MAX, dy * 0.5)
      pullRef.current = p
      setPull(p)
      if (e.cancelable) e.preventDefault()
      if (p >= THRESHOLD && !armed.current) { armed.current = true; haptic('light') }
      if (p < THRESHOLD) armed.current = false
    }
    const onEnd = async () => {
      if (startY.current === null) return
      startY.current = null
      const p = pullRef.current
      pullRef.current = 0
      if (p >= THRESHOLD) {
        refreshingRef.current = true
        setRefreshing(true)
        setPull(THRESHOLD)
        try { await onRefreshRef.current() } finally {
          refreshingRef.current = false
          setRefreshing(false)
          setPull(0)
          haptic('success')
        }
      } else {
        setPull(0)
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      html.style.overscrollBehaviorY = prevOverscroll
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  if (!pull && !refreshing) return null

  const progress = Math.min(1, pull / THRESHOLD)
  return (
    <div
      className={`ptr-indicator${refreshing ? ' ptr-indicator--refreshing' : ''}${progress >= 1 ? ' ptr-indicator--ready' : ''}`}
      style={{ transform: `translate(-50%, ${pull - 44}px)`, opacity: Math.max(0.2, progress) }}
      role="status"
      aria-live="polite"
    >
      <RefreshCw size={20} style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }} className={refreshing ? 'icon-spin' : ''} />
      <span className="sr-only">{refreshing ? 'Atualizando...' : 'Solte para atualizar'}</span>
    </div>
  )
}
