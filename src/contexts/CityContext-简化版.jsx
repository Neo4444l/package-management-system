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
    return localStorage.getItem('currentCity') || 'MIA'
  })
  const [userCities, setUserCities] = useState(['MIA'])
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // 加载用户角色和城市权限（简化版 - 不写数据库）
  useEffect(() => {
    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      console.log('🔄 加载用户信息...')
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('❌ 未登录')
        setLoading(false)
        return
      }

      console.log('✅ 用户已登录:', user.email)

      // 只读取，不更新数据库
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('cities, role')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('❌ 读取 profile 失败:', error)
        // 使用默认值
        setUserRole('user')
        setUserCities(['MIA'])
        setLoading(false)
        return
      }

      console.log('✅ Profile 读取成功:', profile)

      const cities = profile.cities || ['MIA']
      setUserRole(profile.role)

      // 根据角色设置城市列表
      if (profile.role === 'super_admin') {
        setUserCities(AVAILABLE_CITIES.map(c => c.code))
      } else {
        setUserCities(cities)
      }

      // 验证 localStorage 中的城市是否有效
      const savedCity = localStorage.getItem('currentCity')
      const validCities = profile.role === 'super_admin' 
        ? AVAILABLE_CITIES.map(c => c.code) 
        : cities

      if (!savedCity || !validCities.includes(savedCity)) {
        const defaultCity = validCities[0] || 'MIA'
        console.log('⚠️ localStorage 城市无效，使用默认:', defaultCity)
        setCurrentCity(defaultCity)
        localStorage.setItem('currentCity', defaultCity)
      }

      console.log('✅ 用户信息加载完成')
      setLoading(false)
    } catch (error) {
      console.error('❌ 加载用户信息失败:', error)
      // 使用安全默认值
      setUserRole('user')
      setUserCities(['MIA'])
      setCurrentCity('MIA')
      setLoading(false)
    }
  }

  // 简化版切换城市 - 只更新 localStorage，不写数据库
  const changeCity = (cityCode) => {
    console.log('🔄 切换城市:', currentCity, '→', cityCode)
    
    // 检查权限
    const hasAccess = userCities.includes(cityCode) || userRole === 'super_admin'
    if (!hasAccess) {
      console.error('❌ 无权访问城市:', cityCode)
      alert('您没有权限访问该城市')
      return false
    }

    // 只更新本地状态
    setCurrentCity(cityCode)
    localStorage.setItem('currentCity', cityCode)
    
    console.log('✅ 城市切换成功（仅本地）')
    
    // 不再写数据库，直接刷新页面
    setTimeout(() => {
      window.location.reload()
    }, 100)
    
    return true
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

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        🔄 加载中...
      </div>
    )
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

