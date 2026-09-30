const express = require('express');
const authRoutes = require('../routes/auth');
const transactionRoutes = require('../routes/transactions');
const reportsRoutes = require('../routes/reports');
const metasRoutes = require('../routes/metas');
const orcamentosRoutes = require('../routes/orcamentos');
const recorrenciasRoutes = require('../routes/recorrencias');
const contasRoutes = require('../routes/contas');
const transferenciasRoutes = require('../routes/transferencias');
const openFinanceRoutes = require('../routes/openFinance');
const categoriasRoutes = require('../routes/categorias');
const familiaRoutes = require('../routes/familia');
const cambioRoutes = require('../routes/cambio');
const eventosRoutes = require('../routes/eventos');
const gruposRoutes = require('../routes/grupos');
const resumosRoutes = require('../routes/resumos');

// Réplica mínima da montagem de rotas do server.js, sem helmet/cors/app.listen —
// os testes de integração só precisam do roteamento + middlewares de cada router.
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/metas', metasRoutes);
  app.use('/api/orcamentos', orcamentosRoutes);
  app.use('/api/recorrencias', recorrenciasRoutes);
  app.use('/api/contas', contasRoutes);
  app.use('/api/transferencias', transferenciasRoutes);
  app.use('/api/open-finance', openFinanceRoutes);
  app.use('/api/categorias', categoriasRoutes);
  app.use('/api/familia', familiaRoutes);
  app.use('/api/cambio', cambioRoutes);
  app.use('/api/eventos', eventosRoutes);
  app.use('/api/grupos', gruposRoutes);
  app.use('/api/resumos', resumosRoutes);
  return app;
}

module.exports = { createTestApp };
