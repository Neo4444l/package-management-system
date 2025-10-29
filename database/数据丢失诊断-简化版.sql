-- ================================================================
-- 数据丢失诊断 - 简化版（保证不报错）
-- ================================================================
-- 只包含核心检查，适合快速诊断
-- ================================================================

-- 📋 提示：请逐步执行下面的查询，查看结果

-- ================================================================
-- 1. 核心检查：数据是否真的丢失？
-- ================================================================

-- 临时禁用 RLS，查看真实数据
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;

-- 查看所有 A-10 开头的库位
SELECT 
  code AS 库位号,
  city AS 城市,
  created_at AS 创建时间,
  id
FROM locations
WHERE code LIKE 'A-10-%'
ORDER BY code;

-- 重新启用 RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- ⭐ 如果上面有数据，说明数据没丢失，是权限问题
-- ⭐ 如果上面没数据，说明数据被删除了，继续往下看

-- ================================================================
-- 2. 统计各城市的库位数量
-- ================================================================

ALTER TABLE locations DISABLE ROW LEVEL SECURITY;

SELECT 
  city AS 城市,
  COUNT(*) AS 库位总数,
  MIN(created_at) AS 最早创建时间,
  MAX(created_at) AS 最新创建时间
FROM locations
GROUP BY city
ORDER BY city;

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 3. 统计各城市的包裹数量
-- ================================================================

ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

SELECT 
  city AS 城市,
  package_status AS 包裹状态,
  COUNT(*) AS 数量
FROM packages
GROUP BY city, package_status
ORDER BY city, package_status;

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 4. 检查当前用户的城市权限
-- ================================================================

SELECT 
  email AS 邮箱,
  role AS 角色,
  cities AS 授权城市,
  current_city AS 当前城市,
  is_active AS 是否激活
FROM profiles
WHERE id = auth.uid();

-- ⭐ 如果 cities 里没有 MIA，执行下面的修复语句：
-- UPDATE profiles SET cities = ARRAY['MIA', 'WPB', 'FTM', 'MCO', 'TPA'] WHERE id = auth.uid();

-- ================================================================
-- 5. 查找孤立的包裹（库位已删除但包裹还在）
-- ================================================================

SELECT 
  p.package_number AS 包裹号,
  p.location AS 库位,
  p.city AS 城市,
  p.package_status AS 状态
FROM packages p
LEFT JOIN locations l ON p.location = l.code AND p.city = l.city
WHERE l.id IS NULL
LIMIT 20;

-- ⭐ 如果有结果，说明这些包裹的库位被删除了

-- ================================================================
-- 6. 检查数据库表结构
-- ================================================================

-- 查看 packages 表的所有字段
SELECT 
  column_name AS 字段名,
  data_type AS 数据类型
FROM information_schema.columns 
WHERE table_name = 'packages'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 查看 locations 表的所有字段
SELECT 
  column_name AS 字段名,
  data_type AS 数据类型
FROM information_schema.columns 
WHERE table_name = 'locations'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ================================================================
-- 诊断结果总结
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 诊断完成！请查看上方结果';
  RAISE NOTICE '';
  RAISE NOTICE '📋 结果判断：';
  RAISE NOTICE '  - 如果【核心检查】有数据 → 权限问题，需要修复城市权限';
  RAISE NOTICE '  - 如果【核心检查】无数据 → 数据被删除，需要恢复数据';
  RAISE NOTICE '';
  RAISE NOTICE '📝 下一步：';
  RAISE NOTICE '  - 数据存在：执行 UPDATE profiles SET cities = ARRAY[''MIA''] WHERE id = auth.uid();';
  RAISE NOTICE '  - 数据丢失：执行 database/恢复丢失的库位.sql';
END $$;


