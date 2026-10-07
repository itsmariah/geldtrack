// Sugestão de categoria e "categorias mais usadas", compartilhadas entre a importação OFX
// e o formulário de transação. A memória (o que o usuário já escolheu pra cada descrição
// e quantas vezes usou cada categoria) fica no localStorage do aparelho.

const STORAGE_KEY = 'geldtrack:categorias'

// Palpite por palavras-chave na descrição/memo — usado no OFX desde sempre.
export function guessCategory(memo, tipo) {
  const m = (memo || '').toLowerCase()
  if (tipo === 'receita') {
    if (/sal[aá]rio|proventos|folha|rendimento/.test(m)) return 'Salário'
    if (/freelance|serviço|consultoria|honorário/.test(m)) return 'Freelance'
    if (/venda|mercadoria|produto|loja/.test(m)) return 'Venda'
    if (/investimento|dividendo|rendimento|cdb|fundo|ação|tesouro/.test(m)) return 'Investimentos'
    if (/aluguel receb|locação receb/.test(m)) return 'Aluguel recebido'
    return 'Outros'
  }
  if (/ifood|rappi|uber.eat|delivery|entrega|pede.logo/.test(m)) return 'Delivery'
  if (/mercado|supermercado|açougue|padaria|lanchonete|restaurante|lanche|pizza|hortifruti/.test(m)) return 'Alimentação'
  if (/uber|99taxi|taxi|táxi|ônibus|metrô|metro|combustív|gasolina|posto|estacionamento|pedágio/.test(m)) return 'Transporte'
  if (/farmácia|farmacia|médico|medico|hospital|plano.sa|saúde|saude|dentista|clínica|drogaria/.test(m)) return 'Saúde'
  if (/escola|faculdade|curso|mensalidade|educação|educacao|colégio|ensino/.test(m)) return 'Educação'
  if (/aluguel|condomín|condomin|água|agua|luz|energia|gás|internet|iptu|habitaç/.test(m)) return 'Moradia'
  if (/hotel|pousada|hostel|aéreo|passagem|viagem|airbnb|booking/.test(m)) return 'Viagem'
  if (/pet|veterin|ração|banho.tosa|canil|agropec/.test(m)) return 'Pets'
  if (/netflix|spotify|amazon|prime|disney|hbo|deezer|youtube|assinatura|mensalidade.app/.test(m)) return 'Assinaturas'
  if (/roupa|calçado|vestuário|vestuario|loja.roupas|zara|renner|c&a|hering/.test(m)) return 'Vestuário'
  if (/cinema|show|teatro|ingresso|lazer|parque/.test(m)) return 'Lazer'
  return 'Outros'
}

// "Mercado Pão de Açúcar 123" → "mercado pao de acucar"
export function normalizarDescricao(descricao) {
  return (descricao || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const memoriaLocal = {
  get() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
  },
  set(dados) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dados)) } catch { /* sem storage, sem memória */ }
  },
}

// Registra uma categoria escolhida: conta o uso e associa à descrição (inteira e à
// primeira palavra, pra "Uber" sugerir o mesmo que "Uber *viagem 123").
export function aprenderCategoria({ tipo, categoria, descricao }, store = memoriaLocal) {
  if (!tipo || !categoria) return
  const dados = store.get()
  const t = dados[tipo] || { usos: {}, descricoes: {} }
  t.usos[categoria] = (t.usos[categoria] || 0) + 1
  const norm = normalizarDescricao(descricao)
  if (norm) {
    t.descricoes[norm] = categoria
    t.descricoes[`#${norm.split(' ')[0]}`] = categoria
  }
  dados[tipo] = t
  store.set(dados)
}

// Melhor palpite pra descrição: o que o usuário já escolheu antes > palavra-chave.
// Só devolve categorias que existem em `disponiveis` (o usuário pode ter renomeado/apagado).
export function sugerirCategoria(descricao, tipo, disponiveis, store = memoriaLocal) {
  const norm = normalizarDescricao(descricao)
  if (norm.length < 3) return null
  const desc = store.get()[tipo]?.descricoes || {}
  const candidatos = [desc[norm], desc[`#${norm.split(' ')[0]}`], guessCategory(descricao, tipo)]
  return candidatos.find(c => c && c !== 'Outros' && disponiveis.includes(c)) || null
}

// Categorias mais usadas neste aparelho (só as que ainda existem), da mais pra menos usada.
export function categoriasMaisUsadas(tipo, disponiveis, limite = 4, store = memoriaLocal) {
  const usos = store.get()[tipo]?.usos || {}
  return Object.entries(usos)
    .filter(([c]) => disponiveis.includes(c) && c !== 'Outros')
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
    .map(([c]) => c)
}
