import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Login.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // 检查是否有访问令牌（从邮件链接）
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('无效的重置链接或链接已过期。请重新申请密码重置。')
      }
    }
    checkSession()
  }, [])

  const handleResetPassword = async (e) => {
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

      // 更新密码
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setSuccess('✅ 密码重置成功！3秒后跳转到登录页面...')
      
      // 3秒后跳转到登录页面
      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (error) {
      setError(error.message || '密码重置失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>📦 退回包裹管理系统</h1>
        <h2>设置新密码</h2>
        <p className="reset-description">
          请输入您的新密码
        </p>
        
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label>新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少6位）"
              required
              minLength={6}
              disabled={!!error && !loading}
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
              disabled={!!error && !loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button 
            type="submit" 
            disabled={loading || (!!error && !loading) || success} 
            className="btn-primary"
          >
            {loading ? '处理中...' : success ? '重置成功' : '确认重置'}
          </button>
        </form>

        <div className="toggle-mode">
          <p>
            <button onClick={() => navigate('/')}>
              返回登录
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

