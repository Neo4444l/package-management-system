import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getAllPackages, updatePackage } from '../services/dataService'
import { useLanguage } from '../contexts/LanguageContext'
import { useCity } from '../contexts/CityContext'
import './UnshelvingPage.css'

function UnshelvingPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { currentCity } = useCity()
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

  // 加载需要下架的包裹（城市过滤）
  useEffect(() => {
    if (currentCity) {
      loadPackages()
    }
  }, [currentCity])

  // 🔄 实时监听包裹变化（城市过滤）
  useEffect(() => {
    if (!currentCity) return

    const subscription = supabase
      .channel(`packages-unshelving-${currentCity}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages',
          filter: `city=eq.${currentCity}` // 只监听当前城市的包裹
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
  }, [currentCity])

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
      const allPackages = await getAllPackages(currentCity) // 传入当前城市
      // 筛选需要下架的包裹：状态为待下架
      const unshelvingPackages = allPackages.filter(pkg => 
        (pkg.package_status || pkg.packageStatus) === PENDING_REMOVAL_STATUS
      )
      setPackages(unshelvingPackages)
      updateGroupedPackages(unshelvingPackages)
    } catch (error) {
      console.error('Error loading packages:', error)
      showNotification(t('messages.loadingFailed'), 'error')
    }
  }

  const updateGroupedPackages = (pkgs = packages) => {
    // 按库位分组
    const grouped = {}
    pkgs.forEach(pkg => {
      const location = pkg.location || t('unshelving.unknownLocation')
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
      're-dispatch': t('customerService.re-dispatch'),
      're-dispatch-new-label': t('customerService.re-dispatch-new-label'),
      'return-to-customer': t('customerService.return-to-customer')
    }
    return instructionMap[instruction] || t('customerService.none')
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
      showNotification(t('unshelving.enterPackageNumber'), 'error')
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
        showNotification(`✅ ${t('unshelving.unshelvingSuccess')} ${packageNum}`, 'success')
        
        // 清空输入框，等待下次输入
        setSearchInput('')
        await loadPackages()
        inputRef.current?.focus()
      } catch (error) {
        console.error('Error unshelving package:', error)
        showNotification(t('unshelving.unshelvingFailed') + ': ' + error.message, 'error')
      }
    } else {
      // 未找到匹配，清空输入
      setSearchInput('')
      showNotification(t('unshelving.packageNotFound'), 'error')
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
          ⚠️ {t('messages.reconnecting')}
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
          ← {t('common.back')}
        </button>

        <div className="unshelving-header">
          <div className="header-icon">📤</div>
          <h1>{t('unshelving.title')}</h1>
          <p>{t('unshelving.subtitle')}</p>
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <div className="stat-value">{packages.length}</div>
            <div className="stat-label">{t('unshelving.pendingRemoval')}</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{Object.keys(groupedPackages).length}</div>
            <div className="stat-label">{t('unshelving.locationsInvolved')}</div>
          </div>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-group">
            <input
              ref={inputRef}
              type="text"
              className="search-input-large"
              placeholder={t('unshelving.enterPackageNumber')}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="search-button">
              {t('common.search')} 🔍
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
              <div className="match-title">✅ {t('unshelving.unshelvingSuccessTitle')}</div>
              <button className="close-match-button" onClick={handleClearMatch}>
                ✕
              </button>
            </div>
            <div className="match-content">
              <div className="match-info-row">
                <span className="match-label">{t('unshelving.packageNumber')}:</span>
                <span className="match-value highlight">{matchedPackage.package_number || matchedPackage.packageNumber}</span>
              </div>
              <div className="match-info-row">
                <span className="match-label">{t('unshelving.location')}:</span>
                <span className="match-value location">{matchedPackage.location}</span>
              </div>
              <div className="match-info-row">
                <span className="match-label">{t('unshelving.instruction')}:</span>
                <span 
                  className="match-status-badge"
                  style={{ backgroundColor: getInstructionColor(matchedPackage.customer_service || matchedPackage.customerService) }}
                >
                  {getInstructionLabel(matchedPackage.customer_service || matchedPackage.customerService)}
                </span>
              </div>
              <div className="match-info-row">
                <span className="match-label">{t('unshelving.shelvingTime')}:</span>
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
                {t('unshelving.successfullyUnshelved')}
                <span className="instruction-label-inline">
                  {getInstructionLabel(matchedPackage.customer_service || matchedPackage.customerService)}
                </span>
              </div>
              <div className="auto-close-hint">{t('unshelving.scanNextHint')}</div>
            </div>
          </div>
        )}

        <div className="packages-by-location">
          <h2 className="section-title">{t('unshelving.byLocation')} ({Object.keys(groupedPackages).length} {t('unshelving.locations')})</h2>
          
          {Object.keys(groupedPackages).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>{t('unshelving.noPackages')}</p>
              <p className="empty-hint">{t('unshelving.noPackagesHint')}</p>
            </div>
          ) : (
            <div className="location-groups">
              {Object.entries(groupedPackages).map(([location, pkgs]) => (
                <div key={location} className="location-group-card">
                  <div className="location-group-header">
                    <h3 className="location-name">📍 {location}</h3>
                    <span className="package-count">{pkgs.length} {t('unshelving.packages')}</span>
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

