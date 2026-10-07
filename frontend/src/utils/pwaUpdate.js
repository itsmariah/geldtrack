import { useSyncExternalStore } from 'react'

// Ponte entre o registro do service worker (main.jsx, fora do React) e o aviso de
// "nova versão disponível" (components/PwaUpdateBanner.jsx). Quando um deploy novo é
// detectado, main.jsx chama avisarNovaVersao(atualizar); o banner mostra o botão e,
// ao clicar, `atualizar()` ativa o service worker novo e recarrega a página.
let atualizar = null
const ouvintes = new Set()

export function avisarNovaVersao(fn) {
  atualizar = fn
  ouvintes.forEach(l => l())
}

export function dispensarNovaVersao() {
  atualizar = null
  ouvintes.forEach(l => l())
}

function subscribe(l) {
  ouvintes.add(l)
  return () => ouvintes.delete(l)
}

export function useNovaVersao() {
  return useSyncExternalStore(subscribe, () => atualizar)
}
