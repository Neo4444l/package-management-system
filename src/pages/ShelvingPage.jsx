import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getAllLocations, getAllPackages } from '../services/dataService'
import { useLanguage } from '../contexts/LanguageContext'
import './ShelvingPage.css'

function ShelvingPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [selectedLocation, setSelectedLocation] = useState('')
  const [locations, setLocations] = useState([])
  const [isOnline, setIsOnline] = useState(true)
  const [packageCounts, setPackageCounts] = useState({})  // 每个库位的包裹数量
  const [loading, setLoading] = useState(true)  // 添加加载状态

  // 从 Supabase 加载库位选项
  useEffect(() => {
    loadLocations()
    loadPackageCounts()  // 加载包裹数量
  }, [])

  const loadLocations = async () => {
    try {
      setLoading(true)
      const allLocations = await getAllLocations()
      setLocations(allLocations)
    } catch (error) {
      console.error('Error loading locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPackageCounts = async () => {
    try {
      const allPackages = await getAllPackages()
      // 统计每个库位的包裹数量（只统计"在库内"和"待下架"的包裹）
      const counts = {}
      allPackages.forEach(pkg => {
        const status = pkg.package_status || pkg.packageStatus
        if (status === 'in-warehouse' || status === 'pending-removal') {
          const location = pkg.location
          if (location) {
            counts[location] = (counts[location] || 0) + 1
          }
        }
      })
      setPackageCounts(counts)
    } catch (error) {
      console.error('Error loading package counts:', error)
    }
  }

  // 🔄 实时监听库位变化
  useEffect(() => {
    const locationSubscription = supabase
      .channel('locations-shelving-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations'
        },
        (payload) => {
          console.log('📍 库位数据变化：', payload)
          
          if (payload.eventType === 'INSERT') {
            // 新增库位
            setLocations(prev => [...prev, payload.new])
          } else if (payload.eventType === 'DELETE') {
            // 删除库位
            setLocations(prev => prev.filter(l => l.id !== payload.old.id))
            // 如果当前选中的库位被删除，清除选择
            if (selectedLocation === payload.old.code) {
              setSelectedLocation('')
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔗 库位订阅状态：', status)
        setIsOnline(status === 'SUBSCRIBED')
      })

    return () => locationSubscription.unsubscribe()
  }, [selectedLocation])

  // 🔄 实时监听包裹变化，更新数量统计
  useEffect(() => {
    const packageSubscription = supabase
      .channel('packages-shelving-counts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages'
        },
        (payload) => {
          console.log('📦 包裹数据变化（库位统计）：', payload)
          // 重新加载包裹数量统计
          loadPackageCounts()
        }
      )
      .subscribe()

    return () => packageSubscription.unsubscribe()
  }, [])

  const handleLocationSelect = (location) => {
    setSelectedLocation(location)
  }

  const handleContinue = () => {
    if (selectedLocation) {
      navigate(`/shelving/${encodeURIComponent(selectedLocation)}`)
    }
  }

  const currentLocation = selectedLocation

  return (
    <div className="shelving-page">
      <div className="shelving-container">
        <button className="back-button" onClick={() => navigate('/')}>
          ← {t('common.back')}
        </button>

        <div className="shelving-header">
          <div className="header-icon">📦</div>
          <h1>{t('shelving.title')}</h1>
          <p>{t('shelving.selectLocation')}</p>
        </div>

        {/* 离线指示器 */}
        {!isOnline && (
          <div className="offline-indicator">
            ⚠️ {t('messages.reconnecting')}
          </div>
        )}

        <div className="location-selection">
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>{t('common.loading')}</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="no-locations-warning">
              <div className="warning-icon">⚠️</div>
              <h3>{t('shelving.noLocations')}</h3>
              <p>{t('shelving.addLocationsFirst')}</p>
              <button
                className="go-to-management-button"
                onClick={() => navigate('/return-dashboard/location-management')}
              >
                {t('shelving.goToManagement')} →
              </button>
            </div>
          ) : (
            <>
              <div className="location-header-info">
                <p>{t('shelving.totalLocations', { count: locations.length })}</p>
              </div>

              <div className="location-grid">
                {locations.map((location) => {
                  const count = packageCounts[location.code] || 0
                  return (
                    <button
                      key={location.id}
                      className={`location-button ${selectedLocation === location.code ? 'selected' : ''}`}
                      onClick={() => handleLocationSelect(location.code)}
                    >
                      <span className="location-code">{location.code}</span>
                      <span className="package-count">{count} {t('shelving.items')}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {currentLocation && (
            <div className="selected-info">
              <p>{t('shelving.selectedLocation')}: <strong>{currentLocation}</strong></p>
            </div>
          )}

          <button
            className="continue-button"
            onClick={handleContinue}
            disabled={!currentLocation}
          >
            {t('common.continue')} →
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShelvingPage

