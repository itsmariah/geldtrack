import { describe, it, expect } from 'vitest'
import { pageItems } from './pageItems'

describe('pageItems', () => {
  it('uma página só', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(1, 0)).toEqual([1])
  })

  it('poucas páginas: mostra todas, sem reticências', () => {
    expect(pageItems(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageItems(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('a partir de 8 páginas começa a usar reticências', () => {
    expect(pageItems(1, 8)).toEqual([1, 2, '…', 8])
  })

  it('página do meio: reticências dos dois lados', () => {
    expect(pageItems(6, 20)).toEqual([1, '…', 5, 6, 7, '…', 20])
  })

  it('perto do começo e do fim', () => {
    expect(pageItems(1, 20)).toEqual([1, 2, '…', 20])
    expect(pageItems(20, 20)).toEqual([1, '…', 19, 20])
    expect(pageItems(3, 20)).toEqual([1, 2, 3, 4, '…', 20])
  })

  it('buraco de uma página vira o número, não reticências', () => {
    // entre 1 e 3 só falta o 2
    expect(pageItems(4, 20)).toEqual([1, 2, 3, 4, 5, '…', 20])
  })
})
