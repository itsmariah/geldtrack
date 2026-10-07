import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { AlertCircle, CheckCircle2, Info, Undo2, X } from 'lucide-react'
import { haptic } from '../utils/haptics'

// Toasts globais: um por vez na tela, com fila. Uso:
//   const toast = useToast()
//   toast('Meta criada.')                                   → sucesso
//   toast.error('Não foi possível salvar.')
//   toast.undoable('Transação excluída.', { onCommit, onUndo })
// O undoable adia a ação de verdade (onCommit) até o toast expirar; "Desfazer" chama
// onUndo e cancela o commit. Se outro toast chegar, se a aba for fechada/escondida ou se
// o usuário dispensar o toast, o commit pendente roda na hora — nunca fica pra trás.

const ToastContext = createContext(null)

const DURATION = { success: 3000, error: 5000, info: 3500, undo: 5000 }
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info, undo: Info }
let nextId = 1

export function ToastProvider({ children }) {
  const [current, setCurrent] = useState(null)
  const queue = useRef([])
  const timer = useRef(null)
  const currentRef = useRef(null)
  currentRef.current = current

  // Roda o commit pendente do toast atual (se houver) exatamente uma vez.
  const settle = useCallback((t) => {
    if (!t || t.settled) return
    t.settled = true
    t.onCommit?.()
  }, [])

  const showNext = useCallback(() => {
    clearTimeout(timer.current)
    const next = queue.current.shift() || null
    setCurrent(next)
    if (!next) return
    haptic(next.type === 'error' ? 'error' : next.type === 'undo' ? 'medium' : 'success')
    timer.current = setTimeout(() => {
      settle(next)
      showNext()
    }, next.duration)
  }, [settle])

  const push = useCallback((t) => {
    const toast = { id: nextId++, duration: DURATION[t.type], ...t }
    if (currentRef.current) {
      // Um toast novo "empurra" o atual: commita o que estava pendente e troca.
      settle(currentRef.current)
      queue.current = [toast]
      showNext()
    } else {
      queue.current.push(toast)
      showNext()
    }
  }, [settle, showNext])

  const dismiss = useCallback(() => {
    settle(currentRef.current)
    showNext()
  }, [settle, showNext])

  const undo = useCallback(() => {
    const t = currentRef.current
    if (!t || t.settled) return
    t.settled = true
    t.onUndo?.()
    haptic('light')
    showNext()
  }, [showNext])

  // Celular: trocar de app esconde a aba e pode matar a página — commita antes.
  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden') settle(currentRef.current) }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
      clearTimeout(timer.current)
    }
  }, [settle])

  const api = useMemo(() => {
    const toast = (message, opts) => push({ type: 'success', message, ...opts })
    toast.error = (message, opts) => push({ type: 'error', message, ...opts })
    toast.info = (message, opts) => push({ type: 'info', message, ...opts })
    toast.undoable = (message, { onCommit, onUndo, duration } = {}) =>
      push({ type: 'undo', message, onCommit, onUndo, ...(duration && { duration }) })
    return toast
  }, [push])

  const Icon = current ? ICONS[current.type] : null

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="popLayout">
          {current && (
            <m.div
              key={current.id}
              className={`toast toast--${current.type}`}
              role={current.type === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 80) dismiss() }}
            >
              <Icon size={18} className="toast-icon" aria-hidden="true" />
              <span className="toast-message">{current.message}</span>
              {current.type === 'undo' ? (
                <button type="button" className="toast-action" onClick={undo}>
                  <Undo2 size={15} /> Desfazer
                </button>
              ) : (
                <button type="button" className="toast-close" onClick={dismiss} aria-label="Fechar aviso">
                  <X size={15} />
                </button>
              )}
              <span className="toast-progress" style={{ animationDuration: `${current.duration}ms` }} aria-hidden="true" />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}
