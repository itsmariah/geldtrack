import { useState, useEffect } from 'react'
import api from '../services/api'
import { fmt } from '../utils/format'
import Modal from './Modal'
import Alert from './Alert'

function todayLocal() {
  const now = new Date()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const dia = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mes}-${dia}`
}

export default function TransferModal({ contas, onClose, onSaved }) {
  const [form, setForm] = useState({
    contaOrigemId: contas[0]?.id || '',
    contaDestinoId: contas[1]?.id || '',
    valor: '',
    data: todayLocal(),
    descricao: '',
  })
  // Entre moedas diferentes o valor recebido começa como sugestão pela cotação salva e
  // acompanha o valor enviado até o usuário digitar o valor real (com spread/IOF/taxas).
  const [valorDestinoDigitado, setValorDestinoDigitado] = useState(null)
  const [cambio, setCambio] = useState({ moedas: [], taxas: { BRL: 1 }, atualizadoEm: {} })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/cambio').then(res => setCambio(res.data)).catch(() => {})
  }, [])

  const destinoOptions = contas.filter(c => c.id !== Number(form.contaOrigemId))
  const origem = contas.find(c => c.id === Number(form.contaOrigemId))
  const destino = contas.find(c => c.id === Number(form.contaDestinoId))
  const moedaOrigem = origem?.moeda || 'BRL'
  const moedaDestino = destino?.moeda || 'BRL'
  const moedasDiferentes = moedaOrigem !== moedaDestino
  const simbolo = (codigo) => cambio.moedas.find(m => m.codigo === codigo)?.simbolo || codigo

  const taxaOrigem = cambio.taxas[moedaOrigem]
  const taxaDestino = cambio.taxas[moedaDestino]
  const temCotacao = Boolean(taxaOrigem && taxaDestino)
  const sugestao = temCotacao && Number(form.valor) > 0
    ? (Number(form.valor) * taxaOrigem / taxaDestino).toFixed(2)
    : ''
  const valorDestino = valorDestinoDigitado ?? sugestao

  // Data da cotação mais antiga envolvida (BRL não tem data — é sempre 1).
  const datasCotacao = [moedaOrigem, moedaDestino].map(m => cambio.atualizadoEm?.[m]).filter(Boolean)
  const dataCotacao = datasCotacao.length > 0
    ? new Date(Math.min(...datasCotacao.map(d => new Date(d).getTime()))).toLocaleDateString('pt-BR')
    : null

  const trocarConta = (partial) => {
    setForm(f => ({ ...f, ...partial }))
    setValorDestinoDigitado(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/transferencias', { ...form, valorDestino: moedasDiferentes ? valorDestino : undefined })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar transferência')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>Nova Transferência</h3>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="transf-origem">De</label>
          <select
            id="transf-origem"
            value={form.contaOrigemId}
            onChange={e => {
              const contaOrigemId = Number(e.target.value)
              trocarConta({
                contaOrigemId,
                contaDestinoId: Number(form.contaDestinoId) === contaOrigemId ? (contas.find(c => c.id !== contaOrigemId)?.id || '') : form.contaDestinoId,
              })
            }}
          >
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="transf-destino">Para</label>
          <select
            id="transf-destino"
            value={form.contaDestinoId}
            onChange={e => trocarConta({ contaDestinoId: Number(e.target.value) })}
          >
            {destinoOptions.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="transf-valor">{moedasDiferentes ? 'Valor enviado' : 'Valor'} ({simbolo(moedaOrigem)})</label>
          <input
            id="transf-valor"
            type="number"
            step="0.01"
            min="0.01"
            value={form.valor}
            onChange={e => setForm({ ...form, valor: e.target.value })}
            placeholder="0,00"
            required
          />
        </div>

        {moedasDiferentes && (
          <div className="form-group">
            <label htmlFor="transf-valor-destino">Valor recebido ({simbolo(moedaDestino)})</label>
            <input
              id="transf-valor-destino"
              type="number"
              step="0.01"
              min="0.01"
              value={valorDestino}
              onChange={e => setValorDestinoDigitado(e.target.value)}
              placeholder="0,00"
              required
            />
            <span className="form-hint">
              {temCotacao && dataCotacao
                ? <>Sugestão de acordo com a cotação de {dataCotacao} ({fmt(1, moedaDestino)} = {fmt(taxaDestino / taxaOrigem, moedaOrigem)}). </>
                : <>Sem cotação salva pra essa moeda — atualize as cotações nesta página ou informe o valor manualmente. </>}
              Ajuste para o valor que realmente chegou, já descontadas as taxas e o IOF.
            </span>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="transf-data">Data</label>
          <input
            id="transf-data"
            type="date"
            value={form.data}
            onChange={e => setForm({ ...form, data: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="transf-descricao">Descrição (opcional)</label>
          <input
            id="transf-descricao"
            type="text"
            value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
            placeholder={moedasDiferentes ? 'Ex: Compra de dólar pra viagem...' : 'Ex: Pagamento da fatura...'}
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvando...' : 'Transferir'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
