import { fmt } from '../utils/format'
import { useCountUp } from '../hooks/useCountUp'

// Valor em dinheiro com contagem animada. O texto lido por leitor de tela é sempre o valor
// final (aria-label), não os números intermediários da animação.
export default function AnimatedMoney({ value, moeda = 'BRL', duration }) {
  const display = useCountUp(value, duration)
  return (
    <span className="money" aria-label={fmt(Number(value) || 0, moeda)}>
      <span aria-hidden="true">{fmt(display, moeda)}</span>
    </span>
  )
}
