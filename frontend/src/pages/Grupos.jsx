import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import GrupoModal from '../components/GrupoModal'
import SortableGrid from '../components/SortableGrid'
import { salvarOrdem } from '../utils/salvarOrdem'
import GrupoCard from '../components/GrupoCard'
import Alert from '../components/Alert'
import { SkeletonList } from '../components/Skeleton'
import { Plus } from 'lucide-react'

export default function Grupos() {
  const navigate = useNavigate()
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [codigoInput, setCodigoInput] = useState('')
  const [entrarError, setEntrarError] = useState('')
  const [entrando, setEntrando] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const fetchGrupos = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/grupos')
      setGrupos(data)
    } catch (err) {
      console.error('Erro ao buscar grupos:', err)
      setError('Não foi possível carregar seus grupos. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Cada membro organiza a própria lista de grupos (a posição fica no GrupoMembro).
  const handleReorder = (novaLista) => salvarOrdem('/grupos/reorder', novaLista, { setLista: setGrupos, recarregar: fetchGrupos, setError })

  useEffect(() => { fetchGrupos() }, [fetchGrupos])

  const handleModalClose = () => setShowModal(false)

  const handleSaved = () => {
    setToast('Grupo criado com sucesso.')
    handleModalClose()
    fetchGrupos()
  }

  const handleSubmitEntrar = async (e) => {
    e.preventDefault()
    setEntrarError('')
    if (!codigoInput.trim()) {
      setEntrarError('Digite um código de grupo')
      return
    }
    setEntrando(true)
    try {
      const { data } = await api.post('/grupos/entrar', { codigo: codigoInput.trim() })
      setCodigoInput('')
      navigate(`/grupos/${data.id}`)
    } catch (err) {
      setEntrarError(err.response?.data?.error || 'Não foi possível entrar nesse grupo.')
    } finally {
      setEntrando(false)
    }
  }

  return (
    <>
      <div className="dashboard-header">
        <h2>Grupos</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Novo grupo</button>
      </div>

      {error && (
        <Alert type="error" className="alert-with-action">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={fetchGrupos}>Tentar novamente</button>
        </Alert>
      )}

      {loading ? (
        <SkeletonList rows={3} />
      ) : error ? null : (
        <>
          {grupos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🧾</div>
              <p>Você ainda não tem nenhum grupo.</p>
              <p className="empty-state-sub">Crie um grupo pra dividir despesas com outras pessoas e ver quem deve quem, ou entre num grupo existente com um código.</p>
              <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginTop: 16 }}>
                <Plus size={16} /> Criar meu primeiro grupo
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <SortableGrid
                items={grupos}
                onReorder={handleReorder}
                descricao="grupo reordenável"
                renderItem={grupo => <GrupoCard grupo={grupo} />}
              />
            </div>
          )}

          <div className="transactions-section">
            <div className="section-header">
              <h3>Entrar em um grupo</h3>
            </div>
            {entrarError && <Alert type="error">{entrarError}</Alert>}
            <form onSubmit={handleSubmitEntrar} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={codigoInput}
                onChange={e => setCodigoInput(e.target.value)}
                placeholder="Ex: AB3F92"
                maxLength={12}
                style={{ flex: 1, textTransform: 'uppercase' }}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={entrando}>
                {entrando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <p className="form-hint">Peça o código pra quem já está no grupo e entre digitando ele aqui.</p>
          </div>
        </>
      )}

      {showModal && <GrupoModal onClose={handleModalClose} onSaved={handleSaved} />}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}
