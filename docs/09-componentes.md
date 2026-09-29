# 09 — Componentes React

## O que é um componente?

Um componente React é uma função JavaScript que retorna JSX (HTML + JS misturados). Cada componente representa uma parte visual da interface.

```jsx
// Componente simples
function Titulo({ texto }) {
  return <h1>{texto}</h1>
}

// Usando o componente
<Titulo texto="Olá, mundo!" />
```

O GeldTrack tem dois tipos de arquivos em `frontend/src/`:
- **`pages/`** — telas completas (acessadas por URL)
- **`components/`** — partes reutilizáveis (usadas dentro das páginas)

---

## 📄 Páginas (`src/pages/`)

### Landing.jsx — Página inicial

**URL:** `/`

**O que faz:** Tela de apresentação do sistema com hero e cards de features. Se o usuário já estiver logado, redireciona para `/dashboard`.

```jsx
useEffect(() => {
  if (user) navigate('/dashboard')  // Redireciona se já logado
}, [user, navigate])
```

**Componentes usados:** nenhum (é uma página standalone)

---

### Login.jsx — Tela de login

**URL:** `/login`

**O que faz:** Formulário com e-mail e senha. Ao fazer login com sucesso, salva o token e redireciona para o dashboard.

**Estado interno:**
```jsx
const [form, setForm] = useState({ email: '', senha: '' })
const [error, setError] = useState('')
const [loading, setLoading] = useState(false)
```

**Fluxo:**
```
Usuário preenche form → submit
        ↓
setLoading(true) — mostra "Entrando..."
        ↓
await login(email, senha)  // chama AuthContext
        ↓
  Sucesso → navigate('/dashboard')
  Erro    → setError(mensagem)
        ↓
setLoading(false)
```

---

### Register.jsx — Tela de cadastro

**URL:** `/cadastro`

**O que faz:** Formulário com nome, e-mail, senha e confirmação de senha. Valida que as senhas coincidem antes de enviar.

**Validação local:**
```jsx
if (form.senha !== form.confirmar) {
  return setError('As senhas não coincidem')
}
```

---

### ForgotPassword.jsx — Esqueci minha senha

**URL:** `/esqueci-senha`

**O que faz:** Formulário com um campo de e-mail. Ao enviar, chama `POST /auth/forgot-password` e, independente de o e-mail existir ou não, mostra uma mensagem de sucesso (evita confirmar pra quem está tentando descobrir e-mails cadastrados).

**Estado interno:**
```jsx
const [email, setEmail] = useState('')
const [error, setError] = useState('')
const [message, setMessage] = useState('')  // troca o formulário pela mensagem de sucesso
const [loading, setLoading] = useState(false)
```

**Componentes usados:** `Alert`

---

### ResetPassword.jsx — Redefinir senha

**URL:** `/redefinir-senha?token=...`

**O que faz:** Lê o `token` da URL (via `useSearchParams`). Sem token, mostra um erro com link pra solicitar um novo. Com token, mostra formulário de nova senha + confirmação e envia pra `POST /auth/reset-password`. Ao concluir, redireciona pro `/login`.

**Estado interno:**
```jsx
const [form, setForm] = useState({ senha: '', confirmar: '' })
```

**Validação local:** igual ao Register — compara `form.senha` e `form.confirmar` antes de enviar.

**Componentes usados:** `Alert`, `PasswordMatchHint`

---

### Dashboard.jsx — Painel principal

**URL:** `/dashboard` (protegida — requer login)

**O que faz:** Tela principal do sistema. Mostra saldo, lista de transações com filtros e gráfico de pizza.

**Estado interno:**
```jsx
const [transactions, setTransactions]   // Lista de transações
const [balance, setBalance]             // { receitas, despesas, saldo }
const [categoryData, setCategoryData]   // Dados para o gráfico
const [filters, setFilters]             // Filtros ativos
const [showModal, setShowModal]         // Mostra/oculta modal
const [editingTransaction, ...]         // Transação sendo editada
const [loading, setLoading]             // Estado de carregamento
```

**Busca paralela de dados:**
```jsx
const [txRes, balanceRes, catRes] = await Promise.all([
  api.get('/transactions', { params }),
  api.get('/reports/balance'),
  api.get('/reports/categories'),
])
// Faz as 3 requisições ao mesmo tempo (mais rápido)
```

**Componentes usados:** `Navbar`, `SummaryCards`, `TransactionModal`, `TransactionList`, `ExpensePieChart`, `OFXImportModal`, `InsightsPanel`, `ProjectionCard`, `AnexoViewer`, `HistoricoViewer`

> A tela cresceu bastante desde a versão inicial: hoje também busca `/reports/insights` e `/reports/projecao` em paralelo com o resto, exporta CSV (`/transactions/export`), permite importar um extrato OFX e abre viewers de anexo/histórico por transação (veja essas seções mais abaixo).

---

### Reports.jsx — Relatórios mensais

**URL:** `/relatorios` (protegida — requer login)

**O que faz:** Exibe relatório de um mês selecionável, com gráfico de barras (evolução 6 meses), gráfico de pizza (categorias) e lista de transações do mês.

**Estado interno:**
```jsx
const [month, setMonth]         // Mês selecionado (ex: "2026-05")
const [report, setReport]       // Dados do relatório mensal
const [evolution, setEvolution] // Dados dos últimos 6 meses
```

**Componentes usados:** `Navbar`, `SummaryCards`, `ExpensePieChart`, `BarChart` (Recharts direto)

---

### Goals.jsx — Metas financeiras

**URL:** `/metas` (protegida)

**O que faz:** Lista as metas do usuário como cards com barra de progresso. Permite criar/editar uma meta, adicionar aportes e ver o histórico de aportes de cada uma.

**Estado interno:**
```jsx
const [metas, setMetas]                 // Lista de metas (GET /metas)
const [showMetaModal, setShowMetaModal] // Abre MetaModal (criar/editar)
const [editingMeta, setEditingMeta]
const [aporteMeta, setAporteMeta]       // Meta selecionada pra receber um aporte (abre AporteModal)
const [deleteMetaId, setDeleteMetaId]   // Confirmação de exclusão de meta
const [deleteAporte, setDeleteAporte]   // { metaId, aporteId } — confirmação de exclusão de aporte
```

**Componentes usados:** `Navbar`, `MetaCard`, `MetaModal`, `AporteModal`, `ConfirmDialog`, `Alert`, `SkeletonList`

---

### Budgets.jsx — Orçamentos por categoria

**URL:** `/orcamentos` (protegida)

**O que faz:** Lista os orçamentos mensais (um limite de gasto por categoria de despesa) do mês selecionado, com barra de progresso que muda de cor perto do limite. Um orçamento é sempre por categoria — o botão "+ Novo orçamento" fica desabilitado quando todas as categorias de despesa já têm um.

**Estado interno:**
```jsx
const [month, setMonth]           // Mês selecionado (input type="month")
const [orcamentos, setOrcamentos] // GET /orcamentos?month=...
```

**Detalhe:** a data padrão é calculada localmente (`currentMonthLocal()`) em vez de `new Date().toISOString()`, porque perto da virada do mês o UTC pode adiantar o mês exibido em relação ao horário do Brasil.

**Componentes usados:** `Navbar`, `BudgetCard`, `BudgetModal`, `ConfirmDialog`, `Alert`, `SkeletonList`

---

### Recurring.jsx — Transações recorrentes

**URL:** `/recorrencias` (protegida)

**O que faz:** Lista recorrências (transações que se repetem todo mês, ex: aluguel, assinaturas) como cards, com opção de pausar/retomar sem excluir. Busca `/recorrencias` e `/contas` em paralelo, já que criar uma recorrência exige escolher uma conta.

**Estado interno:**
```jsx
const [recorrencias, setRecorrencias]
const [contas, setContas]
```

**Componentes usados:** `Navbar`, `RecurringCard`, `RecurringModal`, `ConfirmDialog`, `Alert`, `SkeletonList`

---

### Contas.jsx — Contas e transferências

**URL:** `/contas` (protegida)

**O que faz:** Lista as contas do usuário (corrente, cartão, carteira, etc.), permite transferir entre elas, conectar um banco via Open Finance e mostra o histórico de transferências. Busca `/contas`, `/transferencias` e `/open-finance/conexoes` em paralelo.

**Estado interno (resumo):**
```jsx
const [contas, setContas]
const [transferencias, setTransferencias]
const [conexoes, setConexoes]           // Conexões bancárias (Open Finance)
const [sincronizandoId, setSincronizandoId]
```

**Fluxo de sincronização bancária:**
```jsx
const { data } = await api.post(`/open-finance/conexoes/${conexaoId}/sincronizar`)
// data.status: 'UPDATED' (ok), 'LOGIN_ERROR'/'OUTDATED' (falhou), ou ainda processando
```

**Componentes usados:** `Navbar`, `ContaCard`, `ContaModal`, `TransferModal`, `ConectarBancoModal`, `ConexaoBancariaCard`, `CotacoesPanel`, `ConfirmDialog`, `Alert`, `SkeletonList`

---

### Categorias.jsx — Categorias personalizadas

**URL:** `/categorias` (protegida)

**O que faz:** Lista as categorias de receita e despesa do usuário (nome, ícone, cor), separadas em duas seções. Não busca dados diretamente — usa `useCategorias()` (do `CategoriasContext`), que já mantém a lista carregada globalmente.

**Estado interno:**
```jsx
const { categorias, loading, refetch } = useCategorias()  // vem do contexto, não de useState local
const [novoTipo, setNovoTipo] = useState('despesa')       // tipo pré-selecionado ao abrir o modal
```

**Componentes usados:** `Navbar`, `CategoriaChip`, `CategoriaModal`, `ConfirmDialog`, `Alert`, `SkeletonList`

---

### Familia.jsx — Carteira compartilhada

**URL:** `/familia` (protegida)

**O que faz:** Gerencia a família (carteira compartilhada) do usuário logado: renomear a família (só o dono), ver/copiar/regenerar o código de convite, listar membros com seus papéis (`dono`/`membro`), remover um membro (só o dono) e entrar em outra família usando um código.

**Estado interno (resumo):**
```jsx
const { user, refreshUser } = useAuth()
const [familia, setFamilia]                 // GET /familia
const meuPapel = familia?.membros.find(m => m.id === user?.id)?.papel
const souDono = meuPapel === 'dono'
```

**Detalhe importante:** entrar em outra família ou sair da atual troca a família ativa do usuário — os dados da família anterior (transações, contas, orçamentos, etc.) deixam de aparecer, mas não são apagados. Por isso as duas ações passam por um `ConfirmDialog` de aviso antes de confirmar, e chamam `refreshUser()` do `AuthContext` depois pra atualizar o usuário em memória.

**Componentes usados:** `Navbar`, `ConfirmDialog`, `Alert`, `SkeletonList`

---

### Eventos.jsx — Lista de eventos

**URL:** `/eventos` (protegida)

**O que faz:** Lista eventos (ex: uma viagem) que agrupam transações já lançadas no dashboard normal. Cada card mostra progresso de orçamento (se definido) e permite encerrar/reabrir o evento. Clicar num card navega pro detalhe (`EventoDetalhe.jsx`).

**Estado interno:**
```jsx
const [eventos, setEventos]   // GET /eventos
```

**Componentes usados:** `Navbar`, `EventoCard`, `EventoModal`, `ConfirmDialog`, `Alert`, `SkeletonList`

---

### EventoDetalhe.jsx — Detalhe de um evento

**URL:** `/eventos/:id` (protegida)

**O que faz:** Mostra o progresso de orçamento do evento e a lista paginada de transações vinculadas a ele (mesmo componente `TransactionList` do Dashboard). O botão "+ Nova Transação" abre o `TransactionModal` já com `defaultEventoId` preenchido, então a transação criada já nasce vinculada ao evento.

**Busca paralela:**
```jsx
const [eventoRes, eventosRes, contasRes, txRes] = await Promise.all([
  api.get(`/eventos/${id}`),
  api.get('/eventos'),          // lista completa, pra popular o select de evento no modal
  api.get('/contas'),
  api.get('/transactions', { params: { evento: id, page, limit: PAGE_SIZE } }),
])
```

**Detalhe:** se o evento for excluído em outra aba/dispositivo enquanto a tela está aberta, a API responde 404 e a página redireciona automaticamente pra `/eventos` em vez de mostrar uma tela quebrada.

**Componentes usados:** `Navbar`, `TransactionModal`, `TransactionList`, `AnexoViewer`, `HistoricoViewer`, `ConfirmDialog`, `Alert`, `SkeletonList`

---

### Grupos.jsx — Lista de grupos

**URL:** `/grupos` (protegida)

**O que faz:** Lista os grupos (estilo Splitwise) dos quais o usuário participa, e tem um formulário pra entrar num grupo existente digitando um código. Diferente da Família, um usuário pode pertencer a **vários** grupos ao mesmo tempo.

**Estado interno:**
```jsx
const [grupos, setGrupos]           // GET /grupos
const [codigoInput, setCodigoInput] // código pra entrar num grupo existente
```

**Componentes usados:** `Navbar`, `GrupoCard`, `GrupoModal`, `Alert`, `SkeletonList`

---

### GrupoDetalhe.jsx — Detalhe de um grupo

**URL:** `/grupos/:id` (protegida)

**O que faz:** Tela mais completa da funcionalidade de grupos. Mostra os membros (incluindo convidados sem conta no sistema), a seção "Quem deve quem" (saldos calculados pelo backend), o histórico de pagamentos (quitações) e a lista de despesas divididas, com opção de criar/editar/excluir cada uma.

**Estado interno (resumo):**
```jsx
const [grupo, setGrupo]                         // GET /grupos/:id — traz membros, despesas, pagamentos e saldos juntos
const [pagamentoPrefill, setPagamentoPrefill]   // saldo clicado em "Quitar", pré-preenche o PagamentoGrupoModal
const [showConvidadoForm, setShowConvidadoForm] // formulário inline pra adicionar um convidado (sem conta própria)
```

**Fluxo "Quitar":** cada linha de `SaldosGrupo` tem um botão "Quitar" que chama `handleQuitarSaldo(saldo)`, guardando esse saldo em `pagamentoPrefill` e abrindo o `PagamentoGrupoModal` já com "quem pagou", "para quem" e o valor preenchidos a partir da dívida clicada — o usuário só confirma (os campos continuam editáveis, para pagamento parcial).

```jsx
const handleQuitarSaldo = (saldo) => {
  setPagamentoPrefill(saldo)
  setShowPagamentoModal(true)
}
```

**Papéis:** membros têm papel `admin` ou `membro` (equivalente a dono/membro da Família, mas nomeado diferente). Só admins podem remover membros e excluir o grupo; qualquer membro pode sair, exceto se for o único membro restante.

**Componentes usados:** `Navbar`, `DespesaGrupoModal`, `PagamentoGrupoModal`, `SaldosGrupo`, `ConfirmDialog`, `Alert`, `SkeletonList`

---

## 🧩 Componentes (`src/components/`)

### PrivateRoute.jsx

**O que faz:** Componente "guarda" que protege rotas que requerem login. Se o usuário não estiver autenticado, redireciona para `/login`.

```jsx
export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <div>Carregando...</div>  // Aguarda verificação

  return user
    ? children               // Logado: mostra a página
    : <Navigate to="/login" replace />  // Não logado: redireciona
}
```

**Uso no App.jsx:**
```jsx
<Route path="/dashboard" element={
  <PrivateRoute>
    <Dashboard />
  </PrivateRoute>
} />
```

---

### Navbar.jsx

**O que faz:** Barra de navegação no topo das páginas autenticadas. Mostra links de navegação, nome do usuário e botão de logout.

**Props:** nenhuma (usa `useAuth()` e `useLocation()` direto)

**Funcionalidades:**
- Destaca o link da página atual com `useLocation()`
- Abre o `ProfileModal` ao clicar no nome do usuário
- Chama `logout()` do contexto ao clicar em "Sair"

```jsx
const isActive = (path) => location.pathname === path ? 'active' : ''

<Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
```

---

### SummaryCards.jsx

**O que faz:** Exibe os 3 cards de resumo financeiro: Saldo Atual, Total Receitas, Total Despesas.

**Props:**
```jsx
<SummaryCards balance={{ saldo: 2149.50, receitas: 3000, despesas: 850.50 }} />
```

**Detalhe:** O saldo muda de cor dependendo do valor:
```jsx
<div className={`card-value ${balance.saldo >= 0 ? 'positive' : 'negative'}`}>
```
- Verde (`positive`) se saldo ≥ 0
- Vermelho (`negative`) se saldo < 0

---

### TransactionList.jsx

**O que faz:** Renderiza a lista de transações. Se a lista estiver vazia, mostra uma mensagem de estado vazio.

**Props:**
```jsx
<TransactionList
  transactions={[...]}   // Array de transações
  onEdit={handleEdit}    // Função chamada ao clicar em ✏️
  onDelete={handleDelete} // Função chamada ao clicar em 🗑️
/>
```

**Renderização condicional:**
```jsx
if (transactions.length === 0) {
  return <div className="empty-state">Nenhuma transação encontrada.</div>
}
```

---

### TransactionModal.jsx

**O que faz:** Modal (janela flutuante) para criar ou editar uma transação. Detecta automaticamente se está criando ou editando pela prop `transaction`.

**Props:**
```jsx
<TransactionModal
  transaction={null}         // null = criando nova
  transaction={{ id: 3 }}   // objeto = editando existente
  onClose={handleClose}      // Fecha o modal
  onSaved={handleSaved}      // Chamada após salvar (recarrega lista)
/>
```

**Pré-preenchimento ao editar:**
```jsx
useEffect(() => {
  if (transaction) {
    setForm({
      tipo: transaction.tipo,
      valor: transaction.valor,
      // ...
    })
  }
}, [transaction])
```

**Lógica de salvar:**
```jsx
if (transaction) {
  await api.put(`/transactions/${transaction.id}`, form)  // Editar
} else {
  await api.post('/transactions', form)                   // Criar
}
```

**Fechar clicando fora:**
```jsx
<div className="modal-overlay" onClick={onClose}>        // Overlay fecha
  <div className="modal" onClick={e => e.stopPropagation()}>  // Modal não fecha
```

---

### ProfileModal.jsx

**O que faz:** Modal para editar nome, e-mail e senha do usuário logado. Envia apenas os campos que foram alterados.

**Lógica de diff (enviar só o que mudou):**
```jsx
const payload = {}
if (form.nome !== user.nome)   payload.nome = form.nome
if (form.email !== user.email) payload.email = form.email
if (form.senha)                payload.senha = form.senha

if (Object.keys(payload).length === 0) {
  return setSuccess('Nenhuma alteração detectada.')
}
```

---

### charts/ExpensePieChart.jsx

**O que faz:** Gráfico de rosca (donut chart) que mostra os gastos por categoria.

**Props:**
```jsx
<ExpensePieChart
  data={[
    { name: 'Alimentação', value: 450 },
    { name: 'Transporte',  value: 200 },
    { name: 'Lazer',       value: 150 },
  ]}
/>
```

**Estado vazio:**
```jsx
if (!data || data.length === 0) {
  return <div className="empty-chart">Nenhuma despesa registrada</div>
}
```

**Cores automáticas:** Um array de 8 cores é ciclado automaticamente para cada fatia.

---

## 🧱 Componentes utilitários genéricos

Esses componentes não pertencem a nenhuma feature específica — são blocos usados em várias telas diferentes.

### Alert.jsx

**O que faz:** Caixa de mensagem de erro ou sucesso, usada em praticamente toda tela e modal do sistema.

**Props:**
```jsx
<Alert type="error">Mensagem de erro</Alert>
<Alert type="success">Mensagem de sucesso</Alert>
```

**Acessibilidade:** o `role` muda com o tipo — `role="alert"` para erro e `role="status"` para sucesso. Os dois já têm `aria-live` implícito no navegador, então um leitor de tela anuncia a mensagem sozinho assim que ela aparece, sem o usuário precisar navegar até ela.

---

### Modal.jsx

**O que faz:** Casca genérica de modal (overlay + caixa central) usada por praticamente todos os modais do sistema (`MetaModal`, `ContaModal`, `EventoModal` etc.) em vez de cada um reimplementar o próprio overlay.

**Props:**
```jsx
<Modal onClose={onClose} wide={false}>
  {children}
</Modal>
```

**Funcionalidades:**
- Fecha ao clicar fora (`onClose`) ou ao apertar `Esc`
- **Focus trap:** `Tab` na última opção focável volta pra primeira, `Shift+Tab` na primeira vai pra última — sem isso o foco escaparia pro conteúdo atrás do modal
- Foca automaticamente o próprio modal ao abrir (`role="dialog"`, `aria-modal="true"`)
- `wide` deixa o modal mais largo (usado por `AnexoViewer` e `OFXImportModal`, que precisam de mais espaço)

---

### ConfirmDialog.jsx

**O que faz:** Modal de confirmação genérico para ações destrutivas (excluir meta, sair da família, desfazer transferência, etc.), construído em cima do `Modal`.

**Props:**
```jsx
<ConfirmDialog
  title="Excluir meta"
  message="Tem certeza que deseja excluir esta meta? Essa ação não pode ser desfeita."
  confirmLabel="Excluir"
  onConfirm={confirmDelete}
  onCancel={() => setDeleteMetaId(null)}
/>
```

Usado em praticamente toda página que lista itens (`Goals`, `Budgets`, `Recurring`, `Contas`, `Categorias`, `Familia`, `Eventos`, `Grupos` etc.) para confirmar exclusões e outras ações sem volta.

---

### Skeleton.jsx

**O que faz:** Placeholders de carregamento ("esqueleto" cinza pulsante) mostrados enquanto os dados da página ainda não chegaram, no lugar de um spinner genérico — dá uma ideia do formato do conteúdo que vai aparecer.

**Exporta três variantes prontas**, além do bloco básico `Skeleton`:
```jsx
<SkeletonCards count={3} />  // imita os cards de resumo (SummaryCards)
<SkeletonList rows={4} />    // imita uma lista de transações/cards
<SkeletonChart height={280} />  // imita um gráfico de rosca
```

Usado em quase toda página enquanto `loading === true` (`Dashboard`, `Goals`, `Budgets`, `Recurring`, `Contas`, `Categorias`, `Familia`, `Eventos`, `EventoDetalhe`, `Grupos`, `GrupoDetalhe`).

---

### PasswordMatchHint.jsx

**O que faz:** Texto de feedback ao vivo abaixo do campo "confirmar senha", mostrando se as senhas já digitadas coincidem ou não — enquanto o usuário ainda está digitando, sem esperar o submit.

**Props:**
```jsx
<PasswordMatchHint id="register-confirmar-hint" senha={form.senha} confirmar={form.confirmar} />
```

Não substitui a validação no submit (que continua bloqueando o envio se as senhas não baterem) — é só uma ajuda visual. Usado em `Register.jsx` e `ResetPassword.jsx`.

---

### ThemeToggle.jsx

**O que faz:** Botão que alterna entre tema claro e escuro, usando o `ThemeContext`. Mostra 🌙 no tema claro (pra trocar pra escuro) e ☀️ no tema escuro (pra trocar pra claro).

**Props:** nenhuma (usa `useTheme()` direto). Aparece na `Landing` e na `Navbar`.

---

## 🎯 Componentes de Metas (`Goals.jsx`)

### MetaCard.jsx

**O que faz:** Card de uma meta financeira com barra de progresso, valor faltante (ou prazo), botão de novo aporte e um histórico de aportes que expande/recolhe.

**Props:**
```jsx
<MetaCard
  meta={{ id, titulo, valorAlvo, valorAtual, prazo, concluida, aportes: [...] }}
  onEdit={handleEdit}
  onDelete={setDeleteMetaId}
  onAddAporte={setAporteMeta}
  onDeleteAporte={(meta, aporteId) => ...}
/>
```

Quando `meta.concluida` é `true`, o card ganha a classe `meta-card--concluida` e mostra "🎉 Meta concluída" no lugar do texto de "faltam R$X".

---

### MetaModal.jsx

**O que faz:** Modal de criar/editar uma meta (título, valor-alvo, prazo opcional). Detecta criar vs. editar pela prop `meta`, igual ao `TransactionModal`.

**Props:**
```jsx
<MetaModal meta={null} onClose={onClose} onSaved={onSaved} />
```

---

### AporteModal.jsx

**O que faz:** Modal para registrar um aporte (depósito) numa meta específica — valor, data (padrão hoje) e descrição opcional.

**Props:**
```jsx
<AporteModal meta={metaSelecionada} onClose={onClose} onSaved={onSaved} />
```

---

## 📉 Componentes de Orçamentos (`Budgets.jsx`)

### BudgetCard.jsx

**O que faz:** Card de um orçamento mensal por categoria, com barra de progresso que muda de cor conforme o gasto se aproxima do limite.

**Níveis de progresso** (mesma lógica usada em `EventoCard`/`EventoDetalhe`):
```jsx
function progressLevel(percentual, estourado) {
  if (estourado) return 'over'   // vermelho — passou do limite
  if (percentual >= 80) return 'warn'  // amarelo — perto do limite
  return 'ok'                    // verde
}
```

---

### BudgetModal.jsx

**O que faz:** Modal de criar/editar um orçamento. O select de categoria só mostra categorias de despesa que **ainda não têm** orçamento no mês (exceto a categoria do orçamento sendo editado) — usa `useCategorias()` para a lista completa e a prop `existingCategorias` para filtrar.

**Props:**
```jsx
<BudgetModal
  orcamento={null}
  existingCategorias={orcamentos.map(o => o.categoria)}
  onClose={onClose}
  onSaved={onSaved}
/>
```

Se não sobrar nenhuma categoria disponível, o modal mostra uma mensagem em vez do formulário.

---

## 🔁 Componentes de Recorrências (`Recurring.jsx`)

### RecurringCard.jsx

**O que faz:** Card de uma transação recorrente (aluguel, assinatura, salário), mostrando valor, categoria, dia do mês em que é lançada e um botão para pausar/retomar sem excluir.

**Props:**
```jsx
<RecurringCard recorrencia={{...}} onEdit={handleEdit} onDelete={setDeleteId} onToggleAtiva={handleToggleAtiva} />
```

---

### RecurringModal.jsx

**O que faz:** Modal de criar/editar uma recorrência: tipo (receita/despesa), valor, categoria, conta, descrição, dia do mês, data de início/fim opcional e (só ao editar) um checkbox "Ativa".

**Detalhe:** a data de início não pode ser alterada depois de criada (campo fica `disabled` ao editar), porque mudar o início retroativamente bagunçaria quais lançamentos já foram gerados.

---

## 🏦 Componentes de Contas (`Contas.jsx`)

### ContaCard.jsx

**O que faz:** Card de uma conta (corrente, cartão, carteira, etc.), mostrando ícone do tipo, saldo (formatado na moeda da própria conta) e o tipo por extenso. Se a moeda não for BRL, mostra o código da moeda ao lado do tipo.

---

### ContaModal.jsx

**O que faz:** Modal de criar/editar uma conta: nome, tipo (select com ícone), saldo inicial e — só na criação — a moeda (`moeda`).

**Detalhe importante (multi-moeda):** a moeda só pode ser escolhida ao **criar** a conta; depois disso fica fixa e não aparece mais como select (só um campo desabilitado mostrando o valor), porque mudar a moeda de uma conta que já tem transações lançadas invalidaria todos os valores já registrados. As opções de moeda vêm de `GET /cambio`.

---

### TransferModal.jsx

**O que faz:** Modal de transferência entre duas contas do usuário (conta de origem, conta de destino, valor, data, descrição opcional). O select "Para" exclui automaticamente a conta já escolhida em "De".

---

### ConectarBancoModal.jsx

**O que faz:** Fluxo de conexão bancária via Open Finance, usando o widget da Pluggy (`react-pluggy-connect`). Passa por três fases: `carregando` (pede um connect token ao backend), `widget` (mostra o `PluggyConnect`, que cuida do login/MFA no próprio banco) e `sincronizando` (faz polling em `POST /open-finance/conexoes/:id/sincronizar` a cada 3s, por até ~2 minutos, até o status virar `UPDATED` ou dar erro).

**Props:**
```jsx
<ConectarBancoModal onClose={onClose} onConnected={handleBancoConectado} />
```

Se a sincronização ainda não tiver terminado depois do tempo máximo de polling, o modal chama `onConnected` mesmo assim com uma flag `aindaSincronizando: true`, avisando o usuário que pode conferir depois em vez de travar o modal aberto indefinidamente.

---

### ConexaoBancariaCard.jsx

**O que faz:** Card de uma conexão bancária já estabelecida, mostrando o nome do banco, quais contas ela alimenta, a última sincronização e um badge de status (`Conectado`, `Sincronizando...`, `Erro de login`, `Erro na sincronização`). Tem um botão "Sincronizar agora" pra forçar uma nova busca sem esperar a próxima automática.

---

### CotacoesPanel.jsx

**O que faz:** Painel de cotações de câmbio, mostrado na tela de Contas **só quando o usuário tem pelo menos uma conta em moeda estrangeira** (se só usa BRL, o componente retorna `null` e não renderiza nada). Lista as moedas em uso com a taxa atual e tem um botão para forçar atualização (`POST /cambio/atualizar`).

**Props:**
```jsx
<CotacoesPanel contas={contas} />
```

---

## 🎨 Componentes de Categorias (`Categorias.jsx`)

### CategoriaChip.jsx

**O que faz:** "Pílula" visual de uma categoria personalizada, com ícone, nome e cor de fundo (definida via CSS custom property `--categoria-cor`), mais botões de editar/excluir.

---

### CategoriaModal.jsx

**O que faz:** Modal de criar/editar uma categoria: nome, ícone (emoji, campo de texto livre) e cor (`input type="color"`). O seletor de tipo (receita/despesa) só aparece ao **criar** — depois de criada, o tipo de uma categoria não pode mudar.

---

## 💡 Componentes de insights e importação (Dashboard)

### InsightsPanel.jsx

**O que faz:** Fileira de cartões curtos com observações automáticas sobre o mês atual — vindas prontas do backend (`GET /reports/insights`), o componente só escolhe o ícone e monta a frase certa pra cada `tipo` de insight (orçamento estourado, categoria em alta/queda, despesas totais em alta/queda, meta próxima do valor-alvo, maior categoria do mês, categoria nova). Não renderiza nada se a lista vier vazia.

**Props:**
```jsx
<InsightsPanel insights={[{ tipo: 'orcamento_estourado', tom: 'danger', categoria: 'Lazer', gasto: 500, valorLimite: 400 }, ...]} />
```

---

### ProjectionCard.jsx

**O que faz:** Card com a projeção de saldo até o fim do mês (`GET /reports/projecao`), combinando o saldo atual, recorrências futuras já conhecidas e uma estimativa de gasto restante baseada no ritmo atual. Não renderiza nada se `projecao` for `null`.

**Props:**
```jsx
<ProjectionCard projecao={{ saldoAtual, saldoProjetado, receitasRecorrentesFuturas, despesasRecorrentesFuturas, estimativaGastosRestante, diasRestantes, fimDoMes }} />
```

---

### OFXImportModal.jsx

**O que faz:** Importação de extrato bancário em formato OFX, em três passos: **upload** (arrastar/soltar ou selecionar o arquivo `.ofx`/`.ofc`, parseado no próprio navegador por `utils/ofxParser.js`), **preview** (tabela com cada transação detectada, checkbox pra incluir/excluir, categoria sugerida editável e conta de destino) e **done** (resumo de quantas foram importadas, com atalhos pra ver no Dashboard ou em Relatórios).

**Props:**
```jsx
<OFXImportModal contas={contas} onClose={onClose} onImported={fetchData} />
```

O import de verdade só acontece no passo de preview, via `POST /transactions/bulk` com as transações selecionadas.

---

### AnexoViewer.jsx

**O que faz:** Modal que busca e mostra o comprovante anexado a uma transação (`GET /transactions/:id/anexo`) — imagem ou PDF (detecta pelo prefixo `data:application/pdf` da string retornada) — com um botão de download.

**Props:**
```jsx
<AnexoViewer transactionId={id} onClose={onClose} />
```

Usado no Dashboard, em `EventoDetalhe` e dentro do próprio `TransactionModal` (pra revisar o anexo já salvo antes de trocar/remover).

---

### HistoricoViewer.jsx

**O que faz:** Modal que busca e lista o histórico de edições de uma transação (`GET /transactions/:id/historico`), mostrando data/hora de cada edição e, campo a campo, o valor de antes (`de`) e depois (`para`) — formatando cada tipo de campo de forma legível (moeda, data, nome da conta pelo id, etc.).

**Props:**
```jsx
<HistoricoViewer transactionId={id} contas={contas} onClose={onClose} />
```

---

## ✈️ Componentes de Eventos (`Eventos.jsx`, `EventoDetalhe.jsx`)

### EventoCard.jsx

**O que faz:** Card de um evento (ex: uma viagem), com barra de progresso de orçamento (se definido) e status (Ativo/Encerrado). O card inteiro é clicável e navega pro detalhe do evento; os botões de editar/excluir/encerrar ficam dentro dele e usam `e.stopPropagation()` pra não disparar a navegação junto.

---

### EventoModal.jsx

**O que faz:** Modal de criar/editar um evento: nome, data de início, data de fim opcional e orçamento opcional (teto de gasto pra acompanhar progresso).

---

## 🤝 Componentes de Grupos (`Grupos.jsx`, `GrupoDetalhe.jsx`)

> **Importante:** `Grupo` é uma estrutura diferente de `Familia`. Um usuário pertence a exatamente uma família (a carteira compartilhada padrão), mas pode participar de **vários** grupos ao mesmo tempo — e um grupo pode ter membros **convidados**, que não têm conta no sistema (só um nome, cadastrado pelo próprio grupo).

### GrupoCard.jsx

**O que faz:** Card resumido de um grupo (nome, papel do usuário nele, número de membros, código), clicável, que navega pro detalhe (`GrupoDetalhe.jsx`).

---

### GrupoModal.jsx

**O que faz:** Modal simples de criar um novo grupo — só pede o nome. (Não existe edição de grupo por aqui; o nome não pode ser alterado depois de criado.)

---

### DespesaGrupoModal.jsx

**O que faz:** Modal de criar/editar uma despesa de grupo: descrição, valor total, data, quem pagou e quais membros participam da divisão (checkboxes, com "selecionar todos"). Mostra uma prévia de quanto cada participante selecionado deve, calculada no próprio frontend.

**Divisão em centavos:**
```jsx
function splitPreview(valorTotal, participanteIds) {
  const totalCents = Math.round(valorTotal * 100)
  const base = Math.floor(totalCents / participanteIds.length)
  const leftover = totalCents - base * participanteIds.length
  // os primeiros `leftover` participantes recebem 1 centavo a mais,
  // pra não perder nem sobrar centavo na divisão
}
```
Essa é só uma prévia visual — quem decide o valor de verdade é o backend, que roda a mesma lógica de novo no submit (`utils/splitDespesaGrupo.js` no backend).

**Props:**
```jsx
<DespesaGrupoModal
  grupoId={id}
  despesa={null}
  membros={grupo.membros}
  defaultPagoPorMembroId={meuMembro?.id}
  onClose={onClose}
  onSaved={onSaved}
/>
```

---

### PagamentoGrupoModal.jsx

**O que faz:** Modal de registrar um pagamento (quitação de dívida) entre dois membros do grupo: quem pagou, para quem, valor e data.

**Pré-preenchimento a partir de um saldo:** quando aberto a partir do botão "Quitar" de uma linha em `SaldosGrupo`, recebe a prop `prefill` com `{ deMembroId, paraMembroId, valor }` daquela dívida específica — os campos já chegam prontos pra confirmar, mas continuam editáveis (por exemplo, pra registrar um pagamento parcial em vez do valor total da dívida).

```jsx
const [form, setForm] = useState({
  deMembroId: prefill?.deMembroId ?? (membros[0]?.id ?? ''),
  paraMembroId: prefill?.paraMembroId ?? (membros[1]?.id ?? membros[0]?.id ?? ''),
  valor: prefill?.valor ?? '',
  data: todayLocal(),
})
```

**Props:**
```jsx
<PagamentoGrupoModal grupoId={id} membros={grupo.membros} prefill={pagamentoPrefill} onClose={onClose} onSaved={onSaved} />
```

---

### SaldosGrupo.jsx

**O que faz:** Lista "quem deve quem" dentro de um grupo, a partir dos saldos já calculados pelo backend (sem simplificação de dívidas — cada par que se deve algo aparece como uma linha própria). Cada linha é colorida em relação ao membro logado: verde quando é a favor dele (alguém deve a ele), vermelho quando é contra (ele deve a alguém). Cada linha tem um botão **"Quitar"**, que aciona `onQuitar(saldo)` — usado por `GrupoDetalhe.jsx` para abrir o `PagamentoGrupoModal` já pré-preenchido com aquela dívida específica.

**Props:**
```jsx
<SaldosGrupo saldos={grupo.saldos} membros={grupo.membros} meuMembroId={meuMembro?.id} onQuitar={handleQuitarSaldo} />
```

Se não houver dívidas pendentes, mostra uma mensagem simples em vez da lista.

---

## Hooks customizados (`src/hooks/`)

### useInstallPrompt.js

**O que faz:** Captura o evento `beforeinstallprompt` do navegador (Chrome/Edge), que só dispara quando o app já atende aos critérios de instalabilidade como PWA (manifest + service worker). Isso permite oferecer um botão de "Instalar" próprio, controlado pela UI, em vez de depender só do ícone que o navegador mostra sozinho na barra de endereço.

**O que expõe:**
```jsx
const { canInstall, promptInstall } = useInstallPrompt()
```

| Valor/Função | Descrição |
|---|---|
| `canInstall` | `true` quando o navegador já sinalizou que o app pode ser instalado |
| `promptInstall()` | Dispara o prompt nativo de instalação (o navegador só permite usar uma vez por evento capturado) |

Usado só na `Landing.jsx`, no botão "📱 Instalar no celular" — não existe uma página ou componente dedicado a PWA, é só esse hook surfaced na landing.

---

## Contextos (`src/context/`)

### AuthContext.jsx

**O que faz:** Gerencia o estado global de autenticação. Persiste o usuário entre recarregamentos da página usando localStorage.

**O que expõe:**
```jsx
const { user, loading, login, register, logout, updateProfile } = useAuth()
```

| Valor/Função | Tipo | Descrição |
|-------------|------|-----------|
| `user` | objeto ou `null` | Usuário logado (ou null se não logado) |
| `loading` | boolean | `true` enquanto verifica o token salvo |
| `login(email, senha)` | async function | Autentica e atualiza `user` |
| `register(nome, email, senha)` | async function | Cadastra e autentica |
| `logout()` | function | Limpa tudo e define `user = null` |
| `updateProfile(payload)` | async function | Atualiza dados e `user` no estado |

---

### ThemeContext.jsx

**O que faz:** Gerencia o tema claro/escuro da aplicação e persiste a escolha em `localStorage`. Aplica o tema mudando um atributo `data-theme` no `<html>` (usado pelas variáveis CSS de `index.css`).

**O que expõe:**
```jsx
const { theme, toggleTheme } = useTheme()
```

| Valor/Função | Tipo | Descrição |
|---|---|---|
| `theme` | `'light'` ou `'dark'` | Tema atual (padrão é `'dark'` se não houver nada salvo) |
| `toggleTheme()` | function | Alterna o tema e salva a escolha |

---

### CategoriasContext.jsx

**O que faz:** Mantém as categorias (receita e despesa) do usuário carregadas globalmente, pra não precisar refazer o `GET /categorias` em toda tela que precisa de um select de categorias (Dashboard, `TransactionModal`, `RecurringModal`, `BudgetModal`, `OFXImportModal`, etc.). Recarrega automaticamente quando o usuário muda (login/logout), usando o `user` do `AuthContext`.

**O que expõe:**
```jsx
const {
  categorias, loading, refetch,
  categoriasPorTipo, todasCategorias,
  categoriasReceita, categoriasDespesa,
  getCategoriaInfo,
} = useCategorias()
```

| Valor/Função | Descrição |
|---|---|
| `categorias` | Lista completa (objetos com `id`, `nome`, `tipo`, `icone`, `cor`) |
| `categoriasPorTipo(tipo)` | Retorna só os nomes das categorias de um tipo (`'receita'` ou `'despesa'`) |
| `todasCategorias` | Nomes únicos de todas as categorias, ordenados alfabeticamente (com "Outros" sempre por último) |
| `categoriasReceita` / `categoriasDespesa` | Atalhos já filtrados por tipo |
| `getCategoriaInfo(nome, tipo)` | Retorna `{ icone, cor }` de uma categoria pelo nome, com fallback neutro (💰 / roxo) se ela não existir mais (ex: foi excluída depois de já ter sido usada em alguma transação) |

---

## Serviços (`src/services/`)

### api.js

Instância configurada do Axios:

```js
const api = axios.create({ baseURL: '/api' })
```

**Funcionalidades:**
1. **baseURL**: todas as chamadas começam com `/api` automaticamente
2. **Token automático**: injeta o JWT no header de todas as requisições
3. **Interceptor 401**: se o token expirar, redireciona para login automaticamente
