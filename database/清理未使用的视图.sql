-- ================================================================
-- 清理未使用的视图 - 解决 Security Definer 警告
-- ================================================================
-- 
-- 此脚本用于删除 packages_with_username 视图
-- 该视图在代码中未被使用，但使用了 SECURITY DEFINER 属性
-- 删除后将消除安全警告，且不影响系统功能
--
-- 使用方法：
-- 1. 登录 Supabase 控制台 (https://supabase.com)
-- 2. 选择您的项目
-- 3. 点击左侧 "SQL Editor"
-- 4. 点击 "New query"
-- 5. 复制本文件的全部内容
-- 6. 粘贴到编辑器中
-- 7. 点击右下角 "Run" 按钮
-- 8. 等待执行完成
--
-- ================================================================

-- 删除 packages_with_username 视图
DROP VIEW IF EXISTS public.packages_with_username CASCADE;

-- 验证删除成功（可选）
-- 如果视图已被删除，这个查询应该返回 0 行
SELECT COUNT(*) 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'packages_with_username';

-- 完成！
-- 返回 Supabase 的 Security Advisor 页面，刷新后警告应该消失


