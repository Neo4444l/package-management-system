import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useLanguage } from './contexts/LanguageContext'
import { useCity } from './contexts/CityContext'
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
  const { currentCity, availableCities, userCities, changeCity, getCityName, hasMultipleCities } = useCity()
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [username, setUsername] = useState('') // 添加用户名状态
  const [loading, setLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false) // 用户菜单显示状态

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
    // 清除城市相关的本地缓存数据（保留语言设置）
    localStorage.removeItem('currentCity')
    
    // 登出
    await supabase.auth.signOut()
    
    // 强制刷新页面，确保所有状态都被重置
    window.location.href = '/'
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
                <div className="user-info-bar">
                  {/* 用户资料按钮 */}
                  <div className="user-menu-container">
                    <button 
                      className="top-bar-btn"
                      onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                      <span className="btn-icon">👤</span>
                      <div className="btn-content">
                        <span className="btn-label">{username}</span>
                        {/* 角色和城市标签横向排列 */}
                        <div className="btn-tags">
                          {userRole && (
                            <span className={`btn-sublabel ${getRoleBadge(userRole).class}`}>
                              {getRoleBadge(userRole).text}
                            </span>
                          )}
                          {currentCity && (
                            <span className="btn-sublabel city-label">
                              <span className="city-icon-small">🏙️</span>
                              {currentCity}
                              {!hasMultipleCities() && <span className="city-lock-icon">🔒</span>}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="btn-arrow">▼</span>
                    </button>
                    
                    {/* 下拉菜单 */}
                    {showUserMenu && (
                      <>
                        <div className="menu-overlay" onClick={() => setShowUserMenu(false)} />
                        <div className="user-dropdown-menu">
                          {/* 用户管理（仅管理员） */}
                          {(userRole === 'admin' || userRole === 'super_admin') && (
                            <a 
                              href="/user-management" 
                              className="menu-item"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <span className="menu-icon">👥</span>
                              <span className="menu-text">{t('userManagement.title')}</span>
                            </a>
                          )}
                          
                          {/* 城市选择 - 仅在有多个城市权限时显示 */}
                          {userCities && userCities.length > 1 && (
                            <div className="menu-section">
                              <div className="menu-section-title">
                                <span className="menu-icon">🏙️</span>
                                <span>{t('city.selectCity')}</span>
                              </div>
                              <div className="city-list">
                                {availableCities
                                  .filter(city => userCities && userCities.includes(city.code))
                                  .map(city => (
                                    <button
                                      key={city.code}
                                      className={`city-option ${currentCity === city.code ? 'active' : ''}`}
                                      onClick={() => {
                                        changeCity(city.code)
                                        setShowUserMenu(false)
                                      }}
                                    >
                                      {city.code}
                                      {currentCity === city.code && <span className="check-icon">✓</span>}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* 语言切换按钮 */}
                  <button 
                    className="top-bar-btn"
                    onClick={() => changeLanguage(language === 'zh' ? 'en' : 'zh')}
                  >
                    <span className="btn-icon">🌐</span>
                    <span className="btn-label-center">
                      {language === 'zh' ? '中文' : 'English'}
                    </span>
                  </button>
                  
                  {/* 退出登录按钮 */}
                  <button onClick={handleLogout} className="top-bar-btn">
                    <span className="btn-label-center">{t('auth.logout')}</span>
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

