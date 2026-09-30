const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { validateNomeGrupo, validateCodigoGrupo, validateNomeConvidado } = require('../utils/validateGrupo');
const { validateDespesaGrupoInput } = require('../utils/validateDespesaGrupo');
const { validatePagamentoGrupoInput } = require('../utils/validatePagamentoGrupo');
const { serializeGrupo, serializeGrupoMembro, serializeDespesaGrupo, serializeDespesasGrupo, serializePagamentoGrupo, serializePagamentosGrupo } = require('../utils/serializeGrupo');
const { gerarCodigoUnico } = require('../utils/gerarCodigoGrupo');
const { splitIgualmente } = require('../utils/splitDespesaGrupo');
const { calcularSaldosGrupo } = require('../utils/calcularSaldosGrupo');
const { descricaoTransacaoGrupo, parteDoMembro } = require('../utils/despesaGrupoTransacao');
const { proximaOrdemDoDia } = require('../utils/proximaOrdemDoDia');
const { buildTransactionDiff } = require('../utils/buildTransactionDiff');
const { notifyOrcamentoEstouradoSeNecessario } = require('../utils/notifyOrcamentoEstourado');
const { buscarCotacoes, taxaEntre, dataDaCotacao, converterValor } = require('../utils/currency');

const router = express.Router();
router.use(authMiddleware);

// Mesmo limite geral usado em /transactions, /orcamentos e /eventos, por usuário autenticado
const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
router.use(dataLimiter);

const membrosInclude = {
  membros: {
    include: { usuario: { select: { id: true, nome: true, email: true, foto: true } } },
    orderBy: { createdAt: 'asc' },
  },
};

// GrupoMembro é a primeira tabela de associação N:N do projeto — não dá pra resolver
// "o usuário é membro deste grupo?" em middleware global (não é um campo escalar como
// familiaId). Cada rota com :id de grupo chama isso primeiro; retorna null tanto se o
// grupo não existe quanto se o usuário não é membro dele (mesmo 404 pros dois casos,
// já usado em eventos.js/transactions.js, pra não vazar se um grupo existe ou não).
async function getMembroAtual(grupoId, usuarioId) {
  return prisma.grupoMembro.findFirst({ where: { grupoId, usuarioId } });
}

// Um membro com despesa registrada (como pagador ou como participante do rateio) ou
// pagamento registrado (como quem pagou ou quem recebeu) não pode ser removido — perderia
// o histórico de quem gastou/pagou o quê. O banco já garante isso via onDelete: Restrict;
// esta checagem só existe pra devolver uma mensagem amigável em vez de deixar o erro de FK
// do Postgres estourar como 500 (ver catch do P2003 abaixo).
async function membroTemAtividade(membroId) {
  const despesa = await prisma.despesaGrupo.findFirst({
    where: { OR: [{ pagoPorMembroId: membroId }, { divisoes: { some: { membroId } } }] },
  });
  if (despesa) return true;
  const pagamento = await prisma.pagamentoGrupo.findFirst({
    where: { OR: [{ deMembroId: membroId }, { paraMembroId: membroId }] },
  });
  return Boolean(pagamento);
}

// Se quem está saindo/sendo removido é o único admin do grupo e sobram outros membros,
// promove automaticamente o mais antigo restante — mesmo comportamento já usado pra
// "dono" em familia.js, evita precisar de um endpoint dedicado de "promover a admin".
async function promoverProximoAdminSeNecessario(grupoId, membroSaindoId, papelSaindo) {
  if (papelSaindo !== 'admin') return;
  const outrosAdmins = await prisma.grupoMembro.count({ where: { grupoId, papel: 'admin', id: { not: membroSaindoId } } });
  if (outrosAdmins > 0) return;
  const proximo = await prisma.grupoMembro.findFirst({ where: { grupoId, id: { not: membroSaindoId } }, orderBy: { createdAt: 'asc' } });
  if (proximo) await prisma.grupoMembro.update({ where: { id: proximo.id }, data: { papel: 'admin' } });
}

// Depois de editar uma despesa do grupo, leva a mudança pras transações que membros já
// adicionaram ao dashboard a partir dela — a data (e a descrição) sempre acompanham a
// despesa, pra ela aparecer no dia/mês certo do dashboard. O valor acompanha a nova parte
// do membro; se ele saiu do rateio, o valor fica como estava (não existe "parte zero" numa
// transação). Categoria/conta/evento escolhidos no dashboard não são tocados. Cada mudança
// entra no histórico de edição, igual a uma edição feita pelo próprio dashboard.
async function sincronizarTransacoesDaDespesa(despesa, membrosDoGrupo) {
  const transacoes = await prisma.transacao.findMany({
    where: { despesaGrupoId: despesa.id },
    include: { conta: { select: { moeda: true } } },
  });
  if (transacoes.length === 0) return;

  const grupo = await prisma.grupo.findUnique({ where: { id: despesa.grupoId }, select: { nome: true } });
  const membroIdPorUsuario = new Map(membrosDoGrupo.filter(m => m.usuarioId !== null).map(m => [m.usuarioId, m.id]));

  for (const t of transacoes) {
    const parte = parteDoMembro(despesa.divisoes, membroIdPorUsuario.get(t.usuarioId));
    const moedaDespesa = despesa.moeda || 'BRL';
    // O valor só acompanha a nova parte quando dá pra expressá-la na moeda da conta: direto
    // (mesma moeda) ou reconvertendo com a mesma taxa da importação (transação convertida,
    // despesa ainda na moeda original). Se a moeda da despesa mudou pra outra, a parte nova
    // não pode ir como está (seria € gravado como R$) — só data/descrição acompanham.
    let valor = Number(t.valor);
    const conversao = {};
    if (parte > 0) {
      if (t.moedaOriginal) {
        if (t.moedaOriginal === moedaDespesa) {
          valor = converterValor(parte, Number(t.taxaConversao));
          conversao.valorOriginal = parte;
        }
      } else if ((t.conta?.moeda || 'BRL') === moedaDespesa) {
        valor = parte;
      }
    }
    const novos = {
      data: despesa.data,
      descricao: descricaoTransacaoGrupo(despesa.descricao, grupo.nome),
      valor,
    };
    const alteracoes = buildTransactionDiff(t, { ...t, ...novos });
    const mudouOriginal = conversao.valorOriginal !== undefined && conversao.valorOriginal !== Number(t.valorOriginal);
    if (alteracoes.length === 0 && !mudouOriginal) continue;

    const ordemData = novos.data !== t.data ? { ordem: await proximaOrdemDoDia(t.familiaId, novos.data) } : {};
    await prisma.$transaction([
      prisma.transacao.update({ where: { id: t.id }, data: { ...novos, ...conversao, ...ordemData } }),
      ...(alteracoes.length > 0 ? [prisma.transacaoHistorico.create({ data: { transacaoId: t.id, alteracoes } })] : []),
    ]);
  }
}

// Grupos do usuário logado — nunca passa por familiaId, é a diferença arquitetural
// chave desta feature (um usuário pode estar em vários grupos, não só um).
router.get('/', async (req, res) => {
  try {
    const meusMembros = await prisma.grupoMembro.findMany({
      where: { usuarioId: req.userId },
      include: { grupo: { include: { _count: { select: { membros: true } } } } },
      orderBy: { grupo: { createdAt: 'desc' } },
    });
    const result = meusMembros.map(m => ({
      ...serializeGrupo(m.grupo),
      papel: m.papel,
      totalMembros: m.grupo._count.membros,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar grupos' });
  }
});

// Detalhe de um grupo: membros, despesas e o saldo "quem deve quem" — calculado na
// leitura a cada request, nunca persistido (mesmo princípio do saldo de Conta).
router.get('/:id', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });

    const grupo = await prisma.grupo.findUnique({
      where: { id: grupoId },
      include: {
        ...membrosInclude,
        despesas: { include: { divisoes: true }, orderBy: { data: 'desc' } },
        pagamentos: { orderBy: { data: 'desc' } },
      },
    });

    // noDashboard: se o usuário logado já adicionou a parte dele nesta despesa ao dashboard
    // (é por usuário, não por grupo — cada membro importa a própria parte).
    const importadas = await prisma.transacao.findMany({
      where: { usuarioId: req.userId, despesaGrupoId: { in: grupo.despesas.map(d => d.id) } },
      select: { despesaGrupoId: true, eventoId: true, familiaId: true, createdAt: true },
    });
    const importadasIds = new Set(importadas.map(t => t.despesaGrupoId));

    // eventoIdDashboard: o evento da importação mais recente deste grupo pro dashboard (só
    // na família atual do usuário) — o modal já abre com ele, pra viagem inteira cair no
    // mesmo evento sem escolher de novo a cada importação.
    const ultimaComEvento = importadas
      .filter(t => t.eventoId && t.familiaId === req.familiaId)
      .reduce((ultima, t) => (!ultima || t.createdAt > ultima.createdAt ? t : ultima), null);

    const despesas = serializeDespesasGrupo(grupo.despesas).map(d => ({ ...d, noDashboard: importadasIds.has(d.id) }));
    const pagamentos = serializePagamentosGrupo(grupo.pagamentos);
    res.json({
      ...serializeGrupo(grupo),
      despesas,
      pagamentos,
      saldos: calcularSaldosGrupo(despesas, pagamentos),
      eventoIdDashboard: ultimaComEvento?.eventoId ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar grupo' });
  }
});

// Cria o grupo e o GrupoMembro admin do criador numa escrita aninhada só — atômico por
// natureza (Prisma nested write), sem precisar de $transaction manual.
router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;
    const validationError = validateNomeGrupo(nome);
    if (validationError) return res.status(400).json({ error: validationError });

    const codigo = await gerarCodigoUnico();
    const grupo = await prisma.grupo.create({
      data: {
        nome: nome.trim(),
        codigo,
        criadorUsuarioId: req.userId,
        membros: { create: { usuarioId: req.userId, papel: 'admin' } },
      },
      include: membrosInclude,
    });
    res.status(201).json({ ...serializeGrupo(grupo), papel: 'admin', totalMembros: grupo.membros.length });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar grupo' });
  }
});

// Renomeia o grupo — só admin, mesma regra de excluir. Transações que já foram pro
// dashboard com "(nome antigo)" na descrição não mudam aqui: são dados da família de cada
// membro (só uma edição posterior da despesa leva a descrição nova pra elas).
router.put('/:id', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });
    if (meuMembro.papel !== 'admin') return res.status(403).json({ error: 'Só um admin pode renomear o grupo' });

    const { nome } = req.body;
    const validationError = validateNomeGrupo(nome);
    if (validationError) return res.status(400).json({ error: validationError });

    const grupo = await prisma.grupo.update({ where: { id: grupoId }, data: { nome: nome.trim() }, include: membrosInclude });
    res.json(serializeGrupo(grupo));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao renomear grupo' });
  }
});

// Entrar num grupo existente por código — diferente de familia.js's /entrar, isto NUNCA
// mexe em nada de Usuario, só cria uma linha de associação nova (um usuário pode estar
// em vários grupos ao mesmo tempo).
router.post('/entrar', async (req, res) => {
  try {
    const { codigo } = req.body;
    const validationError = validateCodigoGrupo(codigo);
    if (validationError) return res.status(400).json({ error: validationError });

    const grupo = await prisma.grupo.findUnique({ where: { codigo: String(codigo).trim().toUpperCase() } });
    if (!grupo) return res.status(404).json({ error: 'Código de grupo inválido' });

    const existente = await getMembroAtual(grupo.id, req.userId);
    if (existente) return res.status(400).json({ error: 'Você já é membro deste grupo' });

    await prisma.grupoMembro.create({ data: { grupoId: grupo.id, usuarioId: req.userId, papel: 'membro' } });

    const atualizado = await prisma.grupo.findUnique({ where: { id: grupo.id }, include: membrosInclude });
    res.status(201).json({ ...serializeGrupo(atualizado), papel: 'membro', totalMembros: atualizado.membros.length });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao entrar no grupo' });
  }
});

// Adiciona um convidado sem conta — qualquer membro pode (ação de baixo risco,
// equivalente a "adicionar um amigo" no Splitwise, não é restrita a admin).
router.post('/:id/convidados', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });

    const { nomeConvidado } = req.body;
    const validationError = validateNomeConvidado(nomeConvidado);
    if (validationError) return res.status(400).json({ error: validationError });

    const membro = await prisma.grupoMembro.create({
      data: { grupoId, nomeConvidado: nomeConvidado.trim(), papel: 'membro' },
    });
    res.status(201).json(serializeGrupoMembro(membro));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar convidado' });
  }
});

// Sair do grupo — só usuário de verdade chama isso (convidado não se autogerencia).
router.post('/:id/sair', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });

    const totalMembros = await prisma.grupoMembro.count({ where: { grupoId } });
    if (totalMembros <= 1) {
      return res.status(400).json({ error: 'Você é o único membro deste grupo — exclua o grupo em vez de sair' });
    }
    if (await membroTemAtividade(meuMembro.id)) {
      return res.status(400).json({ error: 'Você tem despesas ou pagamentos registrados neste grupo e não pode sair — peça pra um admin excluir o grupo, ou edite/exclua suas despesas e pagamentos primeiro' });
    }

    await promoverProximoAdminSeNecessario(grupoId, meuMembro.id, meuMembro.papel);

    try {
      await prisma.grupoMembro.delete({ where: { id: meuMembro.id } });
    } catch (err) {
      if (err.code === 'P2003') {
        return res.status(400).json({ error: 'Você tem despesas ou pagamentos registrados neste grupo e não pode sair' });
      }
      throw err;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao sair do grupo' });
  }
});

// Remove um membro (registrado ou convidado) — só admin, e não pode mirar a si mesmo
// (tem que usar /sair).
router.delete('/:id/membros/:membroId', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const membroId = Number(req.params.membroId);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });
    if (meuMembro.papel !== 'admin') return res.status(403).json({ error: 'Só um admin pode remover membros' });
    if (membroId === meuMembro.id) return res.status(400).json({ error: 'Use "sair do grupo" para remover a si mesmo' });

    const alvo = await prisma.grupoMembro.findFirst({ where: { id: membroId, grupoId } });
    if (!alvo) return res.status(404).json({ error: 'Membro não encontrado' });

    if (await membroTemAtividade(membroId)) {
      return res.status(400).json({ error: 'Este membro tem despesas ou pagamentos registrados neste grupo e não pode ser removido' });
    }

    await promoverProximoAdminSeNecessario(grupoId, alvo.id, alvo.papel);

    try {
      await prisma.grupoMembro.delete({ where: { id: membroId } });
    } catch (err) {
      if (err.code === 'P2003') {
        return res.status(400).json({ error: 'Este membro tem despesas ou pagamentos registrados neste grupo e não pode ser removido' });
      }
      throw err;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover membro' });
  }
});

// Exclui o grupo inteiro — só admin. Apaga despesas e pagamentos primeiro, explicitamente,
// antes do grupo: se deixasse tudo por conta da cascata do Prisma (GrupoMembro, DespesaGrupo
// e PagamentoGrupo todos com onDelete: Cascade a partir de Grupo), o Postgres pode tentar
// cascatear a exclusão dos GrupoMembro antes de ter apagado as despesas/pagamentos que ainda
// apontam pra eles — e o Restrict de DespesaGrupo.pagoPor/DivisaoDespesa.membro/PagamentoGrupo.de/para
// barra a operação inteira com um erro de FK (confirmado na prática: excluir um grupo com
// qualquer despesa dava 500). Apagando despesaGrupo e pagamentoGrupo antes (a primeira já
// cascata suas divisões), quando o Grupo é excluído não sobra nada apontando pra um
// GrupoMembro, e a cascata dos membros roda limpa.
router.delete('/:id', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });
    if (meuMembro.papel !== 'admin') return res.status(403).json({ error: 'Só um admin pode excluir o grupo' });

    await prisma.$transaction([
      prisma.despesaGrupo.deleteMany({ where: { grupoId } }),
      prisma.pagamentoGrupo.deleteMany({ where: { grupoId } }),
      prisma.grupo.delete({ where: { id: grupoId } }),
    ]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir grupo' });
  }
});

// Registra uma despesa — qualquer membro pode. Divide igualmente entre os participantes
// escolhidos (não precisa ser o grupo inteiro).
router.post('/:id/despesas', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });

    const { descricao, valorTotal, data, pagoPorMembroId, participanteIds } = req.body;
    const membrosDoGrupo = await prisma.grupoMembro.findMany({ where: { grupoId }, select: { id: true } });
    const membrosValidosIds = new Set(membrosDoGrupo.map(m => m.id));

    const validationError = validateDespesaGrupoInput(req.body, membrosValidosIds);
    if (validationError) return res.status(400).json({ error: validationError });

    const splits = splitIgualmente(Number(valorTotal), participanteIds.map(Number));

    const despesa = await prisma.despesaGrupo.create({
      data: {
        grupoId,
        descricao: descricao.trim(),
        valorTotal: Number(valorTotal),
        moeda: req.body.moeda || 'BRL',
        data,
        pagoPorMembroId: Number(pagoPorMembroId),
        criadoPorUsuarioId: req.userId,
        divisoes: { create: splits.map(s => ({ membroId: s.membroId, valorDevido: s.valorDevido })) },
      },
      include: { divisoes: true },
    });
    res.status(201).json(serializeDespesaGrupo(despesa));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar despesa' });
  }
});

// "Adicionar despesas ao dashboard": cria, na família do usuário logado, uma transação de
// despesa pra cada despesa do grupo em que ele participa do rateio — no valor da parte dele
// e com a mesma data da despesa (não a data de hoje), pra cada gasto cair no dia/mês certo
// do dashboard. Pode ser chamado de novo depois de lançar mais despesas: só as que ainda
// não foram importadas por este usuário entram (garantido também pelo @@unique no banco).
//
// destinos: [{ moeda, contaId, taxa? }] — uma conta por moeda das despesas. Conta na mesma
// moeda: a parte entra como está. Conta em outra moeda (ex: € numa conta em R$): a parte é
// convertida — pela cotação salva (e a data dela fica registrada) ou, se "taxa" vier, pelo
// câmbio que o usuário informou (ex: o do cartão, com IOF). Moeda sem destino fica de fora
// dessa importação e pode entrar numa próxima. contaId solto (formato antigo) = destino
// só pras despesas em R$.
router.post('/:id/dashboard', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });

    const { contaId, categoria, eventoId } = req.body;
    if (typeof categoria !== 'string' || !categoria.trim()) {
      return res.status(400).json({ error: 'Categoria é obrigatória' });
    }
    const destinos = Array.isArray(req.body.destinos) ? req.body.destinos : (contaId ? [{ moeda: 'BRL', contaId }] : []);
    if (destinos.length === 0) return res.status(400).json({ error: 'Escolha a conta de destino' });
    if (new Set(destinos.map(d => d.moeda)).size !== destinos.length) {
      return res.status(400).json({ error: 'Escolha só uma conta por moeda' });
    }
    const contas = await prisma.conta.findMany({
      where: { familiaId: req.familiaId, id: { in: destinos.map(d => Number(d.contaId)) } },
    });
    const precisaCotacao = destinos.some(d => {
      const conta = contas.find(c => c.id === Number(d.contaId));
      return conta && conta.moeda !== d.moeda && !(Number(d.taxa) > 0);
    });
    const cotacoes = precisaCotacao ? await buscarCotacoes() : null;

    // moeda da despesa -> { conta, conversao: null | { taxa, dataCotacao } }
    const destinoPorMoeda = new Map();
    for (const destino of destinos) {
      const conta = contas.find(c => c.id === Number(destino.contaId));
      if (!conta) return res.status(400).json({ error: 'Conta inválida' });
      let conversao = null;
      if (conta.moeda !== destino.moeda) {
        if (Number(destino.taxa) > 0) {
          conversao = { taxa: Number(Number(destino.taxa).toFixed(6)), dataCotacao: null };
        } else {
          const taxa = taxaEntre(destino.moeda, conta.moeda, cotacoes.taxas);
          if (!taxa) {
            return res.status(400).json({ error: `Sem cotação salva pra converter ${destino.moeda} em ${conta.moeda} — informe o câmbio` });
          }
          conversao = { taxa, dataCotacao: dataDaCotacao([destino.moeda, conta.moeda], cotacoes.atualizadoEm) };
        }
      }
      destinoPorMoeda.set(destino.moeda, { conta, conversao });
    }
    if (eventoId) {
      const evento = await prisma.evento.findFirst({ where: { id: Number(eventoId), familiaId: req.familiaId } });
      if (!evento) return res.status(400).json({ error: 'Evento inválido' });
    }

    const grupo = await prisma.grupo.findUnique({ where: { id: grupoId }, select: { nome: true } });
    const minhasDespesas = await prisma.despesaGrupo.findMany({
      where: { grupoId, divisoes: { some: { membroId: meuMembro.id } } },
      include: { divisoes: { where: { membroId: meuMembro.id } } },
      orderBy: [{ data: 'asc' }, { createdAt: 'asc' }],
    });
    const jaImportadas = await prisma.transacao.findMany({
      where: { usuarioId: req.userId, despesaGrupoId: { in: minhasDespesas.map(d => d.id) } },
      select: { despesaGrupoId: true },
    });
    const jaImportadasIds = new Set(jaImportadas.map(t => t.despesaGrupoId));
    const naoImportadas = minhasDespesas.filter(d => !jaImportadasIds.has(d.id) && parteDoMembro(d.divisoes, meuMembro.id) > 0);
    if (naoImportadas.length === 0) {
      return res.status(400).json({ error: 'Todas as suas despesas deste grupo já estão no dashboard' });
    }
    const pendentes = naoImportadas.filter(d => destinoPorMoeda.has(d.moeda || 'BRL'));
    if (pendentes.length === 0) {
      return res.status(400).json({ error: 'Nenhuma das despesas pendentes está numa moeda com conta escolhida' });
    }

    // Várias despesas no mesmo dia: cada uma entra acima da anterior, sem repetir "ordem".
    const ordemPorDia = new Map();
    const dados = [];
    for (const d of pendentes) {
      const ordem = ordemPorDia.has(d.data) ? ordemPorDia.get(d.data) + 1 : await proximaOrdemDoDia(req.familiaId, d.data);
      ordemPorDia.set(d.data, ordem);
      const moeda = d.moeda || 'BRL';
      const { conta, conversao } = destinoPorMoeda.get(moeda);
      const parte = parteDoMembro(d.divisoes, meuMembro.id);
      dados.push({
        usuarioId: req.userId,
        familiaId: req.familiaId,
        contaId: conta.id,
        eventoId: eventoId ? Number(eventoId) : null,
        despesaGrupoId: d.id,
        tipo: 'despesa',
        valor: conversao ? converterValor(parte, conversao.taxa) : parte,
        ...(conversao ? { moedaOriginal: moeda, valorOriginal: parte, taxaConversao: conversao.taxa, dataCotacao: conversao.dataCotacao } : {}),
        categoria: categoria.trim(),
        descricao: descricaoTransacaoGrupo(d.descricao, grupo.nome),
        data: d.data,
        ordem,
      });
    }

    try {
      await prisma.$transaction(dados.map(data => prisma.transacao.create({ data })));
    } catch (err) {
      // Dois cliques/abas ao mesmo tempo: o @@unique([despesaGrupoId, usuarioId]) barra a
      // segunda importação inteira (é uma transação só), sem duplicar nada.
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Essas despesas já foram adicionadas ao dashboard' });
      }
      throw err;
    }

    // Fire-and-forget, mesmo padrão de transactions.js — uma checagem por mês afetado (não
    // por despesa: chamadas paralelas pro mesmo mês poderiam mandar o e-mail em dobro).
    const umaDataPorMes = new Map(dados.map(d => [d.data.slice(0, 7), d.data]));
    for (const data of umaDataPorMes.values()) {
      notifyOrcamentoEstouradoSeNecessario(req.familiaId, categoria.trim(), data).catch(err => {
        console.error('Erro ao verificar orçamento estourado:', err.message);
      });
    }

    res.status(201).json({ count: dados.length });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar despesas ao dashboard' });
  }
});

// Edita uma despesa — só quem criou ou um admin do grupo (mais seguro que "qualquer
// membro mexe em despesa de qualquer um"). Troca as divisões por completo numa escrita
// aninhada só (deleteMany + create dentro do mesmo update), sem $transaction manual.
router.put('/:id/despesas/:despesaId', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const despesaId = Number(req.params.despesaId);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });

    const existente = await prisma.despesaGrupo.findFirst({ where: { id: despesaId, grupoId } });
    if (!existente) return res.status(404).json({ error: 'Despesa não encontrada' });
    if (existente.criadoPorUsuarioId !== req.userId && meuMembro.papel !== 'admin') {
      return res.status(403).json({ error: 'Só quem criou a despesa ou um admin do grupo pode editá-la' });
    }

    const { descricao, valorTotal, data, pagoPorMembroId, participanteIds } = req.body;
    const membrosDoGrupo = await prisma.grupoMembro.findMany({ where: { grupoId }, select: { id: true, usuarioId: true } });
    const membrosValidosIds = new Set(membrosDoGrupo.map(m => m.id));

    const validationError = validateDespesaGrupoInput(req.body, membrosValidosIds);
    if (validationError) return res.status(400).json({ error: validationError });

    const splits = splitIgualmente(Number(valorTotal), participanteIds.map(Number));

    const atualizada = await prisma.despesaGrupo.update({
      where: { id: despesaId },
      data: {
        descricao: descricao.trim(),
        valorTotal: Number(valorTotal),
        // Ausente no body (cliente antigo) mantém a moeda atual.
        moeda: req.body.moeda || existente.moeda,
        data,
        pagoPorMembroId: Number(pagoPorMembroId),
        divisoes: { deleteMany: {}, create: splits.map(s => ({ membroId: s.membroId, valorDevido: s.valorDevido })) },
      },
      include: { divisoes: true },
    });
    await sincronizarTransacoesDaDespesa(atualizada, membrosDoGrupo);
    res.json(serializeDespesaGrupo(atualizada));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
});

// Exclui uma despesa — mesma regra de permissão da edição.
router.delete('/:id/despesas/:despesaId', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const despesaId = Number(req.params.despesaId);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });

    const existente = await prisma.despesaGrupo.findFirst({ where: { id: despesaId, grupoId } });
    if (!existente) return res.status(404).json({ error: 'Despesa não encontrada' });
    if (existente.criadoPorUsuarioId !== req.userId && meuMembro.papel !== 'admin') {
      return res.status(403).json({ error: 'Só quem criou a despesa ou um admin do grupo pode excluí-la' });
    }

    await prisma.despesaGrupo.delete({ where: { id: despesaId } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir despesa' });
  }
});

// Registra uma quitação ("de" pagou "para" fora do app) — qualquer membro pode, mesmo
// nível de permissão do lançamento de despesa. Sem rota de edição: é uma ação atômica tipo
// "marquei como pago"; se errou, exclui e registra de novo.
router.post('/:id/pagamentos', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });

    const { deMembroId, paraMembroId, valor, data, moedaPagamento, valorPagamento } = req.body;
    const membrosDoGrupo = await prisma.grupoMembro.findMany({ where: { grupoId }, select: { id: true } });
    const membrosValidosIds = new Set(membrosDoGrupo.map(m => m.id));

    const validationError = validatePagamentoGrupoInput(req.body, membrosValidosIds);
    if (validationError) return res.status(400).json({ error: validationError });

    const pagamento = await prisma.pagamentoGrupo.create({
      data: {
        grupoId,
        deMembroId: Number(deMembroId),
        paraMembroId: Number(paraMembroId),
        valor: Number(valor),
        moeda: req.body.moeda || 'BRL',
        moedaPagamento: moedaPagamento || null,
        valorPagamento: moedaPagamento ? Number(valorPagamento) : null,
        data,
        criadoPorUsuarioId: req.userId,
      },
    });
    res.status(201).json(serializePagamentoGrupo(pagamento));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar pagamento' });
  }
});

// Exclui um pagamento (desfaz uma quitação lançada errado) — mesma regra de permissão da
// exclusão de despesa.
router.delete('/:id/pagamentos/:pagamentoId', async (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const pagamentoId = Number(req.params.pagamentoId);
    const meuMembro = await getMembroAtual(grupoId, req.userId);
    if (!meuMembro) return res.status(404).json({ error: 'Grupo não encontrado' });

    const existente = await prisma.pagamentoGrupo.findFirst({ where: { id: pagamentoId, grupoId } });
    if (!existente) return res.status(404).json({ error: 'Pagamento não encontrado' });
    if (existente.criadoPorUsuarioId !== req.userId && meuMembro.papel !== 'admin') {
      return res.status(403).json({ error: 'Só quem registrou o pagamento ou um admin do grupo pode excluí-lo' });
    }

    await prisma.pagamentoGrupo.delete({ where: { id: pagamentoId } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir pagamento' });
  }
});

module.exports = router;
