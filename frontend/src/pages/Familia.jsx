import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import Navbar from '../components/Navbar'
import ConfirmDialog from '../components/ConfirmDialog'
import Alert from '../components/Alert'
import Avatar from '../components/Avatar'
import { SkeletonList } from '../components/Skeleton'
import { Trash2 } from 'lucide-react'

export default function Familia() {
  const { user, refreshUser } = useAuth()
  const [familia, setFamilia] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [editandoNome, setEditandoNome] = useState(false)
  const [nomeInput, setNomeInput] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)

  const [regenerando, setRegenerando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const [codigoInput, setCodigoInput] = useState('')
  const [entrarError, setEntrarError] = useState('')
  const [codigoConfirmar, setCodigoConfirmar] = useState(null)
  const [entrando, setEntrando] = useState(false)

  const [confirmarSair, setConfirmarSair] = useState(false)
  const [saindo, setSaindo] = useState(false)

  const [removendoMembro, setRemovendoMembro] = useState(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const fetchFamilia = async () => {
    setError('')
    try {
      const { data } = await api.get('/familia')
      setFamilia(data)
      setNomeInput(data.nome)
    } catch (err) {
      console.error(err)
      setError('Não foi possível carregar os dados da família. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFamilia() }, [])

  const meuPapel = familia?.membros.find(m => m.id === user?.id)?.papel
  const souDono = meuPapel === 'dono'
  const posoSair = (familia?.membros.length || 0) > 1

  const handleSalvarNome = async (e) => {
    e.preventDefault()
    setSalvandoNome(true)
    try {
      const { data } = await api.put('/familia', { nome: nomeInput })
      setFamilia(data)
      setEditandoNome(false)
      setToast('Nome da família atualizado.')
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível renomear a família.')
    } finally {
      setSalvandoNome(false)
    }
  }

  const handleRegenerarCodigo = async () => {
    setRegenerando(true)
    try {
      const { data } = await api.post('/familia/regenerar-codigo')
      setFamilia(f => ({ ...f, codigo: data.codigo }))
      setToast('Novo código gerado. O código anterior não funciona mais.')
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível gerar um novo código.')
    } finally {
      setRegenerando(false)
    }
  }

  const handleCopiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(familia.codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // clipboard pode falhar por permissão do navegador — sem problema, o código já está visível na tela
    }
  }

  const handleSubmitEntrar = (e) => {
    e.preventDefault()
    setEntrarError('')
    if (!codigoInput.trim()) {
      setEntrarError('Digite um código de família')
      return
    }
    setCodigoConfirmar(codigoInput.trim())
  }

  const confirmarEntrar = async () => {
    setEntrando(true)
    try {
      const { data } = await api.post('/familia/entrar', { codigo: codigoConfirmar })
      setFamilia(data)
      await refreshUser()
      setCodigoInput('')
      setCodigoConfirmar(null)
      setToast('Você entrou na família com sucesso.')
    } catch (err) {
      setCodigoConfirmar(null)
      setEntrarError(err.response?.data?.error || 'Não foi possível entrar nessa família.')
    } finally {
      setEntrando(false)
    }
  }

  const confirmarSairDaFamilia = async () => {
    setSaindo(true)
    try {
      await api.post('/familia/sair')
      await refreshUser()
      await fetchFamilia()
      setConfirmarSair(false)
      setToast('Você saiu da família e recebeu uma família pessoal nova.')
    } catch (err) {
      setConfirmarSair(false)
      setError(err.response?.data?.error || 'Não foi possível sair da família.')
    } finally {
      setSaindo(false)
    }
  }

  const confirmarRemoverMembro = async () => {
    const membro = removendoMembro
    setRemovendoMembro(null)
    try {
      await api.delete(`/familia/membros/${membro.id}`)
      await fetchFamilia()
      setToast(`${membro.nome} foi removido(a) da família.`)
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível remover esse membro.')
    }
  }

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="dashboard-header">
          <h2>Família</h2>
        </div>

        {error && (
          <Alert type="error" className="alert-with-action">
            <span>{error}</span>
            <button className="btn btn-sm btn-outline" onClick={fetchFamilia}>Tentar novamente</button>
          </Alert>
        )}

        {loading ? (
          <SkeletonList rows={3} />
        ) : familia && (
          <>
            <div className="transactions-section" style={{ marginBottom: 24 }}>
              <div className="section-header">
                <h3>{familia.nome}</h3>
                {souDono && !editandoNome && (
                  <button className="btn btn-outline btn-sm" onClick={() => setEditandoNome(true)}>Renomear</button>
                )}
              </div>

              {editandoNome ? (
                <form onSubmit={handleSalvarNome} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <input
                    type="text"
                    value={nomeInput}
                    onChange={e => setNomeInput(e.target.value)}
                    maxLength={60}
                    required
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={salvandoNome}>
                    {salvandoNome ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => { setEditandoNome(false); setNomeInput(familia.nome) }}>
                    Cancelar
                  </button>
                </form>
              ) : null}

              <div className="familia-codigo-box">
                <div>
                  <span className="familia-codigo-label">Código da família</span>
                  <span className="familia-codigo-valor">{familia.codigo}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-sm" onClick={handleCopiarCodigo}>
                    {copiado ? 'Copiado!' : 'Copiar código'}
                  </button>
                  {souDono && (
                    <button className="btn btn-outline btn-sm" onClick={handleRegenerarCodigo} disabled={regenerando}>
                      {regenerando ? 'Gerando...' : 'Gerar novo código'}
                    </button>
                  )}
                </div>
              </div>
              <p className="form-hint">Compartilhe esse código com quem você quiser convidar — a pessoa entra digitando ele na seção "Entrar em outra família", mais abaixo.</p>
            </div>

            <div className="transactions-section" style={{ marginBottom: 24 }}>
              <div className="section-header">
                <h3>Membros</h3>
              </div>
              <ul className="familia-membros-list">
                {familia.membros.map(m => (
                  <li key={m.id} className="familia-membro-item">
                    <Avatar nome={m.nome} foto={m.foto} size="lg" />
                    <div className="familia-membro-info">
                      <span className="familia-membro-nome">{m.nome}{m.id === user?.id ? ' (você)' : ''}</span>
                      <span className="familia-membro-email">{m.email}</span>
                    </div>
                    <span className={`familia-papel-badge familia-papel-badge--${m.papel}`}>
                      {m.papel === 'dono' ? 'Dono' : 'Membro'}
                    </span>
                    {souDono && m.id !== user?.id && (
                      <button className="btn-icon btn-danger" title="Remover da família" aria-label="Remover da família" onClick={() => setRemovendoMembro(m)}><Trash2 size={16} /></button>
                    )}
                  </li>
                ))}
              </ul>
              {posoSair && (
                <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => setConfirmarSair(true)}>
                  Sair da família
                </button>
              )}
            </div>

            <div className="transactions-section">
              <div className="section-header">
                <h3>Entrar em outra família</h3>
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
                <button type="submit" className="btn btn-primary btn-sm">Entrar</button>
              </form>
              <p className="form-hint">Ao entrar em outra família, você deixa de ver os dados da sua família atual (transações, contas, orçamentos e mais). Essa ação não pode ser desfeita.</p>
            </div>
          </>
        )}
      </main>

      {codigoConfirmar && (
        <ConfirmDialog
          title="Entrar em outra família"
          message={`Você vai trocar sua família ativa pelo código "${codigoConfirmar}". Os dados da sua família atual deixam de aparecer pra você (não são apagados, só ficam inacessíveis). Essa ação não pode ser desfeita. Deseja continuar?`}
          confirmLabel={entrando ? 'Entrando...' : 'Entrar mesmo assim'}
          onConfirm={confirmarEntrar}
          onCancel={() => setCodigoConfirmar(null)}
        />
      )}

      {confirmarSair && (
        <ConfirmDialog
          title="Sair da família"
          message="Você vai deixar essa família e receber uma família pessoal nova e vazia. Os dados da família atual deixam de aparecer pra você. Essa ação não pode ser desfeita. Deseja continuar?"
          confirmLabel={saindo ? 'Saindo...' : 'Sair da família'}
          onConfirm={confirmarSairDaFamilia}
          onCancel={() => setConfirmarSair(false)}
        />
      )}

      {removendoMembro && (
        <ConfirmDialog
          title="Remover membro"
          message={`Tem certeza que deseja remover ${removendoMembro.nome} da família? A pessoa recebe uma família pessoal nova e deixa de ver os dados desta família.`}
          confirmLabel="Remover"
          onConfirm={confirmarRemoverMembro}
          onCancel={() => setRemovendoMembro(null)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
