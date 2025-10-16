import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Login.css'

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 验证新密码
      if (newPassword.length < 6) {
        throw new Error('新密码至少需要6个字符')
      }

      if (newPassword !== confirmPassword) {
        throw new Error('两次输入的新密码不一致')
      }

      // 先登录验证旧密码
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) throw new Error('当前密码错误')

      // 更新密码
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      setSuccess('密码修改成功！')
      
      // 清空表单
      setEmail('')
      setPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      // 2秒后返回登录界面
      setTimeout(() => {
        setShowChangePassword(false)
        setSuccess('')
      }, 2000)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (showChangePassword) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>📦 包裹管理系统</h1>
          <h2>修改密码</h2>
          
          <form onSubmit={handleChangePassword}>
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
              <label>当前密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入当前密码"
                required
              />
            </div>

            <div className="form-group">
              <label>新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label>确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                required
                minLength={6}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '处理中...' : '确认修改'}
            </button>
          </form>

          <div className="toggle-mode">
            <p>
              <button onClick={() => {
                setShowChangePassword(false)
                setError('')
                setSuccess('')
                setEmail('')
                setPassword('')
                setNewPassword('')
                setConfirmPassword('')
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
        <h1>📦 包裹管理系统</h1>
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
              setShowChangePassword(true)
              setError('')
            }}>
              修改密码
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

