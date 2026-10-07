import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Campo de senha com botão de exibir/ocultar — repassa todas as props pro <input>, então
// substitui um <input type="password"> direto (id, value, onChange, required...).
export default function PasswordInput(props) {
  const [visivel, setVisivel] = useState(false)

  return (
    <div className="password-field">
      <input {...props} type={visivel ? 'text' : 'password'} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisivel(v => !v)}
        aria-label={visivel ? 'Ocultar senha' : 'Exibir senha'}
        aria-pressed={visivel}
        title={visivel ? 'Ocultar senha' : 'Exibir senha'}
      >
        {visivel ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  )
}
