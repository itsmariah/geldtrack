import { ArrowLeft } from 'lucide-react'

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Alert from '../components/Alert'
import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const [form, setForm] = useState({ email: '', senha: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.senha)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="back-link"><ArrowLeft size={16} /> Voltar para o início</Link>
      <div className="auth-card">
        <h1>💰 GeldTrack</h1>
        <h2>Entrar na sua conta</h2>

        {location.state?.resetSuccess && (
          <Alert type="success">Senha redefinida com sucesso. Faça login com a nova senha.</Alert>
        )}
        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-senha">Senha</label>
            <PasswordInput
              id="login-senha"
              value={form.senha}
              onChange={e => setForm({ ...form, senha: e.target.value })}
              placeholder="••••••••"
              required
            />
            <Link to="/esqueci-senha" className="forgot-link">Esqueceu a senha?</Link>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="auth-link">
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}
