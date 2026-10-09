import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import DespesaGrupoModal from '../components/DespesaGrupoModal'
import PagamentoGrupoModal from '../components/PagamentoGrupoModal'
import DespesasGrupoDashboardModal from '../components/DespesasGrupoDashboardModal'
import GrupoModal from '../components/GrupoModal'
import PagamentoDashboardModal from '../components/PagamentoDashboardModal'
import VincularEventoModal from '../components/VincularEventoModal'
import SaldosGrupo from '../components/SaldosGrupo'
import ConfirmDialog from '../components/ConfirmDialog'
import Alert from '../components/Alert'
import Avatar from '../components/Avatar'
import { SkeletonList } from '../components/Skeleton'
import { fmt, fmtDate } from '../utils/format'
import { useToast } from '../context/ToastContext'
import EmptyIllustration from '../components/EmptyIllustration'
import { ArrowLeft, Check, HandCoins, Loader2, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react'

export default function GrupoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [grupo, setGrupo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const toast = useToast()

  const [showDespesaModal, setShowDespesaModal] = useState(false)
  const [editingDespesa, setEditingDespesa] = useState(null)
  const [deleteDespesaId, setDeleteDespesaId] = useState(null)

  const [pagamentoPrefill, setPagamentoPrefill] = useState(null)
  const [showPagamentoModal, setShowPagamentoModal] = useState(false)
  const [deletePagamentoId, setDeletePagamentoId] = useState(null)

  const [showDashboardModal, setShowDashboardModal] = useState(false)
  // Lista de moedas suportadas (código/símbolo/nome) pros seletores de moeda — se o
  // /cambio falhar, só R$ fica disponível, e tudo continua funcionando como antes.
  const [moedas, setMoedas] = useState([{ codigo: 'BRL', simbolo: 'R$', nome: 'Real' }])

  useEffect(() => {
    api.get('/cambio').then(res => setMoedas(res.data.moedas)).catch(() => {})
  }, [])

  const [showConvidadoForm, setShowConvidadoForm] = useState(false)
  const [nomeConvidado, setNomeConvidado] = useState('')
  const [convidadoError, setConvidadoError] = useState('')
  const [salvandoConvidado, setSalvandoConvidado] = useState(false)

  const [removendoMembro, setRemovendoMembro] = useState(null)
  const [confirmarSair, setConfirmarSair] = useState(false)
  const [confirmarExcluirGrupo, setConfirmarExcluirGrupo] = useState(false)
  const [showEditarGrupo, setShowEditarGrupo] = useState(false)
  const [pagamentoDashboard, setPagamentoDashboard] = useState(null)
  const [showVincularEvento, setShowVincularEvento] = useState(false)
  const [copiado, setCopiado] = useState(false)


  const fetchGrupo = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get(`/grupos/${id}`)
      setGrupo(data)
    } catch (err) {
      console.error('Erro ao buscar grupo:', err)
      // Grupo excluído em outra aba/dispositivo enquanto essa tela estava aberta, ou
      // usuário que não é mais membro — volta pra lista em vez de mostrar tela quebrada.
      if (err.response?.status === 404) {
        navigate('/grupos', { replace: true })
        return
      }
      setError('Não foi possível carregar os dados do grupo. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { fetchGrupo() }, [fetchGrupo])

  if (loading) {
    return <SkeletonList rows={5} />
  }

  if (!grupo) {
    return error ? <Alert type="error">{error}</Alert> : null
  }

  const meuMembro = grupo.membros.find(m => m.usuarioId === user?.id)
  const souAdmin = meuMembro?.papel === 'admin'
  const posoSair = grupo.membros.length > 1
  const membroPorId = Object.fromEntries(grupo.membros.map(m => [m.id, m]))

  // Só despesas em que o usuário tem parte no rateio (ter só pagado não conta como gasto dele).
  const minhasDespesas = grupo.despesas
    .map(d => ({ ...d, minhaParte: d.divisoes.find(x => x.membroId === meuMembro?.id)?.valorDevido ?? 0 }))
    .filter(d => d.minhaParte > 0)
  const despesasForaDoDashboard = minhasDespesas.filter(d => !d.noDashboard)
  // Datas do que já está no dashboard — período sugerido pra um evento criado no "vincular".
  const datasNoDashboard = [
    ...minhasDespesas.filter(d => d.noDashboard).map(d => d.data),
    ...grupo.pagamentos.filter(p => p.noDashboard).map(p => p.data),
  ]

  // Moeda sugerida pra próxima despesa/pagamento: a da despesa lançada por último — num
  // grupo de viagem pra Europa, escolher € uma vez já deixa as seguintes em €.
  const ultimaDespesa = grupo.despesas.reduce((ultima, d) => (!ultima || d.createdAt > ultima.createdAt ? d : ultima), null)
  const moedaPadrao = ultimaDespesa?.moeda || 'BRL'

  const handleCopiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(grupo.codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // clipboard pode falhar por permissão do navegador — sem problema, o código já está visível na tela
    }
  }

  const handleAdicionarConvidado = async (e) => {
    e.preventDefault()
    setConvidadoError('')
    setSalvandoConvidado(true)
    try {
      await api.post(`/grupos/${id}/convidados`, { nomeConvidado })
      setNomeConvidado('')
      setShowConvidadoForm(false)
      toast('Convidado adicionado.')
      fetchGrupo()
    } catch (err) {
      setConvidadoError(err.response?.data?.error || 'Não foi possível adicionar o convidado.')
    } finally {
      setSalvandoConvidado(false)
    }
  }

  const confirmarRemoverMembro = async () => {
    const membro = removendoMembro
    setRemovendoMembro(null)
    try {
      await api.delete(`/grupos/${id}/membros/${membro.id}`)
      toast(`${membro.nome} foi removido(a) do grupo.`)
      fetchGrupo()
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível remover esse membro.')
    }
  }

  const confirmarSairDoGrupo = async () => {
    setConfirmarSair(false)
    try {
      await api.post(`/grupos/${id}/sair`)
      navigate('/grupos')
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível sair do grupo.')
    }
  }

  const confirmarExcluirGrupoAgora = async () => {
    setConfirmarExcluirGrupo(false)
    try {
      await api.delete(`/grupos/${id}`)
      navigate('/grupos')
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível excluir o grupo.')
    }
  }

  const handleGrupoEditado = () => {
    setShowEditarGrupo(false)
    toast('Grupo atualizado.')
    fetchGrupo()
  }

  const handleEditDespesa = (despesa) => {
    setEditingDespesa(despesa)
    setShowDespesaModal(true)
  }

  const handleDespesaModalClose = () => {
    setShowDespesaModal(false)
    setEditingDespesa(null)
  }

  const handleDespesaSaved = () => {
    toast(editingDespesa ? 'Despesa atualizada com sucesso.' : 'Despesa adicionada com sucesso.')
    handleDespesaModalClose()
    fetchGrupo()
  }

  const confirmarExcluirDespesa = async () => {
    const despesaId = deleteDespesaId
    setDeleteDespesaId(null)
    try {
      await api.delete(`/grupos/${id}/despesas/${despesaId}`)
      toast('Despesa excluída.')
      fetchGrupo()
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível excluir a despesa.')
    }
  }

  const handleDashboardSaved = (count) => {
    setShowDashboardModal(false)
    toast(count === 1 ? '1 despesa adicionada ao dashboard.' : `${count} despesas adicionadas ao dashboard.`)
    fetchGrupo()
  }

  const handlePagamentoDashboardSaved = () => {
    setPagamentoDashboard(null)
    toast('Pagamento adicionado ao dashboard como receita.')
    fetchGrupo()
  }

  const handleVinculado = (count, eventoId) => {
    setShowVincularEvento(false)
    toast(count === 0
      ? (eventoId ? 'Tudo já estava nesse evento.' : 'Nenhuma transação estava em evento.')
      : eventoId
        ? `${count === 1 ? '1 transação vinculada' : `${count} transações vinculadas`} ao evento.`
        : `${count === 1 ? '1 transação tirada' : `${count} transações tiradas`} do evento.`)
    fetchGrupo()
  }

  const handleQuitarSaldo = (saldo) => {
    setPagamentoPrefill(saldo)
    setShowPagamentoModal(true)
  }

  const handlePagamentoModalClose = () => {
    setShowPagamentoModal(false)
    setPagamentoPrefill(null)
  }

  const handlePagamentoSaved = () => {
    toast('Pagamento registrado.')
    handlePagamentoModalClose()
    fetchGrupo()
  }

  const confirmarExcluirPagamento = async () => {
    const pagamentoId = deletePagamentoId
    setDeletePagamentoId(null)
    try {
      await api.delete(`/grupos/${id}/pagamentos/${pagamentoId}`)
      toast('Pagamento excluído.')
      fetchGrupo()
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível excluir o pagamento.')
    }
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <Link to="/grupos" className="btn-link"><ArrowLeft size={16} /> Voltar pra Grupos</Link>
          <div className="grupo-card-titulo" style={{ marginTop: 6 }}>
            <Avatar nome={grupo.nome} foto={grupo.foto} size="lg" />
            <h2>{grupo.nome}</h2>
          </div>
        </div>
        {souAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowEditarGrupo(true)}>
              Editar grupo
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmarExcluirGrupo(true)}>
              Excluir grupo
            </button>
          </div>
        )}
      </div>

      {error && (
        <Alert type="error" className="alert-with-action">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={fetchGrupo}>Tentar novamente</button>
        </Alert>
      )}

      <div className="transactions-section" style={{ marginBottom: 24 }}>
        <div className="familia-codigo-box">
          <div>
            <span className="familia-codigo-label">Código do grupo</span>
            <span className="familia-codigo-valor">{grupo.codigo}</span>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleCopiarCodigo}>
            {copiado ? 'Copiado!' : 'Copiar código'}
          </button>
        </div>
        <p className="form-hint">Compartilhe esse código com quem você quiser adicionar — a pessoa entra em "Grupos → Entrar em um grupo".</p>
      </div>

      <div className="transactions-section" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h3>Membros</h3>
          <button className="btn btn-outline btn-sm" onClick={() => setShowConvidadoForm(v => !v)}>
            <Plus size={16} /> Adicionar convidado
          </button>
        </div>

        {showConvidadoForm && (
          <form onSubmit={handleAdicionarConvidado} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {convidadoError && <Alert type="error">{convidadoError}</Alert>}
            <input
              type="text"
              value={nomeConvidado}
              onChange={e => setNomeConvidado(e.target.value)}
              placeholder="Nome do convidado"
              maxLength={60}
              required
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={salvandoConvidado}>
              {salvandoConvidado && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
              {salvandoConvidado ? 'Salvando...' : 'Adicionar'}
            </button>
          </form>
        )}

        <ul className="familia-membros-list">
          {grupo.membros.map(m => (
            <li key={m.id} className="familia-membro-item">
              <Avatar nome={m.nome} foto={m.foto} size="lg" />
              <div className="familia-membro-info">
                <span className="familia-membro-nome">
                  {m.nome}{m.usuarioId === user?.id ? ' (você)' : ''}{m.isConvidado ? ' (convidado)' : ''}
                </span>
                {m.email && <span className="familia-membro-email">{m.email}</span>}
              </div>
              <span className={`familia-papel-badge familia-papel-badge--${m.papel}`}>
                {m.papel === 'admin' ? 'Admin' : 'Membro'}
              </span>
              {souAdmin && m.id !== meuMembro?.id && (
                <button className="btn-icon btn-danger" title="Remover do grupo" aria-label="Remover do grupo" onClick={() => setRemovendoMembro(m)}><Trash2 size={16} /></button>
              )}
            </li>
          ))}
        </ul>
        {posoSair && (
          <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={() => setConfirmarSair(true)}>
            Sair do grupo
          </button>
        )}
      </div>

      <div className="transactions-section" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h3>Quem deve quem</h3>
        </div>
        <SaldosGrupo saldos={grupo.saldos} membros={grupo.membros} meuMembroId={meuMembro?.id} onQuitar={handleQuitarSaldo} />
      </div>

      <div className="transactions-section" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h3>Histórico de pagamentos</h3>
        </div>

        {grupo.pagamentos.length === 0 ? (
          <div className="empty-state">
            <EmptyIllustration icon={HandCoins} />
            <p>Nenhum pagamento registrado ainda.</p>
          </div>
        ) : (
          <ul className="grupo-despesas-list">
            {grupo.pagamentos.map(p => (
              <li key={p.id} className="grupo-despesa-item">
                <div className="grupo-despesa-info">
                  <span className="grupo-despesa-desc grupo-pessoas">
                    <Avatar nome={membroPorId[p.deMembroId]?.nome} foto={membroPorId[p.deMembroId]?.foto} size="xs" />
                    {membroPorId[p.deMembroId]?.nome ?? '—'} pagou
                    <Avatar nome={membroPorId[p.paraMembroId]?.nome} foto={membroPorId[p.paraMembroId]?.foto} size="xs" />
                    {membroPorId[p.paraMembroId]?.nome ?? '—'}
                  </span>
                  <span className="tx-meta">
                    {fmtDate(p.data)}
                    {p.moedaPagamento && ` · pago em ${fmt(p.valorPagamento, p.moedaPagamento)}`}
                  </span>
                </div>
                <div className="grupo-despesa-valor"><span className="money">{fmt(p.valor, p.moeda)}</span></div>
                {/* Receita no dashboard: só pra quem recebeu, e por escolha (nunca automático). */}
                {p.paraMembroId === meuMembro?.id && (p.noDashboard
                  ? <span className="tx-evento-chip"><Check size={12} /> No dashboard</span>
                  : (
                    <button className="btn btn-outline btn-sm" onClick={() => setPagamentoDashboard(p)} title="Adicionar como receita no dashboard">
                      <Plus size={16} /> Dashboard
                    </button>
                  ))}
                {(p.criadoPorUsuarioId === user?.id || souAdmin) && (
                  <div className="tx-actions">
                    <button className="btn-icon btn-danger" onClick={() => setDeletePagamentoId(p.id)} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="transactions-section">
        <div className="section-header">
          <h3>Despesas</h3>
          <div className="header-actions">
            {grupo.eventosNoDashboard?.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={() => setShowVincularEvento(true)}>
                Vincular ao evento
              </button>
            )}
            {minhasDespesas.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowDashboardModal(true)}
                disabled={despesasForaDoDashboard.length === 0}
                title={despesasForaDoDashboard.length === 0 ? 'Todas as suas despesas deste grupo já estão no dashboard' : undefined}
              >
                {despesasForaDoDashboard.length === 0
                  ? <><Check size={16} /> Tudo no dashboard</>
                  : `Adicionar despesas ao dashboard (${despesasForaDoDashboard.length})`}
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => setShowDespesaModal(true)}>
              <Plus size={16} /> Nova despesa
            </button>
          </div>
        </div>

        {grupo.despesas.length === 0 ? (
          <div className="empty-state">
            <EmptyIllustration icon={ReceiptText} />
            <p>Nenhuma despesa registrada ainda.</p>
          </div>
        ) : (
          <ul className="grupo-despesas-list">
            {grupo.despesas.map(d => (
              <li key={d.id} className="grupo-despesa-item">
                <div className="grupo-despesa-info">
                  <span className="grupo-despesa-desc">
                    {d.descricao}
                    {d.noDashboard && <span className="tx-evento-chip" style={{ marginLeft: 8 }}><Check size={12} /> No dashboard</span>}
                  </span>
                  <span className="tx-meta grupo-pessoas">
                    Pago por
                    <Avatar nome={membroPorId[d.pagoPorMembroId]?.nome} foto={membroPorId[d.pagoPorMembroId]?.foto} size="xs" />
                    {membroPorId[d.pagoPorMembroId]?.nome ?? '—'} · {fmtDate(d.data)}
                  </span>
                </div>
                <div className="grupo-despesa-valor"><span className="money">{fmt(d.valorTotal, d.moeda)}</span></div>
                {(d.criadoPorUsuarioId === user?.id || souAdmin) && (
                  <div className="tx-actions">
                    <button className="btn-icon" onClick={() => handleEditDespesa(d)} title="Editar" aria-label="Editar"><Pencil size={16} /></button>
                    <button className="btn-icon btn-danger" onClick={() => setDeleteDespesaId(d.id)} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showDespesaModal && (
        <DespesaGrupoModal
          grupoId={id}
          despesa={editingDespesa}
          membros={grupo.membros}
          moedas={moedas}
          moedaPadrao={moedaPadrao}
          defaultPagoPorMembroId={meuMembro?.id}
          onClose={handleDespesaModalClose}
          onSaved={handleDespesaSaved}
        />
      )}

      {showDashboardModal && (
        <DespesasGrupoDashboardModal
          grupoId={id}
          despesas={despesasForaDoDashboard}
          moedas={moedas}
          nomeGrupo={grupo.nome}
          eventoIdPadrao={grupo.eventoIdDashboard}
          onClose={() => setShowDashboardModal(false)}
          onSaved={handleDashboardSaved}
        />
      )}

      {pagamentoDashboard && (
        <PagamentoDashboardModal
          grupoId={id}
          pagamento={pagamentoDashboard}
          nomeQuemPagou={membroPorId[pagamentoDashboard.deMembroId]?.nome ?? 'Alguém'}
          nomeGrupo={grupo.nome}
          eventoIdPadrao={grupo.eventoIdDashboard}
          parteJaNoDashboard={minhasDespesas.some(d => d.noDashboard)}
          moedas={moedas}
          onClose={() => setPagamentoDashboard(null)}
          onSaved={handlePagamentoDashboardSaved}
        />
      )}

      {showVincularEvento && (
        <VincularEventoModal
          grupoId={id}
          nomeGrupo={grupo.nome}
          eventosNoDashboard={grupo.eventosNoDashboard}
          eventoIdPadrao={grupo.eventoIdDashboard}
          datas={datasNoDashboard}
          onClose={() => setShowVincularEvento(false)}
          onSaved={handleVinculado}
        />
      )}

      {showEditarGrupo && (
        <GrupoModal grupo={grupo} onClose={() => setShowEditarGrupo(false)} onSaved={handleGrupoEditado} />
      )}

      {removendoMembro && (
        <ConfirmDialog
          title="Remover membro"
          message={`Tem certeza que deseja remover ${removendoMembro.nome} do grupo?`}
          confirmLabel="Remover"
          onConfirm={confirmarRemoverMembro}
          onCancel={() => setRemovendoMembro(null)}
        />
      )}

      {confirmarSair && (
        <ConfirmDialog
          title="Sair do grupo"
          message="Tem certeza que deseja sair deste grupo?"
          confirmLabel="Sair"
          onConfirm={confirmarSairDoGrupo}
          onCancel={() => setConfirmarSair(false)}
        />
      )}

      {confirmarExcluirGrupo && (
        <ConfirmDialog
          title="Excluir grupo"
          message="Tem certeza que deseja excluir este grupo? Todos os membros, despesas e saldos são apagados. Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={confirmarExcluirGrupoAgora}
          onCancel={() => setConfirmarExcluirGrupo(false)}
        />
      )}

      {deleteDespesaId !== null && (
        <ConfirmDialog
          title="Excluir despesa"
          message="Tem certeza que deseja excluir esta despesa? Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={confirmarExcluirDespesa}
          onCancel={() => setDeleteDespesaId(null)}
        />
      )}

      {showPagamentoModal && (
        <PagamentoGrupoModal
          grupoId={id}
          membros={grupo.membros}
          moedas={moedas}
          moedaPadrao={moedaPadrao}
          prefill={pagamentoPrefill}
          onClose={handlePagamentoModalClose}
          onSaved={handlePagamentoSaved}
        />
      )}

      {deletePagamentoId !== null && (
        <ConfirmDialog
          title="Excluir pagamento"
          message="Tem certeza que deseja excluir este pagamento? O saldo entre os membros volta a considerar a dívida original. Essa ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={confirmarExcluirPagamento}
          onCancel={() => setDeletePagamentoId(null)}
        />
      )}

    </>
  )
}
