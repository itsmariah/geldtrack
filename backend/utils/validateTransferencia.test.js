import { describe, it, expect } from 'vitest';
import { validateTransferenciaInput } from './validateTransferencia.js';

describe('validateTransferenciaInput', () => {
  const base = { contaOrigemId: 1, contaDestinoId: 2, valor: 100, data: '2026-08-10' };

  it('não retorna erro para uma transferência válida', () => {
    expect(validateTransferenciaInput(base)).toBeNull();
  });

  it('exige conta de origem e destino', () => {
    expect(validateTransferenciaInput({ ...base, contaOrigemId: null })).toMatch(/obrigatórias/);
    expect(validateTransferenciaInput({ ...base, contaDestinoId: null })).toMatch(/obrigatórias/);
  });

  it('rejeita origem igual ao destino', () => {
    expect(validateTransferenciaInput({ ...base, contaDestinoId: 1 })).toMatch(/diferente/);
  });

  it('rejeita valor zero ou negativo', () => {
    expect(validateTransferenciaInput({ ...base, valor: 0 })).toMatch(/maior que zero/);
    expect(validateTransferenciaInput({ ...base, valor: -10 })).toMatch(/maior que zero/);
  });

  it('aceita valorDestino ausente, mas rejeita valorDestino zero ou negativo', () => {
    expect(validateTransferenciaInput(base)).toBeNull();
    expect(validateTransferenciaInput({ ...base, valorDestino: 72.3 })).toBeNull();
    expect(validateTransferenciaInput({ ...base, valorDestino: 0 })).toMatch(/Valor recebido/);
    expect(validateTransferenciaInput({ ...base, valorDestino: -5 })).toMatch(/Valor recebido/);
  });

  it('rejeita data em formato inválido', () => {
    expect(validateTransferenciaInput({ ...base, data: '10/08/2026' })).toMatch(/YYYY-MM-DD/);
  });
});
