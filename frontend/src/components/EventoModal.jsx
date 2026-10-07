import { useState } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'
import { X } from 'lucide-react'

export default function EventoModal({ evento, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: evento?.nome || '',
    dataInicio: evento?.dataInicio || '',
    dataFim: evento?.dataFim || '',
    orcamento: evento?.orcamento ?? '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        nome: form.nome,
        dataInicio: form.dataInicio,
        dataFim: form.dataFim || null,
        orcamento: form.orcamento === '' ? null : form.orcamento,
      }
      if (evento) {
        await api.put(`/eventos/${evento.id}`, payload)
      } else {
        await api.post('/eventos', payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>{evento ? 'Editar Evento' : 'Novo Evento'}</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="evento-nome">Nome</label>
          <input
            id="evento-nome"
            type="text"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Viagem Rio 2026"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="evento-data-inicio">Data de início</label>
          <input
            id="evento-data-inicio"
            type="date"
            value={form.dataInicio}
            onChange={e => setForm({ ...form, dataInicio: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="evento-data-fim">Data de fim (opcional)</label>
          <input
            id="evento-data-fim"
            type="date"
            value={form.dataFim}
            onChange={e => setForm({ ...form, dataFim: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="evento-orcamento">Orçamento (opcional)</label>
          <input
            id="evento-orcamento"
            type="number"
            step="0.01"
            min="0.01"
            value={form.orcamento}
            onChange={e => setForm({ ...form, orcamento: e.target.value })}
            placeholder="0,00"
          />
          <span className="form-hint">Defina um teto de gasto pra acompanhar o progresso do evento.</span>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvando...' : evento ? 'Atualizar' : 'Criar evento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
