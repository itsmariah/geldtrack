# 📚 Documentação GeldTrack

Bem-vindo à documentação técnica completa do **GeldTrack**. Aqui você encontra tudo que precisa para entender, rodar e contribuir com o projeto.

---

## 📂 Índice

| Arquivo | O que explica |
|---------|---------------|
| [01-visao-geral.md](./01-visao-geral.md) | O que é o projeto, objetivos e requisitos |
| [02-como-rodar.md](./02-como-rodar.md) | Passo a passo para rodar na sua máquina |
| [03-arquitetura.md](./03-arquitetura.md) | Como as peças se conectam (diagrama geral) |
| [04-backend.md](./04-backend.md) | Tudo sobre o servidor Node.js + Express |
| [05-banco-de-dados.md](./05-banco-de-dados.md) | SQLite, Prisma ORM e as tabelas do sistema |
| [06-autenticacao.md](./06-autenticacao.md) | Como funciona login, JWT e bcrypt |
| [07-api-endpoints.md](./07-api-endpoints.md) | Todos os endpoints com exemplos de requisição/resposta |
| [08-frontend.md](./08-frontend.md) | Tudo sobre o React, Vite e estrutura de páginas |
| [09-componentes.md](./09-componentes.md) | Cada componente React explicado |
| [10-tecnologias.md](./10-tecnologias.md) | Por que usamos cada tecnologia |

---

## 🚀 Começo rápido

```bash
# 1. Backend
cd backend && npm install
npx prisma migrate dev --name init
npm run dev

# 2. Frontend (outro terminal)
cd frontend && npm install
npm run dev

# 3. Acessar
# http://localhost:5173
```

---

## 👥 Equipe

- Mariah
- Jefferson
- Diogo
- Weslley

**Disciplina:** Programação de Computadores — 2026.1
**Professor:** Edkallenn Lima
