import { createContext, useContext, useState, useCallback } from 'react'
import { flushSync } from 'react-dom'

const ThemeContext = createContext(null)

// Cor da barra do sistema (status bar do Android / app instalado) = cor da navbar de cada
// tema. O index.html aplica a mesma regra antes do React montar.
const COR_BARRA = { dark: '#1a1d2e', light: '#ffffff' }

function getInitialTheme() {
  return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
}

function aplicarNoDom(tema) {
  localStorage.setItem('theme', tema)
  if (tema === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[tema])
}

// De onde o círculo da troca de tema nasce: o centro do elemento clicado (funciona também
// com Enter/Espaço, onde clientX/Y vêm zerados) ou, sem elemento (busca Ctrl+K), o centro da tela.
function origemDaTroca(evento) {
  const alvo = evento?.currentTarget
  if (alvo?.getBoundingClientRect) {
    const r = alvo.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  // Troca com um círculo que se expande a partir do botão (View Transitions API). Sem
  // suporte no navegador ou com "reduzir movimento", troca na hora, como antes.
  const toggleTheme = useCallback((evento) => {
    const root = document.documentElement
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
    const trocar = () => {
      // flushSync: o React precisa já ter pintado o tema novo (ícone do botão etc.) quando
      // o navegador tira a "foto" do estado novo.
      flushSync(() => setTheme(next))
      aplicarNoDom(next)
    }

    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduzir) {
      trocar()
      return
    }

    const { x, y } = origemDaTroca(evento)
    const raio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

    // Sem isso, botões/links com transition de cor animariam do tema velho pro novo dentro
    // do círculo, sujando o efeito.
    root.classList.add('theme-switching')
    const transicao = document.startViewTransition(trocar)
    transicao.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
        { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
      )
    }).catch(() => {})
    transicao.finished.finally(() => root.classList.remove('theme-switching'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
