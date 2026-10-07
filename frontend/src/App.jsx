import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { CategoriasProvider } from './context/CategoriasContext'
import PrivateRoute from './components/PrivateRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import PageLoader from './components/PageLoader'
import FontTester from './components/FontTester'

// Landing e login vão no pacote inicial (são as portas de entrada); o resto das páginas
// vira um chunk próprio, baixado só quando a rota é acessada pela primeira vez.
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
    <ThemeProvider>
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
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/relatorios" element={<PrivateRoute><Reports /></PrivateRoute>} />
                <Route path="/metas" element={<PrivateRoute><Goals /></PrivateRoute>} />
                <Route path="/orcamentos" element={<PrivateRoute><Budgets /></PrivateRoute>} />
                <Route path="/eventos" element={<PrivateRoute><Eventos /></PrivateRoute>} />
                <Route path="/eventos/:id" element={<PrivateRoute><EventoDetalhe /></PrivateRoute>} />
                <Route path="/recorrencias" element={<PrivateRoute><Recurring /></PrivateRoute>} />
                <Route path="/contas" element={<PrivateRoute><Contas /></PrivateRoute>} />
                <Route path="/categorias" element={<PrivateRoute><Categorias /></PrivateRoute>} />
                <Route path="/familia" element={<PrivateRoute><Familia /></PrivateRoute>} />
                <Route path="/grupos" element={<PrivateRoute><Grupos /></PrivateRoute>} />
                <Route path="/grupos/:id" element={<PrivateRoute><GrupoDetalhe /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <FontTester />
          </BrowserRouter>
        </CategoriasProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
