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

const rawGrupo = (overrides = {}) => ({
  id: 1,
  nome: 'Viagem Nordeste',
  codigo: 'AB3F92',
  criadorUsuarioId: 7,
  createdAt: new Date(),
  membros: [],
  ...overrides,
});

const rawMembro = (overrides = {}) => ({
  id: 1,
  grupoId: 1,
  usuarioId: 7,
  usuario: { id: 7, nome: 'Mariah', email: 'mariah@example.com', foto: null },
  nomeConvidado: null,
  papel: 'admin',
  createdAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({ tokenVersion: 0, familiaId: 1, papelFamilia: 'dono' });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/grupos', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/grupos');
    expect(res.status).toBe(401);
  });

  it('escopa por usuarioId via grupoMembro, nunca por familiaId', async () => {
    const findSpy = vi.spyOn(prisma.grupoMembro, 'findMany').mockResolvedValue([
      { papel: 'admin', grupo: { ...rawGrupo(), _count: { membros: 1 } } },
    ]);
    const res = await request(app).get('/api/grupos').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(findSpy.mock.calls[0][0].where).toEqual({ usuarioId: 7 });
    expect(findSpy.mock.calls[0][0].where).not.toHaveProperty('familiaId');
    expect(res.body[0]).toMatchObject({ nome: 'Viagem Nordeste', papel: 'admin', totalMembros: 1 });
  });
});

describe('GET /api/grupos/:id', () => {
  beforeEach(() => {
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([]);
  });

  it('marca noDashboard só nas despesas que o usuário logado já importou', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro());
    const despesa = (id) => ({
      id, grupoId: 1, descricao: 'Jantar', valorTotal: new Prisma.Decimal('90.00'), data: '2026-08-10', pagoPorMembroId: 1, criadoPorUsuarioId: 7, createdAt: new Date(),
      divisoes: [{ membroId: 1, valorDevido: new Prisma.Decimal('90.00') }],
    });
    vi.spyOn(prisma.grupo, 'findUnique').mockResolvedValue({ ...rawGrupo(), membros: [rawMembro()], despesas: [despesa(1), despesa(2)], pagamentos: [] });
    const txSpy = vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([{ despesaGrupoId: 2 }]);

    const res = await request(app).get('/api/grupos/1').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(txSpy.mock.calls[0][0].where).toEqual({ usuarioId: 7, despesaGrupoId: { in: [1, 2] } });
    expect(res.body.despesas.map(d => d.noDashboard)).toEqual([false, true]);
  });

  it('retorna 404 quando o usuário não é membro do grupo (proteção contra IDOR)', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(null);
    const res = await request(app).get('/api/grupos/1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('retorna membros, despesas e saldos calculados quando o usuário é membro', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro());
    vi.spyOn(prisma.grupo, 'findUnique').mockResolvedValue({
      ...rawGrupo(),
      membros: [rawMembro({ id: 1, usuarioId: 7 }), rawMembro({ id: 2, usuarioId: 8, papel: 'membro', usuario: { id: 8, nome: 'Bruno', email: 'b@x.com', foto: null } })],
      despesas: [{
        id: 1, grupoId: 1, descricao: 'Jantar', valorTotal: new Prisma.Decimal('90.00'), data: '2026-08-10', pagoPorMembroId: 1, criadoPorUsuarioId: 7, createdAt: new Date(),
        divisoes: [{ membroId: 1, valorDevido: new Prisma.Decimal('45.00') }, { membroId: 2, valorDevido: new Prisma.Decimal('45.00') }],
      }],
      pagamentos: [],
    });

    const res = await request(app).get('/api/grupos/1').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.membros).toHaveLength(2);
    expect(res.body.despesas[0].valorTotal).toBe(90);
    expect(res.body.saldos).toEqual([{ deMembroId: 2, paraMembroId: 1, valor: 45, moeda: 'BRL' }]);
  });

  it('abate os saldos com os pagamentos já registrados', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro());
    vi.spyOn(prisma.grupo, 'findUnique').mockResolvedValue({
      ...rawGrupo(),
      membros: [rawMembro({ id: 1, usuarioId: 7 }), rawMembro({ id: 2, usuarioId: 8, papel: 'membro', usuario: { id: 8, nome: 'Bruno', email: 'b@x.com', foto: null } })],
      despesas: [{
        id: 1, grupoId: 1, descricao: 'Jantar', valorTotal: new Prisma.Decimal('90.00'), data: '2026-08-10', pagoPorMembroId: 1, criadoPorUsuarioId: 7, createdAt: new Date(),
        divisoes: [{ membroId: 1, valorDevido: new Prisma.Decimal('45.00') }, { membroId: 2, valorDevido: new Prisma.Decimal('45.00') }],
      }],
      pagamentos: [{
        id: 1, grupoId: 1, deMembroId: 2, paraMembroId: 1, valor: new Prisma.Decimal('20.00'), data: '2026-08-11', criadoPorUsuarioId: 8, createdAt: new Date(),
      }],
    });

    const res = await request(app).get('/api/grupos/1').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.pagamentos[0].valor).toBe(20);
    expect(res.body.saldos).toEqual([{ deMembroId: 2, paraMembroId: 1, valor: 25, moeda: 'BRL' }]);
  });
});

describe('POST /api/grupos', () => {
  it('cria o grupo e o membro admin do criador numa escrita só', async () => {
    const createSpy = vi.spyOn(prisma.grupo, 'create').mockResolvedValue({ ...rawGrupo(), membros: [rawMembro()] });

    const res = await request(app)
      .post('/api/grupos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Viagem Nordeste' });

    expect(res.status).toBe(201);
    expect(createSpy.mock.calls[0][0].data.criadorUsuarioId).toBe(7);
    expect(createSpy.mock.calls[0][0].data.membros.create).toEqual({ usuarioId: 7, papel: 'admin' });
    expect(res.body.papel).toBe('admin');
  });

  it('rejeita nome inválido (400) e não chama o Prisma', async () => {
    const createSpy = vi.spyOn(prisma.grupo, 'create');
    const res = await request(app).post('/api/grupos').set('Authorization', `Bearer ${token}`).send({ nome: '' });
    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });
});

describe('POST /api/grupos/entrar', () => {
  it('retorna 404 pra código inexistente', async () => {
    vi.spyOn(prisma.grupo, 'findUnique').mockResolvedValue(null);
    const res = await request(app).post('/api/grupos/entrar').set('Authorization', `Bearer ${token}`).send({ codigo: 'ZZZZZZ' });
    expect(res.status).toBe(404);
  });

  it('retorna 400 se já é membro', async () => {
    vi.spyOn(prisma.grupo, 'findUnique').mockResolvedValue(rawGrupo());
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro());
    const createSpy = vi.spyOn(prisma.grupoMembro, 'create');

    const res = await request(app).post('/api/grupos/entrar').set('Authorization', `Bearer ${token}`).send({ codigo: 'ab3f92' });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('entra no grupo como "membro" e nunca mexe em Usuario (diferente de familia.js)', async () => {
    vi.spyOn(prisma.grupo, 'findUnique').mockResolvedValueOnce(rawGrupo()).mockResolvedValueOnce({ ...rawGrupo(), membros: [rawMembro({ id: 2, papel: 'membro' })] });
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(null);
    const createSpy = vi.spyOn(prisma.grupoMembro, 'create').mockResolvedValue(rawMembro({ id: 2, papel: 'membro' }));
    const usuarioUpdateSpy = vi.spyOn(prisma.usuario, 'update');

    const res = await request(app).post('/api/grupos/entrar').set('Authorization', `Bearer ${token}`).send({ codigo: 'ab3f92' });

    expect(res.status).toBe(201);
    expect(createSpy.mock.calls[0][0].data).toEqual({ grupoId: 1, usuarioId: 7, papel: 'membro' });
    expect(usuarioUpdateSpy).not.toHaveBeenCalled();
  });
});

describe('POST /api/grupos/:id/convidados', () => {
  it('retorna 404 se não é membro do grupo', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(null);
    const res = await request(app).post('/api/grupos/1/convidados').set('Authorization', `Bearer ${token}`).send({ nomeConvidado: 'Carlos' });
    expect(res.status).toBe(404);
  });

  it('qualquer membro (não só admin) pode adicionar um convidado', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'membro' }));
    const createSpy = vi.spyOn(prisma.grupoMembro, 'create').mockResolvedValue(rawMembro({ id: 3, usuarioId: null, usuario: null, nomeConvidado: 'Carlos', papel: 'membro' }));

    const res = await request(app).post('/api/grupos/1/convidados').set('Authorization', `Bearer ${token}`).send({ nomeConvidado: 'Carlos' });

    expect(res.status).toBe(201);
    expect(createSpy.mock.calls[0][0].data).toEqual({ grupoId: 1, nomeConvidado: 'Carlos', papel: 'membro' });
    expect(res.body.isConvidado).toBe(true);
  });
});

describe('POST /api/grupos/:id/sair', () => {
  it('bloqueia sair sendo o único membro', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro());
    vi.spyOn(prisma.grupoMembro, 'count').mockResolvedValue(1);
    const deleteSpy = vi.spyOn(prisma.grupoMembro, 'delete');

    const res = await request(app).post('/api/grupos/1/sair').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('promove o próximo membro mais antigo a admin ao sair sendo o único admin', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst')
      .mockResolvedValueOnce(rawMembro({ id: 1, papel: 'admin' })) // getMembroAtual
      .mockResolvedValueOnce(rawMembro({ id: 2, usuarioId: 8, papel: 'membro' })); // próximo admin
    vi.spyOn(prisma.grupoMembro, 'count')
      .mockResolvedValueOnce(2) // totalMembros
      .mockResolvedValueOnce(0); // outrosAdmins
    vi.spyOn(prisma.despesaGrupo, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.pagamentoGrupo, 'findFirst').mockResolvedValue(null);
    const updateSpy = vi.spyOn(prisma.grupoMembro, 'update').mockResolvedValue({});
    vi.spyOn(prisma.grupoMembro, 'delete').mockResolvedValue({});

    const res = await request(app).post('/api/grupos/1/sair').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(updateSpy).toHaveBeenCalledWith({ where: { id: 2 }, data: { papel: 'admin' } });
  });
});

describe('DELETE /api/grupos/:id/membros/:membroId', () => {
  it('retorna 403 quando quem chama não é admin', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'membro' }));
    const res = await request(app).delete('/api/grupos/1/membros/2').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('retorna 400 amigável quando o membro tem despesas (checagem prévia)', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst')
      .mockResolvedValueOnce(rawMembro({ papel: 'admin' })) // getMembroAtual
      .mockResolvedValueOnce(rawMembro({ id: 2, usuarioId: 8 })); // alvo
    vi.spyOn(prisma.despesaGrupo, 'findFirst').mockResolvedValue({ id: 5 });
    const deleteSpy = vi.spyOn(prisma.grupoMembro, 'delete');

    const res = await request(app).delete('/api/grupos/1/membros/2').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/despesas ou pagamentos registrados/);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('retorna 400 amigável (não 500) quando o delete esbarra na constraint do Postgres (corrida)', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst')
      .mockResolvedValueOnce(rawMembro({ papel: 'admin' }))
      .mockResolvedValueOnce(rawMembro({ id: 2, usuarioId: 8 }));
    vi.spyOn(prisma.despesaGrupo, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.pagamentoGrupo, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.grupoMembro, 'delete').mockRejectedValue(Object.assign(new Error('FK violation'), { code: 'P2003' }));

    const res = await request(app).delete('/api/grupos/1/membros/2').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/despesas ou pagamentos registrados/);
  });

  it('retorna 400 amigável quando o membro tem pagamentos registrados (checagem prévia)', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst')
      .mockResolvedValueOnce(rawMembro({ papel: 'admin' }))
      .mockResolvedValueOnce(rawMembro({ id: 2, usuarioId: 8 }));
    vi.spyOn(prisma.despesaGrupo, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.pagamentoGrupo, 'findFirst').mockResolvedValue({ id: 9 });
    const deleteSpy = vi.spyOn(prisma.grupoMembro, 'delete');

    const res = await request(app).delete('/api/grupos/1/membros/2').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pagamentos registrados/);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('remove o membro quando não tem despesas nem pagamentos', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst')
      .mockResolvedValueOnce(rawMembro({ papel: 'admin' }))
      .mockResolvedValueOnce(rawMembro({ id: 2, usuarioId: 8 }));
    vi.spyOn(prisma.despesaGrupo, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.pagamentoGrupo, 'findFirst').mockResolvedValue(null);
    const deleteSpy = vi.spyOn(prisma.grupoMembro, 'delete').mockResolvedValue({});

    const res = await request(app).delete('/api/grupos/1/membros/2').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 2 } });
  });
});

describe('DELETE /api/grupos/:id', () => {
  it('retorna 403 quando quem chama não é admin', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'membro' }));
    const res = await request(app).delete('/api/grupos/1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('exclui o grupo quando quem chama é admin', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'admin' }));
    vi.spyOn(prisma.despesaGrupo, 'deleteMany').mockResolvedValue({ count: 0 });
    vi.spyOn(prisma.pagamentoGrupo, 'deleteMany').mockResolvedValue({ count: 0 });
    const deleteSpy = vi.spyOn(prisma.grupo, 'delete').mockResolvedValue({});
    vi.spyOn(prisma, '$transaction').mockImplementation((arr) => Promise.all(arr));

    const res = await request(app).delete('/api/grupos/1').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  // Regressão: excluir um grupo que tem despesa dava 500 (erro de FK do Postgres) porque
  // GrupoMembro (onDelete: Cascade a partir de Grupo) podia cascatear antes de as despesas
  // que apontam pra ele (Restrict) serem apagadas. A correção apaga as despesas e os
  // pagamentos primeiro, numa transação com a exclusão do grupo.
  it('apaga despesas e pagamentos do grupo antes do grupo, na mesma transação (evita a corrida Cascade/Restrict)', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'admin' }));
    const deleteManySpy = vi.spyOn(prisma.despesaGrupo, 'deleteMany').mockResolvedValue({ count: 2 });
    const deletePagamentosManySpy = vi.spyOn(prisma.pagamentoGrupo, 'deleteMany').mockResolvedValue({ count: 1 });
    const deleteGrupoSpy = vi.spyOn(prisma.grupo, 'delete').mockResolvedValue({});
    const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation((arr) => Promise.all(arr));

    const res = await request(app).delete('/api/grupos/1').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(transactionSpy).toHaveBeenCalled();
    expect(deleteManySpy).toHaveBeenCalledWith({ where: { grupoId: 1 } });
    expect(deletePagamentosManySpy).toHaveBeenCalledWith({ where: { grupoId: 1 } });
    expect(deleteGrupoSpy).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe('POST /api/grupos/:id/despesas', () => {
  it('rejeita pagador que não é membro do grupo (400, proteção contra IDOR)', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro());
    vi.spyOn(prisma.grupoMembro, 'findMany').mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const createSpy = vi.spyOn(prisma.despesaGrupo, 'create');

    const res = await request(app)
      .post('/api/grupos/1/despesas')
      .set('Authorization', `Bearer ${token}`)
      .send({ descricao: 'Jantar', valorTotal: 90, data: '2026-08-10', pagoPorMembroId: 999, participanteIds: [1, 2] });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('cria a despesa dividindo igualmente entre os participantes, somando exatamente o valor total', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro());
    vi.spyOn(prisma.grupoMembro, 'findMany').mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const createSpy = vi.spyOn(prisma.despesaGrupo, 'create').mockResolvedValue({
      id: 1, grupoId: 1, descricao: 'Jantar', valorTotal: new Prisma.Decimal('100.00'), data: '2026-08-10', pagoPorMembroId: 1, criadoPorUsuarioId: 7, createdAt: new Date(),
      divisoes: [{ membroId: 1, valorDevido: new Prisma.Decimal('33.34') }, { membroId: 2, valorDevido: new Prisma.Decimal('33.33') }, { membroId: 3, valorDevido: new Prisma.Decimal('33.33') }],
    });

    const res = await request(app)
      .post('/api/grupos/1/despesas')
      .set('Authorization', `Bearer ${token}`)
      .send({ descricao: 'Jantar', valorTotal: 100, data: '2026-08-10', pagoPorMembroId: 1, participanteIds: [1, 2, 3] });

    expect(res.status).toBe(201);
    const divisoesEnviadas = createSpy.mock.calls[0][0].data.divisoes.create;
    const somaCentavos = divisoesEnviadas.reduce((acc, d) => acc + Math.round(d.valorDevido * 100), 0);
    expect(somaCentavos).toBe(10000);
    expect(divisoesEnviadas[0].valorDevido).toBe(33.34);
  });
});

describe('PUT /api/grupos/:id/despesas/:despesaId', () => {
  const membrosDoGrupo = [{ id: 1 }, { id: 2 }];
  const despesaExistente = { id: 5, grupoId: 1, descricao: 'Jantar', valorTotal: new Prisma.Decimal('90.00'), data: '2026-08-10', pagoPorMembroId: 1, criadoPorUsuarioId: 8 };

  it('retorna 403 quando quem chama não é o criador nem admin', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'membro', usuarioId: 7 }));
    vi.spyOn(prisma.despesaGrupo, 'findFirst').mockResolvedValue(despesaExistente);
    const updateSpy = vi.spyOn(prisma.despesaGrupo, 'update');

    const res = await request(app)
      .put('/api/grupos/1/despesas/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ descricao: 'Jantar', valorTotal: 90, data: '2026-08-10', pagoPorMembroId: 1, participanteIds: [1, 2] });

    expect(res.status).toBe(403);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('permite edição por um admin mesmo não sendo o criador', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'admin', usuarioId: 7 }));
    vi.spyOn(prisma.despesaGrupo, 'findFirst').mockResolvedValue(despesaExistente);
    vi.spyOn(prisma.grupoMembro, 'findMany').mockResolvedValue(membrosDoGrupo);
    const updateSpy = vi.spyOn(prisma.despesaGrupo, 'update').mockResolvedValue({
      ...despesaExistente, divisoes: [{ membroId: 1, valorDevido: new Prisma.Decimal('45.00') }, { membroId: 2, valorDevido: new Prisma.Decimal('45.00') }],
    });
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([]);

    const res = await request(app)
      .put('/api/grupos/1/despesas/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ descricao: 'Jantar', valorTotal: 90, data: '2026-08-10', pagoPorMembroId: 1, participanteIds: [1, 2] });

    expect(res.status).toBe(200);
    expect(updateSpy.mock.calls[0][0].data.divisoes.deleteMany).toEqual({});
  });

  it('leva a nova data, descrição e parte pras transações já adicionadas ao dashboard, com histórico', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'admin', usuarioId: 7 }));
    vi.spyOn(prisma.despesaGrupo, 'findFirst').mockResolvedValue(despesaExistente);
    vi.spyOn(prisma.grupoMembro, 'findMany').mockResolvedValue([{ id: 1, usuarioId: 7 }, { id: 2, usuarioId: 8 }]);
    vi.spyOn(prisma.despesaGrupo, 'update').mockResolvedValue({
      ...despesaExistente, descricao: 'Jantar japonês', valorTotal: new Prisma.Decimal('120.00'), data: '2026-08-12',
      divisoes: [{ membroId: 1, valorDevido: new Prisma.Decimal('60.00') }, { membroId: 2, valorDevido: new Prisma.Decimal('60.00') }],
    });
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([{
      id: 30, usuarioId: 7, familiaId: 1, tipo: 'despesa', valor: new Prisma.Decimal('45.00'), categoria: 'Lazer',
      descricao: 'Jantar (Viagem Nordeste)', data: '2026-08-10', contaId: 3, eventoId: null, despesaGrupoId: 5,
    }]);
    vi.spyOn(prisma.grupo, 'findUnique').mockResolvedValue({ nome: 'Viagem Nordeste' });
    vi.spyOn(prisma.transacao, 'aggregate').mockResolvedValue({ _max: { ordem: 2 } });
    const txUpdateSpy = vi.spyOn(prisma.transacao, 'update').mockReturnValue('update-op');
    const historicoSpy = vi.spyOn(prisma.transacaoHistorico, 'create').mockReturnValue('historico-op');
    const transactionSpy = vi.spyOn(prisma, '$transaction').mockResolvedValue([]);

    const res = await request(app)
      .put('/api/grupos/1/despesas/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ descricao: 'Jantar japonês', valorTotal: 120, data: '2026-08-12', pagoPorMembroId: 1, participanteIds: [1, 2] });

    expect(res.status).toBe(200);
    expect(txUpdateSpy).toHaveBeenCalledWith({
      where: { id: 30 },
      data: { data: '2026-08-12', descricao: 'Jantar japonês (Viagem Nordeste)', valor: 60, ordem: 3 },
    });
    expect(historicoSpy.mock.calls[0][0].data.alteracoes.map(a => a.campo)).toEqual(['valor', 'descricao', 'data']);
    expect(transactionSpy).toHaveBeenCalledWith(['update-op', 'historico-op']);
  });
});

describe('POST /api/grupos/:id/dashboard', () => {
  const body = { contaId: 3, categoria: 'Lazer' };
  const despesa = (overrides = {}) => ({
    id: 5, grupoId: 1, descricao: 'Jantar', valorTotal: new Prisma.Decimal('90.00'), data: '2026-08-10', pagoPorMembroId: 2, criadoPorUsuarioId: 8, createdAt: new Date(),
    divisoes: [{ membroId: 1, valorDevido: new Prisma.Decimal('45.00') }],
    ...overrides,
  });

  beforeEach(() => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ id: 1, papel: 'membro' }));
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([{ id: 3, familiaId: 1, moeda: 'BRL' }]);
    vi.spyOn(prisma.grupo, 'findUnique').mockResolvedValue({ nome: 'Viagem Nordeste' });
  });

  it('retorna 404 quando o usuário não é membro do grupo', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(null);
    const res = await request(app).post('/api/grupos/1/dashboard').set('Authorization', `Bearer ${token}`).send(body);
    expect(res.status).toBe(404);
  });

  it('rejeita conta de outra família (proteção contra IDOR)', async () => {
    const contaSpy = vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([]);
    const res = await request(app).post('/api/grupos/1/dashboard').set('Authorization', `Bearer ${token}`).send(body);
    expect(res.status).toBe(400);
    expect(contaSpy.mock.calls[0][0].where).toEqual({ familiaId: 1, id: { in: [3] } });
  });

  it('rejeita conta numa moeda diferente da das despesas do destino', async () => {
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([{ id: 3, familiaId: 1, moeda: 'USD' }]);
    const res = await request(app).post('/api/grupos/1/dashboard').set('Authorization', `Bearer ${token}`).send(body);
    expect(res.status).toBe(400);
  });

  it('manda cada despesa pra conta da própria moeda e deixa de fora moedas sem destino', async () => {
    vi.spyOn(prisma.conta, 'findMany').mockResolvedValue([
      { id: 3, familiaId: 1, moeda: 'BRL' },
      { id: 9, familiaId: 1, moeda: 'EUR' },
    ]);
    vi.spyOn(prisma.despesaGrupo, 'findMany').mockResolvedValue([
      despesa({ id: 4, moeda: 'BRL' }),
      despesa({ id: 5, moeda: 'EUR', divisoes: [{ membroId: 1, valorDevido: new Prisma.Decimal('20.00') }] }),
      despesa({ id: 6, moeda: 'USD' }),
    ]);
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.transacao, 'aggregate').mockResolvedValue({ _max: { ordem: null } });
    const createSpy = vi.spyOn(prisma.transacao, 'create').mockImplementation(args => args);
    vi.spyOn(prisma, '$transaction').mockResolvedValue([]);
    vi.spyOn(prisma.orcamento, 'findUnique').mockResolvedValue(null);

    const res = await request(app).post('/api/grupos/1/dashboard').set('Authorization', `Bearer ${token}`)
      .send({ categoria: 'Lazer', destinos: [{ moeda: 'BRL', contaId: 3 }, { moeda: 'EUR', contaId: 9 }] });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ count: 2 });
    expect(createSpy.mock.calls.map(c => [c[0].data.despesaGrupoId, c[0].data.contaId, c[0].data.valor])).toEqual([[4, 3, 45], [5, 9, 20]]);
  });

  it('cria uma despesa por despesa do grupo, com a parte do usuário e a data da despesa, pulando as já importadas', async () => {
    vi.spyOn(prisma.despesaGrupo, 'findMany').mockResolvedValue([
      despesa({ id: 4, data: '2026-08-09' }),
      despesa({ id: 5, data: '2026-08-10' }),
      despesa({ id: 6, data: '2026-08-10', descricao: 'Uber', divisoes: [{ membroId: 1, valorDevido: new Prisma.Decimal('12.50') }] }),
    ]);
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([{ despesaGrupoId: 4 }]);
    vi.spyOn(prisma.transacao, 'aggregate').mockResolvedValue({ _max: { ordem: 0 } });
    const createSpy = vi.spyOn(prisma.transacao, 'create').mockImplementation(args => args);
    vi.spyOn(prisma, '$transaction').mockResolvedValue([]);
    vi.spyOn(prisma.orcamento, 'findUnique').mockResolvedValue(null);

    const res = await request(app).post('/api/grupos/1/dashboard').set('Authorization', `Bearer ${token}`).send(body);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ count: 2 });
    expect(createSpy.mock.calls.map(c => c[0].data)).toEqual([
      expect.objectContaining({ despesaGrupoId: 5, usuarioId: 7, familiaId: 1, contaId: 3, tipo: 'despesa', valor: 45, categoria: 'Lazer', descricao: 'Jantar (Viagem Nordeste)', data: '2026-08-10', ordem: 1 }),
      expect.objectContaining({ despesaGrupoId: 6, valor: 12.5, descricao: 'Uber (Viagem Nordeste)', data: '2026-08-10', ordem: 2 }),
    ]);
  });

  it('retorna 400 quando tudo já foi importado', async () => {
    vi.spyOn(prisma.despesaGrupo, 'findMany').mockResolvedValue([despesa()]);
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([{ despesaGrupoId: 5 }]);
    const createSpy = vi.spyOn(prisma.transacao, 'create');

    const res = await request(app).post('/api/grupos/1/dashboard').set('Authorization', `Bearer ${token}`).send(body);

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('retorna 409 (não 500) quando uma importação paralela esbarra no @@unique', async () => {
    vi.spyOn(prisma.despesaGrupo, 'findMany').mockResolvedValue([despesa()]);
    vi.spyOn(prisma.transacao, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.transacao, 'aggregate').mockResolvedValue({ _max: { ordem: null } });
    vi.spyOn(prisma.transacao, 'create').mockImplementation(args => args);
    vi.spyOn(prisma, '$transaction').mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 'x' }));

    const res = await request(app).post('/api/grupos/1/dashboard').set('Authorization', `Bearer ${token}`).send(body);

    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/grupos/:id/despesas/:despesaId', () => {
  it('permite exclusão por quem criou a despesa mesmo não sendo admin', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'membro', usuarioId: 7 }));
    vi.spyOn(prisma.despesaGrupo, 'findFirst').mockResolvedValue({ id: 5, grupoId: 1, criadoPorUsuarioId: 7 });
    const deleteSpy = vi.spyOn(prisma.despesaGrupo, 'delete').mockResolvedValue({});

    const res = await request(app).delete('/api/grupos/1/despesas/5').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it('retorna 403 pra quem não criou e não é admin', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'membro', usuarioId: 7 }));
    vi.spyOn(prisma.despesaGrupo, 'findFirst').mockResolvedValue({ id: 5, grupoId: 1, criadoPorUsuarioId: 8 });
    const deleteSpy = vi.spyOn(prisma.despesaGrupo, 'delete');

    const res = await request(app).delete('/api/grupos/1/despesas/5').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});

describe('POST /api/grupos/:id/pagamentos', () => {
  it('rejeita quem paga que não é membro do grupo (400, proteção contra IDOR)', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro());
    vi.spyOn(prisma.grupoMembro, 'findMany').mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const createSpy = vi.spyOn(prisma.pagamentoGrupo, 'create');

    const res = await request(app)
      .post('/api/grupos/1/pagamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ deMembroId: 999, paraMembroId: 1, valor: 45, data: '2026-08-11' });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejeita pagador e recebedor iguais', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro());
    vi.spyOn(prisma.grupoMembro, 'findMany').mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const createSpy = vi.spyOn(prisma.pagamentoGrupo, 'create');

    const res = await request(app)
      .post('/api/grupos/1/pagamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ deMembroId: 1, paraMembroId: 1, valor: 45, data: '2026-08-11' });

    expect(res.status).toBe(400);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('registra o pagamento no caminho feliz', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro());
    vi.spyOn(prisma.grupoMembro, 'findMany').mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const createSpy = vi.spyOn(prisma.pagamentoGrupo, 'create').mockResolvedValue({
      id: 1, grupoId: 1, deMembroId: 2, paraMembroId: 1, valor: new Prisma.Decimal('45.00'), data: '2026-08-11', criadoPorUsuarioId: 7, createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/grupos/1/pagamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ deMembroId: 2, paraMembroId: 1, valor: 45, data: '2026-08-11' });

    expect(res.status).toBe(201);
    expect(createSpy.mock.calls[0][0].data).toEqual({
      grupoId: 1, deMembroId: 2, paraMembroId: 1, valor: 45, moeda: 'BRL', data: '2026-08-11', criadoPorUsuarioId: 7,
    });
    expect(res.body.valor).toBe(45);
  });
});

describe('DELETE /api/grupos/:id/pagamentos/:pagamentoId', () => {
  it('permite exclusão por quem registrou o pagamento mesmo não sendo admin', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'membro', usuarioId: 7 }));
    vi.spyOn(prisma.pagamentoGrupo, 'findFirst').mockResolvedValue({ id: 9, grupoId: 1, criadoPorUsuarioId: 7 });
    const deleteSpy = vi.spyOn(prisma.pagamentoGrupo, 'delete').mockResolvedValue({});

    const res = await request(app).delete('/api/grupos/1/pagamentos/9').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(deleteSpy).toHaveBeenCalledWith({ where: { id: 9 } });
  });

  it('retorna 403 pra quem não registrou e não é admin', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'membro', usuarioId: 7 }));
    vi.spyOn(prisma.pagamentoGrupo, 'findFirst').mockResolvedValue({ id: 9, grupoId: 1, criadoPorUsuarioId: 8 });
    const deleteSpy = vi.spyOn(prisma.pagamentoGrupo, 'delete');

    const res = await request(app).delete('/api/grupos/1/pagamentos/9').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o pagamento não existe', async () => {
    vi.spyOn(prisma.grupoMembro, 'findFirst').mockResolvedValue(rawMembro({ papel: 'admin' }));
    vi.spyOn(prisma.pagamentoGrupo, 'findFirst').mockResolvedValue(null);

    const res = await request(app).delete('/api/grupos/1/pagamentos/9').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
