# 🗄️ Supabase数据库创建详细教程

## 📌 这个教程解决什么问题

如果您在创建数据库表时遇到困难，这里提供最详细的操作步骤。

---

## 🎯 操作步骤（一步一步来）

### 第一步：打开SQL编辑器

1. 登录 Supabase 控制台：https://supabase.com
2. 选择您创建的项目
3. 在左侧菜单中找到并点击 **"SQL Editor"**（或"SQL编辑器"）
4. 会看到一个空白的SQL编辑框

---

### 第二步：创建数据库表（两种方式）

#### 方式A：使用SQL编辑器（推荐）⭐

**步骤：**

1. 在SQL编辑器中，点击 **"New query"**（新建查询）

2. 复制下面的**完整SQL代码**（一次性全部复制）

3. 粘贴到SQL编辑器中

4. 点击右下角的 **"Run"**（运行）按钮

5. 等待执行完成，看到 **"Success"**（成功）提示

---

#### 方式B：使用表编辑器（可视化）

如果您不熟悉SQL，可以用可视化方式：

1. 点击左侧 **"Table Editor"**（表编辑器）
2. 点击 **"Create a new table"**（创建新表）
3. 按照下面的表结构手动创建

（但方式A更简单，推荐使用）

---

## 📋 完整SQL代码（直接复制使用）

### 复制这段代码到SQL编辑器：

```sql
-- ================================
-- 1. 创建 packages 表（包裹数据）
-- ================================

CREATE TABLE IF NOT EXISTS packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  package_number TEXT NOT NULL,
  location TEXT NOT NULL,
  package_status TEXT NOT NULL DEFAULT 'in-warehouse',
  customer_service TEXT,
  shelving_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unshelving_time TIMESTAMPTZ,
  instruction_time TIMESTAMPTZ,
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 启用行级安全
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "所有登录用户可查看包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可添加包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可更新包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可删除包裹" ON packages;

-- 策略1：所有登录用户可查看包裹
CREATE POLICY "所有登录用户可查看包裹"
  ON packages FOR SELECT
  USING (auth.role() = 'authenticated');

-- 策略2：所有登录用户可添加包裹
CREATE POLICY "所有登录用户可添加包裹"
  ON packages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 策略3：所有登录用户可更新包裹
CREATE POLICY "所有登录用户可更新包裹"
  ON packages FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 策略4：所有登录用户可删除包裹
CREATE POLICY "所有登录用户可删除包裹"
  ON packages FOR DELETE
  USING (auth.role() = 'authenticated');


-- ================================
-- 2. 创建 locations 表（库位数据）
-- ================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 启用行级安全
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "所有登录用户可查看库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可添加库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可删除库位" ON locations;

-- 策略1：所有登录用户可查看库位
CREATE POLICY "所有登录用户可查看库位"
  ON locations FOR SELECT
  USING (auth.role() = 'authenticated');

-- 策略2：所有登录用户可添加库位
CREATE POLICY "所有登录用户可添加库位"
  ON locations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 策略3：所有登录用户可删除库位
CREATE POLICY "所有登录用户可删除库位"
  ON locations FOR DELETE
  USING (auth.role() = 'authenticated');


-- ================================
-- 3. 验证创建结果
-- ================================

-- 显示创建的表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('packages', 'locations');
```

---

## ✅ 执行后的验证

### 检查是否成功

执行完SQL后，您应该看到：

1. **成功提示**：
   ```
   Success. No rows returned
   ```

2. **验证表是否创建**：
   - 点击左侧 **"Table Editor"**
   - 应该能看到两个表：
     - ✅ `packages`
     - ✅ `locations`

3. **查看表结构**：
   - 点击表名
   - 查看列是否正确创建

---

## 🔍 常见问题和解决方法

### ❌ 问题1：提示"策略已存在"

**错误信息：**
```
policy "xxx" for table "packages" already exists
```

**解决方法：**
在SQL编辑器中运行：
```sql
-- 删除所有包裹表的策略
DROP POLICY IF EXISTS "所有登录用户可查看包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可添加包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可更新包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可删除包裹" ON packages;

-- 删除所有库位表的策略
DROP POLICY IF EXISTS "所有登录用户可查看库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可添加库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可删除库位" ON locations;
```

然后重新运行完整的SQL代码。

---

### ❌ 问题2：提示"表已存在"

**错误信息：**
```
relation "packages" already exists
```

**这不是错误！** ✅

说明表已经创建成功了，可以继续下一步。

**或者**，如果您想重新创建：
```sql
-- 删除旧表（注意：会丢失数据）
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
```

然后重新运行完整的SQL代码。

---

### ❌ 问题3：不知道在哪里找SQL编辑器

**详细步骤：**

1. 打开 Supabase 控制台：https://supabase.com
2. 点击您的项目
3. 左侧菜单往下滚动，找到 **"SQL Editor"**
4. 如果找不到，试试搜索框搜索 "SQL"

**界面大概长这样：**
```
左侧菜单：
- Table Editor    ← 这是表编辑器
- SQL Editor      ← 这是SQL编辑器（要用这个）
- Database
- Authentication
- ...
```

---

### ❌ 问题4：执行SQL后没有反应

**可能原因：**
- 没有点击 "Run" 按钮
- 网络问题

**解决方法：**
1. 确保点击了右下角的 **"Run"** 按钮
2. 等待几秒钟
3. 检查网络连接
4. 刷新页面重试

---

## 📊 数据库表结构说明

创建完成后，您会有两个表：

### 表1：packages（包裹数据）

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，自动生成 |
| user_id | UUID | 用户ID（关联auth.users） |
| package_number | TEXT | 包裹号 |
| location | TEXT | 库位号 |
| package_status | TEXT | 包裹状态（默认：in-warehouse） |
| customer_service | TEXT | 客服指令 |
| shelving_time | TIMESTAMPTZ | 上架时间 |
| unshelving_time | TIMESTAMPTZ | 下架时间 |
| instruction_time | TIMESTAMPTZ | 指令时间 |
| status_history | JSONB | 状态历史（JSON格式） |
| created_at | TIMESTAMPTZ | 创建时间 |

### 表2：locations（库位数据）

| 列名 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，自动生成 |
| code | TEXT | 库位号（唯一） |
| created_at | TIMESTAMPTZ | 创建时间 |

---

## 🎯 创建表的两种方式详细对比

### 方式A：SQL编辑器（推荐）

**优点：**
- ✅ 快速（一次性创建所有表和权限）
- ✅ 准确（复制粘贴，不会出错）
- ✅ 完整（包含所有配置）

**操作：**
1. SQL Editor → New query
2. 复制粘贴上面的SQL代码
3. 点击 Run
4. 完成！

---

### 方式B：表编辑器（可视化）

**优点：**
- ✅ 可视化，不需要懂SQL
- ✅ 更直观

**缺点：**
- ❌ 需要手动一个一个字段创建
- ❌ 容易遗漏字段
- ❌ 还需要单独配置权限

**操作步骤（packages表为例）：**

1. 点击 **"Table Editor"** → **"Create a new table"**

2. 填写表信息：
   - **Name**: `packages`
   - 取消勾选 "Enable Row Level Security" (暂时)

3. 添加列（一个一个添加）：
   
   **列1：id**
   - Name: `id`
   - Type: `uuid`
   - Default value: `gen_random_uuid()`
   - 勾选 "Is Primary Key"

   **列2：user_id**
   - Name: `user_id`
   - Type: `uuid`
   - Foreign key relation: `auth.users`

   **列3：package_number**
   - Name: `package_number`
   - Type: `text`
   - 勾选 "Is Nullable": 否

   **列4：location**
   - Name: `location`
   - Type: `text`
   - 勾选 "Is Nullable": 否

   **列5：package_status**
   - Name: `package_status`
   - Type: `text`
   - Default value: `'in-warehouse'`

   ... (继续添加其他列)

4. 点击 **"Save"**

5. 然后还需要在SQL Editor中添加权限策略

**总结：太麻烦了，还是用SQL吧！** 😅

---

## 🚀 完成后的下一步

创建表成功后：

1. ✅ 验证表已创建（在Table Editor中查看）

2. ✅ 继续实施教程的下一步：
   - 第四步：修改前端代码
   - 安装依赖：`npm install @supabase/supabase-js`

3. ✅ 查看完整教程：
   - `用户登录系统实施指南.md`

---

## 💡 额外提示

### 如果您完全不熟悉SQL

没关系！您不需要理解SQL代码，只需要：

1. ✅ 复制上面的完整SQL代码
2. ✅ 粘贴到Supabase的SQL编辑器
3. ✅ 点击 Run 按钮
4. ✅ 看到成功提示就OK了

就像复制粘贴一样简单！

---

## 📞 需要帮助？

如果还有问题：

1. **检查左侧菜单是否能看到创建的表**
   - Table Editor → 应该有 packages 和 locations

2. **试试刷新页面**
   - 有时需要刷新才能看到新建的表

3. **确认项目状态**
   - 项目是否初始化完成
   - 项目状态是否为 "Active"

---

## ✅ 快速检查清单

创建表前：
- [ ] 已登录Supabase
- [ ] 已选择正确的项目
- [ ] 项目状态为 "Active"
- [ ] 找到了 SQL Editor

创建表时：
- [ ] 复制了完整的SQL代码
- [ ] 粘贴到SQL编辑器
- [ ] 点击了 Run 按钮
- [ ] 看到了成功提示

创建表后：
- [ ] 在 Table Editor 中能看到 packages 表
- [ ] 在 Table Editor 中能看到 locations 表
- [ ] 表中有正确的列

全部打勾就成功了！✅

---

**祝您顺利完成！如果还有问题，请告诉我具体的错误信息。** 😊

