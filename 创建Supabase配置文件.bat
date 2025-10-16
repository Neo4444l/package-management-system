@echo off
chcp 65001
cls

echo ========================================
echo 创建 Supabase 配置文件
echo ========================================
echo.

REM 检查src文件夹是否存在
if not exist "src" (
    echo ❌ 错误：找不到 src 文件夹
    echo.
    echo 请确保在项目根目录下运行此脚本
    pause
    exit
)

echo [1/2] 创建配置文件...
echo.

REM 创建 supabaseClient.js
(
echo import { createClient } from '@supabase/supabase-js'
echo.
echo const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
echo const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
echo.
echo export const supabase = createClient^(supabaseUrl, supabaseAnonKey^)
) > src\supabaseClient.js

if exist "src\supabaseClient.js" (
    echo ✅ 成功创建：src\supabaseClient.js
) else (
    echo ❌ 创建失败
    pause
    exit
)

echo.
echo [2/2] 创建环境变量模板...
echo.

REM 创建 .env 文件
if exist ".env" (
    echo ⚠️  .env 文件已存在，跳过创建
) else (
    (
    echo # Supabase 配置
    echo # 请将下面的值替换为您的真实配置
    echo.
    echo VITE_SUPABASE_URL=your_supabase_project_url
    echo VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ) > .env
    echo ✅ 成功创建：.env
)

echo.
echo ========================================
echo 🎉 配置文件创建完成！
echo ========================================
echo.
echo 已创建的文件：
echo   ✅ src\supabaseClient.js
echo   ✅ .env (如果不存在)
echo.
echo ========================================
echo ⚠️  重要：下一步操作
echo ========================================
echo.
echo 1. 打开 .env 文件
echo 2. 替换为您的真实配置：
echo.
echo    从 Supabase 控制台获取：
echo    - Settings → API → Project URL
echo    - Settings → API → anon public key
echo.
echo 3. 保存 .env 文件
echo.
echo 详细说明请查看：环境变量配置模板.txt
echo.
pause

