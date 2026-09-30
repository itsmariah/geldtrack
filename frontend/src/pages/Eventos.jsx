import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import Navbar from '../components/Navbar'
import EventoModal from '../components/EventoModal'
import EventoCard from '../components/EventoCard'
import SortableGrid from '../components/SortableGrid'
import { salvarOrdem } from '../utils/salvarOrdem'
import ConfirmDialog from '../components/ConfirmDialog'
import Alert from '../components/Alert'
import { SkeletonList } from '../components/Skeleton'

export default function Eventos() {
  const [eventos, setEventos] = useState([])
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

  const fetchEventos = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/eventos')
      setEventos(data)
    } catch (err) {
      console.error('Erro ao buscar eventos:', err)
      setError('Não foi possível carregar seus eventos. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReorder = (novaLista) => salvarOrdem('/eventos/reorder', novaLista, { setLista: setEventos, recarregar: fetchEventos, setError })

  useEffect(() => { fetchEventos() }, [fetchEventos])

  const handleEdit = (evento) => {
    setEditing(evento)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditing(null)
  }

  const handleSaved = () => {
    setToast(editing ? 'Evento atualizado com sucesso.' : 'Evento criado com sucesso.')
    handleModalClose()
    fetchEventos()
  }

  const confirmDelete = async () => {
    const id = deleteId
    setDeleteId(null)
    try {
      await api.delete(`/eventos/${id}`)
      setToast('Evento excluído. As transações vinculadas continuam no seu extrato, só sem a etiqueta.')
      fetchEventos()
    } catch (err) {
      console.error(err)
      setError('Não foi possível excluir o evento. Tente novamente.')
    }
  }

  const handleToggleStatus = async (evento) => {
    try {
      const acao = evento.status === 'encerrado' ? 'reabrir' : 'fechar'
      await api.post(`/eventos/${evento.id}/${acao}`)
      fetchEventos()
    } catch (err) {
      console.error(err)
      setError('Não foi possível atualizar o status do evento. Tente novamente.')
    }
  }

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="dashboard-header">
          <h2>Eventos</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Novo evento
          </button>
        </div>

        {error && (
          <Alert type="error" className="alert-with-action">
            <span>{error}</span>
            <button className="btn btn-sm btn-outline" onClick={fetchEventos}>Tentar novamente</button>
          </Alert>
        )}

        {loading ? (
          <SkeletonList rows={3} />
        ) : error ? null : eventos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧳</div>
            <p>Você ainda não tem nenhum evento.</p>
            <p className="empty-state-sub">Crie um evento (ex: uma viagem) pra agrupar as transações que já lançar no dashboard normal.</p>
            <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 16 }}>
              + Criar meu primeiro evento
            </button>
          </div>
        ) : (
          <SortableGrid
            items={eventos}
            onReorder={handleReorder}
            descricao="evento reordenável"
            renderItem={evento => (
              <EventoCard evento={evento} onEdit={handleEdit} onDelete={setDeleteId} onToggleStatus={handleToggleStatus} />
            )}
          />
        )}
      </main>

      {showModal && (
        <EventoModal
          evento={editing}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {deleteId !== null && (
        <ConfirmDialog
          title="Excluir evento"
          message="Tem certeza que deseja excluir este evento? As transações já vinculadas não são apagadas, só perdem a etiqueta."
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
