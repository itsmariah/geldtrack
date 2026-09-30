import { vi, describe, it, expect, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { buscarTaxas, converterParaBRL, agruparPorCategoriaTipo, taxaEntre, dataDaCotacao, converterValor } from './currency.js';

const prisma = require('../database/db');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buscarTaxas', () => {
  it('sempre inclui BRL com taxa 1, mesmo sem nenhuma linha em TaxaCambio', async () => {
    vi.spyOn(prisma.taxaCambio, 'findMany').mockResolvedValue([]);
    const taxas = await buscarTaxas();
    expect(taxas).toEqual({ BRL: 1 });
  });

  it('converte Decimal pra number e monta o mapa por moeda', async () => {
    vi.spyOn(prisma.taxaCambio, 'findMany').mockResolvedValue([
      { moeda: 'USD', taxaParaBRL: new Prisma.Decimal('5.200000') },
      { moeda: 'EUR', taxaParaBRL: new Prisma.Decimal('5.600000') },
    ]);
    const taxas = await buscarTaxas();
    expect(taxas).toEqual({ BRL: 1, USD: 5.2, EUR: 5.6 });
  });
});

describe('converterParaBRL', () => {
  it('converte usando a taxa informada', () => {
    expect(converterParaBRL(100, 'USD', { BRL: 1, USD: 5 })).toBe(500);
  });

  it('trata BRL como 1:1', () => {
    expect(converterParaBRL(100, 'BRL', { BRL: 1 })).toBe(100);
  });

  it('cai pra 1:1 quando a moeda não tem cotação salva', () => {
    expect(converterParaBRL(100, 'JPY', { BRL: 1 })).toBe(100);
  });
});

describe('agruparPorCategoriaTipo', () => {
  const moedaPorConta = new Map([[1, 'BRL'], [2, 'USD']]);
  const taxas = { BRL: 1, USD: 5 };

  it('soma direto quando todas as linhas são na mesma moeda', () => {
    const rows = [
      { contaId: 1, categoria: 'Lazer', tipo: 'despesa', _sum: { valor: 100 } },
      { contaId: 1, categoria: 'Lazer', tipo: 'despesa', _sum: { valor: 50 } },
    ];
    expect(agruparPorCategoriaTipo(rows, moedaPorConta, taxas)).toEqual([
      { categoria: 'Lazer', tipo: 'despesa', total: 150 },
    ]);
  });

  it('converte cada linha pra BRL antes de somar quando as contas têm moedas diferentes', () => {
    const rows = [
      { contaId: 1, categoria: 'Lazer', tipo: 'despesa', _sum: { valor: 100 } }, // R$100
      { contaId: 2, categoria: 'Lazer', tipo: 'despesa', _sum: { valor: 20 } }, // US$20 -> R$100
    ];
    expect(agruparPorCategoriaTipo(rows, moedaPorConta, taxas)).toEqual([
      { categoria: 'Lazer', tipo: 'despesa', total: 200 },
    ]);
  });

  it('mantém categorias/tipos diferentes em grupos separados', () => {
    const rows = [
      { contaId: 1, categoria: 'Lazer', tipo: 'despesa', _sum: { valor: 100 } },
      { contaId: 1, categoria: 'Salário', tipo: 'receita', _sum: { valor: 5000 } },
    ];
    const resultado = agruparPorCategoriaTipo(rows, moedaPorConta, taxas);
    expect(resultado).toHaveLength(2);
    expect(resultado).toContainEqual({ categoria: 'Lazer', tipo: 'despesa', total: 100 });
    expect(resultado).toContainEqual({ categoria: 'Salário', tipo: 'receita', total: 5000 });
  });
});

describe('taxaEntre', () => {
  it('calcula a taxa cruzada pela cotação em R$, com 6 casas', () => {
    expect(taxaEntre('USD', 'BRL', { BRL: 1, USD: 5.181 })).toBe(5.181);
    expect(taxaEntre('EUR', 'USD', { BRL: 1, USD: 5, EUR: 6 })).toBe(1.2);
    expect(taxaEntre('BRL', 'USD', { BRL: 1, USD: 3 })).toBe(0.333333);
  });

  it('retorna null quando falta cotação de alguma das moedas', () => {
    expect(taxaEntre('GBP', 'BRL', { BRL: 1 })).toBeNull();
  });
});

describe('dataDaCotacao', () => {
  it('usa a cotação mais antiga, no horário de Brasília', () => {
    const atualizadoEm = { USD: new Date('2026-09-30T02:00:00.000Z'), EUR: new Date('2026-09-30T15:00:00.000Z') };
    // 02:00 UTC = 23:00 do dia anterior em Brasília
    expect(dataDaCotacao(['USD', 'EUR'], atualizadoEm)).toBe('2026-09-29');
    expect(dataDaCotacao(['EUR', 'BRL'], atualizadoEm)).toBe('2026-09-30');
  });

  it('retorna null sem nenhuma cotação datada', () => {
    expect(dataDaCotacao(['BRL'], {})).toBeNull();
  });
});

describe('converterValor', () => {
  it('arredonda em centavos e nunca devolve zero', () => {
    expect(converterValor(20, 5.181)).toBe(103.62);
    expect(converterValor(0.01, 0.18)).toBe(0.01);
  });
});
