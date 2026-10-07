import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import MetaModal from '../components/MetaModal'
import AporteModal from '../components/AporteModal'
import MetaCard from '../components/MetaCard'
import SortableGrid from '../components/SortableGrid'
import { salvarOrdem } from '../utils/salvarOrdem'
import ConfirmDialog from '../components/ConfirmDialog'
import Alert from '../components/Alert'
import { SkeletonList } from '../components/Skeleton'
import { Plus, Target } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { celebrate } from '../utils/celebrate'
import EmptyIllustration from '../components/EmptyIllustration'

export default function Goals() {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const toast = useToast()
  const [showMetaModal, setShowMetaModal] = useState(false)
  const [editingMeta, setEditingMeta] = useState(null)
  const [aporteMeta, setAporteMeta] = useState(null)
  const [deleteMetaId, setDeleteMetaId] = useState(null)
  const [deleteAporte, setDeleteAporte] = useState(null)


  const fetchMetas = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/metas')
      setMetas(data)
      return data
    } catch (err) {
      console.error('Erro ao buscar metas:', err)
      setError('Não foi possível carregar suas metas. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMetas() }, [fetchMetas])

  const handleReorder = (novaLista) => salvarOrdem('/metas/reorder', novaLista, { setLista: setMetas, recarregar: fetchMetas, setError })

  const handleEdit = (meta) => {
    setEditingMeta(meta)
    setShowMetaModal(true)
  }

  const handleMetaModalClose = () => {
    setShowMetaModal(false)
    setEditingMeta(null)
  }

  const handleMetaSaved = () => {
    toast(editingMeta ? 'Meta atualizada com sucesso.' : 'Meta criada com sucesso.')
    handleMetaModalClose()
    fetchMetas()
  }

  const confirmDeleteMeta = async () => {
    const id = deleteMetaId
    setDeleteMetaId(null)
    try {
      await api.delete(`/metas/${id}`)
      toast('Meta excluída.')
      fetchMetas()
    } catch (err) {
      console.error(err)
      setError('Não foi possível excluir a meta. Tente novamente.')
    }
  }

  // Se o aporte fez a meta bater 100%, comemora (confete + vibração) em vez do toast comum.
  const handleAporteSaved = async () => {
    const { id, concluida: jaEstavaConcluida } = aporteMeta
    setAporteMeta(null)
    const atualizadas = await fetchMetas()
    const meta = atualizadas?.find(m => m.id === id)
    if (meta?.concluida && !jaEstavaConcluida) {
      celebrate()
      toast(`Meta "${meta.titulo}" concluída! Parabéns 🎉`)
    } else {
      toast('Aporte adicionado com sucesso.')
    }
  }

  const confirmDeleteAporte = async () => {
    const { metaId, aporteId } = deleteAporte
    setDeleteAporte(null)
    try {
      await api.delete(`/metas/${metaId}/aportes/${aporteId}`)
      toast('Aporte removido.')
      fetchMetas()
    } catch (err) {
      console.error(err)
      setError('Não foi possível remover o aporte. Tente novamente.')
    }
  }

  return (
    <>
      <div className="dashboard-header">
        <h2>Metas financeiras</h2>
        <button className="btn btn-primary" onClick={() => setShowMetaModal(true)}>
          <Plus size={16} /> Nova meta
        </button>
      </div>

      {error && (
        <Alert type="error" className="alert-with-action">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={fetchMetas}>Tentar novamente</button>
        </Alert>
      )}

      {loading ? (
        <SkeletonList rows={3} />
      ) : error ? null : metas.length === 0 ? (
        <div className="empty-state">
          <EmptyIllustration icon={Target} />
          <p>Você ainda não tem nenhuma meta.</p>
          <p className="empty-state-sub">Crie uma meta pra acompanhar o progresso de algo que você está juntando dinheiro pra conquistar.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowMetaModal(true)} style={{ marginTop: 16 }}>
            <Plus size={16} /> Criar minha primeira meta
          </button>
        </div>
      ) : (
        <SortableGrid
          items={metas}
          onReorder={handleReorder}
          descricao="meta reordenável"
          renderItem={meta => (
            <MetaCard
              meta={meta}
              onEdit={handleEdit}
              onDelete={setDeleteMetaId}
              onAddAporte={setAporteMeta}
              onDeleteAporte={(m, aporteId) => setDeleteAporte({ metaId: m.id, aporteId })}
            />
          )}
        />
      )}

      {showMetaModal && (
        <MetaModal
          meta={editingMeta}
          onClose={handleMetaModalClose}
          onSaved={handleMetaSaved}
        />
      )}

      {aporteMeta && (
        <AporteModal
          meta={aporteMeta}
          onClose={() => setAporteMeta(null)}
          onSaved={handleAporteSaved}
        />
      )}

      {deleteMetaId !== null && (
        <ConfirmDialog
          title="Excluir meta"
          message="Tem certeza que deseja excluir esta meta? Todos os aportes registrados nela também serão apagados. Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={confirmDeleteMeta}
          onCancel={() => setDeleteMetaId(null)}
        />
      )}

      {deleteAporte && (
        <ConfirmDialog
          title="Remover aporte"
          message="Tem certeza que deseja remover este aporte? Essa ação não pode ser desfeita."
          confirmLabel="Remover"
          onConfirm={confirmDeleteAporte}
          onCancel={() => setDeleteAporte(null)}
        />
      )}

    </>
  )
}
