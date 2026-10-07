import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { Eye, PartyPopper, Plus, Wallet, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { haptic } from '../utils/haptics'
import Modal from './Modal'
import EmptyIllustration from './EmptyIllustration'

// Boas-vindas depois do cadastro (uma vez só): 4 telas que dá pra passar arrastando.
// O Register marca a flag no localStorage; quem fecha/termina o tour limpa.
export const FLAG_BOAS_VINDAS = 'geldtrack:boas-vindas'

export function deveMostrarBoasVindas() {
  try { return localStorage.getItem(FLAG_BOAS_VINDAS) === '1' } catch { return false }
}

const PASSOS = [
  {
    icon: PartyPopper,
    titulo: (nome) => `Boas-vindas ao GeldTrack${nome ? `, ${nome}` : ''}!`,
    texto: 'Em poucos passos você vai saber pra onde vai cada real — e ainda ver o saldo do mês antes dele acabar.',
  },
  {
    icon: Wallet,
    titulo: () => 'Comece pelas suas contas',
    texto: 'Cadastre onde seu dinheiro está — conta corrente, cartão, carteira — ou conecte o banco via Open Finance.',
  },
  {
    icon: Plus,
    titulo: () => 'Lance em segundos',
    texto: 'Toque no + pra registrar uma receita ou despesa. Pela descrição, o app já sugere a categoria.',
  },
  {
    icon: Eye,
    titulo: () => 'Tudo na palma da mão',
    texto: 'Deslize uma transação pra editar ou excluir, puxe a tela pra atualizar e toque no olho pra esconder os valores.',
  },
]

const variantes = {
  entra: (dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  centro: { opacity: 1, x: 0 },
  sai: (dir) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
}

export default function WelcomeTour({ onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [[passo, dir], setPasso] = useState([0, 1])
  const ultimo = passo === PASSOS.length - 1
  const { icon, titulo, texto } = PASSOS[passo]

  const ir = (novo) => {
    if (novo < 0 || novo >= PASSOS.length) return
    setPasso([novo, novo > passo ? 1 : -1])
    haptic('light')
  }

  const fechar = (destino) => {
    try { localStorage.removeItem(FLAG_BOAS_VINDAS) } catch { /* ignore */ }
    onClose()
    if (destino) navigate(destino)
  }

  return (
    <Modal onClose={() => fechar()}>
      <div className="tour" role="group" aria-roledescription="carrossel" aria-label="Boas-vindas">
        <button type="button" className="modal-close tour-close" onClick={() => fechar()} aria-label="Pular apresentação"><X size={20} /></button>

        <div className="tour-stage">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <m.div
              key={passo}
              className="tour-slide"
              custom={dir}
              variants={variantes}
              initial="entra"
              animate="centro"
              exit="sai"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) ir(passo + 1)
                else if (info.offset.x > 60) ir(passo - 1)
              }}
              aria-live="polite"
            >
              <EmptyIllustration icon={icon} />
              <h3>{titulo(user?.nome?.split(' ')[0])}</h3>
              <p>{texto}</p>
            </m.div>
          </AnimatePresence>
        </div>

        <div className="tour-dots" role="tablist" aria-label="Passos">
          {PASSOS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              className={`tour-dot${i === passo ? ' tour-dot--active' : ''}`}
              aria-selected={i === passo}
              aria-label={`Passo ${i + 1} de ${PASSOS.length}`}
              onClick={() => ir(i)}
            />
          ))}
        </div>

        <div className="tour-actions">
          {ultimo ? (
            <>
              <button type="button" className="btn btn-outline" onClick={() => fechar()}>Explorar o app</button>
              <button type="button" className="btn btn-primary" onClick={() => fechar('/contas')}>
                <Wallet size={16} /> Cadastrar minha primeira conta
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-outline" onClick={() => (passo === 0 ? fechar() : ir(passo - 1))}>
                {passo === 0 ? 'Pular' : 'Voltar'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => ir(passo + 1)}>Próximo</button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
