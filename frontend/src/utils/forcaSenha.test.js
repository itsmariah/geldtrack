import { describe, it, expect } from 'vitest'
import { forcaSenha } from './forcaSenha'

describe('forcaSenha', () => {
  it('vazia não tem nível nem rótulo', () => {
    expect(forcaSenha('')).toEqual({ nivel: 0, rotulo: '', dicas: [] })
  })

  it('menos de 6 caracteres é sempre muito fraca', () => {
    expect(forcaSenha('Ab1!').nivel).toBe(0)
  })

  it('senhas comuns e sequências ficam no máximo como fracas', () => {
    expect(forcaSenha('12345678').nivel).toBeLessThanOrEqual(1)
    expect(forcaSenha('Senha@2026xyz').nivel).toBeLessThanOrEqual(1)
    expect(forcaSenha('aaaaaaaaaa').nivel).toBeLessThanOrEqual(1)
  })

  it('penaliza senha com o próprio nome ou e-mail', () => {
    const r = forcaSenha('Mariana#Viagem9', { nome: 'Mariana Souza' })
    expect(r.nivel).toBeLessThanOrEqual(1)
    expect(r.dicas[0]).toBe('Não use seu nome ou e-mail')
  })

  it('sobe com tamanho e variedade de caracteres', () => {
    expect(forcaSenha('cavalobateria').nivel).toBe(2)          // longa, 1 tipo
    expect(forcaSenha('Cavalo-bateria').nivel).toBe(4)         // longa, 3 tipos
    expect(forcaSenha('Cavalo-bateria').rotulo).toBe('Forte')
  })

  it('dá no máximo duas dicas', () => {
    expect(forcaSenha('abcdef').dicas.length).toBeLessThanOrEqual(2)
  })
})
