import { useNavigate } from 'react-router-dom'
import { fmt, fmtDate } from '../utils/format'
import { Pencil, Trash2 } from 'lucide-react'

function progressLevel(percentual, estourado) {
  if (estourado) return 'over'
  if (percentual >= 80) return 'warn'
  return 'ok'
}

export default function EventoCard({ evento, onEdit, onDelete, onToggleStatus }) {
  const navigate = useNavigate()
  const encerrado = evento.status === 'encerrado'
  const temOrcamento = evento.orcamento != null
  const level = temOrcamento ? progressLevel(evento.percentual, evento.estourado) : 'ok'
  const pct = temOrcamento ? Math.min(100, evento.percentual) : 0

  // Botões de ação não devem disparar a navegação pro detalhe do evento (o card
  // inteiro é clicável, então cada ação para a propagação antes de rodar).
  const stop = (fn) => (e) => { e.stopPropagation(); fn() }

  return (
    <div
      className={`evento-card budget-card budget-card--${level}${encerrado ? ' evento-card--encerrado' : ''}`}
      onClick={() => navigate(`/eventos/${evento.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') navigate(`/eventos/${evento.id}`) }}
    >
      <div className="meta-card-header">
        <div>
          <h3>{evento.nome}</h3>
          <span className={`evento-badge evento-badge--${evento.status}`}>{encerrado ? 'Encerrado' : 'Ativo'}</span>
          <div className="tx-meta">
            {fmtDate(evento.dataInicio)}{evento.dataFim && ` – ${fmtDate(evento.dataFim)}`}
          </div>
        </div>
        <div className="tx-actions">
          <button className="btn-icon" onClick={stop(() => onEdit(evento))} title="Editar" aria-label="Editar"><Pencil size={16} /></button>
          <button className="btn-icon btn-danger" onClick={stop(() => onDelete(evento.id))} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button>
        </div>
      </div>

      {temOrcamento && (
        <>
          <div className="meta-progress-bar">
            <div className={`budget-progress-fill budget-progress-fill--${level}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="meta-progress-info">
            <span><span className="money">{fmt(evento.gasto)}</span> de <span className="money">{fmt(evento.orcamento)}</span></span>
            <span className="meta-progress-pct">{evento.percentual}%</span>
          </div>
        </>
      )}

      <div className="meta-card-status">
        {evento.estourado ? (
          <span className="budget-badge budget-badge--over">⚠ Orçamento estourado em <span className="money">{fmt(evento.gasto - evento.orcamento)}</span></span>
        ) : (
          <span>Gasto <span className="money">{fmt(evento.gasto)}</span> · Recebido <span className="money">{fmt(evento.recebido)}</span> · Saldo <span className="money">{fmt(evento.saldo)}</span></span>
        )}
      </div>

      <div className="meta-card-actions">
        <button type="button" className="btn-link" onClick={stop(() => onToggleStatus(evento))}>
          {encerrado ? 'Reabrir evento' : 'Encerrar evento'}
        </button>
      </div>
    </div>
  )
}
