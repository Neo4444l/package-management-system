import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Login.css'

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      // 登录成功，传递 session 而不是 user
      if (data.session) {
        onLogin(data.session)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 发送密码重置邮件
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSuccess('✅ 密码重置邮件已发送！请检查您的邮箱（包括垃圾邮件文件夹）。')
      
      // 清空表单
      setResetEmail('')
      
      // 5秒后返回登录界面
      setTimeout(() => {
        setShowResetPassword(false)
        setSuccess('')
      }, 5000)
    } catch (error) {
      setError(error.message || '发送失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (showResetPassword) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>📦 退回包裹管理系统</h1>
          <h2>忘记/修改密码</h2>
          <p className="reset-description">
            输入您的邮箱地址，我们将发送密码重置链接到您的邮箱
          </p>
          
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>邮箱</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="请输入您的注册邮箱"
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '发送中...' : '发送重置邮件'}
            </button>
          </form>

          <div className="toggle-mode">
            <p>
              <button onClick={() => {
                setShowResetPassword(false)
                setError('')
                setSuccess('')
                setResetEmail('')
              }}>
                返回登录
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>📦 退回包裹管理系统</h1>
        <h2>登录</h2>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              required
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="toggle-mode">
          <p>
            <button onClick={() => {
              setShowResetPassword(true)
              setError('')
            }}>
              忘记/修改密码
            </button>
          </p>
          <p className="admin-note">
            ℹ️ 新用户账号请联系管理员创建
          </p>
        </div>
      </div>
    </div>
  )
}

