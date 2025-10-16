import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import './ShelvingInput.css'

function ShelvingInput() {
  const navigate = useNavigate()
  const { locationId } = useParams()
  const [packageNumber, setPackageNumber] = useState('')
  const [packages, setPackages] = useState([])
  const [notification, setNotification] = useState(null)
  const inputRef = useRef(null)

  // 从 localStorage 加载已保存的包裹数据
  useEffect(() => {
    const savedPackages = localStorage.getItem('packages')
    if (savedPackages) {
      try {
        const allPackages = JSON.parse(savedPackages)
        const locationPackages = allPackages.filter(pkg => pkg.location === locationId)
        setPackages(locationPackages)
      } catch (error) {
        console.error('Error loading packages:', error)
      }
    }
  }, [locationId])

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!packageNumber.trim()) {
      showNotification('请输入包裹号', 'error')
      return
    }

    // 创建新包裹记录
    const newPackage = {
      id: Date.now(),
      packageNumber: packageNumber.trim(),
      location: locationId,
      shelvingTime: new Date().toISOString(),
      shelvingTimeDisplay: new Date().toLocaleString('zh-CN')
    }

    // 保存到 localStorage
    const savedPackages = localStorage.getItem('packages')
    const allPackages = savedPackages ? JSON.parse(savedPackages) : []
    allPackages.push(newPackage)
    localStorage.setItem('packages', JSON.stringify(allPackages))

    // 更新当前显示的列表
    setPackages([newPackage, ...packages])
    
    // 清空输入框并显示通知
    setPackageNumber('')
    showNotification(`包裹 ${newPackage.packageNumber} 已成功上架`, 'success')
    
    // 重新聚焦输入框
    inputRef.current?.focus()
  }

  const handleDelete = (id) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      // 从所有包裹中删除
      const savedPackages = localStorage.getItem('packages')
      const allPackages = savedPackages ? JSON.parse(savedPackages) : []
      const updatedPackages = allPackages.filter(pkg => pkg.id !== id)
      localStorage.setItem('packages', JSON.stringify(updatedPackages))

      // 更新当前显示的列表
      setPackages(packages.filter(pkg => pkg.id !== id))
      showNotification('记录已删除', 'success')
    }
  }

  const handleExport = () => {
    if (packages.length === 0) {
      showNotification('暂无数据可导出', 'error')
      return
    }

    // 导出为 CSV
    const headers = ['包裹号', '库位', '上架时间']
    const rows = packages.map(pkg => [
      pkg.packageNumber,
      pkg.location,
      pkg.shelvingTimeDisplay
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `上架记录_${locationId}_${Date.now()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showNotification('数据已导出', 'success')
  }

  return (
    <div className="shelving-input-page">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="shelving-input-container">
        <button className="back-button" onClick={() => navigate('/shelving')}>
          ← 返回选择库位
        </button>

        <div className="input-header">
          <div className="header-icon">📦</div>
          <h1>包裹上架</h1>
          <div className="location-badge">库位: {locationId}</div>
        </div>

        <form className="package-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="package-number">包裹号：</label>
            <div className="input-with-button">
              <input
                ref={inputRef}
                id="package-number"
                type="text"
                className="package-input"
                placeholder="请输入包裹号"
                value={packageNumber}
                onChange={(e) => setPackageNumber(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="submit-button">
                添加 ✓
              </button>
            </div>
          </div>
        </form>

        <div className="packages-section">
          <div className="section-header">
            <h2>已上架包裹 ({packages.length})</h2>
            <button 
              className="export-button"
              onClick={handleExport}
              disabled={packages.length === 0}
            >
              导出数据 📊
            </button>
          </div>

          {packages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暂无包裹记录</p>
              <p className="empty-hint">请在上方输入框中添加包裹号</p>
            </div>
          ) : (
            <div className="packages-list">
              {packages.map((pkg) => (
                <div key={pkg.id} className="package-item">
                  <div className="package-info">
                    <div className="package-number">{pkg.packageNumber}</div>
                    <div className="package-time">{pkg.shelvingTimeDisplay}</div>
                  </div>
                  <button 
                    className="delete-button"
                    onClick={() => handleDelete(pkg.id)}
                    title="删除记录"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShelvingInput


