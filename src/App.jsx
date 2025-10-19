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
  const { currentCity, availableCities, userCities, changeCurrentCity, getCityName } = useCity()
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
                <div className="user-info-bar">
                  {/* 用户资料按钮 */}
                  <div className="user-menu-container">
                    <button 
                      className="user-profile-btn"
                      onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                      <span className="user-avatar">👤</span>
                      <div className="user-details">
                        <span className="user-name">{username}</span>
                        {userRole && (
                          <span className={`user-role ${getRoleBadge(userRole).class}`}>
                            {getRoleBadge(userRole).text}
                          </span>
                        )}
                      </div>
                      <span className="dropdown-arrow">▼</span>
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
                          
                          {/* 城市选择 */}
                          {userCities && userCities.length > 1 && (
                            <div className="menu-section">
                              <div className="menu-section-title">
                                <span className="menu-icon">🏙️</span>
                                <span>{t('city.selectCity')}</span>
                              </div>
                              <div className="city-list">
                                {availableCities
                                  .filter(city => userCities.includes(city.code))
                                  .map(city => (
                                    <button
                                      key={city.code}
                                      className={`city-option ${currentCity === city.code ? 'active' : ''}`}
                                      onClick={() => {
                                        changeCurrentCity(city.code)
                                        setShowUserMenu(false)
                                      }}
                                    >
                                      {getCityName(city.code)}
                                      {currentCity === city.code && <span className="check-icon">✓</span>}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                          
                          {/* 语言选择 */}
                          <div className="menu-section">
                            <div className="menu-section-title">
                              <span className="menu-icon">🌐</span>
                              <span>{t('common.language')}</span>
                            </div>
                            <div className="language-list">
                              <button
                                className={`lang-option ${language === 'zh' ? 'active' : ''}`}
                                onClick={() => {
                                  changeLanguage('zh')
                                  setShowUserMenu(false)
                                }}
                              >
                                中文
                                {language === 'zh' && <span className="check-icon">✓</span>}
                              </button>
                              <button
                                className={`lang-option ${language === 'en' ? 'active' : ''}`}
                                onClick={() => {
                                  changeLanguage('en')
                                  setShowUserMenu(false)
                                }}
                              >
                                English
                                {language === 'en' && <span className="check-icon">✓</span>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* 退出登录按钮 */}
                  <button onClick={handleLogout} className="btn-logout-primary">
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

