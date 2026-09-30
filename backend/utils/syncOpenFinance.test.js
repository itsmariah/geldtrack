import { vi, describe, it, expect, afterEach } from 'vitest';
import { sincronizarConexao, extractList } from './syncOpenFinance.js';

const prisma = require('../database/db');
const pluggyClient = require('./pluggyClient');

afterEach(() => vi.restoreAllMocks());

describe('extractList', () => {
  it('retorna o array direto quando a resposta já é um array', () => {
    expect(extractList([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('extrai .results quando a resposta é um envelope', () => {
    expect(extractList({ results: [1, 2] })).toEqual([1, 2]);
  });

  it('retorna array vazio quando não há results', () => {
    expect(extractList({})).toEqual([]);
    expect(extractList(null)).toEqual([]);
  });
});

describe('sincronizarConexao', () => {
  it('lança erro quando a conexão não existe', async () => {
    vi.spyOn(prisma.conexaoBancaria, 'findUnique').mockResolvedValue(null);
    await expect(sincronizarConexao(999)).rejects.toThrow('Conexão não encontrada');
  });

  it('atualiza o status e para sem importar nada quando o item ainda não terminou de sincronizar', async () => {
    vi.spyOn(prisma.conexaoBancaria, 'findUnique').mockResolvedValue({ id: 1, pluggyItemId: 'item-1', usuarioId: 7, ultimaSincronizacao: null });
    vi.spyOn(pluggyClient, 'fetchItem').mockResolvedValue({ status: 'UPDATING' });
    const updateSpy = vi.spyOn(prisma.conexaoBancaria, 'update').mockResolvedValue({});
    const fetchAccountsSpy = vi.spyOn(pluggyClient, 'fetchAccounts');

    const result = await sincronizarConexao(1);

    expect(result).toEqual({ status: 'UPDATING', contasAtualizadas: 0, transacoesImportadas: 0 });
    expect(updateSpy).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'UPDATING', erro: null } });
    expect(fetchAccountsSpy).not.toHaveBeenCalled();
  });

  it('registra o erro quando o item falha com LOGIN_ERROR', async () => {
    vi.spyOn(prisma.conexaoBancaria, 'findUnique').mockResolvedValue({ id: 1, pluggyItemId: 'item-1', usuarioId: 7, ultimaSincronizacao: null });
    vi.spyOn(pluggyClient, 'fetchItem').mockResolvedValue({ status: 'LOGIN_ERROR', executionStatus: 'Credenciais inválidas' });
    const updateSpy = vi.spyOn(prisma.conexaoBancaria, 'update').mockResolvedValue({});

    const result = await sincronizarConexao(1);

    expect(result.status).toBe('LOGIN_ERROR');
    expect(updateSpy).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'LOGIN_ERROR', erro: 'Credenciais inválidas' } });
  });

  it('na primeira sincronização de uma conta, cria a Conta com saldoInicial ancorado no saldo real menos as transações importadas', async () => {
    vi.spyOn(prisma.conexaoBancaria, 'findUnique').mockResolvedValue({ id: 1, pluggyItemId: 'item-1', usuarioId: 7, ultimaSincronizacao: null, nomeConector: 'Pluggy Bank' });
    vi.spyOn(pluggyClient, 'fetchItem').mockResolvedValue({ status: 'UPDATED' });
    vi.spyOn(prisma.conexaoBancaria, 'update').mockResolvedValue({});
    vi.spyOn(pluggyClient, 'fetchAccounts').mockResolvedValue({
      results: [{ id: 'acc-1', name: 'Conta Corrente', type: 'BANK', balance: 1000 }],
    });
    vi.spyOn(prisma.conta, 'findUnique').mockResolvedValue(null); // ainda não existe localmente
    const createContaSpy = vi.spyOn(prisma.conta, 'create').mockResolvedValue({ id: 42 });
    vi.spyOn(pluggyClient, 'fetchAllTransactions').mockResolvedValue([
      { id: 'tx-1', amount: 500, category: 'Salário', description: '', date: '2026-08-01' },
      { id: 'tx-2', amount: -200, category: 'Alimentação', description: '', date: '2026-08-02' },
    ]);
    const createManySpy = vi.spyOn(prisma.transacao, 'createMany').mockResolvedValue({ count: 2 });

    const result = await sincronizarConexao(1);

    // saldo real 1000, transações importadas somam +300 (500-200) -> saldoInicial = 700
    expect(createContaSpy.mock.calls[0][0].data).toMatchObject({
      usuarioId: 7, conexaoId: 1, pluggyAccountId: 'acc-1', nome: 'Conta Corrente', tipo: 'corrente', saldoInicial: 700,
      instituicao: 'Pluggy Bank',
    });
    expect(createManySpy.mock.calls[0][0].data).toHaveLength(2);
    expect(createManySpy.mock.calls[0][0].skipDuplicates).toBe(true);
    expect(result).toEqual({ status: 'UPDATED', contasAtualizadas: 1, transacoesImportadas: 2 });
  });

  it('marca conta existente como cartão quando o tipo da Pluggy indica crédito', async () => {
    vi.spyOn(prisma.conexaoBancaria, 'findUnique').mockResolvedValue({ id: 1, pluggyItemId: 'item-1', usuarioId: 7, ultimaSincronizacao: null, nomeConector: 'Pluggy Bank' });
    vi.spyOn(pluggyClient, 'fetchItem').mockResolvedValue({ status: 'UPDATED' });
    vi.spyOn(prisma.conexaoBancaria, 'update').mockResolvedValue({});
    vi.spyOn(pluggyClient, 'fetchAccounts').mockResolvedValue([{ id: 'acc-2', name: 'Cartão', type: 'CREDIT', balance: -300 }]);
    vi.spyOn(prisma.conta, 'findUnique').mockResolvedValue(null);
    const createContaSpy = vi.spyOn(prisma.conta, 'create').mockResolvedValue({ id: 43 });
    vi.spyOn(pluggyClient, 'fetchAllTransactions').mockResolvedValue([]);
    vi.spyOn(prisma.transacao, 'createMany').mockResolvedValue({ count: 0 });

    await sincronizarConexao(1);

    expect(createContaSpy.mock.calls[0][0].data.tipo).toBe('cartao');
  });

  it('não recria a conta numa sincronização seguinte, e busca transações a partir da última sincronização', async () => {
    const ultimaSincronizacao = new Date('2026-08-15T00:00:00.000Z');
    vi.spyOn(prisma.conexaoBancaria, 'findUnique').mockResolvedValue({ id: 1, pluggyItemId: 'item-1', usuarioId: 7, ultimaSincronizacao, nomeConector: 'Pluggy Bank' });
    vi.spyOn(pluggyClient, 'fetchItem').mockResolvedValue({ status: 'UPDATED' });
    vi.spyOn(prisma.conexaoBancaria, 'update').mockResolvedValue({});
    vi.spyOn(pluggyClient, 'fetchAccounts').mockResolvedValue([{ id: 'acc-1', name: 'Conta Corrente', type: 'BANK', balance: 1200 }]);
    vi.spyOn(prisma.conta, 'findUnique').mockResolvedValue({ id: 42 }); // já existe
    const createContaSpy = vi.spyOn(prisma.conta, 'create');
    const fetchTxSpy = vi.spyOn(pluggyClient, 'fetchAllTransactions').mockResolvedValue([
      { id: 'tx-3', amount: 100, category: 'Outros', description: '', date: '2026-08-20' },
    ]);
    vi.spyOn(prisma.transacao, 'createMany').mockResolvedValue({ count: 1 });

    const result = await sincronizarConexao(1);

    expect(createContaSpy).not.toHaveBeenCalled();
    expect(fetchTxSpy.mock.calls[0][1]).toEqual({ dateFrom: '2026-08-15' });
    expect(result.transacoesImportadas).toBe(1);
  });

  it('não chama createMany quando não há transações novas', async () => {
    vi.spyOn(prisma.conexaoBancaria, 'findUnique').mockResolvedValue({ id: 1, pluggyItemId: 'item-1', usuarioId: 7, ultimaSincronizacao: new Date(), nomeConector: 'Pluggy Bank' });
    vi.spyOn(pluggyClient, 'fetchItem').mockResolvedValue({ status: 'UPDATED' });
    vi.spyOn(prisma.conexaoBancaria, 'update').mockResolvedValue({});
    vi.spyOn(pluggyClient, 'fetchAccounts').mockResolvedValue([{ id: 'acc-1', name: 'Conta Corrente', type: 'BANK', balance: 1000 }]);
    vi.spyOn(prisma.conta, 'findUnique').mockResolvedValue({ id: 42 });
    vi.spyOn(pluggyClient, 'fetchAllTransactions').mockResolvedValue([]);
    const createManySpy = vi.spyOn(prisma.transacao, 'createMany');

    const result = await sincronizarConexao(1);

    expect(createManySpy).not.toHaveBeenCalled();
    expect(result.transacoesImportadas).toBe(0);
  });
});
