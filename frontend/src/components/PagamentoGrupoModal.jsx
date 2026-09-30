import { useState, useEffect } from 'react'
import api from '../services/api'
import { fmt, fmtDate } from '../utils/format'
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
  // Quitação em outra moeda (devia € 40, pagou R$ 250 por Pix): o saldo abate o valor da
  // dívida; o valor pago é só registrado. Começa como sugestão pela cotação e acompanha a
  // dívida até o usuário digitar o que pagou de fato.
  const [outraMoeda, setOutraMoeda] = useState(false)
  const [moedaPagamento, setMoedaPagamento] = useState('')
  const [valorPagamentoDigitado, setValorPagamentoDigitado] = useState(null)
  const [cambio, setCambio] = useState({ taxas: { BRL: 1 }, atualizadoEm: {} })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/cambio').then(res => setCambio(res.data)).catch(() => {})
  }, [])

  const simbolo = (codigo) => moedas.find(m => m.codigo === codigo)?.simbolo || codigo
  const outrasMoedas = moedas.filter(m => m.codigo !== form.moeda)
  const moedaPagamentoEfetiva = outrasMoedas.some(m => m.codigo === moedaPagamento)
    ? moedaPagamento
    : (form.moeda === 'BRL' ? outrasMoedas[0]?.codigo : 'BRL') ?? ''
  const taxaDivida = cambio.taxas[form.moeda]
  const taxaPagamento = cambio.taxas[moedaPagamentoEfetiva]
  const sugestao = taxaDivida && taxaPagamento && Number(form.valor) > 0
    ? (Number(form.valor) * taxaDivida / taxaPagamento).toFixed(2)
    : ''
  const valorPagamento = valorPagamentoDigitado ?? sugestao
  const datasCotacao = [form.moeda, moedaPagamentoEfetiva].map(m => cambio.atualizadoEm?.[m]).filter(Boolean)
  const dataCotacao = datasCotacao.length > 0
    ? new Date(Math.min(...datasCotacao.map(d => new Date(d).getTime()))).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
    : null

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
        ...(outraMoeda ? { moedaPagamento: moedaPagamentoEfetiva, valorPagamento } : {}),
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
            onChange={e => { setForm({ ...form, moeda: e.target.value }); setValorPagamentoDigitado(null) }}
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

        {outrasMoedas.length > 0 && (
          <div className="form-group">
            <label className="checkbox-row">
              <input type="checkbox" checked={outraMoeda} onChange={e => setOutraMoeda(e.target.checked)} />
              Pago em outra moeda (ex: dívida em euro paga por Pix em reais)
            </label>
          </div>
        )}

        {outraMoeda && (
          <div className="form-group">
            <label htmlFor="pagamento-valor-pago">Valor pago</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                aria-label="Moeda do pagamento"
                value={moedaPagamentoEfetiva}
                onChange={e => { setMoedaPagamento(e.target.value); setValorPagamentoDigitado(null) }}
                style={{ flex: '0 0 auto', width: 'auto' }}
              >
                {outrasMoedas.map(m => <option key={m.codigo} value={m.codigo}>{m.simbolo}</option>)}
              </select>
              <input
                id="pagamento-valor-pago"
                type="number"
                step="0.01"
                min="0.01"
                value={valorPagamento}
                onChange={e => setValorPagamentoDigitado(e.target.value)}
                placeholder="0,00"
                required
                style={{ flex: 1 }}
              />
            </div>
            <span className="form-hint">
              {sugestao && dataCotacao
                ? <>Sugestão de acordo com a cotação de {fmtDate(dataCotacao)} ({fmt(1, form.moeda)} = {fmt(taxaDivida / taxaPagamento, moedaPagamentoEfetiva)}). </>
                : <>Sem cotação salva pra essa conversão. </>}
              Informe quanto foi pago de fato — o saldo abate {form.valor ? fmt(Number(form.valor), form.moeda) : `o valor em ${simbolo(form.moeda)}`}.
            </span>
          </div>
        )}

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
