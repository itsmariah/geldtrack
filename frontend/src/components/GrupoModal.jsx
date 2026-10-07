import { useState } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'
import { Loader2, X } from 'lucide-react'

// Sem "grupo": cria um grupo novo. Com "grupo": renomeia (só admin chega aqui).
export default function GrupoModal({ grupo, onClose, onSaved }) {
  const [nome, setNome] = useState(grupo?.nome || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (grupo) {
        await api.put(`/grupos/${grupo.id}`, { nome })
      } else {
        await api.post('/grupos', { nome })
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || (grupo ? 'Erro ao renomear grupo' : 'Erro ao criar grupo'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>{grupo ? 'Editar Grupo' : 'Novo Grupo'}</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="grupo-nome">Nome</label>
          <input
            id="grupo-nome"
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Viagem Nordeste"
            maxLength={60}
            required
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
            {grupo
              ? (loading ? 'Salvando...' : 'Salvar')
              : (loading ? 'Criando...' : 'Criar grupo')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
