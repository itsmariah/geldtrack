import { useState } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'
import { X } from 'lucide-react'

export default function CategoriaModal({ categoria, tipoPadrao, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: categoria?.nome || '',
    tipo: categoria?.tipo || tipoPadrao || 'despesa',
    icone: categoria?.icone || '💰',
    cor: categoria?.cor || '#6366f1',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (categoria) {
        await api.put(`/categorias/${categoria.id}`, form)
      } else {
        await api.post('/categorias', form)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar categoria')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>{categoria ? 'Editar Categoria' : 'Nova Categoria'}</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        {!categoria && (
          <div className="form-row">
            <label className={`type-btn ${form.tipo === 'receita' ? 'active-income' : ''}`}>
              <input
                type="radio"
                value="receita"
                checked={form.tipo === 'receita'}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
              />
              ↑ Receita
            </label>
            <label className={`type-btn ${form.tipo === 'despesa' ? 'active-expense' : ''}`}>
              <input
                type="radio"
                value="despesa"
                checked={form.tipo === 'despesa'}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
              />
              ↓ Despesa
            </label>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="cat-nome">Nome</label>
          <input
            id="cat-nome"
            type="text"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Streaming, Academia..."
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="cat-icone">Ícone (emoji)</label>
            <input
              id="cat-icone"
              type="text"
              value={form.icone}
              onChange={e => setForm({ ...form, icone: e.target.value })}
              maxLength={4}
              placeholder="💰"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="cat-cor">Cor</label>
            <input
              id="cat-cor"
              type="color"
              value={form.cor}
              onChange={e => setForm({ ...form, cor: e.target.value })}
              className="color-input"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvando...' : categoria ? 'Atualizar' : 'Criar categoria'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
