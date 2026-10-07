import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import { useSortSensors, listenersSemTeclaDosFilhos, instrucoesArraste } from '../hooks/useSortSensors'
import { haptic } from '../utils/haptics'

const modifiers = [restrictToVerticalAxis]

function Bloco({ id, className, renderCabecalho, children }) {
  const { setNodeRef, setActivatorNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({ id })
  return (
    <section
      ref={setNodeRef}
      className={`${className}${isDragging ? ' sortable-bloco--dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {/* Só o cabeçalho arrasta o bloco: os cards de dentro têm o próprio arraste (outro
          DndContext), e segurar num card move o card, não o bloco inteiro. */}
      <div
        ref={setActivatorNodeRef}
        className="sortable-bloco-alca"
        {...attributes}
        aria-roledescription="bloco reordenável"
        {...listenersSemTeclaDosFilhos(listeners)}
      >
        {renderCabecalho()}
      </div>
      {children}
    </section>
  )
}

// Blocos (seções com título) reordenáveis arrastando pelo cabeçalho — usado nas
// instituições da tela de Contas. blocos: [{ id, ... }]; onReorder recebe a nova ordem.
export default function BlocosSortable({ blocos, onReorder, className, renderCabecalho, renderConteudo }) {
  const sensors = useSortSensors()

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const ids = blocos.map(b => b.id)
    onReorder(arrayMove(blocos, ids.indexOf(active.id), ids.indexOf(over.id)))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={modifiers} onDragStart={() => haptic('medium')} onDragEnd={handleDragEnd} accessibility={instrucoesArraste}>
      <SortableContext items={blocos.map(b => b.id)} strategy={verticalListSortingStrategy}>
        {blocos.map(bloco => (
          <Bloco key={bloco.id} id={bloco.id} className={className} renderCabecalho={() => renderCabecalho(bloco)}>
            {renderConteudo(bloco)}
          </Bloco>
        ))}
      </SortableContext>
    </DndContext>
  )
}
