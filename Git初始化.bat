@echo off
chcp 65001
cls

echo ========================================
echo Git 初始化工具
echo ========================================
echo.
echo 此工具将帮助您：
echo 1. 检测Git是否已安装
echo 2. 初始化Git仓库
echo 3. 创建第一次提交
echo.
echo ========================================
pause
cls

REM 检测Git是否安装
echo [1/3] 检测 Git 环境...
echo.
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未检测到 Git！
    echo.
    echo 请先安装 Git：
    echo 1. 访问：https://git-scm.com/download/win
    echo 2. 下载并安装
    echo 3. 重启此脚本
    echo.
    pause
    exit
)

for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
echo ✅ Git 已安装：%GIT_VERSION%
echo.

REM 检查是否已初始化
if exist ".git" (
    echo ⚠️  Git 仓库已存在！
    echo.
    set /p choice=是否重新初始化？(Y/N): 
    if /i not "%choice%"=="Y" (
        echo.
        echo 已取消操作
        pause
        exit
    )
    echo.
    echo 删除现有 .git 文件夹...
    rmdir /s /q .git
)

REM 初始化Git仓库
echo [2/3] 初始化 Git 仓库...
echo.
git init
if %errorlevel% neq 0 (
    echo ❌ 初始化失败！
    pause
    exit
)
echo ✅ Git 仓库初始化成功
echo.

REM 创建第一次提交
echo [3/3] 创建第一次提交...
echo.
git add .
git commit -m "初始提交：包裹管理系统"
if %errorlevel% neq 0 (
    echo ❌ 提交失败！
    pause
    exit
)
echo ✅ 提交成功
echo.

echo ========================================
echo 🎉 Git 初始化完成！
echo ========================================
echo.
echo ✅ 已完成：
echo    - Git 仓库已初始化
echo    - 所有文件已添加
echo    - 第一次提交已创建
echo.
echo 📝 下一步操作：
echo.
echo 1. 在 GitHub 创建新仓库
echo    访问：https://github.com/new
echo    仓库名：package-management-system
echo    选择 Public（公开）
echo.
echo 2. 连接到 GitHub 仓库（复制以下命令）：
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/package-management-system.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo    （将 YOUR_USERNAME 替换为你的GitHub用户名）
echo.
echo 3. 推送完成后，前往 Vercel 部署
echo    访问：https://vercel.com
echo.
echo ========================================
echo.
pause

