import { useState } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'
import { Loader2, X } from 'lucide-react'
import MoneyInput from './MoneyInput'

export default function MetaModal({ meta, onClose, onSaved }) {
  const [form, setForm] = useState({
    titulo: meta?.titulo || '',
    valorAlvo: meta?.valorAlvo ?? '',
    prazo: meta?.prazo || '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = { ...form, prazo: form.prazo || null }
      if (meta) {
        await api.put(`/metas/${meta.id}`, payload)
      } else {
        await api.post('/metas', payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar meta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>{meta ? 'Editar Meta' : 'Nova Meta'}</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="meta-titulo">Título</label>
          <input
            id="meta-titulo"
            type="text"
            value={form.titulo}
            onChange={e => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ex: Viagem pra praia, Reserva de emergência..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="meta-valor-alvo">Valor alvo (R$)</label>
          <MoneyInput
            id="meta-valor-alvo"
            value={form.valorAlvo}
            onChange={e => setForm({ ...form, valorAlvo: e.target.value })}
            placeholder="0,00"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="meta-prazo">Prazo (opcional)</label>
          <input
            id="meta-prazo"
            type="date"
            value={form.prazo}
            onChange={e => setForm({ ...form, prazo: e.target.value })}
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
            {loading ? 'Salvando...' : meta ? 'Atualizar' : 'Criar meta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
