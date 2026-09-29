# 06 — Autenticação (JWT + bcrypt)

## Por que precisamos de autenticação?

Sem autenticação, qualquer pessoa poderia acessar os dados financeiros de qualquer usuário. A autenticação garante que:

1. Apenas usuários cadastrados acessem o sistema
2. Cada usuário veja **apenas suas próprias** transações
3. As senhas fiquem protegidas mesmo se o banco de dados for comprometido

---

## bcrypt — Criptografia de senhas

### O problema com senhas em texto puro

Se guardarmos a senha `"minhasenha"` diretamente no banco, qualquer pessoa com acesso ao banco saberia a senha de todos os usuários.

### Como o bcrypt resolve isso

O bcrypt transforma a senha em um **hash** — uma sequência de caracteres aparentemente aleatória que é impossível de reverter.

```
Senha original:  minhasenha123
        ↓  bcrypt.hash(senha, 10)
Hash gerado:    $2b$10$X8J4k2mN...vQ8z3kL (60 caracteres)
```

### Propriedades importantes do bcrypt

1. **Unidirecional**: dado o hash, é impossível descobrir a senha original
2. **Salted**: mesmo duas senhas iguais geram hashes diferentes (evita ataques de dicionário)
3. **Lento propositalmente**: o fator de custo (10) faz o processo demorar ~100ms, inviabilizando força bruta

### Como usamos no código

**Ao cadastrar (hash):**
```js
const hash = await bcrypt.hash(senha, 10);
// O "10" é o fator de custo (10 rounds de processamento)
await prisma.usuario.create({ data: { nome, email, senha: hash } });
```

**Ao fazer login (comparação):**
```js
const senhaCorreta = await bcrypt.compare(senhaDigitada, hashSalvoNoBanco);
// Retorna true ou false
if (!senhaCorreta) return res.status(401).json({ error: 'Senha incorreta' });
```

> O `bcrypt.compare` reconstrói o processo e compara sem precisar "desfazer" o hash.

---

## JWT — JSON Web Token

### O que é?

JWT (JSON Web Token) é um padrão para transmitir informações de forma segura entre duas partes. No GeldTrack, usamos para **provar que o usuário está autenticado** sem precisar checar o banco a cada requisição.

### Estrutura de um JWT

Um token JWT tem 3 partes separadas por ponto `.`:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzc5MzgwNDY2fQ.assinatura
└──────────────────────────────────┘.└───────────────────────────────────────┘.└────────┘
           HEADER (base64)                       PAYLOAD (base64)               SIGNATURE
        { alg: "HS256",                       { id: 1,
          type: "JWT" }                         iat: 1779380466,
                                                exp: 1779985266 }
```

- **Header**: algoritmo de assinatura (HS256)
- **Payload**: dados (id do usuário, data de criação, data de expiração)
- **Signature**: garante que o token não foi adulterado

> O payload é apenas encodado em Base64, **não criptografado** — pode ser lido por qualquer um. Por isso não colocamos dados sensíveis (como senha) no token.

### Como o JWT é gerado (login)

```js
const token = jwt.sign(
  { id: user.id },             // Payload: o que queremos "embutir"
  process.env.JWT_SECRET,      // Chave secreta para assinar
  { expiresIn: '7d' }          // Expira em 7 dias
);
```

### Como o JWT é verificado (rotas protegidas)

```js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
// Se o token for válido: decoded = { id: 1, iat: ..., exp: ... }
// Se inválido ou expirado: lança uma exceção
req.userId = decoded.id;  // Injeta o ID para usar na rota
```

---

## Fluxo completo de autenticação

### Cadastro

```
Usuário preenche formulário (nome, email, senha)
              ↓
React envia POST /api/auth/register
              ↓
Backend valida os dados
              ↓
bcrypt.hash(senha) → gera hash
              ↓
Salva no banco: { nome, email, hash }
              ↓
jwt.sign({ id }) → gera token
              ↓
Retorna: { token, user }
              ↓
React salva token no localStorage
              ↓
Redireciona para /dashboard
```

### Login

```
Usuário digita email + senha
              ↓
React envia POST /api/auth/login
              ↓
Backend busca usuário pelo e-mail
              ↓
bcrypt.compare(senhaDigitada, hashSalvo)
              ↓
       Igual? → gera JWT → retorna { token, user }
     Diferente? → retorna 401 Unauthorized
              ↓
React salva token no localStorage
              ↓
Redireciona para /dashboard
```

### Requisição autenticada (ex: listar transações)

```
React inclui token no header:
Authorization: Bearer eyJhbGci...
              ↓
Express recebe a requisição
              ↓
authMiddleware extrai o token do header
              ↓
jwt.verify(token, secret)
              ↓
       Válido? → injeta req.userId → continua
      Inválido? → retorna 401 Unauthorized
              ↓
Route handler executa com req.userId disponível
              ↓
prisma.transacao.findMany({ where: { usuarioId: req.userId } })
              ↓
Retorna apenas as transações daquele usuário
```

---

## Como o frontend gerencia o token

O token é salvo no `localStorage` do navegador:

```js
// Ao fazer login com sucesso:
localStorage.setItem('token', data.token)
localStorage.setItem('user', JSON.stringify(data.user))

// Em todas as requisições seguintes (configurado no api.js):
api.defaults.headers.common['Authorization'] = `Bearer ${token}`

// Ao fazer logout:
localStorage.removeItem('token')
localStorage.removeItem('user')
```

O `AuthContext.jsx` cuida de carregar o token do localStorage quando a página é recarregada, mantendo o usuário logado.

---

## Por que localStorage e não cookie?

Para este projeto acadêmico, o localStorage é mais simples de implementar. Em produção, cookies `HttpOnly` seriam mais seguros pois são inacessíveis via JavaScript, protegendo contra ataques XSS. Isso seria uma melhoria futura.

---

## O JWT_SECRET

A variável `JWT_SECRET` é a chave usada para assinar e verificar os tokens. É como uma senha do servidor — se alguém a descobrir, pode criar tokens falsos.

Por isso:
- Fica no arquivo `.env` (não vai para o Git)
- Deve ser uma string longa e aleatória em produção
- Em desenvolvimento usamos um valor simples para facilitar
