import { useState, useEffect } from 'react'
import api from '../services/api'
import { fmt, fmtDate } from '../utils/format'
import Modal from './Modal'
import Alert from './Alert'
import { X } from 'lucide-react'

const CAMPO_LABELS = {
  tipo: 'Tipo',
  valor: 'Valor',
  categoria: 'Categoria',
  descricao: 'Descrição',
  data: 'Data',
  contaId: 'Conta',
}

function formatValorCampo(campo, valor, contas) {
  if (valor === null || valor === undefined || valor === '') return '(vazio)'
  if (campo === 'valor') return fmt(valor)
  if (campo === 'data') return fmtDate(valor)
  if (campo === 'tipo') return valor === 'receita' ? 'Receita' : 'Despesa'
  if (campo === 'contaId') return contas?.find(c => c.id === valor)?.nome || `Conta #${valor}`
  return String(valor)
}

function formatDataHora(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function HistoricoViewer({ transactionId, contas, onClose }) {
  const [historico, setHistorico] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.get(`/transactions/${transactionId}/historico`)
      .then(({ data }) => { if (active) setHistorico(data) })
      .catch(() => { if (active) setError('Não foi possível carregar o histórico.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [transactionId])

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>Histórico de edições</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      ) : historico.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Nenhuma edição registrada.</p>
      ) : (
        <ul className="historico-list">
          {historico.map(h => (
            <li key={h.id} className="historico-item">
              <span className="historico-data">{formatDataHora(h.createdAt)}</span>
              <ul className="historico-alteracoes">
                {h.alteracoes.map((a, i) => (
                  <li key={i}>
                    <strong>{CAMPO_LABELS[a.campo] || a.campo}:</strong>{' '}
                    {formatValorCampo(a.campo, a.de, contas)} → {formatValorCampo(a.campo, a.para, contas)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <div className="modal-footer">
        <button type="button" className="btn btn-primary" onClick={onClose}>Fechar</button>
      </div>
    </Modal>
  )
}
