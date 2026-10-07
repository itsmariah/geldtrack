import { forcaSenha } from '../utils/forcaSenha'

// Medidor de força embaixo do campo de senha (cadastro e redefinição): 4 barrinhas que
// enchem e mudam de cor, o rótulo e até duas dicas do que melhorar.
export default function PasswordStrength({ id, senha, nome, email }) {
  if (!senha) return null
  const { nivel, rotulo, dicas } = forcaSenha(senha, { nome, email })

  return (
    <div id={id} className={`pw-strength pw-strength--${nivel}`} aria-live="polite">
      <div className="pw-strength-bars" aria-hidden="true">
        {[1, 2, 3, 4].map(i => <span key={i} className={i <= nivel ? 'on' : ''} />)}
      </div>
      <span className="pw-strength-label">Força da senha: <strong>{rotulo}</strong></span>
      {dicas.length > 0 && nivel < 4 && <span className="pw-strength-tip">{dicas.join(' · ')}</span>}
    </div>
  )
}
