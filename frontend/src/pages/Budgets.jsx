import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import BudgetModal from '../components/BudgetModal'
import BudgetCard from '../components/BudgetCard'
import SortableGrid from '../components/SortableGrid'
import { salvarOrdem } from '../utils/salvarOrdem'
import ConfirmDialog from '../components/ConfirmDialog'
import Alert from '../components/Alert'
import { SkeletonList } from '../components/Skeleton'
import { useCategorias } from '../context/CategoriasContext'
import { Plus } from 'lucide-react'

// new Date().toISOString() é UTC — perto da virada do mês no Brasil (UTC-3) isso pode
// adiantar o mês padrão exibido. Aqui montamos o mês local manualmente para evitar isso.
function currentMonthLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function Budgets() {
  const { categoriasDespesa } = useCategorias()
  const [month, setMonth] = useState(currentMonthLocal())
  const [orcamentos, setOrcamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const fetchOrcamentos = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/orcamentos', { params: { month } })
      setOrcamentos(data)
    } catch (err) {
      console.error('Erro ao buscar orçamentos:', err)
      setError('Não foi possível carregar seus orçamentos. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [month])

  const handleReorder = (novaLista) => salvarOrdem('/orcamentos/reorder', novaLista, { setLista: setOrcamentos, recarregar: fetchOrcamentos, setError })

  useEffect(() => { fetchOrcamentos() }, [fetchOrcamentos])

  const handleEdit = (orcamento) => {
    setEditing(orcamento)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditing(null)
  }

  const handleSaved = () => {
    setToast(editing ? 'Orçamento atualizado com sucesso.' : 'Orçamento criado com sucesso.')
    handleModalClose()
    fetchOrcamentos()
  }

  const confirmDelete = async () => {
    const id = deleteId
    setDeleteId(null)
    try {
      await api.delete(`/orcamentos/${id}`)
      setToast('Orçamento excluído.')
      fetchOrcamentos()
    } catch (err) {
      console.error(err)
      setError('Não foi possível excluir o orçamento. Tente novamente.')
    }
  }

  const semCategoriaDisponivel = orcamentos.length >= categoriasDespesa.length

  return (
    <>
      <div className="dashboard-header">
        <h2>Orçamentos</h2>
        <div className="header-actions">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="month-picker"
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            disabled={semCategoriaDisponivel}
            title={semCategoriaDisponivel ? 'Todas as categorias de despesa já têm orçamento' : undefined}
          >
            <Plus size={16} /> Novo orçamento
          </button>
        </div>
      </div>

      {error && (
        <Alert type="error" className="alert-with-action">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={fetchOrcamentos}>Tentar novamente</button>
        </Alert>
      )}

      {loading ? (
        <SkeletonList rows={3} />
      ) : error ? null : orcamentos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p>Você ainda não tem nenhum orçamento.</p>
          <p className="empty-state-sub">Defina um limite mensal por categoria pra saber quando está perto de estourar o gasto planejado.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 16 }}>
            <Plus size={16} /> Criar meu primeiro orçamento
          </button>
        </div>
      ) : (
        <SortableGrid
          items={orcamentos}
          onReorder={handleReorder}
          descricao="orçamento reordenável"
          renderItem={orcamento => (
            <BudgetCard orcamento={orcamento} onEdit={handleEdit} onDelete={setDeleteId} />
          )}
        />
      )}

      {showModal && (
        <BudgetModal
          orcamento={editing}
          existingCategorias={orcamentos.map(o => o.categoria)}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {deleteId !== null && (
        <ConfirmDialog
          title="Excluir orçamento"
          message="Tem certeza que deseja excluir este orçamento? Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}
