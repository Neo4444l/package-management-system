-- ================================================================
-- 修复用户删除权限问题
-- ================================================================
-- 此脚本添加管理员删除用户的权限策略

-- 删除旧的DELETE策略（如果存在）
DROP POLICY IF EXISTS "管理员可以删除用户" ON profiles;

-- 创建新策略：只有管理员可以删除用户（但不能删除自己）
CREATE POLICY "管理员可以删除用户"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.is_active = true
    )
    -- 不能删除自己
    AND id != auth.uid()
  );

-- 验证策略已创建
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 完成提示
DO $$
BEGIN
  RAISE NOTICE '✅ 用户删除权限已修复！';
  RAISE NOTICE '';
  RAISE NOTICE '现在管理员可以删除其他用户（但不能删除自己）';
  RAISE NOTICE '';
  RAISE NOTICE '请在Supabase SQL Editor中执行此脚本';
END $$;

