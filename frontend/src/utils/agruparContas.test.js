import { describe, it, expect } from 'vitest'
import { agruparContasPorInstituicao, totalDoGrupo, instituicoesUsadas } from './agruparContas'

const conta = (id, instituicao, moeda = 'BRL', saldo = 0) => ({ id, instituicao, moeda, saldo })

describe('agruparContasPorInstituicao', () => {
  it('agrupa sem diferenciar maiúsculas/espaços, na ordem da primeira aparição', () => {
    const { grupos, semInstituicao } = agruparContasPorInstituicao([
      conta(1, 'Nubank'),
      conta(2, 'Wise'),
      conta(3, null),
      conta(4, ' wise '),
      conta(5, ''),
    ])
    expect(grupos.map(g => g.nome)).toEqual(['Nubank', 'Wise'])
    expect(grupos[1].contas.map(c => c.id)).toEqual([2, 4])
    expect(semInstituicao.map(c => c.id)).toEqual([3, 5])
  })

  it('sem nenhuma instituição, não cria grupo', () => {
    expect(agruparContasPorInstituicao([conta(1, null)]).grupos).toEqual([])
  })
})

describe('totalDoGrupo', () => {
  it('soma exato na própria moeda quando todas são iguais', () => {
    expect(totalDoGrupo([conta(1, 'Wise', 'USD', 100), conta(2, 'Wise', 'USD', 50)]))
      .toEqual({ valor: 150, moeda: 'USD', aproximado: false })
  })

  it('converte pra R$ (aproximado) quando há moedas diferentes', () => {
    const total = totalDoGrupo(
      [conta(1, 'Wise', 'BRL', 400), conta(2, 'Wise', 'USD', 100)],
      { BRL: 1, USD: 5.5 }
    )
    expect(total).toEqual({ valor: 950, moeda: 'BRL', aproximado: true })
  })
})

describe('instituicoesUsadas', () => {
  it('lista cada instituição uma vez só', () => {
    expect(instituicoesUsadas([conta(1, 'Wise'), conta(2, 'wise'), conta(3, 'Nubank')])).toEqual(['Wise', 'Nubank'])
  })
})
