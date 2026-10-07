import Modal from './Modal'
import { X } from 'lucide-react'

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel}>
      <div className="modal-header">
        <h3>{title}</h3>
        <button className="modal-close" onClick={onCancel} aria-label="Fechar"><X size={20} /></button>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>{message}</p>
      <div className="modal-footer">
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}
