const express = require('express');
const crypto = require('crypto');
const { enviarResumosPendentes } = require('../utils/enviarResumos');

const router = express.Router();

// Compara em tempo constante (não vaza, pelo tempo de resposta, quantos caracteres batem).
function segredoConfere(recebido, esperado) {
  if (typeof recebido !== 'string') return false;
  const a = crypto.createHash('sha256').update(recebido).digest();
  const b = crypto.createHash('sha256').update(esperado).digest();
  return crypto.timingSafeEqual(a, b);
}

// Chamado uma vez por dia pelo workflow agendado do GitHub Actions
// (.github/workflows/resumo-email.yml) — não por usuário logado, então não usa
// authMiddleware: a proteção é o cabeçalho x-cron-secret, que precisa bater com CRON_SECRET.
// Sem CRON_SECRET configurado, a rota fica desligada (503), como o Open Finance sem Pluggy.
router.post('/enviar', async (req, res) => {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) return res.status(503).json({ error: 'Resumos por e-mail não configurados' });
  if (!segredoConfere(req.get('x-cron-secret'), esperado)) return res.status(401).json({ error: 'Não autorizado' });

  try {
    res.json(await enviarResumosPendentes());
  } catch (err) {
    console.error('Erro ao enviar resumos:', err.message);
    res.status(500).json({ error: 'Erro ao enviar resumos' });
  }
});

module.exports = router;
