import { useState, useEffect } from 'react'
import api from '../services/api'
import { fmt } from '../utils/format'
import { RefreshCw } from 'lucide-react'

// Só faz sentido mostrar esse painel pra quem tem conta em moeda estrangeira —
// pra quem só usa BRL, cotação de câmbio não é informação relevante.
export default function CotacoesPanel({ contas }) {
  const [dados, setDados] = useState(null)
  const [atualizando, setAtualizando] = useState(false)
  const [error, setError] = useState('')

  const temMoedaEstrangeira = contas.some(c => c.moeda && c.moeda !== 'BRL')

  useEffect(() => {
    if (!temMoedaEstrangeira) return
    api.get('/cambio').then(r => setDados(r.data)).catch(() => {})
  }, [temMoedaEstrangeira])

  if (!temMoedaEstrangeira) return null

  const handleAtualizar = async () => {
    setAtualizando(true)
    setError('')
    try {
      const { data } = await api.post('/cambio/atualizar')
      setDados(data)
    } catch (err) {
      setError('Não foi possível atualizar as cotações agora. Tente novamente em instantes.')
    } finally {
      setAtualizando(false)
    }
  }

  const moedasEmUso = dados?.moedas.filter(m => m.codigo !== 'BRL' && contas.some(c => c.moeda === m.codigo)) || []

  return (
    <div className="chart-section" style={{ marginTop: 24 }}>
      <div className="section-header">
        <h3>Cotações</h3>
        <button className="btn btn-sm btn-outline" onClick={handleAtualizar} disabled={atualizando}>
          <RefreshCw size={16} className={atualizando ? 'icon-spin' : ''} /> {atualizando ? 'Atualizando...' : 'Atualizar cotações'}
        </button>
      </div>
      {error && <p className="form-hint" style={{ color: 'var(--danger)' }}>{error}</p>}
      {dados && (
        moedasEmUso.length === 0 ? (
          <p className="empty-state-sub">Nenhuma cotação registrada ainda — clique em "Atualizar cotações".</p>
        ) : (
          <ul className="transaction-list">
            {moedasEmUso.map(m => (
              <li key={m.codigo} className="transaction-item">
                <div className="tx-info">
                  <span className="tx-desc">{m.simbolo} {m.nome} ({m.codigo})</span>
                </div>
                <div className="tx-amount">
                  {dados.taxas[m.codigo] ? fmt(dados.taxas[m.codigo]) : '—'}
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}
