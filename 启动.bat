@echo off
setlocal enabledelayedexpansion
chcp 65001
cls

:MENU
cls
echo ========================================
echo   退回包裹管理系统 - 启动菜单
echo ========================================
echo.
echo 请选择要执行的操作：
echo.
echo [1] 一键安装并启动（首次使用）
echo [2] 启动开发服务器
echo [3] 仅安装/更新依赖
echo [4] 检测环境
echo [5] 🚀 部署到互联网（Vercel）
echo [6] 退出
echo.
echo ========================================
set /p choice=请输入选项 (1-6): 

if "%choice%"=="1" goto INSTALL_AND_START
if "%choice%"=="2" goto START_ONLY
if "%choice%"=="3" goto INSTALL_ONLY
if "%choice%"=="4" goto CHECK_ENV
if "%choice%"=="5" goto DEPLOY_GUIDE
if "%choice%"=="6" goto EXIT
echo.
echo ❌ 无效的选项，请重新选择
timeout /t 2 >nul
goto MENU

:DEPLOY_GUIDE
cls
echo ========================================
echo 🚀 部署到互联网指南
echo ========================================
echo.
echo 让您的退回包裹管理系统上线，全球可访问！
echo.
echo ========================================
echo 准备工作
echo ========================================
echo.
echo [步骤1] 测试构建
echo    双击运行：测试构建.bat
echo.
echo [步骤2] 初始化Git
echo    双击运行：Git初始化.bat
echo.
echo [步骤3] 上传到GitHub
echo    1. 访问 https://github.com/new
echo    2. 创建仓库：return-package-management-system
echo    3. 按提示推送代码
echo.
echo [步骤4] 部署到Vercel
echo    1. 访问 https://vercel.com
echo    2. 使用GitHub登录
echo    3. 导入项目并部署
echo.
echo ========================================
echo 📖 详细教程
echo ========================================
echo.
echo 所有详细步骤请查看：
echo 👉 🚀 开始部署.txt
echo 👉 Vercel部署指南.md
echo.
echo ========================================
echo 快速操作
echo ========================================
echo.
echo [A] 打开部署指南文档
echo [B] 检测并安装 Git
echo [C] 运行 Git 初始化
echo [D] 测试构建
echo [E] 返回主菜单
echo.
set /p deploy_choice=请选择 (A-E): 

if /i "%deploy_choice%"=="A" (
    start "" "🚀 开始部署.txt"
    goto DEPLOY_GUIDE
)
if /i "%deploy_choice%"=="B" (
    cls
    echo ========================================
    echo 检测 Git 环境
    echo ========================================
    echo.
    git --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Git 未安装
        echo.
        echo 请选择安装方式：
        echo.
        echo [1] 查看 Git 安装指南（命令行方式）
        echo [2] 查看 GitHub Desktop 教程（图形界面）⭐ 推荐新手
        echo [3] 返回
        echo.
        set /p git_choice=请选择 (1-3): 
        if "!git_choice!"=="1" start "" "Git安装指南.txt"
        if "!git_choice!"=="2" start "" "GitHub Desktop部署教程.md"
    ) else (
        for /f "tokens=*" %%i in ('git --version') do set GIT_VER=%%i
        echo ✅ Git 已安装
        echo    !GIT_VER!
        echo.
        echo 您可以直接运行 Git 初始化了！
        pause
    )
    goto DEPLOY_GUIDE
)
if /i "%deploy_choice%"=="C" (
    call "Git初始化.bat"
    goto DEPLOY_GUIDE
)
if /i "%deploy_choice%"=="D" (
    call "测试构建.bat"
    goto DEPLOY_GUIDE
)
if /i "%deploy_choice%"=="E" goto MENU
goto DEPLOY_GUIDE

:INSTALL_AND_START
cls
echo ========================================
echo 一键安装并启动
echo ========================================
echo.
echo [1/2] 正在安装依赖...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ❌ 安装失败！
    echo.
    echo 可能的原因：
    echo 1. 未安装 Node.js（请访问 https://nodejs.org/ 下载安装）
    echo 2. 网络连接问题
    echo.
    pause
    goto MENU
)
echo.
echo ✅ 依赖安装完成！
echo.
echo [2/2] 正在启动开发服务器...
echo 浏览器将自动打开 http://localhost:3000
echo.
echo 提示: 按 Ctrl+C 可以停止服务器
echo.
call npm run dev
pause
goto MENU

:START_ONLY
cls
echo ========================================
echo 启动开发服务器
echo ========================================
echo.
if not exist "node_modules" (
    echo ⚠️  警告: 未找到 node_modules 文件夹
    echo 请先选择选项 [3] 安装依赖
    echo.
    pause
    goto MENU
)
echo 正在启动开发服务器...
echo 浏览器将自动打开 http://localhost:3000
echo.
echo 提示: 按 Ctrl+C 可以停止服务器
echo.
call npm run dev
pause
goto MENU

:INSTALL_ONLY
cls
echo ========================================
echo 安装/更新依赖
echo ========================================
echo.
echo 正在安装依赖，请稍候...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ❌ 安装失败！
    echo.
    echo 可能的原因：
    echo 1. 未安装 Node.js（请访问 https://nodejs.org/ 下载安装）
    echo 2. 网络连接问题
    echo.
) else (
    echo.
    echo ✅ 依赖安装成功！
    echo.
)
pause
goto MENU

:CHECK_ENV
cls
echo ========================================
echo 环境检测工具
echo ========================================
echo.
echo [检测 Node.js]
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js 已安装
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo    版本: %NODE_VERSION%
) else (
    echo ❌ Node.js 未安装
    echo    请访问 https://nodejs.org/ 下载安装
    echo.
    pause
    goto MENU
)
echo.
echo [检测 npm]
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ npm 已安装
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo    版本: %NPM_VERSION%
) else (
    echo ❌ npm 未安装
    echo.
    pause
    goto MENU
)
echo.
echo [检测项目依赖]
if exist "node_modules" (
    echo ✅ 项目依赖已安装
) else (
    echo ⚠️  项目依赖未安装
    echo    建议选择选项 [3] 安装依赖
)
echo.
echo ========================================
echo 🎉 环境检测完成！
echo ========================================
echo.
pause
goto MENU

:EXIT
cls
echo.
echo 感谢使用退回包裹管理系统！
echo.
timeout /t 1 >nul
exit


