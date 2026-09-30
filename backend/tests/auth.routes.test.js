import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createTestApp } from './testApp.js';
import { makeToken } from './makeToken.js';

// O Prisma Client é um singleton cacheado pelo Node (database/db.js faz
// `module.exports = new PrismaClient()`) — o mesmo require() que a rota usa.
// Por isso conseguimos usar vi.spyOn nos métodos reais em vez de precisar
// mockar o módulo inteiro (vi.mock não intercepta require() dentro de
// arquivos CJS neste projeto).
const prisma = require('../database/db');
const app = createTestApp();

beforeEach(() => {
  // authMiddleware confere tokenVersion a cada requisição autenticada.
  vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/auth/register', () => {
  it('cria um usuário e retorna token + dados básicos (201)', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(null);
    // Toda conta nasce com uma família pessoal — gerarCodigoUnico confere unicidade
    // consultando prisma.familia.findUnique antes de aceitar o código sorteado.
    vi.spyOn(prisma.familia, 'findUnique').mockResolvedValue(null);
    const familiaCreateSpy = vi.spyOn(prisma.familia, 'create').mockResolvedValue({ id: 10, nome: 'Família de Ana', codigo: 'AB3F92' });
    vi.spyOn(prisma.usuario, 'create').mockResolvedValue({ id: 1, nome: 'Ana', email: 'ana@example.com', foto: null, tokenVersion: 0, papelFamilia: 'dono' });
    const contaCreateSpy = vi.spyOn(prisma.conta, 'create').mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Ana', email: 'ana@example.com', senha: '123456' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toEqual({
      id: 1, nome: 'Ana', email: 'ana@example.com', foto: null,
      familia: { id: 10, nome: 'Família de Ana', codigo: 'AB3F92', papel: 'dono' },
    });
    expect(familiaCreateSpy.mock.calls[0][0].data.nome).toBe('Família de Ana');
    // Toda transação exige conta — o cadastro precisa deixar o usuário já pronto pra lançar a primeira.
    expect(contaCreateSpy.mock.calls[0][0].data.usuarioId).toBe(1);
    expect(contaCreateSpy.mock.calls[0][0].data.familiaId).toBe(10);
  });

  it('rejeita e-mail já cadastrado (409)', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ id: 1, email: 'ana@example.com' });
    const createSpy = vi.spyOn(prisma.usuario, 'create');

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Ana', email: 'ana@example.com', senha: '123456' });

    expect(res.status).toBe(409);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejeita campos obrigatórios faltando (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'ana@example.com' });
    expect(res.status).toBe(400);
  });

  it('rejeita senha menor que 6 caracteres (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Ana', email: 'ana@example.com', senha: '123' });
    expect(res.status).toBe(400);
  });

  it('rejeita e-mail em formato inválido (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Ana', email: 'nao-e-email', senha: '123456' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('retorna token com credenciais corretas (200)', async () => {
    const hash = await bcrypt.hash('123456', 10);
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
      id: 1, nome: 'Ana', email: 'ana@example.com', senha: hash, foto: null, tokenVersion: 0,
    });

    const res = await request(app).post('/api/auth/login').send({ email: 'ana@example.com', senha: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('retorna 401 com senha incorreta', async () => {
    const hash = await bcrypt.hash('123456', 10);
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ id: 1, senha: hash, tokenVersion: 0 });

    const res = await request(app).post('/api/auth/login').send({ email: 'ana@example.com', senha: 'errada' });

    expect(res.status).toBe(401);
  });

  it('retorna 401 quando o e-mail não existe (sem revelar isso na mensagem)', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({ email: 'naoexiste@example.com', senha: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('E-mail ou senha incorretos');
  });
});

describe('GET /api/auth/me', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('retorna 401 com token malformado', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });

  it('retorna os dados do usuário autenticado pelo token (200)', async () => {
    // Mesma chamada mockada serve ao authMiddleware (lê tokenVersion) e à rota (lê os demais campos).
    const findSpy = vi.spyOn(prisma.usuario, 'findUnique')
      .mockResolvedValue({ id: 42, nome: 'Ana', email: 'ana@example.com', foto: null, tokenVersion: 0 });
    const token = makeToken(42, 0);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Ana');
    expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 } }));
  });

  it('retorna 401 quando o token tem uma tokenVersion desatualizada (senha foi trocada)', async () => {
    // Usuário já trocou a senha (tokenVersion=1 no banco), mas o token ainda carrega a versão antiga (0).
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 1 });
    const staleToken = makeToken(1, 0);

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${staleToken}`);

    expect(res.status).toBe(401);
  });
});

describe('PUT /api/auth/profile', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).put('/api/auth/profile').send({ nome: 'Novo Nome' });
    expect(res.status).toBe(401);
  });

  it('atualiza o nome sem trocar a senha — não reemite token (200)', async () => {
    vi.spyOn(prisma.usuario, 'update').mockResolvedValue({ id: 1, nome: 'Novo Nome', email: 'ana@example.com', foto: null, tokenVersion: 0 });
    const token = makeToken(1, 0);

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Novo Nome' });

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Novo Nome');
    expect(res.body.token).toBeUndefined();
  });

  it('ligar o resumo semanal marca a semana que acabou de fechar como já enviada', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'dono', resumoSemanal: false, resumoMensal: false });
    const updateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({ id: 1, nome: 'Ana', email: 'ana@example.com', foto: null, tokenVersion: 0, resumoSemanal: true, resumoMensal: false });
    const token = makeToken(1, 0);

    const res = await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ resumoSemanal: true });

    expect(res.status).toBe(200);
    expect(updateSpy.mock.calls[0][0].data).toMatchObject({ resumoSemanal: true, ultimoResumoSemanal: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(updateSpy.mock.calls[0][0].data).not.toHaveProperty('ultimoResumoMensal');
    expect(res.body.resumoSemanal).toBe(true);
  });

  it('desligar o resumo não mexe no último período enviado', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'dono', resumoSemanal: true, resumoMensal: true });
    const updateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({ id: 1, nome: 'Ana', email: 'ana@example.com', foto: null, tokenVersion: 0 });
    const token = makeToken(1, 0);

    await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ resumoMensal: false });

    expect(updateSpy.mock.calls[0][0].data).toEqual({ resumoMensal: false });
  });

  it('rejeita preferência de resumo que não é booleana (400)', async () => {
    const updateSpy = vi.spyOn(prisma.usuario, 'update');
    const token = makeToken(1, 0);
    const res = await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ resumoSemanal: 'sim' });
    expect(res.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('rejeita e-mail já usado por outro usuário (409)', async () => {
    vi.spyOn(prisma.usuario, 'findFirst').mockResolvedValue({ id: 2, email: 'outro@example.com' });
    const token = makeToken(1, 0);

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'outro@example.com' });

    expect(res.status).toBe(409);
  });

  it('ao trocar a senha, incrementa tokenVersion e reemite um token novo (200)', async () => {
    const updateSpy = vi.spyOn(prisma.usuario, 'update')
      .mockResolvedValue({ id: 1, nome: 'Ana', email: 'ana@example.com', foto: null, tokenVersion: 1 });
    const token = makeToken(1, 0);

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ senha: 'novaSenha123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(updateSpy.mock.calls[0][0].data.tokenVersion).toEqual({ increment: 1 });
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('salva um hash do token no banco, nunca o valor em texto puro', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ id: 1, email: 'ana@example.com' });
    const updateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({});

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ana@example.com' });

    expect(res.status).toBe(200);
    const savedHash = updateSpy.mock.calls[0][0].data.resetTokenHash;
    expect(savedHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('responde com a mesma mensagem genérica mesmo se o e-mail não existir', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(null);
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'naoexiste@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/estiver cadastrado/);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('redefine a senha com um token válido e incrementa tokenVersion', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
      id: 1, resetTokenExpiresAt: new Date(Date.now() + 60_000),
    });
    const updateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({});

    const res = await request(app).post('/api/auth/reset-password').send({ token: 'token-original', senha: '123456' });

    expect(res.status).toBe(200);
    expect(updateSpy.mock.calls[0][0].data.tokenVersion).toEqual({ increment: 1 });
    expect(updateSpy.mock.calls[0][0].data.resetTokenHash).toBeNull();
  });

  it('rejeita token inexistente ou expirado (400)', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue(null);
    const res = await request(app).post('/api/auth/reset-password').send({ token: 'invalido', senha: '123456' });
    expect(res.status).toBe(400);
  });
});
