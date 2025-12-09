import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const UserContext = createContext()

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export const UserProvider = ({ children }) => {
  const [userRole, setUserRole] = useState(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    // 检查当前session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 UserContext Auth 事件:', event)
      
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUserRole(null)
        setUsername('')
        setLoading(false) // 重要：登出后设置 loading 为 false
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setSession(session)
        if (session) {
          fetchUserRole(session.user.id)
        } else {
          setLoading(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (userId) => {
    console.log('🔍 开始获取用户角色，用户ID:', userId)
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_active, username, email')
        .eq('id', userId)
        .single()

      console.log('📥 Supabase 查询结果:', { data, error })

      if (error) {
        console.error('❌ 获取用户资料失败:', error)
        console.error('错误代码:', error.code)
        console.error('错误信息:', error.message)
        console.error('错误详情:', error.details)
        console.error('错误提示:', error.hint)
        
        // ⚠️ 临时：只对真正的错误强制登出，PGRST116 (未找到记录) 才登出
        if (error.code === 'PGRST116') {
          alert(`❌ 登录失败：找不到用户资料！\n\n您的账号可能已被删除。\n请联系管理员。`)
          await supabase.auth.signOut()
          setSession(null)
          setUserRole(null)
          setUsername('')
          setLoading(false)
          return
        } else {
          // 其他错误：显示但先不登出，让用户提供更多信息
          console.error('⚠️ 非致命错误，尝试继续...')
          alert(`⚠️ 获取用户资料时出现问题\n\n错误：${error.message}\n代码：${error.code}\n\n请截图控制台信息。`)
        }
      }

      // 检查用户是否被停用
      if (data) {
        console.log('✅ 用户资料获取成功:', {
          email: data.email,
          username: data.username,
          role: data.role,
          is_active: data.is_active
        })
        
        if (data.is_active === false) {
          console.warn('⚠️ 用户账号已被停用')
          alert(`⚠️ 您的账号已被停用！\n\n邮箱：${data.email || '未知'}\n角色：${data.role || '未知'}\n\n请联系管理员激活账号。`)
          await supabase.auth.signOut()
          setSession(null)
          setUserRole(null)
          setUsername('')
          setLoading(false)
          return
        }

        // 设置用户信息
        console.log('✅ 设置用户角色和用户名')
        setUserRole(data.role || 'user')
        setUsername(data.username || data.email?.split('@')[0] || 'User')
        console.log('✅ 用户登录成功！角色:', data.role)
      } else {
        console.error('⚠️ data 为空，这不应该发生')
        alert('⚠️ 获取用户信息失败：数据为空\n\n请截图控制台信息。')
      }
    } catch (error) {
      console.error('❌ fetchUserRole catch 块捕获异常:', error)
      console.error('异常类型:', error.name)
      console.error('异常信息:', error.message)
      console.error('异常堆栈:', error.stack)
      
      // 显示友好的错误提示
      alert(`❌ 登录异常！\n\n错误类型：${error.name || '未知'}\n错误信息：${error.message || '请查看控制台'}\n\n请截图控制台的红色错误信息。`)
      
      // 出现异常才强制登出
      await supabase.auth.signOut()
      setSession(null)
      setUserRole(null)
      setUsername('')
    } finally {
      console.log('🏁 fetchUserRole 完成，设置 loading = false')
      setLoading(false)
    }
  }

  const value = {
    userRole,
    username,
    session,
    loading
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

