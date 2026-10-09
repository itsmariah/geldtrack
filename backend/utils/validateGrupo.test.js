import { describe, it, expect } from 'vitest';
import { validateNomeGrupo, validateCodigoGrupo, validateNomeConvidado } from './validateGrupo.js';

describe('validateNomeGrupo', () => {
  it('não retorna erro para um nome válido', () => {
    expect(validateNomeGrupo('Viagem Nordeste')).toBeNull();
  });

  it('exige nome', () => {
    expect(validateNomeGrupo('')).toMatch(/obrigatório/);
    expect(validateNomeGrupo('   ')).toMatch(/obrigatório/);
  });

  it('rejeita nome maior que 60 caracteres', () => {
    expect(validateNomeGrupo('a'.repeat(61))).toMatch(/máximo 60/);
    expect(validateNomeGrupo('a'.repeat(60))).toBeNull();
  });
});

describe('validateCodigoGrupo', () => {
  it('não retorna erro para um código informado', () => {
    expect(validateCodigoGrupo('AB3F92')).toBeNull();
  });

  it('exige código', () => {
    expect(validateCodigoGrupo('')).toMatch(/obrigatório/);
    expect(validateCodigoGrupo(undefined)).toMatch(/obrigatório/);
  });
});

describe('validateNomeConvidado', () => {
  it('não retorna erro para um nome válido', () => {
    expect(validateNomeConvidado('Carlos')).toBeNull();
  });

  it('exige nome', () => {
    expect(validateNomeConvidado('')).toMatch(/obrigatório/);
    expect(validateNomeConvidado('   ')).toMatch(/obrigatório/);
  });

  it('rejeita nome maior que 60 caracteres', () => {
    expect(validateNomeConvidado('a'.repeat(61))).toMatch(/máximo 60/);
  });
});
