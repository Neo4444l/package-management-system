-- ========================================
-- 添加用户名功能 - 数据库迁移脚本
-- ========================================

-- 步骤1：为 profiles 表添加 username 字段
-- ========================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

COMMENT ON COLUMN profiles.username IS '用户名，用于显示和标识用户';


-- 步骤2：为现有用户生成默认用户名（从邮箱提取）
-- ========================================

UPDATE profiles
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL;


-- 步骤3：为 packages 表添加最后操作用户字段
-- ========================================

ALTER TABLE packages
ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES profiles(id);

ALTER TABLE packages
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

COMMENT ON COLUMN packages.last_modified_by IS '最后修改此包裹的用户ID';
COMMENT ON COLUMN packages.last_modified_at IS '最后修改时间';


-- 步骤4：创建触发器自动更新 last_modified_at
-- ========================================

CREATE OR REPLACE FUNCTION update_packages_last_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_packages_last_modified ON packages;

CREATE TRIGGER trigger_update_packages_last_modified
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_packages_last_modified();


-- ========================================
-- 使用说明
-- ========================================

-- 1. 在 Supabase SQL Editor 中运行此脚本
-- 2. 刷新数据库表结构
-- 3. 现有用户会自动获得基于邮箱的用户名
-- 4. 新用户创建时需要提供用户名
-- 5. 包裹修改时会自动记录操作用户

-- ========================================
-- 验证
-- ========================================

-- 查看所有用户及其用户名
-- SELECT id, email, username FROM profiles;

-- 查看包裹及最后操作用户
-- SELECT p.*, prof.username FROM packages p LEFT JOIN profiles prof ON p.last_modified_by = prof.id LIMIT 10;

