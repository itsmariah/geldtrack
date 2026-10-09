import { describe, it, expect } from 'vitest';
import { validateNomeGrupo, validateCodigoGrupo, validateNomeConvidado, validateFotoGrupo } from './validateGrupo.js';

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

describe('validateFotoGrupo', () => {
  it('aceita data URL de imagem e null (remover foto)', () => {
    expect(validateFotoGrupo('data:image/jpeg;base64,AAAA')).toBeNull();
    expect(validateFotoGrupo('data:image/png;base64,AAAA')).toBeNull();
    expect(validateFotoGrupo(null)).toBeNull();
  });

  it('rejeita o que não é data URL de imagem', () => {
    expect(validateFotoGrupo('https://exemplo.com/foto.jpg')).toMatch(/inválido/);
    expect(validateFotoGrupo('data:text/html;base64,AAAA')).toMatch(/inválido/);
    expect(validateFotoGrupo(123)).toMatch(/inválido/);
  });

  it('rejeita imagem grande demais', () => {
    expect(validateFotoGrupo('data:image/jpeg;base64,' + 'A'.repeat(2_000_000))).toMatch(/muito grande/);
  });
});
