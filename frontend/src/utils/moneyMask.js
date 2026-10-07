// Máscara de dinheiro estilo app de banco: os dígitos entram pela direita ("1", "12",
// "1,23", "12,34"...). O valor "de verdade" continua sendo uma string com ponto decimal
// ("1234.56"), igual ao que os formulários já mandavam pra API com <input type="number">.

const fmtBR = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MAX_DIGITOS = 12 // até R$ 9.999.999.999,99

// "1234.5" | 1234.5 | "-12" → "1.234,50" | "1.234,50" | "-12,00". Vazio continua vazio.
export function formatarMascara(value) {
  if (value === '' || value === null || value === undefined) return ''
  if (value === '-') return '-' // só o sinal digitado, ainda sem número
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return (String(value).trim().startsWith('-') ? '-' : '') + fmtBR.format(Math.abs(n))
}

// Texto digitado no campo (já com a máscara antiga) → novo valor.
// Com allowNegative, digitar "-" alterna o sinal.
export function digitarMascara(raw, { allowNegative = false, eraNegativo = false } = {}) {
  const tracos = (raw.match(/-/g) || []).length
  // O texto anterior já tinha um "-" se era negativo; um "-" a mais (ou a menos) alterna.
  const negativo = allowNegative && (eraNegativo ? tracos === 1 : tracos >= 1)
  const digitos = raw.replace(/\D/g, '').replace(/^0+/, '').slice(-MAX_DIGITOS)
  if (!digitos) return negativo ? '-' : ''
  const centavos = Number(digitos)
  return (negativo ? '-' : '') + (centavos / 100).toFixed(2)
}

// Texto colado (de extrato, calculadora, outro app) → valor. Entende "1.234,56",
// "1234,56", "1,234.56", "1234.56", "R$ 12" e "-5,90". Retorna null se não for número.
export function colarValor(texto, { allowNegative = false } = {}) {
  const t = String(texto).trim()
  const negativo = allowNegative && /^-|-$|\(.*\)/.test(t.replace(/R\$\s*/i, ''))
  let s = t.replace(/[^\d.,]/g, '')
  if (!/\d/.test(s)) return null
  const ultimaVirgula = s.lastIndexOf(',')
  const ultimoPonto = s.lastIndexOf('.')
  const sep = Math.max(ultimaVirgula, ultimoPonto)
  // Separador decimal = o último, se tiver 1 ou 2 dígitos depois; senão é tudo inteiro.
  if (sep >= 0 && s.length - sep - 1 <= 2) {
    s = s.slice(0, sep).replace(/[.,]/g, '') + '.' + s.slice(sep + 1)
  } else {
    s = s.replace(/[.,]/g, '')
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return (negativo ? '-' : '') + n.toFixed(2)
}
