const prisma = require('../database/db');

// Reordenação manual (arrastar e soltar) das listas em cards: contas, metas, orçamentos,
// eventos, recorrências e grupos. Diferente de reorderDia (transações, que aparecem
// paginadas e filtradas), essas listas sempre vêm inteiras pra tela — então o cliente manda
// a lista completa na nova ordem, e qualquer divergência (item de fora, repetido, de outra
// família) é recusada em vez de mesclada.
// Retorna { erro } quando a entrada é inválida, ou { ordens: [{ id, ordem }] }.
//
// As posições gravadas vão de -n a -1 (topo = mais negativo): assim um registro criado
// depois (ordem default 0) cai no fim da lista sem nenhuma rota de criação precisar saber
// a "próxima posição" — inclusive as que criam em lote, como a sincronização Open Finance.
function reorderLista(idsAtuais, idsNovaOrdem) {
  if (!Array.isArray(idsNovaOrdem) || idsNovaOrdem.length === 0) {
    return { erro: 'Envie a lista completa na nova ordem' };
  }
  const ids = idsNovaOrdem.map(Number);
  if (ids.some(id => !Number.isInteger(id))) return { erro: 'Lista inválida' };
  if (new Set(ids).size !== ids.length) return { erro: 'Lista com itens repetidos' };

  const atuais = new Set(idsAtuais);
  if (ids.length !== atuais.size || ids.some(id => !atuais.has(id))) {
    return { erro: 'A lista mudou desde que a tela foi carregada — recarregue e tente de novo' };
  }
  return { ordens: ids.map((id, i) => ({ id, ordem: i - ids.length })) };
}

// Ordem de listagem padrão dessas listas: posição manual e, no empate, a de criação.
const ORDEM_MANUAL = [{ ordem: 'asc' }, { createdAt: 'asc' }];

// Handler de PUT /<recurso>/reorder pros recursos escopados por família — mesmo corpo em
// todos ({ ids } na nova ordem), por isso fica aqui em vez de repetido em cada rota.
// Grupos não usam isto: a posição lá é por usuário (GrupoMembro), ver routes/grupos.js.
function reorderHandler(modelo, mensagemErro) {
  return async (req, res) => {
    try {
      const model = prisma[modelo];
      const atuais = await model.findMany({ where: { familiaId: req.familiaId }, select: { id: true } });
      const { erro, ordens } = reorderLista(atuais.map(r => r.id), req.body?.ids);
      if (erro) return res.status(400).json({ error: erro });

      await prisma.$transaction(ordens.map(({ id, ordem }) => model.update({ where: { id }, data: { ordem } })));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: mensagemErro });
    }
  };
}

module.exports = { reorderLista, reorderHandler, ORDEM_MANUAL };
