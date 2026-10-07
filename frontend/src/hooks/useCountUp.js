import { useEffect, useRef, useState } from 'react'

const easeOutExpo = (p) => (p === 1 ? 1 : 1 - Math.pow(2, -10 * p))

// Número que "corre" do valor anterior até o novo (na primeira vez, a partir de 0).
// requestAnimationFrame puro — sem Framer Motion, pra não puxar o motor de animação pro
// pacote inicial. Com "reduzir movimento" ativo, pula direto pro valor final.
export function useCountUp(value, duration = 900) {
  const target = Number(value) || 0
  const [display, setDisplay] = useState(0)
  const current = useRef(0)

  useEffect(() => {
    const from = current.current
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || from === target) {
      current.current = target
      setDisplay(target)
      return
    }
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const v = from + (target - from) * easeOutExpo(p)
      current.current = v
      setDisplay(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return display
}
