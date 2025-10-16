import { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Login.css'

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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
      onLogin(data.user)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      alert('注册成功！请检查您的邮箱进行验证。')
      setIsSignUp(false)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>📦 包裹管理系统</h1>
        <h2>{isSignUp ? '注册账号' : '登录'}</h2>
        
        <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
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
              placeholder="请输入密码（至少6位）"
              required
              minLength={6}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
          </button>
        </form>

        <div className="toggle-mode">
          {isSignUp ? (
            <p>
              已有账号？
              <button onClick={() => setIsSignUp(false)}>立即登录</button>
            </p>
          ) : (
            <p>
              还没有账号？
              <button onClick={() => setIsSignUp(true)}>立即注册</button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

