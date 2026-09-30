import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { serializeConta, serializeContas, withSaldo } from './serializeConta.js';

describe('serializeConta', () => {
  it('converte saldoInicial (Decimal) para number, preservando os demais campos', () => {
    const c = { id: 1, nome: 'Nubank', tipo: 'corrente', moeda: 'BRL', saldoInicial: new Prisma.Decimal('500.00'), createdAt: '2026-01-01' };
    expect(serializeConta(c)).toEqual({ id: 1, nome: 'Nubank', tipo: 'corrente', moeda: 'BRL', instituicao: null, saldoInicial: 500, createdAt: '2026-01-01' });
  });

  it('expõe a instituição quando preenchida', () => {
    const c = { id: 2, nome: 'Wise · Dólar', tipo: 'corrente', moeda: 'USD', instituicao: 'Wise', saldoInicial: new Prisma.Decimal('5000.00') };
    expect(serializeConta(c).instituicao).toBe('Wise');
  });
});

describe('serializeContas', () => {
  it('serializa uma lista inteira preservando ordem', () => {
    const list = [
      { id: 1, saldoInicial: new Prisma.Decimal('100.00') },
      { id: 2, saldoInicial: new Prisma.Decimal('200.00') },
    ];
    expect(serializeContas(list).map(c => c.saldoInicial)).toEqual([100, 200]);
  });
});

describe('withSaldo', () => {
  it('soma o saldoInicial com o movimento calculado (receitas - despesas ± transferências)', () => {
    const conta = { id: 1, saldoInicial: 500 };
    expect(withSaldo(conta, 300)).toEqual({ id: 1, saldoInicial: 500, saldo: 800 });
  });

  it('aceita movimento negativo (mais despesa/saída do que entrada)', () => {
    const conta = { id: 1, saldoInicial: 500 };
    expect(withSaldo(conta, -700).saldo).toBe(-200);
  });
});
