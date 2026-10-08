import { useMemo, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { fmt } from '../utils/format'
import { gastosPorDia, nivelDoDia } from '../utils/retrospectiva'
import { haptic } from '../utils/haptics'

const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Mapa de calor dos gastos do mês: cada dia pinta mais forte quanto mais se gastou
// (relativo ao dia mais caro do mês). Tocar num dia mostra as despesas dele.
export default function SpendingCalendar({ transacoes, mes, taxas }) {
  const [selecionado, setSelecionado] = useState(null)
  const porDia = useMemo(() => gastosPorDia(transacoes, taxas), [transacoes, taxas])
  const maximo = Math.max(0, ...Object.values(porDia))

  const [ano, mesNum] = mes.split('-').map(Number)
  const totalDias = new Date(ano, mesNum, 0).getDate()
  const offset = new Date(ano, mesNum - 1, 1).getDay() // domingo = 0
  const hoje = hojeISO()

  const diasComGasto = Object.keys(porDia).length
  const total = Object.values(porDia).reduce((s, v) => s + v, 0)

  const despesasDoDia = selecionado
    ? (transacoes || []).filter(t => t.tipo === 'despesa' && t.data === selecionado)
    : []

  const escolher = (dia) => {
    setSelecionado(s => (s === dia ? null : dia))
    haptic('light')
  }

  return (
    <div className="spend-cal">
      <div className="spend-cal-grid" role="grid" aria-label="Gastos por dia do mês">
        {SEMANA.map((d, i) => <span key={i} className="spend-cal-weekday" aria-hidden="true">{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`v${i}`} aria-hidden="true" />)}
        {Array.from({ length: totalDias }, (_, i) => {
          const dia = `${mes}-${String(i + 1).padStart(2, '0')}`
          const valor = porDia[dia] || 0
          const nivel = nivelDoDia(valor, maximo)
          const futuro = dia > hoje
          return (
            <m.button
              key={dia}
              type="button"
              className={`spend-cal-day nivel-${nivel}${dia === hoje ? ' hoje' : ''}${selecionado === dia ? ' selecionado' : ''}${futuro ? ' futuro' : ''}`}
              onClick={() => escolher(dia)}
              disabled={futuro}
              aria-pressed={selecionado === dia}
              aria-label={`Dia ${i + 1}: ${valor ? `${fmt(valor)} em despesas` : 'sem despesas'}`}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.012, duration: 0.25 }}
            >
              {i + 1}
            </m.button>
          )
        })}
      </div>

      <div className="spend-cal-legend" aria-hidden="true">
        <span>menos</span>
        {[0, 1, 2, 3, 4].map(n => <span key={n} className={`spend-cal-swatch nivel-${n}`} />)}
        <span>mais</span>
      </div>

      <p className="spend-cal-summary">
        {diasComGasto > 0
          ? <>Gastos em <strong>{diasComGasto}</strong> {diasComGasto === 1 ? 'dia' : 'dias'} · média de <span className="money">{fmt(total / diasComGasto)}</span> por dia com gasto</>
          : 'Nenhuma despesa neste mês.'}
      </p>

      <AnimatePresence initial={false}>
        {selecionado && (
          <m.div
            key={selecionado}
            className="spend-cal-detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="spend-cal-detail-head">
              <strong>{new Date(selecionado + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
              <span className="money">{fmt(porDia[selecionado] || 0)}</span>
            </div>
            {despesasDoDia.length === 0 ? (
              <p className="spend-cal-empty">Nenhuma despesa nesse dia. 🧘</p>
            ) : (
              <ul>
                {despesasDoDia.map(t => (
                  <li key={t.id}>
                    <span>{t.descricao || t.categoria}<small>{t.categoria}</small></span>
                    <span className="money negative">{fmt(t.valor, t.conta?.moeda)}</span>
                  </li>
                ))}
              </ul>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
