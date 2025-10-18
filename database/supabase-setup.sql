-- ================================================================
-- 退回包裹管理系统 - Supabase 数据库初始化脚本
-- ================================================================
-- 
-- 使用方法：
-- 1. 登录 Supabase 控制台 (https://supabase.com)
-- 2. 选择您的项目
-- 3. 点击左侧 "SQL Editor"
-- 4. 点击 "New query"
-- 5. 复制本文件的全部内容
-- 6. 粘贴到编辑器中
-- 7. 点击右下角 "Run" 按钮
-- 8. 等待执行完成
--
-- ================================================================


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

-- 为常用查询添加索引
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(package_status);
CREATE INDEX IF NOT EXISTS idx_packages_location ON packages(location);
CREATE INDEX IF NOT EXISTS idx_packages_user_id ON packages(user_id);

-- 启用行级安全
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略（避免重复执行报错）
DROP POLICY IF EXISTS "所有登录用户可查看包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可添加包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可更新包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可删除包裹" ON packages;

-- 创建新策略
CREATE POLICY "所有登录用户可查看包裹"
  ON packages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "所有登录用户可添加包裹"
  ON packages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "所有登录用户可更新包裹"
  ON packages FOR UPDATE
  USING (auth.role() = 'authenticated');

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

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(code);

-- 启用行级安全
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "所有登录用户可查看库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可添加库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可删除库位" ON locations;

-- 创建新策略
CREATE POLICY "所有登录用户可查看库位"
  ON locations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "所有登录用户可添加库位"
  ON locations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "所有登录用户可删除库位"
  ON locations FOR DELETE
  USING (auth.role() = 'authenticated');


-- ================================
-- 3. 创建用户配置表（可选）
-- ================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 启用行级安全
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 策略：用户可以查看自己的资料
DROP POLICY IF EXISTS "用户可以查看自己的资料" ON profiles;
CREATE POLICY "用户可以查看自己的资料"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 策略：用户可以更新自己的资料
DROP POLICY IF EXISTS "用户可以更新自己的资料" ON profiles;
CREATE POLICY "用户可以更新自己的资料"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);


-- ================================
-- 4. 创建自动触发器（自动创建用户资料）
-- ================================

-- 创建函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 删除可能存在的旧触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ================================
-- 5. 验证创建结果
-- ================================

-- 显示所有创建的表
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('packages', 'locations', 'profiles')
ORDER BY table_name;

-- 显示成功消息
DO $$
BEGIN
  RAISE NOTICE '✅ 数据库初始化完成！';
  RAISE NOTICE '已创建以下表：';
  RAISE NOTICE '  - packages (包裹数据)';
  RAISE NOTICE '  - locations (库位数据)';
  RAISE NOTICE '  - profiles (用户资料)';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 在 Table Editor 中查看创建的表';
  RAISE NOTICE '2. 继续实施教程的第四步（修改前端代码）';
END $$;

