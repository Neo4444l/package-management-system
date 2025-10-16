@echo off
chcp 65001
cls

echo ========================================
echo 安装 Supabase 依赖
echo ========================================
echo.
echo 正在安装 @supabase/supabase-js...
echo.

call npm install @supabase/supabase-js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ 安装成功！
    echo ========================================
    echo.
    echo Supabase 客户端已安装完成。
    echo.
    echo 下一步：
    echo 1. 创建 src\supabaseClient.js 文件
    echo 2. 创建 src\components\Login.jsx 文件
    echo 3. 创建 src\components\Login.css 文件
    echo.
    echo 详见：用户登录系统实施指南.md
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ 安装失败！
    echo ========================================
    echo.
    echo 请检查：
    echo 1. 是否连接到互联网
    echo 2. npm 是否正常工作（运行: npm --version）
    echo.
)

pause

