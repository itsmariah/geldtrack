import { useEffect, useLayoutEffect, useRef } from 'react'
import { formatarMascara, digitarMascara, colarValor } from '../utils/moneyMask'

function simboloDe(moeda) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).formatToParts(0).find(p => p.type === 'currency')?.value || moeda
  } catch { return moeda }
}

// Substitui <input type="number" step="0.01"> nos campos de dinheiro: mostra "1.234,56"
// enquanto digita (dígitos entram pela direita, como em app de banco), abre o teclado
// numérico no celular e entende valores colados. A API é a mesma de antes: `value` e
// `onChange(e)` com e.target.value no formato "1234.56" — os formulários não mudam.
//
// - allowNegative: aceita negativo ("-" alterna o sinal; no celular, botão ±).
// - moeda: só muda o símbolo exibido antes do número (padrão BRL).
// - min: valor mínimo (padrão 0.01 quando não é negativo); vira validação nativa do form.
export default function MoneyInput({ value, onChange, moeda = 'BRL', allowNegative = false, min, name, id, required, className = '', style, ...rest }) {
  const ref = useRef(null)
  const texto = formatarMascara(value)
  const minimo = min ?? (allowNegative ? undefined : 0.01)

  const emitir = (novo) => onChange?.({ target: { value: novo, name, id } })

  const handleChange = (e) => {
    emitir(digitarMascara(e.target.value, { allowNegative, eraNegativo: texto.startsWith('-') }))
  }

  const handlePaste = (e) => {
    const colado = colarValor(e.clipboardData.getData('text'), { allowNegative })
    if (colado === null) return
    e.preventDefault()
    emitir(colado)
  }

  const alternarSinal = () => {
    if (!value || value === '-') emitir(value === '-' ? '' : '-')
    else emitir(String(value).startsWith('-') ? String(value).slice(1) : `-${value}`)
    ref.current?.focus()
  }

  // A máscara reescreve o texto inteiro — o cursor volta pro fim (onde os dígitos entram).
  useLayoutEffect(() => {
    const el = ref.current
    if (el && document.activeElement === el) el.setSelectionRange(el.value.length, el.value.length)
  }, [texto])

  // Validação nativa: "0,00" não passa num campo obrigatório com mínimo.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const n = Number(value)
    let msg = ''
    if (value === '-') msg = 'Digite o valor.'
    else if (value !== '' && value != null && minimo !== undefined && n < minimo) msg = 'Informe um valor maior que zero.'
    el.setCustomValidity(msg)
  }, [value, minimo])

  return (
    <div className={`money-input${allowNegative ? ' money-input--signed' : ''}`} style={style}>
      <span className="money-input-prefix" aria-hidden="true">{simboloDe(moeda)}</span>
      <input
        {...rest}
        ref={ref}
        id={id}
        name={name}
        type="text"
        inputMode={allowNegative ? 'text' : 'decimal'}
        autoComplete="off"
        className={className}
        value={texto}
        onChange={handleChange}
        onPaste={handlePaste}
        required={required}
        placeholder={rest.placeholder ?? '0,00'}
      />
      {allowNegative && (
        <button type="button" className="money-input-sign" onClick={alternarSinal} aria-label="Alternar entre positivo e negativo" title="Positivo/negativo">
          ±
        </button>
      )}
    </div>
  )
}
