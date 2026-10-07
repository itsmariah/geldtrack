import { fmt } from '../utils/format'
import { Pencil, Trash2 } from 'lucide-react'

function progressLevel(percentual, estourado) {
  if (estourado) return 'over'
  if (percentual >= 80) return 'warn'
  return 'ok'
}

export default function BudgetCard({ orcamento, onEdit, onDelete }) {
  const level = progressLevel(orcamento.percentual, orcamento.estourado)
  const pct = Math.min(100, orcamento.percentual)

  return (
    <div className={`budget-card budget-card--${level}`}>
      <div className="meta-card-header">
        <h3>{orcamento.categoria}</h3>
        <div className="tx-actions">
          <button className="btn-icon" onClick={() => onEdit(orcamento)} title="Editar" aria-label="Editar"><Pencil size={16} /></button>
          <button className="btn-icon btn-danger" onClick={() => onDelete(orcamento.id)} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="meta-progress-bar">
        <div className={`budget-progress-fill budget-progress-fill--${level}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="meta-progress-info">
        <span><span className="money">{fmt(orcamento.gasto)}</span> de <span className="money">{fmt(orcamento.valorLimite)}</span></span>
        <span className="meta-progress-pct">{orcamento.percentual}%</span>
      </div>

      <div className="meta-card-status">
        {orcamento.estourado ? (
          <span className="budget-badge budget-badge--over">⚠ Limite estourado em <span className="money">{fmt(orcamento.gasto - orcamento.valorLimite)}</span></span>
        ) : (
          <span>Restam <span className="money">{fmt(orcamento.restante)}</span> este mês</span>
        )}
      </div>
    </div>
  )
}
