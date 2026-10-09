import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'
import Alert from './Alert'
import PasswordMatchHint from './PasswordMatchHint'
import PasswordInput from './PasswordInput'
import FotoPicker from './FotoPicker'
import { Loader2, X } from 'lucide-react'

export default function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({ nome: user?.nome || '', email: user?.email || '', senha: '', confirmar: '' })
  const [foto, setFoto] = useState(user?.foto ?? null)
  const [resumos, setResumos] = useState({ resumoSemanal: Boolean(user?.resumoSemanal), resumoMensal: Boolean(user?.resumoMensal) })
  const [fotoChanged, setFotoChanged] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFotoChange = (novaFoto) => {
    setFoto(novaFoto)
    setFotoChanged(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.senha && form.senha !== form.confirmar) {
      return setError('As senhas não coincidem')
    }

    const payload = {}
    if (form.nome !== user.nome) payload.nome = form.nome
    if (form.email !== user.email) payload.email = form.email
    if (form.senha) payload.senha = form.senha
    if (fotoChanged) payload.foto = foto
    if (resumos.resumoSemanal !== Boolean(user.resumoSemanal)) payload.resumoSemanal = resumos.resumoSemanal
    if (resumos.resumoMensal !== Boolean(user.resumoMensal)) payload.resumoMensal = resumos.resumoMensal

    if (Object.keys(payload).length === 0) {
      return setSuccess('Nenhuma alteração detectada.')
    }

    setLoading(true)
    try {
      await updateProfile(payload)
      setSuccess('Perfil atualizado com sucesso!')
      setForm(f => ({ ...f, senha: '', confirmar: '' }))
      setFotoChanged(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>Editar Perfil</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <FotoPicker foto={foto} nome={user?.nome} alt="Foto de perfil" onChange={handleFotoChange} onError={setError} />
          <div className="form-group">
            <label htmlFor="profile-nome">Nome</label>
            <input
              id="profile-nome"
              type="text"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-email">E-mail</label>
            <input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="profile-senha">Nova senha (deixe vazio para manter)</label>
            <PasswordInput
              id="profile-senha"
              value={form.senha}
              onChange={e => setForm({ ...form, senha: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              minLength={form.senha ? 6 : 0}
            />
          </div>
          {form.senha && (
            <div className="form-group">
              <label htmlFor="profile-confirmar">Confirmar nova senha</label>
              <PasswordInput
                id="profile-confirmar"
                value={form.confirmar}
                onChange={e => setForm({ ...form, confirmar: e.target.value })}
                aria-describedby={form.confirmar ? 'profile-confirmar-hint' : undefined}
                required
              />
              <PasswordMatchHint id="profile-confirmar-hint" senha={form.senha} confirmar={form.confirmar} />
            </div>
          )}
          <fieldset className="form-group" style={{ border: 'none', padding: 0 }}>
            <legend className="form-legend">Resumo por e-mail</legend>
            <label className="checkbox-row" style={{ marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={resumos.resumoSemanal}
                onChange={e => setResumos(r => ({ ...r, resumoSemanal: e.target.checked }))}
              />
              Semanal, toda segunda-feira
            </label>
            <label className="checkbox-row" style={{ marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={resumos.resumoMensal}
                onChange={e => setResumos(r => ({ ...r, resumoMensal: e.target.checked }))}
              />
              Mensal, no dia 1
            </label>
            <span className="form-hint">Receitas, despesas e onde você mais gastou no período. O primeiro chega no fim da próxima semana ou mês.</span>
          </fieldset>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
    </Modal>
  )
}
