# 02 — Como Rodar o Projeto

## Pré-requisitos

Antes de tudo, você precisa ter instalado na sua máquina:

| Ferramenta | Versão mínima | Como verificar |
|-----------|---------------|----------------|
| Node.js | 18 ou superior | `node -v` no terminal |
| npm | 9 ou superior | `npm -v` no terminal |
| Git | Qualquer | `git --version` no terminal |

Se não tiver o Node.js, baixe em: https://nodejs.org (escolha a versão **LTS**)

---

## Passo 1 — Clonar o repositório

Abra o terminal (PowerShell, CMD ou Git Bash) e execute:

```bash
git clone https://github.com/itsmariah/moneytrack.git
cd moneytrack
```

---

## Passo 2 — Configurar o Backend

### 2.1 — Entrar na pasta do backend
```bash
cd backend
```

### 2.2 — Instalar as dependências
```bash
npm install
```

Isso vai baixar todos os pacotes listados no `package.json` para a pasta `node_modules/`.

### 2.3 — Criar o banco de dados
```bash
npx prisma migrate dev --name init
```

Este comando:
- Cria o arquivo `prisma/dev.db` (banco SQLite)
- Cria as tabelas `Usuario` e `Transacao`
- Gera o Prisma Client (código que permite usar o banco no Node.js)

> ⚠️ Só precisa rodar este comando **uma única vez** (na primeira vez que configurar o projeto).

### 2.4 — Iniciar o servidor
```bash
npm run dev
```

Se tudo deu certo, você verá:
```
GeldTrack API rodando em http://localhost:3001
```

**Deixe este terminal aberto.**

---

## Passo 3 — Configurar o Frontend

Abra um **novo terminal** (não feche o do backend).

### 3.1 — Voltar para a raiz e entrar no frontend
```bash
cd ..
cd frontend
```

### 3.2 — Instalar as dependências
```bash
npm install
```

### 3.3 — Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

Você verá algo como:
```
  VITE v5.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Deixe este terminal aberto também.**

---

## Passo 4 — Acessar o sistema

Abra o navegador e acesse: **http://localhost:5173**

Você verá a landing page do GeldTrack. Clique em **"Criar conta grátis"** para se cadastrar.

---

## Estrutura de terminais necessária

Para o sistema funcionar, você sempre precisa de **2 terminais abertos**:

```
Terminal 1 (Backend)          Terminal 2 (Frontend)
─────────────────────         ──────────────────────
cd backend                    cd frontend
npm run dev                   npm run dev
                              
Rodando em:                   Rodando em:
http://localhost:3001         http://localhost:5173
```

O frontend (React) se comunica com o backend (Express) automaticamente graças à configuração de proxy no `vite.config.js`.

---

## Problemas comuns

### "Porta já em uso" (EADDRINUSE)
Significa que já tem um servidor rodando na porta 3001 ou 5173. Feche outros terminais ou reinicie o computador.

### "Cannot find module '@prisma/client'"
Rode `npx prisma generate` na pasta `backend/` para regenerar o cliente Prisma.

### "prisma/dev.db não encontrado"
Rode `npx prisma migrate dev --name init` na pasta `backend/`.

### npm install deu erro
Certifique-se de estar dentro da pasta correta (`backend/` ou `frontend/`) antes de rodar `npm install`.

---

## Como parar os servidores

Pressione **Ctrl + C** em cada terminal para encerrar os servidores.

Os dados salvos no banco (`prisma/dev.db`) **não são apagados** quando você para os servidores.
