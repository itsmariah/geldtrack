import { createContext, useContext, useState, useCallback } from 'react'

const ThemeContext = createContext(null)

// Cor da barra do sistema (status bar do Android / app instalado) = cor da navbar de cada
// tema. O index.html aplica a mesma regra antes do React montar.
const COR_BARRA = { dark: '#1a1d2e', light: '#ffffff' }

function getInitialTheme() {
  return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', next)
      if (next === 'light') {
        document.documentElement.setAttribute('data-theme', 'light')
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[next])
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
