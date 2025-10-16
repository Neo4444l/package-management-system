import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ShelvingPage.css'

function ShelvingPage() {
  const navigate = useNavigate()
  const [selectedLocation, setSelectedLocation] = useState('')
  const [locationOptions, setLocationOptions] = useState([])

  // 从库位管理加载库位选项
  React.useEffect(() => {
    const savedLocations = localStorage.getItem('locations')
    if (savedLocations) {
      try {
        const locations = JSON.parse(savedLocations)
        setLocationOptions(locations.map(loc => loc.code))
      } catch (error) {
        console.error('Error loading locations:', error)
      }
    }
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
          ← 返回首页
        </button>

        <div className="shelving-header">
          <div className="header-icon">📦</div>
          <h1>上架管理</h1>
          <p>请选择库位号</p>
        </div>

        <div className="location-selection">
          {locationOptions.length === 0 ? (
            <div className="no-locations-warning">
              <div className="warning-icon">⚠️</div>
              <h3>暂无可用库位</h3>
              <p>请先在"退件看板 → 库位管理"中添加库位号</p>
              <button
                className="go-to-management-button"
                onClick={() => navigate('/return-dashboard/location-management')}
              >
                前往库位管理 →
              </button>
            </div>
          ) : (
            <>
              <div className="location-header-info">
                <p>共有 {locationOptions.length} 个可用库位</p>
              </div>

              <div className="location-grid">
                {locationOptions.map((location) => (
                  <button
                    key={location}
                    className={`location-button ${selectedLocation === location ? 'selected' : ''}`}
                    onClick={() => handleLocationSelect(location)}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </>
          )}

          {currentLocation && (
            <div className="selected-info">
              <p>已选择库位：<strong>{currentLocation}</strong></p>
            </div>
          )}

          <button
            className="continue-button"
            onClick={handleContinue}
            disabled={!currentLocation}
          >
            继续 →
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShelvingPage

