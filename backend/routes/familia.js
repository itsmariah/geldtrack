const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { validateNomeFamilia, validateCodigoFamilia } = require('../utils/validateFamilia');
const { serializeFamilia } = require('../utils/serializeFamilia');
const { gerarCodigoUnico } = require('../utils/gerarCodigoFamilia');

const router = express.Router();
router.use(authMiddleware);

const dataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
router.use(dataLimiter);

// foto é a imagem já redimensionada no upload (256px, ver frontend/src/utils/resizeImage.js),
// então dá pra mandar junto com a lista de membros sem pesar a resposta.
const familiaInclude = {
  membros: { select: { id: true, nome: true, email: true, foto: true, papelFamilia: true }, orderBy: { createdAt: 'asc' } },
};

// Dados da família atual: nome, código (pra compartilhar) e lista de membros com papel
router.get('/', async (req, res) => {
  try {
    const familia = await prisma.familia.findUnique({ where: { id: req.familiaId }, include: familiaInclude });
    res.json(serializeFamilia(familia));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados da família' });
  }
});

// Renomear a família — só o dono
router.put('/', async (req, res) => {
  try {
    if (req.papelFamilia !== 'dono') return res.status(403).json({ error: 'Só o dono da família pode renomeá-la' });

    const { nome } = req.body;
    const validationError = validateNomeFamilia(nome);
    if (validationError) return res.status(400).json({ error: validationError });

    const updated = await prisma.familia.update({
      where: { id: req.familiaId },
      data: { nome: nome.trim() },
      include: familiaInclude,
    });
    res.json(serializeFamilia(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao renomear família' });
  }
});

// Gera um novo código pra família, invalidando o antigo — só o dono (útil se o código
// vazou pra alguém que não devia ter entrado)
router.post('/regenerar-codigo', async (req, res) => {
  try {
    if (req.papelFamilia !== 'dono') return res.status(403).json({ error: 'Só o dono da família pode gerar um novo código' });

    const codigo = await gerarCodigoUnico();
    const updated = await prisma.familia.update({ where: { id: req.familiaId }, data: { codigo } });
    res.json({ codigo: updated.codigo });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar novo código' });
  }
});

// Entrar em outra família usando o código dela — troca a família ativa do usuário
// logado. O frontend já avisa, antes de chamar essa rota, que os dados da família
// atual ficam inacessíveis depois da troca (não são apagados, só deixam de aparecer).
router.post('/entrar', async (req, res) => {
  try {
    const { codigo } = req.body;
    const validationError = validateCodigoFamilia(codigo);
    if (validationError) return res.status(400).json({ error: validationError });

    const novaFamilia = await prisma.familia.findUnique({ where: { codigo: codigo.trim().toUpperCase() } });
    if (!novaFamilia) return res.status(404).json({ error: 'Código de família inválido' });
    if (novaFamilia.id === req.familiaId) return res.status(400).json({ error: 'Você já faz parte dessa família' });

    await prisma.usuario.update({
      where: { id: req.userId },
      data: { familiaId: novaFamilia.id, papelFamilia: 'membro' },
    });

    const atualizada = await prisma.familia.findUnique({ where: { id: novaFamilia.id }, include: familiaInclude });
    res.json(serializeFamilia(atualizada));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao entrar na família' });
  }
});

// Sair da família atual — recebe uma família pessoal nova e vazia (nunca fica sem
// família). Se quem sai é o dono e sobra gente, o membro mais antigo assume como dono.
router.post('/sair', async (req, res) => {
  try {
    const membros = await prisma.usuario.findMany({
      where: { familiaId: req.familiaId },
      orderBy: { createdAt: 'asc' },
    });

    if (membros.length <= 1) {
      return res.status(400).json({ error: 'Você é o único membro dessa família — não há de onde sair' });
    }

    const euMesmo = membros.find(m => m.id === req.userId);

    if (req.papelFamilia === 'dono') {
      const proximoDono = membros.find(m => m.id !== req.userId);
      await prisma.usuario.update({ where: { id: proximoDono.id }, data: { papelFamilia: 'dono' } });
    }

    const codigo = await gerarCodigoUnico();
    const novaFamilia = await prisma.familia.create({ data: { nome: `Família de ${euMesmo.nome}`, codigo } });
    await prisma.usuario.update({ where: { id: req.userId }, data: { familiaId: novaFamilia.id, papelFamilia: 'dono' } });

    res.json({ id: novaFamilia.id, nome: novaFamilia.nome, codigo: novaFamilia.codigo, papel: 'dono' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao sair da família' });
  }
});

// Remove um membro da família — só o dono. O removido recebe uma família pessoal nova,
// igual a quem sai por conta própria (nunca fica sem família).
router.delete('/membros/:usuarioId', async (req, res) => {
  try {
    if (req.papelFamilia !== 'dono') return res.status(403).json({ error: 'Só o dono da família pode remover membros' });

    const alvoId = Number(req.params.usuarioId);
    if (alvoId === req.userId) return res.status(400).json({ error: 'Use "sair da família" para remover a si mesmo' });

    const alvo = await prisma.usuario.findFirst({ where: { id: alvoId, familiaId: req.familiaId } });
    if (!alvo) return res.status(404).json({ error: 'Membro não encontrado' });

    const codigo = await gerarCodigoUnico();
    const novaFamilia = await prisma.familia.create({ data: { nome: `Família de ${alvo.nome}`, codigo } });
    await prisma.usuario.update({ where: { id: alvoId }, data: { familiaId: novaFamilia.id, papelFamilia: 'dono' } });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover membro' });
  }
});

module.exports = router;
