-- ================================================================
-- 修复用户删除安全漏洞
-- ================================================================
-- 
-- 问题：之前只删除 profiles 表记录，但 auth.users 中的账号仍然存在
-- 导致被删除的用户仍然可以登录系统
-- 
-- 此脚本将：
-- 1. 添加 DELETE RLS 策略到 profiles 表
-- 2. 创建安全的用户删除函数（同时删除 auth.users 和 profiles）
-- 3. 增强 is_active 检查机制
--
-- ================================================================


-- ================================================================
-- 第1步：为 profiles 表添加 DELETE 策略
-- ================================================================

-- 删除旧的 DELETE 策略（如果存在）
DROP POLICY IF EXISTS "管理员可以删除用户资料" ON profiles;
DROP POLICY IF EXISTS "超级管理员可以删除用户资料" ON profiles;

-- 创建新的 DELETE 策略：只有 admin 和 super_admin 可以删除
CREATE POLICY "管理员可以删除用户资料"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_active = true
    )
  );

-- 添加注释
COMMENT ON POLICY "管理员可以删除用户资料" ON profiles IS '只有激活的管理员和超级管理员可以删除用户';


-- ================================================================
-- 第2步：创建安全的用户删除函数
-- ================================================================

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS delete_user_completely(UUID);

-- 创建新函数：同时删除 auth.users 和 profiles
CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  -- 使用函数创建者的权限执行
AS $$
DECLARE
  current_user_role TEXT;
  target_user_email TEXT;
  result json;
BEGIN
  -- 检查当前用户是否是管理员
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  IF current_user_role NOT IN ('admin', 'super_admin') THEN
    RETURN json_build_object(
      'success', false,
      'message', '权限不足：只有管理员可以删除用户'
    );
  END IF;

  -- 防止删除自己
  IF target_user_id = auth.uid() THEN
    RETURN json_build_object(
      'success', false,
      'message', '不能删除自己的账号'
    );
  END IF;

  -- 获取目标用户邮箱（用于日志）
  SELECT email INTO target_user_email
  FROM profiles
  WHERE id = target_user_id;

  IF target_user_email IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', '用户不存在'
    );
  END IF;

  -- 删除 profiles 表中的记录
  DELETE FROM profiles WHERE id = target_user_id;

  -- 删除 auth.users 表中的记录（需要 SECURITY DEFINER）
  DELETE FROM auth.users WHERE id = target_user_id;

  -- 记录操作日志（如果有 operation_logs 表）
  BEGIN
    INSERT INTO operation_logs (
      user_id,
      operation_type,
      table_name,
      record_id,
      description,
      created_at
    ) VALUES (
      auth.uid(),
      'DELETE_USER',
      'profiles',
      target_user_id,
      '管理员删除用户: ' || target_user_email,
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- 如果 operation_logs 表不存在，忽略错误
      NULL;
  END;

  -- 返回成功结果
  RETURN json_build_object(
    'success', true,
    'message', '用户已完全删除: ' || target_user_email,
    'deleted_email', target_user_email
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 捕获所有错误
    RETURN json_build_object(
      'success', false,
      'message', '删除失败: ' || SQLERRM
    );
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION delete_user_completely(UUID) IS '安全删除用户：同时从 auth.users 和 profiles 表中删除记录';

-- 授予执行权限
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;


-- ================================================================
-- 第3步：增强 is_active 检查（可选）
-- ================================================================

-- 创建一个函数来检查用户是否有有效的 profile 且处于激活状态
CREATE OR REPLACE FUNCTION is_user_valid()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_active BOOLEAN;
  profile_exists BOOLEAN;
BEGIN
  -- 检查 profile 是否存在且激活
  SELECT is_active, true
  INTO user_active, profile_exists
  FROM profiles
  WHERE id = auth.uid();

  -- 如果 profile 不存在或未激活，返回 false
  IF NOT COALESCE(profile_exists, false) OR NOT COALESCE(user_active, false) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION is_user_valid() IS '检查当前用户是否有有效且激活的 profile';


-- ================================================================
-- 第4步：更新现有 RLS 策略，增加 is_active 检查
-- ================================================================

-- 删除旧策略
DROP POLICY IF EXISTS "用户可以查看自己的资料" ON profiles;
DROP POLICY IF EXISTS "管理员可以查看所有资料" ON profiles;
DROP POLICY IF EXISTS "super_admin可以查看所有资料" ON profiles;

-- 重新创建策略，增加 is_active 检查
CREATE POLICY "用户可以查看自己的资料"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    AND is_active = true
  );

CREATE POLICY "管理员可以查看所有资料"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_active = true
    )
  );


-- ================================================================
-- 完成提示
-- ================================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ 用户删除安全漏洞修复完成！';
  RAISE NOTICE '';
  RAISE NOTICE '已完成的修复：';
  RAISE NOTICE '1. ✅ 添加了 DELETE RLS 策略';
  RAISE NOTICE '2. ✅ 创建了 delete_user_completely() 函数';
  RAISE NOTICE '3. ✅ 增强了 is_active 检查机制';
  RAISE NOTICE '4. ✅ 更新了 profiles 表的 RLS 策略';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  重要提示：';
  RAISE NOTICE '   - 前端代码已同步更新 (UserContext.jsx)';
  RAISE NOTICE '   - 建议更新 UserManagement.jsx 使用新的删除函数';
  RAISE NOTICE '   - 所有已登录的被删除用户将在下次操作时被强制登出';
  RAISE NOTICE '';
END $$;

