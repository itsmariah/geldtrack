import { describe, it, expect } from 'vitest';
import { validatePagamentoGrupoInput } from './validatePagamentoGrupo.js';

const membros = new Set([1, 2]);
const base = { deMembroId: 2, paraMembroId: 1, valor: 45, data: '2026-08-11' };

describe('validatePagamentoGrupoInput', () => {
  it('não retorna erro para um pagamento válido, com ou sem moeda', () => {
    expect(validatePagamentoGrupoInput(base, membros)).toBeNull();
    expect(validatePagamentoGrupoInput({ ...base, moeda: 'EUR' }, membros)).toBeNull();
  });

  it('rejeita moeda não suportada', () => {
    expect(validatePagamentoGrupoInput({ ...base, moeda: 'JPY' }, membros)).toMatch(/Moeda/);
  });

  it('aceita quitação em outra moeda com moeda e valor pagos', () => {
    expect(validatePagamentoGrupoInput({ ...base, moeda: 'EUR', moedaPagamento: 'BRL', valorPagamento: 250 }, membros)).toBeNull();
  });

  it('rejeita quitação em outra moeda incompleta, na mesma moeda ou com valor inválido', () => {
    expect(validatePagamentoGrupoInput({ ...base, moeda: 'EUR', valorPagamento: 250 }, membros)).toMatch(/Moeda do pagamento/);
    expect(validatePagamentoGrupoInput({ ...base, moeda: 'EUR', moedaPagamento: 'EUR', valorPagamento: 40 }, membros)).toMatch(/diferente/);
    expect(validatePagamentoGrupoInput({ ...base, moeda: 'EUR', moedaPagamento: 'BRL', valorPagamento: 0 }, membros)).toMatch(/Valor pago/);
  });

  it('rejeita pagador e recebedor iguais', () => {
    expect(validatePagamentoGrupoInput({ ...base, paraMembroId: 2 }, membros)).toMatch(/mesma pessoa/);
  });

  it('rejeita membro de fora do grupo (IDOR)', () => {
    expect(validatePagamentoGrupoInput({ ...base, deMembroId: 99 }, membros)).toMatch(/não é membro/);
  });
});
