import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import './ReturnDashboard.css'

function ReturnDashboard() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const subModules = [
    {
      id: 'location-management',
      title: t('dashboard.locationManagement'),
      description: t('dashboard.locationManagementDesc'),
      icon: '📍',
      color: '#FF9800',
      path: '/return-dashboard/location-management'
    },
    {
      id: 'center-return',
      title: t('dashboard.centerReturn'),
      description: t('dashboard.centerReturnDesc'),
      icon: '📊',
      color: '#FF5722',
      path: '/return-dashboard/center-return'
    }
  ]

  return (
    <div className="return-dashboard-page">
      <div className="return-dashboard-container">
        <button className="back-button" onClick={() => navigate('/')}>
          ← {t('common.back')}
        </button>

        <div className="dashboard-header">
          <div className="header-icon">↩️</div>
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.selectModule')}</p>
        </div>

        <div className="submodules-grid">
          {subModules.map((module) => (
            <div
              key={module.id}
              className="submodule-card"
              onClick={() => navigate(module.path)}
              style={{ '--card-color': module.color }}
            >
              <div className="submodule-icon">{module.icon}</div>
              <h2 className="submodule-title">{module.title}</h2>
              <p className="submodule-description">{module.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ReturnDashboard




