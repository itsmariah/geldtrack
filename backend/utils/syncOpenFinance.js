const prisma = require('../database/db');
const pluggyClient = require('./pluggyClient');
const { mapPluggyTransaction } = require('./mapPluggyTransaction');

// Primeira sincronização de uma conta traz os últimos 90 dias — janela razoável pra
// não trazer histórico demais de uma vez. Sincronizações seguintes só buscam desde a
// última vez (ver uso de conexao.ultimaSincronizacao abaixo).
const DIAS_HISTORICO_PRIMEIRA_SINCRONIZACAO = 90;

function subtractDays(date, days) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function toDateOnlyStr(date) {
  return date.toISOString().slice(0, 10);
}

// Aceita tanto `{ results: [...] }` quanto um array puro — a SDK da Pluggy não é
// consistente entre métodos sobre qual formato cada um devolve.
function extractList(response) {
  if (Array.isArray(response)) return response;
  return response?.results || [];
}

// Busca o item na Pluggy, atualiza o status salvo, e — se já estiver UPDATED — importa
// contas e transações novas. Idempotente: contas são casadas por pluggyAccountId,
// transações por pluggyTransactionId (skipDuplicates), então rodar de novo não duplica
// nada. Chamado tanto pelo botão "sincronizar agora" quanto pelo webhook da Pluggy.
async function sincronizarConexao(conexaoId) {
  const conexao = await prisma.conexaoBancaria.findUnique({ where: { id: conexaoId } });
  if (!conexao) throw new Error('Conexão não encontrada');

  const item = await pluggyClient.fetchItem(conexao.pluggyItemId);
  const erro = ['LOGIN_ERROR', 'OUTDATED'].includes(item.status)
    ? (item.executionStatus || 'Erro ao sincronizar com o banco')
    : null;

  await prisma.conexaoBancaria.update({ where: { id: conexaoId }, data: { status: item.status, erro } });

  if (item.status !== 'UPDATED') {
    return { status: item.status, contasAtualizadas: 0, transacoesImportadas: 0 };
  }

  const accounts = extractList(await pluggyClient.fetchAccounts(conexao.pluggyItemId));
  let transacoesImportadas = 0;

  for (const account of accounts) {
    let conta = await prisma.conta.findUnique({ where: { pluggyAccountId: account.id } });
    const primeiraSincronizacao = !conta;
    const dateFrom = primeiraSincronizacao
      ? subtractDays(new Date(), DIAS_HISTORICO_PRIMEIRA_SINCRONIZACAO)
      : conexao.ultimaSincronizacao || subtractDays(new Date(), DIAS_HISTORICO_PRIMEIRA_SINCRONIZACAO);

    const transactions = extractList(
      await pluggyClient.fetchAllTransactions(account.id, { dateFrom: toDateOnlyStr(dateFrom) })
    );

    if (primeiraSincronizacao) {
      // saldoInicial é âncorado uma única vez, na criação: o saldo real reportado pela
      // Pluggy menos o efeito das transações que estamos importando agora — assim
      // saldoInicial + receitas - despesas bate com o saldo real da conta no banco.
      const deltaImportado = transactions.reduce((soma, t) => soma + Number(t.amount), 0);
      const tipoConta = String(account.type || '').toUpperCase().includes('CREDIT') ? 'cartao' : 'corrente';
      conta = await prisma.conta.create({
        data: {
          usuarioId: conexao.usuarioId,
          familiaId: conexao.familiaId,
          conexaoId: conexao.id,
          pluggyAccountId: account.id,
          nome: account.name || conexao.nomeConector,
          // Agrupa as contas do mesmo banco na tela de Contas (conta corrente + cartão do
          // Nubank sob "Nubank"). Só na criação — depois é do usuário, que pode renomear ou
          // limpar, e um novo sync não pode desfazer isso.
          instituicao: conexao.nomeConector || null,
          tipo: tipoConta,
          saldoInicial: Number(account.balance || 0) - deltaImportado,
        },
      });
    }

    if (transactions.length > 0) {
      const created = await prisma.transacao.createMany({
        data: transactions.map(t => mapPluggyTransaction(t, { usuarioId: conexao.usuarioId, familiaId: conexao.familiaId, contaId: conta.id })),
        skipDuplicates: true,
      });
      transacoesImportadas += created.count;
    }
  }

  await prisma.conexaoBancaria.update({ where: { id: conexaoId }, data: { ultimaSincronizacao: new Date() } });

  return { status: 'UPDATED', contasAtualizadas: accounts.length, transacoesImportadas };
}

module.exports = { sincronizarConexao, DIAS_HISTORICO_PRIMEIRA_SINCRONIZACAO, extractList };
