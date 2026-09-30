import { useState, useEffect } from 'react'
import api from '../services/api'
import { useCategorias } from '../context/CategoriasContext'
import { fmt, fmtDate } from '../utils/format'
import Modal from './Modal'
import Alert from './Alert'

// "Adicionar despesas ao dashboard": despesas já vem filtrada pelo GrupoDetalhe — só as
// que ainda não estão no dashboard e em que o usuário tem parte ({ ...despesa, minhaParte }).
// Cada uma vira uma transação com a data original da despesa, não a data de hoje, numa
// conta da mesma moeda da despesa (uma conta escolhida por moeda).
export default function DespesasGrupoDashboardModal({ grupoId, despesas, moedas, onClose, onSaved }) {
  const { categoriasPorTipo } = useCategorias()
  const categoriasDespesa = categoriasPorTipo('despesa')
  const [contas, setContas] = useState([])
  const [eventos, setEventos] = useState([])
  const [categoria, setCategoria] = useState(categoriasDespesa.includes('Lazer') ? 'Lazer' : (categoriasDespesa[0] ?? 'Outros'))
  const [eventoId, setEventoId] = useState('')
  // { moeda: contaId | '' } — '' = não adicionar as despesas dessa moeda agora.
  const [contaPorMoeda, setContaPorMoeda] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Grupos de despesas por moeda, R$ primeiro, na ordem em que aparecem.
  const porMoeda = []
  for (const d of despesas) {
    const moeda = d.moeda || 'BRL'
    let grupo = porMoeda.find(g => g.moeda === moeda)
    if (!grupo) porMoeda.push(grupo = { moeda, despesas: [] })
    grupo.despesas.push(d)
  }
  porMoeda.sort((a, b) => (a.moeda === 'BRL' ? -1 : b.moeda === 'BRL' ? 1 : 0))

  useEffect(() => {
    Promise.all([api.get('/contas'), api.get('/eventos')])
      .then(([contasRes, eventosRes]) => {
        setContas(contasRes.data)
        setEventos(eventosRes.data.filter(ev => ev.status === 'ativo'))
        const inicial = {}
        for (const d of despesas) {
          const moeda = d.moeda || 'BRL'
          if (!(moeda in inicial)) inicial[moeda] = contasRes.data.find(c => c.moeda === moeda)?.id ?? ''
        }
        setContaPorMoeda(inicial)
      })
      .catch(() => setError('Não foi possível carregar suas contas. Tente novamente.'))
      .finally(() => setCarregando(false))
    // Só na abertura: "despesas" é recalculado a cada render do GrupoDetalhe (array novo),
    // e reagir a isso recarregaria as contas e desfaria as escolhas do usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const simbolo = (codigo) => moedas.find(m => m.codigo === codigo)?.simbolo || codigo
  const destinos = Object.entries(contaPorMoeda)
    .filter(([, contaId]) => contaId !== '')
    .map(([moeda, contaId]) => ({ moeda, contaId: Number(contaId) }))
  const quantidadeSelecionada = despesas.filter(d => destinos.some(x => x.moeda === (d.moeda || 'BRL'))).length

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post(`/grupos/${grupoId}/dashboard`, {
        destinos,
        categoria,
        eventoId: eventoId === '' ? null : Number(eventoId),
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
        Sua parte em cada despesa entra no dashboard com a data em que ela aconteceu, numa conta da
        mesma moeda. Se alguém editar uma despesa aqui no grupo depois, a data e o valor são
        atualizados no dashboard também.
      </p>

      <form onSubmit={handleSubmit}>
        {porMoeda.map(({ moeda, despesas: lista }) => {
          const contasDaMoeda = contas.filter(c => c.moeda === moeda)
          const total = lista.reduce((soma, d) => soma + d.minhaParte, 0)
          return (
            <div key={moeda} className="form-group">
              <label htmlFor={`grupo-dash-conta-${moeda}`}>
                Despesas em {simbolo(moeda)} — {lista.length === 1 ? '1 despesa' : `${lista.length} despesas`}, sua parte {fmt(total, moeda)}
              </label>
              <ul className="grupo-despesas-list" style={{ margin: '4px 0 8px', maxHeight: 160, overflowY: 'auto' }}>
                {lista.map(d => (
                  <li key={d.id} className="grupo-despesa-item">
                    <div className="grupo-despesa-info">
                      <span className="grupo-despesa-desc">{d.descricao}</span>
                      <span className="tx-meta">{fmtDate(d.data)}</span>
                    </div>
                    <div className="grupo-despesa-valor">{fmt(d.minhaParte, moeda)}</div>
                  </li>
                ))}
              </ul>
              {!carregando && contasDaMoeda.length === 0 ? (
                <span className="form-hint">
                  Você não tem nenhuma conta em {simbolo(moeda)}. Crie uma em "Contas" (ex: "Wise · {moedas.find(m => m.codigo === moeda)?.nome || moeda}") pra adicionar essas despesas.
                </span>
              ) : (
                <select
                  id={`grupo-dash-conta-${moeda}`}
                  value={contaPorMoeda[moeda] ?? ''}
                  onChange={e => setContaPorMoeda(prev => ({ ...prev, [moeda]: e.target.value }))}
                  disabled={carregando}
                >
                  {contasDaMoeda.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  <option value="">Não adicionar agora</option>
                </select>
              )}
            </div>
          )
        })}

        <div className="form-group">
          <label htmlFor="grupo-dash-categoria">Categoria</label>
          <select id="grupo-dash-categoria" value={categoria} onChange={e => setCategoria(e.target.value)}>
            {categoriasDespesa.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {eventos.length > 0 && (
          <div className="form-group">
            <label htmlFor="grupo-dash-evento">Evento (opcional)</label>
            <select id="grupo-dash-evento" value={eventoId} onChange={e => setEventoId(e.target.value)}>
              <option value="">Nenhum</option>
              {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
            </select>
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading || carregando || destinos.length === 0}>
            {loading
              ? 'Adicionando...'
              : quantidadeSelecionada > 0 && quantidadeSelecionada < despesas.length
                ? `Adicionar ${quantidadeSelecionada} ao dashboard`
                : 'Adicionar ao dashboard'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
