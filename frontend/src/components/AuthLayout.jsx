import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
import ShowcaseMockup from './ShowcaseMockup'

const BENEFICIOS = [
  'Sincronize com seu banco via Open Finance',
  'Metas, orçamentos e insights automáticos',
  'Carteira da família e grupos pra dividir contas',
]

// Casca das telas de login, cadastro e senha: no desktop, tela dividida — lado da marca
// (vitrine animada + benefícios) e o formulário; no celular, só o formulário.
export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <Link to="/" className="back-link"><ArrowLeft size={16} /> Voltar para o início</Link>

      <aside className="auth-brand" aria-hidden="true">
        <div className="auth-brand-inner">
          <p className="auth-brand-logo"><span className="logo-coin">💰</span> GeldTrack</p>
          <h2 className="auth-brand-title">Seu dinheiro, <span className="gradient-text">finalmente sob controle.</span></h2>
          <ul className="auth-brand-list">
            {BENEFICIOS.map(b => <li key={b}><Check size={16} /> {b}</li>)}
          </ul>
          <ShowcaseMockup compact />
        </div>
      </aside>

      <main className="auth-main">
        <m.div
          className="auth-card"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </m.div>
      </main>
    </div>
  )
}
