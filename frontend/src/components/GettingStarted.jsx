import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { Check, ChevronRight, PiggyBank, Plus, Rocket, Target, Wallet, X } from 'lucide-react'
import api from '../services/api'
import { celebrate } from '../utils/celebrate'
import { useToast } from '../context/ToastContext'

const FLAG = 'geldtrack:primeiros-passos' // 'dispensado' | 'concluido'
// Marcado quando a pessoa já viu o checklist incompleto — aí, completar depois (em qualquer
// tela) merece comemoração; quem já chega com tudo pronto não ganha confete do nada.
const INICIADO = 'geldtrack:primeiros-passos-iniciado'

function lerFlag() {
  try { return localStorage.getItem(FLAG) } catch { return 'dispensado' }
}
function gravarFlag(v) {
  try { localStorage.setItem(FLAG, v) } catch { /* ignore */ }
}

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Checklist "Primeiros passos" no Dashboard de quem está começando: conta, primeira
// transação, meta e orçamento. Some sozinho quando tudo está feito (com confete se a
// pessoa terminou agora) ou quando é dispensado. Quem já usa o app há tempo nem vê.
export default function GettingStarted({ temConta, temTransacao, onNovaTransacao }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [flag, setFlag] = useState(lerFlag)
  const [extras, setExtras] = useState(null) // { meta, orcamento }

  useEffect(() => {
    if (flag) return
    Promise.all([
      api.get('/metas').catch(() => ({ data: [] })),
      api.get('/orcamentos', { params: { month: mesAtual() } }).catch(() => ({ data: [] })),
    ]).then(([metas, orcamentos]) => setExtras({ meta: metas.data.length > 0, orcamento: orcamentos.data.length > 0 }))
  }, [flag])

  const passos = [
    { id: 'conta', label: 'Cadastre onde está seu dinheiro', detalhe: 'Conta corrente, cartão ou carteira', icon: Wallet, feito: temConta, acao: () => navigate('/contas') },
    { id: 'transacao', label: 'Registre a primeira transação', detalhe: 'Uma receita ou despesa qualquer', icon: Plus, feito: temTransacao, acao: onNovaTransacao },
    { id: 'meta', label: 'Crie uma meta', detalhe: 'Viagem, reserva, um sonho...', icon: Target, feito: extras?.meta, acao: () => navigate('/metas') },
    { id: 'orcamento', label: 'Defina um orçamento', detalhe: 'Um limite mensal pra uma categoria', icon: PiggyBank, feito: extras?.orcamento, acao: () => navigate('/orcamentos') },
  ]
  const feitos = passos.filter(p => p.feito).length
  const completo = extras !== null && feitos === passos.length

  useEffect(() => {
    if (flag || extras === null) return
    if (!completo) {
      try { localStorage.setItem(INICIADO, '1') } catch { /* ignore */ }
      return
    }
    gravarFlag('concluido')
    let iniciado = false
    try { iniciado = localStorage.getItem(INICIADO) === '1' } catch { /* ignore */ }
    if (iniciado) {
      celebrate()
      toast('Primeiros passos concluídos! Agora é só acompanhar. 🚀')
    }
    setFlag('concluido')
  }, [completo, extras, flag, toast])

  const dispensar = () => { gravarFlag('dispensado'); setFlag('dispensado') }

  if (flag || extras === null || completo) return null

  const pct = feitos / passos.length
  return (
    <AnimatePresence>
      <m.section
        className="getting-started"
        aria-labelledby="gs-titulo"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="gs-head">
          <svg className="gs-ring" viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="18" className="gs-ring-track" />
            <m.circle cx="22" cy="22" r="18" className="gs-ring-fill" pathLength="1" strokeDasharray="1" initial={{ strokeDashoffset: 1 }} animate={{ strokeDashoffset: 1 - pct }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
          </svg>
          <span className="gs-ring-icon" aria-hidden="true"><Rocket size={16} /></span>
          <div className="gs-head-text">
            <h3 id="gs-titulo">Primeiros passos</h3>
            <p>{feitos} de {passos.length} concluídos</p>
          </div>
          <button type="button" className="btn-icon" onClick={dispensar} aria-label="Ocultar primeiros passos" title="Ocultar"><X size={16} /></button>
        </div>
        <ol className="gs-list">
          {passos.map(p => {
            const Icon = p.icon
            return (
              <li key={p.id}>
                <button type="button" className={`gs-item${p.feito ? ' gs-item--feito' : ''}`} onClick={p.acao} disabled={p.feito}>
                  <span className="gs-check" aria-hidden="true">{p.feito ? <Check size={14} /> : <Icon size={14} />}</span>
                  <span className="gs-item-text">
                    <b>{p.label}</b>
                    <small>{p.detalhe}</small>
                  </span>
                  {!p.feito && <ChevronRight size={16} className="gs-item-go" aria-hidden="true" />}
                  <span className="sr-only">{p.feito ? '(concluído)' : '(pendente)'}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </m.section>
    </AnimatePresence>
  )
}
