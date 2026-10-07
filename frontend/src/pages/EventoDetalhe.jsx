import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import TransactionModal from '../components/TransactionModal'
import TransactionList from '../components/TransactionList'
import AnexoViewer from '../components/AnexoViewer'
import HistoricoViewer from '../components/HistoricoViewer'
import Alert from '../components/Alert'
import { SkeletonList } from '../components/Skeleton'
import { fmt, fmtDate } from '../utils/format'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const PAGE_SIZE = 50

function progressLevel(percentual, estourado) {
  if (estourado) return 'over'
  if (percentual >= 80) return 'warn'
  return 'ok'
}

export default function EventoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [evento, setEvento] = useState(null)
  const [eventos, setEventos] = useState([])
  const [contas, setContas] = useState([])
  const [transactions, setTransactions] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [anexoTransactionId, setAnexoTransactionId] = useState(null)
  const [historicoTransactionId, setHistoricoTransactionId] = useState(null)


  const fetchData = useCallback(async () => {
    setError('')
    try {
      const [eventoRes, eventosRes, contasRes, txRes] = await Promise.all([
        api.get(`/eventos/${id}`),
        api.get('/eventos'),
        api.get('/contas'),
        api.get('/transactions', { params: { evento: id, page, limit: PAGE_SIZE } }),
      ])
      setEvento(eventoRes.data)
      setEventos(eventosRes.data)
      setContas(contasRes.data)
      setTransactions(txRes.data.transactions)
      setPagination({ total: txRes.data.total, totalPages: txRes.data.totalPages })
      if (txRes.data.page > txRes.data.totalPages) setPage(txRes.data.totalPages || 1)
    } catch (err) {
      console.error('Erro ao buscar evento:', err)
      // Evento apagado em outra aba/dispositivo enquanto essa tela estava aberta —
      // volta pra lista em vez de mostrar uma tela quebrada.
      if (err.response?.status === 404) {
        navigate('/eventos', { replace: true })
        return
      }
      setError('Não foi possível carregar os dados do evento. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [id, page, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  // Exclusão com "Desfazer": a transação some da tela na hora e só é apagada de verdade
  // quando o toast expira (ver ToastContext). Desfazer só recarrega — no servidor nada mudou.
  const handleDelete = (id) => {
    setTransactions(ts => ts.filter(t => t.id !== id))
    toast.undoable('Transação excluída.', {
      onCommit: async () => {
        try {
          await api.delete(`/transactions/${id}`)
        } catch (err) {
          console.error(err)
          toast.error('Não foi possível excluir a transação. Tente novamente.')
        }
        fetchData()
      },
      onUndo: () => fetchData(),
    })
  }

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingTransaction(null)
  }

  const handleSaved = () => {
    toast(editingTransaction ? 'Transação atualizada com sucesso.' : 'Transação adicionada com sucesso.')
    handleModalClose()
    fetchData()
  }

  if (loading) {
    return <SkeletonList rows={5} />
  }

  if (!evento) {
    return error ? <Alert type="error">{error}</Alert> : null
  }

  const encerrado = evento.status === 'encerrado'
  const temOrcamento = evento.orcamento != null
  const level = temOrcamento ? progressLevel(evento.percentual, evento.estourado) : 'ok'
  const pct = temOrcamento ? Math.min(100, evento.percentual) : 0

  return (
    <>
      <div className="dashboard-header">
        <div>
          <Link to="/eventos" className="btn-link"><ArrowLeft size={16} /> Voltar pra Eventos</Link>
          <h2 style={{ marginTop: 6 }}>
            {evento.nome} <span className={`evento-badge evento-badge--${evento.status}`}>{encerrado ? 'Encerrado' : 'Ativo'}</span>
          </h2>
          <span className="tx-meta">
            {fmtDate(evento.dataInicio)}{evento.dataFim && ` – ${fmtDate(evento.dataFim)}`}
          </span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={contas.length === 0}>
          <Plus size={16} /> Nova transação
        </button>
      </div>

      {error && (
        <Alert type="error" className="alert-with-action">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={fetchData}>Tentar novamente</button>
        </Alert>
      )}

      <div className="budget-card" style={{ marginBottom: 24 }}>
        {temOrcamento && (
          <>
            <div className="meta-progress-bar">
              <div className={`budget-progress-fill budget-progress-fill--${level}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="meta-progress-info">
              <span>{fmt(evento.gasto)} de {fmt(evento.orcamento)}</span>
              <span className="meta-progress-pct">{evento.percentual}%</span>
            </div>
          </>
        )}
        <div className="meta-card-status">
          {evento.estourado ? (
            <span className="budget-badge budget-badge--over">⚠ Orçamento estourado em {fmt(evento.gasto - evento.orcamento)}</span>
          ) : (
            <span>Gasto {fmt(evento.gasto)} · Recebido {fmt(evento.recebido)} · Saldo {fmt(evento.saldo)}</span>
          )}
        </div>
      </div>

      <TransactionList
        transactions={transactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewAnexo={(t) => setAnexoTransactionId(t.id)}
        onViewHistorico={(t) => setHistoricoTransactionId(t.id)}
        hasFilters={false}
        onCreateClick={() => setShowModal(true)}
      />

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /> Anterior</button>
          <span className="pagination-info">Página {page} de {pagination.totalPages} · {pagination.total} transação(ões)</span>
          <button className="btn btn-sm btn-outline" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Próxima <ChevronRight size={16} /></button>
        </div>
      )}

      {showModal && (
        <TransactionModal
          transaction={editingTransaction}
          contas={contas}
          eventos={eventos}
          defaultEventoId={Number(id)}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}


      {anexoTransactionId !== null && (
        <AnexoViewer transactionId={anexoTransactionId} onClose={() => setAnexoTransactionId(null)} />
      )}

      {historicoTransactionId !== null && (
        <HistoricoViewer transactionId={historicoTransactionId} contas={contas} onClose={() => setHistoricoTransactionId(null)} />
      )}

    </>
  )
}
