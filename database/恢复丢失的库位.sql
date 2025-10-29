-- ================================================================
-- 恢复丢失的库位 SQL 脚本
-- ================================================================
-- 用途：如果库位被误删，使用此脚本恢复
-- ================================================================

-- 注意：执行前请先运行 "数据丢失诊断.sql" 确认数据确实丢失

-- ================================================================
-- 方法1：重新创建18-25号的库位（如果确认被删除）
-- ================================================================

-- 批量插入 A-10-18 到 A-10-25 的库位（适用于 MIA 城市）
INSERT INTO locations (code, city, created_at)
VALUES
  ('A-10-18-2025', 'MIA', '2025-10-18 00:00:00+00'),
  ('A-10-19-2025', 'MIA', '2025-10-19 00:00:00+00'),
  ('A-10-20-2025', 'MIA', '2025-10-20 00:00:00+00'),
  ('A-10-21-2025', 'MIA', '2025-10-21 00:00:00+00'),
  ('A-10-22-2025', 'MIA', '2025-10-22 00:00:00+00'),
  ('A-10-23-2025', 'MIA', '2025-10-23 00:00:00+00'),
  ('A-10-24-2025', 'MIA', '2025-10-24 00:00:00+00'),
  ('A-10-25-2025', 'MIA', '2025-10-25 00:00:00+00')
ON CONFLICT (city, code) DO NOTHING; -- 如果已存在则跳过

-- 验证插入结果
SELECT code, city, created_at 
FROM locations 
WHERE code IN (
  'A-10-18-2025', 'A-10-19-2025', 'A-10-20-2025', 'A-10-21-2025',
  'A-10-22-2025', 'A-10-23-2025', 'A-10-24-2025', 'A-10-25-2025'
)
ORDER BY code;

-- ================================================================
-- 方法2：如果需要为其他城市恢复库位
-- ================================================================

-- 为 WPB 恢复库位（修改 'MIA' 为 'WPB'）
-- INSERT INTO locations (code, city, created_at)
-- VALUES
--   ('A-10-18-2025', 'WPB', '2025-10-18 00:00:00+00'),
--   ('A-10-19-2025', 'WPB', '2025-10-19 00:00:00+00')
-- ON CONFLICT (city, code) DO NOTHING;

-- ================================================================
-- 方法3：从备份恢复（如果有Supabase备份）
-- ================================================================

-- Supabase免费版不支持自动备份
-- 如果是付费版，可以在 Dashboard > Settings > Backups 中恢复

-- ================================================================
-- 防止未来数据丢失的措施
-- ================================================================

-- 1. 创建删除审计日志触发器
CREATE OR REPLACE FUNCTION log_location_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO operation_logs (
    user_id,
    user_email,
    action,
    target_type,
    target_id,
    details,
    created_at
  )
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'DELETE_LOCATION',
    'location',
    OLD.id::TEXT,
    jsonb_build_object(
      'code', OLD.code,
      'city', OLD.city,
      'deleted_at', NOW()
    ),
    NOW()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_location_delete ON locations;
CREATE TRIGGER on_location_delete
  BEFORE DELETE ON locations
  FOR EACH ROW EXECUTE FUNCTION log_location_deletion();

-- 2. 创建包裹删除审计日志触发器
CREATE OR REPLACE FUNCTION log_package_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO operation_logs (
    user_id,
    user_email,
    action,
    target_type,
    target_id,
    details,
    created_at
  )
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'DELETE_PACKAGE',
    'package',
    OLD.id::TEXT,
    jsonb_build_object(
      'package_number', OLD.package_number,
      'location', OLD.location,
      'city', OLD.city,
      'package_status', OLD.package_status,
      'deleted_at', NOW()
    ),
    NOW()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_package_delete ON packages;
CREATE TRIGGER on_package_delete
  BEFORE DELETE ON packages
  FOR EACH ROW EXECUTE FUNCTION log_package_deletion();

-- 验证触发器已创建
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('on_location_delete', 'on_package_delete');

-- ================================================================
-- 完成提示
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 库位恢复脚本执行完成！';
  RAISE NOTICE '';
  RAISE NOTICE '已完成：';
  RAISE NOTICE '  1. 恢复 A-10-18 到 A-10-25 的库位';
  RAISE NOTICE '  2. 创建删除审计日志触发器';
  RAISE NOTICE '';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '  1. 查看 locations 表确认数据';
  RAISE NOTICE '  2. 刷新前端页面验证';
  RAISE NOTICE '  3. 检查 operation_logs 表查看删除记录';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ 建议：定期导出数据备份！';
END $$;


