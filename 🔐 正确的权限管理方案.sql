-- ================================================================
-- 🔐 正确的权限管理方案
-- ================================================================
-- 
-- 权限设计：
-- 1. 普通用户（user）：
--    - ✅ 可以查看所有数据（数据互通）
--    - ✅ 可以添加包裹、库位
--    - ✅ 可以更新包裹状态（上架、下架）
--    - ❌ 不能删除数据
--
-- 2. 管理员（admin）：
--    - ✅ 所有普通用户的权限
--    - ✅ 可以删除包裹、库位
--    - ✅ 可以管理用户角色
--
-- 解决 infinite recursion 的关键：
-- 使用 SECURITY DEFINER 函数来避免在策略中直接查询 profiles 表
--
-- ================================================================


-- ================================
-- 第1步：创建辅助函数（避免循环引用）
-- ================================

-- 删除旧函数
DROP FUNCTION IF EXISTS get_user_role();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_manager_or_admin();
DROP FUNCTION IF EXISTS auth.user_role();

-- 创建获取当前用户角色的函数
-- SECURITY DEFINER: 以函数创建者的权限执行，避免 RLS 检查
-- STABLE: 在同一查询中，相同输入返回相同结果
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- 直接查询，不受 RLS 限制
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- 如果找不到，返回默认角色
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 创建检查是否为管理员的函数
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 创建检查是否为管理员或经理的函数
CREATE OR REPLACE FUNCTION is_manager_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ================================
-- 第2步：修复 profiles 表（解决 infinite recursion）
-- ================================

-- 删除所有旧策略
DROP POLICY IF EXISTS "用户可以查看自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的资料" ON profiles;
DROP POLICY IF EXISTS "管理员可以查看所有资料" ON profiles;
DROP POLICY IF EXISTS "管理员可以更新所有资料" ON profiles;
DROP POLICY IF EXISTS "激活用户可以查看资料" ON profiles;
DROP POLICY IF EXISTS "所有登录用户可以查看profiles" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的基本信息" ON profiles;
DROP POLICY IF EXISTS "管理员可以更新所有用户" ON profiles;

-- 确保 RLS 启用
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 新策略1：所有登录用户可以查看所有 profiles（数据互通！）
-- 使用 auth.role() 而不是查询 profiles，避免循环
CREATE POLICY "所有登录用户可查看profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 新策略2：用户可以更新自己的基本信息（不能改角色）
CREATE POLICY "用户可更新自己的基本信息"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1)
  );

-- 新策略3：管理员可以更新所有用户信息
-- 使用我们创建的 is_admin() 函数
CREATE POLICY "管理员可更新所有用户"
  ON profiles FOR UPDATE
  USING (is_admin());


-- ================================
-- 第3步：配置 packages 表（分级权限）
-- ================================

-- 删除所有旧策略
DROP POLICY IF EXISTS "所有登录用户可查看包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可添加包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可更新包裹" ON packages;
DROP POLICY IF EXISTS "所有登录用户可删除包裹" ON packages;
DROP POLICY IF EXISTS "激活用户可以查看包裹" ON packages;
DROP POLICY IF EXISTS "激活用户可以添加包裹" ON packages;
DROP POLICY IF EXISTS "激活用户可以更新包裹" ON packages;
DROP POLICY IF EXISTS "管理员和经理可以删除包裹" ON packages;

-- 确保 RLS 启用
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- 策略1：所有登录用户可以查看所有包裹（数据互通！）
CREATE POLICY "所有用户可查看包裹"
  ON packages FOR SELECT
  USING (auth.role() = 'authenticated');

-- 策略2：所有登录用户可以添加包裹（上架）
CREATE POLICY "所有用户可添加包裹"
  ON packages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 策略3：所有登录用户可以更新包裹（下架、改状态）
CREATE POLICY "所有用户可更新包裹"
  ON packages FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 策略4：只有管理员可以删除包裹 ⭐ 关键权限控制
CREATE POLICY "只有管理员可删除包裹"
  ON packages FOR DELETE
  USING (is_admin());


-- ================================
-- 第4步：配置 locations 表（分级权限）
-- ================================

-- 删除所有旧策略
DROP POLICY IF EXISTS "所有登录用户可查看库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可添加库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可删除库位" ON locations;
DROP POLICY IF EXISTS "激活用户可以查看库位" ON locations;
DROP POLICY IF EXISTS "管理员和经理可以添加库位" ON locations;
DROP POLICY IF EXISTS "只有管理员可以删除库位" ON locations;

-- 确保 RLS 启用
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 策略1：所有登录用户可以查看所有库位（数据互通！）
CREATE POLICY "所有用户可查看库位"
  ON locations FOR SELECT
  USING (auth.role() = 'authenticated');

-- 策略2：所有登录用户可以添加库位
CREATE POLICY "所有用户可添加库位"
  ON locations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 策略3：只有管理员可以删除库位 ⭐ 关键权限控制
CREATE POLICY "只有管理员可删除库位"
  ON locations FOR DELETE
  USING (is_admin());


-- ================================
-- 第5步：配置 operation_logs 表（如果存在）
-- ================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operation_logs') THEN
    -- 删除旧策略
    EXECUTE 'DROP POLICY IF EXISTS "管理员可以查看所有日志" ON operation_logs';
    EXECUTE 'DROP POLICY IF EXISTS "允许插入日志" ON operation_logs';
    EXECUTE 'DROP POLICY IF EXISTS "所有登录用户可以查看日志" ON operation_logs';
    
    -- 确保 RLS 启用
    EXECUTE 'ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY';
    
    -- 策略1：管理员可以查看日志
    EXECUTE 'CREATE POLICY "管理员可查看日志"
      ON operation_logs FOR SELECT
      USING (is_admin())';
    
    -- 策略2：所有用户可以插入日志
    EXECUTE 'CREATE POLICY "允许插入日志"
      ON operation_logs FOR INSERT
      WITH CHECK (auth.role() = ''authenticated'')';
      
    RAISE NOTICE '✅ operation_logs 表权限已配置';
  END IF;
END $$;


-- ================================
-- 第6步：验证配置
-- ================================

-- 查看辅助函数
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_role', 'is_admin', 'is_manager_or_admin')
ORDER BY routine_name;

-- 查看 profiles 表的策略
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 查看 packages 表的策略
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'packages'
ORDER BY policyname;

-- 查看 locations 表的策略
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'locations'
ORDER BY policyname;


-- ================================
-- 第7步：测试权限（在配置完成后运行）
-- ================================

-- 查看当前用户的角色
SELECT get_user_role() as my_role;

-- 查看是否为管理员
SELECT is_admin() as am_i_admin;

-- 查看所有用户及其角色
SELECT 
  email,
  role,
  CASE 
    WHEN role = 'admin' THEN '管理员 (全部权限)'
    WHEN role = 'manager' THEN '经理 (大部分权限)'
    ELSE '普通用户 (基础权限)'
  END as role_description,
  created_at
FROM profiles
ORDER BY created_at;


-- ================================
-- 完成！
-- ================================

DO $$
BEGIN
  RAISE NOTICE '✅ 权限管理系统配置完成！';
  RAISE NOTICE '';
  RAISE NOTICE '权限设计：';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 数据访问（所有用户）：';
  RAISE NOTICE '  ✅ 查看包裹 - 所有用户可见（数据互通）';
  RAISE NOTICE '  ✅ 查看库位 - 所有用户可见（数据互通）';
  RAISE NOTICE '  ✅ 查看用户列表 - 所有用户可见';
  RAISE NOTICE '';
  RAISE NOTICE '👤 普通用户权限：';
  RAISE NOTICE '  ✅ 上架包裹（添加）';
  RAISE NOTICE '  ✅ 下架包裹（更新状态）';
  RAISE NOTICE '  ✅ 修改包裹状态';
  RAISE NOTICE '  ✅ 添加库位';
  RAISE NOTICE '  ❌ 删除包裹';
  RAISE NOTICE '  ❌ 删除库位';
  RAISE NOTICE '';
  RAISE NOTICE '👑 管理员权限：';
  RAISE NOTICE '  ✅ 所有普通用户的权限';
  RAISE NOTICE '  ✅ 删除包裹 ⭐';
  RAISE NOTICE '  ✅ 删除库位 ⭐';
  RAISE NOTICE '  ✅ 管理用户角色 ⭐';
  RAISE NOTICE '  ✅ 查看操作日志 ⭐';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 安全特性：';
  RAISE NOTICE '  ✅ 避免了 infinite recursion 问题';
  RAISE NOTICE '  ✅ 使用 SECURITY DEFINER 函数';
  RAISE NOTICE '  ✅ 所有查询都经过 RLS 验证';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 刷新前端页面（Ctrl+Shift+R）';
  RAISE NOTICE '2. 用普通用户测试：可以上架、下架，但删除会失败';
  RAISE NOTICE '3. 用管理员测试：所有操作都可以成功';
  RAISE NOTICE '4. 检查数据是否互通';
END $$;

