import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
const { descricaoTransacaoGrupo, parteDoMembro } = require('./despesaGrupoTransacao');

describe('descricaoTransacaoGrupo', () => {
  it('inclui o nome do grupo entre parênteses', () => {
    expect(descricaoTransacaoGrupo('Jantar', 'Viagem Rio')).toBe('Jantar (Viagem Rio)');
  });
});

describe('parteDoMembro', () => {
  const divisoes = [
    { membroId: 1, valorDevido: new Prisma.Decimal('33.34') },
    { membroId: 2, valorDevido: new Prisma.Decimal('33.33') },
  ];

  it('retorna o valorDevido do membro como number', () => {
    expect(parteDoMembro(divisoes, 1)).toBe(33.34);
  });

  it('retorna 0 quando o membro não participa do rateio', () => {
    expect(parteDoMembro(divisoes, 3)).toBe(0);
    expect(parteDoMembro(undefined, 1)).toBe(0);
  });
});
