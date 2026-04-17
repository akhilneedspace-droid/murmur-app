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
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null // still loading
  if (!user) return <Navigate to="/" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null // still loading
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  // Show loading spinner while auth state is resolving
  if (user === undefined) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite' }} />
      </div>
    )
  }

  return (
    <div className="noise">
      <Routes>
        {/* Public routes — redirect to dashboard if already logged in */}
        <Route path="/" element={
          <PublicOnlyRoute><Welcome /></PublicOnlyRoute>
        } />
        <Route path="/quiz" element={
          <PublicOnlyRoute><Quiz /></PublicOnlyRoute>
        } />
        <Route path="/quiz/result" element={
          <PublicOnlyRoute><QuizResult /></PublicOnlyRoute>
        } />
        <Route path="/signup" element={
          <PublicOnlyRoute><Signup /></PublicOnlyRoute>
        } />
        <Route path="/login" element={
          <PublicOnlyRoute><Login /></PublicOnlyRoute>
        } />
        <Route path="/forgot-password" element={
          <PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>
        } />

        {/* Reset password — accessible even without auth (token in URL) */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Legal pages — always accessible, no auth required */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Protected routes — redirect to home if not logged in */}
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/account" element={
          <ProtectedRoute><AccountPage /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute><AdminPage /></ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
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