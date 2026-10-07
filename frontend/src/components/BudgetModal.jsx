import { useState } from 'react'
import api from '../services/api'
import { useCategorias } from '../context/CategoriasContext'
import Modal from './Modal'
import Alert from './Alert'
import { Loader2, X } from 'lucide-react'

export default function BudgetModal({ orcamento, existingCategorias, onClose, onSaved }) {
  const { categoriasDespesa } = useCategorias()
  const disponiveis = categoriasDespesa.filter(
    c => c === orcamento?.categoria || !existingCategorias.includes(c)
  )
  const [form, setForm] = useState({
    categoria: orcamento?.categoria || disponiveis[0] || '',
    valorLimite: orcamento?.valorLimite ?? '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (orcamento) {
        await api.put(`/orcamentos/${orcamento.id}`, form)
      } else {
        await api.post('/orcamentos', form)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar orçamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>{orcamento ? 'Editar Orçamento' : 'Novo Orçamento'}</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {disponiveis.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>
          Você já tem um orçamento pra todas as categorias de despesa disponíveis.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="orcamento-categoria">Categoria</label>
            <select
              id="orcamento-categoria"
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
            >
              {disponiveis.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="orcamento-valor">Limite mensal (R$)</label>
            <input
              id="orcamento-valor"
              type="number"
              step="0.01"
              min="0.01"
              value={form.valorLimite}
              onChange={e => setForm({ ...form, valorLimite: e.target.value })}
              placeholder="0,00"
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
              {loading ? 'Salvando...' : orcamento ? 'Atualizar' : 'Criar orçamento'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
