import {
  LayoutDashboard, Wallet, ChartColumn, Target, PiggyBank, Plane, Repeat, Tags, Users, Handshake,
} from 'lucide-react'

// Fonte única das páginas do app: a navbar do desktop mostra todas em linha; no celular,
// as marcadas com `primary` viram abas da barra inferior e o resto vai pro sheet "Mais".
export const NAV_LINKS = [
  { path: '/dashboard', label: 'Dashboard', short: 'Início', icon: LayoutDashboard, primary: true },
  { path: '/contas', label: 'Contas', icon: Wallet, primary: true },
  { path: '/relatorios', label: 'Relatórios', icon: ChartColumn, primary: true },
  { path: '/metas', label: 'Metas', icon: Target },
  { path: '/orcamentos', label: 'Orçamentos', icon: PiggyBank },
  { path: '/eventos', label: 'Eventos', icon: Plane },
  { path: '/recorrencias', label: 'Recorrências', icon: Repeat },
  { path: '/categorias', label: 'Categorias', icon: Tags },
  { path: '/familia', label: 'Família', icon: Users },
  { path: '/grupos', label: 'Grupos', icon: Handshake },
]

// Rotas de detalhe (/eventos/3, /grupos/5) marcam o item da lista como ativo.
export function isPathActive(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`)
}
