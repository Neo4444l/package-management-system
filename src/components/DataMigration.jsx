import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { migrateFromLocalStorage, clearLocalStorage } from '../services/dataService'
import './DataMigration.css'

export default function DataMigration({ onComplete }) {
  const navigate = useNavigate()
  const [migrating, setMigrating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const checkLocalStorage = () => {
    const packages = localStorage.getItem('packages')
    const locations = localStorage.getItem('locations')
    
    const packagesCount = packages ? JSON.parse(packages).length : 0
    const locationsCount = locations ? JSON.parse(locations).length : 0
    
    return { packagesCount, locationsCount }
  }

  const handleMigrate = async () => {
    if (!window.confirm('确定要将本地数据迁移到云端吗？\n\n迁移后，所有用户都能看到这些数据。')) {
      return
    }

    setMigrating(true)
    setError('')
    setResult(null)

    try {
      const results = await migrateFromLocalStorage()
      setResult(results)
      
      if (window.confirm(
        `迁移完成！\n\n` +
        `库位：成功 ${results.locations.success} 个，失败 ${results.locations.failed} 个\n` +
        `包裹：成功 ${results.packages.success} 个，失败 ${results.packages.failed} 个\n\n` +
        `是否清除本地数据？（建议清除，避免混淆）`
      )) {
        clearLocalStorage()
        alert('本地数据已清除！请刷新页面。')
        if (onComplete) onComplete()
      }
    } catch (error) {
      setError('迁移失败：' + error.message)
    } finally {
      setMigrating(false)
    }
  }

  const handleSkip = () => {
    if (window.confirm('确定跳过数据迁移吗？\n\n您仍然可以稍后在设置中进行迁移。')) {
      if (onComplete) onComplete()
    }
  }

  const { packagesCount, locationsCount } = checkLocalStorage()

  if (packagesCount === 0 && locationsCount === 0) {
    return (
      <div className="migration-container">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回首页
        </button>
        <div className="migration-box">
          <div className="migration-icon">✅</div>
          <h2>无需迁移</h2>
          <p>本地没有发现需要迁移的数据</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="migration-container">
      <button className="back-button" onClick={() => navigate('/')}>
        ← 返回首页
      </button>
      <div className="migration-box">
        <div className="migration-icon">📦</div>
        <h2>数据迁移</h2>
        <p className="migration-desc">
          检测到您的本地存储中有数据需要迁移到云端
        </p>

        <div className="migration-stats">
          <div className="stat-item">
            <div className="stat-value">{locationsCount}</div>
            <div className="stat-label">库位</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{packagesCount}</div>
            <div className="stat-label">包裹</div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {result && (
          <div className="result-message">
            <h3>迁移完成！</h3>
            <div className="result-detail">
              <p>✅ 库位：成功 {result.locations.success} 个，失败 {result.locations.failed} 个</p>
              <p>✅ 包裹：成功 {result.packages.success} 个，失败 {result.packages.failed} 个</p>
            </div>
          </div>
        )}

        <div className="migration-actions">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="btn-migrate"
          >
            {migrating ? '迁移中...' : '开始迁移'}
          </button>
          <button
            onClick={handleSkip}
            disabled={migrating}
            className="btn-skip"
          >
            稍后迁移
          </button>
        </div>

        <div className="migration-note">
          <p><strong>注意：</strong></p>
          <ul>
            <li>迁移后，所有登录用户都能看到这些数据</li>
            <li>迁移不会删除本地数据</li>
            <li>如果库位已存在，会自动跳过</li>
            <li>建议迁移后清除本地数据，避免混淆</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

