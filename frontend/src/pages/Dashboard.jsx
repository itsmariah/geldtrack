import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Navbar from '../components/Navbar'
import SummaryCards from '../components/SummaryCards'
import TransactionModal from '../components/TransactionModal'
import TransactionList from '../components/TransactionList'
import AnexoViewer from '../components/AnexoViewer'
import HistoricoViewer from '../components/HistoricoViewer'
import ExpensePieChart from '../components/charts/ExpensePieChart'
import OFXImportModal from '../components/OFXImportModal'
import InsightsPanel from '../components/InsightsPanel'
import ProjectionCard from '../components/ProjectionCard'
import ConfirmDialog from '../components/ConfirmDialog'
import Alert from '../components/Alert'
import { SkeletonCards, SkeletonList, SkeletonChart } from '../components/Skeleton'
import { useCategorias } from '../context/CategoriasContext'

const PAGE_SIZE = 50

export default function Dashboard() {
  const { user } = useAuth()
  const { todasCategorias } = useCategorias()
  const [transactions, setTransactions] = useState([])
  const [balance, setBalance] = useState({ receitas: 0, despesas: 0, saldo: 0 })
  const [categoryData, setCategoryData] = useState([])
  const [contas, setContas] = useState([])
  const [eventos, setEventos] = useState([])
  const [insights, setInsights] = useState([])
  const [projecao, setProjecao] = useState(null)
  const [filters, setFilters] = useState({ tipo: '', categoria: '', conta: '', data_inicio: '', data_fim: '', busca: '' })
  const [buscaInput, setBuscaInput] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [showModal, setShowModal] = useState(false)
  const [showOFXModal, setShowOFXModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [anexoTransactionId, setAnexoTransactionId] = useState(null)
  const [historicoTransactionId, setHistoricoTransactionId] = useState(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  // Params de filtro compartilhados entre a listagem paginada e a exportação CSV.
  const buildFilterParams = useCallback(() => {
    const params = {}
    if (filters.tipo) params.tipo = filters.tipo
    if (filters.categoria) params.categoria = filters.categoria
    if (filters.conta) params.conta = filters.conta
    if (filters.data_inicio) params.data_inicio = filters.data_inicio
    if (filters.data_fim) params.data_fim = filters.data_fim
    if (filters.busca) params.busca = filters.busca
    return params
  }, [filters])

  const fetchData = useCallback(async () => {
    setError('')
    try {
      const params = { ...buildFilterParams(), page, limit: PAGE_SIZE }

      const [txRes, balanceRes, catRes, contasRes, insightsRes, projecaoRes, eventosRes] = await Promise.all([
        api.get('/transactions', { params }),
        api.get('/reports/balance'),
        api.get('/reports/categories'),
        api.get('/contas'),
        api.get('/reports/insights'),
        api.get('/reports/projecao'),
        api.get('/eventos'),
      ])

      setTransactions(txRes.data.transactions)
      setPagination({ total: txRes.data.total, totalPages: txRes.data.totalPages })
      // Se a página atual ficou vazia (ex: excluiu a última transação da última página), volta uma página.
      if (txRes.data.page > txRes.data.totalPages) {
        setPage(txRes.data.totalPages)
      }
      setBalance(balanceRes.data)
      setCategoryData(catRes.data)
      setContas(contasRes.data)
      setInsights(insightsRes.data)
      setProjecao(projecaoRes.data)
      setEventos(eventosRes.data)
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
      setError('Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [buildFilterParams, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = (id) => setDeleteId(id)

  const confirmDelete = async () => {
    const id = deleteId
    setDeleteId(null)
    try {
      await api.delete(`/transactions/${id}`)
      setToast('Transação excluída.')
      fetchData()
    } catch (err) {
      console.error(err)
      setError('Não foi possível excluir a transação. Tente novamente.')
    }
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
    setToast(editingTransaction ? 'Transação atualizada com sucesso.' : 'Transação adicionada com sucesso.')
    handleModalClose()
    fetchData()
  }

  const handleExportCsv = async () => {
    setExporting(true)
    setError('')
    try {
      const res = await api.get('/transactions/export', {
        params: buildFilterParams(),
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const now = new Date()
      const dataArquivo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const link = document.createElement('a')
      link.href = url
      link.download = `geldtrack-transacoes-${dataArquivo}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setError('Não foi possível exportar as transações. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  // Sempre volta para a página 1 ao mudar um filtro — senão o usuário pode ficar numa
  // página que não existe mais no resultado filtrado.
  const updateFilters = (partial) => {
    setFilters(f => ({ ...f, ...partial }))
    setPage(1)
  }

  // Busca por texto (descrição/categoria) é aplicada com debounce, pra não disparar
  // uma requisição a cada tecla digitada.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => updateFilters({ busca: buscaInput }), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaInput])

  const hasFilters = filters.tipo || filters.categoria || filters.conta || filters.data_inicio || filters.data_fim || filters.busca
  const clearFilters = () => {
    setFilters({ tipo: '', categoria: '', conta: '', data_inicio: '', data_fim: '', busca: '' })
    setBuscaInput('')
    setPage(1)
  }

  const despesasByCategory = categoryData
    .filter(d => d.tipo === 'despesa')
    .map(d => ({ name: d.categoria, value: d.total }))

  const receitasByCategory = categoryData
    .filter(d => d.tipo === 'receita')
    .map(d => ({ name: d.categoria, value: d.total }))

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="dashboard-header">
          <h2>Olá, {user?.nome?.split(' ')[0]} 👋</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline" onClick={handleExportCsv} disabled={exporting}>
              {exporting ? 'Exportando...' : '↓ Exportar CSV'}
            </button>
            <button className="btn btn-outline" onClick={() => setShowOFXModal(true)} disabled={contas.length === 0}>
              ↓ Importar OFX
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={contas.length === 0}>
              + Nova Transação
            </button>
          </div>
        </div>

        {error && (
          <Alert type="error" className="alert-with-action">
            <span>{error}</span>
            <button className="btn btn-sm btn-outline" onClick={fetchData}>Tentar novamente</button>
          </Alert>
        )}

        {loading ? <SkeletonCards /> : <SummaryCards balance={balance} />}

        {!loading && <ProjectionCard projecao={projecao} />}

        {!loading && <InsightsPanel insights={insights} />}

        <div className="dashboard-grid">
          <div className="transactions-section">
            <div className="section-header">
              <h3>Transações</h3>
              <div className="filters">
                <input
                  type="search"
                  className="filter-search"
                  value={buscaInput}
                  onChange={e => setBuscaInput(e.target.value)}
                  placeholder="Buscar por descrição ou categoria..."
                  aria-label="Buscar transações"
                />
                <select value={filters.tipo} onChange={e => updateFilters({ tipo: e.target.value })}>
                  <option value="">Todos os tipos</option>
                  <option value="receita">Receitas</option>
                  <option value="despesa">Despesas</option>
                </select>
                <select value={filters.categoria} onChange={e => updateFilters({ categoria: e.target.value })}>
                  <option value="">Todas as categorias</option>
                  {todasCategorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {contas.length > 1 && (
                  <select value={filters.conta} onChange={e => updateFilters({ conta: e.target.value })}>
                    <option value="">Todas as contas</option>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                )}
                <input
                  type="date"
                  value={filters.data_inicio}
                  onChange={e => updateFilters({ data_inicio: e.target.value })}
                  title="Data início"
                />
                <input
                  type="date"
                  value={filters.data_fim}
                  onChange={e => updateFilters({ data_fim: e.target.value })}
                  title="Data fim"
                />
                {hasFilters && (
                  <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <SkeletonList rows={5} />
            ) : error ? null : (
              <>
                <TransactionList
                  transactions={transactions}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewAnexo={(t) => setAnexoTransactionId(t.id)}
                  onViewHistorico={(t) => setHistoricoTransactionId(t.id)}
                  hasFilters={hasFilters}
                  onCreateClick={() => setShowModal(true)}
                />
                {pagination.totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      ← Anterior
                    </button>
                    <span className="pagination-info">
                      Página {page} de {pagination.totalPages} · {pagination.total} transação(ões)
                    </span>
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="chart-section">
              <h3>Gastos por Categoria</h3>
              {loading ? <SkeletonChart /> : <ExpensePieChart data={despesasByCategory} emptyMessage="Nenhuma despesa registrada" />}
            </div>
            <div className="chart-section">
              <h3>Fontes de Renda</h3>
              {loading ? <SkeletonChart /> : <ExpensePieChart data={receitasByCategory} emptyMessage="Nenhuma receita registrada" />}
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <TransactionModal
          transaction={editingTransaction}
          contas={contas}
          eventos={eventos}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {showOFXModal && (
        <OFXImportModal
          contas={contas}
          onClose={() => setShowOFXModal(false)}
          onImported={fetchData}
        />
      )}

      {deleteId !== null && (
        <ConfirmDialog
          title="Excluir transação"
          message="Tem certeza que deseja excluir esta transação? Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {anexoTransactionId !== null && (
        <AnexoViewer transactionId={anexoTransactionId} onClose={() => setAnexoTransactionId(null)} />
      )}

      {historicoTransactionId !== null && (
        <HistoricoViewer transactionId={historicoTransactionId} contas={contas} onClose={() => setHistoricoTransactionId(null)} />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
