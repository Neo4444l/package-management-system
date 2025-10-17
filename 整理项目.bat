@echo off
chcp 65001 >nul
echo ========================================
echo 项目文件整理工具
echo ========================================
echo.

:: 创建目录
echo [1/4] 创建docs和database目录...
if not exist docs mkdir docs
if not exist database mkdir database
echo ✓ 目录创建完成
echo.

:: 移动核心文档
echo [2/4] 移动核心文档到docs目录...
if exist "Supabase数据库创建详细教程.md" move /Y "Supabase数据库创建详细教程.md" docs\
if exist "用户登录系统实施指南.md" move /Y "用户登录系统实施指南.md" docs\
if exist "实时数据同步实施指南.md" move /Y "实时数据同步实施指南.md" docs\
if exist "权限管理系统实施指南.md" move /Y "权限管理系统实施指南.md" docs\
echo ✓ 文档移动完成
echo.

:: 移动数据库脚本
echo [3/4] 移动数据库脚本到database目录...
if exist "supabase-setup.sql" move /Y "supabase-setup.sql" database\
if exist "权限管理系统-完整SQL.sql" move /Y "权限管理系统-完整SQL.sql" database\
if exist "启用Realtime实时同步.sql" move /Y "启用Realtime实时同步.sql" database\
echo ✓ 脚本移动完成
echo.

:: 删除不必要的文件
echo [4/4] 删除不必要的文件...

:: 删除临时完成说明
del /F /Q "✅ 库位同步问题已修复.txt" 2>nul
del /F /Q "✅ 实时数据同步已实施.txt" 2>nul
del /F /Q "✅ UI统一改造完成.txt" 2>nul
del /F /Q "✅ 全面优化完成 - 详细说明.txt" 2>nul
del /F /Q "✅ UI优化完成 - 修复说明.txt" 2>nul
del /F /Q "✅ 权限管理完整方案 - 总结.txt" 2>nul
del /F /Q "✅ 数据同步已完成 - 测试指南.txt" 2>nul
del /F /Q "✅ 权限管理系统已完成.txt" 2>nul
del /F /Q "✅ 登录系统测试指南.txt" 2>nul
del /F /Q "🎉 完成！所有文件已修改.txt" 2>nul

:: 删除临时问题说明
del /F /Q "⚠️ 数据同步问题说明.txt" 2>nul
del /F /Q "⚠️ 错误修复指南.txt" 2>nul
del /F /Q "⚠️ Git未安装解决方案.txt" 2>nul

:: 删除临时修复文件
del /F /Q "⚡ 正确的权限管理 - 实施指南.txt" 2>nul
del /F /Q "⚡ 立即修复数据同步问题.txt" 2>nul

:: 删除临时状态文件
del /F /Q "📌 当前状态和下一步选择.txt" 2>nul
del /F /Q "App文件修改完成说明.txt" 2>nul
del /F /Q "登录组件创建完成说明.txt" 2>nul
del /F /Q "创建配置文件详细教程.txt" 2>nul
del /F /Q "文件结构说明.txt" 2>nul

:: 删除重复部署文档
del /F /Q "云端部署指南.txt" 2>nul
del /F /Q "🚀 开始部署.txt" 2>nul
del /F /Q "GitHub Desktop部署教程.md" 2>nul
del /F /Q "部署检查清单.md" 2>nul
del /F /Q "Vercel部署指南.md" 2>nul
del /F /Q "后端集成指南.md" 2>nul
del /F /Q "数据同步到云端指南.md" 2>nul
del /F /Q "部署文件说明.txt" 2>nul
del /F /Q "快速部署命令.txt" 2>nul
del /F /Q "快速开始.txt" 2>nul
del /F /Q "安装指南.txt" 2>nul

:: 删除Git文档
del /F /Q "🚀 本项目Git使用指南.txt" 2>nul
del /F /Q "📖 Git常用命令速查表.txt" 2>nul
del /F /Q "Git安装指南.txt" 2>nul

:: 删除临时配置文档
del /F /Q "PowerShell权限问题解决方案.txt" 2>nul
del /F /Q "创建数据库表-快速解决方案.txt" 2>nul
del /F /Q "环境变量配置模板.txt" 2>nul
del /F /Q "关于访问权限的说明.txt" 2>nul

:: 删除不必要的脚本
del /F /Q "部署到Vercel.bat" 2>nul
del /F /Q "快速配置环境变量.bat" 2>nul
del /F /Q "创建登录组件.bat" 2>nul
del /F /Q "创建Supabase配置文件.bat" 2>nul
del /F /Q "安装Supabase依赖.bat" 2>nul
del /F /Q "测试构建.bat" 2>nul
del /F /Q "Git初始化.bat" 2>nul

:: 删除重复SQL文件
del /F /Q "🔐 正确的权限管理方案.sql" 2>nul
del /F /Q "🚨 紧急修复-RLS策略.sql" 2>nul
del /F /Q "修复profiles表.sql" 2>nul

echo ✓ 清理完成
echo.

:: 可选：删除dist目录（构建输出，可重新生成）
echo ========================================
echo 额外清理选项：
echo ========================================
echo.
echo dist\ 目录包含构建输出，可以安全删除并重新构建
set /p clean_dist=是否删除 dist\ 目录？(Y/N):
if /i "%clean_dist%"=="Y" (
    if exist dist rmdir /S /Q dist
    echo ✓ dist\ 目录已删除
) else (
    echo ○ 保留 dist\ 目录
)
echo.

echo ========================================
echo ✅ 项目整理完成！
echo ========================================
echo.
echo 整理后的文件结构：
echo.
echo 📁 项目根目录
echo ├── 📁 docs/              (核心文档)
echo ├── 📁 database/          (数据库脚本)
echo ├── 📁 src/               (源代码)
echo ├── 📄 README.md          (项目说明)
echo ├── 📄 使用教程.md        (使用指南)
echo ├── 📄 数据结构说明.md    (数据结构)
echo ├── 🚀 启动.bat           (启动脚本)
echo └── 🔧 package.json       (依赖配置)
echo.
echo 建议下一步：
echo 1. 查看 README.md 了解项目
echo 2. 运行 启动.bat 开始使用
echo 3. 参考 docs\ 目录中的文档进行配置
echo.
pause

