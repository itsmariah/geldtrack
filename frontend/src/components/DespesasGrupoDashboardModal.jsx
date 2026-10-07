import { useState, useEffect } from 'react'
import api from '../services/api'
import { useCategorias } from '../context/CategoriasContext'
import { fmt, fmtDate, descreverConversao } from '../utils/format'
import Modal from './Modal'
import Alert from './Alert'
import EventoSelect, { useEventoSelecao } from './EventoSelect'
import { Loader2, X } from 'lucide-react'

// Mesmo arredondamento do backend (utils/currency.js): centavos exatos, nunca zero.
const converterValor = (valor, taxa) => Math.max(0.01, Math.round(valor * taxa * 100) / 100)

// "Adicionar despesas ao dashboard": despesas já vem filtrada pelo GrupoDetalhe — só as
// que ainda não estão no dashboard e em que o usuário tem parte ({ ...despesa, minhaParte }).
// Cada uma vira uma transação com a data original da despesa, não a data de hoje. Pra cada
// moeda o usuário escolhe uma conta: na mesma moeda, a parte entra como está; em outra, é
// convertida pela cotação salva (ou pelo câmbio que ele informar, ex: o do cartão com IOF).
// Tudo pode ir pra um evento — um existente (abre com o da última importação deste grupo,
// eventoIdPadrao) ou um novo criado aqui mesmo, com o nome do grupo e o período das despesas.
export default function DespesasGrupoDashboardModal({ grupoId, despesas, moedas, nomeGrupo, eventoIdPadrao, onClose, onSaved }) {
  const { categoriasPorTipo } = useCategorias()
  const categoriasDespesa = categoriasPorTipo('despesa')
  const [contas, setContas] = useState([])
  const eventoSelecao = useEventoSelecao({ eventoIdPadrao, nomeSugerido: nomeGrupo, datas: despesas.map(d => d.data) })
  const [cambio, setCambio] = useState({ taxas: { BRL: 1 }, atualizadoEm: {} })
  const [categoria, setCategoria] = useState(categoriasDespesa.includes('Lazer') ? 'Lazer' : (categoriasDespesa[0] ?? 'Outros'))
  // { moeda: contaId | '' } — '' = não adicionar as despesas dessa moeda agora.
  const [contaPorMoeda, setContaPorMoeda] = useState({})
  // { moeda: texto } — só pras moedas em que o usuário mexeu no câmbio sugerido.
  const [taxaDigitada, setTaxaDigitada] = useState({})
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
    Promise.all([api.get('/contas'), api.get('/cambio').catch(() => null)])
      .then(([contasRes, cambioRes]) => {
        setContas(contasRes.data)
        if (cambioRes) setCambio(cambioRes.data)
        // Padrão: uma conta na mesma moeda; sem nenhuma, converte pra primeira conta em R$.
        const inicial = {}
        for (const d of despesas) {
          const moeda = d.moeda || 'BRL'
          if (moeda in inicial) continue
          const conta = contasRes.data.find(c => c.moeda === moeda)
            ?? contasRes.data.find(c => c.moeda === 'BRL')
            ?? contasRes.data[0]
          inicial[moeda] = conta?.id ?? ''
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

  // Tudo o que cada moeda precisa pra exibir e enviar: conta escolhida e, se ela estiver em
  // outra moeda, a taxa (sugerida ou digitada) e a data da cotação usada.
  const planoPorMoeda = porMoeda.map(({ moeda, despesas: lista }) => {
    const conta = contas.find(c => c.id === Number(contaPorMoeda[moeda]))
    const converte = Boolean(conta) && conta.moeda !== moeda
    let taxaSugerida = null
    let dataCotacao = null
    if (converte && cambio.taxas[moeda] && cambio.taxas[conta.moeda]) {
      taxaSugerida = Number((cambio.taxas[moeda] / cambio.taxas[conta.moeda]).toFixed(6))
      const datas = [moeda, conta.moeda].map(m => cambio.atualizadoEm?.[m]).filter(Boolean).map(d => new Date(d).getTime())
      if (datas.length > 0) dataCotacao = new Date(Math.min(...datas)).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    }
    const editou = taxaDigitada[moeda] !== undefined
    const taxa = editou ? Number(taxaDigitada[moeda]) : taxaSugerida
    const taxaValida = !converte || taxa > 0
    const total = lista.reduce((soma, d) => soma + d.minhaParte, 0)
    const totalConvertido = converte && taxaValida
      ? lista.reduce((soma, d) => soma + converterValor(d.minhaParte, taxa), 0)
      : null
    return { moeda, lista, conta, converte, taxaSugerida, dataCotacao: editou ? null : dataCotacao, editou, taxa, taxaValida, total, totalConvertido }
  })

  const destinos = planoPorMoeda
    .filter(p => p.conta)
    .map(p => ({ moeda: p.moeda, contaId: p.conta.id, ...(p.converte && p.editou ? { taxa: p.taxa } : {}) }))
  const faltaTaxa = planoPorMoeda.some(p => p.conta && !p.taxaValida)
  const quantidadeSelecionada = planoPorMoeda.filter(p => p.conta).reduce((soma, p) => soma + p.lista.length, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const eventoId = await eventoSelecao.resolverEventoId()
      const { data } = await api.post(`/grupos/${grupoId}/dashboard`, { destinos, categoria, eventoId })
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
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <p className="form-hint" style={{ marginTop: 0, marginBottom: 12 }}>
        Sua parte em cada despesa entra no dashboard com a data em que ela aconteceu. Se alguém
        editar uma despesa aqui no grupo depois, a data e o valor são atualizados no dashboard também.
      </p>

      <form onSubmit={handleSubmit}>
        {planoPorMoeda.map(p => {
          const contasMesmaMoeda = contas.filter(c => c.moeda === p.moeda)
          const contasOutraMoeda = contas.filter(c => c.moeda !== p.moeda)
          return (
            <div key={p.moeda} className="form-group">
              <label htmlFor={`grupo-dash-conta-${p.moeda}`}>
                Despesas em {simbolo(p.moeda)} — {p.lista.length === 1 ? '1 despesa' : `${p.lista.length} despesas`}, sua parte {fmt(p.total, p.moeda)}
              </label>
              <ul className="grupo-despesas-list" style={{ margin: '4px 0 8px', maxHeight: 160, overflowY: 'auto' }}>
                {p.lista.map(d => (
                  <li key={d.id} className="grupo-despesa-item">
                    <div className="grupo-despesa-info">
                      <span className="grupo-despesa-desc">{d.descricao}</span>
                      <span className="tx-meta">{fmtDate(d.data)}</span>
                    </div>
                    <div className="grupo-despesa-valor">
                      {fmt(d.minhaParte, p.moeda)}
                      {p.converte && p.taxaValida && (
                        <span className="tx-meta" style={{ display: 'block', textAlign: 'right' }}>
                          ≈ {fmt(converterValor(d.minhaParte, p.taxa), p.conta.moeda)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <select
                id={`grupo-dash-conta-${p.moeda}`}
                value={contaPorMoeda[p.moeda] ?? ''}
                onChange={e => {
                  setContaPorMoeda(prev => ({ ...prev, [p.moeda]: e.target.value }))
                  setTaxaDigitada(({ [p.moeda]: _, ...resto }) => resto)
                }}
                disabled={carregando}
              >
                {contasMesmaMoeda.length > 0 && (
                  <optgroup label={`Contas em ${simbolo(p.moeda)}`}>
                    {contasMesmaMoeda.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </optgroup>
                )}
                {contasOutraMoeda.length > 0 && (
                  <optgroup label="Converter para outra moeda">
                    {contasOutraMoeda.map(c => <option key={c.id} value={c.id}>{c.nome} ({simbolo(c.moeda)})</option>)}
                  </optgroup>
                )}
                <option value="">Não adicionar agora</option>
              </select>

              {p.converte && (
                <div style={{ marginTop: 8 }}>
                  <label htmlFor={`grupo-dash-taxa-${p.moeda}`} style={{ fontWeight: 400 }}>
                    Câmbio: {simbolo(p.moeda)} 1 = {simbolo(p.conta.moeda)}
                  </label>
                  <input
                    id={`grupo-dash-taxa-${p.moeda}`}
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={p.editou ? taxaDigitada[p.moeda] : (p.taxaSugerida ?? '')}
                    onChange={e => setTaxaDigitada(prev => ({ ...prev, [p.moeda]: e.target.value }))}
                    placeholder="Ex: 5,18"
                    required
                  />
                  <span className="form-hint">
                    {p.taxaValida && p.totalConvertido != null && (
                      <>{descreverConversao({ valorOriginal: p.total, moedaOriginal: p.moeda, valor: p.totalConvertido, moeda: p.conta.moeda, dataCotacao: p.dataCotacao })}. </>
                    )}
                    {p.taxaSugerida == null && !p.editou
                      ? 'Sem cotação salva pra essa moeda — informe o câmbio (ou atualize as cotações em Contas).'
                      : 'Ajuste se o seu banco usou outro câmbio (ex: cartão com IOF).'}
                  </span>
                </div>
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

        <EventoSelect id="grupo-dash-evento" selecao={eventoSelecao} />

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading || carregando || destinos.length === 0 || faltaTaxa}>
            {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
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
