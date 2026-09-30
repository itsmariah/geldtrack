import { describe, it, expect } from 'vitest'
import { fmt, fmtDate, descreverConversao } from './format'

// Intl.NumberFormat('pt-BR') separa "R$" do valor com um espaço não separável (U+00A0),
// não um espaço comum — por isso os testes usam regex com \s em vez de comparar a string exata.
describe('fmt', () => {
  it('formata valores como moeda brasileira', () => {
    expect(fmt(1234.5)).toMatch(/^R\$\s1\.234,50$/)
  })

  it('arredonda para duas casas decimais', () => {
    expect(fmt(10.005)).toMatch(/^R\$\s10,01$/)
  })

  it('formata zero corretamente', () => {
    expect(fmt(0)).toMatch(/^R\$\s0,00$/)
  })

  it('formata valores negativos', () => {
    expect(fmt(-50)).toMatch(/^-R\$\s50,00$/)
  })

  it('formata em outra moeda quando informada', () => {
    expect(fmt(50, 'USD')).toMatch(/US\$\s?50,00/)
  })
})

describe('fmtDate', () => {
  it('formata uma data YYYY-MM-DD como DD/MM/YYYY sem deslocar por fuso horário', () => {
    expect(fmtDate('2026-08-10')).toBe('10/08/2026')
  })

  it('mantém o dia correto mesmo no último dia do ano', () => {
    expect(fmtDate('2026-12-31')).toBe('31/12/2026')
  })
})

describe('descreverConversao', () => {
  it('mostra o valor original e o convertido com a data da cotação', () => {
    expect(descreverConversao({ valorOriginal: 20, moedaOriginal: 'USD', valor: 103.62, moeda: 'BRL', dataCotacao: '2026-09-30' }))
      .toMatch(/^US\$\s20,00 \(R\$\s103,62 de acordo com a cotação de 30\/09\/2026\)$/)
  })

  it('sem data, diz que o câmbio foi informado', () => {
    expect(descreverConversao({ valorOriginal: 20, moedaOriginal: 'USD', valor: 110, moeda: 'BRL', dataCotacao: null }))
      .toMatch(/pelo câmbio informado\)$/)
  })
})
