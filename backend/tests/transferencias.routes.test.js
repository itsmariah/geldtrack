import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createTestApp } from './testApp.js';
import { makeToken } from './makeToken.js';

// Ver comentário em auth.routes.test.js: usamos vi.spyOn no singleton real do
// Prisma em vez de vi.mock, porque vi.mock não intercepta require() dentro de
// arquivos CJS neste projeto.
const prisma = require('../database/db');
const app = createTestApp();
const token = makeToken(7);

const rawTransferencia = (overrides = {}) => ({
  id: 1,
  usuarioId: 7,
  contaOrigemId: 1,
  contaDestinoId: 2,
  valor: new Prisma.Decimal('300.00'),
  data: '2026-08-10',
  descricao: '',
  createdAt: new Date(),
  contaOrigem: { nome: 'Nubank' },
  contaDestino: { nome: 'Cartão' },
  ...overrides,
});

beforeEach(() => {
  // authMiddleware confere tokenVersion e resolve a família a cada requisição autenticada.
  vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'dono' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/transferencias', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/transferencias');
    expect(res.status).toBe(401);
  });

  it('lista as transferências do usuário com o nome das contas', async () => {
    vi.spyOn(prisma.transferencia, 'findMany').mockResolvedValue([rawTransferencia()]);

    const res = await request(app).get('/api/transferencias').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ contaOrigemNome: 'Nubank', contaDestinoNome: 'Cartão', valor: 300 });
  });

  it('escopa a busca por familiaId do token', async () => {
    const findSpy = vi.spyOn(prisma.transferencia, 'findMany').mockResolvedValue([]);
    await request(app).get('/api/transferencias?usuarioId=999').set('Authorization', `Bearer ${token}`);
    expect(findSpy.mock.calls[0][0].where.familiaId).toBe(1);
  });
});

describe('POST /api/transferencias', () => {
  it('rejeita corpo inválido (400) e não chama o Prisma', async () => {
    const createSpy = vi.spyOn(prisma.transferencia, 'create');

    const res = await request(app)
      .post('/api/transferencias')
      .set('Authorization', `Bearer ${token}`)
      .send({ contaOrigemId: 1, contaDestinoId: 1, valor: 100, data: '2026-08-10' });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejeita quando alguma das contas não pertence ao usuário (400, proteção contra IDOR)', async () => {
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([{ id: 1, usuarioId: 7 }]); // só achou 1 das 2
    const createSpy = vi.spyOn(prisma.transferencia, 'create');

    const res = await request(app)
      .post('/api/transferencias')
      .set('Authorization', `Bearer ${token}`)
      .send({ contaOrigemId: 1, contaDestinoId: 999, valor: 100, data: '2026-08-10' });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('cria a transferência com o usuarioId do token, mesmo que o body tente outro', async () => {
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([{ id: 1, usuarioId: 7 }, { id: 2, usuarioId: 7 }]);
    const createSpy = vi.spyOn(prisma.transferencia, 'create').mockResolvedValue(rawTransferencia());

    const res = await request(app)
      .post('/api/transferencias')
      .set('Authorization', `Bearer ${token}`)
      .send({ usuarioId: 999, contaOrigemId: 1, contaDestinoId: 2, valor: 300, data: '2026-08-10' });

    expect(res.status).toBe(201);
    expect(createSpy.mock.calls[0][0].data.usuarioId).toBe(7);
  });

  it('permite transferência entre contas na mesma moeda', async () => {
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([{ id: 1, moeda: 'USD' }, { id: 2, moeda: 'USD' }]);
    const createSpy = vi.spyOn(prisma.transferencia, 'create').mockResolvedValue(rawTransferencia());

    const res = await request(app)
      .post('/api/transferencias')
      .set('Authorization', `Bearer ${token}`)
      .send({ contaOrigemId: 1, contaDestinoId: 2, valor: 100, data: '2026-08-10' });

    expect(res.status).toBe(201);
    expect(createSpy).toHaveBeenCalled();
  });

  it('exige o valor recebido entre contas de moedas diferentes (400)', async () => {
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([{ id: 1, moeda: 'BRL' }, { id: 2, moeda: 'USD' }]);
    const createSpy = vi.spyOn(prisma.transferencia, 'create');

    const res = await request(app)
      .post('/api/transferencias')
      .set('Authorization', `Bearer ${token}`)
      .send({ contaOrigemId: 1, contaDestinoId: 2, valor: 400, data: '2026-08-10' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valor recebido/);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('cria transferência entre moedas guardando o valor recebido no destino', async () => {
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([{ id: 1, moeda: 'BRL' }, { id: 2, moeda: 'USD' }]);
    const createSpy = vi.spyOn(prisma.transferencia, 'create').mockResolvedValue(rawTransferencia({
      valor: new Prisma.Decimal('400.00'), valorDestino: new Prisma.Decimal('72.30'),
      contaOrigem: { nome: 'Nubank', moeda: 'BRL' }, contaDestino: { nome: 'Wise · Dólar', moeda: 'USD' },
    }));

    const res = await request(app)
      .post('/api/transferencias')
      .set('Authorization', `Bearer ${token}`)
      .send({ contaOrigemId: 1, contaDestinoId: 2, valor: 400, valorDestino: 72.3, data: '2026-08-10' });

    expect(res.status).toBe(201);
    expect(createSpy.mock.calls[0][0].data).toMatchObject({ valor: 400, valorDestino: 72.3 });
    expect(res.body).toMatchObject({ valor: 400, moeda: 'BRL', valorDestino: 72.3, moedaDestino: 'USD' });
  });

  it('descarta valorDestino na mesma moeda (chegou exatamente o que saiu)', async () => {
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([{ id: 1, moeda: 'BRL' }, { id: 2, moeda: 'BRL' }]);
    const createSpy = vi.spyOn(prisma.transferencia, 'create').mockResolvedValue(rawTransferencia());

    await request(app)
      .post('/api/transferencias')
      .set('Authorization', `Bearer ${token}`)
      .send({ contaOrigemId: 1, contaDestinoId: 2, valor: 300, valorDestino: 999, data: '2026-08-10' });

    expect(createSpy.mock.calls[0][0].data.valorDestino).toBeNull();
  });
});

describe('DELETE /api/transferencias/:id', () => {
  it('retorna 404 quando a transferência não é do usuário', async () => {
    vi.spyOn(prisma.transferencia, 'findFirst').mockResolvedValue(null);
    const res = await request(app).delete('/api/transferencias/999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('exclui e retorna 204 quando a transferência é do usuário', async () => {
    vi.spyOn(prisma.transferencia, 'findFirst').mockResolvedValue(rawTransferencia());
    const deleteSpy = vi.spyOn(prisma.transferencia, 'delete').mockResolvedValue({});

    const res = await request(app).delete('/api/transferencias/1').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
