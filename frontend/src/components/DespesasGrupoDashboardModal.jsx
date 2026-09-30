import { useState, useEffect } from 'react'
import api from '../services/api'
import { useCategorias } from '../context/CategoriasContext'
import { fmt, fmtDate } from '../utils/format'
import Modal from './Modal'
import Alert from './Alert'

// "Adicionar despesas ao dashboard": despesas já vem filtrada pelo GrupoDetalhe — só as
// que ainda não estão no dashboard e em que o usuário tem parte ({ ...despesa, minhaParte }).
// Cada uma vira uma transação com a data original da despesa, não a data de hoje.
export default function DespesasGrupoDashboardModal({ grupoId, despesas, onClose, onSaved }) {
  const { categoriasPorTipo } = useCategorias()
  const categoriasDespesa = categoriasPorTipo('despesa')
  const [contas, setContas] = useState([])
  const [eventos, setEventos] = useState([])
  const [form, setForm] = useState({
    contaId: '',
    categoria: categoriasDespesa.includes('Lazer') ? 'Lazer' : (categoriasDespesa[0] ?? 'Outros'),
    eventoId: '',
  })
  const [carregando, setCarregando] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/contas'), api.get('/eventos')])
      .then(([contasRes, eventosRes]) => {
        // Despesas de grupo são sempre em R$ — o backend recusa conta em outra moeda.
        const contasBRL = contasRes.data.filter(c => c.moeda === 'BRL')
        setContas(contasBRL)
        setEventos(eventosRes.data.filter(ev => ev.status === 'ativo'))
        setForm(f => ({ ...f, contaId: contasBRL[0]?.id ?? '' }))
      })
      .catch(() => setError('Não foi possível carregar suas contas. Tente novamente.'))
      .finally(() => setCarregando(false))
  }, [])

  const total = despesas.reduce((soma, d) => soma + d.minhaParte, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post(`/grupos/${grupoId}/dashboard`, {
        contaId: Number(form.contaId),
        categoria: form.categoria,
        eventoId: form.eventoId === '' ? null : Number(form.eventoId),
      })
      onSaved(data.count)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar despesas ao dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>Adicionar despesas ao dashboard</h3>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <p className="form-hint" style={{ marginTop: 0, marginBottom: 12 }}>
        Sua parte em {despesas.length === 1 ? '1 despesa' : `${despesas.length} despesas`} ({fmt(total)}) entra no dashboard
        com a data em que cada uma aconteceu. Se alguém editar uma despesa aqui no grupo depois, a data e o valor
        são atualizados no dashboard também.
      </p>

      <ul className="grupo-despesas-list" style={{ marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
        {despesas.map(d => (
          <li key={d.id} className="grupo-despesa-item">
            <div className="grupo-despesa-info">
              <span className="grupo-despesa-desc">{d.descricao}</span>
              <span className="tx-meta">{fmtDate(d.data)}</span>
            </div>
            <div className="grupo-despesa-valor">{fmt(d.minhaParte)}</div>
          </li>
        ))}
      </ul>

      {!carregando && contas.length === 0 ? (
        <Alert type="error">Você precisa de uma conta em reais (R$) pra adicionar as despesas — crie uma em "Contas".</Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="grupo-dash-conta">Conta</label>
            <select
              id="grupo-dash-conta"
              value={form.contaId}
              onChange={e => setForm({ ...form, contaId: e.target.value })}
              disabled={carregando}
            >
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="grupo-dash-categoria">Categoria</label>
            <select
              id="grupo-dash-categoria"
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
            >
              {categoriasDespesa.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {eventos.length > 0 && (
            <div className="form-group">
              <label htmlFor="grupo-dash-evento">Evento (opcional)</label>
              <select
                id="grupo-dash-evento"
                value={form.eventoId}
                onChange={e => setForm({ ...form, eventoId: e.target.value })}
              >
                <option value="">Nenhum</option>
                {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
              </select>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || carregando || !form.contaId}>
              {loading ? 'Adicionando...' : 'Adicionar ao dashboard'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
