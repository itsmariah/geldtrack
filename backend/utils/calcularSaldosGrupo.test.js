import { describe, it, expect } from 'vitest';
import { calcularSaldosGrupo } from './calcularSaldosGrupo.js';

describe('calcularSaldosGrupo', () => {
  it('retorna lista vazia sem despesas', () => {
    expect(calcularSaldosGrupo([])).toEqual([]);
  });

  it('despesa única com 3 participantes: os outros dois devem pro pagador', () => {
    const despesas = [
      { pagoPorMembroId: 1, divisoes: [{ membroId: 1, valorDevido: 30 }, { membroId: 2, valorDevido: 30 }, { membroId: 3, valorDevido: 30 }] },
    ];
    const saldos = calcularSaldosGrupo(despesas);
    expect(saldos).toEqual([
      { deMembroId: 2, paraMembroId: 1, valor: 30, moeda: 'BRL' },
      { deMembroId: 3, paraMembroId: 1, valor: 30, moeda: 'BRL' },
    ]);
  });

  it('duas despesas cruzadas entre o mesmo par se compensam numa única entrada líquida', () => {
    const despesas = [
      { pagoPorMembroId: 1, divisoes: [{ membroId: 1, valorDevido: 50 }, { membroId: 2, valorDevido: 50 }] }, // 2 deve 50 pra 1
      { pagoPorMembroId: 2, divisoes: [{ membroId: 1, valorDevido: 20 }, { membroId: 2, valorDevido: 20 }] }, // 1 deve 20 pra 2
    ];
    const saldos = calcularSaldosGrupo(despesas);
    expect(saldos).toEqual([{ deMembroId: 2, paraMembroId: 1, valor: 30, moeda: 'BRL' }]);
  });

  it('pagador que não está entre os participantes da própria despesa (paga o todo sem entrar no rateio)', () => {
    const despesas = [
      { pagoPorMembroId: 1, divisoes: [{ membroId: 2, valorDevido: 25 }, { membroId: 3, valorDevido: 25 }] },
    ];
    const saldos = calcularSaldosGrupo(despesas);
    expect(saldos).toEqual([
      { deMembroId: 2, paraMembroId: 1, valor: 25, moeda: 'BRL' },
      { deMembroId: 3, paraMembroId: 1, valor: 25, moeda: 'BRL' },
    ]);
  });

  it('triângulo A->B->C->A: nada é simplificado, as 3 arestas brutas aparecem', () => {
    const despesas = [
      { pagoPorMembroId: 2, divisoes: [{ membroId: 1, valorDevido: 10 }, { membroId: 2, valorDevido: 0 }] }, // 1 deve 10 pra 2
      { pagoPorMembroId: 3, divisoes: [{ membroId: 2, valorDevido: 20 }, { membroId: 3, valorDevido: 0 }] }, // 2 deve 20 pra 3
      { pagoPorMembroId: 1, divisoes: [{ membroId: 3, valorDevido: 30 }, { membroId: 1, valorDevido: 0 }] }, // 3 deve 30 pra 1
    ];
    const saldos = calcularSaldosGrupo(despesas);
    expect(saldos).toHaveLength(3);
    expect(saldos).toEqual(expect.arrayContaining([
      { deMembroId: 1, paraMembroId: 2, valor: 10, moeda: 'BRL' },
      { deMembroId: 2, paraMembroId: 3, valor: 20, moeda: 'BRL' },
      { deMembroId: 3, paraMembroId: 1, valor: 30, moeda: 'BRL' },
    ]));
  });

  it('não gera entrada quando o par zera exatamente', () => {
    const despesas = [
      { pagoPorMembroId: 1, divisoes: [{ membroId: 1, valorDevido: 40 }, { membroId: 2, valorDevido: 40 }] },
      { pagoPorMembroId: 2, divisoes: [{ membroId: 1, valorDevido: 40 }, { membroId: 2, valorDevido: 40 }] },
    ];
    expect(calcularSaldosGrupo(despesas)).toEqual([]);
  });

  it('separa as dívidas por moeda, sem converter, com BRL primeiro', () => {
    const despesas = [
      { pagoPorMembroId: 1, moeda: 'EUR', divisoes: [{ membroId: 1, valorDevido: 40 }, { membroId: 2, valorDevido: 40 }] },
      { pagoPorMembroId: 1, divisoes: [{ membroId: 1, valorDevido: 300 }, { membroId: 2, valorDevido: 300 }] }, // sem moeda = BRL
      { pagoPorMembroId: 2, moeda: 'EUR', divisoes: [{ membroId: 1, valorDevido: 10 }, { membroId: 2, valorDevido: 10 }] },
    ];
    expect(calcularSaldosGrupo(despesas)).toEqual([
      { deMembroId: 2, paraMembroId: 1, valor: 300, moeda: 'BRL' },
      { deMembroId: 2, paraMembroId: 1, valor: 30, moeda: 'EUR' },
    ]);
  });

  it('pagamento só abate o saldo da própria moeda', () => {
    const despesas = [
      { pagoPorMembroId: 1, moeda: 'EUR', divisoes: [{ membroId: 1, valorDevido: 40 }, { membroId: 2, valorDevido: 40 }] },
      { pagoPorMembroId: 1, moeda: 'BRL', divisoes: [{ membroId: 1, valorDevido: 100 }, { membroId: 2, valorDevido: 100 }] },
    ];
    const pagamentos = [{ deMembroId: 2, paraMembroId: 1, valor: 40, moeda: 'EUR' }];
    expect(calcularSaldosGrupo(despesas, pagamentos)).toEqual([
      { deMembroId: 2, paraMembroId: 1, valor: 100, moeda: 'BRL' },
    ]);
  });
});
