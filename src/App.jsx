import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useLanguage } from './contexts/LanguageContext'
import CitySelector from './components/CitySelector'
import Login from './components/Login'
import ResetPassword from './components/ResetPassword'
import UserManagement from './components/UserManagement'
import HomePage from './pages/HomePage'
import ShelvingPage from './pages/ShelvingPage'
import ShelvingInput from './pages/ShelvingInput'
import UnshelvingPage from './pages/UnshelvingPage'
import ReturnDashboard from './pages/ReturnDashboard'
import LocationManagement from './pages/LocationManagement'
import CenterReturnManagement from './pages/CenterReturnManagement'
import './App.css'

function App() {
  const { t, language, changeLanguage } = useLanguage()
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [username, setUsername] = useState('') // 添加用户名状态
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
        .select('role, is_active, username')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUserRole(data?.role || 'user')
      setUsername(data?.username || session?.user?.email?.split('@')[0] || 'User') // 使用用户名，或邮箱前缀
    } catch (error) {
      console.error('获取用户角色失败:', error)
      setUserRole('user')
      setUsername(session?.user?.email?.split('@')[0] || 'User')
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role) => {
    const badges = {
      super_admin: { text: t('roles.super_admin'), class: 'role-super-admin' },
      admin: { text: t('roles.admin'), class: 'role-admin' },
      manager: { text: t('roles.manager'), class: 'role-manager' },
      user: { text: t('roles.user'), class: 'role-user' }
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
        {t('common.loading')}
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* 公开路由 - 密码重置 */}
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* 需要登录的路由 */}
        {!session ? (
          <Route path="*" element={<Login onLogin={setSession} />} />
        ) : (
          <>
            <Route path="*" element={
              <div className="App">
                <div className="user-info">
                  {/* 用户名 + 角色徽章 */}
                  <div className="user-profile">
                    <span className="user-icon">👤</span>
                    <span className="username">{username}</span>
                    {userRole && (
                      <span className={`role-badge-compact ${getRoleBadge(userRole).class}`}>
                        {getRoleBadge(userRole).text}
                      </span>
                    )}
                  </div>
                  
                  {/* 用户管理链接（仅管理员） */}
                  {(userRole === 'admin' || userRole === 'super_admin') && (
                    <a href="/user-management" className="nav-link">
                      <span className="nav-icon">👥</span>
                      <span className="nav-text">{t('userManagement.title')}</span>
                    </a>
                  )}
                  
                  {/* 城市选择器 */}
                  <CitySelector />
                  
                  {/* 语言切换 */}
                  <div className="lang-switcher-compact">
                    <button
                      className={`lang-btn-compact ${language === 'zh' ? 'active' : ''}`}
                      onClick={() => changeLanguage('zh')}
                      title="中文"
                    >
                      中
                    </button>
                    <span className="lang-divider">|</span>
                    <button
                      className={`lang-btn-compact ${language === 'en' ? 'active' : ''}`}
                      onClick={() => changeLanguage('en')}
                      title="English"
                    >
                      EN
                    </button>
                  </div>
                  
                  {/* 退出登录 */}
                  <button onClick={handleLogout} className="btn-logout-compact">
                    {t('auth.logout')}
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
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            } />
          </>
        )}
      </Routes>
    </Router>
  )
}

export default App

