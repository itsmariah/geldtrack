import { describe, it, expect } from 'vitest'
import { saudacao, contextoDoDia } from './saudacao'

describe('saudacao', () => {
  it('usa "Bom dia" de 5h até antes do meio-dia', () => {
    expect(saudacao(new Date(2026, 9, 7, 5, 0)).texto).toBe('Bom dia')
    expect(saudacao(new Date(2026, 9, 7, 11, 59)).texto).toBe('Bom dia')
  })

  it('usa "Boa tarde" do meio-dia até antes das 18h', () => {
    expect(saudacao(new Date(2026, 9, 7, 12, 0)).texto).toBe('Boa tarde')
    expect(saudacao(new Date(2026, 9, 7, 17, 59)).texto).toBe('Boa tarde')
  })

  it('usa "Boa noite" das 18h até antes das 5h', () => {
    expect(saudacao(new Date(2026, 9, 7, 18, 0)).texto).toBe('Boa noite')
    expect(saudacao(new Date(2026, 9, 7, 4, 59)).texto).toBe('Boa noite')
  })
})

describe('contextoDoDia', () => {
  it('conta os dias que faltam pro fim do mês', () => {
    expect(contextoDoDia(new Date(2026, 9, 7))).toMatch(/faltam 24 dias pro fim do mês$/)
  })

  it('usa singular quando falta 1 dia', () => {
    expect(contextoDoDia(new Date(2026, 9, 30))).toMatch(/falta 1 dia pro fim do mês$/)
  })

  it('avisa no último dia do mês (inclusive fevereiro)', () => {
    expect(contextoDoDia(new Date(2026, 9, 31))).toMatch(/último dia do mês$/)
    expect(contextoDoDia(new Date(2026, 1, 28))).toMatch(/último dia do mês$/)
  })
})
