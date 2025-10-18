# Supabase 密码重置功能 - 详细配置教程

## 📋 目录

1. [配置概述](#配置概述)
2. [邮件服务配置](#邮件服务配置)
3. [邮件模板配置](#邮件模板配置)
4. [URL重定向配置](#url重定向配置)
5. [测试验证](#测试验证)
6. [常见问题排查](#常见问题排查)

---

## 配置概述

密码重置功能需要配置以下内容：
- ✅ 邮件服务（SMTP）
- ✅ 邮件模板
- ✅ 重定向URL
- ✅ 站点URL

**预计配置时间**：10-15分钟

---

## 邮件服务配置

### 步骤1：登录 Supabase Dashboard

1. 访问 [https://app.supabase.com](https://app.supabase.com)
2. 登录您的账号
3. 选择您的项目

### 步骤2：进入邮件设置

1. 点击左侧菜单的 **Project Settings**（项目设置）
2. 点击 **Authentication**（认证）
3. 滚动到 **Email** 部分

### 步骤3：启用邮件认证

确保以下设置已启用：

```
✅ Enable email confirmations (启用邮件确认)
✅ Enable email provider (启用邮件提供商)
```

### 步骤4：配置 SMTP 设置（可选但推荐）

> **注意**：Supabase 默认使用内置的邮件服务，但有每小时发送限制。对于生产环境，强烈建议配置自己的 SMTP。

#### 使用 Supabase 默认邮件服务（开发环境）

**优点**：
- 无需配置，开箱即用
- 适合开发和测试

**缺点**：
- 有发送频率限制（每小时约3-4封）
- 邮件可能被标记为垃圾邮件
- 不适合生产环境

**配置方法**：
无需额外配置，Supabase 默认启用。

---

#### 配置自定义 SMTP（生产环境推荐）

如果您想使用自己的邮件服务，可以配置自定义 SMTP：

**支持的邮件服务提供商**：
- Gmail
- SendGrid
- Mailgun
- AWS SES
- 阿里云邮件推送
- 腾讯云邮件推送
- 其他支持SMTP的服务

**配置步骤**：

1. 在 **Project Settings** > **Authentication** 中找到 **SMTP Settings**
2. 启用 **Enable Custom SMTP**
3. 填写以下信息：

```
SMTP Host: smtp.gmail.com (以Gmail为例)
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Pass: your-app-password (应用专用密码)
Sender email: your-email@gmail.com
Sender name: 退回包裹管理系统
```

#### Gmail SMTP 配置示例

如果使用 Gmail：

1. **开启两步验证**
   - 访问 Google 账号设置
   - 开启两步验证

2. **生成应用专用密码**
   - 访问：[https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - 选择"邮件"应用
   - 选择"其他"设备
   - 输入名称："Supabase"
   - 生成密码
   - 复制生成的16位密码

3. **在 Supabase 中配置**
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: your-email@gmail.com
   SMTP Pass: 生成的16位应用专用密码
   ```

#### SendGrid SMTP 配置示例

如果使用 SendGrid（推荐用于生产环境）：

1. **注册 SendGrid 账号**
   - 访问：[https://sendgrid.com](https://sendgrid.com)
   - 免费计划支持每天100封邮件

2. **创建 API Key**
   - 登录 SendGrid Dashboard
   - 进入 Settings > API Keys
   - 创建新的 API Key
   - 选择 "Full Access"
   - 保存 API Key

3. **在 Supabase 中配置**
   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey (固定值)
   SMTP Pass: 您的 SendGrid API Key
   Sender email: noreply@yourdomain.com
   Sender name: 退回包裹管理系统
   ```

4. **验证发件人邮箱**
   - 在 SendGrid 中验证您的发件人邮箱
   - Settings > Sender Authentication
   - Verify Single Sender

---

## 邮件模板配置

### 步骤1：进入邮件模板设置

1. 点击左侧菜单的 **Authentication**
2. 点击 **Email Templates**（邮件模板）
3. 找到 **Reset Password** 模板

### 步骤2：编辑重置密码模板

点击 **Reset Password** 进入编辑界面。

#### 基础配置

```
Subject (主题):
重置您的密码 - 退回包裹管理系统
```

#### 邮件内容（HTML版本 - 推荐）

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #667eea;
    }
    .header h1 {
      color: #667eea;
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 15px 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
    }
    .button:hover {
      background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 14px;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info {
      background: #e7f3ff;
      border-left: 4px solid #2196f3;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 退回包裹管理系统</h1>
    </div>
    
    <div class="content">
      <h2>重置密码请求</h2>
      <p>您好，</p>
      <p>我们收到了您的密码重置请求。如果这不是您本人的操作，请忽略此邮件。</p>
      
      <div class="button-container">
        <a href="{{ .ConfirmationURL }}" class="button">
          重置密码
        </a>
      </div>
      
      <div class="info">
        <strong>📌 提示：</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>此链接将在 <strong>1小时</strong> 后失效</li>
          <li>链接只能使用 <strong>一次</strong></li>
          <li>点击后您将设置新密码</li>
        </ul>
      </div>
      
      <div class="warning">
        <strong>⚠️ 安全提示：</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>请勿与他人分享此链接</li>
          <li>如果您没有请求重置密码，请联系管理员</li>
        </ul>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        如果按钮无法点击，请复制以下链接到浏览器：<br>
        <a href="{{ .ConfirmationURL }}" style="color: #667eea; word-break: break-all;">
          {{ .ConfirmationURL }}
        </a>
      </p>
    </div>
    
    <div class="footer">
      <p>此邮件由系统自动发送，请勿直接回复。</p>
      <p style="color: #999; font-size: 12px;">
        © 2025 退回包裹管理系统 - Powered by Supabase
      </p>
    </div>
  </div>
</body>
</html>
```

#### 邮件内容（纯文本版本 - 备用）

如果不支持HTML，使用纯文本版本：

```
退回包裹管理系统 - 重置密码

您好，

我们收到了您的密码重置请求。

请点击下面的链接重置您的密码：
{{ .ConfirmationURL }}

重要提示：
• 此链接将在1小时后失效
• 链接只能使用一次
• 如果您没有请求重置密码，请忽略此邮件并联系管理员

安全提示：
请勿与他人分享此链接。

---
此邮件由系统自动发送，请勿直接回复。
© 2025 退回包裹管理系统
```

### 步骤3：保存模板

1. 检查模板内容
2. 点击 **Save**（保存）
3. 发送测试邮件验证（可选）

---

## URL重定向配置

### 步骤1：进入URL配置

1. 点击 **Authentication**
2. 点击 **URL Configuration**

### 步骤2：配置站点URL

**Site URL**（站点URL）：
- 开发环境：`http://localhost:5173`
- 生产环境：`https://your-domain.com`

这是用户登录后的默认跳转地址。

### 步骤3：配置重定向URL

在 **Redirect URLs** 部分添加以下URL：

#### 开发环境
```
http://localhost:5173/reset-password
http://localhost:5173/*
```

#### 生产环境
```
https://your-domain.com/reset-password
https://your-domain.com/*
```

#### 如果有多个环境
```
# 本地开发
http://localhost:5173/*

# 测试环境
https://test.your-domain.com/*

# 生产环境  
https://your-domain.com/*
https://www.your-domain.com/*
```

> **重要**：确保添加了通配符 `/*` 以支持所有子路径

### 步骤4：保存配置

1. 点击 **Add URL** 添加每个URL
2. 检查所有URL是否正确
3. 点击 **Save**（保存）

---

## 测试验证

### 测试前检查清单

- [ ] SMTP配置已完成（或使用默认）
- [ ] 邮件模板已保存
- [ ] 重定向URL已添加
- [ ] Site URL已配置

### 步骤1：测试发送邮件

1. 退出登录（如果已登录）
2. 在登录页面点击"忘记/修改密码"
3. 输入您的注册邮箱
4. 点击"发送重置邮件"
5. 观察是否显示成功提示

**预期结果**：
```
✅ 密码重置邮件已发送！请检查您的邮箱（包括垃圾邮件文件夹）。
```

### 步骤2：检查邮件

1. 打开您的邮箱
2. 查找来自系统的邮件
3. 如果在收件箱找不到，检查：
   - 垃圾邮件文件夹
   - 促销/社交邮件分类
   - 所有邮件列表

**预期结果**：
- 收到主题为"重置您的密码 - 退回包裹管理系统"的邮件
- 邮件包含"重置密码"按钮
- 邮件格式正确，样式美观

### 步骤3：测试重置链接

1. 点击邮件中的"重置密码"按钮
2. 浏览器应该自动跳转到重置密码页面

**预期结果**：
- URL为：`http://localhost:5173/reset-password#access_token=...`
- 页面显示"设置新密码"表单
- 没有错误提示

### 步骤4：设置新密码

1. 输入新密码（至少6位）
2. 确认新密码
3. 点击"确认重置"

**预期结果**：
```
✅ 密码重置成功！3秒后跳转到登录页面...
```

### 步骤5：使用新密码登录

1. 等待自动跳转到登录页面
2. 使用新密码登录

**预期结果**：
- 成功登录系统
- 进入首页

---

## 常见问题排查

### 问题1：收不到邮件

#### 可能原因1：邮件在垃圾箱
**解决方法**：
- 检查垃圾邮件文件夹
- 将发件人添加到联系人
- 标记为"非垃圾邮件"

#### 可能原因2：SMTP配置错误
**检查步骤**：
1. 进入 **Project Settings** > **Authentication**
2. 查看 SMTP 配置是否正确
3. 测试 SMTP 连接

**解决方法**：
- 验证SMTP服务器地址
- 检查端口号（通常587或465）
- 确认用户名和密码正确
- 如使用Gmail，确认使用的是应用专用密码

#### 可能原因3：达到发送限制
**Supabase 默认邮件限制**：
- 每小时约3-4封邮件
- 频繁发送会触发限制

**解决方法**：
- 等待一段时间后重试
- 配置自定义SMTP（推荐）
- 升级Supabase计划

#### 可能原因4：邮箱地址错误
**解决方法**：
- 确认输入的邮箱是注册时使用的邮箱
- 在Supabase Dashboard中查看用户的邮箱地址
  - Authentication > Users

---

### 问题2：点击链接显示"无效或已过期"

#### 可能原因1：链接已使用
**说明**：
- 重置链接只能使用一次
- 使用后立即失效

**解决方法**：
- 重新申请密码重置
- 获取新的重置链接

#### 可能原因2：链接已过期
**说明**：
- 重置链接默认有效期为1小时

**解决方法**：
- 重新申请密码重置
- 建议收到邮件后尽快使用

#### 可能原因3：URL配置错误
**检查步骤**：
1. 进入 **Authentication** > **URL Configuration**
2. 确认重定向URL包含：
   ```
   http://localhost:5173/reset-password
   http://localhost:5173/*
   ```

**解决方法**：
- 添加缺失的URL
- 确保使用正确的域名和端口
- 保存后重新申请重置

---

### 问题3：点击链接无反应或404

#### 可能原因：前端路由未配置
**检查步骤**：
1. 确认 `src/App.jsx` 包含重置密码路由
2. 确认 `src/components/ResetPassword.jsx` 文件存在

**解决方法**：
- 确保代码已部署最新版本
- 检查浏览器控制台是否有错误
- 清除浏览器缓存后重试

---

### 问题4：邮件样式不正确

#### 可能原因：邮箱客户端不支持HTML
**说明**：
某些邮箱客户端（如Outlook旧版本）对HTML支持有限

**解决方法**：
- 使用简化的HTML模板
- 避免复杂的CSS样式
- 确保纯文本版本可读

---

### 问题5：生产环境邮件发送失败

#### 可能原因：SMTP未配置
**说明**：
生产环境强烈建议使用自定义SMTP

**解决方法**：
1. 注册专业邮件服务（SendGrid/Mailgun）
2. 在Supabase中配置SMTP
3. 验证发件人邮箱域名

---

## 查看发送日志

### 步骤1：进入日志页面

1. 点击 **Logs**（日志）
2. 选择 **Auth Logs**（认证日志）

### 步骤2：查找密码重置记录

筛选条件：
- Event Type: `user.password_recovery`
- Time Range: 选择合适的时间范围

### 步骤3：查看详细信息

点击记录可以看到：
- 用户邮箱
- 发送时间
- 是否成功
- 错误信息（如有）

---

## 安全最佳实践

### 1. 使用HTTPS
- 生产环境必须使用HTTPS
- 确保SSL证书有效

### 2. 限制重置频率
Supabase默认限制：
- 同一邮箱每60秒只能请求一次

### 3. 监控异常请求
定期检查：
- 频繁的重置请求
- 来自同一IP的大量请求

### 4. 保护SMTP凭证
- 不要在代码中硬编码SMTP密码
- 使用环境变量或密钥管理

### 5. 定期更新邮件模板
- 检查链接是否正确
- 更新品牌信息
- 优化用户体验

---

## 生产环境配置检查清单

部署到生产环境前，请确认：

- [ ] 已配置自定义SMTP（不使用默认）
- [ ] 已验证发件人邮箱/域名
- [ ] 已添加生产环境重定向URL
- [ ] 已配置正确的Site URL
- [ ] 邮件模板包含正确的品牌信息
- [ ] 测试了完整的重置流程
- [ ] 检查了邮件送达率
- [ ] 配置了邮件发送监控
- [ ] 文档已更新给团队
- [ ] 用户已收到功能通知

---

## 推荐的邮件服务提供商对比

| 提供商 | 免费额度 | 优点 | 缺点 | 适用场景 |
|--------|----------|------|------|----------|
| **SendGrid** | 100封/天 | 稳定性高、送达率好 | 需要验证域名 | 推荐生产环境 |
| **Mailgun** | 5000封/月 | API功能强大 | 配置稍复杂 | 大量发送需求 |
| **Gmail** | 500封/天 | 免费、易配置 | 可能被限制 | 小型项目/测试 |
| **AWS SES** | 62000封/月 | 便宜、可扩展 | 需要AWS账号 | AWS生态内 |
| **阿里云** | 200封/天 | 国内送达率高 | 需备案域名 | 国内用户 |

---

## 技术支持

如果按照本教程操作仍然遇到问题，可以：

1. **查看Supabase文档**
   - [Auth Email Configuration](https://supabase.com/docs/guides/auth/auth-email)

2. **检查系统日志**
   - Supabase Dashboard > Logs > Auth Logs

3. **联系支持**
   - Supabase Discord社区
   - GitHub Issues

4. **查看示例代码**
   - [Supabase Auth Examples](https://github.com/supabase/examples)

---

## 附录：完整配置示例

### Supabase Dashboard 配置总览

```yaml
# Authentication Settings
Email Authentication: ✅ Enabled
Confirm Email: ✅ Enabled
Secure Email Change: ✅ Enabled

# SMTP Settings (生产环境)
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: SG.xxxxxxxxxxxxxxxxxxxxx
Sender Email: noreply@yourdomain.com
Sender Name: 退回包裹管理系统

# URL Configuration
Site URL: https://yourdomain.com
Redirect URLs:
  - https://yourdomain.com/*
  - https://yourdomain.com/reset-password

# Email Templates
Reset Password:
  Subject: 重置您的密码 - 退回包裹管理系统
  Template: [已配置HTML模板]
```

---

**文档版本**：v1.0  
**最后更新**：2025-10-18  
**适用版本**：Supabase v2.x

