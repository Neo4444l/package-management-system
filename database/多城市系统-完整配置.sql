-- ==========================================
-- 多城市系统 - 完整配置 SQL
-- ==========================================
-- 功能：实现多城市数据隔离和权限管理
-- 城市列表：MIA, WPB, FTM, MCO, TPA
-- ==========================================

-- 注意：本系统的 role 字段使用 TEXT 类型，支持的角色包括：
-- 'super_admin', 'admin', 'manager', 'user'

-- 1. 在 profiles 表添加城市相关字段
-- ==========================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_city TEXT;

-- 为现有用户设置默认城市（第一个用户设为 super_admin，拥有所有城市权限）
UPDATE profiles 
SET cities = ARRAY['MIA', 'WPB', 'FTM', 'MCO', 'TPA'],
    current_city = 'MIA',
    role = 'super_admin'
WHERE id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1);

-- 为其他现有用户设置 MIA 城市
UPDATE profiles 
SET cities = ARRAY['MIA'],
    current_city = 'MIA'
WHERE cities = '{}' OR cities IS NULL;

-- 3. 在 packages 表添加 city 字段
-- ==========================================
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'MIA';

-- 为现有包裹设置默认城市
UPDATE packages SET city = 'MIA' WHERE city IS NULL;

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_packages_city ON packages(city);
CREATE INDEX IF NOT EXISTS idx_packages_city_status ON packages(city, package_status);

-- 4. 在 locations 表添加 city 字段
-- ==========================================
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'MIA';

-- 为现有库位设置默认城市
UPDATE locations SET city = 'MIA' WHERE city IS NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);

-- 添加唯一约束：同一城市内库位号不能重复
-- 先删除旧的唯一约束（如果存在）
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_code_key;
-- 创建新的复合唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS locations_city_code_unique ON locations(city, code);

-- 5. 更新 RLS 策略 - profiles 表
-- ==========================================

-- 删除旧策略
DROP POLICY IF EXISTS "用户可以查看所有profiles" ON profiles;
DROP POLICY IF EXISTS "管理员可以创建新用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以更新用户角色" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的信息" ON profiles;
DROP POLICY IF EXISTS "管理员可以删除用户" ON profiles;

-- 策略1：用户可以查看所有 profiles（保持不变）
CREATE POLICY "用户可以查看所有profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 策略2：super_admin 和 admin 可以创建新用户
CREATE POLICY "super_admin和admin可以创建新用户"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- 策略3：super_admin 可以更新任何用户，admin 只能更新非 super_admin 用户
CREATE POLICY "分级管理员可以更新用户"
  ON profiles FOR UPDATE
  USING (
    -- Super admin 可以更新任何人
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
    OR
    -- Admin 可以更新非 super_admin 的用户
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
      AND role != 'super_admin'
    )
    OR
    -- 用户可以更新自己（但不能改角色和城市）
    auth.uid() = id
  );

-- 策略4：用户可以更新自己的信息（不能改角色、激活状态和城市）
CREATE POLICY "用户可以更新自己的基本信息"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM profiles WHERE id = auth.uid())
    AND cities = (SELECT cities FROM profiles WHERE id = auth.uid())
  );

-- 策略5：super_admin 可以删除任何人（除了自己），admin 可以删除非 super_admin 用户（除了自己）
CREATE POLICY "分级管理员可以删除用户"
  ON profiles FOR DELETE
  USING (
    -- Super admin 可以删除任何人（除了自己）
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
      )
      AND auth.uid() <> id
    )
    OR
    -- Admin 可以删除非 super_admin 的用户（除了自己）
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
      AND role != 'super_admin'
      AND auth.uid() <> id
    )
  );

-- 6. 更新 RLS 策略 - packages 表（基于城市隔离）
-- ==========================================

-- 删除旧策略
DROP POLICY IF EXISTS "用户可以查看所有包裹" ON packages;
DROP POLICY IF EXISTS "用户可以添加包裹" ON packages;
DROP POLICY IF EXISTS "用户可以更新包裹" ON packages;
DROP POLICY IF EXISTS "管理员可以删除包裹" ON packages;

-- 策略1：用户只能查看自己有权限的城市的包裹
CREATE POLICY "用户可以查看授权城市的包裹"
  ON packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'  -- super_admin 可以看所有城市
        OR city = ANY(profiles.cities)  -- 或者城市在用户的授权列表中
      )
    )
  );

-- 策略2：用户只能在授权的城市添加包裹
CREATE POLICY "用户可以在授权城市添加包裹"
  ON packages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR city = ANY(profiles.cities)
      )
    )
  );

-- 策略3：用户只能更新授权城市的包裹
CREATE POLICY "用户可以更新授权城市的包裹"
  ON packages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR city = ANY(profiles.cities)
      )
    )
  );

-- 策略4：super_admin 和 admin 可以删除授权城市的包裹
CREATE POLICY "管理员可以删除授权城市的包裹"
  ON packages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
      AND (
        profiles.role = 'super_admin'
        OR city = ANY(profiles.cities)
      )
    )
  );

-- 7. 更新 RLS 策略 - locations 表（基于城市隔离）
-- ==========================================

-- 删除旧策略
DROP POLICY IF EXISTS "用户可以查看所有库位" ON locations;
DROP POLICY IF EXISTS "用户可以添加库位" ON locations;
DROP POLICY IF EXISTS "管理员可以删除库位" ON locations;

-- 策略1：用户只能查看授权城市的库位
CREATE POLICY "用户可以查看授权城市的库位"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR city = ANY(profiles.cities)
      )
    )
  );

-- 策略2：用户只能在授权城市添加库位
CREATE POLICY "用户可以在授权城市添加库位"
  ON locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR city = ANY(profiles.cities)
      )
    )
  );

-- 策略3：管理员可以删除授权城市的库位
CREATE POLICY "管理员可以删除授权城市的库位"
  ON locations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
      AND (
        profiles.role = 'super_admin'
        OR city = ANY(profiles.cities)
      )
    )
  );

-- 8. 创建城市列表函数（可选，用于前端获取可用城市）
-- ==========================================
CREATE OR REPLACE FUNCTION get_available_cities()
RETURNS TEXT[] AS $$
BEGIN
  RETURN ARRAY['MIA', 'WPB', 'FTM', 'MCO', 'TPA'];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 创建获取用户授权城市的函数
-- ==========================================
CREATE OR REPLACE FUNCTION get_user_cities(user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  user_cities TEXT[];
  user_role TEXT;
BEGIN
  SELECT cities, role INTO user_cities, user_role
  FROM profiles
  WHERE id = user_id;
  
  -- 如果是 super_admin，返回所有城市
  IF user_role = 'super_admin' THEN
    RETURN ARRAY['MIA', 'WPB', 'FTM', 'MCO', 'TPA'];
  END IF;
  
  RETURN user_cities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 添加注释
-- ==========================================
COMMENT ON COLUMN profiles.cities IS '用户有权访问的城市列表';
COMMENT ON COLUMN profiles.current_city IS '用户当前选择的城市';
COMMENT ON COLUMN packages.city IS '包裹所属城市';
COMMENT ON COLUMN locations.city IS '库位所属城市';

-- ==========================================
-- 配置完成！
-- ==========================================

-- 验证配置
SELECT 
  'profiles 表' as 表名,
  COUNT(*) as 总记录数,
  COUNT(DISTINCT role) as 角色数量,
  COUNT(CASE WHEN cities IS NOT NULL AND cities != '{}' THEN 1 END) as 有城市权限的用户数
FROM profiles

UNION ALL

SELECT 
  'packages 表',
  COUNT(*),
  COUNT(DISTINCT city),
  COUNT(CASE WHEN city IS NOT NULL THEN 1 END)
FROM packages

UNION ALL

SELECT 
  'locations 表',
  COUNT(*),
  COUNT(DISTINCT city),
  COUNT(CASE WHEN city IS NOT NULL THEN 1 END)
FROM locations;

