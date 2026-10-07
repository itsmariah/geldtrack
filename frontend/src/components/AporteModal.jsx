import { useState } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'
import { Loader2, X } from 'lucide-react'
import MoneyInput from './MoneyInput'

// new Date().toISOString() é UTC — perto da meia-noite no Brasil (UTC-3) isso adianta
// a data em um dia. Aqui montamos a data local manualmente para evitar esse desvio.
function todayLocal() {
  const now = new Date()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const dia = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mes}-${dia}`
}

export default function AporteModal({ meta, onClose, onSaved }) {
  const [form, setForm] = useState({ valor: '', data: todayLocal(), descricao: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post(`/metas/${meta.id}/aportes`, form)
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar aporte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>Novo aporte — {meta.titulo}</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="aporte-valor">Valor (R$)</label>
          <MoneyInput
            id="aporte-valor"
            value={form.valor}
            onChange={e => setForm({ ...form, valor: e.target.value })}
            placeholder="0,00"
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="aporte-data">Data</label>
          <input
            id="aporte-data"
            type="date"
            value={form.data}
            onChange={e => setForm({ ...form, data: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="aporte-descricao">Descrição (opcional)</label>
          <input
            id="aporte-descricao"
            type="text"
            value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
            placeholder="Ex: 13º salário, sobrou do mês..."
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
            {loading ? 'Salvando...' : 'Adicionar aporte'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
