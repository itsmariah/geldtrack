import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { useNovaVersao, dispensarNovaVersao } from '../utils/pwaUpdate'

// Aviso de deploy novo (ver utils/pwaUpdate.js e main.jsx). "Depois" só esconde — a
// versão nova entra sozinha na próxima vez que o app for aberto do zero.
export default function PwaUpdateBanner() {
  const atualizar = useNovaVersao()
  const [atualizando, setAtualizando] = useState(false)

  const handleAtualizar = async () => {
    setAtualizando(true)
    await atualizar()
  }

  return (
    <AnimatePresence>
      {atualizar && (
        <m.div
          className="update-banner"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          <span className="update-banner-icon" aria-hidden="true"><Sparkles size={18} /></span>
          <div className="update-banner-text">
            <strong>Nova versão disponível</strong>
            <span>Atualize pra ver as novidades.</span>
          </div>
          <button type="button" className="btn btn-sm btn-outline" onClick={dispensarNovaVersao} disabled={atualizando}>Depois</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleAtualizar} disabled={atualizando}>
            {atualizando && <Loader2 size={14} className="icon-spin" aria-hidden="true" />}
            Atualizar
          </button>
        </m.div>
      )}
    </AnimatePresence>
  )
}
