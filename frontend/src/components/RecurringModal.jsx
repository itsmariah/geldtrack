import { useState } from 'react'
import api from '../services/api'
import { useCategorias } from '../context/CategoriasContext'
import Modal from './Modal'
import Alert from './Alert'
import { ArrowDownLeft, ArrowUpRight, Loader2, X } from 'lucide-react'

// new Date().toISOString() é UTC — perto da meia-noite no Brasil (UTC-3) isso adianta
// a data em um dia. Aqui montamos a data local manualmente para evitar esse desvio.
function todayLocal() {
  const now = new Date()
  const mes = String(now.getMonth() + 1).padStart(2, '0')
  const dia = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mes}-${dia}`
}

export default function RecurringModal({ recorrencia, contas, onClose, onSaved }) {
  const { categoriasPorTipo } = useCategorias()
  const [form, setForm] = useState({
    tipo: recorrencia?.tipo || 'despesa',
    valor: recorrencia?.valor ?? '',
    categoria: recorrencia?.categoria || 'Outros',
    descricao: recorrencia?.descricao || '',
    diaDoMes: recorrencia?.diaDoMes ?? 1,
    dataInicio: recorrencia?.dataInicio || todayLocal(),
    dataFim: recorrencia?.dataFim || '',
    ativa: recorrencia?.ativa ?? true,
    contaId: recorrencia?.contaId || contas?.[0]?.id || '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = { ...form, dataFim: form.dataFim || null }
      if (recorrencia) {
        await api.put(`/recorrencias/${recorrencia.id}`, payload)
      } else {
        await api.post('/recorrencias', payload)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar recorrência')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-header">
        <h3>{recorrencia ? 'Editar Recorrência' : 'Nova Recorrência'}</h3>
        <button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label className={`type-btn ${form.tipo === 'receita' ? 'active-income' : ''}`}>
            <input
              type="radio"
              value="receita"
              checked={form.tipo === 'receita'}
              onChange={e => setForm({ ...form, tipo: e.target.value, categoria: categoriasPorTipo('receita')[0] })}
            />
            <ArrowDownLeft size={16} /> Receita
          </label>
          <label className={`type-btn ${form.tipo === 'despesa' ? 'active-expense' : ''}`}>
            <input
              type="radio"
              value="despesa"
              checked={form.tipo === 'despesa'}
              onChange={e => setForm({ ...form, tipo: e.target.value, categoria: categoriasPorTipo('despesa')[0] })}
            />
            <ArrowUpRight size={16} /> Despesa
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="rec-valor">Valor (R$)</label>
          <input
            id="rec-valor"
            type="number"
            step="0.01"
            min="0.01"
            value={form.valor}
            onChange={e => setForm({ ...form, valor: e.target.value })}
            placeholder="0,00"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="rec-categoria">Categoria</label>
          <select
            id="rec-categoria"
            value={form.categoria}
            onChange={e => setForm({ ...form, categoria: e.target.value })}
          >
            {categoriasPorTipo(form.tipo).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="rec-conta">Conta</label>
          <select
            id="rec-conta"
            value={form.contaId}
            onChange={e => setForm({ ...form, contaId: Number(e.target.value) })}
          >
            {contas?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="rec-descricao">Descrição (opcional)</label>
          <input
            id="rec-descricao"
            type="text"
            value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
            placeholder="Ex: Aluguel apartamento, Netflix..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="rec-dia">Dia do mês</label>
          <input
            id="rec-dia"
            type="number"
            min="1"
            max="31"
            value={form.diaDoMes}
            onChange={e => setForm({ ...form, diaDoMes: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="rec-data-inicio">Início</label>
          <input
            id="rec-data-inicio"
            type="date"
            value={form.dataInicio}
            disabled={!!recorrencia}
            onChange={e => setForm({ ...form, dataInicio: e.target.value })}
            required
          />
          {recorrencia && (
            <span className="form-hint">A data de início não pode ser alterada depois de criada.</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="rec-data-fim">Fim (opcional)</label>
          <input
            id="rec-data-fim"
            type="date"
            value={form.dataFim}
            onChange={e => setForm({ ...form, dataFim: e.target.value })}
          />
        </div>

        {recorrencia && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.ativa}
              onChange={e => setForm({ ...form, ativa: e.target.checked })}
            />
            Ativa (gerando lançamentos automaticamente)
          </label>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading && <Loader2 size={16} className="icon-spin" aria-hidden="true" />}
            {loading ? 'Salvando...' : recorrencia ? 'Atualizar' : 'Criar recorrência'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
