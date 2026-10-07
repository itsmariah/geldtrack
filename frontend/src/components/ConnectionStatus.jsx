import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useToast } from '../context/ToastContext'

// Selo "Sem conexão" enquanto o aparelho estiver offline (o app abre pelo cache do PWA,
// mas os dados vêm todos da API) e um toast quando a conexão volta.
export default function ConnectionStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const toast = useToast()
  // Começa marcado se o app já abriu offline (o evento "offline" nunca dispara nesse caso).
  const caiu = useRef(!navigator.onLine)

  useEffect(() => {
    const on = () => {
      setOnline(true)
      if (caiu.current) toast('Conexão restabelecida.')
      caiu.current = false
    }
    const off = () => {
      setOnline(false)
      caiu.current = true
    }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [toast])

  return (
    <AnimatePresence>
      {!online && (
        <m.div
          className="offline-pill"
          role="status"
          aria-live="assertive"
          initial={{ opacity: 0, y: -12, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -12, x: '-50%' }}
          transition={{ duration: 0.25 }}
        >
          <WifiOff size={15} aria-hidden="true" />
          Sem conexão<span className="offline-pill-extra"> — os dados podem estar desatualizados</span>
        </m.div>
      )}
    </AnimatePresence>
  )
}
