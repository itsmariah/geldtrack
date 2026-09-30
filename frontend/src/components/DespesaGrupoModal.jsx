import { useState } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'
import { fmt } from '../utils/format'

// new Date().toISOString() é UTC — perto da meia-noite no Brasil (UTC-3) isso adianta
// a data em um dia. Aqui montamos a data local manualmente para evitar esse desvio.
function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Réplica em JS só pra preview em tempo real — quem decide de verdade é o backend
// (utils/splitDespesaGrupo.js), que roda de novo no submit.
function splitPreview(valorTotal, participanteIds) {
  const n = participanteIds.length
  const valor = Number(valorTotal)
  if (!n || !valor) return {}
  const totalCents = Math.round(valor * 100)
  const base = Math.floor(totalCents / n)
  const leftover = totalCents - base * n
  const result = {}
  participanteIds.forEach((id, i) => { result[id] = (base + (i < leftover ? 1 : 0)) / 100 })
  return result
}

export default function DespesaGrupoModal({ grupoId, despesa, membros, moedas, moedaPadrao = 'BRL', defaultPagoPorMembroId, onClose, onSaved }) {
  const [form, setForm] = useState({
    descricao: despesa?.descricao || '',
    valorTotal: despesa?.valorTotal ?? '',
    moeda: despesa?.moeda || moedaPadrao,
    data: despesa?.data || todayLocal(),
    pagoPorMembroId: despesa?.pagoPorMembroId ?? defaultPagoPorMembroId ?? (membros[0]?.id ?? ''),
  })
  const [participanteIds, setParticipanteIds] = useState(
    despesa ? despesa.divisoes.map(d => d.membroId) : membros.map(m => m.id)
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleParticipante = (id) => {
    setParticipanteIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  const todosSelecionados = participanteIds.length === membros.length
  const toggleTodos = () => setParticipanteIds(todosSelecionados ? [] : membros.map(m => m.id))

  const preview = splitPreview(form.valorTotal, participanteIds)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (participanteIds.length === 0) {
      setError('Selecione ao menos um participante')
      return
    }
    setLoading(true)
    try {
      const payload = { ...form, pagoPorMembroId: Number(form.pagoPorMembroId), participanteIds }
      if (despesa) {
        await api.put(`/grupos/${grupoId}/despesas/${despesa.id}`, payload)
      } else {
        await api.post(`/grupos/${grupoId}/despesas`, payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar despesa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>{despesa ? 'Editar Despesa' : 'Nova Despesa'}</h3>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="despesa-descricao">Descrição</label>
          <input
            id="despesa-descricao"
            type="text"
            value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
            placeholder="Ex: Jantar, Hospedagem..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="despesa-moeda">Moeda</label>
          <select
            id="despesa-moeda"
            value={form.moeda}
            onChange={e => setForm({ ...form, moeda: e.target.value })}
          >
            {moedas.map(m => <option key={m.codigo} value={m.codigo}>{m.simbolo} {m.nome}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="despesa-valor">Valor total ({moedas.find(m => m.codigo === form.moeda)?.simbolo || form.moeda})</label>
          <input
            id="despesa-valor"
            type="number"
            step="0.01"
            min="0.01"
            value={form.valorTotal}
            onChange={e => setForm({ ...form, valorTotal: e.target.value })}
            placeholder="0,00"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="despesa-data">Data</label>
          <input
            id="despesa-data"
            type="date"
            value={form.data}
            onChange={e => setForm({ ...form, data: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="despesa-pagador">Quem pagou</label>
          <select
            id="despesa-pagador"
            value={form.pagoPorMembroId}
            onChange={e => setForm({ ...form, pagoPorMembroId: e.target.value })}
          >
            {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Dividir entre</label>
          <label className="checkbox-row">
            <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos} />
            Selecionar todos
          </label>
          <ul className="despesa-participantes-list">
            {membros.map(m => (
              <li key={m.id}>
                <label className="checkbox-row">
                  <input type="checkbox" checked={participanteIds.includes(m.id)} onChange={() => toggleParticipante(m.id)} />
                  <span className="despesa-participante-nome">{m.nome}</span>
                  {participanteIds.includes(m.id) && preview[m.id] != null && (
                    <span className="despesa-participante-valor">{fmt(preview[m.id], form.moeda)}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvando...' : despesa ? 'Atualizar' : 'Adicionar despesa'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
