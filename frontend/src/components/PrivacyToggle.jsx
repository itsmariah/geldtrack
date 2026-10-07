import { Eye, EyeOff } from 'lucide-react'
import { usePrivacy } from '../context/PrivacyContext'

export default function PrivacyToggle() {
  const { hidden, togglePrivacy } = usePrivacy()

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={togglePrivacy}
      aria-pressed={hidden}
      aria-label={hidden ? 'Mostrar valores' : 'Esconder valores'}
      title={hidden ? 'Mostrar valores' : 'Esconder valores'}
    >
      {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}
