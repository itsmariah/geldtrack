import { useState, useEffect } from 'react'
import api from '../services/api'
import { useCategorias } from '../context/CategoriasContext'
import { fmt, fmtDate, descreverConversao } from '../utils/format'
import Modal from './Modal'
import Alert from './Alert'
import EventoSelect, { useEventoSelecao } from './EventoSelect'

// Mesmo arredondamento do backend (utils/currency.js): centavos exatos, nunca zero.
const converterValor = (valor, taxa) => Math.max(0.01, Math.round(valor * taxa * 100) / 100)

// Adiciona ao dashboard, como receita, um pagamento que o usuário recebeu no grupo. O valor
// é o que de fato entrou: se a dívida foi quitada em outra moeda, o valor/moeda do pagamento
// real. Numa conta de outra moeda, converte pela cotação salva ou pelo câmbio informado.
export default function PagamentoDashboardModal({ grupoId, pagamento, nomeQuemPagou, nomeGrupo, eventoIdPadrao, parteJaNoDashboard, moedas, onClose, onSaved }) {
  const { categoriasPorTipo } = useCategorias()
  const categoriasReceita = categoriasPorTipo('receita')
  const recebido = pagamento.moedaPagamento
    ? { valor: pagamento.valorPagamento, moeda: pagamento.moedaPagamento }
    : { valor: pagamento.valor, moeda: pagamento.moeda }

  const [contas, setContas] = useState([])
  const [cambio, setCambio] = useState({ taxas: { BRL: 1 }, atualizadoEm: {} })
  const [contaId, setContaId] = useState('')
  const [categoria, setCategoria] = useState(categoriasReceita.includes('Outros') ? 'Outros' : (categoriasReceita[0] ?? 'Outros'))
  const [taxaDigitada, setTaxaDigitada] = useState(null)
  const eventoSelecao = useEventoSelecao({ eventoIdPadrao, nomeSugerido: nomeGrupo, datas: [pagamento.data] })
  const [carregando, setCarregando] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/contas'), api.get('/cambio').catch(() => null)])
      .then(([contasRes, cambioRes]) => {
        setContas(contasRes.data)
        if (cambioRes) setCambio(cambioRes.data)
        const conta = contasRes.data.find(c => c.moeda === recebido.moeda)
          ?? contasRes.data.find(c => c.moeda === 'BRL')
          ?? contasRes.data[0]
        setContaId(conta?.id ?? '')
      })
      .catch(() => setError('Não foi possível carregar suas contas. Tente novamente.'))
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const simbolo = (codigo) => moedas.find(m => m.codigo === codigo)?.simbolo || codigo
  const conta = contas.find(c => c.id === Number(contaId))
  const converte = Boolean(conta) && conta.moeda !== recebido.moeda
  let taxaSugerida = null
  let dataCotacao = null
  if (converte && cambio.taxas[recebido.moeda] && cambio.taxas[conta.moeda]) {
    taxaSugerida = Number((cambio.taxas[recebido.moeda] / cambio.taxas[conta.moeda]).toFixed(6))
    const datas = [recebido.moeda, conta.moeda].map(m => cambio.atualizadoEm?.[m]).filter(Boolean).map(d => new Date(d).getTime())
    if (datas.length > 0) dataCotacao = new Date(Math.min(...datas)).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  }
  const editou = taxaDigitada !== null
  const taxa = editou ? Number(taxaDigitada) : taxaSugerida
  const taxaValida = !converte || taxa > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const eventoId = await eventoSelecao.resolverEventoId()
      await api.post(`/grupos/${grupoId}/pagamentos/${pagamento.id}/dashboard`, {
        contaId: Number(contaId),
        categoria,
        eventoId,
        ...(converte && editou ? { taxa } : {}),
      })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar pagamento ao dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>Adicionar pagamento ao dashboard</h3>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <p className="form-hint" style={{ marginTop: 0, marginBottom: 12 }}>
        {nomeQuemPagou} te pagou {fmt(recebido.valor, recebido.moeda)} em {fmtDate(pagamento.data)}. Isso entra como receita
        no dashboard, na data do pagamento.
      </p>
      <Alert type={parteJaNoDashboard ? 'warning' : 'info'}>
        {parteJaNoDashboard
          ? 'Atenção: você já adicionou a sua parte das despesas deste grupo ao dashboard. Somar este pagamento como receita conta o dinheiro duas vezes. Só adicione se lançou no dashboard o valor total que você pagou (ex: a fatura do cartão).'
          : 'Use isto quando o dashboard tem o valor total que você pagou (ex: a fatura do cartão ou o Open Finance), e este pagamento é o reembolso da parte de outra pessoa.'}
      </Alert>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="pag-dash-conta">Conta</label>
          <select id="pag-dash-conta" value={contaId} onChange={e => { setContaId(e.target.value); setTaxaDigitada(null) }} disabled={carregando} required>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}{c.moeda !== recebido.moeda ? ` (${simbolo(c.moeda)})` : ''}</option>)}
          </select>
        </div>

        {converte && (
          <div className="form-group">
            <label htmlFor="pag-dash-taxa">Câmbio: {simbolo(recebido.moeda)} 1 = {simbolo(conta.moeda)}</label>
            <input
              id="pag-dash-taxa"
              type="number"
              step="0.0001"
              min="0.0001"
              value={editou ? taxaDigitada : (taxaSugerida ?? '')}
              onChange={e => setTaxaDigitada(e.target.value)}
              placeholder="Ex: 5,18"
              required
            />
            <span className="form-hint">
              {taxaValida && (
                <>{descreverConversao({ valorOriginal: recebido.valor, moedaOriginal: recebido.moeda, valor: converterValor(recebido.valor, taxa), moeda: conta.moeda, dataCotacao: editou ? null : dataCotacao })}. </>
              )}
              {taxaSugerida == null && !editou
                ? 'Sem cotação salva pra essa moeda — informe o câmbio.'
                : 'Ajuste se o seu banco usou outro câmbio.'}
            </span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="pag-dash-categoria">Categoria</label>
          <select id="pag-dash-categoria" value={categoria} onChange={e => setCategoria(e.target.value)}>
            {categoriasReceita.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <EventoSelect id="pag-dash-evento" selecao={eventoSelecao} />

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading || carregando || !conta || !taxaValida}>
            {loading ? 'Adicionando...' : 'Adicionar como receita'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
