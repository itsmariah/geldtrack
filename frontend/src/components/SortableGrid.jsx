import { useRef } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSortSensors, listenersSemTeclaDosFilhos, instrucoesArraste } from '../hooks/useSortSensors'

function SortableItem({ id, descricao, arrastouRef, children }) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`sortable-item${isDragging ? ' sortable-item--dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      aria-roledescription={descricao}
      {...listenersSemTeclaDosFilhos(listeners)}
      // Soltar o card depois de arrastar ainda dispara um clique nele — em cards clicáveis
      // (grupo, evento) isso abriria a página do item. O clique logo após um arraste é engolido.
      onClickCapture={(e) => {
        if (arrastouRef.current) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
    >
      {children}
    </div>
  )
}

// Grade de cards reordenável por arrastar e soltar (segurar e arrastar no celular) — mesmo
// comportamento das transações do dia no Dashboard. onReorder recebe a lista inteira na
// nova ordem; quem usa atualiza a tela na hora e salva (ver utils/salvarOrdem.js).
export default function SortableGrid({ items, onReorder, renderItem, descricao = 'item reordenável', className = 'goals-grid' }) {
  const sensors = useSortSensors()
  const arrastouRef = useRef(false)

  const handleDragEnd = ({ active, over }) => {
    // O clique que o navegador dispara ao soltar vem logo depois deste evento.
    setTimeout(() => { arrastouRef.current = false }, 0)
    if (!over || active.id === over.id) return
    const ids = items.map(i => i.id)
    onReorder(arrayMove(items, ids.indexOf(active.id), ids.indexOf(over.id)))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => { arrastouRef.current = true }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { arrastouRef.current = false }}
      accessibility={instrucoesArraste}
    >
      <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map(item => (
            <SortableItem key={item.id} id={item.id} descricao={descricao} arrastouRef={arrastouRef}>
              {renderItem(item)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
