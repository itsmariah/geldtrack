// Exclusão de conta (exigida pela App Store e pela Play Store). Roda dentro de um
// prisma.$transaction interativo — tudo ou nada.
//
// Regras:
// - Família compartilhada: o que a pessoa lançou fica com a família, no nome do dono
//   (se quem sai é o dono, o membro mais antigo assume, igual a /familia/sair). Só a
//   pessoa (nome, e-mail, foto, senha) é apagada. Vale também pra famílias antigas de
//   onde ela já saiu, mas onde ainda há lançamentos dela.
// - Família só dela: apagada inteira, com tudo dentro.
// - Conexões bancárias são sempre apagadas, nunca herdadas — usam as credenciais do banco
//   da pessoa. As contas ligadas a elas ficam como contas manuais (conexaoId SetNull).
// - Grupos: o histórico de despesas/pagamentos não pode sumir (mesma regra de /sair), então
//   ela vira "convidado sem conta" com o nome dela. O que estava no nome dela como criador
//   passa pra um admin com conta. Grupo sem nenhum outro membro com conta é apagado —
//   ninguém mais conseguiria abri-lo.

// Tabelas com usuarioId ("quem lançou") + familiaId. ConexaoBancaria fica de fora de
// propósito (ver acima).
const MODELOS_DA_FAMILIA = ['transacao', 'conta', 'categoria', 'transferencia', 'recorrencia', 'meta', 'orcamento', 'evento'];

async function transferirFamilias(tx, usuarioId, familiaIds) {
  for (const familiaId of familiaIds) {
    const outros = await tx.usuario.findMany({
      where: { familiaId, id: { not: usuarioId } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, papelFamilia: true },
    });
    if (outros.length === 0) continue; // família só dela — apagada no fim

    let herdeiro = outros.find(o => o.papelFamilia === 'dono');
    if (!herdeiro) {
      herdeiro = outros[0];
      await tx.usuario.update({ where: { id: herdeiro.id }, data: { papelFamilia: 'dono' } });
    }

    for (const modelo of MODELOS_DA_FAMILIA) {
      // Transação importada de um grupo perde o vínculo com a despesa/pagamento: o
      // @@unique([despesaGrupoId, usuarioId]) colidiria se o herdeiro também importou a
      // parte dele, e a sincronização com o grupo é por pessoa — não faz mais sentido.
      const data = modelo === 'transacao'
        ? { usuarioId: herdeiro.id, despesaGrupoId: null, pagamentoGrupoId: null }
        : { usuarioId: herdeiro.id };
      await tx[modelo].updateMany({ where: { usuarioId, familiaId }, data });
    }
  }
}

async function resolverGrupos(tx, usuario) {
  const usuarioId = usuario.id;
  const [membros, criados, despesas, pagamentos] = await Promise.all([
    tx.grupoMembro.findMany({ where: { usuarioId }, select: { grupoId: true } }),
    tx.grupo.findMany({ where: { criadorUsuarioId: usuarioId }, select: { id: true } }),
    tx.despesaGrupo.findMany({ where: { criadoPorUsuarioId: usuarioId }, select: { grupoId: true }, distinct: ['grupoId'] }),
    tx.pagamentoGrupo.findMany({ where: { criadoPorUsuarioId: usuarioId }, select: { grupoId: true }, distinct: ['grupoId'] }),
  ]);
  const grupoIds = new Set([
    ...membros.map(m => m.grupoId),
    ...criados.map(g => g.id),
    ...despesas.map(d => d.grupoId),
    ...pagamentos.map(p => p.grupoId),
  ]);

  for (const grupoId of grupoIds) {
    const outrosComConta = await tx.grupoMembro.findMany({
      where: { grupoId, usuarioId: { not: null }, NOT: { usuarioId } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, usuarioId: true, papel: true },
    });

    if (outrosComConta.length === 0) {
      // Mesma ordem de DELETE /grupos/:id (despesas e pagamentos têm Restrict nos membros).
      await tx.despesaGrupo.deleteMany({ where: { grupoId } });
      await tx.pagamentoGrupo.deleteMany({ where: { grupoId } });
      await tx.grupo.delete({ where: { id: grupoId } });
      continue;
    }

    let admin = outrosComConta.find(m => m.papel === 'admin');
    if (!admin) {
      admin = outrosComConta[0];
      await tx.grupoMembro.update({ where: { id: admin.id }, data: { papel: 'admin' } });
    }

    await tx.grupo.updateMany({ where: { id: grupoId, criadorUsuarioId: usuarioId }, data: { criadorUsuarioId: admin.usuarioId } });
    await tx.despesaGrupo.updateMany({ where: { grupoId, criadoPorUsuarioId: usuarioId }, data: { criadoPorUsuarioId: admin.usuarioId } });
    await tx.pagamentoGrupo.updateMany({ where: { grupoId, criadoPorUsuarioId: usuarioId }, data: { criadoPorUsuarioId: admin.usuarioId } });
    await tx.grupoMembro.updateMany({
      where: { grupoId, usuarioId },
      data: { usuarioId: null, nomeConvidado: usuario.nome, papel: 'membro' },
    });
  }
}

// Retorna os pluggyItemIds das conexões apagadas — a revogação na Pluggy é feita pela rota
// depois do commit (é uma chamada externa, não pode desfazer a transação se falhar).
async function excluirConta(tx, usuarioId) {
  const usuario = await tx.usuario.findUnique({ where: { id: usuarioId }, select: { id: true, nome: true, familiaId: true } });

  const familiaIds = new Set([usuario.familiaId]);
  for (const modelo of MODELOS_DA_FAMILIA) {
    const linhas = await tx[modelo].findMany({ where: { usuarioId }, select: { familiaId: true }, distinct: ['familiaId'] });
    linhas.forEach(l => familiaIds.add(l.familiaId));
  }

  const conexoes = await tx.conexaoBancaria.findMany({ where: { usuarioId }, select: { pluggyItemId: true } });
  await tx.conexaoBancaria.deleteMany({ where: { usuarioId } });

  await transferirFamilias(tx, usuarioId, familiaIds);
  await resolverGrupos(tx, usuario);

  // O que sobrou com usuarioId dela (lançamentos em famílias só dela) vai junto em cascata.
  await tx.usuario.delete({ where: { id: usuarioId } });

  for (const familiaId of familiaIds) {
    const restantes = await tx.usuario.count({ where: { familiaId } });
    if (restantes === 0) await tx.familia.delete({ where: { id: familiaId } });
  }

  return conexoes.map(c => c.pluggyItemId);
}

module.exports = { excluirConta, MODELOS_DA_FAMILIA };
