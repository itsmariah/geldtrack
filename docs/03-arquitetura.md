# 03 — Arquitetura do Sistema

## Visão Geral

O GeldTrack segue o modelo **Cliente-Servidor**, uma das arquiteturas mais comuns em aplicações web. O sistema é dividido em duas partes independentes que se comunicam via HTTP.

```
┌─────────────────────────────────────────────────────────────┐
│                      NAVEGADOR DO USUÁRIO                   │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              FRONTEND (React + Vite)                │  │
│   │           localhost:5173 · Vercel · Electron         │  │
│   │                                                     │  │
│   │  Landing → Login → Dashboard → Relatórios → Metas   │  │
│   │  → Orçamentos → Recorrências → Contas → Categorias  │  │
│   │  → Família → Eventos → Grupos                       │  │
│   └──────────────────┬──────────────────────────────────┘  │
│                      │ HTTP (Axios)                         │
└──────────────────────┼──────────────────────────────────────┘
                       │
        /api/... (dev: proxy do Vite · prod: VITE_API_URL direto)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              BACKEND (Node.js + Express)                    │
│                localhost:3001 · Render                      │
│                                                             │
│  /auth  /transactions  /reports  /metas  /orcamentos        │
│  /recorrencias  /contas  /transferencias  /categorias       │
│  /eventos  /familia  /grupos  /cambio  /open-finance         │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              Middleware JWT                         │  │
│   │  Resolve usuário, familiaId e papelFamilia em toda   │  │
│   │  rota protegida (exceto Grupos — ver abaixo)         │  │
│   └─────────────────────────────────────────────────────┘  │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │ Prisma ORM
┌──────────────────────────▼──────────────────────────────────┐
│              BANCO DE DADOS (PostgreSQL — Neon)              │
│                                                             │
│   ┌─────────────────┐ 1:1 ┌──────────────────────────┐    │
│   │    Familia      │◄────│         Usuario           │    │
│   │  (carteira       │     │  toda transação/conta/    │    │
│   │  compartilhada)  │     │  meta/orçamento/evento     │    │
│   └────────┬────────┘     │  do usuário é escopada     │    │
│            │ familiaId    │  pelo familiaId, não pelo   │    │
│            ▼               │  usuarioId (atribuição)     │    │
│   Transacao, Conta,        └──────────────────────────┘    │
│   Meta, Orcamento,                                          │
│   Recorrencia, Evento...                                    │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  Grupo / GrupoMembro / DespesaGrupo / PagamentoGrupo  │  │
│   │  N:N à parte — um Usuario pode estar em vários grupos │  │
│   │  (não só um), sem familiaId, com convidados sem conta │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

> 17 modelos no total — ver [05-banco-de-dados.md](./05-banco-de-dados.md) para a referência completa de cada tabela, e a explicação de por que Família e Grupo são dois modelos de compartilhamento diferentes.

---

## Modelo Cliente-Servidor

### O que é?

É uma arquitetura onde existe um **cliente** (quem pede informações) e um **servidor** (quem responde). O cliente nunca acessa o banco de dados diretamente — ele sempre passa pelo servidor.

### No GeldTrack

| Papel | Tecnologia | Porta local | Responsabilidade |
|-------|-----------|-------|-----------------|
| Cliente | React (Vite) — também empacotado via Electron ou instalado como PWA | 5173 | Interface visual, formulários, gráficos |
| Servidor | Node.js (Express) | 3001 | Regras de negócio, autenticação, banco |
| Banco | PostgreSQL, via Prisma | — | Persistir os dados (hospedado no Neon em produção) |

---

## Como o Frontend fala com o Backend?

O frontend usa o **Axios** para fazer requisições HTTP ao backend. Por exemplo:

```
Usuário clica "Adicionar transação"
          ↓
React chama api.post('/transactions', dados)
          ↓
Axios envia: POST http://localhost:5173/api/transactions
          ↓
Vite intercepta /api/* e redireciona para localhost:3001/api/transactions
          ↓
Express recebe a requisição
          ↓
Middleware verifica o JWT token
          ↓
Route handler salva no banco via Prisma
          ↓
Express responde com { id, tipo, valor, ... }
          ↓
React atualiza a lista na tela
```

> O redirecionamento `/api → localhost:3001` é chamado de **proxy** e é configurado no `vite.config.js` — mas só existe em desenvolvimento. Em produção (frontend na Vercel, backend no Render) não há proxy: o Axios chama a URL do backend diretamente, configurada na variável de ambiente `VITE_API_URL` do build da Vercel (`frontend/src/services/api.js`). No app desktop (Electron, que carrega via `file://`), a mesma lógica aponta sempre para `http://localhost:3001/api`, já que o backend roda embutido no processo do Electron.

---

## Estrutura de pastas

```
geldtrack/
│
├── electron/                    ← App desktop (Electron)
│
├── backend/                    ← Servidor (Node.js)
│   ├── prisma/
│   │   ├── schema.prisma       ← Define as 17 tabelas do banco
│   │   └── migrations/         ← Histórico de migrações (PostgreSQL)
│   ├── database/
│   │   └── db.js               ← Exporta o PrismaClient
│   ├── middleware/
│   │   └── auth.js             ← Verifica JWT, resolve familiaId/papelFamilia
│   ├── routes/                 ← Um arquivo por área: auth, transactions, reports,
│   │                              metas, orcamentos, recorrencias, contas,
│   │                              transferencias, categorias, eventos, familia,
│   │                              grupos, cambio, openFinance — lista completa em
│   │                              07-api-endpoints.md
│   ├── utils/                  ← Lógica pura testável sem banco (cálculos,
│   │                              validação, serialização — ver 05 e 07)
│   ├── tests/                  ← Testes de integração das rotas (Vitest + Supertest)
│   └── server.js               ← Configura e inicia o Express
│
└── frontend/                   ← Interface (React)
    ├── src/
    │   ├── pages/              ← Uma tela por rota — ver App.jsx e 08-frontend.md
    │   ├── components/         ← Partes reutilizáveis da UI (09-componentes.md)
    │   ├── context/            ← Estado global (usuário, tema, categorias)
    │   ├── hooks/               ← Hooks customizados (ex: useInstallPrompt, PWA)
    │   ├── services/           ← Configuração do Axios (baseURL varia por ambiente)
    │   ├── utils/               ← Formatação, parser de OFX, geração de PDF...
    │   ├── App.jsx             ← Define as rotas do React
    │   └── index.css           ← Estilos globais (tema claro/escuro)
    ├── index.html              ← HTML base (único arquivo HTML)
    └── vite.config.js          ← Configuração do Vite + proxy (dev) + plugin PWA
```

---

## Camadas da aplicação

### Camada de Apresentação (Frontend)
Responsável por tudo que o usuário vê e interage. Construída em React, é executada **no navegador** do usuário. Não tem acesso ao banco de dados.

### Camada de Negócio (Backend)
Responsável pelas regras do sistema: validar dados, autenticar usuários, garantir que cada usuário só veja suas próprias transações. Construída em Node.js com Express, roda em um **processo separado no computador**.

### Camada de Dados (Banco)
Responsável por persistir (salvar) as informações. Usamos **PostgreSQL**, hospedado gratuitamente no [Neon](https://neon.com) em produção (o projeto começou com SQLite, um arquivo local — ver o motivo da troca em [05-banco-de-dados.md](./05-banco-de-dados.md)). O Prisma é a "ponte" entre o Node.js e o banco.

---

## Por que separar frontend e backend?

1. **Segurança**: o banco de dados fica protegido atrás do servidor
2. **Organização**: cada parte tem uma responsabilidade clara
3. **Escalabilidade**: em produção, cada parte roda em serviço separado — frontend estático na Vercel, backend no Render, banco no Neon
4. **Reutilização**: o mesmo backend já serve três clientes diferentes — a versão web, o app desktop via Electron e o PWA instalável no celular
