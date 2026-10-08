import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { CalendarDays, ChartColumn, Crown, Flame, Loader2, PiggyBank, Receipt, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react'
import api from '../services/api'
import { fmt } from '../utils/format'
import { haptic } from '../utils/haptics'
import { celebrate } from '../utils/celebrate'
import { calcularRetrospectiva, gastosPorDia, nomeDoMes } from '../utils/retrospectiva'
import AnimatedMoney from './AnimatedMoney'

const DURACAO = 5500 // ms por story

const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const dataLonga = (d) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

// Uma "tela" de story: ícone, título e conteúdo entrando em sequência.
function Story({ icon: Icon, kicker, children }) {
  return (
    <div className="recap-story">
      {Icon && (
        <m.span className="recap-icon" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}>
          <Icon size={30} />
        </m.span>
      )}
      {kicker && <m.p className="recap-kicker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>{kicker}</m.p>}
      <m.div className="recap-body" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </m.div>
    </div>
  )
}

function montarStories(r, porDia, navigate, fechar) {
  const mesNome = nomeDoMes(r.mes)
  const mesAnteriorNome = nomeDoMes(r.comparacao.mesAnterior)

  if (r.qtdTransacoes === 0) {
    return [{ key: 'vazio', tema: 'roxo', node: (
      <Story icon={CalendarDays} kicker={`Retrospectiva de ${mesNome}`}>
        <h2>Nada registrado em {mesNome}.</h2>
        <p>Lance suas receitas e despesas pra ganhar uma retrospectiva no mês que vem.</p>
      </Story>
    ) }]
  }

  const stories = [
    { key: 'intro', tema: 'roxo', node: (
      <Story icon={Sparkles} kicker="Sua retrospectiva">
        <h2 className="recap-hero">{mesNome}<br />em números</h2>
        <p><strong>{r.qtdTransacoes}</strong> transações registradas. Bora ver como foi?</p>
      </Story>
    ) },
    { key: 'fluxo', tema: 'verde', node: (
      <Story icon={PiggyBank} kicker="Entrou e saiu">
        <div className="recap-duo">
          <div><span>Entrou</span><strong className="recap-pos"><AnimatedMoney value={r.receitas} duration={1400} /></strong></div>
          <div><span>Saiu</span><strong className="recap-neg"><AnimatedMoney value={r.despesas} duration={1400} /></strong></div>
        </div>
        <p className="recap-destaque">
          {r.saldo >= 0
            ? <>Sobrou <span className="money">{fmt(r.saldo)}</span>. Mandou bem! 💪</>
            : <>Faltou <span className="money">{fmt(-r.saldo)}</span>. Dá pra ajustar no próximo mês.</>}
        </p>
      </Story>
    ) },
  ]

  if (r.topCategorias.length > 0) {
    const [campea] = r.topCategorias
    stories.push({ key: 'categoria', tema: 'rosa', node: (
      <Story icon={Crown} kicker="Categoria campeã">
        <h2 className="recap-hero">{campea.categoria}</h2>
        <p><strong>{campea.pct}%</strong> de tudo que você gastou em {mesNome}.</p>
        <ul className="recap-bars">
          {r.topCategorias.map((c, i) => (
            <li key={c.categoria}>
              <span className="recap-bars-label">{c.categoria}<b className="money">{fmt(c.total)}</b></span>
              <span className="recap-bars-track">
                <m.span initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ delay: 0.6 + i * 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
              </span>
            </li>
          ))}
        </ul>
      </Story>
    ) })
  }

  if (r.maiorDespesa) {
    stories.push({ key: 'maior', tema: 'laranja', node: (
      <Story icon={Receipt} kicker="O maior gasto do mês">
        <h2 className="recap-hero recap-hero--md">{r.maiorDespesa.descricao}</h2>
        <p className="recap-big money">{fmt(r.maiorDespesa.valor)}</p>
        <p>{r.maiorDespesa.categoria} · {dataLonga(r.maiorDespesa.data)}</p>
      </Story>
    ) })
  }

  stories.push({ key: 'dias', tema: 'azul', node: (
    <Story icon={Flame} kicker="Seu ritmo">
      <h2>Você passou <span className="recap-num">{r.diasSemGastar}</span> {r.diasSemGastar === 1 ? 'dia' : 'dias'} sem gastar nada.</h2>
      <div className="recap-dots" aria-hidden="true">
        {Array.from({ length: r.diasConsiderados }, (_, i) => {
          const dia = `${r.mes}-${String(i + 1).padStart(2, '0')}`
          return <m.span key={dia} className={porDia[dia] ? 'on' : ''} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.015 }} />
        })}
      </div>
      {r.diaMaisGastador && (
        <p>Dia mais pesado: <strong>{dataLonga(r.diaMaisGastador.data)}</strong>, com <span className="money">{fmt(r.diaMaisGastador.total)}</span>.</p>
      )}
    </Story>
  ) })

  if (r.comparacao.variacaoPct !== null) {
    const menos = r.comparacao.variacaoPct <= 0
    stories.push({ key: 'compara', tema: menos ? 'verde' : 'laranja', node: (
      <Story icon={menos ? TrendingDown : TrendingUp} kicker={`Comparado a ${mesAnteriorNome}`}>
        <h2 className="recap-hero">{menos ? '' : '+'}{r.comparacao.variacaoPct}%</h2>
        <p className="recap-destaque">
          {r.comparacao.variacaoPct === 0
            ? 'Você gastou exatamente o mesmo. Consistência!'
            : menos
              ? `Você gastou ${Math.abs(r.comparacao.variacaoPct)}% menos que em ${mesAnteriorNome}. 🎉`
              : `Você gastou ${r.comparacao.variacaoPct}% a mais que em ${mesAnteriorNome}. Que tal um orçamento por categoria?`}
        </p>
      </Story>
    ) })
  }

  stories.push({ key: 'fim', tema: 'roxo', final: true, node: (
    <Story icon={Sparkles} kicker="É isso!">
      <h2 className="recap-hero recap-hero--md">Esse foi seu {mesNome}.</h2>
      <p>Continue registrando — a retrospectiva do próximo mês já está sendo escrita.</p>
      <div className="recap-actions">
        <button type="button" className="btn btn-primary" onClick={(e) => { e.stopPropagation(); fechar(); navigate(`/relatorios?month=${r.mes}`) }}>
          <ChartColumn size={16} /> Ver relatórios de {mesNome}
        </button>
      </div>
    </Story>
  ) })

  return stories
}

// Retrospectiva do mês em formato de stories (tela cheia): barrinhas de progresso no topo,
// avanço automático, toque nas laterais pra voltar/avançar, segurar pra pausar, arrastar
// pra baixo (ou Esc) pra fechar.
export default function MonthlyRecap({ mes, onClose }) {
  const navigate = useNavigate()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [idx, setIdx] = useState(0)
  const [pausado, setPausado] = useState(false)
  const pressionado = useRef(null)

  useEffect(() => {
    let vivo = true
    Promise.all([
      api.get('/reports/monthly', { params: { month: mes } }),
      api.get('/reports/evolution').catch(() => ({ data: [] })),
      api.get('/cambio').catch(() => ({ data: { taxas: { BRL: 1 } } })),
    ]).then(([mensal, evolucao, cambio]) => {
      if (!vivo) return
      const taxas = cambio.data?.taxas || { BRL: 1 }
      const transacoes = mensal.data.transactions
      setDados({ r: calcularRetrospectiva(transacoes, { mes, taxas, evolucao: evolucao.data }), porDia: gastosPorDia(transacoes, taxas) })
    }).catch(() => vivo && setErro('Não foi possível montar sua retrospectiva agora.'))
    return () => { vivo = false }
  }, [mes])

  const stories = useMemo(() => (dados ? montarStories(dados.r, dados.porDia, navigate, onClose) : []), [dados, navigate, onClose])
  const atual = stories[idx]

  const ir = useCallback((novo) => {
    if (novo < 0) return
    if (novo >= stories.length) { onClose(); return }
    setIdx(novo)
    haptic('light')
  }, [stories.length, onClose])

  // Confete ao chegar no último story de um mês que fechou no azul (uma vez por chegada).
  const chaveAtual = atual?.key
  useEffect(() => {
    if (chaveAtual === 'fim' && dados?.r.saldo >= 0) celebrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveAtual])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') ir(idx + 1)
      else if (e.key === 'ArrowLeft') ir(idx - 1)
      else if (e.key === ' ') { e.preventDefault(); setPausado(p => !p) }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [idx, ir, onClose])

  // Toque curto nas laterais navega; segurar pausa.
  const onPointerDown = () => { pressionado.current = Date.now(); setPausado(true) }
  const onPointerUp = (e) => {
    const segurou = pressionado.current && Date.now() - pressionado.current > 250
    pressionado.current = null
    setPausado(false)
    if (segurou || e.target.closest('button')) return
    const { left, width } = e.currentTarget.getBoundingClientRect()
    ir(e.clientX - left < width * 0.3 ? idx - 1 : idx + 1)
  }

  return createPortal(
    <m.div
      className={`recap recap--${atual?.tema || 'roxo'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Retrospectiva de ${nomeDoMes(mes, { comAno: true })}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      onDragEnd={(_, info) => { if (info.offset.y > 120) onClose() }}
    >
      <div className="recap-top">
        <div className="recap-progress">
          {stories.map((s, i) => (
            <span key={s.key} className="recap-progress-track">
              <span
                className={`recap-progress-fill${i < idx ? ' done' : ''}${i === idx ? ' active' : ''}`}
                style={i === idx ? { animationDuration: `${DURACAO}ms`, animationPlayState: pausado ? 'paused' : 'running' } : undefined}
                onAnimationEnd={i === idx ? () => ir(idx + 1) : undefined}
              />
            </span>
          ))}
        </div>
        <div className="recap-header">
          <span>💰 {capitalizar(nomeDoMes(mes, { comAno: true }))}</span>
          <button type="button" className="recap-close" onClick={onClose} aria-label="Fechar retrospectiva"><X size={22} /></button>
        </div>
      </div>

      <div className="recap-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={() => setPausado(false)}>
        {erro ? (
          <div className="recap-story"><h2>{erro}</h2></div>
        ) : !dados ? (
          <div className="recap-story"><Loader2 size={32} className="icon-spin" /><p>Montando sua retrospectiva...</p></div>
        ) : (
          <AnimatePresence mode="wait">
            <m.div
              key={atual.key}
              className="recap-slide"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              aria-live="polite"
            >
              {atual.node}
            </m.div>
          </AnimatePresence>
        )}
      </div>
    </m.div>,
    document.body,
  )
}
