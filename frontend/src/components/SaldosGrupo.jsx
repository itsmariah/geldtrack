import { fmt } from '../utils/format'
import Avatar from './Avatar'

// saldos já vem bruto (sem simplificação) do backend — cada par que se deve algo é uma
// aresta própria. Colore em relação ao membro logado: verde quando é a favor dele
// (alguém deve a ele), vermelho quando é contra (ele deve a alguém), neutro pro resto.
export default function SaldosGrupo({ saldos, membros, meuMembroId, onQuitar }) {
  const membroPorId = Object.fromEntries(membros.map(m => [m.id, m]))

  if (saldos.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>Nenhuma dívida pendente entre os membros.</p>
  }

  return (
    <ul className="grupo-saldos-list">
      {saldos.map((s, i) => {
        const classe = s.paraMembroId === meuMembroId ? 'positive' : s.deMembroId === meuMembroId ? 'negative' : ''
        return (
          <li key={i} className="grupo-saldo-item">
            <span className="grupo-pessoas">
              <Avatar nome={membroPorId[s.deMembroId]?.nome} foto={membroPorId[s.deMembroId]?.foto} size="xs" />
              {membroPorId[s.deMembroId]?.nome ?? '—'} deve <strong className={classe}>{fmt(s.valor)}</strong> a
              <Avatar nome={membroPorId[s.paraMembroId]?.nome} foto={membroPorId[s.paraMembroId]?.foto} size="xs" />
              {membroPorId[s.paraMembroId]?.nome ?? '—'}
            </span>
            {onQuitar && (
              <button className="btn btn-outline btn-sm" onClick={() => onQuitar(s)}>Quitar</button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
