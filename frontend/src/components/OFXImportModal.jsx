import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { readOFXFile, parseOFX } from '../utils/ofxParser'
import { fmt } from '../utils/format'
import api from '../services/api'
import { useCategorias } from '../context/CategoriasContext'
import Modal from './Modal'
import Alert from './Alert'
import { Loader2, X } from 'lucide-react'

export default function OFXImportModal({ contas, onClose, onImported }) {
  const navigate = useNavigate()
  const { todasCategorias } = useCategorias()
  const [step, setStep]               = useState('upload') // upload | preview | done
  const [transactions, setTransactions] = useState([])
  const [contaId, setContaId]         = useState(contas?.[0]?.id || '')
  const [error, setError]             = useState('')
  const [importing, setImporting]     = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [importedMonth, setImportedMonth] = useState(null)
  const [dragging, setDragging]       = useState(false)
  const inputRef = useRef(null)

  const processFile = async (file) => {
    setError('')
    try {
      if (!/\.(ofx|ofc)$/i.test(file.name)) {
        throw new Error('Arquivo inválido. Selecione um arquivo .ofx exportado pelo seu banco.')
      }
      const content = await readOFXFile(file)
      const txs = parseOFX(content)
      setTransactions(txs)
      setStep('preview')
    } catch (err) {
      setError(err.message || 'Erro ao processar o arquivo OFX.')
    }
  }

  const handleFileInput  = (e) => { const f = e.target.files?.[0]; if (f) processFile(f) }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }, [])

  const toggle       = (key)            => setTransactions(p => p.map(t => t._key === key ? { ...t, selected: !t.selected } : t))
  const toggleAll    = (val)            => setTransactions(p => p.map(t => ({ ...t, selected: val })))
  const setcat       = (key, categoria) => setTransactions(p => p.map(t => t._key === key ? { ...t, categoria } : t))
  const setCustomCat = (key, value)     => setTransactions(p => p.map(t => t._key === key ? { ...t, customCategoria: value } : t))

  const resolveCategoria = (t) =>
    t.categoria === 'Outros' && t.customCategoria?.trim() ? t.customCategoria.trim() : t.categoria

  const handleImport = async () => {
    const toImport = transactions.filter(t => t.selected)
    if (!toImport.length) { setError('Selecione ao menos uma transação.'); return }
    setImporting(true)
    setError('')
    try {
      const { data } = await api.post('/transactions/bulk', {
        contaId,
        transactions: toImport.map(t => ({
          tipo: t.tipo, valor: t.valor, categoria: resolveCategoria(t), descricao: t.descricao, data: t.data,
        })),
      })
      setImportedCount(data.count)
      // detect the most frequent month among imported transactions
      const monthCounts = {}
      for (const t of toImport) {
        const m = t.data.slice(0, 7)
        monthCounts[m] = (monthCounts[m] || 0) + 1
      }
      const topMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
      setImportedMonth(topMonth)
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao importar transações.')
    } finally {
      setImporting(false)
    }
  }

  const selected = transactions.filter(t => t.selected)
  const totalReceitas = selected.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0)
  const totalDespesas = selected.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0)

  return (
    <Modal onClose={onClose} wide>
      <div className="modal-header">
        <h3>Importar OFX</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* ── STEP 1: upload ── */}
        {step === 'upload' && (
          <>
            <div
              className={`ofx-dropzone${dragging ? ' ofx-dropzone--active' : ''}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="ofx-dropzone-icon">📂</div>
              <p className="ofx-dropzone-title">Arraste o arquivo OFX aqui</p>
              <p className="ofx-dropzone-sub">ou clique para selecionar · .ofx</p>
              <input ref={inputRef} type="file" accept=".ofx,.ofc" style={{ display: 'none' }} onChange={handleFileInput} />
            </div>
            <p className="ofx-hint">
              Exporte o extrato da sua conta bancária em formato OFX e importe aqui. A maioria dos bancos brasileiros disponibiliza essa opção no internet banking.
            </p>
          </>
        )}

        {/* ── STEP 2: preview ── */}
        {step === 'preview' && (
          <>
            <div className="ofx-preview-header">
              <span className="ofx-preview-count">{transactions.length} transação(ões) encontrada(s)</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label htmlFor="ofx-conta" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Importar para</label>
                <select id="ofx-conta" value={contaId} onChange={e => setContaId(Number(e.target.value))}>
                  {contas?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <button className="btn btn-sm btn-outline" onClick={() => toggleAll(true)}>Selecionar todos</button>
                <button className="btn btn-sm btn-outline" onClick={() => toggleAll(false)}>Desmarcar todos</button>
              </div>
            </div>

            <div className="ofx-table-wrap">
              <table className="ofx-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Tipo</th>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t._key} className={t.selected ? '' : 'ofx-row--unselected'}>
                      <td>
                        <input
                          type="checkbox"
                          checked={t.selected}
                          onChange={() => toggle(t._key)}
                          aria-label={`Selecionar transação de ${fmt(t.valor)} em ${t.data.split('-').reverse().join('/')}${t.descricao ? ` — ${t.descricao}` : ''}`}
                        />
                      </td>
                      <td>
                        <span className={`ofx-badge ofx-badge--${t.tipo}`}>
                          {t.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}
                        </span>
                      </td>
                      <td className="ofx-date">{t.data.split('-').reverse().join('/')}</td>
                      <td className="ofx-desc" title={t.descricao}>{t.descricao}</td>
                      <td>
                        <select className="ofx-cat-select" value={t.categoria} onChange={e => setcat(t._key, e.target.value)}>
                          {todasCategorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {t.categoria === 'Outros' && (
                          <input
                            type="text"
                            className="ofx-cat-custom"
                            value={t.customCategoria || ''}
                            onChange={e => setCustomCat(t._key, e.target.value)}
                            placeholder="Especifique..."
                          />
                        )}
                      </td>
                      <td className={`ofx-amount ofx-amount--${t.tipo}`}>
                        {t.tipo === 'receita' ? '+' : '-'}{fmt(t.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ofx-summary">
              <span className="ofx-summary-item positive">↑ {fmt(totalReceitas)}</span>
              <span className="ofx-summary-item negative">↓ {fmt(totalDespesas)}</span>
            </div>

            <div className="modal-footer">
              <span className="ofx-footer-info">{selected.length} de {transactions.length} selecionada(s)</span>
              <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing || !selected.length}>
                {importing && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
                {importing ? 'Importando...' : `Importar ${selected.length} transação(ões)`}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: done ── */}
        {step === 'done' && (
          <div className="ofx-done">
            <div className="ofx-done-icon">✅</div>
            <p className="ofx-done-title">{importedCount} transação(ões) importada(s) com sucesso!</p>
            {importedMonth && (
              <p className="ofx-done-sub">
                As transações são do período <strong>{importedMonth.split('-').reverse().join('/')}</strong>
              </p>
            )}
            <div className="modal-footer" style={{ justifyContent: 'center', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => { onImported(); onClose() }}>
                Ver no Dashboard
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onClose()
                  navigate(`/reports${importedMonth ? `?month=${importedMonth}` : ''}`)
                }}
              >
                Ver em Relatórios
              </button>
            </div>
          </div>
        )}
    </Modal>
  )
}
