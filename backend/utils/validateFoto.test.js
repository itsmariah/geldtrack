import { describe, it, expect } from 'vitest';
import { validateFoto } from './validateFoto.js';

describe('validateFoto', () => {
  it('aceita data URL de imagem e null (remover foto)', () => {
    expect(validateFoto('data:image/jpeg;base64,AAAA')).toBeNull();
    expect(validateFoto('data:image/png;base64,AAAA')).toBeNull();
    expect(validateFoto(null)).toBeNull();
  });

  it('rejeita o que não é data URL de imagem', () => {
    expect(validateFoto('https://exemplo.com/foto.jpg')).toMatch(/inválido/);
    expect(validateFoto('data:text/html;base64,AAAA')).toMatch(/inválido/);
    expect(validateFoto(123)).toMatch(/inválido/);
  });

  it('rejeita imagem grande demais', () => {
    expect(validateFoto('data:image/jpeg;base64,' + 'A'.repeat(2_000_000))).toMatch(/muito grande/);
  });
});
