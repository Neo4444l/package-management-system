-- ================================================================
-- 数据丢失诊断 SQL 脚本
-- ================================================================
-- 用途：检查数据是否真的丢失，还是因为权限/过滤问题无法看到
-- ================================================================

-- 1. 检查所有库位（绕过RLS）
-- ================================================================
-- 注意：需要在 Supabase SQL Editor 中以管理员身份运行

-- 临时禁用 RLS 来查看真实数据
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

-- 查看所有库位（按城市和代码分组）
SELECT 
  city,
  code,
  created_at,
  id
FROM locations
ORDER BY city, code;

-- 查看所有包裹（按库位统计）
SELECT 
  location,
  city,
  package_status,
  COUNT(*) as package_count,
  MAX(created_at) as last_created
FROM packages
GROUP BY location, city, package_status
ORDER BY location, city;

-- 查看特定日期范围的库位
SELECT 
  code,
  city,
  created_at
FROM locations
WHERE code LIKE 'A-10-%'
ORDER BY code;

-- 统计各城市的数据
SELECT 
  'locations' as table_name,
  city,
  COUNT(*) as total_count
FROM locations
GROUP BY city

UNION ALL

SELECT 
  'packages' as table_name,
  city,
  COUNT(*) as total_count
FROM packages
GROUP BY city;

-- 重新启用 RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 2. 检查是否有软删除标记
-- ================================================================

-- 检查 packages 表是否有 deleted_at 字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'packages';

-- 检查 locations 表字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'locations';

-- ================================================================
-- 3. 检查数据库触发器（可能会自动删除）
-- ================================================================

-- 查看所有触发器
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 查看所有自定义函数（可能包含删除逻辑）
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';

-- ================================================================
-- 4. 检查 Supabase 定时任务（pg_cron）
-- ================================================================

-- 查看是否有定时任务（如果 pg_cron 未启用，此查询会报错，可以忽略）
DO $$
BEGIN
  -- 检查 pg_cron 扩展是否存在
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- 如果存在，显示所有定时任务
    RAISE NOTICE '检查定时任务...';
    PERFORM * FROM cron.job;
    
    -- 显示任务数量
    RAISE NOTICE '定时任务数量: %', (SELECT COUNT(*) FROM cron.job);
  ELSE
    RAISE NOTICE '✅ pg_cron 扩展未启用 - 说明没有自动删除任务';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '✅ 无法访问 cron.job - 说明没有定时任务权限（正常情况）';
END $$;

-- ================================================================
-- 5. 检查审计日志（如果启用了）
-- ================================================================

-- 查看最近的删除操作（如果表不存在会报错，可以忽略）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'operation_logs'
  ) THEN
    RAISE NOTICE '检查审计日志...';
    -- 显示最近的删除操作
    PERFORM 
      user_email,
      action,
      details,
      created_at
    FROM operation_logs
    WHERE action LIKE '%DELETE%'
    ORDER BY created_at DESC
    LIMIT 10;
    
    RAISE NOTICE '✅ 审计日志已启用，请在下方结果中查看删除记录';
  ELSE
    RAISE NOTICE '⚠️ operation_logs 表不存在 - 审计日志未启用（建议启用）';
  END IF;
END $$;

-- ================================================================
-- 6. 数据完整性检查
-- ================================================================

-- 查找孤立的包裹（库位已被删除，但包裹还在）
SELECT 
  p.package_number,
  p.location,
  p.city,
  p.created_at
FROM packages p
LEFT JOIN locations l ON p.location = l.code AND p.city = l.city
WHERE l.id IS NULL;

-- ================================================================
-- 使用说明：
-- ================================================================
-- 1. 登录 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 复制粘贴本脚本
-- 4. 逐段执行，查看结果
-- 5. 将结果截图或复制发给开发人员
-- ================================================================

