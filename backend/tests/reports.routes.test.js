import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createTestApp } from './testApp.js';
import { makeToken } from './makeToken.js';

// Ver comentário em auth.routes.test.js sobre por que usamos vi.spyOn no
// singleton real do Prisma em vez de vi.mock.
const prisma = require('../database/db');
const app = createTestApp();
const token = makeToken(7);

beforeEach(() => {
  // authMiddleware confere tokenVersion e resolve a família a cada requisição autenticada.
  vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'dono' });
  // Toda rota de relatório busca a cotação de câmbio antes de agregar — sem nenhuma
  // linha em TaxaCambio, buscarTaxas() cai no default (BRL: 1), que é o caso comum
  // nos testes abaixo (a menos que um teste específico configure moedas diferentes).
  vi.spyOn(prisma.taxaCambio, 'findMany').mockResolvedValue([]);
  // Saldo total e projeção somam o efeito de transferências entre moedas — nenhuma por padrão.
  vi.spyOn(prisma.transferencia, 'findMany').mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/reports/balance', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/reports/balance');
    expect(res.status).toBe(401);
  });

  it('calcula o saldo a partir do groupBy do Prisma (200)', async () => {
    vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([
      { tipo: 'receita', _sum: { valor: new Prisma.Decimal('5000.00') } },
      { tipo: 'despesa', _sum: { valor: new Prisma.Decimal('3200.00') } },
    ]);
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([]);

    const res = await request(app).get('/api/reports/balance').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      receitas: 5000, despesas: 3200, saldo: 1800,
      porMoeda: [{ moeda: 'BRL', receitas: 5000, despesas: 3200 }],
    });
  });

  it('soma o saldoInicial das contas do usuário ao saldo', async () => {
    vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([
      { tipo: 'receita', _sum: { valor: new Prisma.Decimal('1000.00') } },
    ]);
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([
      { saldoInicial: new Prisma.Decimal('500.00') },
      { saldoInicial: new Prisma.Decimal('200.00') },
    ]);

    const res = await request(app).get('/api/reports/balance').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      receitas: 1000, despesas: 0, saldo: 1700,
      porMoeda: [{ moeda: 'BRL', receitas: 1000, despesas: 0 }],
    });
  });

  it('escopa o groupBy pelo familiaId do token', async () => {
    const spy = vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([]);
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([]);
    await request(app).get('/api/reports/balance').set('Authorization', `Bearer ${token}`);
    expect(spy.mock.calls[0][0].where.familiaId).toBe(1);
  });

  it('converte receitas/despesas de uma conta em moeda estrangeira antes de somar ao total', async () => {
    vi.spyOn(prisma.taxaCambio, 'findMany').mockResolvedValue([
      { moeda: 'USD', taxaParaBRL: new Prisma.Decimal('5.000000') },
    ]);
    vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([
      { contaId: 1, tipo: 'receita', _sum: { valor: new Prisma.Decimal('1000.00') } }, // conta BRL
      { contaId: 2, tipo: 'despesa', _sum: { valor: new Prisma.Decimal('20.00') } }, // conta USD -> R$100
    ]);
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([
      { id: 1, moeda: 'BRL', saldoInicial: new Prisma.Decimal('0.00') },
      { id: 2, moeda: 'USD', saldoInicial: new Prisma.Decimal('0.00') },
    ]);

    const res = await request(app).get('/api/reports/balance').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.receitas).toBe(1000);
    expect(res.body.despesas).toBe(100); // 20 USD convertido a 5 -> R$100
    expect(res.body.saldo).toBe(900);
    expect(res.body.porMoeda).toContainEqual({ moeda: 'BRL', receitas: 1000, despesas: 0 });
    // valor original (20), não convertido, no detalhamento por moeda
    expect(res.body.porMoeda).toContainEqual({ moeda: 'USD', receitas: 0, despesas: 20 });
  });

  it('converte o saldoInicial de contas em moeda estrangeira antes de somar', async () => {
    vi.spyOn(prisma.taxaCambio, 'findMany').mockResolvedValue([
      { moeda: 'USD', taxaParaBRL: new Prisma.Decimal('5.000000') },
    ]);
    vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([]);
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([
      { id: 1, moeda: 'BRL', saldoInicial: new Prisma.Decimal('100.00') },
      { id: 2, moeda: 'USD', saldoInicial: new Prisma.Decimal('50.00') }, // -> R$250
    ]);

    const res = await request(app).get('/api/reports/balance').set('Authorization', `Bearer ${token}`);

    expect(res.body.saldo).toBe(350); // 100 + (50 * 5)
  });

  it('soma a diferença de câmbio de transferências entre moedas ao saldo total', async () => {
    vi.spyOn(prisma.taxaCambio, 'findMany').mockResolvedValue([
      { moeda: 'USD', taxaParaBRL: new Prisma.Decimal('5.600000') },
    ]);
    vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([]);
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([
      { id: 1, moeda: 'BRL', saldoInicial: new Prisma.Decimal('1000.00') },
      { id: 2, moeda: 'USD', saldoInicial: new Prisma.Decimal('0.00') },
    ]);
    const transfSpy = vi.spyOn(prisma.transferencia, 'findMany').mockResolvedValue([
      { valor: new Prisma.Decimal('400.00'), valorDestino: new Prisma.Decimal('70.00'), contaOrigem: { moeda: 'BRL' }, contaDestino: { moeda: 'USD' } },
    ]);

    const res = await request(app).get('/api/reports/balance').set('Authorization', `Bearer ${token}`);

    // Contas: R$ 600 + US$ 70 (a 5,60 = R$ 392) = R$ 992
    expect(res.body.saldo).toBeCloseTo(992, 2);
    expect(transfSpy.mock.calls[0][0].where).toMatchObject({ familiaId: 1, valorDestino: { not: null } });
  });
});

describe('GET /api/reports/monthly', () => {
  it('retorna 400 sem o parâmetro month', async () => {
    const res = await request(app).get('/api/reports/monthly').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('retorna 400 com month em formato inválido', async () => {
    const res = await request(app).get('/api/reports/monthly?month=agosto').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('retorna transações e resumo do mês (200)', async () => {
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([
      { id: 1, tipo: 'receita', valor: new Prisma.Decimal('3000.00'), categoria: 'Salário', descricao: '', data: '2026-08-05' },
      { id: 2, tipo: 'despesa', valor: new Prisma.Decimal('800.00'), categoria: 'Moradia', descricao: '', data: '2026-08-10' },
    ]);

    const res = await request(app).get('/api/reports/monthly?month=2026-08').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.resumo).toEqual({ receitas: 3000, despesas: 800, saldo: 2200 });
    expect(res.body.transactions).toHaveLength(2);
  });

  it('usa o último dia real do mês no range de busca (fevereiro)', async () => {
    const spy = vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([]);
    await request(app).get('/api/reports/monthly?month=2026-02').set('Authorization', `Bearer ${token}`);
    expect(spy.mock.calls[0][0].where.data).toEqual({ gte: '2026-02-01', lte: '2026-02-28' });
  });
});

describe('GET /api/reports/categories', () => {
  it('converte os totais (Decimal) para number', async () => {
    vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([
      { contaId: 1, categoria: 'Lazer', tipo: 'despesa', _sum: { valor: new Prisma.Decimal('120.00') } },
    ]);
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([{ id: 1, moeda: 'BRL' }]);

    const res = await request(app).get('/api/reports/categories').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body[0].total).toBe(120);
  });

  it('soma a mesma categoria vinda de contas em moedas diferentes, já convertida', async () => {
    vi.spyOn(prisma.taxaCambio, 'findMany').mockResolvedValue([
      { moeda: 'USD', taxaParaBRL: new Prisma.Decimal('5.000000') },
    ]);
    vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([
      { contaId: 1, categoria: 'Viagem', tipo: 'despesa', _sum: { valor: new Prisma.Decimal('100.00') } },
      { contaId: 2, categoria: 'Viagem', tipo: 'despesa', _sum: { valor: new Prisma.Decimal('20.00') } }, // USD -> R$100
    ]);
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([
      { id: 1, moeda: 'BRL' },
      { id: 2, moeda: 'USD' },
    ]);

    const res = await request(app).get('/api/reports/categories').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ categoria: 'Viagem', tipo: 'despesa', total: 200 }]);
  });
});

describe('GET /api/reports/insights', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/reports/insights');
    expect(res.status).toBe(401);
  });

  it('cruza categorias, orçamentos e metas do usuário e devolve os insights gerados', async () => {
    vi.spyOn(prisma.transacao, 'groupBy')
      .mockResolvedValueOnce([{ categoria: 'Alimentação', tipo: 'despesa', _sum: { valor: new Prisma.Decimal('1150.00') } }]) // mês atual
      .mockResolvedValueOnce([{ categoria: 'Alimentação', tipo: 'despesa', _sum: { valor: new Prisma.Decimal('1000.00') } }]); // mês anterior
    vi.spyOn(prisma.orcamento, 'findMany').mockResolvedValue([
      { categoria: 'Alimentação', valorLimite: new Prisma.Decimal('800.00') },
    ]);
    vi.spyOn(prisma.meta, 'findMany').mockResolvedValue([]);

    const res = await request(app).get('/api/reports/insights').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toContainEqual(expect.objectContaining({ tipo: 'orcamento_estourado', categoria: 'Alimentação', valorLimite: 800, gasto: 1150 }));
    expect(res.body).toContainEqual(expect.objectContaining({ tipo: 'categoria_aumento', categoria: 'Alimentação' }));
  });

  it('escopa as consultas por familiaId do token', async () => {
    const groupBySpy = vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([]);
    vi.spyOn(prisma.orcamento, 'findMany').mockResolvedValue([]);
    const metaSpy = vi.spyOn(prisma.meta, 'findMany').mockResolvedValue([]);

    await request(app).get('/api/reports/insights?usuarioId=999').set('Authorization', `Bearer ${token}`);

    expect(groupBySpy.mock.calls[0][0].where.familiaId).toBe(1);
    expect(metaSpy.mock.calls[0][0].where.familiaId).toBe(1);
  });
});

describe('GET /api/reports/projecao', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T12:00:00')); // dia 10 de agosto (31 dias), pra teste determinístico
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna 401 sem token', async () => {
    vi.useRealTimers();
    const res = await request(app).get('/api/reports/projecao');
    expect(res.status).toBe(401);
  });

  it('projeta o saldo combinando o saldo atual, recorrências futuras e o ritmo de gastos', async () => {
    vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([
      { tipo: 'receita', _sum: { valor: new Prisma.Decimal('5000.00') } },
      { tipo: 'despesa', _sum: { valor: new Prisma.Decimal('1000.00') } },
    ]);
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([{ saldoInicial: new Prisma.Decimal('0.00') }]);
    vi.spyOn(prisma.transacao, 'aggregate').mockResolvedValue({ _sum: { valor: new Prisma.Decimal('300.00') } });
    // dataInicio em agosto (o próprio mês corrente) faz o ensureOccurrences não achar
    // nenhuma ocorrência passada pra materializar (evita mockar transacao.findMany/createMany
    // aqui) — dia 20 ainda não chegou (hoje é dia 10), então conta como recorrência futura.
    vi.spyOn(prisma.recorrencia, 'findMany').mockResolvedValue([
      { tipo: 'despesa', valor: new Prisma.Decimal('1200.00'), diaDoMes: 20, dataInicio: '2026-08-01', dataFim: null },
    ]);

    const res = await request(app).get('/api/reports/projecao').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.saldoAtual).toBe(4000); // 5000 receitas - 1000 despesas
    expect(res.body.despesasRecorrentesFuturas).toBe(1200);
    expect(res.body.mes).toBe('2026-08');
  });

  it('escopa a agregação de gastos não recorrentes por familiaId do token', async () => {
    // Primeira chamada de groupBy é o balanceRows (por tipo), a segunda é a de despesas
    // não recorrentes (por contaId) — confere essa segunda especificamente.
    const groupBySpy = vi.spyOn(prisma.transacao, 'groupBy').mockResolvedValue([]);
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.recorrencia, 'findMany').mockResolvedValue([]);

    await request(app).get('/api/reports/projecao?usuarioId=999').set('Authorization', `Bearer ${token}`);

    const despesasCall = groupBySpy.mock.calls.find(c => c[0].where.tipo === 'despesa');
    expect(despesasCall[0].where.familiaId).toBe(1);
    expect(despesasCall[0].where.recorrenciaId).toBeNull();
  });
});

describe('GET /api/reports/evolution', () => {
  it('agrupa por mês somando receitas e despesas separadamente (200)', async () => {
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([
      { tipo: 'receita', valor: new Prisma.Decimal('1000.00'), data: '2026-07-01' },
      { tipo: 'despesa', valor: new Prisma.Decimal('300.00'), data: '2026-07-15' },
    ]);

    const res = await request(app).get('/api/reports/evolution').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ mes: '2026-07', receitas: 1000, despesas: 300 }]);
  });
});
