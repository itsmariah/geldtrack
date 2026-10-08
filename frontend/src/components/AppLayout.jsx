import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { m } from 'framer-motion'
import Navbar from './Navbar'
import BottomNav from './BottomNav'
import PageLoader from './PageLoader'
import CommandPalette from './CommandPalette'

// Casca das páginas logadas: a navbar (e a barra inferior no celular) ficam montadas entre
// uma rota e outra — só o conteúdo troca, com uma transição de entrada. O Suspense fica
// aqui dentro pra que, enquanto o chunk da página carrega, a navegação continue na tela.
export default function AppLayout() {
  const location = useLocation()

  return (
    <div className="app-layout">
      <Navbar />
      <m.main
        key={location.pathname}
        className="main-content"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </m.main>
      <BottomNav />
      <CommandPalette />
    </div>
  )
}
