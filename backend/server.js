require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET não definido. Configure essa variável de ambiente antes de iniciar o servidor.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const reportsRoutes = require('./routes/reports');
const metasRoutes = require('./routes/metas');
const orcamentosRoutes = require('./routes/orcamentos');
const recorrenciasRoutes = require('./routes/recorrencias');
const contasRoutes = require('./routes/contas');
const transferenciasRoutes = require('./routes/transferencias');
const openFinanceRoutes = require('./routes/openFinance');
const categoriasRoutes = require('./routes/categorias');
const familiaRoutes = require('./routes/familia');
const cambioRoutes = require('./routes/cambio');
const eventosRoutes = require('./routes/eventos');
const gruposRoutes = require('./routes/grupos');
const resumosRoutes = require('./routes/resumos');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());

// In Electron, requests come from file:// (origin: null), so allow all local origins
const corsOrigin = process.env.ELECTRON === 'true'
  ? true
  : (process.env.FRONTEND_URL || 'http://localhost:5173')
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '5mb' }));

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

app.listen(PORT, () => {
  console.log(`GeldTrack API rodando em http://localhost:${PORT}`);
});
