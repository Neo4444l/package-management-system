@echo off
chcp 65001
cls

echo ========================================
echo 创建登录组件文件
echo ========================================
echo.

REM 检查src文件夹
if not exist "src" (
    echo ❌ 错误：找不到 src 文件夹
    pause
    exit
)

echo [1/3] 创建 components 文件夹...
if not exist "src\components" (
    mkdir src\components
    echo ✅ 已创建 src\components 文件夹
) else (
    echo ℹ️  src\components 文件夹已存在
)
echo.

echo [2/3] 创建 Login.jsx...
(
echo import { useState } from 'react'
echo import { supabase } from '../supabaseClient'
echo import './Login.css'
echo.
echo export default function Login({ onLogin }^) {
echo   const [loading, setLoading] = useState(false^)
echo   const [isSignUp, setIsSignUp] = useState(false^)
echo   const [email, setEmail] = useState('''^)
echo   const [password, setPassword] = useState('''^)
echo   const [error, setError] = useState('''^)
echo.
echo   const handleLogin = async (e^) =^> {
echo     e.preventDefault(^)
echo     setLoading(true^)
echo     setError('''^)
echo.
echo     try {
echo       const { data, error } = await supabase.auth.signInWithPassword({
echo         email,
echo         password,
echo       }^)
echo.
echo       if (error^) throw error
echo       onLogin(data.user^)
echo     } catch (error^) {
echo       setError(error.message^)
echo     } finally {
echo       setLoading(false^)
echo     }
echo   }
echo.
echo   const handleSignUp = async (e^) =^> {
echo     e.preventDefault(^)
echo     setLoading(true^)
echo     setError('''^)
echo.
echo     try {
echo       const { data, error } = await supabase.auth.signUp({
echo         email,
echo         password,
echo       }^)
echo.
echo       if (error^) throw error
echo       alert('注册成功！请检查您的邮箱进行验证。'^)
echo       setIsSignUp(false^)
echo     } catch (error^) {
echo       setError(error.message^)
echo     } finally {
echo       setLoading(false^)
echo     }
echo   }
echo.
echo   return (
echo     ^<div className="login-container"^>
echo       ^<div className="login-box"^>
echo         ^<h1^>📦 包裹管理系统^</h1^>
echo         ^<h2^>{isSignUp ? '注册账号' : '登录'}^</h2^>
echo         
echo         ^<form onSubmit={isSignUp ? handleSignUp : handleLogin}^>
echo           ^<div className="form-group"^>
echo             ^<label^>邮箱^</label^>
echo             ^<input
echo               type="email"
echo               value={email}
echo               onChange={(e^) =^> setEmail(e.target.value^)}
echo               placeholder="请输入邮箱"
echo               required
echo             /^>
echo           ^</div^>
echo.
echo           ^<div className="form-group"^>
echo             ^<label^>密码^</label^>
echo             ^<input
echo               type="password"
echo               value={password}
echo               onChange={(e^) =^> setPassword(e.target.value^)}
echo               placeholder="请输入密码（至少6位）"
echo               required
echo               minLength={6}
echo             /^>
echo           ^</div^>
echo.
echo           {error ^&^& ^<div className="error-message"^>{error}^</div^>}
echo.
echo           ^<button type="submit" disabled={loading} className="btn-primary"^>
echo             {loading ? '处理中...' : isSignUp ? '注册' : '登录'}
echo           ^</button^>
echo         ^</form^>
echo.
echo         ^<div className="toggle-mode"^>
echo           {isSignUp ? (
echo             ^<p^>
echo               已有账号？
echo               ^<button onClick={(^) =^> setIsSignUp(false^)}^>立即登录^</button^>
echo             ^</p^>
echo           ^) : (
echo             ^<p^>
echo               还没有账号？
echo               ^<button onClick={(^) =^> setIsSignUp(true^)}^>立即注册^</button^>
echo             ^</p^>
echo           ^)}
echo         ^</div^>
echo       ^</div^>
echo     ^</div^>
echo   ^)
echo }
) > src\components\Login.jsx

if exist "src\components\Login.jsx" (
    echo ✅ 已创建 src\components\Login.jsx
) else (
    echo ❌ 创建失败
    pause
    exit
)
echo.

echo [3/3] 创建 Login.css...
(
echo .login-container {
echo   min-height: 100vh;
echo   display: flex;
echo   justify-content: center;
echo   align-items: center;
echo   background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%^);
echo   padding: 20px;
echo }
echo.
echo .login-box {
echo   background: white;
echo   padding: 40px;
echo   border-radius: 20px;
echo   box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3^);
echo   width: 100%%;
echo   max-width: 400px;
echo }
echo.
echo .login-box h1 {
echo   text-align: center;
echo   color: #667eea;
echo   margin-bottom: 10px;
echo   font-size: 2em;
echo }
echo.
echo .login-box h2 {
echo   text-align: center;
echo   color: #333;
echo   margin-bottom: 30px;
echo   font-size: 1.5em;
echo }
echo.
echo .form-group {
echo   margin-bottom: 20px;
echo }
echo.
echo .form-group label {
echo   display: block;
echo   margin-bottom: 8px;
echo   color: #555;
echo   font-weight: 500;
echo }
echo.
echo .form-group input {
echo   width: 100%%;
echo   padding: 12px;
echo   border: 2px solid #e0e0e0;
echo   border-radius: 8px;
echo   font-size: 16px;
echo   transition: border-color 0.3s;
echo   box-sizing: border-box;
echo }
echo.
echo .form-group input:focus {
echo   outline: none;
echo   border-color: #667eea;
echo }
echo.
echo .error-message {
echo   background: #fee;
echo   color: #c33;
echo   padding: 12px;
echo   border-radius: 8px;
echo   margin-bottom: 15px;
echo   text-align: center;
echo }
echo.
echo .btn-primary {
echo   width: 100%%;
echo   padding: 14px;
echo   background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%^);
echo   color: white;
echo   border: none;
echo   border-radius: 8px;
echo   font-size: 16px;
echo   font-weight: 600;
echo   cursor: pointer;
echo   transition: transform 0.2s;
echo }
echo.
echo .btn-primary:hover:not(:disabled^) {
echo   transform: translateY(-2px^);
echo }
echo.
echo .btn-primary:disabled {
echo   opacity: 0.6;
echo   cursor: not-allowed;
echo }
echo.
echo .toggle-mode {
echo   margin-top: 20px;
echo   text-align: center;
echo }
echo.
echo .toggle-mode p {
echo   color: #666;
echo }
echo.
echo .toggle-mode button {
echo   background: none;
echo   border: none;
echo   color: #667eea;
echo   text-decoration: underline;
echo   cursor: pointer;
echo   font-size: 16px;
echo   margin-left: 5px;
echo }
echo.
echo .toggle-mode button:hover {
echo   color: #764ba2;
echo }
) > src\components\Login.css

if exist "src\components\Login.css" (
    echo ✅ 已创建 src\components\Login.css
) else (
    echo ❌ 创建失败
    pause
    exit
)

echo.
echo ========================================
echo 🎉 登录组件创建完成！
echo ========================================
echo.
echo 已创建的文件：
echo   ✅ src\components\Login.jsx
echo   ✅ src\components\Login.css
echo.
echo ========================================
echo 📋 下一步操作
echo ========================================
echo.
echo 1. 修改 src\App.jsx 文件
echo    添加登录逻辑和用户认证
echo.
echo 2. 配置 .env 文件
echo    填入 Supabase 的 URL 和 Key
echo.
echo 3. 测试登录功能
echo    运行 npm run dev
echo.
echo 详细说明请查看：用户登录系统实施指南.md
echo.
pause

