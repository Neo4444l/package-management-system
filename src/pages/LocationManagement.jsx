import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../supabaseClient'
import { addLocation, getAllLocations, deleteLocation } from '../services/dataService'
import './LocationManagement.css'

function LocationManagement() {
  const navigate = useNavigate()
  const [locationInput, setLocationInput] = useState('')
  const [locations, setLocations] = useState([])
  const [notification, setNotification] = useState(null)
  const [selectedLocations, setSelectedLocations] = useState([])
  const [isOnline, setIsOnline] = useState(true)
  const canvasRef = useRef(null)

  // 从 Supabase 加载库位数据
  useEffect(() => {
    loadLocations()
  }, [])

  // 🔄 实时监听库位变化
  useEffect(() => {
    const subscription = supabase
      .channel('locations-management')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations'
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
              return [...prev, payload.new]
            })
            showNotification(`📍 新库位已添加：${payload.new.code}`, 'info')
          } else if (payload.eventType === 'DELETE') {
            // 其他用户删除了库位
            setLocations(prev => prev.filter(l => l.id !== payload.old.id))
            setSelectedLocations(prev => prev.filter(id => id !== payload.old.id))
            showNotification(`🗑️ 库位已被删除：${payload.old.code}`, 'info')
          }
        }
      )
      .subscribe((status) => {
        console.log('🔗 库位管理订阅状态：', status)
        setIsOnline(status === 'SUBSCRIBED')
      })

    return () => subscription.unsubscribe()
  }, [])

  const loadLocations = async () => {
    try {
      const allLocations = await getAllLocations()
      setLocations(allLocations)
    } catch (error) {
      console.error('Error loading locations:', error)
      showNotification('加载库位数据失败', 'error')
    }
  }

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), type === 'info' ? 2000 : 3000)
  }

  const handleAddLocation = async (e) => {
    e.preventDefault()
    
    if (!locationInput.trim()) {
      showNotification('请输入库位号', 'error')
      return
    }

    // 检查是否已存在
    if (locations.some(loc => loc.code === locationInput.trim())) {
      showNotification('该库位号已存在', 'error')
      return
    }

    try {
      // 保存到 Supabase
      const newLocation = await addLocation(locationInput.trim())

      const updatedLocations = [...locations, newLocation]
      setLocations(updatedLocations)
      
      setLocationInput('')
      showNotification(`库位 ${newLocation.code} 已添加到云端`, 'success')
    } catch (error) {
      console.error('Error adding location:', error)
      showNotification('添加失败：' + error.message, 'error')
    }
  }

  const handleDeleteLocation = async (id) => {
    try {
      // 获取该库位的code
      const location = locations.find(l => l.id === id)
      if (!location) return
      
      // 查询该库位有多少包裹
      const { data: relatedPackages, error: queryError } = await supabase
        .from('packages')
        .select('id')
        .eq('location', location.code)
      
      if (queryError) throw queryError
      
      const packageCount = relatedPackages?.length || 0
      
      // 确认提示
      let confirmed = false
      if (packageCount > 0) {
        confirmed = window.confirm(
          `⚠️ 警告：\n\n该库位（${location.code}）中有 ${packageCount} 个包裹。\n\n删除库位将同时删除这些包裹，此操作不可撤销！\n\n确定要继续吗？`
        )
      } else {
        confirmed = window.confirm(
          `确定要删除库位"${location.code}"吗？\n\n此操作不可撤销。`
        )
      }
      
      if (!confirmed) return
      
      // 1. 先删除该库位的所有包裹
      if (packageCount > 0) {
        const { error: packagesError } = await supabase
          .from('packages')
          .delete()
          .eq('location', location.code)
        
        if (packagesError) throw packagesError
      }
      
      // 2. 再删除库位
      await deleteLocation(id)
      
      const updatedLocations = locations.filter(loc => loc.id !== id)
      setLocations(updatedLocations)
      setSelectedLocations(selectedLocations.filter(sid => sid !== id))
      
      if (packageCount > 0) {
        showNotification(`库位及其 ${packageCount} 个包裹已删除`, 'success')
      } else {
        showNotification('库位已从云端删除', 'success')
      }
    } catch (error) {
      console.error('Error deleting location:', error)
      showNotification('删除失败：' + error.message, 'error')
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
      showNotification('请先选择要打印的库位', 'error')
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
            padding: 10mm;
          }
          .qr-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10mm;
          }
          /* 每个二维码占据 15cm x 10cm 的标签，二维码占60% */
          .qr-item {
            width: 15cm;
            height: 10cm;
            border: 1px dashed #ccc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
            padding: 1cm;
          }
          .qr-item canvas {
            display: block;
            margin-bottom: 1cm;
            /* 二维码占标签宽度的60% */
            width: 9cm !important;
            height: 9cm !important;
          }
          .qr-code {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #000;
          }
          .qr-date {
            font-size: 14px;
            color: #666;
          }
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              padding: 0;
            }
            .qr-item {
              border: none;
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

      const canvas = printWindow.document.createElement('canvas')
      // 设置更大的二维码尺寸
      await QRCode.toCanvas(canvas, location.code, {
        width: 340,  // 9cm ≈ 340px at 96 DPI
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
      dateDiv.textContent = `创建时间: ${location.created_at_display || location.createdAtDisplay}`

      qrItem.appendChild(canvas)
      qrItem.appendChild(codeDiv)
      qrItem.appendChild(dateDiv)
      container.appendChild(qrItem)
    }

    printWindow.document.close()
    
    // 等待内容加载完成后打印
    setTimeout(() => {
      printWindow.print()
    }, 500)

    showNotification(`正在生成 ${selectedLocations.length} 个二维码`, 'success')
  }

  return (
    <div className="location-management-page">
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

      <div className="location-management-container">
        <button className="back-button" onClick={() => navigate('/return-dashboard')}>
          ← 返回退件看板
        </button>

        <div className="location-header">
          <div className="header-icon">📍</div>
          <h1>库位管理</h1>
          <p>添加、管理和打印库位二维码</p>
        </div>

        <form className="location-form" onSubmit={handleAddLocation}>
          <div className="form-group">
            <label htmlFor="location-input">添加新库位：</label>
            <div className="input-with-button">
              <input
                id="location-input"
                type="text"
                className="location-input"
                placeholder="输入库位号（例如：A-01）"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="add-button">
                添加 ✓
              </button>
            </div>
          </div>
        </form>

        <div className="locations-section">
          <div className="section-header">
            <h2>
              库位列表 ({locations.length})
              {selectedLocations.length > 0 && (
                <span className="selected-count"> - 已选择 {selectedLocations.length} 个</span>
              )}
            </h2>
            <div className="action-buttons">
              {locations.length > 0 && (
                <button className="select-all-button" onClick={handleSelectAll}>
                  {selectedLocations.length === locations.length ? '取消全选' : '全选'}
                </button>
              )}
              <button
                className="print-button"
                onClick={handlePrintQRCodes}
                disabled={selectedLocations.length === 0}
              >
                打印二维码 🖨️
              </button>
            </div>
          </div>

          {locations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>暂无库位</p>
              <p className="empty-hint">请在上方输入框中添加库位号</p>
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
                    title="删除库位"
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

