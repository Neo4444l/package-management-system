import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getAllPackages, updatePackage } from '../services/dataService'
import './UnshelvingPage.css'

function UnshelvingPage() {
  const navigate = useNavigate()
  const [packages, setPackages] = useState([])
  const [groupedPackages, setGroupedPackages] = useState({})
  const [searchInput, setSearchInput] = useState('')
  const [matchedPackage, setMatchedPackage] = useState(null)
  const [notification, setNotification] = useState(null)
  const [isOnline, setIsOnline] = useState(true)
  const inputRef = useRef(null)
  const audioRef = useRef(null)

  // 需要下架的状态：待下架
  const PENDING_REMOVAL_STATUS = 'pending-removal'

  // 加载需要下架的包裹
  useEffect(() => {
    loadPackages()
  }, [])

  // 🔄 实时监听包裹变化
  useEffect(() => {
    const subscription = supabase
      .channel('packages-unshelving')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages'
        },
        async (payload) => {
          console.log('📦 包裹数据变化（下架页面）：', payload)
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // 重新加载数据以确保获取最新信息
            await loadPackages()
          } else if (payload.eventType === 'DELETE') {
            // 包裹被删除
            setPackages(prev => prev.filter(p => p.id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        console.log('🔗 下架页面订阅状态：', status)
        setIsOnline(status === 'SUBSCRIBED')
      })

    return () => subscription.unsubscribe()
  }, [])

  // 🔄 当 packages 变化时，自动更新分组
  useEffect(() => {
    updateGroupedPackages(packages)
  }, [packages])

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const loadPackages = async () => {
    try {
      const allPackages = await getAllPackages()
      // 筛选需要下架的包裹：状态为待下架
      const unshelvingPackages = allPackages.filter(pkg => 
        (pkg.package_status || pkg.packageStatus) === PENDING_REMOVAL_STATUS
      )
      setPackages(unshelvingPackages)
      updateGroupedPackages(unshelvingPackages)
    } catch (error) {
      console.error('Error loading packages:', error)
      showNotification('加载包裹数据失败', 'error')
    }
  }

  const updateGroupedPackages = (pkgs = packages) => {
    // 按库位分组
    const grouped = {}
    pkgs.forEach(pkg => {
      const location = pkg.location || '未知库位'
      if (!grouped[location]) {
        grouped[location] = []
      }
      grouped[location].push(pkg)
    })
    setGroupedPackages(grouped)
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 5000)
  }

  const playSound = () => {
    // 播放提示音
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err))
    }
  }

  const getInstructionLabel = (instruction) => {
    const instructionMap = {
      're-dispatch': '重派',
      're-dispatch-new-label': '重派（新面单）',
      'return-to-customer': '退回客户'
    }
    return instructionMap[instruction] || '无指令'
  }

  const getInstructionColor = (instruction) => {
    const colorMap = {
      're-dispatch': '#9C27B0',
      're-dispatch-new-label': '#75D025',
      'return-to-customer': '#F44336'
    }
    return colorMap[instruction] || '#999'
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    
    if (!searchInput.trim()) {
      showNotification('请输入运单号', 'error')
      return
    }

    // 查找匹配的包裹
    const matched = packages.find(pkg => {
      const packageNum = pkg.package_number || pkg.packageNumber
      return packageNum.trim() === searchInput.trim()
    })

    if (matched) {
      try {
        // 找到匹配，更新到 Supabase（使用正确的字段名：snake_case）
        await updatePackage(matched.id, {
          package_status: 'removed',  // 修复：使用 snake_case
          unshelving_time: new Date().toISOString()  // 添加下架时间
        })

        // 显示匹配结果和强提醒（保留直到下次匹配）
        setMatchedPackage(matched)
        playSound()
        const packageNum = matched.package_number || matched.packageNumber
        showNotification(`✅ 下架成功！运单 ${packageNum}`, 'success')
        
        // 清空输入框，等待下次输入
        setSearchInput('')
        await loadPackages()
        inputRef.current?.focus()
      } catch (error) {
        console.error('Error unshelving package:', error)
        showNotification('下架失败：' + error.message, 'error')
      }
    } else {
      // 未找到匹配，清空输入
      setSearchInput('')
      showNotification('未找到匹配的运单号', 'error')
      inputRef.current?.focus()
    }
  }

  const handleClearMatch = () => {
    setMatchedPackage(null)
    setSearchInput('')
    inputRef.current?.focus()
  }

  return (
    <div className="unshelving-page">
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

      {/* 提示音 */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKjo77RgGwU7k9n0yHkpBSh+zPLaizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBSh+zPDbizsIHG3A8eiXSQwJTaXm8bhcFQlDnOH3vGkdBCx+zPLaizsIG2y+8eqZTAsPUKfo77RgGwU6k9j0yHkpBQ=="></audio>

      <div className="unshelving-container">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回首页
        </button>

        <div className="unshelving-header">
          <div className="header-icon">📤</div>
          <h1>下架管理</h1>
          <p>扫描或输入运单号进行下架</p>
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">{packages.length}</div>
            <div className="stat-label">待下架运单</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{Object.keys(groupedPackages).length}</div>
            <div className="stat-label">涉及库位</div>
          </div>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-group">
            <input
              ref={inputRef}
              type="text"
              className="search-input-large"
              placeholder="请输入或扫描运单号..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="search-button">
              查找 🔍
            </button>
          </div>
        </form>

        {matchedPackage && (
          <div 
            className="match-result-card"
            style={{ 
              background: `linear-gradient(135deg, ${getInstructionColor(matchedPackage.customer_service || matchedPackage.customerService)} 0%, ${getInstructionColor(matchedPackage.customer_service || matchedPackage.customerService)}dd 100%)`
            }}
          >
            <div className="match-header">
              <div className="match-title">✅ 下架成功！</div>
              <button className="close-match-button" onClick={handleClearMatch}>
                ✕
              </button>
            </div>
            <div className="match-content">
              <div className="match-info-row">
                <span className="match-label">运单号：</span>
                <span className="match-value highlight">{matchedPackage.package_number || matchedPackage.packageNumber}</span>
              </div>
              <div className="match-info-row">
                <span className="match-label">库位号：</span>
                <span className="match-value location">{matchedPackage.location}</span>
              </div>
              <div className="match-info-row">
                <span className="match-label">客服指令：</span>
                <span 
                  className="match-status-badge"
                  style={{ backgroundColor: getInstructionColor(matchedPackage.customer_service || matchedPackage.customerService) }}
                >
                  {getInstructionLabel(matchedPackage.customer_service || matchedPackage.customerService)}
                </span>
              </div>
              <div className="match-info-row">
                <span className="match-label">上架时间：</span>
                <span className="match-value">
                  {matchedPackage.shelving_time_display || 
                   matchedPackage.shelvingTimeDisplay || 
                   (matchedPackage.shelving_time ? new Date(matchedPackage.shelving_time).toLocaleString('zh-CN') : '-')}
                </span>
              </div>
            </div>
            <div className="match-success-indicator">
              <div className="success-icon">✅</div>
              <div className="success-text">
                已成功下架！
                <span className="instruction-label-inline">
                  {getInstructionLabel(matchedPackage.customer_service || matchedPackage.customerService)}
                </span>
              </div>
              <div className="auto-close-hint">扫描下一个运单即可更新</div>
            </div>
          </div>
        )}

        <div className="packages-by-location">
          <h2 className="section-title">按库位分类 ({Object.keys(groupedPackages).length} 个库位)</h2>
          
          {Object.keys(groupedPackages).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暂无待下架运单</p>
              <p className="empty-hint">运单在"中心退回管理"中下达指令后，状态会自动变为"待下架"并显示在此处</p>
            </div>
          ) : (
            <div className="location-groups">
              {Object.entries(groupedPackages).map(([location, pkgs]) => (
                <div key={location} className="location-group-card">
                  <div className="location-group-header">
                    <h3 className="location-name">📍 {location}</h3>
                    <span className="package-count">{pkgs.length} 个运单</span>
                  </div>
                  <div className="packages-list">
                    {pkgs.map((pkg) => (
                      <div key={pkg.id} className="package-item-compact">
                        <div className="package-number">{pkg.package_number || pkg.packageNumber}</div>
                        <span 
                          className="status-badge-small"
                          style={{ backgroundColor: getInstructionColor(pkg.customer_service || pkg.customerService) }}
                        >
                          {getInstructionLabel(pkg.customer_service || pkg.customerService)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UnshelvingPage

