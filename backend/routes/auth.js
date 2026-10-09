const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { hashResetToken } = require('../utils/resetToken');
const { gerarCodigoUnico } = require('../utils/gerarCodigoFamilia');
const { chavesAoAtivar } = require('../utils/enviarResumos');
const { excluirConta } = require('../utils/excluirConta');
const pluggyClient = require('../utils/pluggyClient');

const USER_FAMILIA_SELECT = {
  id: true,
  nome: true,
  email: true,
  foto: true,
  papelFamilia: true,
  resumoSemanal: true,
  resumoMensal: true,
  familia: { select: { id: true, nome: true, codigo: true } },
};

function serializeUserWithFamilia(user) {
  const { papelFamilia, familia, ...rest } = user;
  return { ...rest, familia: { ...familia, papel: papelFamilia } };
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FOTO_DATA_URL_REGEX = /^data:image\/(png|jpe?g|webp|gif);base64,/;
const MAX_FOTO_LENGTH = 2_000_000; // ~1.5MB decodificado
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas solicitações. Tente novamente mais tarde.' },
});

// Excluir conta pede a senha de novo — limite por usuário (já autenticado), pra não dar
// pra adivinhar a senha de uma sessão roubada.
const excluirContaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

// RF01 - Cadastro de usuário
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Preencha todos os campos' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'E-mail inválido' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const hash = await bcrypt.hash(senha, 10);

    // Todo usuário nasce com sua própria "família pessoal" (1 membro, dono) — sem
    // fricção pra quem nunca vai compartilhar nada, e já pronta pra virar compartilhada
    // se, mais tarde, outra pessoa entrar usando o código dela.
    const codigo = await gerarCodigoUnico();
    const familia = await prisma.familia.create({ data: { nome: `Família de ${nome}`, codigo } });

    const user = await prisma.usuario.create({
      data: { nome, email, senha: hash, familiaId: familia.id, papelFamilia: 'dono' },
    });

    // Toda transação exige uma conta — sem isso o usuário ficaria sem conseguir
    // lançar a primeira, já que o app não pede pra "criar uma conta" no cadastro.
    await prisma.conta.create({
      data: { usuarioId: user.id, familiaId: familia.id, nome: 'Conta principal', tipo: 'corrente', saldoInicial: 0 },
    });

    const token = jwt.sign({ id: user.id, tokenVersion: user.tokenVersion }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: serializeUserWithFamilia({ id: user.id, nome: user.nome, email: user.email, foto: user.foto, papelFamilia: user.papelFamilia, familia }),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// RF02 - Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Preencha e-mail e senha' });
    }

    const user = await prisma.usuario.findUnique({ where: { email }, select: { ...USER_FAMILIA_SELECT, senha: true, tokenVersion: true } });
    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const token = jwt.sign({ id: user.id, tokenVersion: user.tokenVersion }, JWT_SECRET, { expiresIn: '7d' });
    const { senha: _senha, tokenVersion: _tokenVersion, ...userFields } = user;
    res.json({ token, user: serializeUserWithFamilia(userFields) });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Esqueci minha senha — gera token e envia e-mail
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Informe o e-mail' });
    }

    const user = await prisma.usuario.findUnique({ where: { email } });

    // Resposta genérica mesmo se o e-mail não existir, para não expor quais e-mails estão cadastrados.
    // O envio do e-mail não é aguardado antes de responder, para não criar uma diferença de tempo
    // perceptível entre "e-mail existe" e "e-mail não existe" (timing side-channel).
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      // Só o hash fica salvo no banco — o token em texto puro só existe no e-mail enviado.
      await prisma.usuario.update({
        where: { id: user.id },
        data: { resetTokenHash: hashResetToken(resetToken), resetTokenExpiresAt },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/redefinir-senha?token=${resetToken}`;
      sendPasswordResetEmail(user.email, resetUrl).catch(err => {
        console.error('Erro ao enviar e-mail de redefinição:', err.message);
      });
    }

    res.json({ message: 'Se o e-mail informado estiver cadastrado, você receberá um link de redefinição.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Redefinir senha usando o token recebido por e-mail
router.post('/reset-password', loginLimiter, async (req, res) => {
  try {
    const { token, senha } = req.body;
    if (!token || !senha) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    const user = await prisma.usuario.findUnique({ where: { resetTokenHash: hashResetToken(token) } });
    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Link de redefinição inválido ou expirado' });
    }

    const hash = await bcrypt.hash(senha, 10);
    await prisma.usuario.update({
      where: { id: user.id },
      // Incrementa tokenVersion para invalidar qualquer token JWT emitido antes da troca.
      data: {
        senha: hash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        tokenVersion: { increment: 1 },
      },
    });

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dados do usuário logado
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: req.userId },
      select: USER_FAMILIA_SELECT,
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(serializeUserWithFamilia(user));
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// RF03 - Editar dados do usuário
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nome, email, senha, foto, resumoSemanal, resumoMensal } = req.body;
    for (const flag of [resumoSemanal, resumoMensal]) {
      if (flag !== undefined && typeof flag !== 'boolean') {
        return res.status(400).json({ error: 'Preferência de resumo inválida' });
      }
    }

    if (email) {
      if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'E-mail inválido' });
      }
      const conflict = await prisma.usuario.findFirst({
        where: { email, NOT: { id: req.userId } },
      });
      if (conflict) return res.status(409).json({ error: 'E-mail já em uso por outro cadastro' });
    }

    if (foto !== undefined && foto !== null) {
      if (!FOTO_DATA_URL_REGEX.test(foto)) {
        return res.status(400).json({ error: 'Formato de imagem inválido' });
      }
      if (foto.length > MAX_FOTO_LENGTH) {
        return res.status(400).json({ error: 'Imagem muito grande' });
      }
    }

    const data = {};
    if (nome) data.nome = nome;
    if (email) data.email = email;
    if (foto !== undefined) data.foto = foto;
    if (resumoSemanal !== undefined || resumoMensal !== undefined) {
      const atual = await prisma.usuario.findUnique({ where: { id: req.userId }, select: { resumoSemanal: true, resumoMensal: true } });
      const chaves = chavesAoAtivar();
      // Só ao LIGAR (false -> true): marca o período que acabou de fechar como já enviado.
      if (resumoSemanal !== undefined) {
        data.resumoSemanal = resumoSemanal;
        if (resumoSemanal && !atual.resumoSemanal) data.ultimoResumoSemanal = chaves.ultimoResumoSemanal;
      }
      if (resumoMensal !== undefined) {
        data.resumoMensal = resumoMensal;
        if (resumoMensal && !atual.resumoMensal) data.ultimoResumoMensal = chaves.ultimoResumoMensal;
      }
    }
    const trocandoSenha = Boolean(senha);
    if (trocandoSenha) {
      if (senha.length < 6) return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
      data.senha = await bcrypt.hash(senha, 10);
      // Invalida o token JWT atual (e qualquer outro emitido antes desta troca) —
      // por isso reemitimos um novo abaixo, para não deslogar o usuário sem aviso.
      data.tokenVersion = { increment: 1 };
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nenhum dado para atualizar' });
    }

    const updated = await prisma.usuario.update({
      where: { id: req.userId },
      data,
      select: { ...USER_FAMILIA_SELECT, tokenVersion: true },
    });

    const { tokenVersion, ...userFields } = updated;
    const response = serializeUserWithFamilia(userFields);
    if (trocandoSenha) {
      response.token = jwt.sign({ id: updated.id, tokenVersion }, JWT_SECRET, { expiresIn: '7d' });
    }
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir a própria conta — exigido pela App Store e pela Play Store. Pede a senha de novo
// (com limite de tentativas). O que acontece com família, grupos e conexões
// bancárias está descrito em utils/excluirConta.js.
router.delete('/conta', authMiddleware, excluirContaLimiter, async (req, res) => {
  try {
    const { senha } = req.body || {};
    if (!senha) return res.status(400).json({ error: 'Digite sua senha para confirmar' });

    const user = await prisma.usuario.findUnique({ where: { id: req.userId }, select: { senha: true } });
    if (!user || !(await bcrypt.compare(senha, user.senha))) {
      return res.status(403).json({ error: 'Senha incorreta' });
    }

    const pluggyItemIds = await prisma.$transaction(tx => excluirConta(tx, req.userId), { timeout: 30000 });

    // Revoga o acesso ao banco na Pluggy depois do commit — se falhar, a conta já foi
    // excluída mesmo assim (o item fica órfão na Pluggy, sem nada apontando pra ele aqui).
    for (const itemId of pluggyItemIds) {
      try { await pluggyClient.deleteItem(itemId); } catch (err) { console.error('Erro ao revogar item na Pluggy:', err.message); }
    }

    res.status(204).send();
  } catch (err) {
    console.error('Erro ao excluir conta:', err);
    res.status(500).json({ error: 'Erro ao excluir a conta' });
  }
});

module.exports = router;
