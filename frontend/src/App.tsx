import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useInactivityTimer } from './hooks/useInactivityTimer'
import LoginPage from './pages/LoginPage'
import CallbackHandler from './pages/CallbackHandler'
import Dashboard from './pages/Dashboard'
import HistoryPage from './pages/HistoryPage'
import SocialPage from './pages/SocialPage'

function App() {
  const { user, loading } = useAuth()

  // Initialize global inactivity timer to protect user sessions
  useInactivityTimer()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-4 animate-float">𓏢</div>
          <p className="text-slate-300 text-lg font-medium tracking-wide">Loading AI.pollo...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<LoginPage />}
      />
      <Route
        path="/callback"
        element={<CallbackHandler />}
      />
      <Route
        path="/dashboard"
        element={user ? <Dashboard /> : <Navigate to="/" replace />}
      />
      <Route
        path="/history"
        element={user ? <HistoryPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/social"
        element={user ? <SocialPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/login"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

export default App
