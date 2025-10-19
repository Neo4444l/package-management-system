import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'
import './HomePage.css'
import packageInfo from '../../package.json'

function HomePage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const version = packageInfo.version
  const [userRole, setUserRole] = useState(null)

  // 加载用户角色
  useEffect(() => {
    loadUserRole()
  }, [])

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setUserRole(profile.role)
        }
      }
    } catch (error) {
      console.error('获取用户角色失败:', error)
    }
  }

  const modules = [
    {
      id: 'shelving',
      title: t('home.shelving'),
      description: t('home.shelvingDesc'),
      icon: '📦',
      color: '#4CAF50',
      path: '/shelving'
    },
    {
      id: 'unshelving',
      title: t('home.unshelving'),
      description: t('home.unshelvingDesc'),
      icon: '📤',
      color: '#2196F3',
      path: '/unshelving'
    },
    {
      id: 'return',
      title: t('home.returnDashboard'),
      description: t('home.returnDashboardDesc'),
      icon: '↩️',
      color: '#FF9800',
      path: '/return-dashboard'
    }
  ]

  // 如果用户是 admin 或 super_admin，添加 User Management 模块
  if (userRole === 'admin' || userRole === 'super_admin') {
    modules.push({
      id: 'user-management',
      title: t('nav.userManagement'),
      description: t('home.userManagementDesc'),
      icon: '👥',
      color: '#9C27B0',
      path: '/user-management'
    })
  }

  return (
    <div className="home-page">
      <div className="home-container">
        <header className="home-header">
          <h1 className="home-title">{t('app.title')}</h1>
          <p className="home-subtitle">Return Package Management System</p>
        </header>

        <div className="modules-grid">
          {modules.map((module) => (
            <div
              key={module.id}
              className={`module-card ${module.disabled ? 'disabled' : ''}`}
              onClick={() => !module.disabled && navigate(module.path)}
              style={{ '--card-color': module.color }}
            >
              <div className="module-icon">{module.icon}</div>
              <h2 className="module-title">{module.title}</h2>
              <p className="module-description">{module.description}</p>
              {module.disabled && <span className="coming-soon">Coming Soon</span>}
            </div>
          ))}
        </div>

        <footer className="home-footer">
          <p>&copy; 2025 {t('app.title')} v{version}. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}

export default HomePage

