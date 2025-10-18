import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'
import './Login.css'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { t } = useLanguage()
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
        setError(t('auth.invalidResetLink'))
      }
    }
    checkSession()
  }, [t])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 验证新密码
      if (newPassword.length < 6) {
        throw new Error(t('auth.passwordTooShort'))
      }

      if (newPassword !== confirmPassword) {
        throw new Error(t('auth.passwordMismatch'))
      }

      // 更新密码
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setSuccess(t('auth.passwordResetSuccess'))
      
      // 3秒后跳转到登录页面
      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (error) {
      setError(error.message || t('messages.operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>📦 {t('app.title')}</h1>
        <h2>{t('auth.setNewPassword')}</h2>
        <p className="reset-description">
          {t('auth.resetDescription')}
        </p>
        
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label>{t('auth.newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('auth.enterNewPassword')}
              required
              minLength={6}
              disabled={!!error && !loading}
            />
          </div>

          <div className="form-group">
            <label>{t('auth.confirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.enterConfirmPassword')}
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
            {loading ? t('auth.processing') : success ? t('common.success') : t('common.confirm')}
          </button>
        </form>

        <div className="toggle-mode">
          <p>
            <button onClick={() => navigate('/')}>
              {t('auth.returnToLogin')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

