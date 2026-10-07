# 10 — Tecnologias Utilizadas

Este documento explica cada tecnologia usada no projeto, por que foi escolhida e como se encaixa no todo.

---

## Backend

### Node.js

**O que é:** Ambiente de execução JavaScript fora do navegador. Permite usar JavaScript no servidor.

**Por que usamos:** A equipe já conhecia JavaScript do frontend, então usar a mesma linguagem no backend reduz a curva de aprendizado. Node.js é amplamente usado na indústria e tem um ecossistema enorme (npm).

**Versão:** 18+

**Comando para verificar:** `node -v`

---

### Express

**O que é:** Framework minimalista para criar servidores HTTP em Node.js.

**Por que usamos:** É o framework mais popular do ecossistema Node.js, muito bem documentado e com sintaxe simples. Permite criar APIs REST de forma organizada.

**Como funciona:**
```js
const app = express()

app.get('/rota', (req, res) => {
  res.json({ mensagem: 'olá' })
})

app.listen(3001)
```

**Site:** https://expressjs.com

---

### Prisma ORM

**O que é:** ORM (Object-Relational Mapper) moderno para Node.js. Traduz código JavaScript em operações no banco de dados.

**Por que usamos:** Alternativa ao `better-sqlite3` (que requer compilação nativa no Windows). O Prisma usa binários pré-compilados em Rust, funcionando em qualquer ambiente sem configuração adicional. Além disso, oferece migrations, type safety e uma API fluente.

**Três partes do Prisma:**
1. **Prisma Client**: biblioteca usada no código para acessar o banco
2. **Prisma Schema**: arquivo que define os modelos (tabelas)
3. **Prisma Migrate**: sistema de migrações de banco de dados

**Site:** https://www.prisma.io

---

### PostgreSQL

**O que é:** Banco de dados relacional cliente-servidor, um dos mais usados em produção no mundo.

**Por que usamos:** O projeto começou com **SQLite** (arquivo local `.db`, zero configuração — ótimo pra prototipar). A troca veio quando o projeto passou a rodar em produção de verdade: o backend no Render não garante disco persistente entre deploys (um arquivo `.db` local se perderia), e múltiplas pessoas passaram a escrever ao mesmo tempo na mesma carteira ("modo família") — SQLite trava o arquivo inteiro a cada escrita, Postgres não. Hospedado gratuitamente no [Neon](https://neon.com) em produção; localmente roda via Docker ou uma instância na nuvem separada (ver [02-como-rodar.md](./02-como-rodar.md)).

**Diferença para outros bancos:**
| Banco | Tipo | Quando usar |
|-------|------|-------------|
| SQLite | Arquivo local | Protótipos, apps que rodam numa única máquina |
| PostgreSQL / MySQL | Servidor | Produção, múltiplos usuários/processos escrevendo ao mesmo tempo |
| MongoDB | NoSQL | Dados não estruturados, documentos JSON |

**Tipos usados no schema que vale conhecer:** `Decimal(12,2)` para todo valor em dinheiro (evita o erro de arredondamento binário do `Float` — crítico num app financeiro) e `Json` para o histórico de edição de transações (`TransacaoHistorico.alteracoes`).

**Site:** https://www.postgresql.org

---

### bcryptjs

**O que é:** Biblioteca para criptografar senhas usando o algoritmo bcrypt.

**Por que usamos:** É um requisito de segurança básico nunca armazenar senhas em texto puro. O bcrypt é o algoritmo padrão da indústria para hashing de senhas, pois é intencionalmente lento (resistente a ataques de força bruta) e usa salt automático.

**Por que `bcryptjs` e não `bcrypt`?** O `bcryptjs` é escrito em JavaScript puro — não precisa de compilação nativa. O `bcrypt` original requer node-gyp, que pode dar problemas no Windows (como aconteceu com o `better-sqlite3`).

**Site:** https://github.com/dcodeIO/bcrypt.js

---

### jsonwebtoken (JWT)

**O que é:** Biblioteca para gerar e verificar JSON Web Tokens.

**Por que usamos:** JWT é o padrão moderno para autenticação em APIs. Permite que o servidor seja **stateless** — não precisa guardar sessões em memória ou banco. O token carrega a identidade do usuário e pode ser verificado de forma independente.

**Alternativas:**
- Sessions (cookies + servidor guarda sessão) — mais simples, mas usa mais memória no servidor
- OAuth2 — para autenticação com Google/GitHub, mais complexo

**Site:** https://github.com/auth0/node-jsonwebtoken

---

### CORS (`cors`)

**O que é:** Middleware Express que configura os headers de CORS nas respostas.

**Por que usamos:** O navegador bloqueia por segurança requisições entre origens diferentes (domínios ou portas). Como frontend (5173) e backend (3001) rodam em portas diferentes, precisamos configurar o CORS para permitir a comunicação.

---

### dotenv

**O que é:** Carrega variáveis de ambiente de um arquivo `.env` para `process.env`.

**Por que usamos:** Para separar configurações do código. Senhas, chaves secretas e URLs específicas de cada ambiente (desenvolvimento, produção) ficam no `.env` em vez de hard-coded no código.

---

### nodemon (desenvolvimento)

**O que é:** Monitora arquivos do projeto e reinicia o servidor automaticamente quando há mudanças.

**Por que usamos:** Sem o nodemon, seria necessário parar e reiniciar o servidor manualmente a cada alteração no código. O nodemon automatiza isso, acelerando o desenvolvimento.

---

### helmet

**O que é:** Middleware Express que define um conjunto de cabeçalhos HTTP relacionados a segurança (ex: `X-Content-Type-Options`, `X-Frame-Options`) com um valor sensato por padrão.

**Por que usamos:** Reduz superfície de ataque (clickjacking, MIME sniffing) sem precisar configurar cada header manualmente.

**Site:** https://helmetjs.github.io

---

### express-rate-limit

**O que é:** Middleware que limita quantas requisições um mesmo cliente pode fazer numa janela de tempo.

**Por que usamos:** Protege rotas sensíveis (login, cadastro, recuperação de senha, e todas as rotas de dados) contra força bruta e abuso — cada limitador é configurado por rota/grupo de rotas, com uma janela e um teto de requisições.

**Site:** https://github.com/express-rate-limit/express-rate-limit

---

### nodemailer

**O que é:** Biblioteca pra enviar e-mail a partir do Node.js via SMTP.

**Por que usamos:** Dois fluxos do app mandam e-mail: recuperação de senha (link com token) e aviso de orçamento estourado. Configurado via variáveis `SMTP_*` no `.env` — sem elas, o envio falha (mas o resto do app continua funcionando).

**Site:** https://nodemailer.com

---

### pluggy-sdk

**O que é:** SDK oficial da [Pluggy](https://pluggy.ai), um agregador de Open Finance (equivalente brasileiro ao Plaid) que conecta a bancos de verdade.

**Por que usamos:** Implementar a integração direto com cada banco individualmente exigiria credenciar o GeldTrack junto a cada instituição financeira — inviável para um projeto pessoal. A Pluggy padroniza essa conexão: o usuário autoriza o acesso pelo widget deles (`react-pluggy-connect`, no frontend), e o backend só guarda o identificador da conexão (`pluggyItemId`) — nunca senha nem token de acesso ao banco em si.

**Site:** https://pluggy.ai

---

## Frontend

### React

**O que é:** Biblioteca JavaScript para construir interfaces de usuário com componentes reutilizáveis.

**Por que usamos:** React é a biblioteca frontend mais popular do mundo. Facilita construir interfaces complexas e interativas, gerencia o estado da UI de forma eficiente e tem um ecossistema enorme.

**Conceito central — reconciliação:** React mantém uma cópia virtual do DOM (Virtual DOM). Quando o estado muda, ele calcula a diferença e atualiza apenas as partes necessárias do DOM real. Isso é mais eficiente que manipular o DOM diretamente.

**Versão:** 18

**Site:** https://react.dev

---

### Vite

**O que é:** Ferramenta de build extremamente rápida para projetos frontend modernos.

**Por que usamos:** Alternativa mais moderna e rápida ao Create React App (CRA). O Vite usa ES Modules nativos do navegador em desenvolvimento, o que resulta em hot reload quase instantâneo. Também configuramos o proxy do `/api` nele.

**Versão:** 5

**Site:** https://vitejs.dev

---

### React Router DOM

**O que é:** Biblioteca de roteamento para React. Cria navegação entre "páginas" sem recarregar o navegador.

**Por que usamos:** O GeldTrack tem múltiplas telas (landing, login, dashboard, relatórios). O React Router gerencia qual componente exibir baseado na URL, criando a experiência de uma aplicação multi-página sem o custo de recarregar tudo.

**Conceito:** SPA (Single Page Application) — o HTML é carregado uma única vez, e o JavaScript troca os componentes na tela conforme o usuário navega.

**Versão:** 6

**Site:** https://reactrouter.com

---

### Axios

**O que é:** Cliente HTTP baseado em Promises para fazer requisições a APIs.

**Por que usamos:** Mais ergonômico que o `fetch` nativo:
- Serializa e desserializa JSON automaticamente
- Permite configurar headers globais (como o token JWT)
- Tem interceptors para tratar erros globalmente
- Melhor tratamento de erros

**Comparação:**
```js
// fetch nativo (mais verboso)
const res = await fetch('/api/transactions', {
  headers: { Authorization: `Bearer ${token}` }
})
const data = await res.json()

// Axios (mais simples)
const { data } = await api.get('/transactions')
// token já está no header por padrão
```

**Site:** https://axios-http.com

---

### Recharts

**O que é:** Biblioteca de gráficos construída especificamente para React, usando SVG.

**Por que usamos:** Os gráficos são componentes React nativos — integram perfeitamente com o estado do React. Quando os dados mudam, os gráficos atualizam automaticamente. É mais simples de usar que Chart.js (que foi usado na versão anterior em HTML puro).

**Gráficos usados:**
| Gráfico | Componente | Onde |
|---------|-----------|------|
| Rosca (donut) | `PieChart + Pie` | Dashboard e Relatórios |
| Barras | `BarChart + Bar` | Relatórios (evolução 6 meses) |

**Site:** https://recharts.org

---

### jsPDF + jspdf-autotable + html2canvas

**O que é:** `jsPDF` gera arquivos PDF direto no navegador; `jspdf-autotable` desenha tabelas formatadas dentro desse PDF; `html2canvas` tira um "print" de um elemento HTML (usado pros gráficos) e converte em imagem pra colar no PDF.

**Por que usamos:** A exportação do relatório mensal em PDF roda **inteiramente no navegador** (`frontend/src/utils/generateReportPdf.js`) — sem endpoint no backend pra isso. Evita gerar/segurar um arquivo temporário no servidor e mantém a geração rápida, já que os dados do relatório já estão carregados na tela.

**Sites:** https://github.com/parallax/jsPDF · https://github.com/simonbengtsson/jsPDF-AutoTable · https://html2canvas.hertzen.com

---

### react-pluggy-connect

**O que é:** Widget React oficial da Pluggy — a tela onde o usuário escolhe o banco e autoriza a conexão.

**Por que usamos:** Em vez de construir esse fluxo de autorização do zero (e lidar com a segurança de credenciais bancárias), o widget cuida de toda a etapa sensível; o GeldTrack só recebe de volta um identificador de conexão já autorizada.

**Site:** https://github.com/pluggyai/pluggy-connect

---

### vite-plugin-pwa (+ Workbox)

**O que é:** Plugin do Vite que gera o `manifest.webmanifest` e o service worker (via Workbox) necessários pra um site virar instalável como PWA (Progressive Web App).

**Por que usamos:** Deixa o GeldTrack instalável no celular direto do navegador, sem loja de aplicativo. Configurado só pra cachear o "app shell" (JS/CSS/HTML/ícones) — nenhuma chamada `/api` é cacheada, então o app sempre busca dado real da rede, nunca mostra número desatualizado offline. Ver `frontend/vite.config.js` e `frontend/src/hooks/useInstallPrompt.js` (captura o evento `beforeinstallprompt` do navegador pra mostrar o botão "Instalar no celular").

**Site:** https://vite-pwa-org.netlify.app

---

## Controle de versão

### Git

**O que é:** Sistema de controle de versão distribuído.

**Por que usamos:** Permite que a equipe trabalhe em paralelo sem sobrescrever o código um do outro, mantém histórico de todas as mudanças e facilita reverter erros.

**Principais comandos usados:**
```bash
git status              # Ver arquivos modificados
git add arquivo.js      # Preparar arquivo para commit
git commit -m "mensagem"  # Salvar snapshot
git push                # Enviar para o GitHub
git pull                # Baixar mudanças do GitHub
```

---

### GitHub

**O que é:** Plataforma de hospedagem de repositórios Git com ferramentas colaborativas.

**Por que usamos:** Permite que toda a equipe acesse o mesmo código, com histórico de commits, visualização de diferenças e gerenciamento de branches.

**Repositório:** https://github.com/itsmariah/geldtrack

---

## Resumo das dependências

### `backend/package.json`
```json
{
  "dependencies": {
    "@prisma/client":     "banco de dados",
    "bcryptjs":           "criptografia de senhas",
    "cors":               "política de origens cruzadas",
    "dotenv":             "variáveis de ambiente",
    "express":            "servidor HTTP",
    "express-rate-limit": "limite de requisições por rota",
    "helmet":             "cabeçalhos HTTP de segurança",
    "jsonwebtoken":       "autenticação JWT",
    "nodemailer":         "envio de e-mail (senha, orçamento)",
    "pluggy-sdk":         "integração Open Finance"
  },
  "devDependencies": {
    "nodemon":   "reinício automático em dev",
    "prisma":    "migrations e geração do client",
    "supertest": "requisições HTTP nos testes de rota",
    "vitest":    "runner de testes"
  }
}
```

### `frontend/package.json`
```json
{
  "dependencies": {
    "axios":               "requisições HTTP",
    "html2canvas":         "captura de gráfico como imagem pro PDF",
    "jspdf":               "geração de PDF no navegador",
    "jspdf-autotable":     "tabelas dentro do PDF gerado",
    "react":               "biblioteca de UI",
    "react-dom":           "renderização no navegador",
    "react-pluggy-connect":"widget de conexão Open Finance",
    "react-router-dom":    "navegação entre páginas",
    "recharts":            "gráficos"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "suporte a JSX no Vite",
    "vite":                 "servidor de dev e build",
    "vite-plugin-pwa":      "instalação como PWA (manifest + service worker)",
    "vitest":               "runner de testes"
  }
}
```
