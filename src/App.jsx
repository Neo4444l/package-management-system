import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import UserManagement from './components/UserManagement'
import DataMigration from './components/DataMigration'
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
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 检查当前session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserRole(session.user.id)
      } else {
        setUserRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUserRole(data?.role || 'user')
    } catch (error) {
      console.error('获取用户角色失败:', error)
      setUserRole('user')
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role) => {
    const badges = {
      admin: { text: '管理员', class: 'role-admin' },
      manager: { text: '经理', class: 'role-manager' },
      user: { text: '用户', class: 'role-user' }
    }
    return badges[role] || badges.user
  }

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

  const roleBadge = getRoleBadge(userRole)

  return (
    <Router>
      <div className="App">
        <div className="user-info">
          <span className="user-email">👤 {session.user.email}</span>
          {userRole && (
            <span className={`user-role-badge ${roleBadge.class}`}>
              {roleBadge.text}
            </span>
          )}
          {userRole === 'admin' && (
            <>
              <a href="/user-management" className="btn-manage-users">
                👥 用户管理
              </a>
              <a href="/data-migration" className="btn-manage-users" style={{ background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' }}>
                ☁️ 数据迁移
              </a>
            </>
          )}
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
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/data-migration" element={<DataMigration />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

