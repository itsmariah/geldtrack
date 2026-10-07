import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import SummaryCards from '../components/SummaryCards'
import ExpensePieChart from '../components/charts/ExpensePieChart'
import api from '../services/api'
import { fmt, fmtDate } from '../utils/format'
import { useTheme } from '../context/ThemeContext'
import { getChartTheme } from '../utils/chartTheme'
import { SkeletonCards, SkeletonList, SkeletonChart } from '../components/Skeleton'
import Alert from '../components/Alert'
import { ArrowDownLeft, ArrowUpRight, FileDown, Inbox, Loader2, Repeat, SearchX } from 'lucide-react'
import EmptyIllustration from '../components/EmptyIllustration'

// new Date().toISOString() é UTC — perto da virada do mês no Brasil (UTC-3) isso pode
// adiantar o mês padrão exibido. Aqui montamos o mês local manualmente para evitar isso.
function currentMonthLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function Reports() {
  const { theme } = useTheme()
  const chartTheme = getChartTheme(theme)
  const [searchParams] = useSearchParams()
  const [month, setMonth] = useState(searchParams.get('month') || currentMonthLocal())
  const [report, setReport] = useState(null)
  const [evolution, setEvolution] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [categoriaFilter, setCategoriaFilter] = useState('todas')
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [taxas, setTaxas] = useState({ BRL: 1 })
  const evolutionRef = useRef(null)
  const despesasChartRef = useRef(null)
  const receitasChartRef = useRef(null)

  // Transações da lista ficam na moeda original da conta; os cards/gráficos somam tudo
  // em BRL, então precisam converter primeiro — daí buscar as taxas aqui também.
  const converterParaBRL = (valor, moeda) => valor * (taxas[moeda || 'BRL'] ?? 1)

  useEffect(() => { fetchReport() }, [month])

  useEffect(() => {
    api.get('/reports/evolution').then(r => setEvolution(r.data)).catch(() => {})
    api.get('/cambio').then(r => setTaxas(r.data.taxas)).catch(() => {})
  }, [])

  // Reset category when month or tipo changes
  useEffect(() => { setCategoriaFilter('todas') }, [month, tipoFilter])

  const fetchReport = async () => {
    setLoading(true)
    setError('')
    try {
      const [monthlyRes, catRes] = await Promise.all([
        api.get('/reports/monthly', { params: { month } }),
        api.get('/reports/categories', {
          params: { start: `${month}-01`, end: `${month}-31` }
        }),
      ])
      setReport({ ...monthlyRes.data, categories: catRes.data })
    } catch (err) {
      console.error(err)
      setError('Não foi possível carregar o relatório. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Categories available for the current tipo selection
  const categorias = useMemo(() => {
    if (!report) return []
    const base = tipoFilter === 'todos'
      ? report.transactions
      : report.transactions.filter(t => t.tipo === tipoFilter)
    return [...new Set(base.map(t => t.categoria))].sort()
  }, [report, tipoFilter])

  // Transactions after applying both filters
  const filtered = useMemo(() => {
    if (!report) return []
    return report.transactions.filter(t => {
      const okTipo = tipoFilter === 'todos' || t.tipo === tipoFilter
      const okCat  = categoriaFilter === 'todas' || t.categoria === categoriaFilter
      return okTipo && okCat
    })
  }, [report, tipoFilter, categoriaFilter])

  // Summary cards recomputed from filtered set — convertido pra BRL, mais o
  // detalhamento por moeda (mesmo padrão do /reports/balance).
  const summary = useMemo(() => {
    let receitas = 0, despesas = 0
    const porMoedaMap = new Map()
    for (const t of filtered) {
      const moeda = t.conta?.moeda || 'BRL'
      const convertido = converterParaBRL(t.valor, moeda)
      if (t.tipo === 'receita') receitas += convertido; else despesas += convertido
      if (!porMoedaMap.has(moeda)) porMoedaMap.set(moeda, { moeda, receitas: 0, despesas: 0 })
      porMoedaMap.get(moeda)[t.tipo === 'receita' ? 'receitas' : 'despesas'] += t.valor
    }
    return { receitas, despesas, saldo: receitas - despesas, porMoeda: [...porMoedaMap.values()] }
  }, [filtered, taxas])

  // Pie charts computed from filtered set (convertido pra BRL pra poder comparar categorias
  // de contas em moedas diferentes na mesma fatia)
  const pieDataDespesas = useMemo(() => {
    const catMap = {}
    for (const t of filtered.filter(tx => tx.tipo === 'despesa')) {
      catMap[t.categoria] = (catMap[t.categoria] || 0) + converterParaBRL(t.valor, t.conta?.moeda)
    }
    return Object.entries(catMap).map(([name, value]) => ({ name, value }))
  }, [filtered, taxas])

  const pieDataReceitas = useMemo(() => {
    const catMap = {}
    for (const t of filtered.filter(tx => tx.tipo === 'receita')) {
      catMap[t.categoria] = (catMap[t.categoria] || 0) + converterParaBRL(t.valor, t.conta?.moeda)
    }
    return Object.entries(catMap).map(([name, value]) => ({ name, value }))
  }, [filtered, taxas])

  const evolutionData = evolution.map(e => ({
    mes: e.mes,
    Receitas: e.receitas,
    Despesas: e.despesas,
  }))

  const isFiltered = tipoFilter !== 'todos' || categoriaFilter !== 'todas'

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true)
    setError('')
    try {
      // Import dinâmico: jsPDF + html2canvas só entram no bundle de quem realmente
      // clica em "Baixar PDF", em vez de pesarem no carregamento inicial de todo mundo.
      const { generateReportPdf } = await import('../utils/generateReportPdf')
      await generateReportPdf({
        month,
        summary,
        transactions: filtered,
        chartRefs: { evolution: evolutionRef, despesas: despesasChartRef, receitas: receitasChartRef },
      })
    } catch (err) {
      console.error(err)
      setError('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <>
      <div className="dashboard-header">
        <h2>Relatórios</h2>
        <div className="header-actions">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="month-picker"
          />
          <button className="btn btn-outline" onClick={handleDownloadPdf} disabled={generatingPdf || loading || !report}>
            {generatingPdf ? <Loader2 size={16} className="icon-spin" aria-hidden="true" /> : <FileDown size={16} />} {generatingPdf ? 'Gerando PDF...' : 'Baixar PDF'}
          </button>
        </div>
      </div>

      <div className="reports-filters">
        <div className="filter-group">
          {[
            { key: 'todos',   label: 'Todos' },
            { key: 'receita', label: '↑ Receitas' },
            { key: 'despesa', label: '↓ Despesas' },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`filter-btn${tipoFilter === key ? ` filter-btn--${key}` : ''}`}
              onClick={() => setTipoFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          className="filter-select"
          value={categoriaFilter}
          onChange={e => setCategoriaFilter(e.target.value)}
          disabled={categorias.length === 0}
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {isFiltered && (
          <button
            className="btn btn-sm btn-outline"
            onClick={() => { setTipoFilter('todos'); setCategoriaFilter('todas') }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <>
          <SkeletonCards />
          <div className="chart-section" style={{ marginBottom: 24 }}>
            <h3>Evolução dos Últimos 6 Meses</h3>
            <SkeletonChart height={260} />
          </div>
          <div className="reports-charts">
            <div className="chart-section">
              <h3>Despesas por Categoria</h3>
              <SkeletonChart />
            </div>
            <div className="chart-section">
              <h3>Fontes de Renda</h3>
              <SkeletonChart />
            </div>
          </div>
          <div className="transactions-section">
            <SkeletonList rows={5} />
          </div>
        </>
      ) : error ? (
        <Alert type="error" className="alert-with-action">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline" onClick={fetchReport}>Tentar novamente</button>
        </Alert>
      ) : report ? (
        <>
          <SummaryCards balance={summary} />

          {/* Evolução — full width */}
          <div className="chart-section" style={{ marginBottom: 24 }} ref={evolutionRef}>
            <h3>Evolução dos Últimos 6 Meses</h3>
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={evolutionData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                  <XAxis dataKey="mes" stroke={chartTheme.axis} tick={{ fontSize: 12 }} />
                  <YAxis stroke={chartTheme.axis} tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, borderRadius: 8 }}
                    formatter={(v) => fmt(v)}
                  />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Sem dados suficientes para o gráfico</div>
            )}
          </div>

          {/* Dois pies lado a lado */}
          <div className="reports-charts">
            <div className="chart-section" ref={despesasChartRef}>
              <h3>
                Despesas por Categoria
                {categoriaFilter !== 'todas' && (
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 13 }}>
                    {' '}— {categoriaFilter}
                  </span>
                )}
              </h3>
              <ExpensePieChart data={pieDataDespesas} emptyMessage="Nenhuma despesa neste período" />
            </div>

            <div className="chart-section" ref={receitasChartRef}>
              <h3>
                Fontes de Renda
                {categoriaFilter !== 'todas' && (
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 13 }}>
                    {' '}— {categoriaFilter}
                  </span>
                )}
              </h3>
              <ExpensePieChart data={pieDataReceitas} emptyMessage="Nenhuma receita neste período" />
            </div>
          </div>

          <div className="transactions-section">
            <div className="section-header">
              <h3>
                Transações do mês{' '}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 14 }}>
                  {isFiltered
                    ? `${filtered.length} de ${report.transactions.length} registro(s)`
                    : `${report.transactions.length} registro(s)`}
                </span>
              </h3>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <EmptyIllustration icon={isFiltered ? SearchX : Inbox} />
                <p>
                  {isFiltered
                    ? 'Nenhuma transação com os filtros selecionados.'
                    : 'Nenhuma transação neste mês.'}
                </p>
                <p className="empty-state-sub">
                  {isFiltered
                    ? 'Tente ajustar ou limpar os filtros.'
                    : 'Selecione outro mês ou adicione transações no Dashboard.'}
                </p>
                {isFiltered && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: 16 }}
                    onClick={() => { setTipoFilter('todos'); setCategoriaFilter('todas') }}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <ul className="transaction-list">
                {filtered.map(t => (
                  <li key={t.id} className={`transaction-item ${t.tipo}`}>
                    <div className="tx-icon">{t.tipo === 'receita' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</div>
                    <div className="tx-info">
                      <span className="tx-desc">
                        {t.recorrenciaId && <span className="tx-desc-icon" title="Gerada automaticamente por uma recorrência"><Repeat size={13} aria-label="Recorrente" /></span>}
                        {t.descricao || t.categoria}
                      </span>
                      <span className="tx-meta">
                        {t.categoria} · {fmtDate(t.data)}
                        {t.conta?.moeda && t.conta.moeda !== 'BRL' && ` · ${t.conta.nome}`}
                      </span>
                    </div>
                    <div className="tx-amount">
                      {t.tipo === 'receita' ? '+' : '-'}{fmt(t.valor, t.conta?.moeda)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </>
  )
}
