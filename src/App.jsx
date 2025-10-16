import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import HomePage from './pages/HomePage'
import ShelvingPage from './pages/ShelvingPage'
import ShelvingInput from './pages/ShelvingInput'
import UnshelvingPage from './pages/UnshelvingPage'
import ReturnDashboard from './pages/ReturnDashboard'
import LocationManagement from './pages/LocationManagement'
import CenterReturnManagement from './pages/CenterReturnManagement'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查当前session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#667eea'
      }}>
        加载中...
      </div>
    )
  }

  if (!session) {
    return <Login onLogin={setSession} />
  }

  return (
    <Router>
      <div className="App">
        <div className="user-info">
          <span className="user-email">👤 {session.user.email}</span>
          <button onClick={handleLogout} className="btn-logout">
            退出登录
          </button>
        </div>
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shelving" element={<ShelvingPage />} />
          <Route path="/shelving/:locationId" element={<ShelvingInput />} />
          <Route path="/unshelving" element={<UnshelvingPage />} />
          <Route path="/return-dashboard" element={<ReturnDashboard />} />
          <Route path="/return-dashboard/location-management" element={<LocationManagement />} />
          <Route path="/return-dashboard/center-return" element={<CenterReturnManagement />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

