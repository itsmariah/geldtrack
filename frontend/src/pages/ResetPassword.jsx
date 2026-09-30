import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import Alert from '../components/Alert'
import PasswordMatchHint from '../components/PasswordMatchHint'
import PasswordInput from '../components/PasswordInput'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [form, setForm] = useState({ senha: '', confirmar: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.senha !== form.confirmar) {
      return setError('As senhas não coincidem')
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, senha: form.senha })
      navigate('/login', { state: { resetSuccess: true } })
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao redefinir a senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="back-link">← Voltar para o início</Link>
      <div className="auth-card">
        <h1>💰 GeldTrack</h1>
        <h2>Criar nova senha</h2>

        {!token ? (
          <>
            <Alert type="error">Link de redefinição inválido.</Alert>
            <p className="auth-link">
              <Link to="/esqueci-senha">Solicitar um novo link</Link>
            </p>
          </>
        ) : (
          <>
            {error && <Alert type="error">{error}</Alert>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="reset-senha">Nova senha</label>
                <PasswordInput
                  id="reset-senha"
                  value={form.senha}
                  onChange={e => setForm({ ...form, senha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="reset-confirmar">Confirmar nova senha</label>
                <PasswordInput
                  id="reset-confirmar"
                  value={form.confirmar}
                  onChange={e => setForm({ ...form, confirmar: e.target.value })}
                  placeholder="Repita a senha"
                  aria-describedby={form.confirmar ? 'reset-confirmar-hint' : undefined}
                  required
                />
                <PasswordMatchHint id="reset-confirmar-hint" senha={form.senha} confirmar={form.confirmar} />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
