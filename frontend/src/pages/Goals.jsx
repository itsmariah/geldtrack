import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import Navbar from '../components/Navbar'
import MetaModal from '../components/MetaModal'
import AporteModal from '../components/AporteModal'
import MetaCard from '../components/MetaCard'
import SortableGrid from '../components/SortableGrid'
import { salvarOrdem } from '../utils/salvarOrdem'
import ConfirmDialog from '../components/ConfirmDialog'
import Alert from '../components/Alert'
import { SkeletonList } from '../components/Skeleton'

export default function Goals() {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [showMetaModal, setShowMetaModal] = useState(false)
  const [editingMeta, setEditingMeta] = useState(null)
  const [aporteMeta, setAporteMeta] = useState(null)
  const [deleteMetaId, setDeleteMetaId] = useState(null)
  const [deleteAporte, setDeleteAporte] = useState(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const fetchMetas = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/metas')
      setMetas(data)
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
    setToast(editingMeta ? 'Meta atualizada com sucesso.' : 'Meta criada com sucesso.')
    handleMetaModalClose()
    fetchMetas()
  }

  const confirmDeleteMeta = async () => {
    const id = deleteMetaId
    setDeleteMetaId(null)
    try {
      await api.delete(`/metas/${id}`)
      setToast('Meta excluída.')
      fetchMetas()
    } catch (err) {
      console.error(err)
      setError('Não foi possível excluir a meta. Tente novamente.')
    }
  }

  const handleAporteSaved = () => {
    setToast('Aporte adicionado com sucesso.')
    setAporteMeta(null)
    fetchMetas()
  }

  const confirmDeleteAporte = async () => {
    const { metaId, aporteId } = deleteAporte
    setDeleteAporte(null)
    try {
      await api.delete(`/metas/${metaId}/aportes/${aporteId}`)
      setToast('Aporte removido.')
      fetchMetas()
    } catch (err) {
      console.error(err)
      setError('Não foi possível remover o aporte. Tente novamente.')
    }
  }

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="dashboard-header">
          <h2>Metas financeiras</h2>
          <button className="btn btn-primary" onClick={() => setShowMetaModal(true)}>
            + Nova meta
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
            <div className="empty-state-icon">🎯</div>
            <p>Você ainda não tem nenhuma meta.</p>
            <p className="empty-state-sub">Crie uma meta pra acompanhar o progresso de algo que você está juntando dinheiro pra conquistar.</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowMetaModal(true)} style={{ marginTop: 16 }}>
              + Criar minha primeira meta
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
      </main>

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

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
