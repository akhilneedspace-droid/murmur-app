import { Routes, Route, Navigate } from 'react-router-dom'
import { QuizProvider } from './context/QuizContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Welcome from './pages/Welcome'
import Quiz from './pages/Quiz'
import QuizResult from './pages/QuizResult'
import Signup from './pages/Signup'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'

function AppRoutes() {
  const { user } = useAuth()

  if (user === undefined) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite' }} />
      </div>
    )
  }

  return (
    <div className="noise">
      <Routes>
        <Route path="/"                element={user ? <Navigate to="/dashboard" replace /> : <Welcome />} />
        <Route path="/quiz"            element={user ? <Navigate to="/dashboard" replace /> : <Quiz />} />
        <Route path="/quiz/result"     element={user ? <Navigate to="/dashboard" replace /> : <QuizResult />} />
        <Route path="/signup"          element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/login"           element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/dashboard"       element={user ? <Dashboard /> : <Navigate to="/" replace />} />
        <Route path="/account"         element={user ? <AccountPage /> : <Navigate to="/" replace />} />
        <Route path="/admin"           element={user ? <AdminPage /> : <Navigate to="/" replace />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <QuizProvider>
        <AppRoutes />
      </QuizProvider>
    </AuthProvider>
  )
}