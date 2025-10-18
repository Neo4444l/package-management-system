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
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // 添加超时保护（5秒）
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('查询超时')), 5000)
      )

      const queryPromise = supabase
        .from('profiles')
        .select('cities, current_city, role')
        .eq('id', user.id)
        .single()

      const { data: profile, error } = await Promise.race([queryPromise, timeout])

      if (error) throw error

      const cities = profile.cities || []
      setUserRole(profile.role)

      // 根据角色设置可访问的城市列表
      let accessibleCities = cities
      if (profile.role === 'super_admin') {
        accessibleCities = AVAILABLE_CITIES.map(c => c.code)
      }
      setUserCities(accessibleCities)

      // 设置当前城市（修复逻辑）
      const savedCity = localStorage.getItem('currentCity')
      
      // 验证并设置城市
      if (savedCity && accessibleCities.includes(savedCity)) {
        // localStorage 中的城市有效
        setCurrentCity(savedCity)
      } else if (profile.current_city && accessibleCities.includes(profile.current_city)) {
        // 使用数据库中的城市
        setCurrentCity(profile.current_city)
        localStorage.setItem('currentCity', profile.current_city)
      } else if (accessibleCities.length > 0) {
        // 使用第一个可访问的城市
        const defaultCity = accessibleCities[0]
        setCurrentCity(defaultCity)
        localStorage.setItem('currentCity', defaultCity)
        
        // 同步到数据库
        await supabase
          .from('profiles')
          .update({ current_city: defaultCity })
          .eq('id', user.id)
      } else {
        // 没有任何城市权限，默认 MIA
        console.warn('用户没有任何城市权限，使用默认城市 MIA')
        setCurrentCity('MIA')
        setUserCities(['MIA'])
        localStorage.setItem('currentCity', 'MIA')
      }
    } catch (error) {
      console.error('加载用户城市权限失败:', error)
      
      // 错误时使用安全的默认值
      setCurrentCity('MIA')
      setUserCities(['MIA'])
      setUserRole(null)
      localStorage.setItem('currentCity', 'MIA')
    } finally {
      setLoading(false)
    }
  }

  const changeCity = async (cityCode) => {
    // 检查用户是否有该城市的权限
    if (!userCities.includes(cityCode) && userRole !== 'super_admin') {
      console.error('无权访问该城市:', cityCode)
      alert('您没有权限访问该城市')
      return false
    }

    const previousCity = currentCity // 保存之前的城市，用于回退
    
    try {
      // 先更新本地状态（乐观更新）
      setCurrentCity(cityCode)
      localStorage.setItem('currentCity', cityCode)

      // 保存到数据库（带超时保护）
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('更新超时')), 3000)
        )

        const updatePromise = supabase
          .from('profiles')
          .update({ current_city: cityCode })
          .eq('id', user.id)

        await Promise.race([updatePromise, timeout])
      }
      
      console.log(`✅ 城市切换成功: ${previousCity} → ${cityCode}`)
      return true
    } catch (error) {
      console.error('切换城市失败:', error)
      
      // 回退到之前的城市
      setCurrentCity(previousCity)
      localStorage.setItem('currentCity', previousCity)
      
      alert('切换城市失败，请检查网络连接')
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

