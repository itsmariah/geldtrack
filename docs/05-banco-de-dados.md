# 05 — Banco de Dados (PostgreSQL + Prisma)

## O que é um banco de dados?

Um banco de dados é onde as informações ficam **salvas de forma permanente**. Sem ele, os dados sumiriam toda vez que o servidor fosse reiniciado.

Exemplos de dados que persistimos no GeldTrack:
- Usuários cadastrados (nome, e-mail, senha) e a família (carteira compartilhada) de cada um
- Transações financeiras (tipo, valor, categoria, data)
- Metas, orçamentos, recorrências, contas, eventos, grupos de despesas compartilhadas...

---

## Por que PostgreSQL?

O projeto começou com **SQLite** (um arquivo `.db` local, zero configuração — ótimo pra prototipar). Ele foi trocado por **PostgreSQL** quando o projeto passou a precisar rodar em produção de verdade:

| Motivo | Explicação |
|--------|-----------|
| **Hospedagem em nuvem** | O backend roda no Render, que não garante um disco persistente entre deploys — um arquivo `.db` local se perderia. Postgres roda como um serviço à parte (usamos o [Neon](https://neon.com), gratuito). |
| **Concorrência real** | Múltiplos usuários (e, com "modo família", múltiplas pessoas na mesma carteira) escrevendo ao mesmo tempo — SQLite trava o arquivo inteiro em cada escrita, Postgres não. |
| **Tipos mais ricos** | `Decimal` com precisão fixa para valores em dinheiro (evita o erro de arredondamento de `Float`), `Json` para o histórico de edição de transações. |
| **Ainda simples de rodar localmente** | Um container Docker (`docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`) ou uma instância gratuita na nuvem bastam — ver [02-como-rodar.md](./02-como-rodar.md). |

---

## O que é o Prisma?

O **Prisma** é um **ORM** (Object-Relational Mapper). Em termos simples: é uma camada que traduz código JavaScript em comandos SQL.

### Sem Prisma (SQL puro):
```js
db.query("SELECT * FROM transacoes WHERE familia_id = ? AND tipo = ?", [familiaId, 'despesa'])
```

### Com Prisma:
```js
prisma.transacao.findMany({
  where: { familiaId, tipo: 'despesa' }
})
```

O Prisma é mais legível, evita erros de digitação em SQL e tem **autocomplete** no editor.

### Por que não usar SQL puro?

Para um projeto simples o SQL puro funcionaria. Mas o Prisma oferece:
- **Type safety**: erros de campo são pegos em tempo de desenvolvimento
- **Migrations**: controle de versão do banco (ver `backend/prisma/migrations/`)
- **Escritas aninhadas e `$transaction`**: criar um registro e seus relacionados numa escrita atômica só, sem SQL manual (exemplos mais abaixo)

---

## Arquivo: `backend/prisma/schema.prisma`

Este arquivo define a estrutura do banco inteiro — é o "projeto" das tabelas. Trecho reduzido (dois modelos, pra ilustrar a sintaxe — o arquivo real tem 17 modelos):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")   // string de conexão do Postgres, nunca hardcoded
}

model Usuario {
  id         Int         @id @default(autoincrement())
  nome       String
  email      String      @unique   // Não pode ter dois e-mails iguais
  senha      String
  familiaId  Int
  familia    Familia     @relation(fields: [familiaId], references: [id], onDelete: Restrict)
  createdAt  DateTime    @default(now())
  transacoes Transacao[]           // Relacionamento: um usuário tem muitas transações
}

model Transacao {
  id        Int      @id @default(autoincrement())
  usuarioId Int                        // Quem lançou (atribuição, não controle de acesso)
  familiaId Int                        // Quem PODE VER/EDITAR (a carteira compartilhada)
  tipo      String                     // 'receita' ou 'despesa'
  valor     Decimal  @db.Decimal(12, 2) // Precisão fixa, sem ruído de ponto flutuante
  categoria String
  data      String                     // Formato: "YYYY-MM-DD"
  usuario   Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  familia   Familia  @relation(fields: [familiaId], references: [id], onDelete: Cascade)
}
```

### Explicação dos tipos:
| Tipo Prisma | Equivalente SQL (Postgres) | Exemplo |
|-------------|-----------------------------|---------|
| `Int` | INTEGER | 1, 2, 3... |
| `String` | TEXT | "Jefferson" |
| `Decimal` `@db.Decimal(12, 2)` | NUMERIC(12,2) | 150.50 — usado pra **todo valor em dinheiro**, nunca `Float` (ponto flutuante binário não representa centavos com exatidão) |
| `Boolean` | BOOLEAN | true, false |
| `Json` | JSONB | `{ "campo": "valor", "de": 100, "para": 150 }` |
| `DateTime` | TIMESTAMP | 2026-05-21T10:00:00Z |
| `@id` | PRIMARY KEY | — |
| `@default(autoincrement())` | GENERATED ALWAYS AS IDENTITY | ID gerado automaticamente |
| `@unique` | UNIQUE | Valor único na tabela |
| `@@unique([a, b])` | UNIQUE composto | Par de colunas único (ex: não repetir categoria dentro da mesma família) |
| `@default(now())` | DEFAULT now() | Data/hora atual |
| `Tipo?` (interrogação) | coluna nullable | Campo opcional |

---

## Migrations

Uma migration é um arquivo `.sql` gerado pelo Prisma que registra **uma mudança no schema ao longo do tempo**. Ficam em `backend/prisma/migrations/`, uma pasta por mudança, na ordem em que foram criadas — assim todo ambiente (sua máquina, o Render em produção) aplica exatamente a mesma sequência.

```bash
# Cria uma migration nova a partir do que mudou em schema.prisma, e já aplica localmente
npx prisma migrate dev --name nome_da_migration

# Aplica migrations pendentes sem gerar uma nova (usado em produção, no deploy)
npx prisma migrate deploy

# Regenerar o cliente Prisma (após mudar o schema)
npx prisma generate

# Visualizar o banco no navegador (interface gráfica)
npx prisma studio

# Ver o estado atual das migrations
npx prisma migrate status
```

Duas mudanças de schema já passaram por esse projeto vale a pena conhecer como precedente:

- **Nullable-first pra colunas obrigatórias em tabela com dados reais**: ao introduzir `familiaId` nas 8 tabelas financeiras, a coluna nasceu opcional (`Int?`), um script (`backend/scripts/backfillFamilias.js`) preencheu o valor de cada linha existente, e só depois uma segunda migration apertou pra `NOT NULL`. Migrar direto pra obrigatório numa tabela com linhas antigas sem valor quebraria o deploy.
- **Cuidado com a ordem cronológica das pastas de migration**: o nome da pasta (`20260908185739_add_familia_nullable`) é um timestamp — se duas migrations forem criadas com relógios fora de sincronia, elas podem ser aplicadas fora de ordem. Sempre conferir com `ls backend/prisma/migrations/` que a pasta nova ordena depois da anterior.

---

## O modelo de dados, em duas camadas

O GeldTrack tem dois jeitos diferentes de "várias pessoas compartilharem dados", e é fácil confundir os dois:

### 1. Família — a carteira compartilhada (a maioria das tabelas)

Todo `Usuario` pertence a **exatamente uma** `Familia`, sempre (sem seletor de workspace, sem multi-família). Ao se cadastrar, o usuário ganha uma família pessoal automática; ele pode entrar na família de outra pessoa depois com um código curto (`POST /api/familia/entrar`) — isso troca a família ativa, não soma as duas.

`Categoria`, `Transacao`, `Conta`, `ConexaoBancaria`, `Transferencia`, `Recorrencia`, `Meta`, `Orcamento` e `Evento` guardam **os dois campos ao mesmo tempo**:

- `familiaId` — a chave de **acesso/visibilidade**. Toda consulta de listagem e toda checagem antes de editar/apagar filtra por `familiaId`, nunca por `usuarioId`. Qualquer pessoa da família pode editar ou apagar o que qualquer outra pessoa da família lançou — é uma carteira genuinamente compartilhada, não partições por pessoa.
- `usuarioId` — pura **atribuição** ("quem lançou isso"), exibida na interface como "por {nome}" quando é diferente de quem está vendo. Não controla acesso.

```
Familia "Casa"                    Transacao
┌────┬───────┐                   ┌────┬───────────┬───────────┬──────────┐
│ id │ nome  │                   │ id │ familiaId │ usuarioId │ tipo     │
├────┼───────┤              1:N  ├────┼───────────┼───────────┼──────────┤
│  1 │ Casa  │─────────────────► │  1 │     1     │     3     │ receita  │ ← lançada por Mariah
└────┴───────┘                   │  2 │     1     │     4     │ despesa  │ ← lançada por Jefferson
                                  └────┴───────────┴───────────┴──────────┘
                                  Os dois veem e podem editar as duas — mesma família.
```

### 2. Grupos — divisão de despesas estilo Splitwise (Grupo, GrupoMembro, DespesaGrupo, DivisaoDespesa, PagamentoGrupo)

Arquiteturalmente **diferente** de Família: um `Usuario` pode pertencer a **vários** `Grupo`s ao mesmo tempo (não só um), e um grupo pode incluir gente sem conta no GeldTrack — um `GrupoMembro` com `usuarioId` nulo e só um `nomeConvidado`. Não existe `familiaId` em nenhuma tabela de grupo.

O saldo "quem deve quem" nunca é uma coluna guardada — é sempre recalculado na leitura (`backend/utils/calcularSaldosGrupo.js`) a partir de duas fontes:
- `DespesaGrupo` + `DivisaoDespesa`: uma despesa paga por um membro, dividida entre os participantes escolhidos.
- `PagamentoGrupo`: uma quitação registrada entre dois membros ("de" pagou "para" fora do app), que abate o saldo calculado.

`Restrict` é usado nas referências a `GrupoMembro` em `DespesaGrupo.pagoPor`, `DivisaoDespesa.membro` e `PagamentoGrupo.de/para` de propósito: um membro que já participou de alguma despesa ou pagamento não pode ser removido do grupo, pra nunca perder esse histórico.

### `onDelete`: os três comportamentos usados no projeto

| Comportamento | O que faz | Onde é usado e por quê |
|----------------|-----------|--------------------------|
| `Cascade` | Apaga os registros filhos junto | `Transacao.familia` — apagar uma família apaga suas transações. Relação forte, dado não faz sentido sem o pai. |
| `SetNull` | Zera a referência, mantém o registro filho | `Transacao.recorrencia`/`Transacao.evento` — apagar a regra de recorrência ou o evento não deve apagar as transações já lançadas a partir dele, só desvincular. |
| `Restrict` | Impede o delete enquanto existir referência | `DespesaGrupo.pagoPor`, `PagamentoGrupo.de/para`, `Usuario.familia` — protege histórico financeiro/de auditoria contra remoção acidental. |

---

## Referência dos modelos

Agrupados por área, na mesma ordem do `schema.prisma`.

### Identidade e família

**Usuario**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| nome, email (único), senha | String | Dados de login — senha com hash bcrypt |
| foto | String? | Foto de perfil (base64), opcional |
| resetTokenHash, resetTokenExpiresAt | String?, DateTime? | Token de redefinição de senha (hash sha256), opcional |
| tokenVersion | Int | Incrementado ao trocar a senha — invalida tokens JWT antigos |
| familiaId | Int (FK) | A família ativa deste usuário — sempre exatamente uma |
| papelFamilia | String | `"dono"` ou `"membro"` — dono remove membros, renomeia a família, regenera o código |

**Familia**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| nome | String | Nome da carteira (ex: "Casa", ou o nome de quem criou) |
| codigo | String (único) | Código curto pra outra pessoa entrar (`POST /api/familia/entrar`) |

### Categorias e transações (o núcleo)

**Categoria** — metadados de exibição (ícone/cor); NÃO é FK de `Transacao` (que guarda categoria como texto livre) — evita qualquer migração em dado real. `@@unique([familiaId, nome, tipo])`.

**Transacao**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | Int (PK) | Identificador único |
| usuarioId, familiaId | Int (FK) | Atribuição / escopo (ver seção acima) |
| tipo | String | `receita` ou `despesa` |
| valor | Decimal(12,2) | Valor exato, sem ruído de ponto flutuante |
| categoria, descricao, data | String | Categoria (texto livre), descrição opcional, data YYYY-MM-DD |
| contaId | Int (FK) | Conta à qual pertence (obrigatório) |
| recorrenciaId | Int? (FK, SetNull) | Se veio de uma recorrência materializada |
| eventoId | Int? (FK, SetNull) | Etiqueta opcional pra um Evento (ex: viagem) |
| despesaGrupoId | Int? (FK, SetNull) | Preenchido quando veio de "Adicionar despesas ao dashboard" num Grupo — `@@unique([despesaGrupoId, usuarioId])` impede importar a mesma despesa duas vezes pro mesmo usuário |
| moedaOriginal, valorOriginal, taxaConversao, dataCotacao | String?, Decimal(12,2)?, Decimal(12,6)?, String? | Só quando o valor foi convertido de outra moeda (ex: parte de uma despesa de grupo em US$ lançada numa conta em R$). `valor` continua na moeda da conta; estes campos registram a origem ("US$ 20,00 (R$ 103,62 de acordo com a cotação de 30/09/2026)"). `dataCotacao` nula = câmbio informado pelo usuário. Editar valor/conta à mão apaga os quatro |
| pluggyTransactionId | String? (único) | Preenchido só em transações sincronizadas via Open Finance — evita duplicar num novo sync |
| anexo, anexoNome | String? | Comprovante anexado (data URL base64) — nunca vem na listagem, só via `GET /transactions/:id/anexo` |
| updatedAt | DateTime | Atualizado a cada `update()` — sinaliza "editada" na lista |

**TransacaoHistorico** — um registro por edição que muda algum campo financeiro; `alteracoes` (Json) é a lista de `{ campo, de, para }` daquela edição. Trocar só o anexo não gera histórico (evita base64 acumulando aqui).

### Contas, transferências e Open Finance

**Conta** — carteira/conta corrente/cartão do usuário. `saldoInicial` + receitas − despesas ± transferências = saldo exibido (nunca persistido). `moeda` (default `BRL`) é fixada na criação e nunca muda depois — trocar a moeda de uma conta com transações já lançadas corromperia a leitura do histórico. `instituicao` (String?, editável) é só visual: contas com a mesma instituição aparecem agrupadas em Contas — é como uma conta com várias moedas (Wise, Nomad...) é representada: uma `Conta` por moeda, todas com a mesma instituição.

**ConexaoBancaria** — uma conexão Open Finance (Pluggy), que pode alimentar mais de uma `Conta` (ex: conta corrente + cartão do mesmo banco). Guarda só o `pluggyItemId` — nenhuma senha/token de acesso ao banco.

**Transferencia** — movimento entre duas `Conta`s do mesmo usuário. Nunca gera `Transacao` (não é receita nem despesa de verdade), então não entra nos relatórios de receita/despesa, só no saldo de cada conta. `valor` está sempre na moeda da origem; `valorDestino` (Decimal?, nulo na mesma moeda) guarda quanto chegou quando as contas têm moedas diferentes — a entrada no saldo do destino usa `valorDestino ?? valor`.

### Automação

**Recorrencia** — regra mensal (aluguel, assinatura, salário). As ocorrências não nascem aqui: são materializadas como `Transacao` normais sob demanda (`backend/utils/materializeRecorrencias.js`), sempre que a tela de recorrências ou a lista de transações é acessada — sem depender de nenhum cron/job rodando no servidor.

### Metas e orçamento

**Meta** + **Aporte** — `valorAtual` de uma meta é sempre a soma dos `Aporte`s (contribuições manuais), nunca um campo redundante na `Meta` — evita os dois ficarem dessincronizados.

**Orcamento** — limite mensal fixo por categoria, vale todo mês até editar (não é um registro por mês). O gasto do mês é sempre calculado a partir de `Transacao`, nunca guardado aqui. `ultimaNotificacaoMes` (String, formato YYYY-MM) guarda o mês do último aviso por e-mail já enviado — evita reenviar a cada transação nova que continua estourando o mesmo orçamento no mês. `@@unique([familiaId, categoria])`.

### Eventos

**Evento** — etiqueta pra agrupar transações que já existem no dashboard normal (ex: "Viagem Rio 2026"), não um livro-caixa separado: gasto/recebido é sempre recalculado a partir das `Transacao`s vinculadas. `orcamento` (Decimal?) é um teto opcional vitalício (não mensal, diferente de `Orcamento`). `status` (`ativo`/`encerrado`) só tira o evento do seletor de novas transações, não desvincula as existentes. O campo `notificacaoEnviada` (Boolean) existe no schema para sinalizar um aviso por e-mail ao estourar o teto — mas nenhuma rota lê ou grava esse campo hoje; na prática só o badge visual "Orçamento estourado" (`EventoCard.jsx`/`EventoDetalhe.jsx`) funciona, diferente do orçamento mensal por categoria, que dispara e-mail de verdade.

### Grupos (divisão de despesas estilo Splitwise)

Ver a seção "O modelo de dados, em duas camadas" acima para a explicação arquitetural completa. Resumo dos campos:

**Grupo** — `codigo` (único, pra entrar), `criadorUsuarioId`.

**GrupoMembro** — `usuarioId` nulo = convidado sem conta (`nomeConvidado` preenchido). `papel` (`admin`/`membro`). `@@unique([grupoId, usuarioId])` — NULLs não colidem nessa constraint no Postgres, então vários convidados convivem no mesmo grupo.

**DespesaGrupo** + **DivisaoDespesa** — despesa paga por um `GrupoMembro` (`pagoPorMembroId`), dividida entre participantes; uma linha de `DivisaoDespesa` por participante (`valorDevido`), soma sempre igual a `valorTotal`. A linha do próprio pagador existe só pra fechar essa soma — o cálculo de saldo a ignora.

**PagamentoGrupo** — quitação registrada entre dois membros (`deMembroId` pagou `paraMembroId`, fora do app), que abate o saldo calculado.

**Moeda nos grupos** — `DespesaGrupo.moeda` e `PagamentoGrupo.moeda` (padrão `BRL`): cada despesa tem sua moeda, e o saldo "quem deve quem" é calculado separado por moeda, sem conversão. Uma dívida pode ser quitada em outra moeda: `PagamentoGrupo.moedaPagamento`/`valorPagamento` (opcionais) registram o que foi pago de fato, enquanto `valor`/`moeda` continuam sendo o que é abatido. Na importação pro dashboard, a parte de cada despesa vai pra uma conta da mesma moeda.

**Grupo → Dashboard** — "Adicionar despesas ao dashboard" cria uma `Transacao` por despesa em que o usuário participa, com `despesaGrupoId` apontando pra ela, valor = parte dele e a mesma data da despesa. Editar a despesa no grupo depois atualiza data/descrição/valor dessas transações. `SetNull`: excluir a despesa ou o grupo não apaga o que já foi pro dashboard.

### Câmbio

**TaxaCambio** — cotação de câmbio pra converter contas em moeda estrangeira num total consolidado em R$ (Dashboard/Relatórios). Global (sem `familiaId` — cotação é dado de mercado). Atualizada manualmente (botão "Atualizar cotações" em Contas, `POST /api/cambio/atualizar`), nunca por cron.

---

## Operações do Prisma nos arquivos de rota

### Criar
```js
await prisma.transacao.create({
  data: { usuarioId, familiaId, tipo, valor, categoria, descricao, data, contaId }
})
```

### Buscar um
```js
await prisma.usuario.findUnique({ where: { email } })
```

### Buscar muitos (com filtro)
```js
await prisma.transacao.findMany({
  where: { familiaId, tipo: 'despesa' },
  orderBy: { data: 'desc' }
})
```

### Atualizar
```js
await prisma.transacao.update({
  where: { id },
  data: { valor: 200, categoria: 'Saúde' }
})
```

### Deletar
```js
await prisma.transacao.delete({ where: { id } })
```

### Agrupar e somar
```js
await prisma.transacao.groupBy({
  by: ['tipo'],
  where: { familiaId },
  _sum: { valor: true }
})
// Retorna: [{ tipo: 'receita', _sum: { valor: 3000 } }, ...]
```

### Escrita aninhada (nested write)

Criar um registro e seus relacionados numa única chamada — o Prisma garante que é atômico, sem precisar de `$transaction` manual:
```js
// Cria o grupo e já cria o GrupoMembro admin do criador, numa escrita só
await prisma.grupo.create({
  data: {
    nome, codigo, criadorUsuarioId,
    membros: { create: { usuarioId: criadorUsuarioId, papel: 'admin' } },
  },
  include: { membros: true },
})
```

### Transação atômica (`$transaction`)

Quando é preciso rodar **mais de uma operação independente** que só faz sentido se todas derem certo juntas (não dá pra expressar como uma escrita aninhada), usa-se `$transaction`:
```js
// Excluir um grupo: apaga despesas e pagamentos primeiro (senão o Restrict acima barra
// a cascata dos membros), tudo dentro da mesma transação da exclusão do grupo
await prisma.$transaction([
  prisma.despesaGrupo.deleteMany({ where: { grupoId } }),
  prisma.pagamentoGrupo.deleteMany({ where: { grupoId } }),
  prisma.grupo.delete({ where: { id: grupoId } }),
])
```
Se qualquer uma das três falhar, nenhuma é aplicada.
