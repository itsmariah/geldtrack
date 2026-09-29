# 01 — Visão Geral do Projeto

## O que é o GeldTrack?

O **GeldTrack** é um sistema web de gestão financeira pessoal. O usuário cria uma conta, faz login e passa a registrar suas receitas (dinheiro que entra) e despesas (dinheiro que sai), organizadas em contas próprias (conta corrente, cartão, carteira...), com o saldo calculado automaticamente e sincronização opcional direto com o banco via Open Finance.

Além do controle básico de receitas/despesas, o sistema cobre metas financeiras, orçamento por categoria, transações recorrentes, relatórios com gráficos e exportação em PDF, categorias personalizadas, anexo de comprovante, histórico de edição, uma carteira compartilhada entre familiares ("modo família"), contas em moeda estrangeira, eventos pra agrupar gastos de uma viagem ou ocasião, e grupos pra dividir despesas com amigos estilo Splitwise (com cálculo de "quem deve quem" e quitação de saldo). Também roda como app desktop (Electron) e é instalável no celular como PWA.

O projeto nasceu como trabalho acadêmico da disciplina **Programação de Computadores** no período 2026.1, com o escopo descrito nas seções abaixo (RF01–RF18). Depois da entrega, o desenvolvimento continuou como projeto pessoal — o restante deste documento reflete o estado atual, não só o escopo original da disciplina.

---

## 🎯 Objetivos

### Objetivo geral
Desenvolver um sistema que permita ao usuário controlar suas finanças pessoais de forma simples, intuitiva e eficiente — sozinho, em família ou dividindo gastos com outras pessoas.

### Objetivos específicos
- Permitir cadastro e autenticação de usuários com senha criptografada
- Registrar receitas e despesas com categoria, conta e data
- Exibir saldo atualizado automaticamente, por conta e consolidado (inclusive entre moedas)
- Filtrar transações por tipo, categoria, período e texto livre
- Gerar relatórios financeiros mensais, com gráficos e exportação em PDF
- Acompanhar metas, orçamentos e recorrências sem esforço manual repetido
- Compartilhar a carteira financeira entre membros de uma família
- Dividir despesas em grupo com outras pessoas e calcular quem deve quem

---

## 📋 Requisitos Funcionais

Os requisitos funcionais descrevem **o que o sistema deve fazer**.

### Usuário
| ID | Descrição | Onde está implementado |
|----|-----------|----------------------|
| RF01 | O sistema deve permitir o cadastro de usuários | `POST /api/auth/register` + página `/cadastro` |
| RF02 | O sistema deve permitir login e logout | `POST /api/auth/login` + botão "Sair" na Navbar |
| RF03 | O sistema deve permitir editar dados do usuário | `PUT /api/auth/profile` + `ProfileModal.jsx` |

### Transações
| ID | Descrição | Onde está implementado |
|----|-----------|----------------------|
| RF04 | O sistema deve permitir cadastrar receitas | `POST /api/transactions` (tipo: receita) |
| RF05 | O sistema deve permitir cadastrar despesas | `POST /api/transactions` (tipo: despesa) |
| RF06 | O sistema deve permitir editar transações | `PUT /api/transactions/:id` + botão ✏️ |
| RF07 | O sistema deve permitir excluir transações | `DELETE /api/transactions/:id` + botão 🗑️ |
| RF08 | O sistema deve listar todas as transações | `GET /api/transactions` + `TransactionList.jsx` |

### Controle financeiro
| ID | Descrição | Onde está implementado |
|----|-----------|----------------------|
| RF09 | O sistema deve calcular o saldo automaticamente | `GET /api/reports/balance` + `SummaryCards.jsx` |
| RF10 | O sistema deve permitir filtrar transações por data | Query params `data_inicio` e `data_fim` |
| RF11 | O sistema deve permitir categorizar transações | Campo `categoria` no formulário e no banco |

### Relatórios
| ID | Descrição | Onde está implementado |
|----|-----------|----------------------|
| RF12 | O sistema deve gerar relatório mensal | `GET /api/reports/monthly` + página `Reports.jsx` |
| RF13 | O sistema deve exibir gráficos de gastos por categoria | `ExpensePieChart.jsx` + Recharts |
| RF14 | O sistema deve permitir importar extrato bancário (OFX) | `POST /api/transactions/bulk` + `OFXImportModal.jsx` |
| RF15 | O sistema deve permitir filtrar relatórios por tipo e categoria | Página `Reports.jsx` |
| RF16 | O sistema deve exibir gráfico de fontes de renda por categoria | `ExpensePieChart.jsx` (variação receitas) |
| RF17 | O sistema deve rodar como aplicativo desktop | Electron (`electron/main.js` + `electron-builder`) |
| RF18 | O sistema deve permitir recuperação de senha por e-mail | `POST /api/auth/forgot-password` + `/reset-password` |

### Contas, transferências e sincronização bancária
| ID | Descrição | Onde está implementado |
|----|-----------|----------------------|
| RF19 | O sistema deve permitir múltiplas contas por usuário/família (conta corrente, cartão, carteira...) | `routes/contas.js` + página `Contas.jsx` |
| RF20 | O sistema deve permitir transferência de saldo entre contas | `routes/transferencias.js` + `TransferModal.jsx` |
| RF21 | O sistema deve permitir sincronizar contas e transações automaticamente via Open Finance | `routes/openFinance.js` (Pluggy) + `ConectarBancoModal.jsx` |
| RF22 | O sistema deve permitir contas em moeda estrangeira, com total consolidado em reais | Campo `Conta.moeda` + `routes/cambio.js` + `CotacoesPanel.jsx` |

### Metas, orçamento e recorrências
| ID | Descrição | Onde está implementado |
|----|-----------|----------------------|
| RF23 | O sistema deve permitir definir metas financeiras com valor-alvo e prazo | `routes/metas.js` + página `Goals.jsx` |
| RF24 | O sistema deve permitir registrar aportes manuais numa meta e acompanhar o progresso | `POST /api/metas/:id/aportes` + `AporteModal.jsx` |
| RF25 | O sistema deve permitir definir um orçamento mensal por categoria | `routes/orcamentos.js` + página `Budgets.jsx` |
| RF26 | O sistema deve avisar por e-mail quando um orçamento é ultrapassado | `Orcamento.ultimaNotificacaoMes` + `utils/mailer.js` |
| RF27 | O sistema deve permitir cadastrar transações recorrentes, lançadas automaticamente | `routes/recorrencias.js` + `utils/materializeRecorrencias.js` |

### Personalização e auditoria
| ID | Descrição | Onde está implementado |
|----|-----------|----------------------|
| RF28 | O sistema deve permitir categorias personalizadas com ícone e cor | `routes/categorias.js` + `CategoriaModal.jsx` |
| RF29 | O sistema deve permitir anexar um comprovante (foto/PDF) a uma transação | Campo `Transacao.anexo` + `AnexoViewer.jsx` |
| RF30 | O sistema deve manter histórico de edições de uma transação | Model `TransacaoHistorico` + `HistoricoViewer.jsx` |
| RF31 | O sistema deve exibir insights automáticos sobre os gastos do usuário | `GET /api/reports/insights` + `InsightsPanel.jsx` |
| RF32 | O sistema deve projetar o saldo de fechamento do mês | `GET /api/reports/projecao` + `ProjectionCard.jsx` |
| RF33 | O sistema deve permitir exportar o relatório mensal em PDF | `utils/generateReportPdf.js` (geração no navegador) |

### Família (carteira compartilhada)
| ID | Descrição | Onde está implementado |
|----|-----------|----------------------|
| RF34 | O sistema deve permitir compartilhar a carteira financeira entre membros de uma família, por código | `routes/familia.js` + página `Familia.jsx` |
| RF35 | O sistema deve escopar dados financeiros pela família, não pelo usuário individual | Campo `familiaId` nas tabelas financeiras — ver [05-banco-de-dados.md](./05-banco-de-dados.md) |

### Eventos e Grupos
| ID | Descrição | Onde está implementado |
|----|-----------|----------------------|
| RF36 | O sistema deve permitir agrupar transações existentes em um evento (ex: uma viagem) | `routes/eventos.js` + páginas `Eventos.jsx`/`EventoDetalhe.jsx` |
| RF37 | O sistema deve permitir definir um teto de gasto por evento e sinalizar quando ele é ultrapassado | Campo `Evento.orcamento` + badge "Orçamento estourado" em `EventoCard.jsx`/`EventoDetalhe.jsx` |
| RF38 | O sistema deve permitir criar grupos pra dividir despesas com outras pessoas, inclusive convidados sem conta | `routes/grupos.js` + páginas `Grupos.jsx`/`GrupoDetalhe.jsx` |
| RF39 | O sistema deve calcular automaticamente quem deve quem dentro de um grupo | `utils/calcularSaldosGrupo.js` |
| RF40 | O sistema deve permitir registrar a quitação de um saldo entre dois membros do grupo | `POST /api/grupos/:id/pagamentos` + `PagamentoGrupoModal.jsx` |

### Plataforma
| ID | Descrição | Onde está implementado |
|----|-----------|----------------------|
| RF41 | O sistema deve ser instalável no celular como aplicativo (PWA) | `vite-plugin-pwa` + `useInstallPrompt.js` |

---

## 📋 Requisitos Não Funcionais

Os requisitos não funcionais descrevem **como o sistema deve se comportar**.

| ID | Descrição | Como foi atendido |
|----|-----------|-------------------|
| RNF01 | Interface amigável e intuitiva | Design com tema escuro (e claro) moderno, cards e modais |
| RNF02 | Segurança dos dados (senha criptografada) | bcryptjs com fator 10 de custo, JWT com `tokenVersion`, rate limiting nas rotas sensíveis |
| RNF03 | Tempo de resposta inferior a 3 segundos | PostgreSQL (Neon) + Prisma = respostas tipicamente em < 200ms |
| RNF04 | Acessível via navegador web | React rodando no navegador via Vite; também instalável como PWA ou app desktop (Electron) |
| RNF05 | Responsivo (adaptável ao celular) | CSS com media queries e grid layout flexível |
| RNF06 | Dados financeiros isolados por família, nunca vazando entre famílias diferentes | Toda rota escopa consultas por `familiaId` do token, nunca por valor vindo do corpo/query — coberto por testes de integração (proteção contra IDOR) |
| RNF07 | Cobertura de testes automatizados nas regras de negócio e nas rotas HTTP | Vitest + Supertest no backend (500+ testes), Vitest no frontend |

---

## 🗓️ Sprints (entrega acadêmica original)

### Sprint 1 (Semanas 1–2)
- Definição de requisitos
- Modelagem do banco de dados
- Diagrama de casos de uso e classes
- Estrutura inicial do projeto

### Sprint 2 (Semanas 3–4)
- Implementação do CRUD de transações
- Telas base (landing, login, cadastro, dashboard)
- Cálculo automático de saldo
- Persistência com LocalStorage (versão inicial)

### Sprint 3 (Semanas 5–6)
- Migração para backend real (Node.js + Express)
- Banco de dados SQLite com Prisma
- Autenticação JWT com bcrypt
- React com Vite (versão atual)
- Relatórios mensais e gráficos

---

## 🚀 Evolução pós-entrega (projeto de portfólio)

Depois da entrega da disciplina, o projeto continuou sendo desenvolvido como peça de portfólio pessoal, em etapas:

- **Migração de infraestrutura**: troca de SQLite por PostgreSQL (Neon), deploy real do backend (Render) e frontend (Vercel) — ver [05-banco-de-dados.md](./05-banco-de-dados.md).
- **Controle financeiro mais completo**: metas, orçamento por categoria com aviso por e-mail, transações recorrentes, múltiplas contas com transferência entre elas, categorias personalizadas, anexo de comprovante, histórico de edição.
- **Integração externa e automação**: sincronização bancária via Open Finance (Pluggy), insights automáticos, projeção de saldo, exportação de relatório em PDF.
- **Colaboração**: carteira compartilhada por família (join por código), grupos estilo Splitwise pra dividir despesas com quitação de saldo, eventos pra agrupar gastos de uma ocasião.
- **Plataforma**: app desktop via Electron, instalação como PWA no celular, multi-moeda.

O roadmap completo dessas etapas (RF19 em diante) está listado na seção de Requisitos Funcionais acima.

---

## 🔄 Fluxo geral da aplicação

```
Usuário abre o app (web, desktop ou PWA)
             ↓
     Landing Page (apresentação)
             ↓
    Cadastro ou Login
             ↓
    Token JWT salvo no navegador (familiaId resolvido a cada requisição)
             ↓
         Dashboard
    ┌──────────────────────────────────┐
    │ • Ver saldo/receitas/despesas       │
    │ • Adicionar/editar/excluir transação│
    │ • Filtrar por tipo/categoria/data   │
    │ • Ver gráfico por categoria         │
    │ • Ver insights e projeção de saldo  │
    └──────────────────────────────────┘
             ↓
    ┌─────────────┬─────────────┬─────────────┬─────────────┐
    │  Relatórios  │    Metas    │  Orçamentos │ Recorrências │
    │  (+ PDF)     │  (+ aportes)│ (+ e-mail)  │  (+ contas) │
    └─────────────┴─────────────┴─────────────┴─────────────┘
             ↓
    ┌─────────────┬─────────────┬─────────────┬─────────────┐
    │    Contas    │  Categorias │   Família   │             │
    │ (+ Open      │             │ (compartil- │             │
    │  Finance,    │             │  har por    │             │
    │  câmbio)     │             │  código)    │             │
    └─────────────┴─────────────┴─────────────┴─────────────┘
             ↓
    ┌─────────────────────────┬─────────────────────────────┐
    │         Eventos          │            Grupos            │
    │  Agrupar transações de   │  Dividir despesas, calcular  │
    │  uma viagem/ocasião,     │  quem deve quem, quitar      │
    │  com teto opcional       │  saldo, convidados sem conta │
    └─────────────────────────┴─────────────────────────────┘
```
