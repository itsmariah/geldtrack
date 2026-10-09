import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import RecurringModal from '../components/RecurringModal'
import RecurringCard from '../components/RecurringCard'
import SortableGrid from '../components/SortableGrid'
import { salvarOrdem } from '../utils/salvarOrdem'
import ConfirmDialog from '../components/ConfirmDialog'
import Alert from '../components/Alert'
import { SkeletonList } from '../components/Skeleton'
import { Plus, Repeat } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import EmptyIllustration from '../components/EmptyIllustration'

export default function Recurring() {
  const [recorrencias, setRecorrencias] = useState([])
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const toast = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)


  const fetchRecorrencias = useCallback(async () => {
    setError('')
    try {
      const [recRes, contasRes] = await Promise.all([
        api.get('/recorrencias'),
        api.get('/contas'),
      ])
      setRecorrencias(recRes.data)
      setContas(contasRes.data)
    } catch (err) {
      console.error('Erro ao buscar recorrências:', err)
      setError('Não foi possível carregar suas recorrências. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReorder = (novaLista) => salvarOrdem('/recorrencias/reorder', novaLista, { setLista: setRecorrencias, recarregar: fetchRecorrencias, setError })

  useEffect(() => { fetchRecorrencias() }, [fetchRecorrencias])

  const handleEdit = (recorrencia) => {
    setEditing(recorrencia)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditing(null)
  }

  const handleSaved = () => {
    toast(editing ? 'Recorrência atualizada com sucesso.' : 'Recorrência criada com sucesso.')
    handleModalClose()
    fetchRecorrencias()
  }

  const handleToggleAtiva = async (recorrencia) => {
    try {
      await api.put(`/recorrencias/${recorrencia.id}`, { ...recorrencia, ativa: !recorrencia.ativa })
      toast(recorrencia.ativa ? 'Recorrência pausada.' : 'Recorrência retomada.')
      fetchRecorrencias()
    } catch (err) {
      console.error(err)
      setError('Não foi possível atualizar a recorrência. Tente novamente.')
    }
  }

  const confirmDelete = async () => {
    const id = deleteId
    setDeleteId(null)
    try {
      await api.delete(`/recorrencias/${id}`)
      toast('Recorrência excluída.')
      fetchRecorrencias()
    } catch (err) {
      console.error(err)
      setError('Não foi possível excluir a recorrência. Tente novamente.')
    }
  }

  return (
    <>
      <div className="dashboard-header">
        <h2>Transações recorrentes</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} disabled={contas.length === 0}>
          <Plus size={16} /> Nova recorrência
        </button>
      </div>

      {error && (
        <Alert type="error" className="alert-with-action">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={fetchRecorrencias}>Tentar novamente</button>
        </Alert>
      )}

      {loading ? (
        <SkeletonList rows={3} />
      ) : error ? null : recorrencias.length === 0 ? (
        <div className="empty-state">
          <EmptyIllustration icon={Repeat} />
          <p>Você ainda não tem nenhuma recorrência.</p>
          <p className="empty-state-sub">Cadastre contas que se repetem todo mês, como aluguel, assinaturas ou salário, e o sistema lança elas automaticamente.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 16 }}>
            <Plus size={16} /> Criar minha primeira recorrência
          </button>
        </div>
      ) : (
        <SortableGrid
          items={recorrencias}
          onReorder={handleReorder}
          descricao="recorrência reordenável"
          renderItem={recorrencia => (
            <RecurringCard recorrencia={recorrencia} onEdit={handleEdit} onDelete={setDeleteId} onToggleAtiva={handleToggleAtiva} />
          )}
        />
      )}

      {showModal && (
        <RecurringModal
          recorrencia={editing}
          contas={contas}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {deleteId !== null && (
        <ConfirmDialog
          title="Excluir recorrência"
          message="Tem certeza que deseja excluir esta recorrência? As transações já lançadas por ela permanecem no seu histórico, mas nenhuma nova será gerada. Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

    </>
  )
}
