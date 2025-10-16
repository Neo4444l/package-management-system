@echo off
chcp 65001
cls

echo ========================================
echo 测试构建
echo ========================================
echo.
echo 正在构建项目...
echo.

call npm run build

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ 构建成功！
    echo ========================================
    echo.
    echo 项目已准备好部署到 Vercel！
    echo.
    echo 构建文件位于: dist 文件夹
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ 构建失败！
    echo ========================================
    echo.
    echo 请检查上方的错误信息
    echo.
)

pause

