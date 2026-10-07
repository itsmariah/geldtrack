import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import SummaryCards from '../components/SummaryCards'
import TransactionModal from '../components/TransactionModal'
import TransactionList from '../components/TransactionList'
import AnexoViewer from '../components/AnexoViewer'
import HistoricoViewer from '../components/HistoricoViewer'
import ExpensePieChart from '../components/charts/ExpensePieChart'
import OFXImportModal from '../components/OFXImportModal'
import InsightsPanel from '../components/InsightsPanel'
import ProjectionCard from '../components/ProjectionCard'
import Pagination from '../components/Pagination'
import Alert from '../components/Alert'
import { SkeletonCards, SkeletonList, SkeletonChart } from '../components/Skeleton'
import { useCategorias } from '../context/CategoriasContext'
import { ChevronDown, Download, Loader2, Plus, Upload } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import PullToRefresh from '../components/PullToRefresh'
import { saudacao, contextoDoDia } from '../utils/saudacao'
import { serieMensal } from '../utils/serieMensal'

// 20 por página: a lista cresce todo dia e, no celular, 50 itens de uma vez já é uma
// rolagem longa — a paginação numerada deixa pular direto pra qualquer página.
const PAGE_SIZE = 20

export default function Dashboard() {
  const { user } = useAuth()
  const { todasCategorias } = useCategorias()
  const location = useLocation()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [balance, setBalance] = useState({ receitas: 0, despesas: 0, saldo: 0 })
  const [categoryData, setCategoryData] = useState([])
  const [contas, setContas] = useState([])
  const [eventos, setEventos] = useState([])
  const [insights, setInsights] = useState([])
  const [projecao, setProjecao] = useState(null)
  const [evolucao, setEvolucao] = useState([])
  const [filters, setFilters] = useState({ tipo: '', categoria: '', conta: '', data_inicio: '', data_fim: '', busca: '' })
  const [buscaInput, setBuscaInput] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })
  const [showModal, setShowModal] = useState(false)
  const [showOFXModal, setShowOFXModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const toast = useToast()
  const [exporting, setExporting] = useState(false)
  const [anexoTransactionId, setAnexoTransactionId] = useState(null)
  const [historicoTransactionId, setHistoricoTransactionId] = useState(null)
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)
  const transactionsRef = useRef(null)


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

      const [txRes, balanceRes, catRes, contasRes, insightsRes, projecaoRes, eventosRes, evolucaoRes] = await Promise.all([
        api.get('/transactions', { params }),
        api.get('/reports/balance'),
        api.get('/reports/categories'),
        api.get('/contas'),
        api.get('/reports/insights'),
        api.get('/reports/projecao'),
        api.get('/eventos'),
        // Só alimenta os minigráficos dos cards — se falhar, o Dashboard segue sem eles.
        api.get('/reports/evolution').catch(() => ({ data: [] })),
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
      setEvolucao(evolucaoRes.data)
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

  // Botão "+" da barra inferior (BottomNav): chega aqui com state.novaTransacao e abre o
  // modal assim que as contas carregam. O state é limpo pra não reabrir ao voltar/recarregar.
  useEffect(() => {
    if (!location.state?.novaTransacao || loading) return
    navigate(location.pathname, { replace: true, state: {} })
    if (contas.length > 0) {
      setEditingTransaction(null)
      setShowModal(true)
    } else {
      setError('Cadastre uma conta antes de adicionar transações.')
    }
  }, [location, loading, contas.length, navigate])

  // Exclusão com "Desfazer": a transação some da tela na hora e só é apagada de verdade
  // quando o toast expira (ver ToastContext). Desfazer só recarrega — no servidor nada mudou.
  const handleDelete = (id) => {
    const removida = transactions.find(t => t.id === id)
    // Saldo/totais também mudam na hora (só dá pra fazer localmente com valores em reais;
    // transações em outra moeda entram no total convertidas, então esperam o recarregamento).
    if (removida && (!removida.conta?.moeda || removida.conta.moeda === 'BRL')) {
      const v = Number(removida.valor)
      setBalance(b => removida.tipo === 'receita'
        ? { ...b, receitas: b.receitas - v, saldo: b.saldo - v }
        : { ...b, despesas: b.despesas - v, saldo: b.saldo + v })
    }
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

  // Otimista: a lista já muda na hora (sem esperar a API), e só volta ao estado do servidor
  // se a reordenação falhar. Os itens do dia são contíguos na página (ordenada por data).
  const handleReorder = async (data, novaOrdem) => {
    setTransactions(prev => {
      const inicio = prev.findIndex(t => t.data === data)
      const resto = prev.filter(t => t.data !== data)
      return [...resto.slice(0, inicio), ...novaOrdem, ...resto.slice(inicio)]
    })
    try {
      await api.put('/transactions/reorder', { data, ids: novaOrdem.map(t => t.id) })
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Não foi possível salvar a nova ordem. Tente novamente.')
      fetchData()
    }
  }

  const handlePageChange = (novaPagina) => {
    setPage(novaPagina)
    transactionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
  const temDiaComVarias = transactions.some((t, i) => i > 0 && transactions[i - 1].data === t.data)
  const extraFiltersCount = [filters.tipo, filters.categoria, filters.conta, filters.data_inicio, filters.data_fim].filter(Boolean).length
  const clearFilters = () => {
    setFilters({ tipo: '', categoria: '', conta: '', data_inicio: '', data_fim: '', busca: '' })
    setBuscaInput('')
    setPage(1)
  }

  const ola = saudacao()
  const serie = serieMensal(evolucao)

  const despesasByCategory = categoryData
    .filter(d => d.tipo === 'despesa')
    .map(d => ({ name: d.categoria, value: d.total }))

  const receitasByCategory = categoryData
    .filter(d => d.tipo === 'receita')
    .map(d => ({ name: d.categoria, value: d.total }))

  return (
    <>
      <PullToRefresh onRefresh={fetchData} />

      <div className="dashboard-header">
        <div className="dashboard-greeting">
          <h2>{ola.texto}, {user?.nome?.split(' ')[0]} <span className="dashboard-greeting-emoji" aria-hidden="true">{ola.emoji}</span></h2>
          <p className="dashboard-subtitle">{contextoDoDia()}</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? <Loader2 size={16} className="icon-spin" aria-hidden="true" /> : <Download size={16} />} {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <button className="btn btn-outline" onClick={() => setShowOFXModal(true)} disabled={contas.length === 0}>
            <Upload size={16} /> Importar OFX
          </button>
          <button className="btn btn-primary dashboard-new-btn" onClick={() => setShowModal(true)} disabled={contas.length === 0}>
            <Plus size={16} /> Nova transação
          </button>
        </div>
      </div>

      {error && (
        <Alert type="error" className="alert-with-action">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={fetchData}>Tentar novamente</button>
        </Alert>
      )}

      {loading ? <SkeletonCards /> : <SummaryCards balance={balance} serie={serie} />}

      {!loading && <ProjectionCard projecao={projecao} />}

      {!loading && <InsightsPanel insights={insights} />}

      <div className="dashboard-grid">
        <div className="transactions-section" ref={transactionsRef}>
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
              {/* Só aparece no celular — lá os filtros ficam recolhidos pra lista não
                  começar depois de uma tela inteira de selects. */}
              <button
                type="button"
                className="btn btn-outline btn-sm filters-toggle"
                onClick={() => setShowFiltersMobile(v => !v)}
                aria-expanded={showFiltersMobile}
                aria-controls="dashboard-filters-extra"
              >
                Filtros{extraFiltersCount > 0 ? ` (${extraFiltersCount})` : ''} <ChevronDown size={16} className={`icon-chevron${showFiltersMobile ? ' icon-chevron--open' : ''}`} />
              </button>
              <div id="dashboard-filters-extra" className={`filters-extra${showFiltersMobile ? ' filters-extra--open' : ''}`}>
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
              </div>
              {hasFilters && (
                <button className="btn btn-outline btn-sm filters-clear" onClick={clearFilters}>
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
          {temDiaComVarias && !loading && !error && (
            <p className="transactions-hint">Dica: segure e arraste transações do mesmo dia para mudar a ordem.</p>
          )}

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
                onReorder={handleReorder}
                hasFilters={hasFilters}
                onCreateClick={() => setShowModal(true)}
              />
              <Pagination
                page={page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                itemLabel={pagination.total === 1 ? 'transação' : 'transações'}
                onChange={handlePageChange}
              />
            </>
          )}
        </div>

        <div className="dashboard-side">
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


      {anexoTransactionId !== null && (
        <AnexoViewer transactionId={anexoTransactionId} onClose={() => setAnexoTransactionId(null)} />
      )}

      {historicoTransactionId !== null && (
        <HistoricoViewer transactionId={historicoTransactionId} contas={contas} onClose={() => setHistoricoTransactionId(null)} />
      )}

    </>
  )
}
