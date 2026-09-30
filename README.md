# 💰 GeldTrack

> Gestão financeira pessoal com dashboard, relatórios e importação de extratos bancários (OFX).

![Status](https://img.shields.io/badge/status-ativo-brightgreen)
![Frontend](https://img.shields.io/badge/frontend-React%20%7C%20Vite-61dafb)
![Backend](https://img.shields.io/badge/backend-Node.js%20%7C%20Express-green)
![Database](https://img.shields.io/badge/banco-PostgreSQL%20%7C%20Prisma-blue)
![Desktop](https://img.shields.io/badge/desktop-Electron-47848f)

**🔗 Acesse online:** [geldtrack.vercel.app](https://geldtrack.vercel.app)

---

## 📖 Sobre o projeto

O **GeldTrack** é uma aplicação de gestão financeira pessoal que permite ao usuário registrar receitas e despesas, visualizar o saldo atualizado automaticamente, filtrar transações, importar extratos bancários (OFX) e gerar relatórios mensais com gráficos. Pode ser executado como aplicação web ou como **app desktop** via Electron.

---

## ✨ Funcionalidades

- Cadastro e login de usuários (senha criptografada)
- Recuperação de senha por e-mail ("Esqueceu a senha?"), com invalidação automática de sessões antigas ao trocar a senha
- Adicionar, editar e excluir transações
- Saldo calculado automaticamente
- Filtros por tipo, categoria, período de data e **busca por texto** (descrição ou categoria)
- Listagem de transações **paginada**
- **Exportação das transações em CSV** (respeitando os filtros ativos)
- **Importação de extratos bancários em formato OFX** com preview e edição de categorias antes de confirmar
- Categorias separadas por tipo (receitas e despesas) com auto-categorização no OFX
- Gráfico de **despesas** por categoria (rosca)
- Gráfico de **fontes de renda** por categoria (rosca)
- Relatório mensal com filtros de tipo e categoria
- Gráfico de evolução mensal (últimos 6 meses)
- Edição de perfil (nome, e-mail, senha, foto de perfil)
- **Modo claro/escuro**, com preferência salva no navegador
- Interface responsiva (menu mobile com hambúrguer na landing page)
- Navegação completa por teclado (modais com trava de foco, `aria-live` para leitores de tela)
- **Aplicação desktop** empacotável via Electron
- **Metas financeiras**, com aportes manuais e acompanhamento do progresso até o valor alvo
- **Orçamento mensal por categoria**, com aviso automático por e-mail quando o gasto estoura o limite
- **Transações recorrentes** (aluguel, assinaturas, salário...), lançadas automaticamente todo mês
- **Múltiplas contas** (corrente, cartão, dinheiro...) e transferências entre elas
- **Sincronização bancária via Open Finance** (Pluggy), importando transações direto do banco
- **Insights automáticos** no dashboard (padrões de gasto e comparação com meses anteriores)
- **Projeção de saldo** do mês, com base no ritmo de gastos e nas recorrências previstas
- **Exportação de relatório mensal em PDF**
- **Categorias personalizadas**, com ícone e cor próprios
- **Anexo de comprovante** (imagem ou PDF) nas transações
- **Histórico de edição** de transações (o que mudou, de qual valor para qual valor)
- **Contas compartilhadas / modo família**, com entrada por código e dados visíveis a todos os membros
- Suporte a **PWA** (instalável no celular direto do navegador)
- **Multi-moeda**: contas em USD/EUR/GBP com cotação atualizável
- **Eventos** para agrupar transações de uma viagem/ocasião, com orçamento próprio e indicador visual quando estoura
- **Grupos estilo Splitwise**, para dividir despesas, ver quem deve quem e quitar saldos

---

## 📸 Preview

**Landing Page**
![Landing Page](./frontend/assets/imagens/geldtrack_landing.png)

**Dashboard**
![Dashboard](./frontend/assets/imagens/geldtrack_dashboard.png)

**Relatórios**
![Relatórios](./frontend/assets/imagens/geldtrack_relatorio.png)

---

## 🛠 Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite |
| Roteamento | React Router DOM |
| Gráficos | Recharts |
| HTTP | Axios |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL (via Prisma ORM) |
| Autenticação | JWT (JSON Web Token) |
| Criptografia | bcryptjs |
| Testes | Vitest (unitários e integração) + Supertest (rotas HTTP) |
| Desktop | Electron 31 + electron-builder |

---

## 📁 Estrutura do projeto

```
moneytrack/
│
├── electron/                           ← App desktop (Electron)
│   ├── main.js                         ← Processo principal: inicia backend e janela
│   └── preload.js                      ← Bridge segura entre main e renderer
│
├── backend/                            ← API REST (Node.js + Express)
│   ├── prisma/
│   │   ├── schema.prisma               ← Modelos do banco de dados (PostgreSQL)
│   │   └── migrations/                 ← Histórico de migrações do Prisma
│   ├── database/
│   │   └── db.js                       ← Conexão com o banco (Prisma Client)
│   ├── middleware/
│   │   └── auth.js                     ← Verificação do token JWT (confere tokenVersion)
│   ├── routes/
│   │   ├── auth.js                     ← Cadastro, login, recuperação de senha, editar perfil
│   │   ├── transactions.js             ← CRUD de transações + busca + paginação + export CSV + bulk
│   │   ├── reports.js                  ← Saldo, relatórios, gráficos, insights e projeção
│   │   ├── cambio.js                   ← Cotação de moedas: consulta e atualização manual das taxas
│   │   ├── categorias.js               ← CRUD de categorias personalizadas (ícone/cor) da família
│   │   ├── contas.js                   ← CRUD de contas (múltiplas contas, saldo, moeda)
│   │   ├── eventos.js                  ← CRUD de eventos + fechar/reabrir, com gasto acumulado
│   │   ├── familia.js                  ← Dados da família, entrar/sair por código, gerenciar membros
│   │   ├── grupos.js                   ← Grupos estilo Splitwise: CRUD, membros, despesas e pagamentos
│   │   ├── metas.js                    ← CRUD de metas financeiras e aportes
│   │   ├── openFinance.js              ← Sincronização bancária via Pluggy (Open Finance) + webhook
│   │   ├── orcamentos.js               ← CRUD de orçamentos mensais por categoria
│   │   ├── recorrencias.js             ← CRUD de recorrências, materializa ocorrências vencidas
│   │   └── transferencias.js           ← Criar/listar/excluir transferências entre contas
│   ├── utils/                          ← Lógica pura, testável sem banco
│   │   ├── mailer.js                   ← Envio de e-mail (redefinição de senha) via nodemailer
│   │   ├── validateTransaction.js      ← Validação de tipo/valor/categoria/data
│   │   ├── reportCalculations.js       ← Cálculo de saldo, resumo mensal e evolução
│   │   ├── pagination.js               ← Normalização de page/limit
│   │   ├── serializeTransaction.js     ← Converte Prisma.Decimal em number nas respostas
│   │   ├── buildTransactionWhere.js    ← Monta o filtro (tipo/categoria/período/busca)
│   │   ├── csvExport.js                ← Gera o CSV de exportação
│   │   ├── resetToken.js               ← Hash (sha256) do token de redefinição de senha
│   │   ├── buildTransactionDiff.js     ← Calcula o diff de campos financeiros p/ o histórico de edição
│   │   ├── calcularSaldosGrupo.js      ← Calcula quem deve quem num grupo, a partir das despesas
│   │   ├── checkOrcamentoEstourado.js  ← Decide se um orçamento estourado já foi notificado no mês
│   │   ├── currency.js                 ← Busca e converte cotações de câmbio (TaxaCambio)
│   │   ├── defaultCategorias.js        ← Categorias padrão usadas pra semear a tabela Categoria
│   │   ├── generateInsights.js         ← Gera os insights automáticos do dashboard
│   │   ├── gerarCodigoFamilia.js       ← Gera código único de convite para a família
│   │   ├── gerarCodigoGrupo.js         ← Gera código único de convite para o grupo
│   │   ├── mapPluggyTransaction.js     ← Converte transação da Pluggy pro formato interno
│   │   ├── materializeRecorrencias.js  ← Materializa ocorrências vencidas de uma recorrência
│   │   ├── moedas.js                   ← Lista de moedas suportadas (BRL, USD, EUR, GBP)
│   │   ├── notifyOrcamentoEstourado.js ← Envia o e-mail de aviso de orçamento estourado
│   │   ├── pluggyClient.js             ← Cliente da API Pluggy (Open Finance)
│   │   ├── projectBalance.js           ← Projeta o saldo do mês com base no ritmo de gastos
│   │   ├── serializeConta.js           ← Converte Prisma.Decimal em number nas respostas de Conta
│   │   ├── serializeEvento.js          ← Converte Prisma.Decimal em number nas respostas de Evento
│   │   ├── serializeFamilia.js         ← Formata os dados da família e membros nas respostas
│   │   ├── serializeGrupo.js           ← Formata grupo, membros, despesas e pagamentos
│   │   ├── serializeMeta.js            ← Converte Prisma.Decimal em number nas respostas de Meta
│   │   ├── serializeOrcamento.js       ← Converte Prisma.Decimal em number nas respostas de Orçamento
│   │   ├── serializeRecorrencia.js     ← Converte Prisma.Decimal em number nas respostas de Recorrência
│   │   ├── serializeTransferencia.js   ← Converte Prisma.Decimal em number nas respostas de Transferência
│   │   ├── splitDespesaGrupo.js        ← Divide o valor de uma despesa de grupo entre participantes
│   │   ├── syncOpenFinance.js          ← Sincroniza contas e transações de uma conexão bancária
│   │   ├── transactionSelect.js        ← Select de Transacao sem o campo anexo (listagem/export)
│   │   ├── validateAnexo.js            ← Validação do comprovante anexado (tipo e tamanho)
│   │   ├── validateCategoria.js        ← Validação de nome/tipo de categoria personalizada
│   │   ├── validateConta.js            ← Validação de nome/tipo/moeda/saldo inicial de conta
│   │   ├── validateDespesaGrupo.js     ← Validação de despesa de grupo (participantes, valores)
│   │   ├── validateEvento.js           ← Validação de nome/datas/orçamento de evento
│   │   ├── validateFamilia.js          ← Validação de nome e código de família
│   │   ├── validateGrupo.js            ← Validação de nome/código de grupo e nome de convidado
│   │   ├── validateMeta.js             ← Validação de título/valor alvo/prazo e aportes
│   │   ├── validateOrcamento.js        ← Validação de categoria/valor limite de orçamento
│   │   ├── validatePagamentoGrupo.js   ← Validação de quitação entre membros do grupo
│   │   ├── validateRecorrencia.js      ← Validação de recorrência (tipo/valor/categoria/dia do mês)
│   │   └── validateTransferencia.js    ← Validação de contas/valor de transferência
│   ├── tests/                          ← Testes de integração das rotas (Vitest + Supertest)
│   ├── server.js                       ← Ponto de entrada da API
│   ├── .env                            ← Variáveis de ambiente (não vai pro git)
│   ├── .env.example                    ← Modelo de variáveis de ambiente (inclui SMTP)
│   └── package.json
│
├── render.yaml                          ← Blueprint de deploy do backend no Render
│
└── frontend/                           ← Interface React
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.jsx             ← Página inicial
    │   │   ├── Login.jsx               ← Tela de login
    │   │   ├── Register.jsx            ← Tela de cadastro
    │   │   ├── ForgotPassword.jsx      ← Solicitar redefinição de senha
    │   │   ├── ResetPassword.jsx       ← Criar nova senha a partir do link recebido
    │   │   ├── Dashboard.jsx           ← Painel principal
    │   │   ├── Reports.jsx             ← Relatórios mensais com filtros
    │   │   ├── Goals.jsx               ← Metas financeiras: lista, progresso e aportes
    │   │   ├── Budgets.jsx             ← Orçamento mensal por categoria, com aviso de estouro
    │   │   ├── Eventos.jsx             ← Lista de eventos (viagens/ocasiões)
    │   │   ├── EventoDetalhe.jsx       ← Detalhe do evento: transações vinculadas e orçamento
    │   │   ├── Recurring.jsx           ← Transações recorrentes (lançamento mensal automático)
    │   │   ├── Contas.jsx              ← Múltiplas contas, saldos e transferências
    │   │   ├── Categorias.jsx          ← Categorias personalizadas (ícone/cor)
    │   │   ├── Familia.jsx             ← Membros da família e código de convite
    │   │   ├── Grupos.jsx              ← Lista de grupos (estilo Splitwise)
    │   │   └── GrupoDetalhe.jsx        ← Detalhe do grupo: despesas, pagamentos e saldos
    │   ├── components/
    │   │   ├── Navbar.jsx              ← Barra de navegação
    │   │   ├── SummaryCards.jsx        ← Cards de saldo/receitas/despesas
    │   │   ├── TransactionModal.jsx    ← Modal de adicionar/editar transação
    │   │   ├── TransactionList.jsx     ← Lista de transações (com empty states)
    │   │   ├── OFXImportModal.jsx      ← Modal de importação de extrato OFX
    │   │   ├── ProfileModal.jsx        ← Modal de editar perfil
    │   │   ├── PrivateRoute.jsx        ← Proteção de rotas autenticadas
    │   │   ├── Modal.jsx               ← Base dos modais (trava de foco, fecha com Esc)
    │   │   ├── ConfirmDialog.jsx       ← Confirmação de ações destrutivas
    │   │   ├── Alert.jsx               ← Alertas com role="alert"/"status" (leitor de tela)
    │   │   ├── Skeleton.jsx            ← Placeholders de carregamento
    │   │   ├── ThemeToggle.jsx         ← Alternância modo claro/escuro
    │   │   ├── PasswordMatchHint.jsx   ← Feedback ao vivo de confirmação de senha
    │   │   ├── AnexoViewer.jsx         ← Visualização do comprovante anexado (imagem ou PDF)
    │   │   ├── AporteModal.jsx         ← Modal de registrar aporte numa meta
    │   │   ├── BudgetCard.jsx          ← Card de orçamento com progresso do gasto no mês
    │   │   ├── BudgetModal.jsx         ← Modal de criar/editar orçamento por categoria
    │   │   ├── CategoriaChip.jsx       ← Chip de categoria com ícone e cor
    │   │   ├── CategoriaModal.jsx      ← Modal de criar/editar categoria personalizada
    │   │   ├── ConectarBancoModal.jsx  ← Modal do widget Pluggy Connect (conectar banco)
    │   │   ├── ConexaoBancariaCard.jsx ← Card de conexão bancária (status, sincronizar, remover)
    │   │   ├── ContaCard.jsx           ← Card de conta com saldo atual
    │   │   ├── ContaModal.jsx          ← Modal de criar/editar conta
    │   │   ├── CotacoesPanel.jsx       ← Painel de cotações de câmbio
    │   │   ├── DespesaGrupoModal.jsx   ← Modal de lançar/editar despesa de grupo
    │   │   ├── EventoCard.jsx          ← Card de evento com gasto/recebido acumulados
    │   │   ├── EventoModal.jsx         ← Modal de criar/editar evento
    │   │   ├── GrupoCard.jsx           ← Card de grupo (nome, membros)
    │   │   ├── GrupoModal.jsx          ← Modal de criar grupo / entrar por código
    │   │   ├── HistoricoViewer.jsx     ← Histórico de edições de uma transação
    │   │   ├── InsightsPanel.jsx       ← Painel de insights automáticos do dashboard
    │   │   ├── MetaCard.jsx            ← Card de meta com progresso
    │   │   ├── MetaModal.jsx           ← Modal de criar/editar meta
    │   │   ├── PagamentoGrupoModal.jsx ← Modal de registrar quitação entre membros
    │   │   ├── ProjectionCard.jsx      ← Card de projeção de saldo do mês
    │   │   ├── RecurringCard.jsx       ← Card de recorrência
    │   │   ├── RecurringModal.jsx      ← Modal de criar/editar recorrência
    │   │   ├── SaldosGrupo.jsx         ← Exibição de "quem deve quem" no grupo
    │   │   ├── TransferModal.jsx       ← Modal de transferência entre contas
    │   │   └── charts/
    │   │       └── ExpensePieChart.jsx ← Gráfico de pizza (despesas e receitas)
    │   ├── context/
    │   │   ├── AuthContext.jsx         ← Estado global de autenticação
    │   │   ├── CategoriasContext.jsx   ← Estado global de categorias (ícone/cor, cache)
    │   │   └── ThemeContext.jsx        ← Estado global de tema (persistido no navegador)
    │   ├── hooks/
    │   │   └── useInstallPrompt.js     ← Captura o evento beforeinstallprompt (instalar como PWA)
    │   ├── services/
    │   │   └── api.js                  ← Configuração do Axios (suporta file://)
    │   ├── utils/
    │   │   ├── categories.js           ← Categorias por tipo (fonte única)
    │   │   ├── ofxParser.js            ← Parser de arquivos OFX (SGML e XML)
    │   │   ├── resizeImage.js          ← Redimensiona a foto de perfil no navegador antes do upload
    │   │   ├── format.js               ← Formatação de moeda (BRL) e data
    │   │   ├── chartTheme.js           ← Cores dos gráficos por tema (claro/escuro)
    │   │   ├── anexoFile.js            ← Leitura/validação do arquivo de comprovante no navegador
    │   │   ├── contaTipos.js           ← Tipos de conta (corrente, cartão, dinheiro...) e ícones
    │   │   └── generateReportPdf.js    ← Gera o PDF do relatório mensal (jsPDF)
    │   ├── App.jsx                     ← Rotas da aplicação
    │   ├── main.jsx                    ← Ponto de entrada React
    │   └── index.css                   ← Estilos globais (temas claro e escuro via CSS custom properties)
    ├── index.html                      ← HTML base (Vite)
    ├── vite.config.js                  ← Configuração do Vite (base: '/' no web, './' no Electron)
    ├── vercel.json                     ← Rewrite de SPA para deploy na Vercel
    └── package.json
```

---

## 🚀 Como rodar o projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) versão 18 ou superior
- Git instalado
- Um banco PostgreSQL acessível (local via Docker/instalação nativa, ou uma instância gratuita na nuvem — Neon, Supabase, Render)

### Passo 1 — Clonar o repositório

```bash
git clone https://github.com/itsmariah/moneytrack.git
cd moneytrack
```

### Passo 2 — Instalar dependências

```bash
# Instala tudo de uma vez (backend + frontend)
npm run install:all

# Instala as dependências do Electron (pasta raiz)
npm install
```

### Passo 3 — Configurar variáveis de ambiente

```bash
cd backend
cp .env.example .env
```

> Edite o `.env` gerado: defina um `JWT_SECRET` próprio (qualquer string longa e aleatória serve para desenvolvimento local) e aponte `DATABASE_URL` para o seu Postgres (local ou na nuvem — veja o pré-requisito acima).

### Passo 4 — Criar o banco de dados

```bash
# ainda dentro de backend/
npx prisma migrate deploy
npx prisma generate
```

> Só precisa rodar na primeira vez (ou após novas migrações). Aplica as migrações existentes no Postgres configurado em `DATABASE_URL`.

### Passo 5 — Rodar como aplicação web

Abra dois terminais:

```bash
# Terminal 1 — Backend (porta 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (porta 5173)
cd frontend && npm run dev
```

Acesse: **http://localhost:5173**

### Passo 5 (alternativo) — Rodar como app desktop (Electron)

```bash
# Da pasta raiz, inicia backend + frontend + Electron ao mesmo tempo
npm run electron:dev
```

### Empacotar como instalador

```bash
# Gera instalador .exe (Windows) em dist-electron/
npm run electron:build
```

---

## 🔌 Endpoints da API

Base URL: `http://localhost:3001/api`

### Autenticação

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/auth/register` | Cadastrar usuário | Não |
| POST | `/auth/login` | Fazer login | Não |
| POST | `/auth/forgot-password` | Solicitar link de redefinição de senha por e-mail | Não |
| POST | `/auth/reset-password` | Redefinir senha usando o token recebido por e-mail | Não |
| GET | `/auth/me` | Dados do usuário logado | Sim |
| PUT | `/auth/profile` | Editar perfil | Sim |

### Transações

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/transactions` | Listar transações, paginado (com filtros) | Sim |
| GET | `/transactions/export` | Exportar transações em CSV (respeita os filtros) | Sim |
| POST | `/transactions` | Criar transação | Sim |
| POST | `/transactions/bulk` | Importar lote de transações (OFX, máx. 500 por vez) | Sim |
| PUT | `/transactions/:id` | Editar transação | Sim |
| GET | `/transactions/:id/anexo` | Buscar o comprovante anexado (fora da listagem, não pesa a paginação) | Sim |
| GET | `/transactions/:id/historico` | Histórico de edições financeiras da transação | Sim |
| DELETE | `/transactions/:id` | Excluir transação | Sim |

**Filtros disponíveis no GET `/transactions` (e no `/export`):**
```
?tipo=receita           → filtra por tipo
?categoria=Alimentação  → filtra por categoria
?data_inicio=2026-05-01 → filtra por data inicial
?data_fim=2026-05-31    → filtra por data final
?busca=mercado          → busca por texto na descrição ou categoria
?page=1&limit=50        → paginação (padrão: 50 por página, máx. 200)
```

**Resposta do GET `/transactions`:**
```json
{ "transactions": [ /* ... */ ], "page": 1, "limit": 50, "total": 12, "totalPages": 1 }
```

### Relatórios

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/reports/balance` | Saldo geral (receitas - despesas) | Sim |
| GET | `/reports/monthly?month=2026-05` | Relatório de um mês | Sim |
| GET | `/reports/categories` | Totais por categoria e tipo | Sim |
| GET | `/reports/evolution` | Evolução dos últimos 6 meses | Sim |
| GET | `/reports/insights` | Insights automáticos (padrões de gasto, comparação com meses anteriores) | Sim |
| GET | `/reports/projecao` | Projeção de saldo do mês (ritmo de gastos + recorrências previstas) | Sim |

### Metas

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/metas` | Listar metas da família | Sim |
| POST | `/metas` | Criar meta | Sim |
| PUT | `/metas/:id` | Editar meta | Sim |
| DELETE | `/metas/:id` | Excluir meta (cascata apaga os aportes) | Sim |
| POST | `/metas/:id/aportes` | Adicionar aporte a uma meta | Sim |
| DELETE | `/metas/:id/aportes/:aporteId` | Remover um aporte | Sim |

### Orçamentos

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/orcamentos` | Listar orçamentos da família, com o gasto do mês pedido | Sim |
| POST | `/orcamentos` | Criar orçamento (um por categoria por família) | Sim |
| PUT | `/orcamentos/:id` | Editar orçamento | Sim |
| DELETE | `/orcamentos/:id` | Excluir orçamento | Sim |

> Ao estourar o limite, um e-mail de aviso é disparado automaticamente (no máximo um por mês por orçamento — ver `ultimaNotificacaoMes`).

### Recorrências

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/recorrencias` | Listar recorrências da família (materializa ocorrências vencidas antes) | Sim |
| POST | `/recorrencias` | Criar recorrência | Sim |
| PUT | `/recorrencias/:id` | Editar recorrência (`dataInicio` não pode mudar) | Sim |
| DELETE | `/recorrencias/:id` | Excluir recorrência (transações já geradas permanecem) | Sim |

### Contas

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/contas` | Listar contas da família com o saldo atual de cada uma | Sim |
| POST | `/contas` | Criar conta | Sim |
| PUT | `/contas/:id` | Editar conta | Sim |
| DELETE | `/contas/:id` | Excluir conta (cascata apaga transações/transferências dela) | Sim |

### Transferências

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/transferencias` | Listar transferências da família | Sim |
| POST | `/transferencias` | Criar transferência entre duas contas da família | Sim |
| DELETE | `/transferencias/:id` | Excluir transferência (desfaz o movimento entre as contas) | Sim |

### Categorias

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/categorias` | Listar categorias da família (opcionalmente filtradas por tipo) | Sim |
| POST | `/categorias` | Criar categoria personalizada (nome/tipo/ícone/cor) | Sim |
| PUT | `/categorias/:id` | Editar categoria (renomear atualiza transações/recorrências/orçamentos já lançados) | Sim |
| DELETE | `/categorias/:id` | Remover o metadado de ícone/cor (transações que usam o nome continuam existindo) | Sim |

### Eventos

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/eventos` | Listar eventos da família (ativos e encerrados), com gasto/recebido acumulados | Sim |
| GET | `/eventos/:id` | Detalhe de um evento com gasto/recebido acumulados | Sim |
| POST | `/eventos` | Criar evento (status sempre nasce "ativo") | Sim |
| PUT | `/eventos/:id` | Editar evento | Sim |
| POST | `/eventos/:id/fechar` | Encerrar evento | Sim |
| POST | `/eventos/:id/reabrir` | Reabrir evento encerrado | Sim |
| DELETE | `/eventos/:id` | Excluir evento (transações vinculadas sobrevivem, sem evento) | Sim |

> Diferente do orçamento mensal por categoria, um evento com teto (`orcamento`) estourado só mostra um badge visual na tela ("⚠ Orçamento estourado") — não dispara e-mail. O campo `notificacaoEnviada` existe no schema para esse fim, mas não é lido nem gravado por nenhuma rota hoje (feature parcialmente implementada).

### Família

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/familia` | Dados da família atual: nome, código e membros com papel | Sim |
| PUT | `/familia` | Renomear a família (só o dono) | Sim |
| POST | `/familia/regenerar-codigo` | Gerar um novo código, invalidando o antigo (só o dono) | Sim |
| POST | `/familia/entrar` | Entrar numa família existente por código (troca a família do usuário logado) | Sim |
| POST | `/familia/sair` | Sair da família atual (recebe uma família pessoal nova) | Sim |
| DELETE | `/familia/membros/:usuarioId` | Remover um membro da família (só o dono) | Sim |

### Grupos

Estilo Splitwise — um usuário pode estar em vários grupos (não é escopado por família). As rotas se dividem em CRUD do grupo, gerenciamento de membros, despesas e pagamentos (quitações):

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/grupos` | Listar os grupos do usuário logado | Sim |
| GET | `/grupos/:id` | Detalhe do grupo: membros, despesas, pagamentos e saldo "quem deve quem" | Sim |
| POST | `/grupos` | Criar grupo (criador vira admin) | Sim |
| POST | `/grupos/entrar` | Entrar num grupo existente por código | Sim |
| DELETE | `/grupos/:id` | Excluir grupo (só admin) | Sim |
| POST | `/grupos/:id/convidados` | Adicionar convidado sem conta ao grupo | Sim |
| POST | `/grupos/:id/sair` | Sair do grupo | Sim |
| DELETE | `/grupos/:id/membros/:membroId` | Remover um membro (só admin) | Sim |
| POST | `/grupos/:id/despesas` | Registrar despesa, dividida igualmente entre os participantes escolhidos | Sim |
| PUT | `/grupos/:id/despesas/:despesaId` | Editar despesa (só quem criou ou um admin) | Sim |
| DELETE | `/grupos/:id/despesas/:despesaId` | Excluir despesa (só quem criou ou um admin) | Sim |
| POST | `/grupos/:id/pagamentos` | Registrar quitação entre dois membros | Sim |
| DELETE | `/grupos/:id/pagamentos/:pagamentoId` | Excluir um pagamento (só quem registrou ou um admin) | Sim |

> Um membro com despesa ou pagamento registrado não pode ser removido/sair do grupo — precisa editar/excluir esses registros primeiro (preserva o histórico de quem gastou/pagou o quê).

### Câmbio

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/cambio` | Moedas suportadas e cotação atual (`TaxaCambio`) | Sim |
| POST | `/cambio/atualizar` | Atualizar a cotação na API pública (ação manual, sem cron) | Sim |

### Open Finance

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/open-finance/connect-token` | Gerar o connect token do widget Pluggy Connect | Sim |
| POST | `/open-finance/conexoes` | Registrar a conexão após o widget concluir e disparar a 1ª sincronização | Sim |
| GET | `/open-finance/conexoes` | Listar as conexões bancárias da família | Sim |
| POST | `/open-finance/conexoes/:id/sincronizar` | Sincronizar manualmente ("Sincronizar agora") | Sim |
| DELETE | `/open-finance/conexoes/:id` | Remover a conexão (contas e transações importadas ficam) | Sim |
| POST | `/open-finance/webhook` | Webhook chamado pela Pluggy quando um item é atualizado | Não |

---

## 📂 Categorias disponíveis

| Receitas | Despesas |
|----------|----------|
| Salário | Alimentação |
| Freelance | Delivery |
| Venda | Transporte |
| Investimentos | Moradia |
| Aluguel recebido | Saúde |
| Outros | Educação |
| | Lazer |
| | Pets |
| | Viagem |
| | Vestuário |
| | Assinaturas |
| | Outros |

> Definidas centralmente em `frontend/src/utils/categories.js`. O dropdown de categoria no formulário de transação muda automaticamente conforme o tipo selecionado.

---

## 🗄️ Banco de dados

O banco é **PostgreSQL**, acessado via Prisma ORM a partir da string de conexão em `DATABASE_URL`.

**Tabela: Usuario**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| nome | String | Nome do usuário |
| email | String (único) | E-mail de login |
| senha | String | Senha criptografada (bcrypt) |
| foto | String? | Foto de perfil (base64), opcional |
| resetTokenHash | String? (único) | Hash (sha256) do token de redefinição de senha, opcional |
| resetTokenExpiresAt | DateTime? | Expiração do token de redefinição |
| tokenVersion | Int | Incrementado ao trocar a senha, invalida tokens JWT antigos |
| createdAt | DateTime | Data de cadastro |

**Tabela: Familia**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| nome | String | Nome da família |
| codigo | String (único) | Código curto pra outro usuário entrar (compartilhado fora do app) |
| createdAt | DateTime | Data de criação |

> Uma "carteira" compartilhada entre 1+ usuários — é a "família pessoal" criada no registro, ou uma compartilhada depois de entrar com um código.

**Tabela: Transacao**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| usuarioId | Int (FK) | Quem lançou (atribuição, não controle de acesso) |
| familiaId | Int (FK) | Família dona do dado (escopo real de leitura/escrita) |
| tipo | String | `receita` ou `despesa` |
| valor | Decimal(12,2) | Valor em reais (armazenamento exato, sem ruído de ponto flutuante) |
| categoria | String | Ex: Salário, Alimentação... |
| descricao | String | Descrição opcional |
| data | String | Data no formato YYYY-MM-DD |
| contaId | Int (FK) | Conta em que a transação foi lançada |
| eventoId | Int? (FK) | Evento ao qual a transação está vinculada, opcional |
| recorrenciaId | Int? (FK) | Recorrência que originou a transação, opcional |
| pluggyTransactionId | String? (único) | Preenchido só em transações vindas de sincronização Open Finance |
| anexo / anexoNome | String? | Comprovante anexado (data URL base64) e seu nome, opcionais |
| createdAt / updatedAt | DateTime | Data de criação / última edição |

**Tabela: Categoria**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| usuarioId | Int (FK) | Quem criou |
| familiaId | Int (FK) | Família dona do dado |
| nome / tipo | String | Nome e tipo (receita/despesa) |
| icone | String | Emoji de exibição (padrão `💰`) |
| cor | String | Cor de exibição (padrão `#6366f1`) |
| createdAt | DateTime | Data de criação |

> Só metadado de exibição — Transacao/Recorrencia/Orcamento continuam guardando a categoria como texto livre. Uma categoria sem linha correspondente aqui cai no ícone/cor padrão.

**Tabela: Conta**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| usuarioId / familiaId | Int (FK) | Atribuição / escopo |
| nome / tipo | String | Ex: "Nubank", `corrente`/`cartao`/`dinheiro`... |
| saldoInicial | Decimal(12,2) | Saldo que a conta já tinha antes de começar a ser rastreada |
| moeda | String | `BRL`/`USD`/`EUR`/`GBP`, fixada na criação |
| pluggyAccountId / conexaoId | String? / Int? | Preenchidos só quando a conta nasceu de uma sincronização Open Finance |
| createdAt | DateTime | Data de criação |

> O saldo exibido nunca é guardado: é sempre `saldoInicial` + receitas − despesas dessa conta (± transferências).

**Tabela: ConexaoBancaria**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| usuarioId / familiaId | Int (FK) | Atribuição / escopo |
| pluggyItemId | String (único) | Identificador do Item na Pluggy |
| nomeConector | String | Nome do banco conectado |
| status / erro | String / String? | Status da conexão e último erro, se houver |
| ultimaSincronizacao | DateTime? | Data da última sincronização |
| createdAt | DateTime | Data de criação |

> Nenhum dado bancário sensível (senha, token de acesso ao banco) é guardado — só o identificador do Item na Pluggy.

**Tabela: Transferencia**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| usuarioId / familiaId | Int (FK) | Atribuição / escopo |
| contaOrigemId / contaDestinoId | Int (FK) | Contas envolvidas na movimentação |
| valor | Decimal(12,2) | Valor que saiu da conta de origem (na moeda dela) |
| valorDestino | Decimal(12,2)? | Só entre moedas diferentes: quanto chegou no destino (na moeda dele) |
| data / descricao | String | Data e descrição opcional |
| createdAt | DateTime | Data de criação |

> Nunca gera Transacao (não é receita nem despesa de verdade) — não aparece nos relatórios, só no saldo de cada conta.

**Tabela: Recorrencia**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| usuarioId / familiaId | Int (FK) | Atribuição / escopo |
| tipo / valor / categoria / descricao | — | Mesmos campos financeiros de uma transação |
| diaDoMes | Int | Dia do mês em que a ocorrência é gerada |
| dataInicio / dataFim | String / String? | Início (fixo) e fim opcional da recorrência |
| ativa | Boolean | Se continua gerando novas ocorrências |
| contaId | Int (FK) | Conta em que as ocorrências são lançadas |

> As ocorrências não nascem direto daqui — são materializadas como Transacao normais sempre que o usuário acessa a tela, sem depender de cron.

**Tabela: Meta**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| usuarioId / familiaId | Int (FK) | Atribuição / escopo |
| titulo | String | Nome da meta |
| valorAlvo | Decimal(12,2) | Valor a ser atingido |
| prazo | String? | Data limite, opcional |
| createdAt | DateTime | Data de criação |

**Tabela: Aporte**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| metaId | Int (FK) | Meta à qual o aporte pertence |
| valor | Decimal(12,2) | Valor aportado |
| data / descricao | String | Data e descrição opcional |
| createdAt | DateTime | Data de criação |

> `valorAtual` de uma Meta é sempre a soma dos aportes, nunca um campo redundante (evita dessincronização).

**Tabela: Orcamento**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| usuarioId / familiaId | Int (FK) | Atribuição / escopo |
| categoria | String | Categoria limitada |
| valorLimite | Decimal(12,2) | Limite mensal |
| ultimaNotificacaoMes | String? | Mês (YYYY-MM) do último aviso de estouro já enviado por e-mail |
| createdAt | DateTime | Data de criação |

> Vale todo mês até o usuário editar — o gasto do mês é sempre calculado a partir das Transacoes, nunca guardado aqui. Único por `[familiaId, categoria]`.

**Tabela: Evento**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| usuarioId / familiaId | Int (FK) | Atribuição / escopo |
| nome | String | Ex: "Viagem Rio 2026" |
| dataInicio / dataFim | String / String? | Datas do evento |
| orcamento | Decimal(12,2)? | Teto opcional de gasto do evento |
| status | String | `ativo` ou `encerrado` |
| notificacaoEnviada | Boolean | Reservado para gatilho de e-mail ao estourar o teto — hoje não lido/gravado por nenhuma rota (só o badge visual funciona) |
| createdAt | DateTime | Data de criação |

> Etiqueta pra agrupar transações que já existem no dashboard normal — gasto/recebido são sempre recalculados a partir das Transacoes vinculadas.

**Tabela: Grupo**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| nome | String | Nome do grupo |
| codigo | String (único) | Código curto pra entrar, mesmo padrão de Familia.codigo |
| criadorUsuarioId | Int (FK) | Quem criou o grupo |
| createdAt | DateTime | Data de criação |

> Diferente de Familia: um Usuario pode estar em vários grupos ao mesmo tempo, e o grupo não é escopado por familiaId.

**Tabela: GrupoMembro**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| grupoId | Int (FK) | Grupo ao qual pertence |
| usuarioId | Int? (FK) | Usuário de verdade, ou `null` se for convidado |
| nomeConvidado | String? | Nome do convidado sem conta (um dos dois é sempre `null`) |
| papel | String | `admin` ou `membro` |
| createdAt | DateTime | Data de criação |

> Primeira tabela de associação N:N do projeto. Único por `[grupoId, usuarioId]` — vários convidados (`usuarioId` null) convivem no mesmo grupo sem violar a constraint.

**Tabela: DespesaGrupo**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| grupoId | Int (FK) | Grupo da despesa |
| descricao / valorTotal / data | — | Dados da despesa |
| pagoPorMembroId | Int (FK) | Quem desembolsou (Restrict — preserva o histórico) |
| criadoPorUsuarioId | Int (FK) | Quem lançou a despesa no app |
| createdAt | DateTime | Data de criação |

**Tabela: DivisaoDespesa**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| despesaGrupoId | Int (FK) | Despesa dividida |
| membroId | Int (FK) | Participante do rateio (Restrict) |
| valorDevido | Decimal(12,2) | Parte devida por esse membro |

> Uma linha por participante, incluindo o pagador se ele também fizer parte do rateio — soma de `valorDevido` sempre igual ao `valorTotal` da despesa. Único por `[despesaGrupoId, membroId]`.

**Tabela: PagamentoGrupo**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| grupoId | Int (FK) | Grupo da quitação |
| deMembroId / paraMembroId | Int (FK) | Quem pagou / quem recebeu, fora do app |
| valor / data | — | Valor e data da quitação |
| criadoPorUsuarioId | Int (FK) | Quem registrou a quitação |
| createdAt | DateTime | Data de criação |

> Abate o saldo calculado em `calcularSaldosGrupo.js` — nunca persiste o saldo em si, só o evento que o compõe.

**Tabela: TaxaCambio**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| moeda | String (único) | Código da moeda (`USD`, `EUR`, `GBP`...) |
| taxaParaBRL | Decimal(12,6) | Quantos reais vale 1 unidade dessa moeda |
| atualizadoEm | DateTime | Data da última atualização manual |

> Global (sem familiaId) — cotação é dado de mercado, não pertence a uma família específica. Atualizada manualmente, nunca por cron.

**Relacionamento:** Todo Usuario pertence a exatamente uma Familia. Os dados financeiros (Transacao, Categoria, Conta, ConexaoBancaria, Transferencia, Recorrencia, Meta, Orcamento, Evento) carregam tanto `usuarioId` (atribuição — "quem lançou") quanto `familiaId` — mas o escopo real de acesso é sempre `familiaId`: qualquer membro da família pode ver/editar/excluir qualquer registro dela. Grupo/GrupoMembro seguem um modelo à parte (N:N, sem familiaId): um usuário pode estar em vários grupos, e um grupo pode incluir convidados sem conta.

---

## 🔐 Segurança

- Senhas armazenadas com hash **bcrypt** (fator 10) — nunca em texto puro
- Autenticação via **JWT** (algoritmo fixado em `HS256`) com expiração de 7 dias, segredo obrigatório via `JWT_SECRET` (o servidor recusa iniciar sem essa variável)
- Trocar a senha invalida qualquer token JWT emitido antes disso (`tokenVersion`), mesmo dentro da janela de 7 dias
- Token de redefinição de senha armazenado como hash (sha256), nunca em texto puro
- Rate limiting em `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` e em todas as rotas de transações/relatórios
- Cabeçalhos de segurança via `helmet`
- Todas as rotas de transações e relatórios exigem token válido
- Cada usuário só acessa suas próprias transações

---

## 🧪 Testes

Backend e frontend têm suítes de testes automatizados com **[Vitest](https://vitest.dev)**.

```bash
# Backend — 100+ testes: cálculos financeiros, validação, paginação, hash de token,
# serialização de Decimal, e testes de integração das rotas (auth, transações, relatórios) via Supertest
cd backend && npm test

# Frontend — parser de OFX (receita/despesa, encoding, arquivos malformados) e formatação (moeda, data)
cd frontend && npm test
```

Os testes de integração do backend mockam o Prisma Client (sem precisar de um Postgres real pra rodar) e cobrem, entre outras coisas, que cada rota escopa os dados pelo usuário do token — nunca pelo que vem no corpo ou na query string da requisição.

---

## 🚢 Deploy

O banco de dados é **PostgreSQL** (não SQLite), hospedado gratuitamente no **[Neon](https://neon.com)**. O backend roda no **[Render](https://render.com)** (via [`render.yaml`](render.yaml)), e o frontend é publicado como site estático na **[Vercel](https://vercel.com)** (via [`frontend/vercel.json`](frontend/vercel.json)). Essa combinação não exige cartão de crédito em nenhuma das três plataformas.

> ⚠️ Confira as condições atuais de cada plataforma (limites de uso, cartão de crédito) antes de criar as contas — políticas de free tier mudam com frequência. Duas limitações do plano free a ter em mente: o backend no Render "dorme" após 15 min sem tráfego (primeiro acesso subsequente leva ~1 min pra acordar), e o Postgres do Neon suspende o compute após períodos ociosos (também com cold start rápido, mas sem expirar ou apagar dados — diferente do free tier do próprio Render, que apaga o banco após 30 dias).

### Ambiente em produção

| Camada | URL |
|--------|-----|
| Frontend (Vercel) | https://geldtrack.vercel.app |
| Backend (Render) | https://moneytrack-backend-glsk.onrender.com/api |
| Banco de dados | Neon, projeto `moneytrack`, região `aws-sa-east-1` (São Paulo) |

### Banco de dados (Neon)

1. [neon.com](https://neon.com) → crie um projeto Postgres (pode usar a região São Paulo — `aws-sa-east-1`).
2. Copie a **connection string** (formato `postgresql://usuario:senha@host/neondb?sslmode=require`).
3. Rode as migrations apontando pra ela (uma vez, a partir de `backend/`):
   ```bash
   DATABASE_URL="sua-connection-string" npx prisma migrate deploy
   ```

### Backend (Render)

1. [render.com](https://render.com) → **New → Blueprint** → conecte o repositório do GitHub. O Render detecta o [`render.yaml`](render.yaml) na raiz automaticamente.
2. Ao aplicar o blueprint, preencha as variáveis marcadas como `sync: false`:
   - `DATABASE_URL`: a connection string do Neon (passo anterior)
   - `FRONTEND_URL`: URL do projeto na Vercel (ex: `https://seu-projeto.vercel.app`)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`: credenciais de e-mail para recuperação de senha
   - `JWT_SECRET` é gerado automaticamente pelo Render (`generateValue: true`)
3. Deploy. O `buildCommand` já roda `prisma generate` e `prisma migrate deploy` a cada deploy.

### Frontend (Vercel)

1. [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
2. **Root Directory**: `frontend`
3. Framework preset: **Vite** (a Vercel detecta sozinha; build command `npm run build`, output `dist`)
4. Variável de ambiente: `VITE_API_URL` = URL do app criado no Render + `/api` (ex: `https://moneytrack-backend.onrender.com/api`)
5. Deploy. Depois disso, pegue a URL gerada pela Vercel e atualize `FRONTEND_URL` nas variáveis de ambiente do serviço no Render, se ainda não tiver usado a URL final no passo anterior.

O `vercel.json` já cuida do rewrite de SPA (`BrowserRouter`), então rotas como `/dashboard` funcionam mesmo com acesso direto/F5.

### Desenvolvimento local com Postgres

Como o schema usa `provider = "postgresql"`, rodar localmente também exige uma conexão Postgres real (não dá mais para usar só um arquivo `dev.db`). Opções mais simples:
- Um Postgres local (nativo ou via Docker: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`)
- Uma instância gratuita na nuvem (o próprio projeto Neon criado para produção, ou outro separado para dev)

Configure `DATABASE_URL` no `backend/.env` apontando para essa conexão (veja `backend/.env.example`).

### Desktop (Electron)

- Sempre gere o instalador com `npm run electron:build` (ou `electron:pack`) **a partir da raiz do repositório** — esses scripts setam `ELECTRON_BUILD=true`, que faz o Vite usar `base: './'` (necessário para o `file://`). Rodar `cd frontend && npm run build` manualmente gera um build incompatível com o Electron.
- Confira que não existe `backend/.env` nem `backend/prisma/dev.db` com dados reais no momento do build — eles são excluídos do pacote pelo filtro do `electron-builder`, mas vale checar antes de distribuir.

#### Publicando uma release (Windows/macOS/Linux) automaticamente

O workflow [`.github/workflows/release.yml`](.github/workflows/release.yml) builda o instalador para as três plataformas e publica direto em **GitHub Releases** sempre que uma tag `vX.Y.Z` é enviada:

```bash
# 1. Atualize a versão em package.json (raiz) para bater com a tag
# 2. Crie e envie a tag
git tag v1.0.0
git push origin v1.0.0
```

Isso dispara o workflow, que builda em paralelo no Windows, macOS e Linux e anexa `.exe`/`.dmg`/`.AppImage` na release correspondente à tag — sem precisar gerar e subir o instalador manualmente. O botão "Baixar para desktop" da landing page aponta para `https://github.com/itsmariah/moneytrack/releases`, então ele passa a funcionar assim que a primeira tag for publicada.

---

## 🔄 Fluxo da aplicação

```
Usuário abre o app (web ou desktop)
        ↓
Landing Page (/)
        ↓
Cadastro (/cadastro) ou Login (/login)
        ↓
Token JWT gerado e salvo no navegador
        ↓
Dashboard (/dashboard)
    ├── Ver saldo, receitas e despesas
    ├── Adicionar / editar / excluir transações
    ├── Filtrar por tipo, categoria e data
    ├── Importar extrato bancário (.ofx)
    ├── Gráfico de gastos por categoria
    └── Gráfico de fontes de renda
        ↓
Relatórios (/relatorios)
    ├── Selecionar mês
    ├── Filtrar por tipo (Todos / Receitas / Despesas)
    ├── Filtrar por categoria
    ├── Ver resumo do período filtrado
    ├── Gráfico de barras — evolução dos últimos 6 meses
    ├── Gráfico de pizza — despesas por categoria
    ├── Gráfico de pizza — fontes de renda
    └── Exportar relatório do mês em PDF
        ↓
Metas (/metas)
    ├── Criar meta com valor alvo e prazo
    ├── Registrar aportes manuais
    └── Acompanhar o progresso até o valor alvo
        ↓
Orçamentos (/orcamentos)
    ├── Definir limite mensal por categoria
    ├── Ver o progresso do gasto do mês
    └── Receber aviso por e-mail quando o limite estoura
        ↓
Recorrências (/recorrencias)
    ├── Cadastrar recorrência (aluguel, assinatura, salário...)
    ├── Definir dia do mês, início e fim opcional
    └── Ocorrências vencidas viram transações automaticamente
        ↓
Contas (/contas)
    ├── Cadastrar múltiplas contas (corrente, cartão, dinheiro...), inclusive em outra moeda
    ├── Transferir valores entre contas
    ├── Conectar um banco via Open Finance (Pluggy) e sincronizar
    └── Ver e atualizar as cotações de câmbio
        ↓
Categorias (/categorias)
    ├── Criar categorias personalizadas com ícone e cor
    └── Editar/remover categorias existentes
        ↓
Família (/familia)
    ├── Ver membros da família e o papel de cada um
    ├── Entrar em outra família por código, ou compartilhar o código próprio
    └── Remover membro / sair da família
        ↓
Eventos (/eventos)
    ├── Criar evento com data e orçamento opcional (ex: uma viagem)
    ├── Vincular transações ao evento
    ├── Acompanhar gasto/recebido acumulados
    └── Encerrar / reabrir o evento
        ↓
Grupos (/grupos)
    ├── Criar grupo ou entrar por código
    ├── Adicionar convidados sem conta
    ├── Lançar despesas divididas entre os participantes
    └── Ver "quem deve quem" e quitar saldos
```

---

## 📋 Requisitos implementados

| ID | Requisito | Status |
|----|-----------|--------|
| RF01 | Cadastro de usuários | ✅ |
| RF02 | Login e logout | ✅ |
| RF03 | Editar dados do usuário | ✅ |
| RF04 | Cadastrar receitas | ✅ |
| RF05 | Cadastrar despesas | ✅ |
| RF06 | Editar transações | ✅ |
| RF07 | Excluir transações | ✅ |
| RF08 | Listar transações | ✅ |
| RF09 | Calcular saldo automaticamente | ✅ |
| RF10 | Filtrar por data | ✅ |
| RF11 | Categorizar transações | ✅ |
| RF12 | Relatório mensal | ✅ |
| RF13 | Gráfico de gastos por categoria | ✅ |
| RF14 | Importação de extrato OFX | ✅ |
| RF15 | Filtros na página de relatórios | ✅ |
| RF16 | Gráfico de fontes de renda | ✅ |
| RF17 | Versão desktop (Electron) | ✅ |
| RF18 | Recuperação de senha por e-mail | ✅ |
| RF19 | Metas financeiras (aportes manuais e progresso) | ✅ |
| RF20 | Orçamento mensal por categoria, com aviso por e-mail ao estourar | ✅ |
| RF21 | Transações recorrentes (lançamento automático mensal) | ✅ |
| RF22 | Múltiplas contas e transferências entre elas | ✅ |
| RF23 | Sincronização bancária via Open Finance (Pluggy) | ✅ |
| RF24 | Insights automáticos no dashboard | ✅ |
| RF25 | Projeção de saldo do mês | ✅ |
| RF26 | Exportação de relatório mensal em PDF | ✅ |
| RF27 | Categorias personalizadas (ícone/cor) | ✅ |
| RF28 | Anexo de comprovante nas transações | ✅ |
| RF29 | Histórico de edição de transações | ✅ |
| RF30 | Contas compartilhadas / modo família (entrar por código) | ✅ |
| RF31 | Suporte a PWA (instalável no celular) | ✅ |
| RF32 | Multi-moeda (contas em USD/EUR/GBP com cotação) | ✅ |
| RF33 | Eventos para agrupar transações, com orçamento e indicador visual de estouro | ✅ |
| RF34 | Grupos estilo Splitwise (dividir despesas, ver quem deve quem) | ✅ |
| RF35 | Quitação de saldo em grupos (settle up) | ✅ |

---

## ⚠️ Observações importantes

- O arquivo `.env` **não vai para o Git** (está no `.gitignore`). Cada desenvolvedor cria o seu a partir de `backend/.env.example`.
- `JWT_SECRET` é **obrigatório** — o servidor (`node server.js`) encerra imediatamente se essa variável não estiver definida.
- Para a recuperação de senha funcionar, configure as variáveis `SMTP_*` no `.env` do backend com credenciais de um provedor de e-mail (ex: Gmail App Password). Sem isso, o envio do e-mail falha.
- Os dois servidores precisam estar rodando ao mesmo tempo para o sistema funcionar (exceto no modo Electron, que gerencia isso automaticamente).
