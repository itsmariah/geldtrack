import { useState } from 'react'
import { fmt, fmtDate } from '../utils/format'
import { Pencil, Plus, Trash2 } from 'lucide-react'

export default function MetaCard({ meta, onEdit, onDelete, onAddAporte, onDeleteAporte }) {
  const [showHistory, setShowHistory] = useState(false)
  const pct = meta.valorAlvo > 0 ? Math.min(100, Math.round((meta.valorAtual / meta.valorAlvo) * 100)) : 0
  const restante = Math.max(0, meta.valorAlvo - meta.valorAtual)

  return (
    <div className={`meta-card${meta.concluida ? ' meta-card--concluida' : ''}`}>
      <div className="meta-card-header">
        <h3>{meta.titulo}</h3>
        <div className="tx-actions">
          <button className="btn-icon" onClick={() => onEdit(meta)} title="Editar" aria-label="Editar"><Pencil size={16} /></button>
          <button className="btn-icon btn-danger" onClick={() => onDelete(meta.id)} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="meta-progress-bar">
        <div className="meta-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="meta-progress-info">
        <span>{fmt(meta.valorAtual)} de {fmt(meta.valorAlvo)}</span>
        <span className="meta-progress-pct">{pct}%</span>
      </div>

      <div className="meta-card-status">
        {meta.concluida ? (
          <span className="meta-badge meta-badge--done">🎉 Meta concluída</span>
        ) : (
          <span>Faltam {fmt(restante)}{meta.prazo ? ` até ${fmtDate(meta.prazo)}` : ''}</span>
        )}
      </div>

      <div className="meta-card-actions">
        <button className="btn btn-outline btn-sm" onClick={() => onAddAporte(meta)}><Plus size={16} /> Aporte</button>
        {meta.aportes.length > 0 && (
          <button type="button" className="btn-link" onClick={() => setShowHistory(s => !s)}>
            {showHistory ? 'Ocultar histórico' : `Ver histórico (${meta.aportes.length})`}
          </button>
        )}
      </div>

      {showHistory && (
        <ul className="meta-aportes-list">
          {meta.aportes.map(a => (
            <li key={a.id}>
              <span className="meta-aporte-info">{fmtDate(a.data)}{a.descricao ? ` · ${a.descricao}` : ''}</span>
              <span className="meta-aporte-valor">+{fmt(a.valor)}</span>
              <button className="btn-icon btn-danger" onClick={() => onDeleteAporte(meta, a.id)} title="Remover aporte" aria-label="Remover aporte"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
