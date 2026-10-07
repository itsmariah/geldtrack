import { fmtDate } from '../utils/format'
import { Loader2, Trash2 } from 'lucide-react'

const STATUS_INFO = {
  UPDATED: { label: 'Conectado', tom: 'ativa' },
  UPDATING: { label: 'Sincronizando...', tom: 'pausada' },
  LOGIN_ERROR: { label: 'Erro de login', tom: 'erro' },
  OUTDATED: { label: 'Erro na sincronização', tom: 'erro' },
}

export default function ConexaoBancariaCard({ conexao, onSincronizar, onDelete, sincronizando }) {
  const info = STATUS_INFO[conexao.status] || { label: conexao.status, tom: 'pausada' }

  return (
    <div className="recurring-card">
      <div className="meta-card-header">
        <h3>🏦 {conexao.nomeConector}</h3>
        <div className="tx-actions">
          <button className="btn-icon btn-danger" onClick={() => onDelete(conexao)} title="Remover conexão" aria-label="Remover conexão"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="meta-card-status">
        {conexao.contas.length > 0
          ? `Alimenta: ${conexao.contas.map(c => c.nome).join(', ')}`
          : 'Nenhuma conta vinculada ainda'}
        {conexao.ultimaSincronizacao && <> · última sincronização {fmtDate(conexao.ultimaSincronizacao.slice(0, 10))}</>}
      </div>

      {conexao.erro && <div className="meta-card-status" style={{ color: 'var(--red)' }}>{conexao.erro}</div>}

      <div className="meta-card-actions">
        <span className={`recurring-badge recurring-badge--${info.tom}`}>{info.label}</span>
        <button type="button" className="btn-link" onClick={() => onSincronizar(conexao.id)} disabled={sincronizando}>
          {sincronizando && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
          {sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
        </button>
      </div>
    </div>
  )
}
