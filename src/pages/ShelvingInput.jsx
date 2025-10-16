import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { addPackage, getPackagesByLocation, deletePackage } from '../services/dataService'
import './ShelvingInput.css'

function ShelvingInput() {
  const navigate = useNavigate()
  const { locationId } = useParams()
  const [packageNumber, setPackageNumber] = useState('')
  const [packages, setPackages] = useState([])
  const [notification, setNotification] = useState(null)
  const [isOnline, setIsOnline] = useState(true)
  const inputRef = useRef(null)

  // 从 Supabase 加载已保存的包裹数据
  useEffect(() => {
    loadPackages()
  }, [locationId])

  // 🔄 实时数据同步
  useEffect(() => {
    // 创建实时订阅
    const subscription = supabase
      .channel(`packages-location-${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages',
          filter: `location=eq.${locationId}`
        },
        (payload) => {
          console.log('📦 包裹数据变化：', payload)
          
          if (payload.eventType === 'INSERT') {
            // 其他用户上架了包裹
            setPackages(prev => {
              // 避免重复添加（自己上架的已经添加了）
              if (prev.some(p => p.id === payload.new.id)) {
                return prev
              }
              return [payload.new, ...prev]
            })
            showNotification(`📦 新包裹上架：${payload.new.package_number}`, 'info')
          } else if (payload.eventType === 'DELETE') {
            // 其他用户删除了包裹
            setPackages(prev => prev.filter(p => p.id !== payload.old.id))
            showNotification(`🗑️ 包裹已被删除`, 'info')
          } else if (payload.eventType === 'UPDATE') {
            // 包裹信息被更新
            setPackages(prev => prev.map(p => 
              p.id === payload.new.id ? payload.new : p
            ))
          }
        }
      )
      .subscribe((status) => {
        console.log('🔗 订阅状态：', status)
        if (status === 'SUBSCRIBED') {
          setIsOnline(true)
        } else if (status === 'CLOSED') {
          setIsOnline(false)
        }
      })

    // 清理订阅
    return () => {
      console.log('🔌 取消订阅')
      subscription.unsubscribe()
    }
  }, [locationId])

  const loadPackages = async () => {
    try {
      const locationPackages = await getPackagesByLocation(locationId)
      setPackages(locationPackages)
    } catch (error) {
      console.error('Error loading packages:', error)
      showNotification('加载包裹数据失败', 'error')
    }
  }

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!packageNumber.trim()) {
      showNotification('请输入包裹号', 'error')
      return
    }

    try {
      // 创建新包裹记录并保存到 Supabase
      const newPackage = await addPackage({
        packageNumber: packageNumber.trim(),
        location: locationId
      })

      // 更新当前显示的列表
      setPackages([newPackage, ...packages])
      
      // 清空输入框并显示通知
      setPackageNumber('')
      showNotification(`包裹 ${newPackage.package_number} 已成功上架到云端`, 'success')
      
      // 重新聚焦输入框
      inputRef.current?.focus()
    } catch (error) {
      console.error('Error adding package:', error)
      showNotification('上架失败：' + error.message, 'error')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      try {
        // 从 Supabase 删除
        await deletePackage(id)

        // 更新当前显示的列表
        setPackages(packages.filter(pkg => pkg.id !== id))
        showNotification('记录已从云端删除', 'success')
      } catch (error) {
        console.error('Error deleting package:', error)
        showNotification('删除失败：' + error.message, 'error')
      }
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
      pkg.package_number || pkg.packageNumber,
      pkg.location,
      pkg.shelving_time_display || pkg.shelvingTimeDisplay
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
      {/* 离线指示器 */}
      {!isOnline && (
        <div className="offline-indicator">
          ⚠️ 连接已断开，正在重连...
        </div>
      )}

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
                    <div className="package-number">{pkg.package_number || pkg.packageNumber}</div>
                    <div className="package-time">{pkg.shelving_time_display || pkg.shelvingTimeDisplay}</div>
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


