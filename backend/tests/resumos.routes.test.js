import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createTestApp } from './testApp.js';

// Ver comentário em auth.routes.test.js: vi.spyOn nos singletons reais (Prisma, mailer).
const prisma = require('../database/db');
const mailer = require('../utils/mailer');
const { enviarResumosPendentes, resumirTransacoes } = require('../utils/enviarResumos');
const app = createTestApp();

const usuario = (overrides = {}) => ({
  id: 7, nome: 'Mariah', email: 'mariah@example.com', familiaId: 1,
  resumoSemanal: true, resumoMensal: false, ultimoResumoSemanal: null, ultimoResumoMensal: null,
  ...overrides,
});

const tx = (tipo, valor, categoria, moeda = 'BRL') => ({ tipo, valor: new Prisma.Decimal(valor), categoria, conta: { moeda } });

beforeEach(() => {
  vi.spyOn(prisma.taxaCambio, 'findMany').mockResolvedValue([{ moeda: 'EUR', taxaParaBRL: new Prisma.Decimal('6'), atualizadoEm: new Date() }]);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.CRON_SECRET;
});

describe('POST /api/resumos/enviar', () => {
  it('fica desligada (503) sem CRON_SECRET configurado', async () => {
    const res = await request(app).post('/api/resumos/enviar').set('x-cron-secret', 'qualquer');
    expect(res.status).toBe(503);
  });

  it('recusa (401) sem o segredo ou com segredo errado, sem consultar usuários', async () => {
    process.env.CRON_SECRET = 'segredo-certo';
    const findSpy = vi.spyOn(prisma.usuario, 'findMany');
    const semSegredo = await request(app).post('/api/resumos/enviar');
    const errado = await request(app).post('/api/resumos/enviar').set('x-cron-secret', 'segredo-errado');
    expect(semSegredo.status).toBe(401);
    expect(errado.status).toBe(401);
    expect(findSpy).not.toHaveBeenCalled();
  });

  it('com o segredo certo, envia os resumos pendentes', async () => {
    process.env.CRON_SECRET = 'segredo-certo';
    vi.spyOn(prisma.usuario, 'findMany').mockResolvedValue([]);
    const res = await request(app).post('/api/resumos/enviar').set('x-cron-secret', 'segredo-certo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enviados: 0, semMovimento: 0, erros: 0 });
  });
});

describe('enviarResumosPendentes', () => {
  // Segunda, 05/10/2026, 08:00 em Brasília: a semana 28/09–04/10 acabou de fechar.
  const agora = new Date('2026-10-05T11:00:00Z');

  it('manda o resumo da última semana completa e marca o período como enviado', async () => {
    vi.spyOn(prisma.usuario, 'findMany').mockResolvedValue([usuario()]);
    const txSpy = vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([tx('despesa', '100.00', 'Lazer')]);
    const mailSpy = vi.spyOn(mailer, 'sendResumoEmail').mockResolvedValue();
    const updateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({});

    const resultado = await enviarResumosPendentes(agora);

    expect(resultado).toEqual({ enviados: 1, semMovimento: 0, erros: 0 });
    expect(txSpy.mock.calls[0][0].where).toEqual({ familiaId: 1, data: { gte: '2026-09-28', lte: '2026-10-04' } });
    expect(mailSpy.mock.calls[0][1]).toMatchObject({ tipo: 'semanal', periodo: { chave: '2026-09-28' }, resumo: { despesas: 100 } });
    expect(updateSpy).toHaveBeenCalledWith({ where: { id: 7 }, data: { ultimoResumoSemanal: '2026-09-28' } });
  });

  it('não reenvia um período já enviado (idempotente se o workflow rodar de novo)', async () => {
    vi.spyOn(prisma.usuario, 'findMany').mockResolvedValue([usuario({ ultimoResumoSemanal: '2026-09-28' })]);
    const mailSpy = vi.spyOn(mailer, 'sendResumoEmail');
    const resultado = await enviarResumosPendentes(agora);
    expect(resultado).toEqual({ enviados: 0, semMovimento: 0, erros: 0 });
    expect(mailSpy).not.toHaveBeenCalled();
  });

  it('período sem transações: não manda e-mail, mas marca como resolvido', async () => {
    vi.spyOn(prisma.usuario, 'findMany').mockResolvedValue([usuario()]);
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([]);
    const mailSpy = vi.spyOn(mailer, 'sendResumoEmail');
    const updateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({});

    const resultado = await enviarResumosPendentes(agora);

    expect(resultado.semMovimento).toBe(1);
    expect(mailSpy).not.toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith({ where: { id: 7 }, data: { ultimoResumoSemanal: '2026-09-28' } });
  });

  it('se o envio falha, não marca o período (tenta de novo amanhã) e segue pros outros usuários', async () => {
    vi.spyOn(prisma.usuario, 'findMany').mockResolvedValue([usuario(), usuario({ id: 8, email: 'b@x.com', familiaId: 2 })]);
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([tx('despesa', '10.00', 'Lazer')]);
    vi.spyOn(mailer, 'sendResumoEmail').mockRejectedValueOnce(new Error('SMTP fora')).mockResolvedValue();
    const updateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValue({});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const resultado = await enviarResumosPendentes(agora);

    expect(resultado).toEqual({ enviados: 1, semMovimento: 0, erros: 1 });
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0][0].where).toEqual({ id: 8 });
  });
});

describe('resumirTransacoes', () => {
  it('converte pra R$ pela moeda da conta e traz as 3 categorias com mais despesa', () => {
    const resumo = resumirTransacoes([
      tx('receita', '1000.00', 'Salário'),
      tx('despesa', '10.00', 'Lazer', 'EUR'), // 60 em R$
      tx('despesa', '50.00', 'Mercado'),
      tx('despesa', '20.00', 'Transporte'),
      tx('despesa', '5.00', 'Outros'),
    ], { BRL: 1, EUR: 6 });

    expect(resumo).toEqual({
      receitas: 1000,
      despesas: 135,
      saldo: 865,
      quantidade: 5,
      topCategorias: [{ categoria: 'Lazer', total: 60 }, { categoria: 'Mercado', total: 50 }, { categoria: 'Transporte', total: 20 }],
    });
  });
});
