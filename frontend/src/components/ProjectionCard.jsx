import { fmt, fmtDate } from '../utils/format'
import AnimatedMoney from './AnimatedMoney'

export default function ProjectionCard({ projecao }) {
  if (!projecao) return null

  const { saldoAtual, saldoProjetado, receitasRecorrentesFuturas, despesasRecorrentesFuturas, estimativaGastosRestante, diasRestantes, fimDoMes } = projecao

  return (
    <div className="projection-card">
      <div className="projection-main">
        <span className="projection-label">
          Saldo previsto até {fmtDate(fimDoMes)}
          {diasRestantes > 0 && <span className="projection-days"> · faltam {diasRestantes} dia{diasRestantes > 1 ? 's' : ''}</span>}
        </span>
        <span className={`projection-value ${saldoProjetado >= 0 ? 'positive' : 'negative'}`}><AnimatedMoney value={saldoProjetado} /></span>
      </div>
      <div className="projection-breakdown">
        <span><span className="money">{fmt(saldoAtual)}</span> hoje</span>
        {receitasRecorrentesFuturas > 0 && <span className="positive">+ <span className="money">{fmt(receitasRecorrentesFuturas)}</span> recorrentes previstas</span>}
        {despesasRecorrentesFuturas > 0 && <span className="negative">− <span className="money">{fmt(despesasRecorrentesFuturas)}</span> recorrentes previstas</span>}
        {estimativaGastosRestante > 0 && <span className="negative">− <span className="money">{fmt(estimativaGastosRestante)}</span> estimado no ritmo atual</span>}
      </div>
    </div>
  )
}
