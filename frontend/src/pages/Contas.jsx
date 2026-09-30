import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import Navbar from '../components/Navbar'
import ContaModal from '../components/ContaModal'
import ContaCard from '../components/ContaCard'
import TransferModal from '../components/TransferModal'
import ConectarBancoModal from '../components/ConectarBancoModal'
import ConexaoBancariaCard from '../components/ConexaoBancariaCard'
import ConfirmDialog from '../components/ConfirmDialog'
import CotacoesPanel from '../components/CotacoesPanel'
import Alert from '../components/Alert'
import { SkeletonList } from '../components/Skeleton'
import { fmt, fmtDate } from '../utils/format'
import { agruparContasPorInstituicao, totalDoGrupo, instituicoesUsadas } from '../utils/agruparContas'

export default function Contas() {
  const [contas, setContas] = useState([])
  const [taxas, setTaxas] = useState({ BRL: 1 })
  const [transferencias, setTransferencias] = useState([])
  const [conexoes, setConexoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [showContaModal, setShowContaModal] = useState(false)
  const [editingConta, setEditingConta] = useState(null)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showConectarBanco, setShowConectarBanco] = useState(false)
  const [sincronizandoId, setSincronizandoId] = useState(null)
  const [deleteConta, setDeleteConta] = useState(null)
  const [deleteTransferId, setDeleteTransferId] = useState(null)
  const [deleteConexao, setDeleteConexao] = useState(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const fetchData = useCallback(async () => {
    setError('')
    try {
      const [contasRes, transfRes, conexoesRes, cambioRes] = await Promise.all([
        api.get('/contas'),
        api.get('/transferencias'),
        api.get('/open-finance/conexoes'),
        // Só pro total aproximado de grupos com moedas diferentes — falhar aqui não
        // impede a tela de abrir (cai no 1:1, e o total já é marcado como aproximado).
        api.get('/cambio').catch(() => null),
      ])
      setContas(contasRes.data)
      if (cambioRes) setTaxas(cambioRes.data.taxas)
      setTransferencias(transfRes.data)
      setConexoes(conexoesRes.data)
    } catch (err) {
      console.error('Erro ao buscar contas:', err)
      setError('Não foi possível carregar suas contas. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleEdit = (conta) => {
    setEditingConta(conta)
    setShowContaModal(true)
  }

  const handleContaModalClose = () => {
    setShowContaModal(false)
    setEditingConta(null)
  }

  const handleContaSaved = () => {
    setToast(editingConta ? 'Conta atualizada com sucesso.' : 'Conta criada com sucesso.')
    handleContaModalClose()
    fetchData()
  }

  const confirmDeleteConta = async () => {
    const conta = deleteConta
    setDeleteConta(null)
    try {
      await api.delete(`/contas/${conta.id}`)
      setToast('Conta excluída.')
      fetchData()
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível excluir a conta. Tente novamente.')
    }
  }

  const handleTransferSaved = () => {
    setToast('Transferência realizada com sucesso.')
    setShowTransferModal(false)
    fetchData()
  }

  const confirmDeleteTransfer = async () => {
    const id = deleteTransferId
    setDeleteTransferId(null)
    try {
      await api.delete(`/transferencias/${id}`)
      setToast('Transferência desfeita.')
      fetchData()
    } catch (err) {
      console.error(err)
      setError('Não foi possível desfazer a transferência. Tente novamente.')
    }
  }

  const handleBancoConectado = (resultado) => {
    setShowConectarBanco(false)
    if (resultado.aindaSincronizando) {
      setToast('Banco conectado — a sincronização está demorando mais que o normal, confira em instantes.')
    } else {
      setToast(`Banco conectado! ${resultado.transacoesImportadas} transação(ões) importada(s).`)
    }
    fetchData()
  }

  const handleSincronizar = async (conexaoId) => {
    setSincronizandoId(conexaoId)
    try {
      const { data } = await api.post(`/open-finance/conexoes/${conexaoId}/sincronizar`)
      if (data.status === 'UPDATED') {
        setToast(`Sincronizado! ${data.transacoesImportadas} transação(ões) nova(s).`)
      } else if (data.status === 'LOGIN_ERROR' || data.status === 'OUTDATED') {
        setToast('A sincronização falhou — pode ser necessário reconectar o banco.')
      } else {
        setToast('O banco ainda está processando. Tente de novo em alguns instantes.')
      }
      fetchData()
    } catch (err) {
      console.error(err)
      setError('Não foi possível sincronizar. Tente novamente.')
    } finally {
      setSincronizandoId(null)
    }
  }

  const confirmDeleteConexao = async () => {
    const conexao = deleteConexao
    setDeleteConexao(null)
    try {
      await api.delete(`/open-finance/conexoes/${conexao.id}`)
      setToast('Conexão removida.')
      fetchData()
    } catch (err) {
      console.error(err)
      setError('Não foi possível remover a conexão. Tente novamente.')
    }
  }

  // Sem nenhuma conta com instituição, a tela fica exatamente como sempre foi (grade única).
  const { grupos, semInstituicao } = agruparContasPorInstituicao(contas)
  const renderGridContas = (lista) => (
    <div className="goals-grid">
      {lista.map(conta => (
        <ContaCard
          key={conta.id}
          conta={conta}
          onEdit={handleEdit}
          onDelete={setDeleteConta}
        />
      ))}
    </div>
  )

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="dashboard-header">
          <h2>Contas</h2>
          <div className="header-actions">
            {contas.length > 1 && (
              <button className="btn btn-outline" onClick={() => setShowTransferModal(true)}>
                ⇄ Transferir
              </button>
            )}
            <button className="btn btn-outline" onClick={() => setShowConectarBanco(true)}>
              🏦 Conectar banco
            </button>
            <button className="btn btn-primary" onClick={() => setShowContaModal(true)}>
              + Nova conta
            </button>
          </div>
        </div>

        {error && (
          <Alert type="error" className="alert-with-action">
            <span>{error}</span>
            <button className="btn btn-sm btn-outline" onClick={fetchData}>Tentar novamente</button>
          </Alert>
        )}

        {loading ? (
          <SkeletonList rows={3} />
        ) : (
          <>
            {grupos.length === 0 ? (
              renderGridContas(contas)
            ) : (
              <>
                {grupos.map(grupo => {
                  const total = totalDoGrupo(grupo.contas, taxas)
                  return (
                    <section key={grupo.nome} className="contas-grupo">
                      <div className="contas-grupo-header">
                        <h3>🏦 {grupo.nome}</h3>
                        {grupo.contas.length > 1 && (
                          <span className="contas-grupo-total" title={total.aproximado ? 'Convertido para R$ pela cotação salva' : undefined}>
                            Total {total.aproximado ? '≈ ' : ''}{fmt(total.valor, total.moeda)}
                          </span>
                        )}
                      </div>
                      {renderGridContas(grupo.contas)}
                    </section>
                  )
                })}
                {semInstituicao.length > 0 && (
                  <section className="contas-grupo">
                    <div className="contas-grupo-header">
                      <h3>Outras contas</h3>
                    </div>
                    {renderGridContas(semInstituicao)}
                  </section>
                )}
              </>
            )}

            <CotacoesPanel contas={contas} />

            {conexoes.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ marginBottom: 12 }}>Conexões bancárias</h3>
                <div className="goals-grid">
                  {conexoes.map(conexao => (
                    <ConexaoBancariaCard
                      key={conexao.id}
                      conexao={conexao}
                      onSincronizar={handleSincronizar}
                      onDelete={setDeleteConexao}
                      sincronizando={sincronizandoId === conexao.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {transferencias.length > 0 && (
              <div className="transactions-section" style={{ marginTop: 24 }}>
                <div className="section-header">
                  <h3>Transferências</h3>
                </div>
                <ul className="transaction-list">
                  {transferencias.map(t => (
                    <li key={t.id} className="transaction-item">
                      <div className="tx-icon">⇄</div>
                      <div className="tx-info">
                        <span className="tx-desc">{t.contaOrigemNome} → {t.contaDestinoNome}{t.descricao ? ` · ${t.descricao}` : ''}</span>
                        <span className="tx-meta">{fmtDate(t.data)}</span>
                      </div>
                      <div className="tx-amount">
                        {t.moedaDestino && t.moedaDestino !== t.moeda
                          ? `${fmt(t.valor, t.moeda)} → ${fmt(t.valorDestino, t.moedaDestino)}`
                          : fmt(t.valor, t.moeda)}
                      </div>
                      <div className="tx-actions">
                        <button className="btn-icon btn-danger" onClick={() => setDeleteTransferId(t.id)} title="Desfazer">🗑️</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>

      {showContaModal && (
        <ContaModal
          conta={editingConta}
          instituicoes={instituicoesUsadas(contas)}
          onClose={handleContaModalClose}
          onSaved={handleContaSaved}
        />
      )}

      {showTransferModal && (
        <TransferModal
          contas={contas}
          onClose={() => setShowTransferModal(false)}
          onSaved={handleTransferSaved}
        />
      )}

      {showConectarBanco && (
        <ConectarBancoModal
          onClose={() => setShowConectarBanco(false)}
          onConnected={handleBancoConectado}
        />
      )}

      {deleteConta && (
        <ConfirmDialog
          title="Excluir conta"
          message={`Tem certeza que deseja excluir "${deleteConta.nome}"? Todas as transações e transferências dessa conta também serão apagadas. Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={confirmDeleteConta}
          onCancel={() => setDeleteConta(null)}
        />
      )}

      {deleteTransferId !== null && (
        <ConfirmDialog
          title="Desfazer transferência"
          message="Tem certeza que deseja desfazer esta transferência? O valor volta a ser considerado só na conta de origem. Essa ação não pode ser desfeita."
          confirmLabel="Desfazer"
          onConfirm={confirmDeleteTransfer}
          onCancel={() => setDeleteTransferId(null)}
        />
      )}

      {deleteConexao && (
        <ConfirmDialog
          title="Remover conexão bancária"
          message={`Tem certeza que deseja remover a conexão com "${deleteConexao.nomeConector}"? As contas e transações já importadas continuam no seu histórico, mas nenhuma nova sincronização vai acontecer.`}
          confirmLabel="Remover"
          onConfirm={confirmDeleteConexao}
          onCancel={() => setDeleteConexao(null)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
