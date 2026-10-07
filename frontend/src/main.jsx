import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { avisarNovaVersao } from './utils/pwaUpdate'

const UMA_HORA = 60 * 60 * 1000

// Service workers não registram em origem file:// — o Electron carrega o app assim
// em produção, então esse guard evita uma tentativa de registro fadada a falhar
// (mesmo padrão de detecção que Landing.jsx usa em isDesktopApp).
if (window.location.protocol.startsWith('http')) {
  const updateSW = registerSW({
    immediate: true,
    // Deploy novo encontrado: em vez de trocar a versão sozinho (o que já deixou gente
    // presa num JS antigo), mostra o aviso e só atualiza quando a pessoa pedir.
    onNeedRefresh() {
      avisarNovaVersao(() => updateSW(true))
    },
    // App instalado pode ficar aberto por dias — procura versão nova de hora em hora e
    // sempre que volta pro primeiro plano.
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const checar = () => { if (navigator.onLine) registration.update().catch(() => {}) }
      setInterval(checar, UMA_HORA)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checar()
      })
    },
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
