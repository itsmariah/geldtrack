# 08 — Frontend (React + Vite)

## O que é o frontend?

O frontend é tudo que o usuário **vê e interage**: as telas, formulários, botões, gráficos. No GeldTrack, o frontend é uma aplicação React que roda no navegador.

---

## Tecnologias do frontend

| Pacote | Função |
|--------|--------|
| `react` | Biblioteca para construir interfaces com componentes |
| `react-dom` | Renderiza componentes React no HTML |
| `react-router-dom` | Navegação entre páginas sem recarregar a página |
| `axios` | Faz requisições HTTP para o backend |
| `recharts` | Biblioteca de gráficos para React |
| `vite` | Ferramenta de build e servidor de desenvolvimento |

---

## O que é o React?

React é uma biblioteca JavaScript para construir interfaces. A ideia central é dividir a tela em **componentes** — peças independentes e reutilizáveis.

Em vez de criar um HTML enorme, criamos pequenos componentes:

```
App
├── Navbar
├── SummaryCards
│   ├── Card (Saldo)
│   ├── Card (Receitas)
│   └── Card (Despesas)
├── TransactionList
│   ├── TransactionItem
│   ├── TransactionItem
│   └── TransactionItem
└── ExpensePieChart
```

Cada componente tem seu próprio estado e lógica, mas pode receber dados do componente pai via **props**.

---

## O que é o Vite?

O Vite é uma ferramenta de **desenvolvimento** e **build**. Ele:

1. Serve os arquivos React durante o desenvolvimento (`npm run dev`)
2. Converte JSX → JavaScript que o navegador entende
3. Faz **hot reload**: atualiza a tela instantaneamente ao salvar um arquivo
4. Configura o **proxy** de `/api` para `localhost:3001`

### Arquivo: `vite.config.js`

```js
export default defineConfig({
  plugins: [react()],        // Plugin para processar JSX
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // Redireciona /api/* para o backend
        changeOrigin: true,
      }
    }
  }
})
```

O proxy é importante: quando o React chama `/api/transactions`, o Vite redireciona para `http://localhost:3001/api/transactions`. Isso evita problemas de CORS em desenvolvimento.

---

## O que é JSX?

JSX é uma sintaxe que mistura HTML com JavaScript. É específica do React.

```jsx
// JSX (o que escrevemos)
function Card({ titulo, valor }) {
  return (
    <div className="card">
      <h3>{titulo}</h3>
      <p>R$ {valor.toFixed(2)}</p>
    </div>
  )
}
```

O Vite transforma isso em JavaScript puro para o navegador.

---

## Rotas do React (`App.jsx`)

O `react-router-dom` cria rotas no frontend — URLs que carregam componentes diferentes sem recarregar a página. Isso é chamado de **SPA (Single Page Application)**.

```jsx
<Routes>
  <Route path="/"               element={<Landing />} />
  <Route path="/login"          element={<Login />} />
  <Route path="/cadastro"       element={<Register />} />
  <Route path="/esqueci-senha"  element={<ForgotPassword />} />
  <Route path="/redefinir-senha" element={<ResetPassword />} />
  <Route path="/dashboard"      element={<PrivateRoute><Dashboard /></PrivateRoute>} />
  <Route path="/relatorios"     element={<PrivateRoute><Reports /></PrivateRoute>} />
  <Route path="/metas"          element={<PrivateRoute><Goals /></PrivateRoute>} />
  <Route path="/orcamentos"     element={<PrivateRoute><Budgets /></PrivateRoute>} />
  <Route path="/eventos"        element={<PrivateRoute><Eventos /></PrivateRoute>} />
  <Route path="/eventos/:id"    element={<PrivateRoute><EventoDetalhe /></PrivateRoute>} />
  <Route path="/recorrencias"   element={<PrivateRoute><Recurring /></PrivateRoute>} />
  <Route path="/contas"         element={<PrivateRoute><Contas /></PrivateRoute>} />
  <Route path="/categorias"     element={<PrivateRoute><Categorias /></PrivateRoute>} />
  <Route path="/familia"        element={<PrivateRoute><Familia /></PrivateRoute>} />
  <Route path="/grupos"         element={<PrivateRoute><Grupos /></PrivateRoute>} />
  <Route path="/grupos/:id"     element={<PrivateRoute><GrupoDetalhe /></PrivateRoute>} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

O `<PrivateRoute>` verifica se o usuário está logado. Se não estiver, redireciona para `/login`.

Todas as rotas privadas (exceto `/`, `/login`, `/cadastro`, `/esqueci-senha` e `/redefinir-senha`) ficam por trás de `<PrivateRoute>` — a lista cresceu bastante desde a versão inicial do projeto (metas, orçamentos, eventos, recorrências, contas, categorias, família e grupos foram todos adicionados depois). Qualquer rota não reconhecida (`*`) volta pra Landing.

---

## Context API — Estado Global (`AuthContext.jsx`)

O **Context API** do React permite compartilhar estado entre componentes sem precisar passar props manualmente por vários níveis.

```
App
├── AuthProvider (guarda: user, login, logout)
│   ├── Navbar (precisa do user para mostrar o nome)
│   ├── Dashboard (precisa do user para buscar transações)
│   └── ProfileModal (precisa do updateProfile)
```

Sem Context, teríamos que passar `user` como prop de App → Dashboard → Navbar → ProfileModal, o que seria trabalhoso.

### Como usar em qualquer componente:

```jsx
import { useAuth } from '../context/AuthContext'

function Navbar() {
  const { user, logout } = useAuth()  // Acessa direto, sem props
  return (
    <header>
      <span>Olá, {user.nome}</span>
      <button onClick={logout}>Sair</button>
    </header>
  )
}
```

---

## Axios — Chamadas à API (`services/api.js`)

O Axios é configurado uma vez e reusado em todo o projeto:

```js
const api = axios.create({ baseURL: '/api' })

// Injeta o token automaticamente em todas as requisições
api.defaults.headers.common['Authorization'] = `Bearer ${token}`

// Interceptor: se o servidor retornar 401, faz logout automático
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
```

Uso nos componentes:
```js
// GET
const { data } = await api.get('/transactions')

// POST
const { data } = await api.post('/transactions', { tipo, valor, ... })

// PUT
await api.put(`/transactions/${id}`, dadosAtualizados)

// DELETE
await api.delete(`/transactions/${id}`)
```

---

## Hooks do React usados

### `useState`
Guarda um valor que, quando muda, atualiza a tela.

```jsx
const [transactions, setTransactions] = useState([])
// transactions: valor atual
// setTransactions: função para atualizar
```

### `useEffect`
Executa código quando o componente é montado ou quando dependências mudam.

```jsx
useEffect(() => {
  fetchData()  // Busca dados quando o componente aparece na tela
}, [])         // [] = executa apenas uma vez (ao montar)

useEffect(() => {
  fetchReport()  // Rebusca quando "month" muda
}, [month])
```

### `useCallback`
Memoiza uma função para evitar que ela seja recriada a cada render.

```jsx
const fetchData = useCallback(async () => {
  // ...
}, [filters])  // Só recria se filters mudar
```

### `useContext`
Acessa o contexto global (via `useAuth()`).

---

## Estilização (`index.css`)

O projeto usa **CSS puro** com variáveis CSS para o tema escuro:

```css
:root {
  --bg: #0f1117;          /* Fundo principal */
  --bg2: #1a1d2e;         /* Fundo de cards */
  --primary: #6366f1;     /* Cor primária (roxo) */
  --green: #22c55e;       /* Receitas */
  --red: #ef4444;         /* Despesas */
}
```

Isso facilita manter consistência visual — mudar `--primary` muda a cor de todos os botões, links e bordas de uma vez.

### Layout responsivo

Usamos CSS Grid que adapta automaticamente ao tamanho da tela:

```css
/* Desktop: 2 colunas */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
}

/* Celular: 1 coluna */
@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Recharts — Gráficos

O Recharts é uma biblioteca de gráficos construída para React. Usamos:

### Gráfico de Pizza (Despesas por categoria)

```jsx
<PieChart>
  <Pie data={data} dataKey="value" innerRadius={55} outerRadius={95}>
    {data.map((_, i) => <Cell key={i} fill={CORES[i]} />)}
  </Pie>
  <Tooltip formatter={(v) => formatarMoeda(v)} />
  <Legend />
</PieChart>
```

### Gráfico de Barras (Evolução mensal)

```jsx
<BarChart data={evolutionData}>
  <XAxis dataKey="mes" />
  <YAxis />
  <Tooltip />
  <Bar dataKey="Receitas" fill="#22c55e" />
  <Bar dataKey="Despesas" fill="#ef4444" />
</BarChart>
```

O `ResponsiveContainer` faz os gráficos se adaptarem ao tamanho do contêiner.

---

## Formatação de moeda

Em vários componentes formatamos valores como moeda brasileira:

```js
const fmt = (n) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(n)

fmt(1500)    // → "R$ 1.500,00"
fmt(45.9)    // → "R$ 45,90"
```

O `Intl.NumberFormat` é uma API nativa do JavaScript que formata números de acordo com a localidade.
