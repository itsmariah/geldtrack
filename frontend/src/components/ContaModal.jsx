import { useState, useEffect } from 'react'
import api from '../services/api'
import { TIPOS_CONTA } from '../utils/contaTipos'
import Modal from './Modal'
import Alert from './Alert'
import { X } from 'lucide-react'

// instituicoes: as já usadas em outras contas da família, sugeridas no campo pra ninguém
// criar "Wise" e "wise " como grupos separados sem querer.
export default function ContaModal({ conta, instituicoes = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: conta?.nome || '',
    tipo: conta?.tipo || TIPOS_CONTA[0].valor,
    saldoInicial: conta?.saldoInicial ?? 0,
    moeda: conta?.moeda || 'BRL',
    instituicao: conta?.instituicao || '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [moedas, setMoedas] = useState([])

  // moeda só pode ser escolhida na criação — depois de existirem transações
  // atreladas à conta, trocar a moeda invalidaria tudo que já foi lançado.
  useEffect(() => {
    if (conta) return
    api.get('/cambio').then(res => setMoedas(res.data.moedas)).catch(() => {})
  }, [conta])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (conta) {
        await api.put(`/contas/${conta.id}`, form)
      } else {
        await api.post('/contas', form)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>{conta ? 'Editar Conta' : 'Nova Conta'}</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="conta-nome">Nome</label>
          <input
            id="conta-nome"
            type="text"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Ex: Nubank, Carteira, Cartão Inter..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="conta-instituicao">Instituição (opcional)</label>
          <input
            id="conta-instituicao"
            type="text"
            list="conta-instituicoes"
            value={form.instituicao}
            onChange={e => setForm({ ...form, instituicao: e.target.value })}
            placeholder="Ex: Wise, Nubank, Itaú..."
            maxLength={60}
          />
          <datalist id="conta-instituicoes">
            {instituicoes.map(i => <option key={i} value={i} />)}
          </datalist>
          <span className="form-hint">Contas da mesma instituição aparecem agrupadas na tela de Contas.</span>
        </div>

        <div className="form-group">
          <label htmlFor="conta-tipo">Tipo</label>
          <select
            id="conta-tipo"
            value={form.tipo}
            onChange={e => setForm({ ...form, tipo: e.target.value })}
          >
            {TIPOS_CONTA.map(t => <option key={t.valor} value={t.valor}>{t.icone} {t.label}</option>)}
          </select>
        </div>

        {!conta && moedas.length > 0 && (
          <div className="form-group">
            <label htmlFor="conta-moeda">Moeda</label>
            <select
              id="conta-moeda"
              value={form.moeda}
              onChange={e => setForm({ ...form, moeda: e.target.value })}
            >
              {moedas.map(m => <option key={m.codigo} value={m.codigo}>{m.simbolo} {m.nome}</option>)}
            </select>
            <span className="form-hint">Não pode ser alterada depois de criar a conta.</span>
            <span className="form-hint">
              💡 Conta com saldo em várias moedas (Wise, Nomad, C6 Global...)? Crie uma conta pra cada
              moeda, como "Wise · Real", "Wise · Dólar" e "Wise · Euro", todas com a mesma instituição —
              elas aparecem juntas — e registre as conversões entre elas em "Transferir".
            </span>
          </div>
        )}

        {conta && conta.moeda && conta.moeda !== 'BRL' && (
          <div className="form-group">
            <label>Moeda</label>
            <input type="text" value={conta.moeda} disabled />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="conta-saldo">Saldo inicial ({form.moeda === 'BRL' ? 'R$' : form.moeda})</label>
          <input
            id="conta-saldo"
            type="number"
            step="0.01"
            value={form.saldoInicial}
            onChange={e => setForm({ ...form, saldoInicial: e.target.value })}
            placeholder="0,00"
            required
          />
          <span className="form-hint">Quanto essa conta já tinha antes de você começar a registrar aqui. Pode ser negativo (ex: fatura de cartão em aberto).</span>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvando...' : conta ? 'Atualizar' : 'Criar conta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
