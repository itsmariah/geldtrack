import { describe, it, expect } from 'vitest';
import { reorderDia } from './reorderDia.js';

describe('reorderDia', () => {
  it('reordena o dia inteiro', () => {
    expect(reorderDia([1, 2, 3], [3, 1, 2])).toEqual({ ordem: [3, 1, 2] });
  });

  it('mantém no lugar os itens do dia que não estavam na tela (filtro/paginação)', () => {
    // Dia [1, 2, 3, 4, 5]; a tela só mostrava 2, 4 e 5 e o usuário inverteu os três.
    expect(reorderDia([1, 2, 3, 4, 5], [5, 4, 2])).toEqual({ ordem: [1, 5, 3, 4, 2] });
  });

  it('aceita ids como string (vindos do JSON)', () => {
    expect(reorderDia([1, 2], ['2', '1'])).toEqual({ ordem: [2, 1] });
  });

  it('rejeita menos de dois itens', () => {
    expect(reorderDia([1, 2], [1]).erro).toBeDefined();
    expect(reorderDia([1, 2], undefined).erro).toBeDefined();
  });

  it('rejeita ids repetidos', () => {
    expect(reorderDia([1, 2, 3], [1, 1]).erro).toBeDefined();
  });

  it('rejeita id que não é do dia (outro dia ou outra família)', () => {
    expect(reorderDia([1, 2], [1, 99]).erro).toBeDefined();
  });

  it('rejeita id não numérico', () => {
    expect(reorderDia([1, 2], [1, 'abc']).erro).toBeDefined();
  });
});
