import { vi, describe, it, expect } from 'vitest';
import { excluirConta, MODELOS_DA_FAMILIA } from './excluirConta.js';

// tx falso: cada model com os métodos usados, respondendo "vazio" por padrão.
function fakeTx() {
  const modelos = ['usuario', 'familia', 'conexaoBancaria', 'grupo', 'grupoMembro', 'despesaGrupo', 'pagamentoGrupo', ...MODELOS_DA_FAMILIA];
  const tx = {};
  for (const m of modelos) {
    tx[m] = {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
  }
  tx.usuario.findUnique.mockResolvedValue({ id: 7, nome: 'Mariah', familiaId: 1 });
  return tx;
}

describe('excluirConta', () => {
  it('família só dela: apaga a pessoa e a família, sem transferir nada', async () => {
    const tx = fakeTx();

    await excluirConta(tx, 7);

    for (const m of MODELOS_DA_FAMILIA) expect(tx[m].updateMany).not.toHaveBeenCalled();
    expect(tx.usuario.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(tx.familia.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('família compartilhada: o dono que sai passa o posto e os lançamentos pro membro mais antigo', async () => {
    const tx = fakeTx();
    tx.usuario.findMany.mockResolvedValue([{ id: 8, papelFamilia: 'membro' }, { id: 9, papelFamilia: 'membro' }]);
    tx.usuario.count.mockResolvedValue(2);

    await excluirConta(tx, 7);

    expect(tx.usuario.update).toHaveBeenCalledWith({ where: { id: 8 }, data: { papelFamilia: 'dono' } });
    expect(tx.conta.updateMany).toHaveBeenCalledWith({ where: { usuarioId: 7, familiaId: 1 }, data: { usuarioId: 8 } });
    expect(tx.transacao.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 7, familiaId: 1 },
      data: { usuarioId: 8, despesaGrupoId: null, pagamentoGrupoId: null },
    });
    expect(tx.familia.delete).not.toHaveBeenCalled();
  });

  it('família compartilhada sendo membro: os lançamentos vão pro dono atual, sem promover ninguém', async () => {
    const tx = fakeTx();
    tx.usuario.findMany.mockResolvedValue([{ id: 8, papelFamilia: 'membro' }, { id: 9, papelFamilia: 'dono' }]);
    tx.usuario.count.mockResolvedValue(2);

    await excluirConta(tx, 7);

    expect(tx.usuario.update).not.toHaveBeenCalled();
    expect(tx.meta.updateMany).toHaveBeenCalledWith({ where: { usuarioId: 7, familiaId: 1 }, data: { usuarioId: 9 } });
  });

  it('inclui famílias antigas onde ainda há lançamentos dela', async () => {
    const tx = fakeTx();
    tx.transacao.findMany.mockResolvedValue([{ familiaId: 5 }]);
    tx.usuario.findMany.mockImplementation(({ where }) => Promise.resolve(where.familiaId === 5 ? [{ id: 20, papelFamilia: 'dono' }] : []));
    tx.usuario.count.mockImplementation(({ where }) => Promise.resolve(where.familiaId === 5 ? 1 : 0));

    await excluirConta(tx, 7);

    expect(tx.transacao.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { usuarioId: 7, familiaId: 5 } }));
    expect(tx.familia.delete).toHaveBeenCalledTimes(1);
    expect(tx.familia.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('apaga as conexões bancárias (nunca herdadas) e devolve os itens pra revogar na Pluggy', async () => {
    const tx = fakeTx();
    tx.conexaoBancaria.findMany.mockResolvedValue([{ pluggyItemId: 'item-1' }]);

    const itens = await excluirConta(tx, 7);

    expect(tx.conexaoBancaria.deleteMany).toHaveBeenCalledWith({ where: { usuarioId: 7 } });
    expect(itens).toEqual(['item-1']);
  });

  it('grupo com outros membros com conta: vira convidado e passa o que criou pra um admin', async () => {
    const tx = fakeTx();
    tx.grupoMembro.findMany.mockImplementation(({ where }) => Promise.resolve(
      where.usuarioId === 7 ? [{ grupoId: 3 }] : [{ id: 31, usuarioId: 8, papel: 'membro' }],
    ));

    await excluirConta(tx, 7);

    expect(tx.grupoMembro.update).toHaveBeenCalledWith({ where: { id: 31 }, data: { papel: 'admin' } });
    expect(tx.grupo.updateMany).toHaveBeenCalledWith({ where: { id: 3, criadorUsuarioId: 7 }, data: { criadorUsuarioId: 8 } });
    expect(tx.despesaGrupo.updateMany).toHaveBeenCalledWith({ where: { grupoId: 3, criadoPorUsuarioId: 7 }, data: { criadoPorUsuarioId: 8 } });
    expect(tx.pagamentoGrupo.updateMany).toHaveBeenCalledWith({ where: { grupoId: 3, criadoPorUsuarioId: 7 }, data: { criadoPorUsuarioId: 8 } });
    expect(tx.grupoMembro.updateMany).toHaveBeenCalledWith({
      where: { grupoId: 3, usuarioId: 7 },
      data: { usuarioId: null, nomeConvidado: 'Mariah', papel: 'membro' },
    });
    expect(tx.grupo.delete).not.toHaveBeenCalled();
  });

  it('grupo sem outro membro com conta (só ela ou só convidados): apaga o grupo', async () => {
    const tx = fakeTx();
    tx.grupoMembro.findMany.mockImplementation(({ where }) => Promise.resolve(where.usuarioId === 7 ? [{ grupoId: 4 }] : []));

    await excluirConta(tx, 7);

    expect(tx.despesaGrupo.deleteMany).toHaveBeenCalledWith({ where: { grupoId: 4 } });
    expect(tx.pagamentoGrupo.deleteMany).toHaveBeenCalledWith({ where: { grupoId: 4 } });
    expect(tx.grupo.delete).toHaveBeenCalledWith({ where: { id: 4 } });
  });

  it('também resolve grupos de onde já saiu mas que ainda a têm como criadora', async () => {
    const tx = fakeTx();
    tx.grupo.findMany.mockResolvedValue([{ id: 6 }]);
    tx.grupoMembro.findMany.mockImplementation(({ where }) => Promise.resolve(
      where.usuarioId === 7 ? [] : [{ id: 61, usuarioId: 8, papel: 'admin' }],
    ));

    await excluirConta(tx, 7);

    expect(tx.grupo.updateMany).toHaveBeenCalledWith({ where: { id: 6, criadorUsuarioId: 7 }, data: { criadorUsuarioId: 8 } });
    expect(tx.grupoMembro.update).not.toHaveBeenCalled();
  });
});
