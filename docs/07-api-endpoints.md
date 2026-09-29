# 07 — API Endpoints

## O que é uma API REST?

**API** (Application Programming Interface) é um conjunto de "contratos" que define como dois sistemas se comunicam.

**REST** (Representational State Transfer) é um estilo de arquitetura para APIs que usa os métodos HTTP de forma semântica:

| Método HTTP | Ação |
|-------------|------|
| GET | Buscar dados |
| POST | Criar dados |
| PUT | Atualizar dados |
| DELETE | Deletar dados |

**Base URL:** `http://localhost:3001/api`

---

## Autenticação nas requisições

Rotas marcadas com 🔒 exigem o token JWT no header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 👤 Rotas de Autenticação

### POST /auth/register

Cadastra um novo usuário.

**Não requer autenticação.**

**Body:**
```json
{
  "nome": "Jefferson Fidelis",
  "email": "jefferson@email.com",
  "senha": "minhasenha123"
}
```

**Resposta 201 Created:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nome": "Jefferson Fidelis",
    "email": "jefferson@email.com"
  }
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Preencha todos os campos" | Campo faltando |
| 400 | "A senha deve ter no mínimo 6 caracteres" | Senha curta |
| 409 | "E-mail já cadastrado" | E-mail duplicado |

---

### POST /auth/login

Autentica um usuário existente.

**Não requer autenticação.**

**Body:**
```json
{
  "email": "jefferson@email.com",
  "senha": "minhasenha123"
}
```

**Resposta 200 OK:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "nome": "Jefferson Fidelis",
    "email": "jefferson@email.com"
  }
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Preencha e-mail e senha" | Campo faltando |
| 401 | "E-mail ou senha incorretos" | Credenciais erradas |

---

### GET /auth/me 🔒

Retorna os dados do usuário logado.

**Resposta 200 OK:**
```json
{
  "id": 1,
  "nome": "Jefferson Fidelis",
  "email": "jefferson@email.com"
}
```

---

### PUT /auth/profile 🔒

Atualiza os dados do usuário logado. Todos os campos são opcionais.

**Body (enviar apenas o que quiser atualizar):**
```json
{
  "nome": "Jefferson F.",
  "email": "novo@email.com",
  "senha": "novasenha456"
}
```

**Resposta 200 OK:**
```json
{
  "id": 1,
  "nome": "Jefferson F.",
  "email": "novo@email.com"
}
```

---

## 💸 Rotas de Transações

> Todas as rotas abaixo são 🔒 — requerem JWT.
> Cada usuário acessa apenas suas próprias transações.

---

### GET /transactions 🔒

Lista transações **da família** do usuário logado (não só as que ele mesmo lançou — ver a seção de Família mais abaixo). Suporta filtros e paginação via query string. Antes de listar, a rota materializa qualquer ocorrência de recorrência já vencida (ver "Rotas de Recorrências"), pra garantir que ela apareça sem o usuário precisar visitar a tela de recorrências primeiro.

**Query params (todos opcionais):**
| Parâmetro | Tipo | Exemplo | Descrição |
|-----------|------|---------|-----------|
| `tipo` | string | `receita` ou `despesa` | Filtra por tipo |
| `categoria` | string | `Alimentação` | Filtra por categoria |
| `conta` | number | `2` | Filtra por `contaId` |
| `evento` | number | `5` | Filtra por `eventoId` |
| `data_inicio` | string | `2026-05-01` | Data mínima (YYYY-MM-DD) |
| `data_fim` | string | `2026-05-31` | Data máxima (YYYY-MM-DD) |
| `busca` | string | `mercado` | Busca por texto (case-insensitive) em `descricao` OU `categoria` |
| `page` | number | `2` | Página (padrão `1`) |
| `limit` | number | `20` | Itens por página (padrão `50`, máximo `200`) |

**Exemplos de URL:**
```
GET /api/transactions
GET /api/transactions?tipo=despesa
GET /api/transactions?categoria=Alimentação
GET /api/transactions?data_inicio=2026-05-01&data_fim=2026-05-31
GET /api/transactions?tipo=despesa&categoria=Lazer
GET /api/transactions?busca=mercado
GET /api/transactions?conta=2&evento=5
GET /api/transactions?page=2&limit=20
```

**Resposta 200 OK:**

A resposta é paginada: as transações ficam dentro de `transactions`, junto com metadados de paginação. Cada transação também traz o nome de quem lançou (`usuario.nome`) e um resumo da conta/evento vinculados, mas nunca o anexo (base64) — isso fica em `GET /transactions/:id/anexo`, à parte, pra não pesar a listagem.

```json
{
  "transactions": [
    {
      "id": 3,
      "usuarioId": 1,
      "tipo": "despesa",
      "valor": 45.90,
      "categoria": "Alimentação",
      "descricao": "Almoço restaurante",
      "data": "2026-05-21",
      "createdAt": "2026-05-21T14:30:00.000Z",
      "updatedAt": "2026-05-21T14:30:00.000Z",
      "recorrenciaId": null,
      "contaId": 1,
      "eventoId": null,
      "pluggyTransactionId": null,
      "anexoNome": "recibo.jpg",
      "usuario": { "nome": "Jefferson Fidelis" },
      "conta": { "nome": "Conta corrente", "moeda": "BRL" },
      "evento": null
    },
    {
      "id": 1,
      "usuarioId": 1,
      "tipo": "receita",
      "valor": 3000.00,
      "categoria": "Salário",
      "descricao": "Salário maio",
      "data": "2026-05-01",
      "createdAt": "2026-05-01T09:00:00.000Z",
      "updatedAt": "2026-05-01T09:00:00.000Z",
      "recorrenciaId": 2,
      "contaId": 1,
      "eventoId": null,
      "pluggyTransactionId": null,
      "anexoNome": null,
      "usuario": { "nome": "Jefferson Fidelis" },
      "conta": { "nome": "Conta corrente", "moeda": "BRL" },
      "evento": null
    }
  ],
  "page": 1,
  "limit": 50,
  "total": 2,
  "totalPages": 1
}
```

---

### GET /transactions/export 🔒

Exporta as transações filtradas em CSV (delimitado por `;`, com vírgula decimal e BOM UTF-8 — pensado pro Excel em pt-BR). Aceita exatamente os mesmos filtros de `GET /transactions` (`tipo`, `categoria`, `conta`, `evento`, `data_inicio`, `data_fim`, `busca`), mas sem paginação — exporta tudo que casa com o filtro de uma vez.

**Exemplo:** `GET /api/transactions/export?tipo=despesa&data_inicio=2026-05-01&data_fim=2026-05-31`

**Resposta 200 OK** — `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="geldtrack-transacoes.csv"`:
```
Data;Tipo;Categoria;Descrição;Valor;Moeda
2026-05-21;Despesa;Alimentação;Almoço restaurante;45,90;BRL
2026-05-01;Receita;Salário;Salário maio;3000,00;BRL
```

---

### POST /transactions/bulk 🔒

Importa transações em lote (usado na importação de extrato OFX). Todas as transações do lote vão para a mesma conta. Limitado a 20 importações por hora por usuário (mais restrito que o limite geral das outras rotas de transação, por ser a operação mais custosa).

**Body:**
```json
{
  "contaId": 1,
  "transactions": [
    { "tipo": "despesa", "valor": 89.90, "categoria": "Alimentação", "descricao": "Supermercado", "data": "2026-05-10" },
    { "tipo": "despesa", "valor": 32.00, "categoria": "Transporte", "descricao": "Uber", "data": "2026-05-11" }
  ]
}
```

**Regras:**
- `contaId` precisa apontar para uma conta que pertence à família do usuário.
- Máximo de 500 transações por chamada.
- Cada item da lista passa pela mesma validação de `POST /transactions` (tipo, valor, categoria, data).

**Resposta 201 Created:**
```json
{ "count": 2 }
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Lista de transações inválida" | `transactions` ausente, não é array, ou está vazio |
| 400 | "Máximo de 500 transações por importação" | Lote maior que o permitido |
| 400 | "Conta inválida" | `contaId` ausente ou não pertence à família |
| 400 | (mensagem de `validateTransactionInput`) | Algum item do lote com tipo/valor/categoria/data inválido |
| 429 | "Muitas importações. Tente novamente mais tarde." | Mais de 20 importações na última hora |

---

### POST /transactions 🔒

Cria uma nova transação.

**Body:**
```json
{
  "tipo": "despesa",
  "valor": 45.90,
  "categoria": "Alimentação",
  "descricao": "Almoço restaurante",
  "data": "2026-05-21"
}
```

**Campos obrigatórios:** `tipo`, `valor`, `categoria`, `data`

**Categorias disponíveis:**
`Salário`, `Alimentação`, `Transporte`, `Lazer`, `Saúde`, `Educação`, `Moradia`, `Outros`

**Resposta 201 Created:**
```json
{
  "id": 3,
  "usuarioId": 1,
  "tipo": "despesa",
  "valor": 45.9,
  "categoria": "Alimentação",
  "descricao": "Almoço restaurante",
  "data": "2026-05-21",
  "createdAt": "2026-05-21T14:30:00.000Z"
}
```

---

### PUT /transactions/:id 🔒

Atualiza uma transação existente. O `:id` é o ID da transação na URL.

**Exemplo:** `PUT /api/transactions/3`

**Body (todos os campos obrigatórios):**
```json
{
  "tipo": "despesa",
  "valor": 52.00,
  "categoria": "Alimentação",
  "descricao": "Almoço + sobremesa",
  "data": "2026-05-21"
}
```

**Resposta 200 OK:**
```json
{
  "id": 3,
  "usuarioId": 1,
  "tipo": "despesa",
  "valor": 52.0,
  "categoria": "Alimentação",
  "descricao": "Almoço + sobremesa",
  "data": "2026-05-21",
  "createdAt": "2026-05-21T14:30:00.000Z"
}
```

**Erros possíveis:**
| Código | Causa |
|--------|-------|
| 404 | Transação não encontrada ou não pertence ao usuário |

---

### GET /transactions/:id/anexo 🔒

Busca o anexo (comprovante em imagem ou PDF, guardado como base64) de uma transação — separado da listagem de propósito, pra não pesar a paginação com blobs que a maioria das telas nunca precisa exibir.

**Exemplo:** `GET /api/transactions/3/anexo`

**Resposta 200 OK:**
```json
{
  "anexo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "anexoNome": "recibo.jpg"
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Transação não encontrada" | `:id` não existe ou não pertence à família |
| 404 | "Esta transação não tem anexo" | Transação existe, mas nunca teve comprovante anexado |

---

### GET /transactions/:id/historico 🔒

Retorna o histórico de edições financeiras de uma transação (o que mudou e quando), do mais recente para o mais antigo. Só os campos "financeiros" são rastreados (`tipo`, `valor`, `categoria`, `descricao`, `data`, `contaId`, `eventoId`) — trocar o anexo não gera entrada no histórico, pra não duplicar base64 a cada edição. Uma edição que não muda nenhum desses campos também não gera entrada nenhuma.

**Exemplo:** `GET /api/transactions/3/historico`

**Resposta 200 OK:**
```json
[
  {
    "id": 8,
    "transacaoId": 3,
    "alteracoes": [
      { "campo": "valor", "de": 45.9, "para": 52.0 },
      { "campo": "descricao", "de": "Almoço restaurante", "para": "Almoço + sobremesa" }
    ],
    "createdAt": "2026-05-22T10:15:00.000Z"
  }
]
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Transação não encontrada" | `:id` não existe ou não pertence à família |

---

### DELETE /transactions/:id 🔒

Deleta uma transação.

**Exemplo:** `DELETE /api/transactions/3`

**Resposta 204 No Content** (sem corpo na resposta)

---

## 📊 Rotas de Relatórios

> Todas as rotas abaixo são 🔒 — requerem JWT.

---

### GET /reports/balance 🔒

Retorna o saldo geral (total de receitas, total de despesas, saldo).

**Query params opcionais:**
```
?start=2026-05-01   → data inicial
?end=2026-05-31     → data final
```

**Resposta 200 OK:**
```json
{
  "receitas": 3000.00,
  "despesas": 850.50,
  "saldo": 2149.50
}
```

---

### GET /reports/monthly 🔒

Relatório detalhado de um mês específico.

**Query param obrigatório:** `?month=YYYY-MM`

**Exemplo:** `GET /api/reports/monthly?month=2026-05`

**Resposta 200 OK:**
```json
{
  "month": "2026-05",
  "transactions": [
    {
      "id": 1,
      "tipo": "receita",
      "valor": 3000.00,
      "categoria": "Salário",
      "descricao": "Salário maio",
      "data": "2026-05-01"
    },
    {
      "id": 3,
      "tipo": "despesa",
      "valor": 45.90,
      "categoria": "Alimentação",
      "descricao": "Almoço",
      "data": "2026-05-21"
    }
  ],
  "resumo": {
    "receitas": 3000.00,
    "despesas": 45.90,
    "saldo": 2954.10
  }
}
```

---

### GET /reports/categories 🔒

Retorna o total gasto/recebido por categoria e tipo. Usado para o gráfico de pizza.

**Query params opcionais:** `?start=YYYY-MM-DD&end=YYYY-MM-DD`

**Resposta 200 OK:**
```json
[
  { "categoria": "Salário",     "tipo": "receita",  "total": 3000.00 },
  { "categoria": "Alimentação", "tipo": "despesa",  "total": 450.00  },
  { "categoria": "Transporte",  "tipo": "despesa",  "total": 200.00  },
  { "categoria": "Lazer",       "tipo": "despesa",  "total": 150.00  }
]
```

---

### GET /reports/evolution 🔒

Retorna a evolução de receitas e despesas nos últimos 6 meses. Usado para o gráfico de barras.

**Resposta 200 OK:**
```json
[
  { "mes": "2025-12", "receitas": 2800.00, "despesas": 1200.00 },
  { "mes": "2026-01", "receitas": 3000.00, "despesas": 980.00  },
  { "mes": "2026-02", "receitas": 3000.00, "despesas": 1450.00 },
  { "mes": "2026-03", "receitas": 3200.00, "despesas": 800.00  },
  { "mes": "2026-04", "receitas": 3000.00, "despesas": 1100.00 },
  { "mes": "2026-05", "receitas": 3000.00, "despesas": 850.50  }
]
```

---

### GET /reports/insights 🔒

Gera até 4 "insights" automáticos sobre a situação financeira da família, comparando as categorias do mês atual com as do mês anterior e cruzando com os orçamentos e metas já cadastrados. Nada é salvo no banco — tudo é recalculado a cada chamada, a partir das mesmas transações usadas nos outros relatórios.

Cada insight tem um `tipo` e um `tom` (`atencao`, `positivo` ou `neutro`), pra o frontend escolher cor/ícone sem precisar de um switch gigante. Os tipos possíveis, na ordem de prioridade em que entram na lista (a lista é cortada em 4):

| `tipo` | Quando aparece |
|--------|-----------------|
| `orcamento_estourado` | Um orçamento de categoria passou do limite no mês atual (um insight por orçamento estourado) |
| `categoria_aumento` | A categoria com maior alta (≥15%) em relação ao mês anterior, entre categorias com gasto anterior ≥ R$20 |
| `total_despesas` | O total de despesas do mês variou ≥10% frente ao mês anterior (`aumentou: true/false`) |
| `meta_proxima` | A meta mais próxima da conclusão, entre as que já passaram de 75% e ainda não foram concluídas |
| `categoria_queda` | A categoria com maior queda (≥15%) em relação ao mês anterior |
| `maior_categoria` | A categoria com maior gasto no mês atual (sempre aparece se houver alguma despesa) |
| `categoria_nova` | Categoria sem nenhum gasto no mês anterior mas com gasto relevante (≥ R$40) no mês atual |

**Resposta 200 OK:**
```json
[
  { "tipo": "orcamento_estourado", "tom": "atencao", "categoria": "Lazer", "valorLimite": 300, "gasto": 410 },
  { "tipo": "categoria_aumento", "tom": "atencao", "categoria": "Transporte", "percentual": 42, "valorAtual": 284, "valorAnterior": 200 },
  { "tipo": "meta_proxima", "tom": "positivo", "titulo": "Viagem para a praia", "percentual": 88, "restante": 360 },
  { "tipo": "maior_categoria", "tom": "neutro", "categoria": "Alimentação", "valor": 620.5 }
]
```

---

### GET /reports/projecao 🔒

Projeta o saldo até o fim do mês atual, combinando o que ainda vai acontecer com certeza (recorrências ativas que ainda não venceram este mês) com uma estimativa de gasto avulso baseada no ritmo de despesas não recorrentes até hoje. Nada é persistido — é recalculado a cada chamada. Antes de projetar, materializa ocorrências de recorrência já vencidas (mesmo motivo da rota de listagem de transações), pra uma recorrência que vence hoje não ser contada duas vezes.

**Resposta 200 OK:**
```json
{
  "saldoAtual": 2149.50,
  "receitasRecorrentesFuturas": 0,
  "despesasRecorrentesFuturas": 89.90,
  "estimativaGastosRestante": 210.35,
  "saldoProjetado": 1849.25,
  "diasRestantes": 10,
  "mes": "2026-05",
  "fimDoMes": "2026-05-31"
}
```

---

## 🎯 Rotas de Metas

> Todas as rotas abaixo são 🔒 — requerem JWT.
> Metas são escopadas por `familiaId`, igual Transações: qualquer membro da família vê e contribui com as metas da família inteira.

---

### GET /metas 🔒

Lista as metas da família, mais recente primeiro. Cada meta já vem com seus aportes (contribuições) incluídos. `valorAtual` e `concluida` nunca são lidos prontos do banco — são sempre recalculados aqui a partir da soma dos aportes, pra nunca existir um estado "meta" e "aportes" dessincronizado.

**Resposta 200 OK:**
```json
[
  {
    "id": 1,
    "titulo": "Viagem para a praia",
    "valorAlvo": 3000.00,
    "prazo": "2026-12-01",
    "createdAt": "2026-04-01T10:00:00.000Z",
    "valorAtual": 2640.00,
    "concluida": false,
    "aportes": [
      { "id": 5, "metaId": 1, "valor": 500.00, "data": "2026-05-10", "descricao": "Décimo terceiro", "createdAt": "2026-05-10T09:00:00.000Z" },
      { "id": 3, "metaId": 1, "valor": 2140.00, "data": "2026-04-01", "descricao": "", "createdAt": "2026-04-01T10:05:00.000Z" }
    ]
  }
]
```

---

### POST /metas 🔒

Cria uma meta nova.

**Body:**
```json
{
  "titulo": "Viagem para a praia",
  "valorAlvo": 3000.00,
  "prazo": "2026-12-01"
}
```

`prazo` é opcional.

**Resposta 201 Created:**
```json
{
  "id": 1,
  "titulo": "Viagem para a praia",
  "valorAlvo": 3000.00,
  "prazo": "2026-12-01",
  "createdAt": "2026-04-01T10:00:00.000Z",
  "valorAtual": 0,
  "concluida": false,
  "aportes": []
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Título é obrigatório" | Campo faltando |
| 400 | "Valor alvo deve ser maior que zero" | `valorAlvo` ausente ou ≤ 0 |
| 400 | "Prazo deve estar no formato YYYY-MM-DD" | `prazo` informado com formato inválido |

---

### PUT /metas/:id 🔒

Atualiza título, valor alvo e prazo de uma meta. Não mexe nos aportes (ver rotas abaixo).

**Exemplo:** `PUT /api/metas/1`

**Body:** mesmo formato do POST, com todos os campos.

**Resposta 200 OK:** a meta atualizada, no mesmo formato do GET (com os aportes já existentes).

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Meta não encontrada" | `:id` não existe ou não pertence à família |
| 400 | (mensagens de validação, mesmas do POST) | Título/valor/prazo inválidos |

---

### DELETE /metas/:id 🔒

Exclui a meta. Os aportes dela são excluídos em cascata junto.

**Exemplo:** `DELETE /api/metas/1`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Meta não encontrada" | `:id` não existe ou não pertence à família |

---

### POST /metas/:id/aportes 🔒

Registra um aporte (contribuição) para uma meta.

**Exemplo:** `POST /api/metas/1/aportes`

**Body:**
```json
{
  "valor": 500.00,
  "data": "2026-05-10",
  "descricao": "Décimo terceiro"
}
```

`descricao` é opcional.

**Resposta 201 Created:** a meta inteira, já atualizada (com `valorAtual`/`concluida` recalculados e o novo aporte incluído em `aportes`) — mesmo formato do GET.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Meta não encontrada" | `:id` não existe ou não pertence à família |
| 400 | "Valor deve ser maior que zero" | `valor` ausente ou ≤ 0 |
| 400 | "Data deve estar no formato YYYY-MM-DD" | `data` ausente ou inválida |

---

### DELETE /metas/:id/aportes/:aporteId 🔒

Remove um aporte lançado por engano.

**Exemplo:** `DELETE /api/metas/1/aportes/5`

**Resposta 200 OK:** a meta inteira, já atualizada — mesmo formato do GET (não é 204, já que o front precisa do `valorAtual` recalculado na hora).

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Aporte não encontrado" | `:aporteId` não existe, não pertence a `:id`, ou a meta não é da família (checagem feita pela posse da Meta, já que `Aporte` não guarda `familiaId` próprio) |

---

## 📉 Rotas de Orçamentos

> Todas as rotas abaixo são 🔒 — requerem JWT.
> Um orçamento é um limite mensal fixo por categoria (ex: "Lazer: R$300/mês") — vale todo mês até ser editado, não é um registro criado mês a mês. O gasto do mês nunca é guardado; é sempre recalculado a partir das Transações na hora da leitura.
>
> Quando uma despesa criada ou editada (em `/transactions`) faz o gasto do mês estourar o limite de um orçamento, **todos os membros da família recebem um e-mail de aviso** — no máximo um aviso por categoria por mês, mesmo que várias despesas seguidas continuem estourando o mesmo orçamento (controlado pelo campo interno `ultimaNotificacaoMes`, que é comparado com o mês da transação). O envio é assíncrono (fire-and-forget): a resposta da rota de transação não espera o e-mail sair, e uma falha no envio não derruba a criação da transação.

---

### GET /orcamentos 🔒

Lista os orçamentos da família com o gasto (e progresso) do mês pedido.

**Query param obrigatório:** `?month=YYYY-MM`

**Exemplo:** `GET /api/orcamentos?month=2026-05`

**Resposta 200 OK:**
```json
[
  {
    "id": 1,
    "categoria": "Lazer",
    "valorLimite": 300.00,
    "createdAt": "2026-03-01T12:00:00.000Z",
    "gasto": 410.00,
    "restante": 0,
    "percentual": 137,
    "estourado": true
  },
  {
    "id": 2,
    "categoria": "Alimentação",
    "valorLimite": 800.00,
    "createdAt": "2026-03-01T12:00:00.000Z",
    "gasto": 620.50,
    "restante": 179.50,
    "percentual": 78,
    "estourado": false
  }
]
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Parâmetro month obrigatório no formato YYYY-MM" | `month` ausente ou em formato errado |

---

### POST /orcamentos 🔒

Cria um orçamento novo. Só pode existir um orçamento por categoria por família.

**Body:**
```json
{
  "categoria": "Lazer",
  "valorLimite": 300.00
}
```

**Resposta 201 Created:**
```json
{
  "id": 1,
  "categoria": "Lazer",
  "valorLimite": 300.00,
  "createdAt": "2026-03-01T12:00:00.000Z"
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Categoria é obrigatória" | Campo faltando |
| 400 | "Valor limite deve ser maior que zero" | `valorLimite` ausente ou ≤ 0 |
| 400 | "Já existe um orçamento para esta categoria. Edite o orçamento existente." | Categoria já tem orçamento cadastrado na família |

---

### PUT /orcamentos/:id 🔒

Atualiza categoria e/ou limite de um orçamento.

**Exemplo:** `PUT /api/orcamentos/1`

**Body:** mesmo formato do POST.

**Resposta 200 OK:**
```json
{
  "id": 1,
  "categoria": "Lazer",
  "valorLimite": 350.00,
  "createdAt": "2026-03-01T12:00:00.000Z"
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Orçamento não encontrado" | `:id` não existe ou não pertence à família |
| 400 | "Categoria é obrigatória" / "Valor limite deve ser maior que zero" | Validação de campos |
| 400 | "Já existe um orçamento para esta categoria." | Trocou para uma categoria que já tem outro orçamento |

---

### DELETE /orcamentos/:id 🔒

Exclui um orçamento.

**Exemplo:** `DELETE /api/orcamentos/1`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Orçamento não encontrado" | `:id` não existe ou não pertence à família |

---

## 🔁 Rotas de Recorrências

> Todas as rotas abaixo são 🔒 — requerem JWT.
> Uma recorrência descreve um lançamento (receita ou despesa) que se repete todo mês num dia fixo — aluguel, salário, assinatura de streaming, etc.
>
> **As ocorrências não nascem de um cron/job rodando em segundo plano.** Elas são materializadas como linhas reais de `Transacao` sob demanda, sempre que alguém da família abre a lista de transações, a tela de recorrências, ou o relatório de projeção de saldo. Esse processo (`ensureOccurrences`) é idempotente — rodar de novo não duplica nada — e funciona mesmo que ninguém acesse o app por semanas: na próxima visita, todas as ocorrências vencidas desde então são geradas de uma vez. Se o dia configurado não existir no mês (ex: dia 31 em fevereiro), a ocorrência cai no último dia do mês.

---

### GET /recorrencias 🔒

Lista as recorrências da família (ativas primeiro). Materializa qualquer ocorrência vencida antes de listar.

**Resposta 200 OK:**
```json
[
  {
    "id": 1,
    "tipo": "despesa",
    "valor": 89.90,
    "categoria": "Assinaturas",
    "descricao": "Streaming",
    "diaDoMes": 5,
    "dataInicio": "2026-01-05",
    "dataFim": null,
    "ativa": true,
    "createdAt": "2026-01-05T08:00:00.000Z",
    "contaId": 1
  }
]
```

---

### POST /recorrencias 🔒

Cria uma recorrência nova. Se `dataInicio` já for hoje ou passado, as ocorrências já vencidas são geradas imediatamente após a criação.

**Body:**
```json
{
  "tipo": "despesa",
  "valor": 89.90,
  "categoria": "Assinaturas",
  "descricao": "Streaming",
  "diaDoMes": 5,
  "dataInicio": "2026-01-05",
  "dataFim": null,
  "contaId": 1
}
```

`dataFim` é opcional (recorrência sem data de fim continua indefinidamente).

**Resposta 201 Created:** a recorrência criada, no mesmo formato do GET.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Campos obrigatórios: tipo, valor, categoria, dia do mês, data de início, conta" | Campo faltando |
| 400 | "Tipo deve ser receita ou despesa" | `tipo` inválido |
| 400 | "Valor deve ser maior que zero" | `valor` ≤ 0 |
| 400 | "Dia do mês deve ser um número inteiro entre 1 e 31" | `diaDoMes` fora do intervalo |
| 400 | "Data de início deve estar no formato YYYY-MM-DD" | `dataInicio` inválida |
| 400 | "Data de fim não pode ser antes da data de início" | `dataFim` < `dataInicio` |
| 400 | "Conta inválida" | `contaId` ausente ou não pertence à família |

---

### PUT /recorrencias/:id 🔒

Atualiza uma recorrência. **`dataInicio` não pode ser alterada** — ela é a âncora de tudo que já foi gerado a partir dela, então a rota sempre reusa o valor já existente na validação, ignorando o que vier no body para esse campo.

**Exemplo:** `PUT /api/recorrencias/1`

**Body:**
```json
{
  "tipo": "despesa",
  "valor": 99.90,
  "categoria": "Assinaturas",
  "descricao": "Streaming (plano novo)",
  "diaDoMes": 5,
  "dataFim": "2026-12-05",
  "ativa": true,
  "contaId": 1
}
```

**Resposta 200 OK:** a recorrência atualizada.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Recorrência não encontrada" | `:id` não existe ou não pertence à família |
| 400 | (mesmas mensagens de validação do POST) | Campos inválidos |
| 400 | "Conta inválida" | `contaId` não pertence à família |

---

### DELETE /recorrencias/:id 🔒

Exclui a regra de recorrência. **As transações já geradas por ela permanecem** — só perdem o vínculo (`recorrenciaId` vira `null`).

**Exemplo:** `DELETE /api/recorrencias/1`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Recorrência não encontrada" | `:id` não existe ou não pertence à família |

---

## 🏦 Rotas de Contas

> Todas as rotas abaixo são 🔒 — requerem JWT.
> Uma Conta representa uma carteira (conta corrente, cartão, dinheiro em espécie...). O campo `moeda` é **fixado na criação e nunca muda depois** — trocar a moeda de uma conta com transações já lançadas corromperia a leitura de todo o histórico, então `PUT` simplesmente ignora `moeda` mesmo que venha no body. Moedas suportadas: veja `GET /cambio`.

---

### GET /contas 🔒

Lista as contas da família, cada uma com o saldo atual calculado (`saldoInicial` + receitas − despesas dessa conta, ± transferências de entrada/saída).

**Resposta 200 OK:**
```json
[
  { "id": 1, "nome": "Conta corrente", "tipo": "corrente", "moeda": "BRL", "saldoInicial": 500.00, "createdAt": "2026-01-01T08:00:00.000Z", "saldo": 2149.50 },
  { "id": 2, "nome": "Cartão de viagem (USD)", "tipo": "cartao", "moeda": "USD", "saldoInicial": 0, "createdAt": "2026-02-10T08:00:00.000Z", "saldo": -120.50 }
]
```

---

### POST /contas 🔒

Cria uma conta nova.

**Body:**
```json
{
  "nome": "Cartão de viagem",
  "tipo": "cartao",
  "saldoInicial": 0,
  "moeda": "USD"
}
```

`moeda` é opcional (padrão `BRL`).

**Resposta 201 Created:**
```json
{ "id": 2, "nome": "Cartão de viagem", "tipo": "cartao", "moeda": "USD", "saldoInicial": 0, "createdAt": "2026-02-10T08:00:00.000Z" }
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Nome é obrigatório" | Campo faltando |
| 400 | "Tipo é obrigatório" | Campo faltando |
| 400 | "Saldo inicial deve ser um número" | `saldoInicial` ausente ou não numérico (pode ser negativo — ex: fatura de cartão em aberto) |
| 400 | "Moeda não suportada" | `moeda` fora da lista suportada |

---

### PUT /contas/:id 🔒

Atualiza nome, tipo e saldo inicial de uma conta. `moeda` não pode ser alterada (ver nota acima) e é ignorada mesmo se enviada.

**Exemplo:** `PUT /api/contas/1`

**Body:**
```json
{
  "nome": "Conta corrente principal",
  "tipo": "corrente",
  "saldoInicial": 500.00
}
```

**Resposta 200 OK:** a conta atualizada.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Conta não encontrada" | `:id` não existe ou não pertence à família |
| 400 | (mensagens de validação, mesmas do POST) | Nome/tipo/saldoInicial inválidos |

---

### DELETE /contas/:id 🔒

Exclui uma conta. As transações e transferências dela são apagadas em cascata junto (o frontend avisa isso no modal de confirmação).

**Exemplo:** `DELETE /api/contas/2`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Conta não encontrada" | `:id` não existe ou não pertence à família |
| 400 | "Sua família precisa ter pelo menos uma conta" | Seria a última conta restante da família |

---

## 🔀 Rotas de Transferências

> Todas as rotas abaixo são 🔒 — requerem JWT.
> Uma transferência move dinheiro entre duas Contas **da mesma família** e **da mesma moeda** — nunca cria uma `Transacao`. Câmbio entre moedas diferentes é tratado como uma operação de mercado, fora do app: não há uma transferência que converta BRL para USD, por exemplo, pra não ter que inventar uma taxa própria pra esse movimento.

---

### GET /transferencias 🔒

Lista as transferências da família, mais recente primeiro.

**Resposta 200 OK:**
```json
[
  {
    "id": 1,
    "contaOrigemId": 1,
    "contaOrigemNome": "Conta corrente",
    "contaDestinoId": 3,
    "contaDestinoNome": "Poupança",
    "moeda": "BRL",
    "valor": 200.00,
    "data": "2026-05-15",
    "descricao": "Reserva de emergência",
    "createdAt": "2026-05-15T09:00:00.000Z"
  }
]
```

---

### POST /transferencias 🔒

Cria uma transferência entre duas contas da família.

**Body:**
```json
{
  "contaOrigemId": 1,
  "contaDestinoId": 3,
  "valor": 200.00,
  "data": "2026-05-15",
  "descricao": "Reserva de emergência"
}
```

**Resposta 201 Created:** a transferência criada, no mesmo formato do GET.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Conta de origem e conta de destino são obrigatórias" | Campo faltando |
| 400 | "A conta de origem deve ser diferente da conta de destino" | `contaOrigemId` === `contaDestinoId` |
| 400 | "Valor deve ser maior que zero" | `valor` ausente ou ≤ 0 |
| 400 | "Data deve estar no formato YYYY-MM-DD" | `data` inválida |
| 400 | "Conta de origem ou destino inválida" | Uma das contas não existe ou não pertence à família |
| 400 | "Não é possível transferir entre contas de moedas diferentes" | `contaOrigem.moeda` ≠ `contaDestino.moeda` |

---

### DELETE /transferencias/:id 🔒

Exclui uma transferência (desfaz o movimento entre as duas contas — o saldo é recalculado na próxima leitura de `GET /contas`, já que nunca é persistido).

**Exemplo:** `DELETE /api/transferencias/1`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Transferência não encontrada" | `:id` não existe ou não pertence à família |

---

## 🎨 Rotas de Categorias

> Todas as rotas abaixo são 🔒 — requerem JWT.
> Uma Categoria aqui é só metadado de exibição (ícone + cor) — **não é uma foreign key** referenciada pelas Transações/Recorrências/Orçamentos. Esses continuam guardando o nome da categoria como texto livre. Isso significa que excluir uma categoria não afeta nada que já usa o nome dela, e renomear uma categoria propaga o novo nome pra tudo que usava o nome antigo (ver `PUT` abaixo).
>
> Na primeira vez que a família acessa `GET /categorias` sem nenhuma categoria própria cadastrada, uma lista padrão é semeada automaticamente — não existe nenhum script de backfill manual.

---

### GET /categorias 🔒

Lista as categorias da família (semeando a lista padrão na primeira chamada, se necessário).

**Query param opcional:** `?tipo=receita` ou `?tipo=despesa`

**Resposta 200 OK:**
```json
[
  { "id": 1, "usuarioId": 1, "familiaId": 1, "nome": "Alimentação", "tipo": "despesa", "icone": "🍔", "cor": "#f97316", "createdAt": "2026-01-01T08:00:00.000Z" },
  { "id": 2, "usuarioId": 1, "familiaId": 1, "nome": "Salário", "tipo": "receita", "icone": "💰", "cor": "#22c55e", "createdAt": "2026-01-01T08:00:00.000Z" }
]
```

---

### POST /categorias 🔒

Cria uma categoria nova.

**Body:**
```json
{
  "nome": "Pets",
  "tipo": "despesa",
  "icone": "🐶",
  "cor": "#a855f7"
}
```

`icone` (padrão `💰`) e `cor` (padrão `#6366f1`) são opcionais.

**Resposta 201 Created:**
```json
{ "id": 9, "usuarioId": 1, "familiaId": 1, "nome": "Pets", "tipo": "despesa", "icone": "🐶", "cor": "#a855f7", "createdAt": "2026-05-20T10:00:00.000Z" }
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Nome é obrigatório" | Campo faltando |
| 400 | "Tipo deve ser receita ou despesa" | `tipo` ausente ou inválido |
| 400 | "Já existe uma categoria com esse nome para esse tipo" | Nome duplicado na família, para o mesmo tipo |

---

### PUT /categorias/:id 🔒

Atualiza nome, ícone e/ou cor de uma categoria. O `tipo` **não pode ser alterado** (evita confundir em qual formulário a categoria aparece). Se o nome mudar, o nome novo é propagado para todas as Transações, Recorrências e Orçamentos da família que ainda usavam o nome antigo — assim nada "perde" a categoria.

**Exemplo:** `PUT /api/categorias/9`

**Body:**
```json
{
  "nome": "Pets e veterinário",
  "icone": "🐾",
  "cor": "#a855f7"
}
```

**Resposta 200 OK:** a categoria atualizada.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Categoria não encontrada" | `:id` não existe ou não pertence à família |
| 400 | "Nome é obrigatório" | Campo faltando |
| 400 | "Já existe uma categoria com esse nome para esse tipo" | Renomeou para um nome já usado no mesmo tipo |

---

### DELETE /categorias/:id 🔒

Remove só o metadado (ícone/cor). Como não é uma foreign key, Transações/Recorrências/Orçamentos que já usam esse nome continuam existindo normalmente — só deixam de ter ícone/cor personalizados na UI.

**Exemplo:** `DELETE /api/categorias/9`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Categoria não encontrada" | `:id` não existe ou não pertence à família |

---

## ✈️ Rotas de Eventos

> Todas as rotas abaixo são 🔒 — requerem JWT.
> Um Evento é uma etiqueta pra agrupar transações já existentes em torno de algo com começo/fim, tipo uma viagem ou uma reforma — não é uma feature financeira por si só, é uma lente sobre transações comuns (que ganham um `eventoId` opcional em `POST/PUT /transactions`). Aceita um `orcamento` (teto) opcional: quando definido, a resposta traz `restante`/`percentual`/`estourado` recalculados a partir do gasto acumulado no evento — mas, diferente de `Orcamento` de categoria, **estourar o teto de um evento não dispara e-mail nenhum**, é só um indicador visual.

---

### GET /eventos 🔒

Lista os eventos da família (ativos primeiro, depois encerrados), cada um já com `gasto`/`recebido`/`saldo` acumulados a partir das transações vinculadas.

**Resposta 200 OK:**
```json
[
  {
    "id": 1,
    "nome": "Viagem para o Rio",
    "dataInicio": "2026-06-01",
    "dataFim": "2026-06-10",
    "orcamento": 2000.00,
    "status": "ativo",
    "createdAt": "2026-05-01T08:00:00.000Z",
    "gasto": 850.00,
    "recebido": 0,
    "saldo": -850.00,
    "restante": 1150.00,
    "percentual": 43,
    "estourado": false
  }
]
```

---

### GET /eventos/:id 🔒

Detalhe de um evento com `gasto`/`recebido`/`saldo` acumulados.

**Exemplo:** `GET /api/eventos/1`

**Resposta 200 OK:** mesmo formato de um item do GET /eventos.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Evento não encontrado" | `:id` não existe ou não pertence à família |

---

### POST /eventos 🔒

Cria um evento. `status` sempre nasce `"ativo"` — nunca é aceito do cliente.

**Body:**
```json
{
  "nome": "Viagem para o Rio",
  "dataInicio": "2026-06-01",
  "dataFim": "2026-06-10",
  "orcamento": 2000.00
}
```

`dataFim` e `orcamento` são opcionais.

**Resposta 201 Created:** o evento criado, já com `gasto: 0, recebido: 0, saldo: 0` (e progresso do orçamento, se informado).

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Nome é obrigatório" | Campo faltando |
| 400 | "Data de início deve estar no formato YYYY-MM-DD" | `dataInicio` ausente ou inválida |
| 400 | "Data de fim não pode ser antes da data de início" | `dataFim` < `dataInicio` |
| 400 | "Orçamento deve ser maior que zero" | `orcamento` informado e ≤ 0 |

---

### PUT /eventos/:id 🔒

Atualiza nome, datas e/ou orçamento. Não mexe em `status` (ver `/fechar` e `/reabrir` abaixo).

**Exemplo:** `PUT /api/eventos/1`

**Body:** mesmo formato do POST.

**Resposta 200 OK:** o evento atualizado, com gasto/recebido recalculados.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Evento não encontrado" | `:id` não existe ou não pertence à família |
| 400 | (mesmas mensagens de validação do POST) | Campos inválidos |

---

### POST /eventos/:id/fechar 🔒

Encerra o evento — ele some do seletor de novas transações, mas nada que já está vinculado é desvinculado.

**Exemplo:** `POST /api/eventos/1/fechar`

**Resposta 200 OK:** o evento com `status: "encerrado"`.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Evento não encontrado" | `:id` não existe ou não pertence à família |

---

### POST /eventos/:id/reabrir 🔒

Reabre um evento encerrado.

**Exemplo:** `POST /api/eventos/1/reabrir`

**Resposta 200 OK:** o evento com `status: "ativo"`.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Evento não encontrado" | `:id` não existe ou não pertence à família |

---

### DELETE /eventos/:id 🔒

Exclui o evento. As transações vinculadas sobrevivem, só perdem o vínculo (`eventoId` vira `null`).

**Exemplo:** `DELETE /api/eventos/1`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Evento não encontrado" | `:id` não existe ou não pertence à família |

---

## 👨‍👩‍👧 Rotas de Família

> Todas as rotas abaixo são 🔒 — requerem JWT.
>
> **Todo `Usuario` pertence a exatamente uma `Familia`, sempre** — mesmo alguém que "usa o app sozinho" tem uma família própria, criada automaticamente no cadastro. Família é o modelo de carteira compartilhada do GeldTrack: outra pessoa entra digitando um código curto (não há convite por e-mail), e a partir daí os dois enxergam e editam os mesmos dados. Esse é o motivo de quase toda outra rota deste documento filtrar por `familiaId` em vez de `usuarioId` — Transação, Conta, Meta, Orçamento, Recorrência, Evento e Categoria são todos "da família", não "do usuário". O campo `usuarioId` que aparece em vários desses registros é só **atribuição** ("quem lançou isso"), nunca escopo de acesso: qualquer membro da família enxerga e edita o que qualquer outro membro criou.
>
> Dentro de uma família, cada membro tem um `papelFamilia`: `"dono"` (criou a família ou herdou o posto — pode renomear, gerar novo código e remover membros) ou `"membro"` (acesso igual aos dados, mas sem essas ações administrativas). Uma família nunca fica sem dono: se o dono sai, o membro mais antigo restante assume automaticamente.

---

### GET /familia 🔒

Retorna os dados da família atual: nome, código (para compartilhar) e a lista de membros com o papel de cada um.

**Resposta 200 OK:**
```json
{
  "id": 1,
  "nome": "Família Fidelis",
  "codigo": "AB12CD",
  "membros": [
    { "id": 1, "nome": "Jefferson Fidelis", "email": "jefferson@email.com", "papel": "dono" },
    { "id": 2, "nome": "Maria Fidelis", "email": "maria@email.com", "papel": "membro" }
  ]
}
```

---

### PUT /familia 🔒

Renomeia a família. Só o dono pode.

**Body:**
```json
{ "nome": "Família Fidelis Silva" }
```

**Resposta 200 OK:** a família atualizada, no mesmo formato do GET.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 403 | "Só o dono da família pode renomeá-la" | Quem chamou tem `papelFamilia: "membro"` |
| 400 | "Nome da família é obrigatório" | Campo faltando |
| 400 | "Nome muito longo (máximo 60 caracteres)" | `nome` acima do limite |

---

### POST /familia/regenerar-codigo 🔒

Gera um novo código para a família, invalidando o antigo — útil se o código vazou para alguém que não devia entrar. Só o dono pode.

**Resposta 200 OK:**
```json
{ "codigo": "XY98ZW" }
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 403 | "Só o dono da família pode gerar um novo código" | Quem chamou é `"membro"` |

---

### POST /familia/entrar 🔒

Troca a família ativa do usuário logado para outra, usando o código dela. Depois da troca, os dados da família anterior ficam inacessíveis para esse usuário (não são apagados — só deixam de aparecer, já que ele não é mais membro dela).

**Body:**
```json
{ "codigo": "XY98ZW" }
```

**Resposta 200 OK:** a nova família, no mesmo formato do GET.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Código é obrigatório" | Campo faltando |
| 404 | "Código de família inválido" | Nenhuma família com esse código |
| 400 | "Você já faz parte dessa família" | Código aponta pra própria família atual |

---

### POST /familia/sair 🔒

Sai da família atual. Quem sai recebe uma família pessoal nova e vazia — nunca fica sem família. Se quem sai era o dono e sobra gente, o membro mais antigo restante vira dono automaticamente.

**Resposta 200 OK:**
```json
{ "id": 8, "nome": "Família de Jefferson Fidelis", "codigo": "QW45ER", "papel": "dono" }
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Você é o único membro dessa família — não há de onde sair" | Família só tem esse usuário |

---

### DELETE /familia/membros/:usuarioId 🔒

Remove outro membro da família. Só o dono pode. O removido recebe uma família pessoal nova, igual a quem usa `/sair` por conta própria.

**Exemplo:** `DELETE /api/familia/membros/2`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 403 | "Só o dono da família pode remover membros" | Quem chamou é `"membro"` |
| 400 | "Use \"sair da família\" para remover a si mesmo" | `:usuarioId` é o próprio usuário logado |
| 404 | "Membro não encontrado" | `:usuarioId` não é membro desta família |

---

## 🤝 Rotas de Grupos

> Todas as rotas abaixo são 🔒 — requerem JWT.
>
> Grupo é **arquiteturalmente diferente** de Família: um `Usuario` pode pertencer a vários grupos ao mesmo tempo (diferente de família, que é sempre uma só), e um grupo serve pra dividir despesas pontuais entre pessoas — estilo Splitwise, não uma carteira compartilhada. Por isso nenhuma rota de grupo filtra por `familiaId`; a posse é sempre resolvida por `GrupoMembro` (a tabela de associação usuário↔grupo), checada em cada rota através de `:id` de grupo.
>
> Um `GrupoMembro` pode ser um **convidado sem conta** no GeldTrack: nesse caso `usuarioId` é `null` e `nomeConvidado` guarda o nome digitado por quem adicionou (útil pra dividir uma despesa com alguém que não quer criar conta). Um membro (registrado ou convidado) tem um `papel`: `"admin"` (pode remover membros e excluir o grupo) ou `"membro"` (lança despesa, quita pagamento, adiciona convidado).
>
> O saldo "quem deve quem" (`saldos`, retornado por `GET /grupos/:id`) **nunca é persistido** — é recalculado a cada leitura a partir de todas as `DespesaGrupo` (com o rateio em `DivisaoDespesa`) menos todos os `PagamentoGrupo` já registrados. Para cada despesa, quem pagou (`pagoPorMembroId`) é credor de cada participante do rateio pelo valor devido (`divisoes[].valorDevido`); um `PagamentoGrupo` registra uma quitação feita **fora do app** (Pix, dinheiro...) e abate esse saldo na mesma proporção, com sinal invertido. O cálculo acumula em centavos (não em ponto flutuante) para não sofrer drift ao longo de muitas despesas, e não há simplificação de dívida nesta fase — se A deve a B e B deve a C, isso aparece como duas arestas separadas, não uma só.
>
> Um membro com qualquer despesa ou pagamento associado (como pagador, participante, ou como quem pagou/recebeu uma quitação) não pode ser removido nem sair sozinho — perderia o histórico de quem gastou/pagou o quê. Seria preciso excluir/editar essas despesas e pagamentos primeiro, ou excluir o grupo inteiro.

---

### GET /grupos 🔒

Lista os grupos em que o usuário logado é membro (via `GrupoMembro`, nunca via `familiaId`).

**Resposta 200 OK:**
```json
[
  {
    "id": 1,
    "nome": "Viagem Rio 2026",
    "codigo": "GR7X2K",
    "criadorUsuarioId": 1,
    "createdAt": "2026-05-01T08:00:00.000Z",
    "membros": [
      { "id": 1, "usuarioId": 1, "nome": "Jefferson Fidelis", "email": "jefferson@email.com", "foto": null, "papel": "admin", "isConvidado": false },
      { "id": 2, "usuarioId": null, "nome": "Ana (amiga)", "email": null, "foto": null, "papel": "membro", "isConvidado": true }
    ],
    "papel": "admin",
    "totalMembros": 2
  }
]
```

---

### GET /grupos/:id 🔒

Detalhe de um grupo: membros, despesas, pagamentos e o saldo "quem deve quem" calculado na hora.

**Exemplo:** `GET /api/grupos/1`

**Resposta 200 OK:**
```json
{
  "id": 1,
  "nome": "Viagem Rio 2026",
  "codigo": "GR7X2K",
  "criadorUsuarioId": 1,
  "createdAt": "2026-05-01T08:00:00.000Z",
  "membros": [
    { "id": 1, "usuarioId": 1, "nome": "Jefferson Fidelis", "email": "jefferson@email.com", "foto": null, "papel": "admin", "isConvidado": false },
    { "id": 2, "usuarioId": null, "nome": "Ana (amiga)", "email": null, "foto": null, "papel": "membro", "isConvidado": true }
  ],
  "despesas": [
    {
      "id": 1,
      "grupoId": 1,
      "descricao": "Hospedagem Airbnb",
      "valorTotal": 600.00,
      "data": "2026-05-02",
      "pagoPorMembroId": 1,
      "criadoPorUsuarioId": 1,
      "createdAt": "2026-05-02T09:00:00.000Z",
      "divisoes": [
        { "membroId": 1, "valorDevido": 300.00 },
        { "membroId": 2, "valorDevido": 300.00 }
      ]
    }
  ],
  "pagamentos": [],
  "saldos": [
    { "deMembroId": 2, "paraMembroId": 1, "valor": 300.00 }
  ]
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Grupo não encontrado" | `:id` não existe ou o usuário logado não é membro dele (mesmo 404 para os dois casos, para não vazar a existência do grupo) |

---

### POST /grupos 🔒

Cria um grupo novo. Quem cria já entra como `admin`.

**Body:**
```json
{ "nome": "Viagem Rio 2026" }
```

**Resposta 201 Created:**
```json
{
  "id": 1,
  "nome": "Viagem Rio 2026",
  "codigo": "GR7X2K",
  "criadorUsuarioId": 1,
  "createdAt": "2026-05-01T08:00:00.000Z",
  "membros": [ { "id": 1, "usuarioId": 1, "nome": "Jefferson Fidelis", "email": "jefferson@email.com", "foto": null, "papel": "admin", "isConvidado": false } ],
  "papel": "admin",
  "totalMembros": 1
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Nome do grupo é obrigatório" | Campo faltando |
| 400 | "Nome muito longo (máximo 60 caracteres)" | `nome` acima do limite |

---

### POST /grupos/entrar 🔒

Entra em um grupo existente usando o código dele. Diferente de `POST /familia/entrar`, isso **nunca** mexe em nada do `Usuario` — só cria uma nova linha de `GrupoMembro`, já que um usuário pode estar em vários grupos ao mesmo tempo.

**Body:**
```json
{ "codigo": "GR7X2K" }
```

**Resposta 201 Created:** o grupo, no mesmo formato do POST /grupos, com `papel: "membro"`.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "Código é obrigatório" | Campo faltando |
| 404 | "Código de grupo inválido" | Nenhum grupo com esse código |
| 400 | "Você já é membro deste grupo" | Usuário já tem um `GrupoMembro` nesse grupo |

---

### POST /grupos/:id/convidados 🔒

Adiciona um convidado sem conta ao grupo. Qualquer membro pode (ação de baixo risco, não é restrita a admin).

**Exemplo:** `POST /api/grupos/1/convidados`

**Body:**
```json
{ "nomeConvidado": "Ana (amiga)" }
```

**Resposta 201 Created:**
```json
{ "id": 2, "usuarioId": null, "nome": "Ana (amiga)", "email": null, "foto": null, "papel": "membro", "isConvidado": true }
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Grupo não encontrado" | `:id` não existe ou usuário não é membro dele |
| 400 | "Nome do convidado é obrigatório" | Campo faltando |
| 400 | "Nome muito longo (máximo 60 caracteres)" | `nomeConvidado` acima do limite |

---

### POST /grupos/:id/sair 🔒

Sai do grupo. Só usuário de verdade chama isso (convidado não se autogerencia). Se for o último `admin` restante e sobrar gente, promove automaticamente o membro mais antigo restante a admin.

**Exemplo:** `POST /api/grupos/1/sair`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Grupo não encontrado" | `:id` não existe ou usuário não é membro dele |
| 400 | "Você é o único membro deste grupo — exclua o grupo em vez de sair" | Só sobra esse membro |
| 400 | "Você tem despesas ou pagamentos registrados neste grupo e não pode sair — peça pra um admin excluir o grupo, ou edite/exclua suas despesas e pagamentos primeiro" | Membro tem atividade associada |

---

### DELETE /grupos/:id/membros/:membroId 🔒

Remove um membro (registrado ou convidado) do grupo. Só admin pode, e não pode mirar a si mesmo (usar `/sair` nesse caso).

**Exemplo:** `DELETE /api/grupos/1/membros/2`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Grupo não encontrado" | `:id` não existe ou usuário não é membro dele |
| 403 | "Só um admin pode remover membros" | Quem chamou não é admin |
| 400 | "Use \"sair do grupo\" para remover a si mesmo" | `:membroId` é o próprio membro de quem chamou |
| 404 | "Membro não encontrado" | `:membroId` não existe neste grupo |
| 400 | "Este membro tem despesas ou pagamentos registrados neste grupo e não pode ser removido" | Membro-alvo tem atividade associada |

---

### DELETE /grupos/:id 🔒

Exclui o grupo inteiro — despesas, divisões e pagamentos são apagados antes, explicitamente, para a cascata de membros rodar limpa (as foreign keys de `pagoPor`/`divisoes.membro`/`pagamentos.de/para` são `Restrict`, não `Cascade`). Só admin pode.

**Exemplo:** `DELETE /api/grupos/1`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Grupo não encontrado" | `:id` não existe ou usuário não é membro dele |
| 403 | "Só um admin pode excluir o grupo" | Quem chamou não é admin |

---

### POST /grupos/:id/despesas 🔒

Registra uma despesa do grupo, dividida **igualmente** entre os participantes escolhidos (não precisa ser o grupo inteiro). Qualquer membro pode lançar.

**Exemplo:** `POST /api/grupos/1/despesas`

**Body:**
```json
{
  "descricao": "Hospedagem Airbnb",
  "valorTotal": 600.00,
  "data": "2026-05-02",
  "pagoPorMembroId": 1,
  "participanteIds": [1, 2]
}
```

**Resposta 201 Created:**
```json
{
  "id": 1,
  "grupoId": 1,
  "descricao": "Hospedagem Airbnb",
  "valorTotal": 600.00,
  "data": "2026-05-02",
  "pagoPorMembroId": 1,
  "criadoPorUsuarioId": 1,
  "createdAt": "2026-05-02T09:00:00.000Z",
  "divisoes": [
    { "membroId": 1, "valorDevido": 300.00 },
    { "membroId": 2, "valorDevido": 300.00 }
  ]
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Grupo não encontrado" | `:id` não existe ou usuário não é membro dele |
| 400 | "Descrição é obrigatória" | Campo faltando |
| 400 | "Valor deve ser maior que zero" | `valorTotal` ausente ou ≤ 0 |
| 400 | "Data deve estar no formato YYYY-MM-DD" | `data` inválida |
| 400 | "Selecione quem pagou a despesa" | `pagoPorMembroId` ausente/inválido |
| 400 | "Selecione ao menos um participante" | `participanteIds` vazio ou ausente |
| 400 | "Um participante não pode aparecer duas vezes" | Id repetido em `participanteIds` |
| 400 | "Pagador não é membro deste grupo" / "Um ou mais participantes não são membros deste grupo" | IDOR: id de membro que não pertence a este grupo |

---

### PUT /grupos/:id/despesas/:despesaId 🔒

Edita uma despesa — substitui completamente descrição, valor, data, pagador e divisões. Só quem criou a despesa ou um admin do grupo pode.

**Exemplo:** `PUT /api/grupos/1/despesas/1`

**Body:** mesmo formato do POST.

**Resposta 200 OK:** a despesa atualizada, mesmo formato do POST.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Grupo não encontrado" | `:id` não existe ou usuário não é membro dele |
| 404 | "Despesa não encontrada" | `:despesaId` não existe neste grupo |
| 403 | "Só quem criou a despesa ou um admin do grupo pode editá-la" | Quem chamou não é o criador nem admin |
| 400 | (mesmas mensagens de validação do POST) | Campos inválidos |

---

### DELETE /grupos/:id/despesas/:despesaId 🔒

Exclui uma despesa. Mesma regra de permissão da edição.

**Exemplo:** `DELETE /api/grupos/1/despesas/1`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Grupo não encontrado" / "Despesa não encontrada" | `:id`/`:despesaId` inválidos |
| 403 | "Só quem criou a despesa ou um admin do grupo pode excluí-la" | Sem permissão |

---

### POST /grupos/:id/pagamentos 🔒

Registra uma quitação: `deMembroId` pagou `paraMembroId` **fora do app** (Pix, dinheiro...). Isso abate o saldo calculado, na mesma proporção. Qualquer membro pode registrar. Não existe rota de edição — é uma ação atômica tipo "marquei como pago"; para corrigir, exclui e registra de novo.

**Exemplo:** `POST /api/grupos/1/pagamentos`

**Body:**
```json
{
  "deMembroId": 2,
  "paraMembroId": 1,
  "valor": 300.00,
  "data": "2026-05-10"
}
```

**Resposta 201 Created:**
```json
{
  "id": 1,
  "grupoId": 1,
  "deMembroId": 2,
  "paraMembroId": 1,
  "valor": 300.00,
  "data": "2026-05-10",
  "criadoPorUsuarioId": 1,
  "createdAt": "2026-05-10T14:00:00.000Z"
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Grupo não encontrado" | `:id` não existe ou usuário não é membro dele |
| 400 | "Selecione quem pagou" / "Selecione quem recebeu" | `deMembroId`/`paraMembroId` ausente |
| 400 | "Quem pagou e quem recebeu não podem ser a mesma pessoa" | `deMembroId` === `paraMembroId` |
| 400 | "Valor deve ser maior que zero" | `valor` ausente ou ≤ 0 |
| 400 | "Data deve estar no formato YYYY-MM-DD" | `data` inválida |
| 400 | "Quem pagou não é membro deste grupo" / "Quem recebeu não é membro deste grupo" | IDOR: id de membro de outro grupo |

---

### DELETE /grupos/:id/pagamentos/:pagamentoId 🔒

Desfaz uma quitação lançada errado. Mesma regra de permissão da exclusão de despesa (quem registrou, ou admin).

**Exemplo:** `DELETE /api/grupos/1/pagamentos/1`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Grupo não encontrado" / "Pagamento não encontrado" | `:id`/`:pagamentoId` inválidos |
| 403 | "Só quem registrou o pagamento ou um admin do grupo pode excluí-lo" | Sem permissão |

---

## 💱 Rotas de Câmbio

> Todas as rotas abaixo são 🔒 — requerem JWT.
> Cotação de câmbio é dado de mercado global, não específico de uma família — o rate limit existe só para não abusar da API externa gratuita usada por baixo (`open.er-api.com`), não por uma questão de posse de dado. Usado tanto no seletor de moeda ao criar uma Conta quanto no painel de cotações da tela de Contas, para converter contas em moedas diferentes a um total comum (ver `porMoeda` em `GET /reports/balance`).

---

### GET /cambio 🔒

Lista as moedas suportadas e a cotação atual de cada uma (para BRL).

**Resposta 200 OK:**
```json
{
  "moedas": [
    { "codigo": "BRL", "simbolo": "R$", "nome": "Real" },
    { "codigo": "USD", "simbolo": "US$", "nome": "Dólar americano" },
    { "codigo": "EUR", "simbolo": "€", "nome": "Euro" },
    { "codigo": "GBP", "simbolo": "£", "nome": "Libra esterlina" }
  ],
  "taxas": {
    "USD": 5.42,
    "EUR": 5.85,
    "GBP": 6.87
  }
}
```

---

### POST /cambio/atualizar 🔒

Busca a cotação atual na API pública gratuita `open.er-api.com` (sem chave) e atualiza as taxas salvas para as moedas suportadas diferentes de BRL. Ação manual — botão "Atualizar cotações" no frontend, sem nenhum cron rodando no servidor. Limitado a 20 chamadas por hora por usuário.

**Resposta 200 OK:** mesmo formato do `GET /cambio`, já com as taxas atualizadas.

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 429 | "Muitas atualizações de cotação. Tente novamente mais tarde." | Mais de 20 chamadas na última hora |
| 502 | "Não foi possível buscar a cotação agora. Tente novamente mais tarde." | API externa fora do ar ou respondeu algo inesperado |

---

## 🏛️ Rotas de Open Finance

> Sincronização automática de contas bancárias reais via [Pluggy](https://pluggy.ai/) (Open Finance). O GeldTrack **nunca guarda credenciais bancárias nem tokens de acesso ao banco** — a Pluggy cuida disso inteiramente do lado dela; o backend só guarda o `pluggyItemId` (identificador da conexão) e, depois de sincronizada, o `pluggyAccountId`/`pluggyTransactionId` de cada conta/transação importada, usados só para não duplicar dados numa sincronização seguinte.
>
> Todas as rotas abaixo são 🔒, **exceto `POST /open-finance/webhook`**: essa é chamada pelos servidores da Pluggy diretamente, não por um usuário logado, então não tem (nem poderia ter) o JWT de ninguém. Ela fica registrada antes do `authMiddleware` no router por esse motivo. Sem uma URL pública configurada (não funciona com `localhost` em desenvolvimento), o webhook nunca é chamado — o botão "Sincronizar agora" (`POST /conexoes/:id/sincronizar`) cobre o mesmo fluxo manualmente.

---

### POST /open-finance/webhook

Endpoint chamado pela Pluggy quando o status de uma conexão muda (ex: uma sincronização terminou do lado deles). Não usa JWT — a rota confia no evento recebido e resolve a conexão pelo `itemId` enviado no corpo.

**Body (enviado pela Pluggy):**
```json
{
  "event": "item/updated",
  "itemId": "b3e1a4b0-1234-4c56-9abc-1234567890ab"
}
```

**Resposta:** sempre `200 OK`, mesmo em caso de erro interno — um erro nosso não deve fazer a Pluggy reentregar o mesmo webhook em loop. Qualquer problema fica só registrado no log do servidor.

---

### POST /open-finance/connect-token 🔒

Gera o token de conexão que o widget "Pluggy Connect" usa no frontend para abrir o fluxo de login no banco do usuário.

**Resposta 200 OK:**
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRVc2VySWQiOiIxIn0..." }
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 500 | "Erro ao gerar token de conexão com o banco" | Falha na API da Pluggy |

---

### POST /open-finance/conexoes 🔒

Registra a conexão bancária depois que o widget termina (callback `onSuccess` no frontend) e já dispara a primeira sincronização (importa as contas e até 90 dias de transações).

**Body:**
```json
{ "pluggyItemId": "b3e1a4b0-1234-4c56-9abc-1234567890ab" }
```

**Resposta 201 Created:**
```json
{
  "id": 1,
  "nomeConector": "Banco Exemplo",
  "status": "UPDATED",
  "contasAtualizadas": 2,
  "transacoesImportadas": 47
}
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 400 | "pluggyItemId é obrigatório" | Campo faltando |
| 500 | "Erro ao registrar a conexão bancária" | Falha ao buscar o item na Pluggy ou ao sincronizar |

---

### GET /open-finance/conexoes 🔒

Lista as conexões bancárias da família, com as contas do GeldTrack já vinculadas a cada uma.

**Resposta 200 OK:**
```json
[
  {
    "id": 1,
    "nomeConector": "Banco Exemplo",
    "status": "UPDATED",
    "erro": null,
    "ultimaSincronizacao": "2026-05-20T08:00:00.000Z",
    "contas": [ { "id": 4, "nome": "Conta corrente" } ]
  }
]
```

---

### POST /open-finance/conexoes/:id/sincronizar 🔒

Sincronização manual — usada no botão "Sincronizar agora" (e o único jeito de sincronizar em desenvolvimento local, já que o webhook exige uma URL pública). Importa contas novas e transações desde a última sincronização (ou os últimos 90 dias, se for a primeira vez). Idempotente: contas são casadas por `pluggyAccountId`, transações por `pluggyTransactionId` (`skipDuplicates`), então rodar de novo não duplica nada.

**Exemplo:** `POST /api/open-finance/conexoes/1/sincronizar`

**Resposta 200 OK:**
```json
{ "status": "UPDATED", "contasAtualizadas": 2, "transacoesImportadas": 3 }
```

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Conexão não encontrada" | `:id` não existe ou não pertence à família |
| 500 | "Erro ao sincronizar com o banco" | Falha na API da Pluggy |

---

### DELETE /open-finance/conexoes/:id 🔒

Remove a conexão bancária. As contas e transações já importadas por ela **permanecem** no GeldTrack como histórico — só param de ser atualizadas automaticamente.

**Exemplo:** `DELETE /api/open-finance/conexoes/1`

**Resposta 204 No Content**

**Erros possíveis:**
| Código | Mensagem | Causa |
|--------|----------|-------|
| 404 | "Conexão não encontrada" | `:id` não existe ou não pertence à família |

---

## Como testar os endpoints manualmente

Você pode testar a API diretamente no terminal com `curl`, ou usar ferramentas como **Insomnia** ou **Postman**.

**Exemplo com curl:**
```bash
# Cadastrar
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","email":"teste@test.com","senha":"123456"}'

# Usar o token retornado para listar transações
curl http://localhost:3001/api/transactions \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```
