import { Pencil, Trash2 } from 'lucide-react'

export default function CategoriaChip({ categoria, onEdit, onDelete }) {
  return (
    <div className="categoria-chip" style={{ '--categoria-cor': categoria.cor }}>
      <span className="categoria-chip-icone">{categoria.icone}</span>
      <span className="categoria-chip-nome">{categoria.nome}</span>
      <div className="categoria-chip-actions">
        <button className="btn-icon" onClick={() => onEdit(categoria)} title="Editar" aria-label="Editar"><Pencil size={16} /></button>
        <button className="btn-icon btn-danger" onClick={() => onDelete(categoria)} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button>
      </div>
    </div>
  )
}
