import React from 'react'
import { useNavigate } from 'react-router-dom'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()

  const modules = [
    {
      id: 'shelving',
      title: '上架',
      description: '选择库位并录入包裹信息',
      icon: '📦',
      color: '#4CAF50',
      path: '/shelving'
    },
    {
      id: 'unshelving',
      title: '下架',
      description: '包裹下架管理',
      icon: '📤',
      color: '#2196F3',
      path: '/unshelving'
    },
    {
      id: 'return',
      title: '退件看板',
      description: '库位管理与中心退回管理',
      icon: '↩️',
      color: '#FF9800',
      path: '/return-dashboard'
    }
  ]

  return (
    <div className="home-page">
      <div className="home-container">
        <header className="home-header">
          <h1 className="home-title">包裹管理系统</h1>
          <p className="home-subtitle">Package Management System</p>
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
              {module.disabled && <span className="coming-soon">即将推出</span>}
            </div>
          ))}
        </div>

        <footer className="home-footer">
          <p>&copy; 2025 包裹管理系统. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}

export default HomePage

