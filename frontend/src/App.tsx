import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useInactivityTimer } from './hooks/useInactivityTimer'
import LoginPage from './pages/LoginPage'
import CallbackHandler from './pages/CallbackHandler'
import Dashboard from './pages/Dashboard'
import HistoryPage from './pages/HistoryPage'
import SocialPage from './pages/SocialPage'
import BlendPage from './pages/BlendPage'

function App() {
  const { user, loading } = useAuth()
  const [isSlowBoot, setIsSlowBoot] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (loading) {
      timer = setTimeout(() => setIsSlowBoot(true), 3500)
    } else {
      setIsSlowBoot(false)
    }
    return () => clearTimeout(timer)
  }, [loading])

  // Initialize global inactivity timer to protect user sessions
  useInactivityTimer()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center animate-fade-in flex flex-col items-center">
          <div className="text-6xl mb-6 animate-float filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">𓏢</div>
          <p className="text-white font-medium tracking-widest uppercase text-sm mb-2">Loading AI.pollo</p>
          <div className="h-4 overflow-hidden relative w-48 mx-auto flex justify-center">
            {isSlowBoot ? (
              <p className="text-brand-cyan/80 text-xs font-medium tracking-wide animate-pulse">Waking up server... ~15s</p>
            ) : (
              <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent animate-scan" />
            )}
          </div>
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
        path="/blend"
        element={user ? <BlendPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/blend/:roomId"
        element={user ? <BlendPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/login"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

export default App
