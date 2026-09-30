import { describe, it, expect } from 'vitest';
const { reorderLista } = require('./reorderLista');

describe('reorderLista', () => {
  it('grava -n..-1 na nova ordem (topo = mais negativo, registro novo com 0 cai no fim)', () => {
    expect(reorderLista([1, 2, 3], [3, 1, 2])).toEqual({
      ordens: [{ id: 3, ordem: -3 }, { id: 1, ordem: -2 }, { id: 2, ordem: -1 }],
    });
  });

  it('aceita ids como string (vindos do JSON)', () => {
    expect(reorderLista([1, 2], ['2', '1']).ordens.map(o => o.id)).toEqual([2, 1]);
  });

  it('recusa lista vazia, inválida ou com repetidos', () => {
    expect(reorderLista([1], [])).toHaveProperty('erro');
    expect(reorderLista([1], 'x')).toHaveProperty('erro');
    expect(reorderLista([1, 2], [1, 'a'])).toHaveProperty('erro');
    expect(reorderLista([1, 2], [1, 1])).toHaveProperty('erro');
  });

  it('recusa lista incompleta ou com item de fora (ex: de outra família)', () => {
    expect(reorderLista([1, 2, 3], [1, 2])).toHaveProperty('erro');
    expect(reorderLista([1, 2], [1, 2, 99])).toHaveProperty('erro');
    expect(reorderLista([1, 2], [1, 99])).toHaveProperty('erro');
  });
});
