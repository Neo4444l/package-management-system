@echo off
chcp 65001
cls

echo ========================================
echo 部署最新代码到 Vercel
echo ========================================
echo.
echo 此脚本将帮助您：
echo 1. 提交所有更改到 Git
echo 2. 推送到 GitHub
echo 3. Vercel 将自动重新部署
echo.
pause

echo.
echo [1/4] 检查 Git 状态...
echo.
git status

echo.
echo [2/4] 添加所有更改...
echo.
git add .

if %errorlevel% neq 0 (
    echo.
    echo ❌ 添加文件失败！
    echo.
    echo 可能原因：
    echo 1. Git 未安装
    echo 2. 未初始化 Git 仓库
    echo.
    pause
    exit
)

echo.
echo [3/4] 提交更改...
echo.
set /p commit_message=请输入提交说明（直接回车使用默认）: 

if "%commit_message%"=="" (
    set commit_message=更新：添加用户登录和权限管理系统
)

git commit -m "%commit_message%"

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  没有新的更改需要提交，或提交失败
    echo.
    set /p continue=是否继续推送？(Y/N): 
    if /i not "%continue%"=="Y" (
        pause
        exit
    )
)

echo.
echo [4/4] 推送到 GitHub...
echo.
git push

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ 推送成功！
    echo ========================================
    echo.
    echo Vercel 将在 2-3 分钟内自动部署最新版本
    echo.
    echo 📋 下一步：
    echo 1. 访问 Vercel 控制台查看部署状态
    echo    https://vercel.com
    echo.
    echo 2. 配置环境变量（如果还没配置）
    echo    Settings → Environment Variables
    echo    添加：
    echo    - VITE_SUPABASE_URL
    echo    - VITE_SUPABASE_ANON_KEY
    echo.
    echo 3. 等待部署完成后访问您的网站
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ 推送失败！
    echo ========================================
    echo.
    echo 可能原因：
    echo 1. 没有配置 GitHub 远程仓库
    echo 2. 网络连接问题
    echo 3. 需要登录 GitHub
    echo.
    echo 解决方法：
    echo 1. 检查远程仓库：git remote -v
    echo 2. 如果没有，需要先创建 GitHub 仓库
    echo 3. 查看详细错误信息
    echo.
)

pause

