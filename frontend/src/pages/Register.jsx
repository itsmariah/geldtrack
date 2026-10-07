import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Alert from '../components/Alert'
import PasswordMatchHint from '../components/PasswordMatchHint'
import PasswordInput from '../components/PasswordInput'
import { Loader2 } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import PasswordStrength from '../components/PasswordStrength'
import { FLAG_BOAS_VINDAS } from '../components/WelcomeTour'

export default function Register() {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.senha !== form.confirmar) {
      return setError('As senhas não coincidem')
    }
    setLoading(true)
    try {
      await register(form.nome, form.email, form.senha)
      // Primeiro acesso: o Dashboard abre o tour de boas-vindas (components/WelcomeTour.jsx).
      try { localStorage.setItem(FLAG_BOAS_VINDAS, '1') } catch { /* sem storage, sem tour */ }
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1>💰 GeldTrack</h1>
      <h2>Criar conta grátis</h2>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="register-nome">Nome completo</label>
          <input
            id="register-nome"
            type="text"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Seu nome"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="register-email">E-mail</label>
          <input
            id="register-email"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="seu@email.com"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="register-senha">Senha</label>
          <PasswordInput
            id="register-senha"
            aria-describedby={form.senha ? 'register-senha-forca' : undefined}
            value={form.senha}
            onChange={e => setForm({ ...form, senha: e.target.value })}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
          <PasswordStrength id="register-senha-forca" senha={form.senha} nome={form.nome} email={form.email} />
        </div>
        <div className="form-group">
          <label htmlFor="register-confirmar">Confirmar senha</label>
          <PasswordInput
            id="register-confirmar"
            value={form.confirmar}
            onChange={e => setForm({ ...form, confirmar: e.target.value })}
            placeholder="Repita a senha"
            aria-describedby={form.confirmar ? 'register-confirmar-hint' : undefined}
            required
          />
          <PasswordMatchHint id="register-confirmar-hint" senha={form.senha} confirmar={form.confirmar} />
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p className="auth-link">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthLayout>
  )
}
