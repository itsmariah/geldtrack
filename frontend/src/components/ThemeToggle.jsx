import { m } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
      title={theme === 'light' ? 'Tema escuro' : 'Tema claro'}
    >
      {/* key no tema: o ícone novo entra girando a cada troca */}
      <m.span
        key={theme}
        className="theme-toggle-icon"
        initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </m.span>
    </button>
  )
}
