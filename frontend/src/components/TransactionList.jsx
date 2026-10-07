import { DndContext, closestCenter } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { useRef } from 'react'
import { m, useMotionValue, useTransform } from 'framer-motion'
import { fmt, fmtDate, fmtDayHeader, descreverConversao } from '../utils/format'
import { useAuth } from '../context/AuthContext'
import { useSortSensors, listenersSemTeclaDosFilhos } from '../hooks/useSortSensors'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, GripVertical, History, Paperclip, Pencil, Plus, ReceiptText, Repeat, SearchX, Tag, Trash2 } from 'lucide-react'
import { haptic } from '../utils/haptics'
import EmptyIllustration from './EmptyIllustration'

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

// Deslizar pros lados só em telas de toque — no mouse, editar/excluir seguem pelos botões.
const SWIPE_ENABLED = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
const SWIPE_ACTION = 96 // px deslizados pra disparar a ação
const SWIPE_MAX = 140

function TransactionRow({ t, showDate, onEdit, onDelete, onViewAnexo, onViewHistorico, sortable }) {
  const { user } = useAuth()
  const { setNodeRef, style, attributes, listeners, isDragging } = sortable || {}
  const x = useMotionValue(0)
  const armado = useRef(false)

  const itemClass = `transaction-item ${t.tipo}${sortable ? ' transaction-item--sortable' : ''}${isDragging ? ' transaction-item--dragging' : ''}`

  const conteudo = (
    <>
      {sortable && <span className="tx-grip" aria-hidden="true"><GripVertical size={16} /></span>}
      <div className="tx-icon">{t.tipo === 'receita' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}</div>
      <div className="tx-info">
        <span className="tx-desc-row">
          <span className="tx-desc">
            {t.recorrenciaId && <span className="tx-desc-icon" title="Gerada automaticamente por uma recorrência"><Repeat size={13} aria-label="Recorrente" /></span>}
            {t.descricao || t.categoria}
          </span>
          {t.evento?.nome && (
            <span className="tx-evento-chip" title={t.evento.nome}><Tag size={11} /> {t.evento.nome}</span>
          )}
          {t.anexoNome && (
            <button
              type="button"
              className="tx-anexo-btn"
              onClick={() => onViewAnexo(t)}
              title={`Ver comprovante: ${t.anexoNome}`}
            >
              <Paperclip size={14} aria-label="Comprovante" />
            </button>
          )}
          {foiEditada(t) && (
            <button
              type="button"
              className="tx-anexo-btn"
              onClick={() => onViewHistorico(t)}
              title="Ver histórico de edições"
            >
              <History size={14} aria-label="Histórico de edições" />
            </button>
          )}
        </span>
        <span className="tx-meta">
          {t.categoria}
          {showDate && ` · ${fmtDate(t.data)}`}
          {t.conta?.moeda && t.conta.moeda !== 'BRL' && ` · ${t.conta.nome}`}
          {t.usuario?.nome && t.usuario.nome !== user?.nome && ` · por ${t.usuario.nome}`}
        </span>
        {t.moedaOriginal && (
          <span className="tx-meta tx-conversao">
            <ArrowLeftRight size={12} /> {descreverConversao({ ...t, moeda: t.conta?.moeda || 'BRL' })}
          </span>
        )}
      </div>
      <div className="tx-amount">
        {t.tipo === 'receita' ? '+' : '-'}<span className="money">{fmt(t.valor, t.conta?.moeda)}</span>
      </div>
      <div className="tx-actions">
        <button className="btn-icon" onClick={() => onEdit(t)} title="Editar" aria-label="Editar"><Pencil size={16} /></button>
        <button className="btn-icon btn-danger" onClick={() => onDelete(t.id)} title="Excluir" aria-label="Excluir"><Trash2 size={16} /></button>
      </div>
    </>
  )

  if (!SWIPE_ENABLED) {
    return (
      <li ref={setNodeRef} style={style} className={itemClass} {...attributes} {...listeners}>
        {conteudo}
      </li>
    )
  }

  // Celular/tablet: a linha desliza pros lados revelando as ações — direita = editar,
  // esquerda = excluir (que já tem "Desfazer" no toast). O <li> continua sendo o nó do
  // arraste vertical (dnd-kit, segurar e arrastar); o deslize horizontal é no conteúdo.
  return (
    <li ref={setNodeRef} style={style} className={`tx-swipe${isDragging ? ' tx-swipe--dragging' : ''}`} {...attributes} {...listeners}>
      <SwipeActions x={x} />
      <m.div
        className={itemClass}
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragSnapToOrigin
        dragElastic={0.12}
        dragConstraints={{ left: -SWIPE_MAX, right: SWIPE_MAX }}
        onDrag={(_, info) => {
          const passou = Math.abs(info.offset.x) >= SWIPE_ACTION
          if (passou !== armado.current) { armado.current = passou; if (passou) haptic('light') }
        }}
        onDragEnd={(_, info) => {
          armado.current = false
          if (info.offset.x <= -SWIPE_ACTION) onDelete(t.id)
          else if (info.offset.x >= SWIPE_ACTION) onEdit(t)
        }}
      >
        {conteudo}
      </m.div>
    </li>
  )
}

// Fundo revelado atrás da linha: cada lado aparece conforme a direção do deslize.
function SwipeActions({ x }) {
  const editOpacity = useTransform(x, [0, 24, SWIPE_ACTION], [0, 0.6, 1])
  const deleteOpacity = useTransform(x, [-SWIPE_ACTION, -24, 0], [1, 0.6, 0])
  const editScale = useTransform(x, [0, SWIPE_ACTION], [0.6, 1.1])
  const deleteScale = useTransform(x, [-SWIPE_ACTION, 0], [1.1, 0.6])
  return (
    <>
      <m.div className="tx-swipe-bg tx-swipe-bg--edit" style={{ opacity: editOpacity }} aria-hidden="true">
        <m.span style={{ scale: editScale }}><Pencil size={20} /></m.span> Editar
      </m.div>
      <m.div className="tx-swipe-bg tx-swipe-bg--delete" style={{ opacity: deleteOpacity }} aria-hidden="true">
        Excluir <m.span style={{ scale: deleteScale }}><Trash2 size={20} /></m.span>
      </m.div>
    </>
  )
}

function SortableTransactionRow(props) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({ id: props.t.id })
  const sortable = {
    setNodeRef,
    isDragging,
    attributes: { ...attributes, 'aria-roledescription': 'transação reordenável' },
    listeners: listenersSemTeclaDosFilhos(listeners),
    style: { transform: CSS.Transform.toString(transform), transition },
  }
  return <TransactionRow {...props} sortable={sortable} />
}

// Um DndContext por dia: o arraste fica preso dentro do próprio dia (restrictToParentElement),
// então nunca dá pra "mudar a data" de uma transação arrastando — isso continua sendo pelo modal.
function DiaSortable({ grupo, onReorder, rowProps }) {
  const sensors = useSortSensors()

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
      onDragStart={() => haptic('medium')}
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
          <EmptyIllustration icon={SearchX} />
          <p>Nenhuma transação encontrada com esses filtros.</p>
          <p className="empty-state-sub">Tente ajustar ou limpar os filtros.</p>
        </div>
      )
    }
    return (
      <div className="empty-state">
        <EmptyIllustration icon={ReceiptText} />
        <p>Você ainda não tem nenhuma transação.</p>
        <p className="empty-state-sub">Adicione sua primeira receita ou despesa para começar a acompanhar seu saldo.</p>
        {onCreateClick && (
          <button type="button" className="btn btn-primary" onClick={onCreateClick} style={{ marginTop: 16 }}>
            <Plus size={16} /> Adicionar transação
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
