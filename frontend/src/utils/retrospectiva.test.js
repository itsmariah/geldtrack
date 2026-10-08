import { describe, it, expect } from 'vitest'
import { calcularRetrospectiva, gastosPorDia, nivelDoDia, nomeDoMes, mesAnterior } from './retrospectiva'

const brl = { nome: 'Nubank', moeda: 'BRL' }
const usd = { nome: 'Wise', moeda: 'USD' }
const TX = [
  { tipo: 'receita', valor: 5000, categoria: 'Salário', data: '2026-09-05', conta: brl },
  { tipo: 'despesa', valor: 1800, categoria: 'Moradia', descricao: 'Aluguel', data: '2026-09-05', conta: brl },
  { tipo: 'despesa', valor: 100, categoria: 'Alimentação', descricao: 'Mercado', data: '2026-09-10', conta: brl },
  { tipo: 'despesa', valor: 50, categoria: 'Alimentação', descricao: 'Padaria', data: '2026-09-10', conta: brl },
  { tipo: 'despesa', valor: 20, categoria: 'Lazer', descricao: 'Cinema', data: '2026-09-20', conta: usd },
]
const TAXAS = { BRL: 1, USD: 5 }

describe('gastosPorDia', () => {
  it('soma só despesas, por dia, convertendo moedas', () => {
    expect(gastosPorDia(TX, TAXAS)).toEqual({ '2026-09-05': 1800, '2026-09-10': 150, '2026-09-20': 100 })
  })
})

describe('nivelDoDia', () => {
  it('escala de 0 a 4 em relação ao maior dia', () => {
    expect(nivelDoDia(0, 100)).toBe(0)
    expect(nivelDoDia(10, 100)).toBe(1)
    expect(nivelDoDia(40, 100)).toBe(2)
    expect(nivelDoDia(60, 100)).toBe(3)
    expect(nivelDoDia(100, 100)).toBe(4)
  })
})

describe('calcularRetrospectiva', () => {
  const r = calcularRetrospectiva(TX, {
    mes: '2026-09',
    taxas: TAXAS,
    evolucao: [{ mes: '2026-08', receitas: 5000, despesas: 2600 }],
    hoje: new Date(2026, 9, 7),
  })

  it('totaliza receitas, despesas e saldo em reais', () => {
    expect(r.receitas).toBe(5000)
    expect(r.despesas).toBe(2050)
    expect(r.saldo).toBe(2950)
    expect(r.qtdTransacoes).toBe(5)
  })

  it('acha a categoria campeã, o maior gasto e o dia mais gastador', () => {
    expect(r.topCategorias[0]).toEqual({ categoria: 'Moradia', total: 1800, pct: 88 })
    expect(r.topCategorias.map(c => c.categoria)).toEqual(['Moradia', 'Alimentação', 'Lazer'])
    expect(r.maiorDespesa).toMatchObject({ descricao: 'Aluguel', valor: 1800 })
    expect(r.diaMaisGastador).toEqual({ data: '2026-09-05', total: 1800 })
  })

  it('conta dias sem gastar no mês inteiro (mês já fechado)', () => {
    expect(r.diasConsiderados).toBe(30)
    expect(r.diasSemGastar).toBe(27)
  })

  it('no mês corrente só conta até hoje', () => {
    const atual = calcularRetrospectiva(TX, { mes: '2026-09', taxas: TAXAS, hoje: new Date(2026, 8, 12) })
    expect(atual.diasConsiderados).toBe(12)
    expect(atual.diasSemGastar).toBe(10)
  })

  it('compara com o mês anterior', () => {
    expect(r.comparacao).toEqual({ mesAnterior: '2026-08', despesasAnterior: 2600, variacaoPct: -21 })
  })

  it('sem dados do mês anterior, não inventa variação', () => {
    expect(calcularRetrospectiva(TX, { mes: '2026-09', taxas: TAXAS }).comparacao.variacaoPct).toBeNull()
  })

  it('mês vazio não quebra', () => {
    const vazio = calcularRetrospectiva([], { mes: '2026-09', hoje: new Date(2026, 9, 7) })
    expect(vazio.maiorDespesa).toBeNull()
    expect(vazio.topCategorias).toEqual([])
    expect(vazio.diasSemGastar).toBe(30)
  })
})

describe('nomeDoMes / mesAnterior', () => {
  it('formata o nome do mês e acha o anterior virando o ano', () => {
    expect(nomeDoMes('2026-09')).toBe('setembro')
    expect(nomeDoMes('2026-09', { comAno: true })).toBe('setembro de 2026')
    expect(mesAnterior(new Date(2026, 0, 15))).toBe('2025-12')
  })
})
