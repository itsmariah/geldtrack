import { useState } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'

// new Date().toISOString() é UTC — perto da meia-noite no Brasil (UTC-3) isso adianta
// a data em um dia. Aqui montamos a data local manualmente para evitar esse desvio.
function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// prefill vem de um saldo clicado em "Quem deve quem" ({ deMembroId, paraMembroId, valor, moeda })
// — a maioria das quitações é "paguei exatamente o que eu devia", então já chega pronto
// pra só confirmar; os campos continuam editáveis pra pagamento parcial ou lançamento manual.
export default function PagamentoGrupoModal({ grupoId, membros, moedas, moedaPadrao = 'BRL', prefill, onClose, onSaved }) {
  const [form, setForm] = useState({
    deMembroId: prefill?.deMembroId ?? (membros[0]?.id ?? ''),
    paraMembroId: prefill?.paraMembroId ?? (membros[1]?.id ?? membros[0]?.id ?? ''),
    valor: prefill?.valor ?? '',
    moeda: prefill?.moeda || moedaPadrao,
    data: todayLocal(),
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (Number(form.deMembroId) === Number(form.paraMembroId)) {
      setError('Quem pagou e quem recebeu não podem ser a mesma pessoa')
      return
    }
    setLoading(true)
    try {
      await api.post(`/grupos/${grupoId}/pagamentos`, {
        ...form,
        deMembroId: Number(form.deMembroId),
        paraMembroId: Number(form.paraMembroId),
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar pagamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>Registrar pagamento</h3>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="pagamento-de">Quem pagou</label>
          <select
            id="pagamento-de"
            value={form.deMembroId}
            onChange={e => setForm({ ...form, deMembroId: e.target.value })}
          >
            {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="pagamento-para">Para quem</label>
          <select
            id="pagamento-para"
            value={form.paraMembroId}
            onChange={e => setForm({ ...form, paraMembroId: e.target.value })}
          >
            {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="pagamento-moeda">Moeda</label>
          <select
            id="pagamento-moeda"
            value={form.moeda}
            onChange={e => setForm({ ...form, moeda: e.target.value })}
          >
            {moedas.map(m => <option key={m.codigo} value={m.codigo}>{m.simbolo} {m.nome}</option>)}
          </select>
          <span className="form-hint">Abate só a dívida nessa moeda.</span>
        </div>

        <div className="form-group">
          <label htmlFor="pagamento-valor">Valor ({moedas.find(m => m.codigo === form.moeda)?.simbolo || form.moeda})</label>
          <input
            id="pagamento-valor"
            type="number"
            step="0.01"
            min="0.01"
            value={form.valor}
            onChange={e => setForm({ ...form, valor: e.target.value })}
            placeholder="0,00"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="pagamento-data">Data</label>
          <input
            id="pagamento-data"
            type="date"
            value={form.data}
            onChange={e => setForm({ ...form, data: e.target.value })}
            required
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvando...' : 'Registrar pagamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
