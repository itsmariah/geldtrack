// Select de Transacao sem o campo anexo (blob base64 de imagem/PDF) — usado nas rotas de
// listagem, export e relatório, que nunca precisam do comprovante e não devem pesar a
// resposta com ele. O anexo completo só é buscado em GET /transactions/:id/anexo.
const TRANSACAO_SELECT_SEM_ANEXO = {
  id: true,
  usuarioId: true,
  tipo: true,
  valor: true,
  categoria: true,
  descricao: true,
  data: true,
  createdAt: true,
  updatedAt: true,
  recorrenciaId: true,
  contaId: true,
  eventoId: true,
  pluggyTransactionId: true,
  anexoNome: true,
  // Origem do valor quando ele foi convertido de outra moeda (ver schema) — a lista mostra
  // "US$ 20,00 (R$ 103,62 de acordo com a cotação de 30/09/2026)".
  moedaOriginal: true,
  valorOriginal: true,
  taxaConversao: true,
  dataCotacao: true,
  // Nome de quem lançou — usado no frontend pra mostrar "por Fulano" quando a
  // transação foi criada por outro membro da família, não pelo usuário logado.
  usuario: { select: { nome: true } },
  // Moeda da conta (a transação sempre herda a moeda da conta, nunca tem a sua
  // própria) — cada linha é exibida na moeda de origem, nunca convertida individualmente.
  conta: { select: { nome: true, moeda: true } },
  // Nome/status do evento vinculado (se houver) — pra mostrar a etiqueta na lista sem
  // round-trip extra; status serve pra rotular "(encerrado)" quando aplicável.
  evento: { select: { id: true, nome: true, status: true } },
};

module.exports = { TRANSACAO_SELECT_SEM_ANEXO };
