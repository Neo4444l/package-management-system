@echo off
chcp 65001
cls

echo ========================================
echo 配置 Supabase 环境变量
echo ========================================
echo.
echo 此工具将帮助您创建 .env 文件
echo.
echo ========================================
echo 📝 准备工作
echo ========================================
echo.
echo 请先从 Supabase 控制台获取以下信息：
echo.
echo 1. 访问：https://supabase.com
echo 2. 登录并选择您的项目
echo 3. 点击左侧 Settings → API
echo 4. 复制以下两个值：
echo    - Project URL
echo    - anon public key
echo.
pause
cls

echo ========================================
echo 创建 .env 文件
echo ========================================
echo.

if exist ".env" (
    echo ⚠️  .env 文件已存在
    echo.
    set /p overwrite=是否覆盖现有文件？(Y/N): 
    if /i not "%overwrite%"=="Y" (
        echo.
        echo 已取消操作
        pause
        exit
    )
)

echo.
echo 请输入您的 Supabase 配置：
echo.

set /p SUPABASE_URL=请输入 Project URL: 
set /p SUPABASE_KEY=请输入 anon public key: 

if "%SUPABASE_URL%"=="" (
    echo.
    echo ❌ Project URL 不能为空！
    pause
    exit
)

if "%SUPABASE_KEY%"=="" (
    echo.
    echo ❌ anon public key 不能为空！
    pause
    exit
)

echo.
echo 正在创建 .env 文件...
echo.

(
echo # Supabase 配置
echo # 生成时间：%date% %time%
echo.
echo # Supabase 项目 URL
echo VITE_SUPABASE_URL=%SUPABASE_URL%
echo.
echo # Supabase 匿名密钥
echo VITE_SUPABASE_ANON_KEY=%SUPABASE_KEY%
) > .env

if exist ".env" (
    echo ✅ .env 文件创建成功！
    echo.
    echo ========================================
    echo 📄 文件内容预览
    echo ========================================
    type .env
    echo.
    echo ========================================
    echo 🎉 配置完成！
    echo ========================================
    echo.
    echo 下一步：
    echo 1. 运行 npm run dev 测试
    echo 2. 访问 http://localhost:3000
    echo 3. 尝试注册和登录
    echo.
    echo ⚠️  注意：
    echo - .env 文件不会被提交到 Git
    echo - 在 Vercel 也需要配置相同的环境变量
    echo.
) else (
    echo ❌ 创建失败！
    echo.
)

pause

