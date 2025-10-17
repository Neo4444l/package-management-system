-- ============================================
-- Supabase Realtime 实时数据同步配置
-- ============================================
--
-- 功能：启用数据库表的实时同步功能
-- 用途：让多个用户实时共享数据变化
-- 
-- 执行步骤：
-- 1. 登录 Supabase 控制台
-- 2. 进入 SQL Editor
-- 3. 复制并运行此脚本
-- ============================================

-- 第一步：启用 Realtime 扩展（通常已启用）
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- 第二步：将表添加到 Realtime Publication
-- ============================================

-- 启用 packages 表的实时同步
ALTER PUBLICATION supabase_realtime ADD TABLE packages;

-- 启用 locations 表的实时同步
ALTER PUBLICATION supabase_realtime ADD TABLE locations;

-- 启用 profiles 表的实时同步
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;


-- 第三步：验证配置
-- ============================================

-- 查看哪些表已启用 Realtime
SELECT 
    schemaname AS "模式",
    tablename AS "表名",
    'Realtime已启用' AS "状态"
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public';

-- 应该看到类似的结果：
-- ┌────────┬──────────┬────────────────┐
-- │ 模式   │ 表名     │ 状态           │
-- ├────────┼──────────┼────────────────┤
-- │ public │ packages │ Realtime已启用 │
-- │ public │ locations│ Realtime已启用 │
-- │ public │ profiles │ Realtime已启用 │
-- └────────┴──────────┴────────────────┘


-- 第四步：检查 RLS 策略（确保 Realtime 可以工作）
-- ============================================

-- 查看 packages 表的 RLS 策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('packages', 'locations', 'profiles')
ORDER BY tablename, policyname;


-- 第五步：测试 Realtime 连接（可选）
-- ============================================

-- 手动插入一条测试数据来验证 Realtime
-- 注意：如果你的前端已经在监听，应该能立即收到这条数据

-- 测试插入（请根据实际情况调整）
-- INSERT INTO packages (package_number, location, package_status)
-- VALUES ('TEST-REALTIME-001', 'TEST-LOC', 'in-warehouse');

-- 如果 Realtime 正常工作，前端应该立即显示这条数据

-- 测试后删除
-- DELETE FROM packages WHERE package_number = 'TEST-REALTIME-001';


-- ============================================
-- 性能优化配置
-- ============================================

-- 设置 Realtime 消息大小限制（默认 1MB）
-- ALTER SYSTEM SET max_logical_replication_workers = 4;

-- 设置 WAL 级别（Write-Ahead Logging）
-- SHOW wal_level;  -- 应该是 'logical'


-- ============================================
-- 监控和调试
-- ============================================

-- 查看当前的 Realtime 订阅数
SELECT 
    application_name,
    client_addr,
    state,
    backend_start
FROM pg_stat_activity
WHERE application_name LIKE '%realtime%';


-- 查看 Realtime 相关的统计信息
SELECT 
    slot_name,
    plugin,
    slot_type,
    active,
    restart_lsn,
    confirmed_flush_lsn
FROM pg_replication_slots
WHERE plugin = 'pgoutput';


-- ============================================
-- 故障排除
-- ============================================

-- 如果 Realtime 不工作，检查以下项：

-- 1. 检查表是否在 publication 中
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'packages';

-- 2. 检查 RLS 是否正确配置
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname IN ('packages', 'locations', 'profiles');

-- 3. 检查用户权限
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('packages', 'locations', 'profiles')
AND grantee = 'authenticated';


-- ============================================
-- 如果需要禁用 Realtime（不推荐）
-- ============================================

-- 从 publication 中移除表
-- ALTER PUBLICATION supabase_realtime DROP TABLE packages;
-- ALTER PUBLICATION supabase_realtime DROP TABLE locations;
-- ALTER PUBLICATION supabase_realtime DROP TABLE profiles;


-- ============================================
-- 完成！
-- ============================================

-- 🎉 配置完成！
--
-- 下一步：
-- 1. 前端代码已更新（添加了 Realtime 订阅）
-- 2. 打开两个浏览器窗口测试
-- 3. 在一个窗口操作数据
-- 4. 另一个窗口应该实时看到变化
--
-- 如有问题，请查看浏览器控制台的日志
-- ============================================

