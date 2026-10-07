import { describe, it, expect } from 'vitest'
import { formatarMascara, digitarMascara, colarValor } from './moneyMask'

describe('formatarMascara', () => {
  it('formata números e strings com ponto decimal', () => {
    expect(formatarMascara('1234.5')).toBe('1.234,50')
    expect(formatarMascara(89.9)).toBe('89,90')
    expect(formatarMascara('0.05')).toBe('0,05')
  })
  it('mantém o sinal negativo', () => {
    expect(formatarMascara('-12')).toBe('-12,00')
  })
  it('deixa vazio quando não há valor', () => {
    expect(formatarMascara('')).toBe('')
    expect(formatarMascara(null)).toBe('')
  })
})

describe('digitarMascara', () => {
  it('preenche da direita pra esquerda, como app de banco', () => {
    expect(digitarMascara('1')).toBe('0.01')
    expect(digitarMascara('0,012')).toBe('0.12')
    expect(digitarMascara('0,123')).toBe('1.23')
    expect(digitarMascara('1.234,567')).toBe('12345.67')
  })
  it('apagar tudo deixa vazio', () => {
    expect(digitarMascara('')).toBe('')
    expect(digitarMascara('0,0')).toBe('')
  })
  it('ignora "-" quando negativo não é permitido', () => {
    expect(digitarMascara('-12,34')).toBe('12.34')
  })
  it('alterna o sinal com "-" quando permitido', () => {
    expect(digitarMascara('12,34-', { allowNegative: true })).toBe('-12.34')
    expect(digitarMascara('-12,34-', { allowNegative: true, eraNegativo: true })).toBe('12.34')
    expect(digitarMascara('-12,345', { allowNegative: true, eraNegativo: true })).toBe('-123.45')
  })
})

describe('colarValor', () => {
  it('entende formatos brasileiros e americanos', () => {
    expect(colarValor('1.234,56')).toBe('1234.56')
    expect(colarValor('1234,5')).toBe('1234.50')
    expect(colarValor('1,234.56')).toBe('1234.56')
    expect(colarValor('R$ 12')).toBe('12.00')
    expect(colarValor('1.234')).toBe('1234.00')
  })
  it('respeita negativo só quando permitido', () => {
    expect(colarValor('-5,90')).toBe('5.90')
    expect(colarValor('-5,90', { allowNegative: true })).toBe('-5.90')
  })
  it('retorna null pra texto sem número', () => {
    expect(colarValor('abc')).toBeNull()
  })
})
