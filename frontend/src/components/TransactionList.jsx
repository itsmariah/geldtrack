import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { fmt, fmtDate, fmtDayHeader } from '../utils/format'
import { useAuth } from '../context/AuthContext'

// updatedAt e createdAt vêm do mesmo INSERT (mesmo now() do Postgres), mas usamos uma
// margem pra não depender de igualdade exata de timestamp entre as duas colunas.
function foiEditada(t) {
  if (!t.createdAt || !t.updatedAt) return false
  return new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime() > 1000
}

// A lista já vem ordenada por data desc do backend, então cada dia é um bloco contíguo.
function agruparPorDia(transactions) {
  const grupos = []
  for (const t of transactions) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.data === t.data) ultimo.itens.push(t)
    else grupos.push({ data: t.data, itens: [t] })
  }
  return grupos
}

const sortableModifiers = [restrictToVerticalAxis, restrictToParentElement]

// Mouse arrasta depois de mover alguns pixels (um clique simples nos botões de
// editar/excluir continua sendo clique). No toque, precisa segurar um instante antes de
// arrastar — senão rolar a página com o dedo em cima da lista viraria um arraste.
function useTransactionSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}

function TransactionRow({ t, showDate, onEdit, onDelete, onViewAnexo, onViewHistorico, sortable }) {
  const { user } = useAuth()
  const { setNodeRef, style, attributes, listeners, isDragging } = sortable || {}

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`transaction-item ${t.tipo}${sortable ? ' transaction-item--sortable' : ''}${isDragging ? ' transaction-item--dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      {sortable && <span className="tx-grip" aria-hidden="true">⋮⋮</span>}
      <div className="tx-icon">{t.tipo === 'receita' ? '↑' : '↓'}</div>
      <div className="tx-info">
        <span className="tx-desc-row">
          <span className="tx-desc">
            {t.recorrenciaId && <span title="Gerada automaticamente por uma recorrência">🔁 </span>}
            {t.descricao || t.categoria}
          </span>
          {t.evento?.nome && (
            <span className="tx-evento-chip" title={t.evento.nome}>🏷️ {t.evento.nome}</span>
          )}
          {t.anexoNome && (
            <button
              type="button"
              className="tx-anexo-btn"
              onClick={() => onViewAnexo(t)}
              title={`Ver comprovante: ${t.anexoNome}`}
            >
              📎
            </button>
          )}
          {foiEditada(t) && (
            <button
              type="button"
              className="tx-anexo-btn"
              onClick={() => onViewHistorico(t)}
              title="Ver histórico de edições"
            >
              🕓
            </button>
          )}
        </span>
        <span className="tx-meta">
          {t.categoria}
          {showDate && ` · ${fmtDate(t.data)}`}
          {t.conta?.moeda && t.conta.moeda !== 'BRL' && ` · ${t.conta.nome}`}
          {t.usuario?.nome && t.usuario.nome !== user?.nome && ` · por ${t.usuario.nome}`}
        </span>
      </div>
      <div className="tx-amount">
        {t.tipo === 'receita' ? '+' : '-'}{fmt(t.valor, t.conta?.moeda)}
      </div>
      <div className="tx-actions">
        <button className="btn-icon" onClick={() => onEdit(t)} title="Editar" aria-label="Editar">✏️</button>
        <button className="btn-icon btn-danger" onClick={() => onDelete(t.id)} title="Excluir" aria-label="Excluir">🗑️</button>
      </div>
    </li>
  )
}

function SortableTransactionRow(props) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({ id: props.t.id })
  // O KeyboardSensor escuta keydown no <li> inteiro; sem esse filtro, apertar Enter/Espaço
  // num botão de dentro (editar, excluir, anexo) começaria um arraste em vez de clicar nele.
  const { onKeyDown, ...pointerListeners } = listeners || {}
  const sortable = {
    setNodeRef,
    isDragging,
    attributes: { ...attributes, 'aria-roledescription': 'transação reordenável' },
    listeners: {
      ...pointerListeners,
      onKeyDown: (e) => { if (e.target === e.currentTarget) onKeyDown?.(e) },
    },
    style: { transform: CSS.Transform.toString(transform), transition },
  }
  return <TransactionRow {...props} sortable={sortable} />
}

// Um DndContext por dia: o arraste fica preso dentro do próprio dia (restrictToParentElement),
// então nunca dá pra "mudar a data" de uma transação arrastando — isso continua sendo pelo modal.
function DiaSortable({ grupo, onReorder, rowProps }) {
  const sensors = useTransactionSensors()

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const ids = grupo.itens.map(t => t.id)
    const novaOrdem = arrayMove(grupo.itens, ids.indexOf(active.id), ids.indexOf(over.id))
    onReorder(grupo.data, novaOrdem)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={sortableModifiers}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Para reordenar, pressione espaço, use as setas para cima e para baixo e pressione espaço de novo para soltar. Esc cancela.',
        },
      }}
    >
      <SortableContext items={grupo.itens.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="transaction-list">
          {grupo.itens.map(t => <SortableTransactionRow key={t.id} t={t} {...rowProps} />)}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

export default function TransactionList({ transactions, onEdit, onDelete, onViewAnexo, onViewHistorico, onReorder, hasFilters, onCreateClick }) {
  if (transactions.length === 0) {
    if (hasFilters) {
      return (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p>Nenhuma transação encontrada com esses filtros.</p>
          <p className="empty-state-sub">Tente ajustar ou limpar os filtros.</p>
        </div>
      )
    }
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💸</div>
        <p>Você ainda não tem nenhuma transação.</p>
        <p className="empty-state-sub">Adicione sua primeira receita ou despesa para começar a acompanhar seu saldo.</p>
        {onCreateClick && (
          <button type="button" className="btn btn-primary" onClick={onCreateClick} style={{ marginTop: 16 }}>
            + Adicionar transação
          </button>
        )}
      </div>
    )
  }

  const rowProps = { onEdit, onDelete, onViewAnexo, onViewHistorico }

  // Sem onReorder (ex: tela de evento), lista simples como sempre foi.
  if (!onReorder) {
    return (
      <ul className="transaction-list">
        {transactions.map(t => <TransactionRow key={t.id} t={t} showDate {...rowProps} />)}
      </ul>
    )
  }

  return (
    <div className="transaction-days">
      {agruparPorDia(transactions).map(grupo => (
        <section key={grupo.data} className="transaction-day">
          <h4 className="transaction-day-header">{fmtDayHeader(grupo.data)}</h4>
          {grupo.itens.length > 1 ? (
            <DiaSortable grupo={grupo} onReorder={onReorder} rowProps={rowProps} />
          ) : (
            <ul className="transaction-list">
              <TransactionRow t={grupo.itens[0]} {...rowProps} />
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
