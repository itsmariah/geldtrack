import { describe, it, expect } from 'vitest';
const { hojeEmSaoPaulo, semanaAnterior, mesAnterior, periodoAntesDe } = require('./periodosResumo');

describe('hojeEmSaoPaulo', () => {
  it('usa o dia de Brasília, não o de UTC', () => {
    // 01:30 UTC do dia 1 ainda é 22:30 do dia 30 em Brasília.
    expect(hojeEmSaoPaulo(new Date('2026-10-01T01:30:00Z'))).toBe('2026-09-30');
  });
});

describe('semanaAnterior', () => {
  it('numa segunda, é a semana de segunda a domingo que acabou de fechar', () => {
    expect(semanaAnterior('2026-10-05')).toEqual({ chave: '2026-09-28', inicio: '2026-09-28', fim: '2026-10-04' });
  });

  it('em qualquer outro dia da semana, continua sendo a última semana completa', () => {
    expect(semanaAnterior('2026-10-08').chave).toBe('2026-09-28'); // quinta
    expect(semanaAnterior('2026-10-11').chave).toBe('2026-09-28'); // domingo
  });
});

describe('mesAnterior', () => {
  it('é o último mês completo, virando o ano em janeiro', () => {
    expect(mesAnterior('2026-10-01')).toEqual({ chave: '2026-09', inicio: '2026-09-01', fim: '2026-09-30' });
    expect(mesAnterior('2027-01-15')).toEqual({ chave: '2026-12', inicio: '2026-12-01', fim: '2026-12-31' });
  });
});

describe('periodoAntesDe', () => {
  it('semana e mês imediatamente anteriores', () => {
    expect(periodoAntesDe('semanal', semanaAnterior('2026-10-05')).chave).toBe('2026-09-21');
    expect(periodoAntesDe('mensal', mesAnterior('2026-10-01')).chave).toBe('2026-08');
  });
});
