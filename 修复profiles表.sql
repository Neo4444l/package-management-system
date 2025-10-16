-- ================================================================
-- 修复 profiles 表 - 添加缺失的列
-- ================================================================
-- 
-- 此脚本将为 profiles 表添加权限管理系统所需的所有字段
-- 不会删除现有数据
--
-- ================================================================

-- 检查表是否存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'profiles 表不存在！请先执行 supabase-setup.sql';
  END IF;
END $$;

-- 添加缺失的列（如果不存在）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 设置默认值（对于已有数据）
UPDATE profiles SET is_active = true WHERE is_active IS NULL;
UPDATE profiles SET updated_at = NOW() WHERE updated_at IS NULL;

-- 添加 NOT NULL 约束（在设置默认值之后）
ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE profiles ALTER COLUMN is_active SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE profiles ALTER COLUMN updated_at SET NOT NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- 验证结果
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 显示成功消息
DO $$
BEGIN
  RAISE NOTICE '✅ profiles 表已成功更新！';
  RAISE NOTICE '';
  RAISE NOTICE '已添加的列：';
  RAISE NOTICE '  - full_name (TEXT)';
  RAISE NOTICE '  - department (TEXT)';
  RAISE NOTICE '  - is_active (BOOLEAN, 默认: true)';
  RAISE NOTICE '  - updated_at (TIMESTAMPTZ, 默认: NOW())';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 执行完整的权限管理SQL: 权限管理系统-完整SQL.sql';
  RAISE NOTICE '2. 设置管理员账号';
  RAISE NOTICE '3. 测试功能';
END $$;

