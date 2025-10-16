import React from 'react'
import { useNavigate } from 'react-router-dom'
import './ReturnDashboard.css'

function ReturnDashboard() {
  const navigate = useNavigate()

  const subModules = [
    {
      id: 'location-management',
      title: '库位管理',
      description: '管理库位号、生成二维码',
      icon: '📍',
      color: '#FF9800',
      path: '/return-dashboard/location-management'
    },
    {
      id: 'center-return',
      title: '中心退回管理',
      description: '运单查询、状态管理、指令下达',
      icon: '📊',
      color: '#FF5722',
      path: '/return-dashboard/center-return'
    }
  ]

  return (
    <div className="return-dashboard-page">
      <div className="return-dashboard-container">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回首页
        </button>

        <div className="dashboard-header">
          <div className="header-icon">↩️</div>
          <h1>退件看板</h1>
          <p>选择功能模块</p>
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


