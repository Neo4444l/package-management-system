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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_active, username')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUserRole(data?.role || 'user')
      setUsername(data?.username || session?.user?.email?.split('@')[0] || 'User')
    } catch (error) {
      console.error('获取用户角色失败:', error)
      setUserRole('user')
      setUsername(session?.user?.email?.split('@')[0] || 'User')
    } finally {
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

