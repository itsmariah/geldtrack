// Vibração curta como feedback tátil (Android/Chrome — o Safari do iOS não implementa a
// Vibration API, então lá isso simplesmente não faz nada). Respeita "reduzir movimento".
const PATTERNS = {
  light: 8,
  medium: 15,
  success: [10, 40, 18],
  warning: [20, 60, 20],
  error: [30, 50, 30, 50, 30],
  celebrate: [15, 40, 15, 40, 60],
}

export function haptic(kind = 'light') {
  try {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    navigator.vibrate(PATTERNS[kind] ?? PATTERNS.light)
  } catch { /* alguns navegadores lançam se a página não teve interação ainda */ }
}
