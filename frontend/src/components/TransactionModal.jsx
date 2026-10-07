import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useCategorias } from '../context/CategoriasContext'
import { processAnexoFile } from '../utils/anexoFile'
import { aprenderCategoria, sugerirCategoria, categoriasMaisUsadas } from '../utils/categoriaInteligente'
import { haptic } from '../utils/haptics'
import Modal from './Modal'
import Alert from './Alert'
import AnexoViewer from './AnexoViewer'
import MoneyInput from './MoneyInput'
import { AlertCircle, ArrowDownLeft, ArrowUpRight, Loader2, Paperclip, Sparkles, X } from 'lucide-react'

// new Date().toISOString() é UTC — perto da meia-noite no Brasil (UTC-3) isso adianta
// a data em um dia. Aqui montamos a data local manualmente para evitar esse desvio.
function dataLocal(diasAtras = 0) {
  const d = new Date()
  d.setDate(d.getDate() - diasAtras)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

const CAMPOS_EM_ORDEM = ['valor', 'contaId', 'data']

function validar(form) {
  const erros = {}
  if (form.valor === '' || form.valor === '-') erros.valor = 'Informe o valor da transação.'
  else if (!(Number(form.valor) > 0)) erros.valor = 'O valor precisa ser maior que zero.'
  if (!form.contaId) erros.contaId = 'Escolha a conta.'
  if (!form.data) erros.data = 'Informe a data.'
  return erros
}

export default function TransactionModal({ transaction, contas, eventos = [], defaultEventoId, onClose, onSaved }) {
  const { categoriasPorTipo } = useCategorias()
  const [form, setForm] = useState({
    tipo: 'despesa',
    valor: '',
    categoria: 'Outros',
    descricao: '',
    data: dataLocal(),
    contaId: transaction?.contaId || contas?.[0]?.id || '',
    eventoId: transaction?.eventoId ?? defaultEventoId ?? '',
  })
  const [customCategoria, setCustomCategoria] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Validação ao vivo: o erro de um campo aparece depois que a pessoa sai dele (ou tenta
  // salvar), não enquanto ainda está digitando pela primeira vez.
  const [tocados, setTocados] = useState({})
  const [tentouSalvar, setTentouSalvar] = useState(false)
  const [tremer, setTremer] = useState(false)
  const formRef = useRef(null)

  // Sugestão de categoria pela descrição — só enquanto a pessoa não escolheu uma na mão.
  const [categoriaManual, setCategoriaManual] = useState(Boolean(transaction))
  const [categoriaSugerida, setCategoriaSugerida] = useState(false)

  const [anexoAtualNome, setAnexoAtualNome] = useState(transaction?.anexoNome || null)
  const [novoAnexo, setNovoAnexo] = useState(null) // { dataUrl, nome } | null
  const [anexoRemovido, setAnexoRemovido] = useState(false)
  const [anexoError, setAnexoError] = useState('')
  const [showAnexoViewer, setShowAnexoViewer] = useState(false)
  const anexoInputRef = useRef(null)

  useEffect(() => {
    if (transaction) {
      const cats = categoriasPorTipo(transaction.tipo)
      const isCustom = !cats.includes(transaction.categoria)
      setForm({
        tipo: transaction.tipo,
        valor: transaction.valor,
        categoria: isCustom ? 'Outros' : transaction.categoria,
        descricao: transaction.descricao || '',
        data: transaction.data,
        contaId: transaction.contaId,
        eventoId: transaction.eventoId ?? '',
      })
      setCustomCategoria(isCustom ? transaction.categoria : '')
      setAnexoAtualNome(transaction.anexoNome || null)
    }
  }, [transaction])

  // Reset categoria quando tipo muda, caso a categoria atual não exista no novo tipo
  useEffect(() => {
    const cats = categoriasPorTipo(form.tipo)
    if (!cats.includes(form.categoria)) {
      const sugerida = !categoriaManual && sugerirCategoria(form.descricao, form.tipo, cats)
      setForm(f => ({ ...f, categoria: sugerida || cats[0] }))
      setCategoriaSugerida(Boolean(sugerida))
      setCustomCategoria('')
    }
  }, [form.tipo])

  const categorias = categoriasPorTipo(form.tipo)
  const maisUsadas = categoriasMaisUsadas(form.tipo, categorias)
  // Sem histórico ainda (primeiro uso / aparelho novo): mostra as primeiras da lista.
  const atalhosCategoria = maisUsadas.length > 0 ? maisUsadas : categorias.filter(c => c !== 'Outros').slice(0, 4)

  const erros = validar(form)
  const erroDe = (campo) => (tocados[campo] || tentouSalvar) ? erros[campo] : undefined
  const tocar = (campo) => () => setTocados(t => ({ ...t, [campo]: true }))

  const escolherCategoria = (categoria) => {
    setForm(f => ({ ...f, categoria }))
    setCategoriaManual(true)
    setCategoriaSugerida(false)
    haptic('light')
  }

  const handleDescricao = (e) => {
    const descricao = e.target.value
    const sugerida = !categoriaManual && sugerirCategoria(descricao, form.tipo, categorias)
    setForm(f => ({ ...f, descricao, ...(sugerida && { categoria: sugerida }) }))
    if (!categoriaManual) setCategoriaSugerida(Boolean(sugerida))
  }

  const handleAnexoChange = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      setAnexoError('')
      const dataUrl = await processAnexoFile(file)
      setNovoAnexo({ dataUrl, nome: file.name })
      setAnexoRemovido(false)
    } catch (err) {
      setAnexoError(err.message || 'Não foi possível processar o arquivo')
    }
  }

  const handleRemoveAnexo = () => {
    setNovoAnexo(null)
    setAnexoRemovido(true)
  }

  const anexoNomeExibido = novoAnexo ? novoAnexo.nome : (anexoRemovido ? null : anexoAtualNome)
  const podeVerAnexoAtual = Boolean(transaction) && Boolean(anexoAtualNome) && !novoAnexo && !anexoRemovido

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (Object.keys(erros).length > 0) {
      setTentouSalvar(true)
      setTremer(true)
      setTimeout(() => setTremer(false), 450)
      haptic('error')
      const primeiro = CAMPOS_EM_ORDEM.find(c => erros[c])
      formRef.current?.querySelector(`[data-campo="${primeiro}"]`)?.focus()
      return
    }

    const categoria = form.categoria === 'Outros' && customCategoria.trim()
      ? customCategoria.trim()
      : form.categoria

    setLoading(true)
    try {
      const payload = { ...form, categoria, eventoId: form.eventoId === '' ? null : Number(form.eventoId) }
      if (novoAnexo) {
        payload.anexo = novoAnexo.dataUrl
        payload.anexoNome = novoAnexo.nome
      } else if (anexoRemovido) {
        payload.anexo = null
      }
      if (transaction) {
        await api.put(`/transactions/${transaction.id}`, payload)
      } else {
        await api.post('/transactions', payload)
      }
      aprenderCategoria({ tipo: form.tipo, categoria: form.categoria, descricao: form.descricao })
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar transação')
    } finally {
      setLoading(false)
    }
  }

  const ontem = dataLocal(1)
  const hoje = dataLocal(0)

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>{transaction ? 'Editar Transação' : 'Nova transação'}</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

        {error && <Alert type="error">{error}</Alert>}

        <form ref={formRef} onSubmit={handleSubmit} noValidate className={tremer ? 'form--shake' : undefined}>
          <div className="form-row">
            <label className={`type-btn ${form.tipo === 'receita' ? 'active-income' : ''}`}>
              <input
                type="radio"
                value="receita"
                checked={form.tipo === 'receita'}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
              />
              <ArrowDownLeft size={16} /> Receita
            </label>
            <label className={`type-btn ${form.tipo === 'despesa' ? 'active-expense' : ''}`}>
              <input
                type="radio"
                value="despesa"
                checked={form.tipo === 'despesa'}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
              />
              <ArrowUpRight size={16} /> Despesa
            </label>
          </div>

          <div className={`form-group${erroDe('valor') ? ' form-group--invalid' : ''}`}>
            <label htmlFor="tx-valor">Valor (R$)</label>
            <MoneyInput
              id="tx-valor"
              data-campo="valor"
              className="money-input-lg"
              value={form.valor}
              onChange={e => setForm({ ...form, valor: e.target.value })}
              onBlur={tocar('valor')}
              autoFocus={!transaction}
              aria-invalid={Boolean(erroDe('valor'))}
              aria-describedby={erroDe('valor') ? 'tx-valor-erro' : undefined}
              required
            />
            {erroDe('valor') && <span id="tx-valor-erro" className="field-error"><AlertCircle size={14} /> {erroDe('valor')}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="tx-descricao">Descrição (opcional)</label>
            <input
              id="tx-descricao"
              type="text"
              value={form.descricao}
              onChange={handleDescricao}
              placeholder="Ex: Supermercado Extra, Salário maio..."
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tx-categoria">Categoria</label>
            <div className="chip-row" role="group" aria-label={maisUsadas.length ? 'Categorias mais usadas' : 'Atalhos de categoria'}>
              {atalhosCategoria.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`chip${form.categoria === c ? ' chip--active' : ''}`}
                  aria-pressed={form.categoria === c}
                  onClick={() => escolherCategoria(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <select
              id="tx-categoria"
              value={form.categoria}
              onChange={e => escolherCategoria(e.target.value)}
            >
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {categoriaSugerida && (
              <span className="field-hint field-hint--magic" role="status">
                <Sparkles size={14} /> Sugerida pela descrição — é só trocar se não for essa.
              </span>
            )}
          </div>

          {form.categoria === 'Outros' && (
            <div className="form-group">
              <label htmlFor="tx-categoria-custom">Especifique a categoria</label>
              <input
                id="tx-categoria-custom"
                type="text"
                value={customCategoria}
                onChange={e => setCustomCategoria(e.target.value)}
                placeholder="Ex: Presente, Doação..."
              />
            </div>
          )}

          <div className={`form-group${erroDe('contaId') ? ' form-group--invalid' : ''}`}>
            <label htmlFor="tx-conta">Conta</label>
            <select
              id="tx-conta"
              data-campo="contaId"
              value={form.contaId}
              onChange={e => setForm({ ...form, contaId: Number(e.target.value) })}
              onBlur={tocar('contaId')}
              aria-invalid={Boolean(erroDe('contaId'))}
            >
              {contas?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {erroDe('contaId') && <span className="field-error"><AlertCircle size={14} /> {erroDe('contaId')}</span>}
          </div>

          <div className={`form-group${erroDe('data') ? ' form-group--invalid' : ''}`}>
            <label htmlFor="tx-data">Data</label>
            <div className="chip-row" role="group" aria-label="Atalhos de data">
              <button type="button" className={`chip${form.data === hoje ? ' chip--active' : ''}`} aria-pressed={form.data === hoje} onClick={() => { setForm({ ...form, data: hoje }); haptic('light') }}>Hoje</button>
              <button type="button" className={`chip${form.data === ontem ? ' chip--active' : ''}`} aria-pressed={form.data === ontem} onClick={() => { setForm({ ...form, data: ontem }); haptic('light') }}>Ontem</button>
            </div>
            <input
              id="tx-data"
              data-campo="data"
              type="date"
              value={form.data}
              onChange={e => setForm({ ...form, data: e.target.value })}
              onBlur={tocar('data')}
              aria-invalid={Boolean(erroDe('data'))}
              required
            />
            {erroDe('data') && <span className="field-error"><AlertCircle size={14} /> {erroDe('data')}</span>}
          </div>

          {eventos.length > 0 && (
            <div className="form-group">
              <label htmlFor="tx-evento">Evento (opcional)</label>
              <select
                id="tx-evento"
                value={form.eventoId}
                onChange={e => setForm({ ...form, eventoId: e.target.value })}
              >
                <option value="">Nenhum</option>
                {eventos
                  .filter(ev => ev.status === 'ativo' || ev.id === transaction?.eventoId)
                  .map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.nome}{ev.status === 'encerrado' ? ' (encerrado)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="tx-anexo">Comprovante (opcional)</label>
            {anexoError && <Alert type="error">{anexoError}</Alert>}
            {anexoNomeExibido ? (
              <div className="anexo-field">
                <span className="anexo-field-nome" title={anexoNomeExibido}><Paperclip size={14} /> {anexoNomeExibido}</span>
                <div className="anexo-field-actions">
                  {podeVerAnexoAtual && (
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowAnexoViewer(true)}>Ver</button>
                  )}
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => anexoInputRef.current?.click()}>Trocar</button>
                  <button type="button" className="btn btn-sm btn-outline" onClick={handleRemoveAnexo}>Remover</button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => anexoInputRef.current?.click()}>
                <Paperclip size={14} /> Anexar comprovante
              </button>
            )}
            <input
              id="tx-anexo"
              ref={anexoInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleAnexoChange}
              hidden
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
              {loading ? 'Salvando...' : transaction ? 'Atualizar' : 'Adicionar'}
            </button>
          </div>
        </form>

      {showAnexoViewer && (
        <AnexoViewer transactionId={transaction.id} onClose={() => setShowAnexoViewer(false)} />
      )}
    </Modal>
  )
}
