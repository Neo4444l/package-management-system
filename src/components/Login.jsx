import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'
import './Login.css'

export default function Login({ onLogin }) {
  const { t, language, changeLanguage } = useLanguage()
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

      setSuccess(t('auth.passwordResetEmailSent'))
      
      // 清空表单
      setResetEmail('')
      
      // 5秒后返回登录界面
      setTimeout(() => {
        setShowResetPassword(false)
        setSuccess('')
      }, 5000)
    } catch (error) {
      setError(error.message || t('messages.operationFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (showResetPassword) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>📦 {t('app.title')}</h1>
          <h2>{t('auth.forgotPassword')}</h2>
          <p className="reset-description">
            {t('auth.resetDescription')}
          </p>
          
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>{t('auth.email')}</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder={t('auth.enterRegisteredEmail')}
                required
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? t('auth.sendingEmail') : t('auth.sendResetEmail')}
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
                {t('auth.returnToLogin')}
              </button>
            </p>
          </div>

          {/* 语言切换 - 底部 */}
          <div className="language-switcher-bottom">
            <button
              className={`lang-btn-bottom ${language === 'zh' ? 'active' : ''}`}
              onClick={() => changeLanguage('zh')}
            >
              🌐 中文
            </button>
            <span className="lang-divider">|</span>
            <button
              className={`lang-btn-bottom ${language === 'en' ? 'active' : ''}`}
              onClick={() => changeLanguage('en')}
            >
              🌐 English
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>📦 {t('app.title')}</h1>
        <h2>{t('auth.login')}</h2>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.enterEmail')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.enterPassword')}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>

        <div className="toggle-mode">
          <p>
            <button onClick={() => {
              setShowResetPassword(true)
              setError('')
            }}>
              {t('auth.forgotPassword')}
            </button>
          </p>
          <p className="admin-note">
            {t('auth.newUserContact')}
          </p>
        </div>

        {/* 语言切换 - 底部 */}
        <div className="language-switcher-bottom">
          <button
            className={`lang-btn-bottom ${language === 'zh' ? 'active' : ''}`}
            onClick={() => changeLanguage('zh')}
          >
            🌐 中文
          </button>
          <span className="lang-divider">|</span>
          <button
            className={`lang-btn-bottom ${language === 'en' ? 'active' : ''}`}
            onClick={() => changeLanguage('en')}
          >
            🌐 English
          </button>
        </div>
      </div>
    </div>
  )
}

