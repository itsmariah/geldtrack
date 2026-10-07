import { useId } from 'react'

// Minigráfico de linha (SVG puro) com área em gradiente, revelado da esquerda pra direita
// ao aparecer (clip-path no CSS). Estica pra largura do container (preserveAspectRatio=none
// + traço que não escala). `color` aceita qualquer cor CSS, inclusive var(--green).
export default function Sparkline({ data, color = 'var(--primary-light)', width = 120, height = 36, label }) {
  const gradId = useId()
  if (!data || data.length < 2 || data.every(v => v === 0)) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pad = 3
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    pad + (1 - (v - min) / range) * (height - pad * 2),
  ])
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} className="sparkline-area" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="sparkline-line" />
    </svg>
  )
}
