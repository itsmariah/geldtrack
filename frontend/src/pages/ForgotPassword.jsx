import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Alert from '../components/Alert'
import { Loader2 } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setMessage(data.message)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao solicitar redefinição. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1>💰 GeldTrack</h1>
      <h2>Esqueceu a senha?</h2>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      {!message && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="forgot-email">E-mail</label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
            {loading ? 'Enviando...' : 'Enviar link de redefinição'}
          </button>
        </form>
      )}

      <p className="auth-link">
        Lembrou a senha? <Link to="/login">Entrar</Link>
      </p>
    </AuthLayout>
  )
}
