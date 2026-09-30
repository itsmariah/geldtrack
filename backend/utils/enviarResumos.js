const prisma = require('../database/db');
const mailer = require('./mailer');
const { buscarTaxas, converterParaBRL } = require('./currency');
const { hojeEmSaoPaulo, semanaAnterior, mesAnterior, periodoAntesDe } = require('./periodosResumo');

const arredondar = (v) => Math.round(v * 100) / 100;

// Totais do período em R$ (cada transação convertida pela moeda da conta, igual ao resumo
// do relatório mensal) e as 3 categorias com mais despesa.
function resumirTransacoes(transacoes, taxas) {
  let receitas = 0;
  let despesas = 0;
  const porCategoria = new Map();
  for (const t of transacoes) {
    const valor = converterParaBRL(t.valor, t.conta?.moeda || 'BRL', taxas);
    if (t.tipo === 'receita') {
      receitas += valor;
    } else {
      despesas += valor;
      porCategoria.set(t.categoria, (porCategoria.get(t.categoria) || 0) + valor);
    }
  }
  const topCategorias = [...porCategoria.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([categoria, total]) => ({ categoria, total: arredondar(total) }));
  return {
    receitas: arredondar(receitas),
    despesas: arredondar(despesas),
    saldo: arredondar(receitas - despesas),
    quantidade: transacoes.length,
    topCategorias,
  };
}

async function resumoDoPeriodo(familiaId, { inicio, fim }, taxas) {
  const transacoes = await prisma.transacao.findMany({
    where: { familiaId, data: { gte: inicio, lte: fim } },
    select: { tipo: true, valor: true, categoria: true, conta: { select: { moeda: true } } },
  });
  return resumirTransacoes(transacoes, taxas);
}

// Chamado pelo workflow agendado (POST /api/resumos/enviar), uma vez por dia. Manda a cada
// usuário que ativou o resumo o da última semana/mês COMPLETOS que ele ainda não recebeu —
// então rodar de novo no mesmo dia não duplica nada, e um dia em que o workflow falhou ou
// atrasou é coberto na execução seguinte. Período sem nenhuma transação é marcado como
// enviado sem mandar e-mail (não há o que resumir). Um envio que falha não marca o período,
// e é tentado de novo amanhã; os outros usuários seguem normalmente.
async function enviarResumosPendentes(agora = new Date()) {
  const hoje = hojeEmSaoPaulo(agora);
  const periodos = { semanal: semanaAnterior(hoje), mensal: mesAnterior(hoje) };
  const campos = {
    semanal: { ativo: 'resumoSemanal', ultimo: 'ultimoResumoSemanal' },
    mensal: { ativo: 'resumoMensal', ultimo: 'ultimoResumoMensal' },
  };

  const usuarios = await prisma.usuario.findMany({
    where: { OR: [{ resumoSemanal: true }, { resumoMensal: true }] },
    select: { id: true, nome: true, email: true, familiaId: true, resumoSemanal: true, resumoMensal: true, ultimoResumoSemanal: true, ultimoResumoMensal: true },
  });
  const resultado = { enviados: 0, semMovimento: 0, erros: 0 };
  if (usuarios.length === 0) return resultado;

  const taxas = await buscarTaxas();
  // Membros da mesma família recebem o mesmo resumo (a carteira é compartilhada).
  const cache = new Map();
  const resumoCacheado = (familiaId, periodo) => {
    const chave = `${familiaId}:${periodo.inicio}:${periodo.fim}`;
    if (!cache.has(chave)) cache.set(chave, resumoDoPeriodo(familiaId, periodo, taxas));
    return cache.get(chave);
  };

  for (const usuario of usuarios) {
    for (const tipo of ['semanal', 'mensal']) {
      const { ativo, ultimo } = campos[tipo];
      const periodo = periodos[tipo];
      if (!usuario[ativo] || usuario[ultimo] === periodo.chave) continue;
      try {
        const resumo = await resumoCacheado(usuario.familiaId, periodo);
        if (resumo.quantidade === 0) {
          resultado.semMovimento += 1;
        } else {
          const anterior = await resumoCacheado(usuario.familiaId, periodoAntesDe(tipo, periodo));
          await mailer.sendResumoEmail(usuario.email, { nome: usuario.nome, tipo, periodo, resumo, anterior });
          resultado.enviados += 1;
        }
        await prisma.usuario.update({ where: { id: usuario.id }, data: { [ultimo]: periodo.chave } });
      } catch (err) {
        console.error(`Erro ao enviar resumo ${tipo} para o usuário ${usuario.id}:`, err.message);
        resultado.erros += 1;
      }
    }
  }
  return resultado;
}

// Ao ativar um resumo, o período que acabou de fechar conta como "já enviado" — o primeiro
// e-mail chega no fim do próximo período, em vez de um resumo atrasado logo no dia seguinte.
function chavesAoAtivar(agora = new Date()) {
  const hoje = hojeEmSaoPaulo(agora);
  return { ultimoResumoSemanal: semanaAnterior(hoje).chave, ultimoResumoMensal: mesAnterior(hoje).chave };
}

module.exports = { enviarResumosPendentes, resumirTransacoes, chavesAoAtivar };
