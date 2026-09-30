const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../database/db');
const authMiddleware = require('../middleware/auth');
const { MOEDAS_SUPORTADAS, CODIGOS_SUPORTADOS } = require('../utils/moedas');
const { buscarCotacoes } = require('../utils/currency');

const router = express.Router();
router.use(authMiddleware);

// Cotação é dado de mercado global (não por família) — o limite é só pra evitar abuso da
// API externa gratuita, não uma questão de posse de dado.
const atualizarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: 'Muitas atualizações de cotação. Tente novamente mais tarde.' },
});

// Moedas suportadas + cotação atual — usado tanto pro seletor de moeda ao criar uma
// conta quanto pro painel de cotações em Contas.
router.get('/', async (req, res) => {
  try {
    res.json({ moedas: MOEDAS_SUPORTADAS, ...(await buscarCotacoes()) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cotações' });
  }
});

// Busca a cotação atual na API pública (sem chave) e atualiza TaxaCambio pras moedas
// suportadas que não sejam BRL. Ação manual (botão "Atualizar cotações"), sem cron.
router.post('/atualizar', atualizarLimiter, async (req, res) => {
  try {
    const resposta = await fetch('https://open.er-api.com/v6/latest/BRL');
    if (!resposta.ok) throw new Error(`API de câmbio respondeu ${resposta.status}`);
    const dados = await resposta.json();
    if (dados.result !== 'success' || !dados.rates) throw new Error('Resposta inesperada da API de câmbio');

    const moedasEstrangeiras = CODIGOS_SUPORTADOS.filter(c => c !== 'BRL');
    const atualizacoes = moedasEstrangeiras
      .filter(moeda => dados.rates[moeda])
      // dados.rates[moeda] = quantas unidades de "moeda" valem 1 BRL — invertido, dá
      // quantos reais vale 1 unidade da moeda, que é o que a gente guarda.
      .map(moeda => prisma.taxaCambio.upsert({
        where: { moeda },
        create: { moeda, taxaParaBRL: 1 / dados.rates[moeda] },
        update: { taxaParaBRL: 1 / dados.rates[moeda], atualizadoEm: new Date() },
      }));

    await Promise.all(atualizacoes);
    res.json({ moedas: MOEDAS_SUPORTADAS, ...(await buscarCotacoes()) });
  } catch (err) {
    console.error('Erro ao atualizar cotações:', err.message);
    res.status(502).json({ error: 'Não foi possível buscar a cotação agora. Tente novamente mais tarde.' });
  }
});

module.exports = router;
