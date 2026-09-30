import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
const { descricaoTransacaoGrupo, parteDoMembro, descricaoTransacaoPagamento, valorRecebido, descricaoComGrupoRenomeado } = require('./despesaGrupoTransacao');

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

describe('descricaoTransacaoPagamento', () => {
  it('nomeia quem pagou e o grupo', () => {
    expect(descricaoTransacaoPagamento('Bruno', 'Viagem Rio')).toBe('Pagamento de Bruno (Viagem Rio)');
  });
});

describe('valorRecebido', () => {
  it('usa valor/moeda do saldo quando o pagamento foi na mesma moeda', () => {
    expect(valorRecebido({ valor: new Prisma.Decimal('40.00'), moeda: 'EUR', moedaPagamento: null, valorPagamento: null }))
      .toEqual({ valor: 40, moeda: 'EUR' });
  });

  it('usa o que de fato mudou de mão quando foi quitado em outra moeda', () => {
    expect(valorRecebido({ valor: new Prisma.Decimal('40.00'), moeda: 'EUR', moedaPagamento: 'BRL', valorPagamento: new Prisma.Decimal('250.00') }))
      .toEqual({ valor: 250, moeda: 'BRL' });
  });
});

describe('descricaoComGrupoRenomeado', () => {
  it('troca só o sufixo com o nome antigo', () => {
    expect(descricaoComGrupoRenomeado('Jantar (Rio)', 'Rio', 'Rio 2026')).toBe('Jantar (Rio 2026)');
    expect(descricaoComGrupoRenomeado('Pagamento de Bruno (Rio)', 'Rio', 'Sul')).toBe('Pagamento de Bruno (Sul)');
  });

  it('não mexe (null) em descrição editada pelo usuário ou quando o nome não mudou', () => {
    expect(descricaoComGrupoRenomeado('Jantar com a turma', 'Rio', 'Sul')).toBeNull();
    expect(descricaoComGrupoRenomeado('Jantar (Rio)', 'Rio', 'Rio')).toBeNull();
  });
});
