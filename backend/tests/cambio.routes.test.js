import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createTestApp } from './testApp.js';
import { makeToken } from './makeToken.js';

const prisma = require('../database/db');
const app = createTestApp();
const token = makeToken(7);

beforeEach(() => {
  vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'dono' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/cambio', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/cambio');
    expect(res.status).toBe(401);
  });

  it('retorna as moedas suportadas e as taxas atuais (BRL sempre 1)', async () => {
    vi.spyOn(prisma.taxaCambio, 'findMany').mockResolvedValue([
      { moeda: 'USD', taxaParaBRL: new Prisma.Decimal('5.200000'), atualizadoEm: new Date('2026-09-30T12:00:00.000Z') },
    ]);

    const res = await request(app).get('/api/cambio').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.taxas).toEqual({ BRL: 1, USD: 5.2 });
    expect(res.body.atualizadoEm).toEqual({ USD: '2026-09-30T12:00:00.000Z' });
    expect(res.body.moedas.map(m => m.codigo)).toEqual(['BRL', 'USD', 'EUR', 'GBP']);
  });
});

describe('POST /api/cambio/atualizar', () => {
  it('busca a cotação na API externa e grava a taxa invertida (1/rate)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success', base_code: 'BRL', rates: { BRL: 1, USD: 0.2, EUR: 0.18, GBP: 0.15, JPY: 30 } }),
    });
    const upsertSpy = vi.spyOn(prisma.taxaCambio, 'upsert').mockResolvedValue({});
    vi.spyOn(prisma.taxaCambio, 'findMany').mockResolvedValue([
      { moeda: 'USD', taxaParaBRL: new Prisma.Decimal('5') },
      { moeda: 'EUR', taxaParaBRL: new Prisma.Decimal('5.555556') },
      { moeda: 'GBP', taxaParaBRL: new Prisma.Decimal('6.666667') },
    ]);

    const res = await request(app).post('/api/cambio/atualizar').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalledTimes(3); // USD, EUR, GBP — nunca BRL, nunca JPY (não suportada)
    const usdCall = upsertSpy.mock.calls.find(c => c[0].where.moeda === 'USD');
    expect(usdCall[0].create.taxaParaBRL).toBeCloseTo(5, 5); // 1 / 0.2
    expect(res.body.taxas.USD).toBe(5);
  });

  it('retorna 502 quando a API externa falha', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const upsertSpy = vi.spyOn(prisma.taxaCambio, 'upsert');

    const res = await request(app).post('/api/cambio/atualizar').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(502);
    expect(upsertSpy).not.toHaveBeenCalled();
  });

  it('retorna 502 quando a resposta não tem o formato esperado', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: 'error' }) });

    const res = await request(app).post('/api/cambio/atualizar').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(502);
  });
});
