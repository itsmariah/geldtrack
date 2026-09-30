import { useState, useEffect } from 'react'
import api from '../services/api'
import { fmtDate } from '../utils/format'

const NOVO_EVENTO = 'novo'

// Estado do seletor de evento dos modais de Grupo (adicionar despesas, adicionar pagamento,
// vincular ao evento): carrega os eventos ativos, abre com eventoIdPadrao (o da última
// importação deste grupo) e permite criar um evento novo ali mesmo — com o nome sugerido
// (o do grupo) e o período das datas informadas.
export function useEventoSelecao({ eventoIdPadrao, nomeSugerido, datas }) {
  const [eventos, setEventos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [eventoId, setEventoId] = useState('')
  const [nomeNovo, setNomeNovo] = useState(nomeSugerido || '')
  // Evento criado numa tentativa anterior que falhou depois — reaproveitado no próximo
  // envio, pra não criar o mesmo evento duas vezes.
  const [criado, setCriado] = useState(null)

  useEffect(() => {
    api.get('/eventos')
      .then(({ data }) => {
        const ativos = data.filter(ev => ev.status === 'ativo')
        setEventos(ativos)
        if (ativos.some(ev => ev.id === eventoIdPadrao)) setEventoId(String(eventoIdPadrao))
      })
      .catch(() => {})
      .finally(() => setCarregando(false))
    // Só na abertura do modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ordenadas = [...datas].sort()
  const periodo = {
    // Sem nenhuma data (não deveria acontecer), o evento começa hoje.
    dataInicio: ordenadas[0] ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    dataFim: ordenadas.length > 1 && ordenadas.at(-1) !== ordenadas[0] ? ordenadas.at(-1) : null,
  }

  // Id final pra mandar pro backend: null (nenhum), o escolhido, ou o recém-criado.
  const resolverEventoId = async () => {
    if (eventoId === '') return null
    if (eventoId !== NOVO_EVENTO) return Number(eventoId)
    if (criado && criado.nome === nomeNovo.trim()) return criado.id
    const { data } = await api.post('/eventos', { nome: nomeNovo.trim(), ...periodo })
    setCriado(data)
    return data.id
  }

  return { eventos, carregando, eventoId, setEventoId, nomeNovo, setNomeNovo, periodo, resolverEventoId }
}

export default function EventoSelect({ id, selecao, label = 'Evento (opcional)', rotuloNenhum = 'Nenhum' }) {
  const { eventos, carregando, eventoId, setEventoId, nomeNovo, setNomeNovo, periodo } = selecao
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={eventoId} onChange={e => setEventoId(e.target.value)} disabled={carregando}>
        <option value="">{rotuloNenhum}</option>
        {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
        <option value={NOVO_EVENTO}>+ Criar novo evento</option>
      </select>
      {eventoId === NOVO_EVENTO && (
        <div style={{ marginTop: 8 }}>
          <label htmlFor={`${id}-nome`} style={{ fontWeight: 400 }}>Nome do evento</label>
          <input
            id={`${id}-nome`}
            type="text"
            value={nomeNovo}
            onChange={e => setNomeNovo(e.target.value)}
            placeholder="Ex: Viagem Rio 2026"
            required
          />
          <span className="form-hint">
            {periodo.dataFim
              ? `De ${fmtDate(periodo.dataInicio)} a ${fmtDate(periodo.dataFim)}, o período das transações.`
              : `Começando em ${fmtDate(periodo.dataInicio)}.`}
            {' '}Dá pra ajustar datas e orçamento depois em Eventos.
          </span>
        </div>
      )}
    </div>
  )
}
