import React, { createContext, useState, useEffect, useContext } from 'react'
import { supabase } from '../supabaseClient'

const CityContext = createContext()

// 可用城市列表
export const AVAILABLE_CITIES = [
  { code: 'MIA', name: 'Miami', nameZh: '迈阿密' },
  { code: 'WPB', name: 'West Palm Beach', nameZh: '西棕榈滩' },
  { code: 'FTM', name: 'Fort Myers', nameZh: '迈尔斯堡' },
  { code: 'MCO', name: 'Orlando', nameZh: '奥兰多' },
  { code: 'TPA', name: 'Tampa', nameZh: '坦帕' }
]

export const CityProvider = ({ children }) => {
  const [currentCity, setCurrentCity] = useState(() => {
    // 从 localStorage 获取上次选择的城市
    return localStorage.getItem('currentCity') || 'MIA'
  })
  const [userCities, setUserCities] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // 加载用户的城市权限
  useEffect(() => {
    loadUserCities()
  }, [])

  // 监听用户登录状态变化
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await loadUserCities()
      } else if (event === 'SIGNED_OUT') {
        setUserCities([])
        setUserRole(null)
        setCurrentCity('MIA')
        localStorage.removeItem('currentCity')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserCities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('cities, current_city, role')
        .eq('id', user.id)
        .single()

      if (error) throw error

      const cities = profile.cities || []
      setUserCities(cities)
      setUserRole(profile.role)

      // 如果是 super_admin，拥有所有城市权限
      if (profile.role === 'super_admin') {
        setUserCities(AVAILABLE_CITIES.map(c => c.code))
      }

      // 设置当前城市
      const savedCity = localStorage.getItem('currentCity')
      if (savedCity && cities.includes(savedCity)) {
        setCurrentCity(savedCity)
      } else if (profile.current_city && cities.includes(profile.current_city)) {
        setCurrentCity(profile.current_city)
        localStorage.setItem('currentCity', profile.current_city)
      } else if (cities.length > 0) {
        setCurrentCity(cities[0])
        localStorage.setItem('currentCity', cities[0])
      }
    } catch (error) {
      console.error('加载用户城市权限失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const changeCity = async (cityCode) => {
    // 检查用户是否有该城市的权限
    if (!userCities.includes(cityCode) && userRole !== 'super_admin') {
      console.error('无权访问该城市')
      return false
    }

    try {
      // 保存到数据库
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ current_city: cityCode })
          .eq('id', user.id)
      }

      // 更新本地状态
      setCurrentCity(cityCode)
      localStorage.setItem('currentCity', cityCode)
      
      return true
    } catch (error) {
      console.error('切换城市失败:', error)
      return false
    }
  }

  const getCityName = (cityCode, language = 'zh') => {
    const city = AVAILABLE_CITIES.find(c => c.code === cityCode)
    if (!city) return cityCode
    return language === 'zh' ? city.nameZh : city.name
  }

  const hasMultipleCities = () => {
    return userCities.length > 1 || userRole === 'super_admin'
  }

  const canAccessCity = (cityCode) => {
    return userCities.includes(cityCode) || userRole === 'super_admin'
  }

  const value = {
    currentCity,
    userCities,
    userRole,
    loading,
    changeCity,
    getCityName,
    hasMultipleCities,
    canAccessCity,
    availableCities: AVAILABLE_CITIES,
    isSuperAdmin: userRole === 'super_admin'
  }

  return (
    <CityContext.Provider value={value}>
      {children}
    </CityContext.Provider>
  )
}

export const useCity = () => {
  const context = useContext(CityContext)
  if (!context) {
    throw new Error('useCity must be used within a CityProvider')
  }
  return context
}

