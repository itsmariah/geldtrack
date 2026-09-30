import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './testApp.js';
import { makeToken } from './makeToken.js';

// Ver comentário em auth.routes.test.js: usamos vi.spyOn no singleton real do
// Prisma em vez de vi.mock, porque vi.mock não intercepta require() dentro de
// arquivos CJS neste projeto.
const prisma = require('../database/db');
const app = createTestApp();
const token = makeToken(7);

const membro = (overrides = {}) => ({ id: 7, nome: 'Mariah', email: 'mariah@example.com', papelFamilia: 'dono', createdAt: new Date('2026-01-01'), ...overrides });

beforeEach(() => {
  vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'dono' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/familia', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/familia');
    expect(res.status).toBe(401);
  });

  it('retorna nome, código e membros com papel', async () => {
    vi.spyOn(prisma.familia, 'findUnique').mockResolvedValue({
      id: 1, nome: 'Família de Mariah', codigo: 'WM2BST',
      membros: [membro()],
    });

    const res = await request(app).get('/api/familia').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 1, nome: 'Família de Mariah', codigo: 'WM2BST',
      membros: [{ id: 7, nome: 'Mariah', email: 'mariah@example.com', foto: null, papel: 'dono' }],
    });
  });
});

describe('PUT /api/familia', () => {
  it('retorna 403 quando quem chama não é dono', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'membro' });
    const updateSpy = vi.spyOn(prisma.familia, 'update');

    const res = await request(app).put('/api/familia').set('Authorization', `Bearer ${token}`).send({ nome: 'Novo nome' });

    expect(res.status).toBe(403);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('renomeia quando quem chama é dono', async () => {
    const updateSpy = vi.spyOn(prisma.familia, 'update').mockResolvedValue({
      id: 1, nome: 'Família Silva', codigo: 'WM2BST', membros: [membro()],
    });

    const res = await request(app).put('/api/familia').set('Authorization', `Bearer ${token}`).send({ nome: 'Família Silva' });

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Família Silva');
    expect(updateSpy.mock.calls[0][0].data.nome).toBe('Família Silva');
  });

  it('rejeita nome vazio (400)', async () => {
    const res = await request(app).put('/api/familia').set('Authorization', `Bearer ${token}`).send({ nome: '  ' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/familia/regenerar-codigo', () => {
  it('retorna 403 quando quem chama não é dono', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'membro' });
    const res = await request(app).post('/api/familia/regenerar-codigo').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('gera e retorna um novo código quando quem chama é dono', async () => {
    vi.spyOn(prisma.familia, 'findUnique').mockResolvedValue(null); // gerarCodigoUnico: sem colisão
    const updateSpy = vi.spyOn(prisma.familia, 'update').mockResolvedValue({ codigo: 'NOVO12' });

    const res = await request(app).post('/api/familia/regenerar-codigo').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.codigo).toBe('NOVO12');
    expect(updateSpy.mock.calls[0][0].where).toEqual({ id: 1 });
  });
});

describe('POST /api/familia/entrar', () => {
  it('rejeita código vazio (400)', async () => {
    const res = await request(app).post('/api/familia/entrar').set('Authorization', `Bearer ${token}`).send({ codigo: '' });
    expect(res.status).toBe(400);
  });

  it('retorna 404 quando o código não corresponde a nenhuma família', async () => {
    vi.spyOn(prisma.familia, 'findUnique').mockResolvedValue(null);
    const res = await request(app).post('/api/familia/entrar').set('Authorization', `Bearer ${token}`).send({ codigo: 'XXXXXX' });
    expect(res.status).toBe(404);
  });

  it('rejeita entrar na própria família (400)', async () => {
    vi.spyOn(prisma.familia, 'findUnique').mockResolvedValue({ id: 1, codigo: 'WM2BST' });
    const res = await request(app).post('/api/familia/entrar').set('Authorization', `Bearer ${token}`).send({ codigo: 'wm2bst' });
    expect(res.status).toBe(400);
  });

  it('troca a família ativa do usuário e define papel como membro', async () => {
    vi.spyOn(prisma.familia, 'findUnique')
      .mockResolvedValueOnce({ id: 2, codigo: 'OUTRA1' }) // busca pelo código
      .mockResolvedValueOnce({ id: 2, nome: 'Família do Parceiro', codigo: 'OUTRA1', membros: [membro({ id: 7, papelFamilia: 'membro' })] }); // resposta final
    const usuarioUpdateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({});

    const res = await request(app).post('/api/familia/entrar').set('Authorization', `Bearer ${token}`).send({ codigo: 'outra1' });

    expect(res.status).toBe(200);
    expect(usuarioUpdateSpy).toHaveBeenCalledWith({ where: { id: 7 }, data: { familiaId: 2, papelFamilia: 'membro' } });
    expect(res.body.id).toBe(2);
  });
});

describe('POST /api/familia/sair', () => {
  it('rejeita quando é o único membro da família (400)', async () => {
    vi.spyOn(prisma.usuario, 'findMany').mockResolvedValue([membro()]);
    const res = await request(app).post('/api/familia/sair').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('transfere o papel de dono pro membro mais antigo antes de sair', async () => {
    vi.spyOn(prisma.usuario, 'findMany').mockResolvedValue([
      membro({ id: 7, papelFamilia: 'dono' }),
      membro({ id: 8, nome: 'Parceiro', papelFamilia: 'membro' }),
    ]);
    const usuarioUpdateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({});
    vi.spyOn(prisma.familia, 'findUnique').mockResolvedValue(null); // gerarCodigoUnico
    vi.spyOn(prisma.familia, 'create').mockResolvedValue({ id: 20, nome: 'Família de Mariah', codigo: 'NOVA01' });

    const res = await request(app).post('/api/familia/sair').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(usuarioUpdateSpy).toHaveBeenCalledWith({ where: { id: 8 }, data: { papelFamilia: 'dono' } });
    expect(usuarioUpdateSpy).toHaveBeenCalledWith({ where: { id: 7 }, data: { familiaId: 20, papelFamilia: 'dono' } });
    expect(res.body).toEqual({ id: 20, nome: 'Família de Mariah', codigo: 'NOVA01', papel: 'dono' });
  });

  it('não transfere papel de dono quando quem sai já é um membro comum', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'membro' });
    vi.spyOn(prisma.usuario, 'findMany').mockResolvedValue([
      membro({ id: 9, papelFamilia: 'dono' }),
      membro({ id: 7, papelFamilia: 'membro' }),
    ]);
    const usuarioUpdateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({});
    vi.spyOn(prisma.familia, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.familia, 'create').mockResolvedValue({ id: 21, nome: 'Família de Mariah', codigo: 'NOVA02' });

    const res = await request(app).post('/api/familia/sair').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(usuarioUpdateSpy).not.toHaveBeenCalledWith({ where: { id: 9 }, data: { papelFamilia: 'dono' } });
  });
});

describe('DELETE /api/familia/membros/:usuarioId', () => {
  it('retorna 403 quando quem chama não é dono', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'membro' });
    const res = await request(app).delete('/api/familia/membros/8').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('rejeita remover a si mesmo (400) — deve usar sair', async () => {
    const res = await request(app).delete('/api/familia/membros/7').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('retorna 404 quando o alvo não é membro da família', async () => {
    vi.spyOn(prisma.usuario, 'findFirst').mockResolvedValue(null);
    const res = await request(app).delete('/api/familia/membros/999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('remove o membro e dá a ele uma família pessoal nova (204)', async () => {
    vi.spyOn(prisma.usuario, 'findFirst').mockResolvedValue({ id: 8, nome: 'Parceiro', familiaId: 1 });
    vi.spyOn(prisma.familia, 'findUnique').mockResolvedValue(null); // gerarCodigoUnico
    vi.spyOn(prisma.familia, 'create').mockResolvedValue({ id: 22, nome: 'Família de Parceiro', codigo: 'NOVA03' });
    const usuarioUpdateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({});

    const res = await request(app).delete('/api/familia/membros/8').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(usuarioUpdateSpy).toHaveBeenCalledWith({ where: { id: 8 }, data: { familiaId: 22, papelFamilia: 'dono' } });
  });
});
