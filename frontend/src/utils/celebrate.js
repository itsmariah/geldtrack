import { haptic } from './haptics'

const COLORS = ['#6366f1', '#818cf8', '#a78bfa', '#22c55e', '#eab308', '#f472b6']

// Chuva de confete pra marcos (ex: meta concluída). A lib (canvas-confetti) só é baixada
// na primeira comemoração; com "reduzir movimento" ativo fica só a vibração.
export async function celebrate() {
  haptic('celebrate')
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const { default: confetti } = await import('canvas-confetti')
  const base = { colors: COLORS, zIndex: 1300, disableForReducedMotion: true }

  confetti({ ...base, particleCount: 90, spread: 80, startVelocity: 42, origin: { y: 0.7 } })
  // Dois "canhões" laterais por ~1s depois da explosão central.
  const end = Date.now() + 1000
  ;(function frame() {
    confetti({ ...base, particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.8 } })
    confetti({ ...base, particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.8 } })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}
