import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from './Modal'
import Alert from './Alert'
import PasswordInput from './PasswordInput'
import { Loader2, X } from 'lucide-react'

// Exclusão definitiva da conta (exigida pela App Store e pela Play Store). As regras do que
// acontece com família, grupos e conexões estão em backend/utils/excluirConta.js — o texto
// abaixo precisa acompanhar se elas mudarem.
export default function ExcluirContaModal({ onClose }) {
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.delete('/auth/conta', { data: { senha } })
      logout()
      toast('Sua conta foi excluída.')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível excluir a conta. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>Excluir minha conta</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <ul className="excluir-conta-lista">
        <li>Seu nome, e-mail, foto e senha são apagados, e você não consegue mais entrar.</li>
        <li>Se a sua família é só sua, todos os lançamentos, contas, metas e orçamentos são apagados.</li>
        <li>Se você divide a família com outras pessoas, o que você lançou continua lá para elas, no nome do dono da família.</li>
        <li>Nos grupos, suas despesas e pagamentos continuam no histórico, só com o seu nome.</li>
        <li>Suas conexões com bancos são desfeitas.</li>
      </ul>
      <p className="excluir-conta-aviso">Essa ação não pode ser desfeita.</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="excluir-conta-senha">Digite sua senha para confirmar</label>
          <PasswordInput
            id="excluir-conta-senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-danger" disabled={loading || !senha}>
            {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
            {loading ? 'Excluindo...' : 'Excluir conta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
