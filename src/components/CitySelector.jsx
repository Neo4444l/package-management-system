import React, { useState } from 'react'
import { useCity } from '../contexts/CityContext'
import { useLanguage } from '../contexts/LanguageContext'
import './CitySelector.css'

function CitySelector() {
  const { currentCity, changeCity, hasMultipleCities, getAccessibleCities } = useCity()
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // 如果用户只有一个城市权限，不显示选择器
  if (!hasMultipleCities()) {
    return (
      <div className="city-display-only">
        <span className="city-icon">🏙️</span>
        <span className="city-name">{currentCity}</span>
      </div>
    )
  }

  const handleCityChange = async (cityCode) => {
    if (cityCode === currentCity) {
      setIsOpen(false)
      return
    }

    setLoading(true)
    const success = await changeCity(cityCode)
    setLoading(false)
    
    if (success) {
      setIsOpen(false)
      // 城市已切换，各组件会自动响应
    } else {
      alert(t('city.changeFailed'))
    }
  }

  // 获取用户可访问的城市列表（使用统一的方法）
  const accessibleCities = getAccessibleCities()

  return (
    <div className="city-selector">
      <button 
        className="city-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <span className="city-icon">🏙️</span>
        <span className="city-name">{currentCity}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <>
          <div className="city-dropdown-overlay" onClick={() => setIsOpen(false)} />
          <div className="city-dropdown">
            <div className="city-dropdown-header">
              {t('city.selectCity')}
            </div>
            <div className="city-list">
              {accessibleCities.map(city => (
                <button
                  key={city.code}
                  className={`city-item ${currentCity === city.code ? 'active' : ''}`}
                  onClick={() => handleCityChange(city.code)}
                  disabled={loading}
                >
                  <span className="city-code">{city.code}</span>
                  {currentCity === city.code && (
                    <span className="check-icon">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CitySelector

