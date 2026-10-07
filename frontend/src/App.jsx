import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { PrivacyProvider } from './context/PrivacyContext'
import { CategoriasProvider } from './context/CategoriasContext'
import { LazyMotion, MotionConfig } from 'framer-motion'
import PrivateRoute from './components/PrivateRoute'
import AppLayout from './components/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import PageLoader from './components/PageLoader'
import FontTester from './components/FontTester'
import PwaUpdateBanner from './components/PwaUpdateBanner'
import ConnectionStatus from './components/ConnectionStatus'

// Landing e login vão no pacote inicial (são as portas de entrada); o resto das páginas
// vira um chunk próprio, baixado só quando a rota é acessada pela primeira vez.
// Motor de animação da Framer Motion num chunk à parte (ver utils/motionFeatures.js).
const loadMotionFeatures = () => import('./utils/motionFeatures').then(mod => mod.default)

const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Reports = lazy(() => import('./pages/Reports'))
const Goals = lazy(() => import('./pages/Goals'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Eventos = lazy(() => import('./pages/Eventos'))
const EventoDetalhe = lazy(() => import('./pages/EventoDetalhe'))
const Grupos = lazy(() => import('./pages/Grupos'))
const GrupoDetalhe = lazy(() => import('./pages/GrupoDetalhe'))
const Recurring = lazy(() => import('./pages/Recurring'))
const Contas = lazy(() => import('./pages/Contas'))
const Categorias = lazy(() => import('./pages/Categorias'))
const Familia = lazy(() => import('./pages/Familia'))

export default function App() {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      {/* reducedMotion="user": quem ativou "reduzir movimento" no sistema não vê as animações. */}
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <PrivacyProvider>
            <ToastProvider>
              <AuthProvider>
                <CategoriasProvider>
                  <BrowserRouter>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/cadastro" element={<Register />} />
                        <Route path="/esqueci-senha" element={<ForgotPassword />} />
                        <Route path="/redefinir-senha" element={<ResetPassword />} />
                        <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/relatorios" element={<Reports />} />
                          <Route path="/metas" element={<Goals />} />
                          <Route path="/orcamentos" element={<Budgets />} />
                          <Route path="/eventos" element={<Eventos />} />
                          <Route path="/eventos/:id" element={<EventoDetalhe />} />
                          <Route path="/recorrencias" element={<Recurring />} />
                          <Route path="/contas" element={<Contas />} />
                          <Route path="/categorias" element={<Categorias />} />
                          <Route path="/familia" element={<Familia />} />
                          <Route path="/grupos" element={<Grupos />} />
                          <Route path="/grupos/:id" element={<GrupoDetalhe />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                    <FontTester />
                    <PwaUpdateBanner />
                    <ConnectionStatus />
                  </BrowserRouter>
                </CategoriasProvider>
              </AuthProvider>
            </ToastProvider>
          </PrivacyProvider>
        </ThemeProvider>
      </MotionConfig>
    </LazyMotion>
  )
}
