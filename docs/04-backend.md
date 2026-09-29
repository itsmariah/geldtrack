# 04 — Backend (Node.js + Express)

## O que é o backend?

O backend é o **servidor** da aplicação. Ele recebe as requisições do frontend, processa as regras de negócio, acessa o banco de dados e retorna as respostas.

No GeldTrack, o backend é uma **API REST** — um conjunto de "endereços" (endpoints) que o frontend chama para fazer operações.

---

## Tecnologias do backend

| Pacote | Função |
|--------|--------|
| `express` | Framework web — cria o servidor e gerencia as rotas |
| `@prisma/client` | ORM — interface para o banco de dados |
| `bcryptjs` | Criptografar senhas |
| `jsonwebtoken` | Gerar e verificar tokens JWT |
| `cors` | Permitir que o frontend acesse o backend |
| `dotenv` | Carregar variáveis de ambiente do arquivo `.env` |
| `nodemon` (dev) | Reinicia o servidor automaticamente ao salvar arquivos |

---

## Arquivo: `server.js`

É o ponto de entrada do backend. Toda requisição passa por aqui primeiro.

```
backend/server.js
```

```js
require('dotenv').config();       // Carrega variáveis do .env
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Permite que o frontend (localhost:5173) acesse o backend
app.use(cors({ origin: 'http://localhost:5173' }));

// Permite receber JSON no corpo das requisições
app.use(express.json());

// Registra as rotas
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportsRoutes);

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
```

### O que é o CORS?

CORS (Cross-Origin Resource Sharing) é uma política de segurança do navegador que, por padrão, bloqueia requisições entre domínios diferentes. Como o frontend está em `localhost:5173` e o backend em `localhost:3001` — portas diferentes — o navegador bloquearia a comunicação.

O `cors({ origin: 'http://localhost:5173' })` diz ao servidor: "pode aceitar requisições vindas de localhost:5173".

---

## Arquivo: `middleware/auth.js`

Middleware é um código que roda **entre** a chegada da requisição e o processamento da rota. O middleware de autenticação verifica se o usuário enviou um token JWT válido.

```
backend/middleware/auth.js
```

```js
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  // Authorization: Bearer eyJhbGci...
  //                         ↑ pega esse trecho

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;  // Injeta o ID do usuário na requisição
    next();                   // Passa para o próximo handler
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
```

### Como funciona na prática?

```
Requisição chega → authMiddleware verifica o token
                          ↓
              Token inválido?  →  retorna 401 (Não autorizado)
                          ↓
              Token válido?    →  injeta req.userId → continua para a rota
```

---

## Arquivo: `routes/auth.js`

Contém as rotas de autenticação: cadastro, login e edição de perfil.

### POST /api/auth/register (RF01)

```
1. Recebe: { nome, email, senha }
2. Valida: campos obrigatórios, senha >= 6 caracteres
3. Verifica: e-mail já existe?
4. Criptografa: bcrypt.hash(senha, 10)
5. Salva: novo usuário no banco
6. Retorna: { token, user: { id, nome, email } }
```

### POST /api/auth/login (RF02)

```
1. Recebe: { email, senha }
2. Busca: usuário pelo e-mail
3. Compara: bcrypt.compare(senha, hash_salvo)
4. Gera: token JWT com expiração de 7 dias
5. Retorna: { token, user: { id, nome, email } }
```

### PUT /api/auth/profile (RF03)

```
1. Requer: token JWT (middleware)
2. Recebe: { nome?, email?, senha? } (todos opcionais)
3. Valida: novo e-mail não conflita com outro usuário
4. Atualiza: apenas os campos enviados
5. Retorna: { id, nome, email }
```

---

## Arquivo: `routes/transactions.js`

Contém o CRUD completo de transações. **Todas as rotas requerem JWT.**

### GET /api/transactions (RF08 + RF10 + RF11)

Aceita filtros via query string:
```
?tipo=despesa
?categoria=Alimentação
?data_inicio=2026-05-01
?data_fim=2026-05-31
```

O código constrói a query dinamicamente:
```js
const where = { usuarioId: req.userId };  // Sempre filtra pelo usuário logado
if (tipo) where.tipo = tipo;
if (categoria) where.categoria = categoria;
if (data_inicio || data_fim) {
  where.data = {};
  if (data_inicio) where.data.gte = data_inicio;  // gte = greater than or equal
  if (data_fim) where.data.lte = data_fim;         // lte = less than or equal
}
```

### POST /api/transactions (RF04 / RF05)

```
1. Requer: tipo, valor, categoria, data
2. Valida: tipo é receita ou despesa?  valor > 0?
3. Cria: nova transação no banco vinculada ao usuário logado
4. Retorna: a transação criada (com id gerado)
```

### PUT /api/transactions/:id (RF06)

```
1. Busca: transação pelo id E pelo usuarioId (segurança)
2. Se não encontrar: retorna 404
3. Atualiza: todos os campos
4. Retorna: transação atualizada
```

### DELETE /api/transactions/:id (RF07)

```
1. Busca: transação pelo id E pelo usuarioId (segurança)
2. Se não encontrar: retorna 404
3. Deleta: do banco
4. Retorna: 204 No Content (sem corpo)
```

> **Por que buscar pelo usuarioId na edição/exclusão?**
> Para garantir que um usuário não consiga editar ou apagar transações de outro usuário, mesmo que adivinhe o ID.

---

## Arquivo: `routes/reports.js`

Contém endpoints de leitura/análise. Todos requerem JWT.

### GET /api/reports/balance (RF09)

Usa `groupBy` do Prisma para somar valores por tipo:
```js
const rows = await prisma.transacao.groupBy({
  by: ['tipo'],
  where: { usuarioId },
  _sum: { valor: true }
});
// Resultado: [{ tipo: 'receita', _sum: { valor: 3000 } }, ...]
```

### GET /api/reports/monthly?month=2026-05 (RF12)

Filtra transações do mês e calcula o resumo:
```js
where.data = { gte: '2026-05-01', lte: '2026-05-31' }
```

### GET /api/reports/categories (RF13)

Agrupa por categoria e tipo para alimentar o gráfico de pizza.

### GET /api/reports/evolution

Busca os últimos 6 meses de dados, somando receitas e despesas por mês. Usado no gráfico de barras da página de relatórios.

---

## Arquivo: `database/db.js`

Exporta uma instância do `PrismaClient` que é compartilhada por todos os arquivos:

```js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
module.exports = prisma
```

Por que uma instância única? Para não criar múltiplas conexões com o banco desnecessariamente.

---

## Arquivo: `.env`

Guarda variáveis de ambiente — configurações que **não devem ir para o Git** (como segredos e senhas).

```env
PORT=3001
JWT_SECRET=geldtrack_jwt_secret_mude_em_producao
FRONTEND_URL=http://localhost:5173
```

O `dotenv` carrega esse arquivo no início do `server.js`, tornando as variáveis disponíveis via `process.env.NOME_DA_VARIAVEL`.

> O `.env` está no `.gitignore` — cada desenvolvedor cria o seu. Em produção, essas variáveis são configuradas diretamente no servidor.

---

## Códigos HTTP usados

| Código | Significado | Quando usamos |
|--------|------------|---------------|
| 200 | OK | Requisição bem-sucedida (GET, PUT) |
| 201 | Created | Recurso criado com sucesso (POST) |
| 204 | No Content | Deletado com sucesso (DELETE) |
| 400 | Bad Request | Dados inválidos ou faltando |
| 401 | Unauthorized | Token ausente ou inválido |
| 404 | Not Found | Recurso não encontrado |
| 409 | Conflict | E-mail já cadastrado |
| 500 | Internal Server Error | Erro inesperado no servidor |
