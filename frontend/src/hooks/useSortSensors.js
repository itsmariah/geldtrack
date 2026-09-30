import { KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

// Sensores de todo arrastar e soltar do app (transações do dia e listas em cards).
// Mouse arrasta depois de mover alguns pixels (um clique simples nos botões de
// editar/excluir continua sendo clique). No toque, precisa segurar um instante antes de
// arrastar — senão rolar a página com o dedo em cima da lista viraria um arraste.
export function useSortSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}

// O KeyboardSensor escuta keydown no elemento arrastável inteiro; sem esse filtro, apertar
// Enter/Espaço num botão de dentro (editar, excluir...) começaria um arraste em vez de clicar.
export function listenersSemTeclaDosFilhos(listeners) {
  const { onKeyDown, ...resto } = listeners || {}
  return { ...resto, onKeyDown: (e) => { if (e.target === e.currentTarget) onKeyDown?.(e) } }
}

export const instrucoesArraste = {
  screenReaderInstructions: {
    draggable: 'Para reordenar, pressione espaço, use as setas e pressione espaço de novo para soltar. Esc cancela.',
  },
}
