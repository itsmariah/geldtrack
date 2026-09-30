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

  it('rejeita pagador e recebedor iguais', () => {
    expect(validatePagamentoGrupoInput({ ...base, paraMembroId: 2 }, membros)).toMatch(/mesma pessoa/);
  });

  it('rejeita membro de fora do grupo (IDOR)', () => {
    expect(validatePagamentoGrupoInput({ ...base, deMembroId: 99 }, membros)).toMatch(/não é membro/);
  });
});
