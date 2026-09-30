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

beforeEach(() => {
  // authMiddleware confere tokenVersion e resolve a família a cada requisição autenticada.
  vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'dono' });
  // GET / materializa recorrências vencidas antes de listar — sem recorrência ativa
  // nenhuma, não deve gerar nada (ver describe dedicado mais abaixo).
  vi.spyOn(prisma.recorrencia, 'findMany').mockResolvedValue([]);
  // contaPertenceAFamilia: por padrão a conta 1 existe e é da família 1.
  vi.spyOn(prisma.conta, 'findFirst').mockResolvedValue({ id: 1, familiaId: 1 });
  // PUT roda update + (opcionalmente) criação de histórico dentro de $transaction — como
  // nos outros arquivos de teste, simulamos rodando as duas promises com Promise.all.
  vi.spyOn(prisma, '$transaction').mockImplementation((arr) => Promise.all(arr));
  vi.spyOn(prisma.transacaoHistorico, 'create').mockResolvedValue({});
  // POST/PUT de despesa dispara (fire-and-forget) a checagem de orçamento estourado — sem
  // orçamento cadastrado por padrão, ela retorna cedo sem tocar em mais nada (aggregate,
  // e-mail...). Testes específicos abaixo sobrescrevem isso pra exercitar o fluxo completo.
  vi.spyOn(prisma.orcamento, 'findUnique').mockResolvedValue(null);
  // eventoPertenceAFamilia: por padrão nenhum evento é enviado nos testes que não mencionam.
  vi.spyOn(prisma.evento, 'findFirst').mockResolvedValue({ id: 1, familiaId: 1 });
  // POST (e PUT que muda a data) calcula a próxima "ordem" do dia — por padrão, dia vazio.
  vi.spyOn(prisma.transacao, 'aggregate').mockResolvedValue({ _max: { ordem: null } });
});

// O disparo do aviso de orçamento é fire-and-forget (a rota não espera): dá um respiro
// pro event loop rodar as promises pendentes antes de fazer asserções sobre elas.
const flushPromises = () => new Promise(resolve => setImmediate(resolve));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/transactions', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  it('retorna a lista paginada e converte valor (Decimal) para number', async () => {
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([
      { id: 1, usuarioId: 7, tipo: 'despesa', valor: new Prisma.Decimal('45.90'), categoria: 'Lazer', descricao: '', data: '2026-08-10' },
    ]);
    vi.spyOn(prisma.transacao, 'count').mockResolvedValue(1);

    const res = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].valor).toBe(45.9);
    expect(res.body).toMatchObject({ page: 1, limit: 50, total: 1, totalPages: 1 });
  });

  it('escopa a busca por familiaId do token, nunca do query string', async () => {
    const findSpy = vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.transacao, 'count').mockResolvedValue(0);

    await request(app)
      .get('/api/transactions?usuarioId=999')
      .set('Authorization', `Bearer ${token}`);

    const whereUsed = findSpy.mock.calls[0][0].where;
    expect(whereUsed.familiaId).toBe(1);
  });
});

describe('POST /api/transactions', () => {
  it('cria a transação com o usuarioId do token, mesmo que o body tente outro', async () => {
    const createSpy = vi.spyOn(prisma.transacao, 'create').mockResolvedValue({
      id: 10, usuarioId: 7, tipo: 'despesa', valor: new Prisma.Decimal('50.00'), categoria: 'Lazer', descricao: '', data: '2026-08-10',
    });

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ usuarioId: 999, tipo: 'despesa', valor: 50, categoria: 'Lazer', data: '2026-08-10', contaId: 1 });

    expect(res.status).toBe(201);
    expect(res.body.valor).toBe(50);
    expect(createSpy.mock.calls[0][0].data.usuarioId).toBe(7);
    expect(createSpy.mock.calls[0][0].data.contaId).toBe(1);
  });

  it('rejeita corpo inválido (400) e não chama o Prisma', async () => {
    const createSpy = vi.spyOn(prisma.transacao, 'create');

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 50, categoria: 'Lazer', data: '30/08/2026', contaId: 1 });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejeita quando a conta não pertence ao usuário (400, proteção contra IDOR)', async () => {
    vi.spyOn(prisma.conta, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(prisma.transacao, 'create');

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 50, categoria: 'Lazer', data: '2026-08-10', contaId: 999 });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('salva o anexo (data URL + nome) quando enviado', async () => {
    const createSpy = vi.spyOn(prisma.transacao, 'create').mockResolvedValue({
      id: 11, usuarioId: 7, tipo: 'despesa', valor: new Prisma.Decimal('50.00'), categoria: 'Lazer', descricao: '', data: '2026-08-10', anexoNome: 'nota.png',
    });

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 50, categoria: 'Lazer', data: '2026-08-10', contaId: 1, anexo: 'data:image/png;base64,AAAA', anexoNome: 'nota.png' });

    expect(res.status).toBe(201);
    expect(createSpy.mock.calls[0][0].data.anexo).toBe('data:image/png;base64,AAAA');
    expect(createSpy.mock.calls[0][0].data.anexoNome).toBe('nota.png');
  });

  it('vincula a um evento válido da família', async () => {
    const createSpy = vi.spyOn(prisma.transacao, 'create').mockResolvedValue({
      id: 14, usuarioId: 7, tipo: 'despesa', valor: new Prisma.Decimal('50.00'), categoria: 'Lazer', descricao: '', data: '2026-08-10', eventoId: 1,
    });

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 50, categoria: 'Lazer', data: '2026-08-10', contaId: 1, eventoId: 1 });

    expect(res.status).toBe(201);
    expect(createSpy.mock.calls[0][0].data.eventoId).toBe(1);
  });

  it('rejeita quando o evento não pertence à família (400, proteção contra IDOR)', async () => {
    vi.spyOn(prisma.evento, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(prisma.transacao, 'create');

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 50, categoria: 'Lazer', data: '2026-08-10', contaId: 1, eventoId: 999 });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('cria sem evento quando eventoId não é enviado', async () => {
    const createSpy = vi.spyOn(prisma.transacao, 'create').mockResolvedValue({
      id: 15, usuarioId: 7, tipo: 'despesa', valor: new Prisma.Decimal('50.00'), categoria: 'Lazer', descricao: '', data: '2026-08-10',
    });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 50, categoria: 'Lazer', data: '2026-08-10', contaId: 1 });

    expect(createSpy.mock.calls[0][0].data.eventoId).toBeNull();
  });

  it('rejeita anexo em formato inválido (400)', async () => {
    const createSpy = vi.spyOn(prisma.transacao, 'create');

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 50, categoria: 'Lazer', data: '2026-08-10', contaId: 1, anexo: 'não-é-data-url', anexoNome: 'a.png' });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('verifica orçamento estourado após criar uma despesa (fire-and-forget)', async () => {
    vi.spyOn(prisma.transacao, 'create').mockResolvedValue({
      id: 12, usuarioId: 7, tipo: 'despesa', valor: new Prisma.Decimal('50.00'), categoria: 'Lazer', descricao: '', data: '2026-09-05',
    });
    const orcamentoSpy = vi.spyOn(prisma.orcamento, 'findUnique').mockResolvedValue({ id: 1, valorLimite: new Prisma.Decimal('100.00'), ultimaNotificacaoMes: null });
    vi.spyOn(prisma.transacao, 'aggregate').mockResolvedValue({ _sum: { valor: new Prisma.Decimal('50.00') } });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 50, categoria: 'Lazer', data: '2026-09-05', contaId: 1 });
    await flushPromises();

    expect(orcamentoSpy).toHaveBeenCalledWith({ where: { familiaId_categoria: { familiaId: 1, categoria: 'Lazer' } } });
  });

  it('não verifica orçamento ao criar uma receita', async () => {
    vi.spyOn(prisma.transacao, 'create').mockResolvedValue({
      id: 13, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('50.00'), categoria: 'Salário', descricao: '', data: '2026-09-05',
    });
    const orcamentoSpy = vi.spyOn(prisma.orcamento, 'findUnique');

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 50, categoria: 'Salário', data: '2026-09-05', contaId: 1 });
    await flushPromises();

    expect(orcamentoSpy).not.toHaveBeenCalled();
  });
});

describe('POST /api/transactions — ordem no dia', () => {
  it('coloca a transação nova no topo do dia (maior ordem + 1)', async () => {
    vi.spyOn(prisma.transacao, 'aggregate').mockResolvedValue({ _max: { ordem: 4 } });
    const createSpy = vi.spyOn(prisma.transacao, 'create').mockResolvedValue({
      id: 10, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('50.00'), categoria: 'Salário', descricao: '', data: '2026-08-10',
    });

    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 50, categoria: 'Salário', data: '2026-08-10', contaId: 1 });

    expect(createSpy.mock.calls[0][0].data.ordem).toBe(5);
  });
});

describe('PUT /api/transactions/reorder', () => {
  it('rejeita data inválida (400)', async () => {
    const res = await request(app)
      .put('/api/transactions/reorder')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: 'ontem', ids: [1, 2] });
    expect(res.status).toBe(400);
  });

  it('rejeita id que não é do dia/família (400) e não atualiza nada', async () => {
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const updateSpy = vi.spyOn(prisma.transacao, 'update');

    const res = await request(app)
      .put('/api/transactions/reorder')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: '2026-08-10', ids: [2, 999] });

    expect(res.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('busca o dia escopado pela família do token e renumera o dia inteiro', async () => {
    const findSpy = vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const updateSpy = vi.spyOn(prisma.transacao, 'update').mockResolvedValue({});

    const res = await request(app)
      .put('/api/transactions/reorder')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: '2026-08-10', ids: [3, 1] });

    expect(res.status).toBe(204);
    expect(findSpy.mock.calls[0][0].where).toEqual({ familiaId: 1, data: '2026-08-10' });
    // [1, 2, 3] com 3 e 1 trocados de lugar -> [3, 2, 1]; topo recebe a maior ordem.
    expect(updateSpy.mock.calls.map(c => [c[0].where.id, c[0].data.ordem])).toEqual([[3, 3], [2, 2], [1, 1]]);
  });
});

describe('PUT /api/transactions/:id', () => {
  it('retorna 404 quando a transação não existe ou não é do usuário (proteção contra IDOR)', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue(null);
    const updateSpy = vi.spyOn(prisma.transacao, 'update');

    const res = await request(app)
      .put('/api/transactions/123')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 50, categoria: 'Lazer', data: '2026-08-10' });

    expect(res.status).toBe(404);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('atualiza quando a transação pertence ao usuário (200)', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({ id: 5, usuarioId: 7 });
    vi.spyOn(prisma.transacao, 'update').mockResolvedValue({
      id: 5, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('100.00'), categoria: 'Salário', descricao: '', data: '2026-08-10',
    });

    const res = await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 100, categoria: 'Salário', data: '2026-08-10', contaId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.valor).toBe(100);
  });

  it('apaga os dados de conversão quando o valor é editado à mão', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({
      id: 5, usuarioId: 7, valor: new Prisma.Decimal('103.62'), contaId: 1, moedaOriginal: 'USD',
    });
    const updateSpy = vi.spyOn(prisma.transacao, 'update').mockResolvedValue({
      id: 5, usuarioId: 7, tipo: 'despesa', valor: new Prisma.Decimal('110.00'), categoria: 'Lazer', descricao: '', data: '2026-08-10',
    });

    await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 110, categoria: 'Lazer', data: '2026-08-10', contaId: 1 });

    expect(updateSpy.mock.calls[0][0].data).toMatchObject({ moedaOriginal: null, valorOriginal: null, taxaConversao: null, dataCotacao: null });
  });

  it('mantém os dados de conversão quando valor e conta não mudam', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({
      id: 5, usuarioId: 7, valor: new Prisma.Decimal('103.62'), contaId: 1, moedaOriginal: 'USD',
    });
    const updateSpy = vi.spyOn(prisma.transacao, 'update').mockResolvedValue({
      id: 5, usuarioId: 7, tipo: 'despesa', valor: new Prisma.Decimal('103.62'), categoria: 'Viagem', descricao: '', data: '2026-08-10',
    });

    await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'despesa', valor: 103.62, categoria: 'Viagem', data: '2026-08-10', contaId: 1 });

    expect(updateSpy.mock.calls[0][0].data).not.toHaveProperty('moedaOriginal');
  });

  it('não mexe no anexo existente quando o campo não é enviado', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({ id: 5, usuarioId: 7 });
    const updateSpy = vi.spyOn(prisma.transacao, 'update').mockResolvedValue({
      id: 5, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('100.00'), categoria: 'Salário', descricao: '', data: '2026-08-10',
    });

    await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 100, categoria: 'Salário', data: '2026-08-10', contaId: 1 });

    expect(updateSpy.mock.calls[0][0].data).not.toHaveProperty('anexo');
    expect(updateSpy.mock.calls[0][0].data).not.toHaveProperty('anexoNome');
  });

  it('remove o anexo quando enviado explicitamente como null', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({ id: 5, usuarioId: 7 });
    const updateSpy = vi.spyOn(prisma.transacao, 'update').mockResolvedValue({
      id: 5, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('100.00'), categoria: 'Salário', descricao: '', data: '2026-08-10',
    });

    await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 100, categoria: 'Salário', data: '2026-08-10', contaId: 1, anexo: null });

    expect(updateSpy.mock.calls[0][0].data.anexo).toBeNull();
    expect(updateSpy.mock.calls[0][0].data.anexoNome).toBeNull();
  });

  it('não mexe no evento vinculado quando o campo não é enviado', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({ id: 5, usuarioId: 7, eventoId: 3 });
    const updateSpy = vi.spyOn(prisma.transacao, 'update').mockResolvedValue({
      id: 5, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('100.00'), categoria: 'Salário', descricao: '', data: '2026-08-10', eventoId: 3,
    });

    await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 100, categoria: 'Salário', data: '2026-08-10', contaId: 1 });

    expect(updateSpy.mock.calls[0][0].data.eventoId).toBe(3);
  });

  it('desvincula o evento quando eventoId é enviado como null', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({ id: 5, usuarioId: 7, eventoId: 3 });
    const updateSpy = vi.spyOn(prisma.transacao, 'update').mockResolvedValue({
      id: 5, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('100.00'), categoria: 'Salário', descricao: '', data: '2026-08-10', eventoId: null,
    });

    await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 100, categoria: 'Salário', data: '2026-08-10', contaId: 1, eventoId: null });

    expect(updateSpy.mock.calls[0][0].data.eventoId).toBeNull();
  });

  it('rejeita reatribuir a um evento que não pertence à família (400, proteção contra IDOR)', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({ id: 5, usuarioId: 7, eventoId: null });
    vi.spyOn(prisma.evento, 'findFirst').mockResolvedValue(null);
    const updateSpy = vi.spyOn(prisma.transacao, 'update');

    const res = await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 100, categoria: 'Salário', data: '2026-08-10', contaId: 1, eventoId: 999 });

    expect(res.status).toBe(400);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('registra a mudança de evento no histórico', async () => {
    const existente = { id: 5, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('100.00'), categoria: 'Salário', descricao: '', data: '2026-08-10', contaId: 1, eventoId: null };
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue(existente);
    vi.spyOn(prisma.transacao, 'update').mockResolvedValue({ ...existente, eventoId: 1 });
    const historicoSpy = vi.spyOn(prisma.transacaoHistorico, 'create').mockResolvedValue({});

    await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 100, categoria: 'Salário', data: '2026-08-10', contaId: 1, eventoId: 1 });

    expect(historicoSpy).toHaveBeenCalledTimes(1);
    expect(historicoSpy.mock.calls[0][0].data.alteracoes).toEqual([{ campo: 'eventoId', de: null, para: 1 }]);
  });

  it('não cria histórico quando nenhum campo financeiro muda', async () => {
    const existente = { id: 5, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('100.00'), categoria: 'Salário', descricao: '', data: '2026-08-10', contaId: 1 };
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue(existente);
    vi.spyOn(prisma.transacao, 'update').mockResolvedValue(existente);
    const historicoSpy = vi.spyOn(prisma.transacaoHistorico, 'create');

    await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 100, categoria: 'Salário', data: '2026-08-10', contaId: 1 });

    expect(historicoSpy).not.toHaveBeenCalled();
  });

  it('cria uma entrada de histórico com o que mudou quando um campo financeiro é editado', async () => {
    const existente = { id: 5, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('100.00'), categoria: 'Salário', descricao: '', data: '2026-08-10', contaId: 1 };
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue(existente);
    vi.spyOn(prisma.transacao, 'update').mockResolvedValue({ ...existente, valor: new Prisma.Decimal('150.00'), categoria: 'Freelance' });
    const historicoSpy = vi.spyOn(prisma.transacaoHistorico, 'create').mockResolvedValue({});

    await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 150, categoria: 'Freelance', data: '2026-08-10', contaId: 1 });

    expect(historicoSpy).toHaveBeenCalledTimes(1);
    expect(historicoSpy.mock.calls[0][0].data.transacaoId).toBe(5);
    expect(historicoSpy.mock.calls[0][0].data.alteracoes).toEqual([
      { campo: 'valor', de: 100, para: 150 },
      { campo: 'categoria', de: 'Salário', para: 'Freelance' },
    ]);
  });

  it('não registra troca de anexo no histórico financeiro', async () => {
    const existente = { id: 5, usuarioId: 7, tipo: 'receita', valor: new Prisma.Decimal('100.00'), categoria: 'Salário', descricao: '', data: '2026-08-10', contaId: 1 };
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue(existente);
    vi.spyOn(prisma.transacao, 'update').mockResolvedValue(existente);
    const historicoSpy = vi.spyOn(prisma.transacaoHistorico, 'create');

    await request(app)
      .put('/api/transactions/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'receita', valor: 100, categoria: 'Salário', data: '2026-08-10', contaId: 1, anexo: 'data:image/png;base64,AAAA', anexoNome: 'a.png' });

    expect(historicoSpy).not.toHaveBeenCalled();
  });
});

describe('GET /api/transactions/:id/historico', () => {
  it('retorna 404 quando a transação não é do usuário', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue(null);

    const res = await request(app)
      .get('/api/transactions/5/historico')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('retorna a lista de edições, mais recente primeiro', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({ id: 5 });
    const findManySpy = vi.spyOn(prisma.transacaoHistorico, 'findMany').mockResolvedValue([
      { id: 2, transacaoId: 5, alteracoes: [{ campo: 'valor', de: 100, para: 150 }], createdAt: new Date('2026-08-12') },
      { id: 1, transacaoId: 5, alteracoes: [{ campo: 'categoria', de: 'Lazer', para: 'Saúde' }], createdAt: new Date('2026-08-10') },
    ]);

    const res = await request(app)
      .get('/api/transactions/5/historico')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(findManySpy.mock.calls[0][0]).toMatchObject({ where: { transacaoId: 5 }, orderBy: { createdAt: 'desc' } });
  });
});

describe('GET /api/transactions/:id/anexo', () => {
  it('retorna 404 quando a transação não é do usuário', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue(null);

    const res = await request(app)
      .get('/api/transactions/5/anexo')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('retorna 404 quando a transação não tem anexo', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({ anexo: null, anexoNome: null });

    const res = await request(app)
      .get('/api/transactions/5/anexo')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('retorna o anexo completo quando existe', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({ anexo: 'data:image/png;base64,AAAA', anexoNome: 'nota.png' });

    const res = await request(app)
      .get('/api/transactions/5/anexo')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ anexo: 'data:image/png;base64,AAAA', anexoNome: 'nota.png' });
  });
});

describe('DELETE /api/transactions/:id', () => {
  it('retorna 404 quando a transação não é do usuário', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue(null);
    const res = await request(app).delete('/api/transactions/999').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('exclui e retorna 204 quando a transação é do usuário', async () => {
    vi.spyOn(prisma.transacao, 'findFirst').mockResolvedValue({ id: 5, usuarioId: 7 });
    const deleteSpy = vi.spyOn(prisma.transacao, 'delete').mockResolvedValue({});

    const res = await request(app).delete('/api/transactions/5').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 5 } });
  });
});

describe('POST /api/transactions/bulk', () => {
  it('rejeita mais de 500 itens (400)', async () => {
    const many = Array.from({ length: 501 }, (_, i) => ({
      tipo: 'despesa', valor: 10, categoria: 'Lazer', data: '2026-08-10', descricao: `${i}`,
    }));
    const res = await request(app)
      .post('/api/transactions/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ transactions: many, contaId: 1 });
    expect(res.status).toBe(400);
  });

  it('importa um lote válido (201) com o count retornado', async () => {
    const createManySpy = vi.spyOn(prisma.transacao, 'createMany').mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/api/transactions/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contaId: 1,
        transactions: [
          { tipo: 'despesa', valor: 10, categoria: 'Lazer', data: '2026-08-10' },
          { tipo: 'receita', valor: 20, categoria: 'Salário', data: '2026-08-11' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.count).toBe(2);
    expect(createManySpy.mock.calls[0][0].data.every(t => t.contaId === 1)).toBe(true);
  });

  it('rejeita quando a conta do lote não pertence ao usuário (400)', async () => {
    vi.spyOn(prisma.conta, 'findFirst').mockResolvedValue(null);
    const createManySpy = vi.spyOn(prisma.transacao, 'createMany');

    const res = await request(app)
      .post('/api/transactions/bulk')
      .set('Authorization', `Bearer ${token}`)
      .send({ contaId: 999, transactions: [{ tipo: 'despesa', valor: 10, categoria: 'Lazer', data: '2026-08-10' }] });

    expect(res.status).toBe(400);
    expect(createManySpy).not.toHaveBeenCalled();
  });
});

describe('GET /api/transactions materializa recorrências vencidas', () => {
  it('cria a transação em falta de uma recorrência ativa antes de listar', async () => {
    vi.spyOn(prisma.recorrencia, 'findMany').mockResolvedValue([
      { id: 1, usuarioId: 7, tipo: 'despesa', valor: new Prisma.Decimal('1200.00'), categoria: 'Moradia', descricao: 'Aluguel', diaDoMes: 1, dataInicio: '2020-01-01', dataFim: null, ativa: true },
    ]);
    const createManySpy = vi.spyOn(prisma.transacao, 'createMany').mockResolvedValue({ count: 1 });
    // Primeira chamada: ensureOccurrences checando o que já existe. Segunda: listagem final da rota.
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValueOnce([]).mockResolvedValue([]);
    vi.spyOn(prisma.transacao, 'count').mockResolvedValue(0);

    const res = await request(app).get('/api/transactions').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(createManySpy).toHaveBeenCalled();
    expect(createManySpy.mock.calls[0][0].data[0]).toMatchObject({ usuarioId: 7, categoria: 'Moradia', recorrenciaId: 1 });
  });
});

describe('GET /api/transactions/export', () => {
  it('retorna um CSV com content-type e cabeçalho corretos', async () => {
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([
      { id: 1, tipo: 'despesa', valor: new Prisma.Decimal('45.90'), categoria: 'Lazer', descricao: 'Cinema', data: '2026-08-10' },
    ]);

    const res = await request(app).get('/api/transactions/export').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.text).toContain('Data;Tipo;Categoria;Descrição;Valor');
    expect(res.text).toContain('45,90');
  });
});
