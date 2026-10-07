import { describe, it, expect } from 'vitest'
import { serieMensal } from './serieMensal'

describe('serieMensal', () => {
  const agora = new Date(2026, 9, 7) // outubro/2026

  it('gera os últimos 6 meses em ordem, com 0 nos meses sem movimento', () => {
    const serie = serieMensal([
      { mes: '2026-06', receitas: 1000, despesas: 400 },
      { mes: '2026-10', receitas: 500, despesas: 800 },
    ], agora)
    // mai, jun, jul, ago, set, out
    expect(serie.receitas).toEqual([0, 1000, 0, 0, 0, 500])
    expect(serie.despesas).toEqual([0, 400, 0, 0, 0, 800])
    expect(serie.saldo).toEqual([0, 600, 0, 0, 0, -300])
  })

  it('ignora meses fora da janela e atravessa a virada de ano', () => {
    const serie = serieMensal([
      { mes: '2025-11', receitas: 99, despesas: 0 },
      { mes: '2025-12', receitas: 10, despesas: 5 },
    ], new Date(2026, 1, 15), 3) // dez, jan, fev
    expect(serie.receitas).toEqual([10, 0, 0])
  })

  it('aceita evolução vazia ou ausente', () => {
    expect(serieMensal(undefined, agora).saldo).toEqual([0, 0, 0, 0, 0, 0])
  })
})
