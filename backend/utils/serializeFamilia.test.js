import { describe, it, expect } from 'vitest';
import { serializeFamilia } from './serializeFamilia.js';

describe('serializeFamilia', () => {
  it('expõe id, nome, foto, código e membros com foto e papel (não papelFamilia)', () => {
    const familia = {
      id: 1,
      nome: 'Família de Mariah',
      codigo: 'WM2BST',
      createdAt: new Date(),
      membros: [
        { id: 7, nome: 'Mariah', email: 'mariah@example.com', foto: 'data:image/jpeg;base64,AAA', papelFamilia: 'dono' },
        { id: 8, nome: 'Parceiro', email: 'parceiro@example.com', papelFamilia: 'membro' },
      ],
    };

    expect(serializeFamilia(familia)).toEqual({
      id: 1,
      nome: 'Família de Mariah',
      foto: null,
      codigo: 'WM2BST',
      membros: [
        { id: 7, nome: 'Mariah', email: 'mariah@example.com', foto: 'data:image/jpeg;base64,AAA', papel: 'dono' },
        { id: 8, nome: 'Parceiro', email: 'parceiro@example.com', foto: null, papel: 'membro' },
      ],
    });
  });

  it('devolve a foto da família quando existe', () => {
    expect(serializeFamilia({ id: 1, nome: 'X', foto: 'data:image/jpeg;base64,AAA', codigo: 'Y', membros: [] }).foto).toBe('data:image/jpeg;base64,AAA');
  });

  it('lida com família sem membros', () => {
    expect(serializeFamilia({ id: 1, nome: 'X', codigo: 'Y', membros: [] })).toEqual({
      id: 1, nome: 'X', foto: null, codigo: 'Y', membros: [],
    });
  });
});
