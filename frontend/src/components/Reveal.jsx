import { m } from 'framer-motion'

// Conteúdo que "sobe" suavemente ao entrar na tela durante a rolagem (uma vez só).
// `delay` permite escalonar itens de uma grade.
export default function Reveal({ as = 'div', delay = 0, y = 28, className, children, ...rest }) {
  const Comp = m[as]
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      {...rest}
    >
      {children}
    </Comp>
  )
}
