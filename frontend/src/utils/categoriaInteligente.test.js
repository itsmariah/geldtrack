import { describe, it, expect, beforeEach } from 'vitest'
import { normalizarDescricao, aprenderCategoria, sugerirCategoria, categoriasMaisUsadas, guessCategory } from './categoriaInteligente'

function memoria() {
  let dados = {}
  return { get: () => JSON.parse(JSON.stringify(dados)), set: (d) => { dados = d } }
}

const DESPESAS = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Pets', 'Outros']

describe('normalizarDescricao', () => {
  it('tira acentos, números e pontuação', () => {
    expect(normalizarDescricao('  Mercado Pão de Açúcar #123 ')).toBe('mercado pao de acucar')
  })
})

describe('guessCategory', () => {
  it('mantém as regras da importação OFX', () => {
    expect(guessCategory('UBER *TRIP', 'despesa')).toBe('Transporte')
    expect(guessCategory('Salário maio', 'receita')).toBe('Salário')
    expect(guessCategory('xyz', 'despesa')).toBe('Outros')
  })
})

describe('sugerirCategoria', () => {
  let store
  beforeEach(() => { store = memoria() })

  it('usa palavra-chave quando não há histórico', () => {
    expect(sugerirCategoria('Padaria do Zé', 'despesa', DESPESAS, store)).toBe('Alimentação')
  })

  it('prefere o que o usuário já escolheu pra mesma descrição', () => {
    aprenderCategoria({ tipo: 'despesa', categoria: 'Lazer', descricao: 'Padaria do Zé' }, store)
    expect(sugerirCategoria('padaria do ze', 'despesa', DESPESAS, store)).toBe('Lazer')
  })

  it('reconhece pela primeira palavra', () => {
    aprenderCategoria({ tipo: 'despesa', categoria: 'Pets', descricao: 'Petz Morumbi' }, store)
    expect(sugerirCategoria('Petz Paulista', 'despesa', DESPESAS, store)).toBe('Pets')
  })

  it('ignora categorias que não existem mais e textos curtos', () => {
    expect(sugerirCategoria('ifood', 'despesa', DESPESAS, store)).toBeNull() // "Delivery" não está na lista
    expect(sugerirCategoria('ab', 'despesa', DESPESAS, store)).toBeNull()
  })
})

describe('categoriasMaisUsadas', () => {
  it('ordena por uso e respeita o limite e as categorias disponíveis', () => {
    const store = memoria()
    for (const c of ['Lazer', 'Moradia', 'Moradia', 'Transporte', 'Transporte', 'Transporte', 'Apagada', 'Outros']) {
      aprenderCategoria({ tipo: 'despesa', categoria: c }, store)
    }
    expect(categoriasMaisUsadas('despesa', DESPESAS, 2, store)).toEqual(['Transporte', 'Moradia'])
    expect(categoriasMaisUsadas('receita', DESPESAS, 4, store)).toEqual([])
  })
})
