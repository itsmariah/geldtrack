// Recebe todos os ids de um dia na ordem atual (idsDoDia) e o subconjunto que o usuário
// reordenou na tela (idsReordenados, na nova ordem). O subconjunto pode não ser o dia
// inteiro — com filtro ativo ou com o dia partido entre duas páginas, a tela só mostra
// parte dele. Por isso os ids reordenados ocupam exatamente as mesmas posições que já
// ocupavam no dia, e os que ficaram de fora da tela não saem do lugar.
// Retorna { erro } quando a entrada é inválida, ou { ordem } com o dia inteiro reordenado.
function reorderDia(idsDoDia, idsReordenados) {
  if (!Array.isArray(idsReordenados) || idsReordenados.length < 2) {
    return { erro: 'Envie pelo menos duas transações para reordenar' };
  }
  const ids = idsReordenados.map(Number);
  if (ids.some(id => !Number.isInteger(id))) return { erro: 'Lista de transações inválida' };
  if (new Set(ids).size !== ids.length) return { erro: 'Lista de transações com itens repetidos' };

  const doDia = new Set(idsDoDia);
  if (ids.some(id => !doDia.has(id))) return { erro: 'Todas as transações precisam ser do mesmo dia' };

  const reordenados = new Set(ids);
  let proximo = 0;
  const ordem = idsDoDia.map(id => (reordenados.has(id) ? ids[proximo++] : id));
  return { ordem };
}

module.exports = { reorderDia };
