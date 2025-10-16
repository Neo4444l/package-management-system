-- ================================================================
-- 权限管理系统 - 完整SQL脚本
-- ================================================================
-- 
-- 此脚本将为您的包裹管理系统添加完整的角色权限管理
-- 
-- 角色说明：
-- - admin: 管理员（完全权限）
-- - manager: 经理（大部分权限，不能删除用户）
-- - user: 普通用户（基本权限）
--
-- ================================================================


-- ================================================================
-- 1. 创建或更新 profiles 表
-- ================================================================

-- 如果表已存在，先删除（小心！会丢失角色数据）
-- DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加注释
COMMENT ON TABLE profiles IS '用户配置表';
COMMENT ON COLUMN profiles.role IS '用户角色: admin, manager, user';
COMMENT ON COLUMN profiles.is_active IS '账号是否激活';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- 启用行级安全
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 删除旧策略
DROP POLICY IF EXISTS "用户可以查看自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的资料" ON profiles;
DROP POLICY IF EXISTS "管理员可以查看所有资料" ON profiles;
DROP POLICY IF EXISTS "管理员可以更新所有资料" ON profiles;

-- 创建新策略
-- 策略1：所有登录用户可以查看自己的资料
CREATE POLICY "用户可以查看自己的资料"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 策略2：管理员可以查看所有用户资料
CREATE POLICY "管理员可以查看所有资料"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 策略3：用户可以更新自己的基本资料（不能改角色）
CREATE POLICY "用户可以更新自己的资料"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- 策略4：管理员可以更新所有用户资料
CREATE POLICY "管理员可以更新所有资料"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );


-- ================================================================
-- 2. 创建自动触发器（新用户自动创建profile）
-- ================================================================

-- 删除旧触发器和函数
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 创建新函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    new.id, 
    new.email, 
    'user',  -- 新用户默认为普通用户
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ================================================================
-- 3. 更新 packages 表策略（基于角色权限）
-- ================================================================

-- 删除旧策略
DROP POLICY IF EXISTS "所有登录用户可查看包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可添加包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可更新包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可删除包裹" ON packages;
DROP POLICY IF EXISTS "只有管理员可以删除包裹" ON packages;

-- 新策略：所有登录且激活的用户可以查看包裹
CREATE POLICY "激活用户可以查看包裹"
  ON packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

-- 新策略：所有登录且激活的用户可以添加包裹
CREATE POLICY "激活用户可以添加包裹"
  ON packages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

-- 新策略：所有登录且激活的用户可以更新包裹
CREATE POLICY "激活用户可以更新包裹"
  ON packages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

-- 新策略：只有管理员和经理可以删除包裹
CREATE POLICY "管理员和经理可以删除包裹"
  ON packages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
      AND profiles.is_active = true
    )
  );


-- ================================================================
-- 4. 更新 locations 表策略（基于角色权限）
-- ================================================================

-- 删除旧策略
DROP POLICY IF EXISTS "所有登录用户可查看库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可添加库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可删除库位" ON locations;

-- 新策略：所有激活用户可以查看库位
CREATE POLICY "激活用户可以查看库位"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

-- 新策略：管理员和经理可以添加库位
CREATE POLICY "管理员和经理可以添加库位"
  ON locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
      AND profiles.is_active = true
    )
  );

-- 新策略：只有管理员可以删除库位
CREATE POLICY "只有管理员可以删除库位"
  ON locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.is_active = true
    )
  );


-- ================================================================
-- 5. 创建操作日志表（可选，记录重要操作）
-- ================================================================

CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_user ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at);

-- 启用行级安全
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- 策略：管理员可以查看所有日志
CREATE POLICY "管理员可以查看所有日志"
  ON operation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 策略：系统可以插入日志
CREATE POLICY "允许插入日志"
  ON operation_logs FOR INSERT
  WITH CHECK (true);


-- ================================================================
-- 6. 创建辅助函数
-- ================================================================

-- 获取当前用户角色
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 检查是否为管理员
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 检查是否为管理员或经理
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- ================================================================
-- 7. 设置第一个用户为管理员（重要！）
-- ================================================================

-- 方法1：手动设置（推荐）
-- 替换下面的邮箱为您的邮箱
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE email = 'your_email@example.com';

-- 方法2：将第一个注册的用户设为管理员
-- UPDATE profiles 
-- SET role = 'admin' 
-- WHERE id = (
--   SELECT id FROM profiles 
--   ORDER BY created_at ASC 
--   LIMIT 1
-- );


-- ================================================================
-- 8. 验证和查询
-- ================================================================

-- 查看所有用户及其角色
SELECT 
  email,
  role,
  is_active,
  created_at
FROM profiles
ORDER BY created_at;

-- 查看当前用户的角色
SELECT get_my_role() as my_role;

-- 统计各角色用户数
SELECT 
  role,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM profiles
GROUP BY role;


-- ================================================================
-- 完成！
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 权限管理系统配置完成！';
  RAISE NOTICE '';
  RAISE NOTICE '角色说明：';
  RAISE NOTICE '  - admin: 管理员（完全权限）';
  RAISE NOTICE '  - manager: 经理（大部分权限）';
  RAISE NOTICE '  - user: 普通用户（基本权限）';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  重要：请手动设置第一个管理员！';
  RAISE NOTICE '执行：UPDATE profiles SET role = ''admin'' WHERE email = ''your_email@example.com'';';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 设置管理员账号';
  RAISE NOTICE '2. 修改前端代码支持角色显示';
  RAISE NOTICE '3. 测试权限功能';
END $$;

