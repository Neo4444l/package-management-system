import React, { createContext, useState, useEffect, useContext, useRef } from 'react'
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
  const [userCities, setUserCities] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // 使用 ref 防止重复加载
  const isLoadingRef = useRef(false)
  const hasLoadedRef = useRef(false)

  // 监听认证状态变化
  useEffect(() => {
    // 初始加载
    if (!hasLoadedRef.current && !isLoadingRef.current) {
      loadUserCities()
    }

    // 监听登出事件，重置状态
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth 事件:', event, session ? '有 session' : '无 session')
      console.log('📊 hasLoadedRef:', hasLoadedRef.current, 'isLoadingRef:', isLoadingRef.current)
      
      if (event === 'SIGNED_OUT') {
        console.log('🚪 CityContext: 用户已登出，重置状态')
        // 重置所有状态
        setCurrentCity('MIA')
        setUserCities([])
        setUserRole(null)
        setLoading(false)
        hasLoadedRef.current = false
        isLoadingRef.current = false
        // 清除本地存储
        localStorage.removeItem('currentCity')
      } else if (event === 'INITIAL_SESSION' && session) {
        // 只在初始 session 时加载，忽略后续的 TOKEN_REFRESHED 等事件
        console.log('🔑 CityContext: 初始 session，加载权限')
        if (!hasLoadedRef.current) {
          loadUserCities()
        }
      } else if (event === 'SIGNED_IN' && session && !hasLoadedRef.current) {
        // 只在未加载过数据时才响应 SIGNED_IN（真正的新登录）
        // 如果已经加载过（hasLoadedRef.current === true），则忽略（可能是 token 刷新触发的）
        console.log('🔑 CityContext: 检测到新登录，加载权限')
        loadUserCities()
      }
      // 忽略其他事件（如 TOKEN_REFRESHED, USER_UPDATED 等）
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // 空依赖数组，只执行一次

  const loadUserCities = async () => {
    // 防止重复调用
    if (isLoadingRef.current || hasLoadedRef.current) {
      console.log('⚠️ CityContext: 已经在加载或已加载，跳过')
      return
    }

    isLoadingRef.current = true
    setLoading(true)

    try {
      console.log('🔄 CityContext: 开始加载用户城市权限...')
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.log('❌ CityContext: 未登录')
        setLoading(false)
        isLoadingRef.current = false
        return
      }

      console.log('✅ CityContext: 用户已登录 -', user.email)

      // 添加超时保护
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('查询超时')), 5000)
      )

      const queryPromise = supabase
        .from('profiles')
        .select('cities, current_city, role')
        .eq('id', user.id)
        .single()

      const { data: profile, error } = await Promise.race([queryPromise, timeoutPromise])

      if (error) {
        console.error('❌ CityContext: 查询失败:', error)
        throw error
      }

      console.log('✅ CityContext: 数据获取成功 -', {
        role: profile.role,
        cities: profile.cities,
        current_city: profile.current_city
      })

      const cities = profile.cities || []
      setUserRole(profile.role)

      // 根据角色设置可访问的城市列表
      let accessibleCities = cities
      if (profile.role === 'super_admin') {
        accessibleCities = AVAILABLE_CITIES.map(c => c.code)
        console.log('✅ CityContext: Super Admin - 所有城市可访问')
      }
      setUserCities(accessibleCities)

      // 设置当前城市
      const savedCity = localStorage.getItem('currentCity')
      
      // 优先使用数据库中的城市（如果在权限范围内）
      if (profile.current_city && accessibleCities.includes(profile.current_city)) {
        console.log('✅ CityContext: 使用数据库城市 -', profile.current_city)
        setCurrentCity(profile.current_city)
        localStorage.setItem('currentCity', profile.current_city)
      } else if (savedCity && accessibleCities.includes(savedCity)) {
        // 其次使用保存的城市（如果在权限范围内）
        console.log('✅ CityContext: 使用已保存的城市 -', savedCity)
        setCurrentCity(savedCity)
        // 同步到数据库
        await supabase
          .from('profiles')
          .update({ current_city: savedCity })
          .eq('id', user.id)
      } else if (accessibleCities.length > 0) {
        // 如果都不在权限范围内，使用第一个有权限的城市
        const defaultCity = accessibleCities[0]
        console.log('⚠️ CityContext: 城市不在权限范围，使用第一个授权城市 -', defaultCity)
        setCurrentCity(defaultCity)
        localStorage.setItem('currentCity', defaultCity)
        // 同步到数据库
        await supabase
          .from('profiles')
          .update({ current_city: defaultCity })
          .eq('id', user.id)
      } else {
        console.error('❌ CityContext: 用户没有任何城市权限！')
        setCurrentCity('MIA')
        setUserCities(['MIA'])
        localStorage.setItem('currentCity', 'MIA')
      }

      hasLoadedRef.current = true
      console.log('✅ CityContext: 加载完成')
    } catch (error) {
      console.error('❌ CityContext: 加载失败:', error)
      
      // 错误时使用安全的默认值
      setCurrentCity('MIA')
      setUserCities(['MIA'])
      setUserRole(null)
      localStorage.setItem('currentCity', 'MIA')
      hasLoadedRef.current = true
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }

  const changeCity = async (cityCode) => {
    console.log('🔄 CityContext: 请求切换城市 -', currentCity, '→', cityCode)
    
    // 检查权限
    if (!userCities.includes(cityCode) && userRole !== 'super_admin') {
      console.error('❌ CityContext: 无权访问该城市')
      alert('您没有权限访问该城市')
      return false
    }

    const previousCity = currentCity
    
    try {
      // 乐观更新：先更新本地状态
      setCurrentCity(cityCode)
      localStorage.setItem('currentCity', cityCode)
      console.log('✅ CityContext: 本地状态已更新')

      // 后台同步到数据库（带超时）
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('更新超时')), 3000)
        )

        const updatePromise = supabase
          .from('profiles')
          .update({ current_city: cityCode })
          .eq('id', user.id)

        await Promise.race([updatePromise, timeoutPromise])
        console.log('✅ CityContext: 数据库已同步')
      }
      
      // 不需要刷新页面，各组件的 useEffect 会自动响应 currentCity 变化
      console.log('✅ CityContext: 城市切换完成，无需刷新页面')
      
      return true
    } catch (error) {
      console.error('❌ CityContext: 切换失败:', error)
      
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
    // Super Admin 可以访问所有城市，视为有多个城市
    if (userRole === 'super_admin') {
      return AVAILABLE_CITIES.length > 1
    }
    // 普通用户：检查实际拥有的城市数量
    return userCities && userCities.length > 1
  }

  const canAccessCity = (cityCode) => {
    // Super Admin 可以访问所有城市
    if (userRole === 'super_admin') {
      return true
    }
    // 普通用户：检查是否在授权的城市列表中
    return userCities && userCities.includes(cityCode)
  }

  const value = {
    currentCity,
    userCities: userCities || [],  // 确保不为 null/undefined
    userRole,
    loading,
    changeCity,
    getCityName,
    hasMultipleCities,
    canAccessCity,
    availableCities: AVAILABLE_CITIES,
    isSuperAdmin: userRole === 'super_admin',
    // 添加一个辅助方法：获取用户实际可访问的城市列表
    getAccessibleCities: () => {
      if (userRole === 'super_admin') {
        return AVAILABLE_CITIES
      }
      return AVAILABLE_CITIES.filter(city => userCities && userCities.includes(city.code))
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>🔄 加载中...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          正在初始化城市信息...
        </div>
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
