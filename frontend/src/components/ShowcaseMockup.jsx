import { m } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, PartyPopper, TrendingDown, PiggyBank } from 'lucide-react'
import AnimatedMoney from './AnimatedMoney'
import Sparkline from './Sparkline'

// Vitrine animada do produto (hero da landing e lado "marca" do login/cadastro): um
// celular com um mini dashboard feito em HTML/CSS — não é print, então acompanha o tema —
// e cartões de notificação flutuando em volta. Os dados são de exemplo.
const SERIE = [3100, 2600, 3900, 3400, 4100, 4379]
const TRANSACOES = [
  { desc: 'Salário', cat: 'Receita fixa', valor: '+R$ 6.500,00', tipo: 'receita' },
  { desc: 'Mercado', cat: 'Alimentação', valor: '-R$ 89,90', tipo: 'despesa' },
  { desc: 'Uber', cat: 'Transporte', valor: '-R$ 32,50', tipo: 'despesa' },
]

const entrada = (delay) => ({
  initial: { opacity: 0, y: 24, scale: 0.92 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring', stiffness: 260, damping: 24, delay },
})

export default function ShowcaseMockup({ compact = false }) {
  return (
    <div className={`showcase${compact ? ' showcase--compact' : ''}`} aria-hidden="true">
      <span className="showcase-glow" />

      <m.div className="showcase-phone" {...entrada(0.1)}>
        <div className="showcase-notch" />
        <div className="showcase-screen">
          <p className="showcase-hello">Olá, Ana 👋</p>
          <div className="showcase-balance">
            <span className="showcase-label">Saldo atual</span>
            <strong className="showcase-value"><AnimatedMoney value={4379.4} duration={1600} /></strong>
            <Sparkline data={SERIE} color="var(--primary-light)" />
          </div>
          <div className="showcase-pills">
            <span className="showcase-pill showcase-pill--in"><ArrowDownLeft size={12} /> R$ 6,5 mil</span>
            <span className="showcase-pill showcase-pill--out"><ArrowUpRight size={12} /> R$ 2,1 mil</span>
          </div>
          <ul className="showcase-list">
            {TRANSACOES.map((t, i) => (
              <m.li key={t.desc} className={`showcase-tx showcase-tx--${t.tipo}`} {...entrada(0.5 + i * 0.12)}>
                <span className="showcase-tx-icon">{t.tipo === 'receita' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}</span>
                <span className="showcase-tx-info"><b>{t.desc}</b><small>{t.cat}</small></span>
                <span className="showcase-tx-valor">{t.valor}</span>
              </m.li>
            ))}
          </ul>
        </div>
      </m.div>

      <m.div className="showcase-float showcase-float--goal" {...entrada(0.9)}>
        <span className="showcase-float-icon showcase-float-icon--green"><PartyPopper size={16} /></span>
        <span><b>Meta concluída!</b><small>Reserva de emergência</small></span>
      </m.div>

      <m.div className="showcase-float showcase-float--insight" {...entrada(1.15)}>
        <span className="showcase-float-icon"><TrendingDown size={16} /></span>
        <span><b>12% menos em Lazer</b><small>que no mês passado</small></span>
      </m.div>

      {!compact && (
        <m.div className="showcase-float showcase-float--budget" {...entrada(1.4)}>
          <span className="showcase-float-icon showcase-float-icon--yellow"><PiggyBank size={16} /></span>
          <span className="showcase-budget">
            <b>Mercado · 72%</b>
            <span className="showcase-budget-bar"><span /></span>
          </span>
        </m.div>
      )}
    </div>
  )
}
