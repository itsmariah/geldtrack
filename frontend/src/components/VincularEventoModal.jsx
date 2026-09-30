import { useState } from 'react'
import api from '../services/api'
import Modal from './Modal'
import Alert from './Alert'
import EventoSelect, { useEventoSelecao } from './EventoSelect'

// "Vincular ao evento": põe num evento, de uma vez, tudo o que o usuário já levou deste grupo
// pro dashboard (despesas e receitas) — pra quando o evento foi criado depois da importação.
// eventosNoDashboard: um item por transação, com o evento atual de cada (ou null).
export default function VincularEventoModal({ grupoId, nomeGrupo, eventosNoDashboard, eventoIdPadrao, datas, onClose, onSaved }) {
  const eventoSelecao = useEventoSelecao({ eventoIdPadrao, nomeSugerido: nomeGrupo, datas })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const total = eventosNoDashboard.length
  const escolhido = eventoSelecao.eventoId === '' || eventoSelecao.eventoId === 'novo' ? null : Number(eventoSelecao.eventoId)
  const emOutroEvento = eventosNoDashboard.filter(id => id !== null && id !== escolhido).length

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const eventoId = await eventoSelecao.resolverEventoId()
      const { data } = await api.post(`/grupos/${grupoId}/evento`, { eventoId })
      onSaved(data.count, eventoId)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao vincular ao evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>Vincular ao evento</h3>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <p className="form-hint" style={{ marginTop: 0, marginBottom: 12 }}>
        {total === 1 ? 'A transação' : `As ${total} transações`} deste grupo que você já adicionou ao dashboard
        (despesas e pagamentos recebidos) {total === 1 ? 'vai' : 'vão'} para o evento escolhido.
      </p>

      <form onSubmit={handleSubmit}>
        <EventoSelect id="vincular-evento" selecao={eventoSelecao} label="Evento" rotuloNenhum="Nenhum (tirar do evento)" />

        {emOutroEvento > 0 && (
          <Alert type="warning">
            {emOutroEvento === 1 ? '1 delas já está' : `${emOutroEvento} delas já estão`} em outro evento e {emOutroEvento === 1 ? 'vai mudar' : 'vão mudar'} também.
          </Alert>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading || eventoSelecao.carregando}>
            {loading ? 'Salvando...' : 'Vincular'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
