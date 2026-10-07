import { fmt } from '../utils/format'
import { iconeTipoConta, labelTipoConta } from '../utils/contaTipos'
import { Pencil, Trash2 } from 'lucide-react'

export default function ContaCard({ conta, onEdit, onDelete }) {
  return (
    <div className="conta-card">
      <div className="meta-card-header">
        <h3>{iconeTipoConta(conta.tipo)} {conta.nome}</h3>
        <div className="tx-actions">
          <button className="btn-icon" onClick={() => onEdit(conta)} title="Editar" aria-label="Editar"><Pencil size={16} /></button>
          <button className="btn-icon btn-danger" onClick={() => onDelete(conta)} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className={`conta-saldo ${conta.saldo < 0 ? 'negative' : 'positive'}`}>{fmt(conta.saldo, conta.moeda)}</div>
      <div className="meta-card-status">{labelTipoConta(conta.tipo)}{conta.moeda && conta.moeda !== 'BRL' ? ` · ${conta.moeda}` : ''}</div>
    </div>
  )
}
