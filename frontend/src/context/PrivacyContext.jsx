import { createContext, useContext, useState, useCallback } from 'react'
import { haptic } from '../utils/haptics'

// Modo privacidade: borra todos os valores em dinheiro da tela (elementos .money, valores
// de transação, tooltips de gráfico — ver html[data-privacy] no CSS). Útil pra abrir o app
// em público. Fica salvo no navegador; o index.html aplica o atributo antes do React montar.
const PrivacyContext = createContext(null)

function getInitial() {
  try { return localStorage.getItem('privacy') === 'on' } catch { return false }
}

export function PrivacyProvider({ children }) {
  const [hidden, setHidden] = useState(getInitial)

  const togglePrivacy = useCallback(() => {
    setHidden(prev => {
      const next = !prev
      try { localStorage.setItem('privacy', next ? 'on' : 'off') } catch { /* ignore */ }
      if (next) document.documentElement.setAttribute('data-privacy', 'on')
      else document.documentElement.removeAttribute('data-privacy')
      haptic('light')
      return next
    })
  }, [])

  return (
    <PrivacyContext.Provider value={{ hidden, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export const usePrivacy = () => useContext(PrivacyContext)
