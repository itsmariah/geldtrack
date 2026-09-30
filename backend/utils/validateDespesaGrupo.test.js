import { describe, it, expect } from 'vitest';
import { validateDespesaGrupoInput } from './validateDespesaGrupo.js';

const membros = new Set([1, 2, 3]);
const base = { descricao: 'Jantar', valorTotal: 90, data: '2026-08-10', pagoPorMembroId: 1, participanteIds: [1, 2, 3] };

describe('validateDespesaGrupoInput', () => {
  it('não retorna erro para uma despesa válida', () => {
    expect(validateDespesaGrupoInput(base, membros)).toBeNull();
  });

  it('aceita moeda ausente ou suportada, rejeita não suportada', () => {
    expect(validateDespesaGrupoInput({ ...base, moeda: 'EUR' }, membros)).toBeNull();
    expect(validateDespesaGrupoInput({ ...base, moeda: 'JPY' }, membros)).toMatch(/Moeda/);
  });

  it('exige descrição', () => {
    expect(validateDespesaGrupoInput({ ...base, descricao: '' }, membros)).toMatch(/Descrição/);
  });

  it('rejeita valor zero ou negativo', () => {
    expect(validateDespesaGrupoInput({ ...base, valorTotal: 0 }, membros)).toMatch(/maior que zero/);
    expect(validateDespesaGrupoInput({ ...base, valorTotal: -10 }, membros)).toMatch(/maior que zero/);
  });

  it('rejeita data em formato inválido', () => {
    expect(validateDespesaGrupoInput({ ...base, data: '10/08/2026' }, membros)).toMatch(/formato/);
  });

  it('exige pagador', () => {
    expect(validateDespesaGrupoInput({ ...base, pagoPorMembroId: undefined }, membros)).toMatch(/pagou/);
  });

  it('exige ao menos um participante', () => {
    expect(validateDespesaGrupoInput({ ...base, participanteIds: [] }, membros)).toMatch(/participante/);
  });

  it('rejeita participante duplicado', () => {
    expect(validateDespesaGrupoInput({ ...base, participanteIds: [1, 2, 2] }, membros)).toMatch(/duas vezes/);
  });

  it('rejeita pagador que não é membro do grupo (IDOR)', () => {
    expect(validateDespesaGrupoInput({ ...base, pagoPorMembroId: 999 }, membros)).toMatch(/Pagador não é membro/);
  });

  it('rejeita participante que não é membro do grupo (IDOR)', () => {
    expect(validateDespesaGrupoInput({ ...base, participanteIds: [1, 999] }, membros)).toMatch(/não são membros/);
  });

  it('aceita pagador que não está entre os participantes (paga o todo sem entrar no rateio)', () => {
    expect(validateDespesaGrupoInput({ ...base, pagoPorMembroId: 1, participanteIds: [2, 3] }, membros)).toBeNull();
  });
});
