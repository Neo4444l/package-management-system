# 🚀 退回包裹管理系统

一个现代化的、多城市支持的、国际化的退回包裹管理Web应用。

[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black)](https://vercel.com)
[![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E)](https://supabase.com)
[![Framework](https://img.shields.io/badge/Framework-React%2018-61DAFB)](https://react.dev)
[![Language](https://img.shields.io/badge/Language-中文%20%7C%20English-blue)](./docs/国际化-完成总结.md)

---

## ✨ 核心特性

### 🏙️ **多城市支持**
- 支持 5 个城市独立运营：MIA, WPB, FTM, MCO, TPA
- 城市级数据完全隔离
- Super Admin 可分配城市权限
- 一键城市切换

### 🌍 **国际化 (i18n)**
- 中文 / English 双语支持
- 登录界面语言切换
- 应用内实时语言切换
- 所有模块完整翻译

### 👥 **用户权限管理**
- 4 种角色：Super Admin / Admin / Manager / User
- 基于角色的访问控制 (RBAC)
- 邮箱验证和密码重置
- 用户状态管理（激活/停用）

### 📦 **包裹管理**
- **上架管理**：库位选择、包裹录入、批量操作
- **下架管理**：扫码下架、状态更新、实时提醒
- **中心退回**：多维度查询、指令下达、批量处理
- **库位管理**：二维码生成、批量打印、创建时间记录

### ⚡ **实时数据同步**
- Supabase Realtime 实时订阅
- 多端数据即时同步
- 操作记录实时更新
- 最后操作用户追踪

---

## 🛠️ 技术栈

### 前端
- **React 18** - UI 框架
- **React Router 6** - 路由管理
- **Vite** - 构建工具
- **CSS3** - 现代化渐变设计

### 后端
- **Supabase** - Backend as a Service
  - PostgreSQL 数据库
  - Row Level Security (RLS)
  - Realtime 实时订阅
  - 用户认证 (Auth)
  - 邮件服务

### 部署
- **Vercel** - 前端托管
- **Supabase Cloud** - 数据库和后端

---

## 📚 文档导航

### 🚀 快速开始
- **[使用教程](./docs/使用教程.md)** - 完整的系统使用指南
- **[数据结构说明](./docs/数据结构说明.md)** - 数据库结构详解

### 🔧 配置指南
- **[Supabase 数据库创建教程](./docs/Supabase数据库创建详细教程.md)** - 数据库初始化
- **[密码重置配置教程](./docs/Supabase密码重置配置详细教程.md)** - 邮件重置配置
- **[实时数据同步指南](./docs/实时数据同步实施指南.md)** - Realtime 配置
- **[用户登录系统指南](./docs/用户登录系统实施指南.md)** - 认证系统配置

### 🌍 国际化
- **[国际化完成总结](./docs/国际化-完成总结.md)** - 功能完整说明
- **[国际化实施进度](./docs/国际化-实施进度.md)** - 实施追踪
- **[国际化快速参考](./docs/国际化-快速参考.md)** - 快速参考

### 🏙️ 多城市系统
- **[第1阶段总结](./docs/多城市系统-实施总结-第1阶段.md)** - 数据库和架构
- **[第2阶段总结](./docs/多城市系统-实施总结-第2阶段-完整版.md)** - 完整实施

### 🐛 Bug 修复记录
- **[用户管理功能说明](./docs/用户管理和密码重置功能说明.md)**
- **[最后操作用户显示修复](./docs/最后操作用户显示-修复说明.md)**
- **[库位二维码打印修复](./docs/库位二维码打印-修复说明.md)**
- **[死循环修复](./docs/立即操作-修复死循环.md)**

📖 **[查看完整文档目录](./docs/README.md)**

---

## 🚀 快速开始

### 前置要求
- Node.js 16+ 
- npm 或 yarn
- Supabase 账号（免费）

### 1. 克隆项目
```bash
git clone <repository-url>
cd 退回包裹管理系统
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
创建 `.env` 文件：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 配置数据库
在 Supabase SQL Editor 中执行：
```bash
database/supabase-setup.sql
database/权限管理系统-完整SQL.sql
database/多城市系统-完整配置.sql
```

详见：[多城市系统-快速执行.md](./database/多城市系统-快速执行.md)

### 5. 启动开发服务器
```bash
cd
```

应用将在 `http://localhost:5173` 启动。

### 6. 构建生产版本
```bash
npm run build
```

---

## 📦 功能模块

### 1️⃣ 上架管理 (Shelving)
- 📍 选择库位号
- 📦 扫码录入包裹号
- ⏰ 自动记录时间和操作人
- 📊 包裹列表查看
- 🗑️ 删除和导出功能

### 2️⃣ 下架管理 (Unshelving)
- 🔍 显示待下架运单
- 📍 按库位分类显示
- 📱 扫码匹配包裹
- ✅ 确认下架更新状态
- 🔊 匹配成功声音+视觉提醒

### 3️⃣ 中心退回管理 (Center Return)
- 🔍 多维度搜索（运单号/库位号）
- 📊 状态分类查看
  - 全部/在库内/待下架/已下架
- 📋 客服指令管理
  - 重派/重派（新面单）/退回客户
- ⏱️ 时间筛选（上架/下架/指令）
- ✅ 批量选择和操作
- 👤 最后操作用户追踪

### 4️⃣ 库位管理 (Location Management)
- ➕ 添加和删除库位
- 🏷️ 批量选择库位
- 📱 生成二维码
- 🖨️ 批量打印（15cm x 10cm标签）
- 📅 创建时间记录

### 5️⃣ 用户管理 (User Management)
- 👥 用户列表查看
- ➕ 创建新用户
- ✏️ 编辑用户信息
- 🔒 角色权限管理
- 🏙️ 城市权限分配（Super Admin）
- 🗑️ 删除用户（不能删除自己）

---

## 🎯 项目结构

```
退回包裹管理系统/
├── 📁 src/
│   ├── 📁 components/          # React 组件
│   │   ├── Login.jsx          # 登录组件
│   │   ├── UserManagement.jsx # 用户管理
│   │   ├── CitySelector.jsx   # 城市选择器
│   │   └── ResetPassword.jsx  # 密码重置
│   ├── 📁 pages/              # 页面组件
│   │   ├── HomePage.jsx       # 首页
│   │   ├── ShelvingPage.jsx   # 上架-库位选择
│   │   ├── ShelvingInput.jsx  # 上架-包裹录入
│   │   ├── UnshelvingPage.jsx # 下架管理
│   │   ├── CenterReturnManagement.jsx # 中心退回
│   │   ├── LocationManagement.jsx     # 库位管理
│   │   └── ReturnDashboard.jsx        # 退件看板
│   ├── 📁 contexts/           # React Context
│   │   ├── LanguageContext.jsx # 国际化
│   │   └── CityContext.jsx     # 多城市
│   ├── 📁 services/           # API 服务
│   │   └── dataService.js     # Supabase 数据操作
│   ├── 📁 locales/            # 翻译文件
│   │   ├── zh.js              # 中文
│   │   └── en.js              # English
│   ├── App.jsx                # 主应用
│   ├── main.jsx               # 入口文件
│   └── supabaseClient.js      # Supabase 客户端
├── 📁 database/               # 数据库脚本
│   ├── supabase-setup.sql     # 初始化
│   ├── 权限管理系统-完整SQL.sql # 权限系统
│   ├── 多城市系统-完整配置.sql   # 多城市配置
│   └── ...
├── 📁 docs/                   # 文档
│   ├── README.md              # 文档索引
│   ├── 使用教程.md            # 使用指南
│   ├── 数据结构说明.md        # 数据库说明
│   └── ...
├── 📄 README.md               # 项目说明（本文件）
├── 📄 package.json            # 依赖配置
├── 📄 vite.config.js          # Vite 配置
├── 📄 vercel.json             # Vercel 部署配置
└── 📄 cleanup-project.bat     # 项目清理脚本
```

---

## 👥 用户角色权限

| 功能 | Super Admin | Admin | Manager | User |
|------|-------------|-------|---------|------|
| 上架管理 | ✅ | ✅ | ✅ | ✅ |
| 下架管理 | ✅ | ✅ | ✅ | ✅ |
| 中心退回 | ✅ | ✅ | ✅ | ❌ |
| 库位管理 | ✅ | ✅ | ✅ | ❌ |
| 用户管理 | ✅ | ✅ | ❌ | ❌ |
| 城市权限分配 | ✅ | ❌ | ❌ | ❌ |
| 访问所有城市 | ✅ | 根据分配 | 根据分配 | 根据分配 |

---

## 🌍 支持的城市

- 🏙️ **MIA** - Miami
- 🏙️ **WPB** - West Palm Beach
- 🏙️ **FTM** - Fort Myers
- 🏙️ **MCO** - Orlando
- 🏙️ **TPA** - Tampa

每个城市的数据完全独立，互不干扰。

---

## 🔐 数据安全

- ✅ Row Level Security (RLS) 数据隔离
- ✅ 基于角色的访问控制 (RBAC)
- ✅ 邮箱验证
- ✅ 密码重置（邮件）
- ✅ HTTPS 加密传输
- ✅ 城市级数据隔离

---

## 🚀 部署

### Vercel 部署（推荐）

1. **连接 GitHub**
   - Fork 项目到你的 GitHub
   - 登录 [Vercel](https://vercel.com)
   - Import 你的 GitHub 仓库

2. **配置环境变量**
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **部署**
   - 点击 Deploy
   - 等待构建完成
   - 🎉 上线成功！

---

## 🛠️ 开发指南

### 添加新城市

1. 在 `AVAILABLE_CITIES` 中添加城市信息：
```javascript
// src/contexts/CityContext.jsx
const AVAILABLE_CITIES = [
  { code: 'NEW', name: 'New City', nameZh: '新城市' },
  // ...
];
```

2. Super Admin 分配权限给用户

### 添加新语言

1. 创建翻译文件：
```javascript
// src/locales/fr.js
export default {
  common: {
    back: 'Retour',
    // ...
  }
};
```

2. 在 `LanguageContext.jsx` 中导入：
```javascript
import fr from '../locales/fr';
const translations = { zh, en, fr };
```

### 添加新角色

1. 在数据库 `profiles` 表添加角色值
2. 更新 `UserManagement.jsx` 中的角色逻辑
3. 更新 RLS 策略

---

## 📊 数据库架构

### 核心表

- **`profiles`** - 用户信息和权限
- **`packages`** - 包裹信息
- **`locations`** - 库位信息

### 关键字段

#### profiles
```sql
- id (UUID, PK)
- email (TEXT)
- username (TEXT)
- role (TEXT): super_admin | admin | manager | user
- cities (TEXT[]): 可访问的城市列表
- current_city (TEXT): 当前选择的城市
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
```

#### packages
```sql
- id (BIGINT, PK)
- package_number (TEXT)
- location (TEXT)
- city (TEXT): 所属城市
- package_status (TEXT)
- customer_service (TEXT)
- last_modified_by (UUID): 最后操作用户
- shelving_time (TIMESTAMP)
- unshelving_time (TIMESTAMP)
```

#### locations
```sql
- id (BIGINT, PK)
- code (TEXT)
- city (TEXT): 所属城市
- created_at (TIMESTAMP)
```

详见：[数据结构说明.md](./docs/数据结构说明.md)

---

## 🐛 问题排查

### 登录失败
- 检查 Supabase 环境变量是否正确
- 确认用户邮箱已验证
- 检查用户状态是否激活

### 城市切换卡住
- 清除浏览器缓存和 Cookie
- 检查数据库 `profiles.cities` 字段
- 查看浏览器控制台错误信息

### 实时同步不工作
- 确认 Supabase Realtime 已启用
- 检查 RLS 策略是否正确
- 查看网络连接状态

详见：[紧急修复-清除卡住状态.md](./docs/紧急修复-清除卡住状态.md)

### ❓ 数据丢失或看不到数据？

如果发现数据时不时消失，请按以下步骤诊断：

**可能原因：**
1. ❌ RLS 权限问题 - 数据仍在，但无权查看
2. ❌ 城市过滤问题 - 数据属于其他城市
3. ❌ 误删除 - 管理员删除了库位或包裹
4. ✅ Supabase **不会**自动删除数据

**解决方案：**
1. 运行诊断脚本：`database/数据丢失诊断.sql`
2. 根据结果恢复数据：`database/恢复丢失的库位.sql`
3. 启用删除审计日志（防止未来问题）
4. 定期导出数据备份

详见：[数据丢失问题-解决方案.md](./docs/数据丢失问题-解决方案.md)

---

## 🛡️ 数据安全与备份

### 自动删除审计

系统提供删除操作审计日志功能，记录所有删除操作：

```sql
-- 查看最近的删除记录
SELECT 
  user_email,
  action,
  details,
  created_at
FROM operation_logs
WHERE action LIKE '%DELETE%'
ORDER BY created_at DESC;
```

### 定期备份建议

1. **Supabase Dashboard 导出**
   - Table Editor → ... → Download as CSV
   - 建议每周备份一次

2. **前端导出功能**
   - 中心退件管理 → 导出数据
   - 自动生成 JSON 备份

3. **SQL 备份脚本**
   ```bash
   # 导出所有数据
   pg_dump -h your-db.supabase.co -U postgres -d postgres > backup.sql
   ```

### 防止误删除

- ✅ 删除前二次确认
- ✅ 仅 Super Admin 可删除用户
- ✅ 仅 Admin+ 可删除包裹和库位
- ✅ 删除库位会同时删除关联包裹（已提示）

---

## 🎨 UI 特性

- 🎨 现代化渐变色设计
- 📱 完全响应式布局
- 🌓 清晰的视觉层次
- ✨ 流畅的动画效果
- 🔔 声音+视觉提醒
- 🖨️ 打印友好设计

---

## 📝 更新日志

### v2.0.0 (2025-10-19)
- ✅ 多城市系统完整实现
- ✅ Super Admin 权限系统
- ✅ 国际化（中文/English）
- ✅ 城市权限分配
- ✅ 用户管理模块优化
- ✅ 项目文档整理

### v1.5.0
- ✅ Supabase 后端集成
- ✅ 用户认证系统
- ✅ 实时数据同步
- ✅ Row Level Security

### v1.0.0
- ✅ 基础功能实现
- ✅ LocalStorage 数据存储

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 License

MIT License

---

## 📞 支持

- 📧 Email: neo4444l.zhang@gmail.com
- 📖 文档: [docs/README.md](./docs/README.md)
- 🐛 问题: GitHub Issues

---

**享受使用退回包裹管理系统！** 🎉
