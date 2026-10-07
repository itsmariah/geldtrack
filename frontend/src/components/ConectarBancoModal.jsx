import { useState, useEffect, useRef } from 'react'
import { PluggyConnect } from 'react-pluggy-connect'
import api from '../services/api'
import Alert from './Alert'
import { X } from 'lucide-react'

const POLL_INTERVAL_MS = 3000
const POLL_MAX_TENTATIVAS = 40 // ~2 minutos, tempo recomendado pela Pluggy pra sincronização inicial

// Fluxo: 1) pega um connect token do nosso backend, 2) abre o widget da Pluggy (que
// cuida de login/MFA sozinho), 3) no onSuccess registra a conexão no backend, 4) como o
// banco pode levar até ~1min pra terminar de sincronizar depois do login, fica
// perguntando (polling) até status virar UPDATED (ou dar erro).
export default function ConectarBancoModal({ onClose, onConnected }) {
  const [connectToken, setConnectToken] = useState(null)
  const [fase, setFase] = useState('carregando') // carregando | widget | sincronizando | erro
  const [error, setError] = useState('')
  const pollTimeoutRef = useRef(null)

  useEffect(() => {
    api.post('/open-finance/connect-token')
      .then(({ data }) => { setConnectToken(data.accessToken); setFase('widget') })
      .catch(() => { setError('Não foi possível iniciar a conexão com o banco. Tente novamente.'); setFase('erro') })
    return () => clearTimeout(pollTimeoutRef.current)
  }, [])

  const tratarResultadoSincronizacao = (conexaoId, data, tentativa) => {
    if (data.status === 'UPDATED') {
      onConnected({ ...data, id: conexaoId })
    } else if (data.status === 'LOGIN_ERROR' || data.status === 'OUTDATED') {
      setError('O banco não conseguiu concluir a sincronização. Tente conectar novamente.')
      setFase('erro')
    } else if (tentativa >= POLL_MAX_TENTATIVAS) {
      onConnected({ ...data, id: conexaoId, aindaSincronizando: true })
    } else {
      pollTimeoutRef.current = setTimeout(() => pollSincronizacao(conexaoId, tentativa + 1), POLL_INTERVAL_MS)
    }
  }

  const pollSincronizacao = (conexaoId, tentativa) => {
    api.post(`/open-finance/conexoes/${conexaoId}/sincronizar`)
      .then(({ data }) => tratarResultadoSincronizacao(conexaoId, data, tentativa))
      .catch(() => { setError('Erro ao verificar o status da sincronização.'); setFase('erro') })
  }

  const handleSuccess = async ({ item }) => {
    setFase('sincronizando')
    try {
      const { data } = await api.post('/open-finance/conexoes', { pluggyItemId: item.id })
      tratarResultadoSincronizacao(data.id, data, 0)
    } catch {
      setError('A conexão foi criada, mas houve um erro ao importar os dados. Você pode tentar sincronizar de novo na tela de Contas.')
      setFase('erro')
    }
  }

  const handleError = () => {
    setError('Não foi possível conectar ao banco. Tente novamente.')
    setFase('erro')
  }

  if (fase === 'carregando' || fase === 'sincronizando') {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)' }}>
            {fase === 'carregando' ? 'Conectando ao Pluggy...' : 'Sincronizando com o banco, isso pode levar até um minuto...'}
          </p>
        </div>
      </div>
    )
  }

  if (fase === 'erro') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Conectar banco</h3>
            <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
          </div>
          <Alert type="error">{error}</Alert>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PluggyConnect
      connectToken={connectToken}
      includeSandbox
      onSuccess={handleSuccess}
      onError={handleError}
      onClose={onClose}
    />
  )
}
