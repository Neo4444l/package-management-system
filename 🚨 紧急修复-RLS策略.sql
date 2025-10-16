-- ================================================================
-- 🚨 紧急修复：解决 infinite recursion 和数据不互通问题
-- ================================================================
-- 
-- 问题1：infinite recursion detected in policy for relation "profiles"
-- 原因：profiles 表的策略造成循环引用
-- 
-- 问题2：数据不互通
-- 原因：RLS 策略配置不当，用户只能看到自己创建的数据
--
-- 解决方案：重新配置所有表的 RLS 策略
--
-- ================================================================


-- ================================
-- 第1步：修复 profiles 表（解决循环引用）
-- ================================

-- 删除所有旧策略
DROP POLICY IF EXISTS "用户可以查看自己的资料" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的资料" ON profiles;
DROP POLICY IF EXISTS "管理员可以查看所有资料" ON profiles;
DROP POLICY IF EXISTS "管理员可以更新所有资料" ON profiles;
DROP POLICY IF EXISTS "激活用户可以查看资料" ON profiles;

-- 创建辅助函数（避免循环引用）
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 新策略：所有登录用户可以查看所有 profiles（解决数据互通问题）
CREATE POLICY "所有登录用户可以查看profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- 新策略：用户只能更新自己的基本信息（不能改角色）
CREATE POLICY "用户可以更新自己的基本信息"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1)
  );

-- 新策略：管理员可以更新所有用户信息
CREATE POLICY "管理员可以更新所有用户"
  ON profiles FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );


-- ================================
-- 第2步：修复 packages 表（数据互通）
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

-- 新策略：所有登录用户可以查看所有包裹（数据互通！）
CREATE POLICY "所有登录用户可查看包裹"
  ON packages FOR SELECT
  USING (auth.role() = 'authenticated');

-- 新策略：所有登录用户可以添加包裹
CREATE POLICY "所有登录用户可添加包裹"
  ON packages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 新策略：所有登录用户可以更新包裹（数据互通！）
CREATE POLICY "所有登录用户可更新包裹"
  ON packages FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 新策略：所有登录用户可以删除包裹（数据互通！）
CREATE POLICY "所有登录用户可删除包裹"
  ON packages FOR DELETE
  USING (auth.role() = 'authenticated');


-- ================================
-- 第3步：修复 locations 表（数据互通）
-- ================================

-- 删除所有旧策略
DROP POLICY IF EXISTS "所有登录用户可查看库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可添加库位" ON locations;
DROP POLICY IF EXISTS "所有登录用户可删除库位" ON locations;
DROP POLICY IF EXISTS "激活用户可以查看库位" ON locations;
DROP POLICY IF EXISTS "管理员和经理可以添加库位" ON locations;
DROP POLICY IF EXISTS "只有管理员可以删除库位" ON locations;

-- 新策略：所有登录用户可以查看所有库位（数据互通！）
CREATE POLICY "所有登录用户可查看库位"
  ON locations FOR SELECT
  USING (auth.role() = 'authenticated');

-- 新策略：所有登录用户可以添加库位
CREATE POLICY "所有登录用户可添加库位"
  ON locations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 新策略：所有登录用户可以删除库位
CREATE POLICY "所有登录用户可删除库位"
  ON locations FOR DELETE
  USING (auth.role() = 'authenticated');


-- ================================
-- 第4步：如果有 operation_logs 表，也修复它
-- ================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operation_logs') THEN
    -- 删除旧策略
    DROP POLICY IF EXISTS "管理员可以查看所有日志" ON operation_logs;
    DROP POLICY IF EXISTS "允许插入日志" ON operation_logs;
    
    -- 新策略：所有登录用户可以查看日志
    CREATE POLICY "所有登录用户可以查看日志"
      ON operation_logs FOR SELECT
      USING (auth.role() = 'authenticated');
    
    -- 新策略：允许插入日志
    CREATE POLICY "允许插入日志"
      ON operation_logs FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;


-- ================================
-- 第5步：验证修复结果
-- ================================

-- 查看 profiles 表的策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 查看 packages 表的策略
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'packages'
ORDER BY policyname;

-- 查看 locations 表的策略
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'locations'
ORDER BY policyname;


-- ================================
-- 完成！
-- ================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS 策略修复完成！';
  RAISE NOTICE '';
  RAISE NOTICE '已修复的问题：';
  RAISE NOTICE '  1. ✅ 解决了 profiles 表的 infinite recursion 错误';
  RAISE NOTICE '  2. ✅ 所有用户现在可以互相看到数据（数据互通）';
  RAISE NOTICE '  3. ✅ 简化了权限策略，避免复杂的循环引用';
  RAISE NOTICE '';
  RAISE NOTICE '新的权限模型：';
  RAISE NOTICE '  - 所有登录用户可以查看、添加、修改、删除包裹';
  RAISE NOTICE '  - 所有登录用户可以查看、添加、删除库位';
  RAISE NOTICE '  - 所有登录用户可以查看所有用户资料';
  RAISE NOTICE '  - 用户只能修改自己的基本信息（不能改角色）';
  RAISE NOTICE '  - 管理员可以修改所有用户信息';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 刷新前端页面（Ctrl+Shift+R 强制刷新）';
  RAISE NOTICE '2. 测试数据是否互通';
  RAISE NOTICE '3. 如果还有问题，检查浏览器控制台的错误信息';
END $$;

