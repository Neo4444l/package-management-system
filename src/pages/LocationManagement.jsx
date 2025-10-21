import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../supabaseClient'
import { addLocation, getAllLocations, deleteLocation } from '../services/dataService'
import { useLanguage } from '../contexts/LanguageContext'
import { useCity } from '../contexts/CityContext'
import './LocationManagement.css'

function LocationManagement() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { currentCity } = useCity()
  const [locationInput, setLocationInput] = useState('')
  const [locations, setLocations] = useState([])
  const [notification, setNotification] = useState(null)
  const [selectedLocations, setSelectedLocations] = useState([])
  const [isOnline, setIsOnline] = useState(true)
  const canvasRef = useRef(null)

  // 从 Supabase 加载库位数据（城市过滤）
  useEffect(() => {
    if (currentCity) {
      loadLocations()
    }
  }, [currentCity])

  // 🔄 实时监听库位变化（城市过滤）
  useEffect(() => {
    if (!currentCity) return

    const subscription = supabase
      .channel(`locations-management-${currentCity}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations',
          filter: `city=eq.${currentCity}` // 只监听当前城市的库位
        },
        (payload) => {
          console.log('📍 库位管理数据变化：', payload)
          
          if (payload.eventType === 'INSERT') {
            // 其他用户添加了库位
            setLocations(prev => {
              // 避免重复（自己添加的已经在列表中）
              if (prev.some(l => l.id === payload.new.id)) {
                return prev
              }
              // 格式化新库位的日期
              const newLocation = {
                ...payload.new,
                created_at_display: payload.new.created_at 
                  ? new Date(payload.new.created_at).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    }).replace(/\//g, '-')
                  : '-'
              }
              return [...prev, newLocation]
            })
            showNotification(`📍 ${t('locationManagement.newLocationAdded')}: ${payload.new.code}`, 'info')
          } else if (payload.eventType === 'DELETE') {
            // 其他用户删除了库位
            setLocations(prev => prev.filter(l => l.id !== payload.old.id))
            setSelectedLocations(prev => prev.filter(id => id !== payload.old.id))
            showNotification(`🗑️ ${t('locationManagement.locationDeleted')}: ${payload.old.code}`, 'info')
          }
        }
      )
      .subscribe((status) => {
        console.log('🔗 库位管理订阅状态：', status)
        setIsOnline(status === 'SUBSCRIBED')
      })

    return () => subscription.unsubscribe()
  }, [currentCity])

  const loadLocations = async () => {
    try {
      const allLocations = await getAllLocations(currentCity) // 传入当前城市
      // 格式化日期显示
      const locationsWithFormattedDate = allLocations.map(loc => ({
        ...loc,
        created_at_display: loc.created_at 
          ? new Date(loc.created_at).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }).replace(/\//g, '-')
          : '-'
      }))
      setLocations(locationsWithFormattedDate)
    } catch (error) {
      console.error('Error loading locations:', error)
      showNotification(t('messages.loadingFailed'), 'error')
    }
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), type === 'info' ? 2000 : 3000)
  }

  const handleAddLocation = async (e) => {
    e.preventDefault()
    
    if (!locationInput.trim()) {
      showNotification(t('locationManagement.enterLocationCode'), 'error')
      return
    }

    // 检查是否已存在
    if (locations.some(loc => loc.code === locationInput.trim())) {
      showNotification(t('locationManagement.locationExists'), 'error')
      return
    }

    try {
      // 保存到 Supabase（传入当前城市）
      const newLocation = await addLocation(locationInput.trim(), currentCity)

      // 格式化日期
      const formattedLocation = {
        ...newLocation,
        created_at_display: newLocation.created_at 
          ? new Date(newLocation.created_at).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }).replace(/\//g, '-')
          : '-'
      }

      const updatedLocations = [...locations, formattedLocation]
      setLocations(updatedLocations)
      
      setLocationInput('')
      showNotification(`${t('locationManagement.location')} ${newLocation.code} ${t('locationManagement.addedToCloud')}`, 'success')
    } catch (error) {
      console.error('Error adding location:', error)
      showNotification(t('locationManagement.addFailed') + ': ' + error.message, 'error')
    }
  }

  const handleDeleteLocation = async (id) => {
    try {
      // 获取该库位的code
      const location = locations.find(l => l.id === id)
      if (!location) return
      
      // 查询该库位有多少包裹（仅当前城市）
      const { data: relatedPackages, error: queryError } = await supabase
        .from('packages')
        .select('id')
        .eq('location', location.code)
        .eq('city', currentCity) // 添加城市过滤
      
      if (queryError) throw queryError
      
      const packageCount = relatedPackages?.length || 0
      
      // 确认提示
      let confirmed = false
      if (packageCount > 0) {
        confirmed = window.confirm(
          `⚠️ ${t('locationManagement.deleteWarning')}:\n\n${t('locationManagement.locationHasPackages', { location: location.code, count: packageCount })}\n\n${t('locationManagement.deleteWithPackagesWarning')}\n\n${t('locationManagement.confirmContinue')}`
        )
      } else {
        confirmed = window.confirm(
          `${t('locationManagement.confirmDeleteLocation', { location: location.code })}\n\n${t('messages.actionCannotUndo')}`
        )
      }
      
      if (!confirmed) return
      
      // 1. 先删除该库位的所有包裹（仅当前城市）
      if (packageCount > 0) {
        const { error: packagesError } = await supabase
          .from('packages')
          .delete()
          .eq('location', location.code)
          .eq('city', currentCity) // 添加城市过滤
        
        if (packagesError) throw packagesError
      }
      
      // 2. 再删除库位
      await deleteLocation(id)
      
      const updatedLocations = locations.filter(loc => loc.id !== id)
      setLocations(updatedLocations)
      setSelectedLocations(selectedLocations.filter(sid => sid !== id))
      
      if (packageCount > 0) {
        showNotification(t('locationManagement.locationAndPackagesDeleted', { count: packageCount }), 'success')
      } else {
        showNotification(t('locationManagement.locationDeletedFromCloud'), 'success')
      }
    } catch (error) {
      console.error('Error deleting location:', error)
      showNotification(t('messages.deleteFailed') + ': ' + error.message, 'error')
    }
  }

  const handleSelectLocation = (id) => {
    setSelectedLocations(prev => {
      if (prev.includes(id)) {
        return prev.filter(sid => sid !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedLocations.length === locations.length) {
      setSelectedLocations([])
    } else {
      setSelectedLocations(locations.map(loc => loc.id))
    }
  }

  const handlePrintQRCodes = async () => {
    if (selectedLocations.length === 0) {
      showNotification(t('locationManagement.selectLocationsToPrint'), 'error')
      return
    }

    const selectedLocationData = locations.filter(loc => selectedLocations.includes(loc.id))
    
    // 创建打印窗口
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>库位二维码打印</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            padding: 15mm;
            background-color: #f5f5f5;
          }
          .qr-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10mm;
            max-width: 1200px;
            margin: 0 auto;
          }
          /* 每个二维码占据 15cm x 10cm 的标签 */
          .qr-item {
            width: 15cm;
            height: 10cm;
            border: 1px dashed #ccc;
            background-color: white;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
            box-sizing: border-box;
            position: relative;
            padding: 0.5cm;
          }
          /* 内容容器 - 确保完全居中 */
          .qr-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.5cm;
            width: 100%;
            height: 100%;
          }
          .qr-item canvas {
            display: block;
            /* 二维码大小，占据大部分空间 */
            width: 8.5cm !important;
            height: 8.5cm !important;
            margin: 0;
          }
          .qr-code {
            font-size: 48px;
            font-weight: bold;
            margin: 0;
            color: #000;
            text-align: center;
            letter-spacing: 3px;
            line-height: 1.2;
          }
          .qr-date {
            font-size: 18px;
            color: #666;
            text-align: center;
            margin: 0;
            line-height: 1.3;
          }
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              padding: 0;
              background-color: white;
            }
            .qr-item {
              border: none;
              background-color: white;
            }
            .qr-grid {
              gap: 5mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="qr-grid" id="qr-container"></div>
      </body>
      </html>
    `)

    const container = printWindow.document.getElementById('qr-container')

    // 生成每个二维码
    for (const location of selectedLocationData) {
      const qrItem = printWindow.document.createElement('div')
      qrItem.className = 'qr-item'

      // 创建内容容器
      const qrContent = printWindow.document.createElement('div')
      qrContent.className = 'qr-content'

      const canvas = printWindow.document.createElement('canvas')
      // 设置二维码尺寸为 8.5cm
      await QRCode.toCanvas(canvas, location.code, {
        width: 320,  // 8.5cm ≈ 320px at 96 DPI
        margin: 1,
        errorCorrectionLevel: 'H',  // 高容错率
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      const codeDiv = printWindow.document.createElement('div')
      codeDiv.className = 'qr-code'
      codeDiv.textContent = location.code

      const dateDiv = printWindow.document.createElement('div')
      dateDiv.className = 'qr-date'
      // 确保日期显示正确
      const displayDate = location.created_at_display || 
                         location.createdAtDisplay || 
                         (location.created_at ? new Date(location.created_at).toLocaleString('zh-CN', {
                           year: 'numeric',
                           month: '2-digit',
                           day: '2-digit',
                           hour: '2-digit',
                           minute: '2-digit',
                           hour12: false
                         }).replace(/\//g, '-') : '-')
      dateDiv.textContent = `${t('locationManagement.createdTime')}: ${displayDate}`

      // 将所有内容添加到内容容器
      qrContent.appendChild(canvas)
      qrContent.appendChild(codeDiv)
      qrContent.appendChild(dateDiv)
      
      // 将内容容器添加到qrItem
      qrItem.appendChild(qrContent)
      container.appendChild(qrItem)
    }

    printWindow.document.close()
    
    // 等待内容加载完成后打印
    setTimeout(() => {
      printWindow.print()
    }, 500)

    showNotification(t('locationManagement.generatingQRCodes', { count: selectedLocations.length }), 'success')
  }

  return (
    <div className="location-management-page">
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

      <div className="location-management-container">
        <button className="back-button" onClick={() => navigate('/return-dashboard')}>
          ← {t('locationManagement.backToDashboard')}
        </button>

        <div className="location-header">
          <div className="header-icon">📍</div>
          <h1>{t('locationManagement.title')}</h1>
          <p>{t('locationManagement.subtitle')}</p>
        </div>

        <form className="location-form" onSubmit={handleAddLocation}>
          <div className="form-group">
            <label htmlFor="location-input">{t('locationManagement.addNewLocation')}:</label>
            <div className="input-with-button">
              <input
                id="location-input"
                type="text"
                className="location-input"
                placeholder={t('locationManagement.enterLocationPlaceholder')}
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="add-button">
                {t('locationManagement.add')} ✓
              </button>
            </div>
          </div>
        </form>

        <div className="locations-section">
          <div className="section-header">
            <h2>
              {t('locationManagement.locationList')} ({locations.length})
              {selectedLocations.length > 0 && (
                <span className="selected-count"> - {t('locationManagement.selected', { count: selectedLocations.length })}</span>
              )}
            </h2>
            <div className="action-buttons">
              {locations.length > 0 && (
                <button className="select-all-button" onClick={handleSelectAll}>
                  {selectedLocations.length === locations.length ? t('locationManagement.deselectAll') : t('locationManagement.selectAll')}
                </button>
              )}
              <button
                className="print-button"
                onClick={handlePrintQRCodes}
                disabled={selectedLocations.length === 0}
              >
                {t('locationManagement.printQRCodes')} 🖨️
              </button>
            </div>
          </div>

          {locations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>{t('locationManagement.noLocations')}</p>
              <p className="empty-hint">{t('locationManagement.addLocationHint')}</p>
            </div>
          ) : (
            <div className="locations-grid">
              {locations.map((location) => (
                <div
                  key={location.id}
                  className={`location-card ${selectedLocations.includes(location.id) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    className="location-checkbox"
                    checked={selectedLocations.includes(location.id)}
                    onChange={() => handleSelectLocation(location.id)}
                  />
                  <div className="location-info">
                    <div className="location-code">{location.code}</div>
                    <div className="location-date">{location.created_at_display || location.createdAtDisplay}</div>
                  </div>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteLocation(location.id)}
                    title={t('locationManagement.deleteLocation')}
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

export default LocationManagement

