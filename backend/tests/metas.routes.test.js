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

const rawMeta = (overrides = {}) => ({
  id: 1,
  usuarioId: 7,
  titulo: 'Viagem',
  valorAlvo: new Prisma.Decimal('3000.00'),
  prazo: '2026-12-31',
  createdAt: new Date(),
  aportes: [],
  ...overrides,
});

beforeEach(() => {
  // authMiddleware confere tokenVersion e resolve a família a cada requisição autenticada.
  vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'dono' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/metas', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/metas');
    expect(res.status).toBe(401);
  });

  it('lista as metas do usuário com valorAtual calculado pelos aportes', async () => {
    vi.spyOn(prisma.meta, 'findMany').mockResolvedValue([
      rawMeta({ aportes: [{ id: 1, valor: new Prisma.Decimal('500.00') }] }),
    ]);

    const res = await request(app).get('/api/metas').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].valorAlvo).toBe(3000);
    expect(res.body[0].valorAtual).toBe(500);
  });

  it('escopa a busca por familiaId do token', async () => {
    const findSpy = vi.spyOn(prisma.meta, 'findMany').mockResolvedValue([]);

    await request(app).get('/api/metas?usuarioId=999').set('Authorization', `Bearer ${token}`);

    expect(findSpy.mock.calls[0][0].where.familiaId).toBe(1);
  });
});

describe('POST /api/metas', () => {
  it('cria a meta com o usuarioId do token, mesmo que o body tente outro', async () => {
    const createSpy = vi.spyOn(prisma.meta, 'create').mockResolvedValue(rawMeta());

    const res = await request(app)
      .post('/api/metas')
      .set('Authorization', `Bearer ${token}`)
      .send({ usuarioId: 999, titulo: 'Viagem', valorAlvo: 3000, prazo: '2026-12-31' });

    expect(res.status).toBe(201);
    expect(createSpy.mock.calls[0][0].data.usuarioId).toBe(7);
  });

  it('rejeita corpo inválido (400) e não chama o Prisma', async () => {
    const createSpy = vi.spyOn(prisma.meta, 'create');

    const res = await request(app)
      .post('/api/metas')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: '', valorAlvo: 3000 });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });
});

describe('PUT /api/metas/:id', () => {
  it('retorna 404 quando a meta não existe ou não é do usuário (proteção contra IDOR)', async () => {
    vi.spyOn(prisma.meta, 'findFirst').mockResolvedValue(null);
    const updateSpy = vi.spyOn(prisma.meta, 'update');

    const res = await request(app)
      .put('/api/metas/123')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Viagem', valorAlvo: 3000 });

    expect(res.status).toBe(404);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('atualiza quando a meta pertence ao usuário (200)', async () => {
    vi.spyOn(prisma.meta, 'findFirst').mockResolvedValue(rawMeta());
    vi.spyOn(prisma.meta, 'update').mockResolvedValue(rawMeta({ titulo: 'Viagem 2' }));

    const res = await request(app)
      .put('/api/metas/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Viagem 2', valorAlvo: 3000 });

    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe('Viagem 2');
  });
});

describe('DELETE /api/metas/:id', () => {
  it('retorna 404 quando a meta não é do usuário', async () => {
    vi.spyOn(prisma.meta, 'findFirst').mockResolvedValue(null);
    const res = await request(app).delete('/api/metas/999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('exclui e retorna 204 quando a meta é do usuário', async () => {
    vi.spyOn(prisma.meta, 'findFirst').mockResolvedValue(rawMeta());
    const deleteSpy = vi.spyOn(prisma.meta, 'delete').mockResolvedValue({});

    const res = await request(app).delete('/api/metas/1').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe('POST /api/metas/:id/aportes', () => {
  it('retorna 404 quando a meta não é do usuário', async () => {
    vi.spyOn(prisma.meta, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(prisma.aporte, 'create');

    const res = await request(app)
      .post('/api/metas/999/aportes')
      .set('Authorization', `Bearer ${token}`)
      .send({ valor: 100, data: '2026-08-10' });

    expect(res.status).toBe(404);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejeita valor inválido (400) e não chama o Prisma', async () => {
    vi.spyOn(prisma.meta, 'findFirst').mockResolvedValue(rawMeta());
    const createSpy = vi.spyOn(prisma.aporte, 'create');

    const res = await request(app)
      .post('/api/metas/1/aportes')
      .set('Authorization', `Bearer ${token}`)
      .send({ valor: 0, data: '2026-08-10' });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('cria o aporte e retorna a meta com o progresso atualizado', async () => {
    vi.spyOn(prisma.meta, 'findFirst')
      .mockResolvedValueOnce(rawMeta())
      .mockResolvedValueOnce(rawMeta({ aportes: [{ id: 1, valor: new Prisma.Decimal('500.00') }] }));
    const createSpy = vi.spyOn(prisma.aporte, 'create').mockResolvedValue({});

    const res = await request(app)
      .post('/api/metas/1/aportes')
      .set('Authorization', `Bearer ${token}`)
      .send({ valor: 500, data: '2026-08-10' });

    expect(res.status).toBe(201);
    expect(createSpy.mock.calls[0][0].data.metaId).toBe(1);
    expect(res.body.valorAtual).toBe(500);
  });
});

describe('DELETE /api/metas/:id/aportes/:aporteId', () => {
  it('retorna 404 quando o aporte não pertence a uma meta do usuário (proteção contra IDOR)', async () => {
    vi.spyOn(prisma.aporte, 'findFirst').mockResolvedValue(null);
    const deleteSpy = vi.spyOn(prisma.aporte, 'delete');

    const res = await request(app)
      .delete('/api/metas/1/aportes/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('remove o aporte e retorna a meta com o progresso recalculado', async () => {
    vi.spyOn(prisma.aporte, 'findFirst').mockResolvedValue({ id: 1, metaId: 1, valor: new Prisma.Decimal('500.00') });
    vi.spyOn(prisma.aporte, 'delete').mockResolvedValue({});
    vi.spyOn(prisma.meta, 'findFirst').mockResolvedValue(rawMeta({ aportes: [] }));

    const res = await request(app)
      .delete('/api/metas/1/aportes/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.valorAtual).toBe(0);
  });
});

// O handler é o mesmo (utils/reorderLista.js) em contas, orçamentos, eventos e recorrências.
describe('PUT /api/metas/reorder', () => {
  it('lista por posição manual e, no empate, pela ordem de criação', async () => {
    const findSpy = vi.spyOn(prisma.meta, 'findMany').mockResolvedValue([]);
    await request(app).get('/api/metas').set('Authorization', `Bearer ${token}`);
    expect(findSpy.mock.calls[0][0].orderBy).toEqual([{ ordem: 'asc' }, { createdAt: 'asc' }]);
  });

  it('grava -n..-1 na nova ordem, só com metas da família', async () => {
    const findSpy = vi.spyOn(prisma.meta, 'findMany').mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const updateSpy = vi.spyOn(prisma.meta, 'update').mockResolvedValue({});
    vi.spyOn(prisma, '$transaction').mockImplementation((arr) => Promise.all(arr));

    const res = await request(app).put('/api/metas/reorder').set('Authorization', `Bearer ${token}`).send({ ids: [3, 1, 2] });

    expect(res.status).toBe(204);
    expect(findSpy.mock.calls[0][0].where).toEqual({ familiaId: 1 });
    expect(updateSpy.mock.calls.map(c => c[0])).toEqual([
      { where: { id: 3 }, data: { ordem: -3 } },
      { where: { id: 1 }, data: { ordem: -2 } },
      { where: { id: 2 }, data: { ordem: -1 } },
    ]);
  });

  it('recusa (400) id de outra família ou lista incompleta, sem gravar nada', async () => {
    vi.spyOn(prisma.meta, 'findMany').mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const updateSpy = vi.spyOn(prisma.meta, 'update');
    const fora = await request(app).put('/api/metas/reorder').set('Authorization', `Bearer ${token}`).send({ ids: [1, 99] });
    const incompleta = await request(app).put('/api/metas/reorder').set('Authorization', `Bearer ${token}`).send({ ids: [1] });
    expect(fora.status).toBe(400);
    expect(incompleta.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
