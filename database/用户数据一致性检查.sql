-- ================================================================
-- 用户数据一致性检查和修复脚本
-- ================================================================
-- 
-- 用途：检查和修复 auth.users 和 profiles 表之间的数据不一致问题
-- 使用场景：当删除用户后无法重新注册，或用户列表显示异常时
--
-- 使用方法：
-- 1. 登录 Supabase 控制台
-- 2. 进入 SQL Editor
-- 3. 分步执行以下查询（不要一次性全部执行）
-- 4. 根据检查结果决定是否执行修复操作
--
-- ================================================================


-- ================================================================
-- 第一步：检查数据一致性
-- ================================================================

-- 1.1 检查孤立的 auth.users 记录（有 auth 记录但没有 profile）
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE '检查 1：孤立的 auth.users 记录';
  RAISE NOTICE '====================================';
END $$;

SELECT 
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  '⚠️ 这个账号有 auth 记录但没有 profile' as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- 1.2 检查孤立的 profiles 记录（有 profile 但没有 auth.users）
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '检查 2：孤立的 profiles 记录';
  RAISE NOTICE '====================================';
END $$;

SELECT 
  p.id,
  p.email,
  p.username,
  p.role,
  p.created_at,
  '⚠️ 这个 profile 没有对应的 auth 账号' as status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL
ORDER BY p.created_at DESC;

-- 1.3 检查邮箱不匹配的记录
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '检查 3：邮箱不匹配的记录';
  RAISE NOTICE '====================================';
END $$;

SELECT 
  au.id,
  au.email as auth_email,
  p.email as profile_email,
  p.username,
  '⚠️ auth.users 和 profiles 的邮箱不匹配' as status
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE au.email != p.email
ORDER BY au.created_at DESC;

-- 1.4 统计摘要
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '统计摘要';
  RAISE NOTICE '====================================';
END $$;

SELECT 
  '总用户数 (auth.users)' as metric,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  '总档案数 (profiles)' as metric,
  COUNT(*) as count
FROM profiles
UNION ALL
SELECT 
  '孤立的 auth 记录' as metric,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
UNION ALL
SELECT 
  '孤立的 profile 记录' as metric,
  COUNT(*) as count
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL
UNION ALL
SELECT 
  '邮箱不匹配' as metric,
  COUNT(*) as count
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE au.email != p.email;


-- ================================================================
-- 第二步：确认 delete_user_completely 函数存在
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '检查 4：安全删除函数';
  RAISE NOTICE '====================================';
END $$;

SELECT 
  routine_name as function_name,
  routine_type,
  '✅ 函数已安装' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'delete_user_completely'

UNION ALL

SELECT 
  'delete_user_completely' as function_name,
  'FUNCTION' as routine_type,
  '❌ 函数未安装 - 请运行 database/修复用户删除安全漏洞.sql' as status
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'delete_user_completely'
);


-- ================================================================
-- 第三步：修复选项（请根据检查结果选择性执行）
-- ================================================================

-- ⚠️ 警告：以下修复操作会永久删除数据，请谨慎操作！
-- ⚠️ 建议先备份数据再执行修复操作

-- ----------------------------------------------------------------
-- 修复选项 A：清理孤立的 auth.users 记录
-- ----------------------------------------------------------------
-- 说明：删除有 auth 记录但没有 profile 的账号
-- 适用场景：之前删除用户时只删除了 profile，导致无法用相同邮箱注册

-- 🔍 先预览将要删除的记录（安全，不会删除数据）
/*
SELECT 
  au.id,
  au.email,
  '这个账号将被删除' as note
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;
*/

-- ⚠️ 确认后执行删除（取消注释以执行）
/*
DELETE FROM auth.users
WHERE id IN (
  SELECT au.id
  FROM auth.users au
  LEFT JOIN profiles p ON au.id = p.id
  WHERE p.id IS NULL
);

-- 显示删除结果
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ 已删除 % 个孤立的 auth.users 记录', deleted_count;
END $$;
*/


-- ----------------------------------------------------------------
-- 修复选项 B：清理孤立的 profiles 记录
-- ----------------------------------------------------------------
-- 说明：删除有 profile 但没有 auth.users 的记录
-- 适用场景：auth.users 被手动删除，但 profile 仍存在

-- 🔍 先预览将要删除的记录（安全，不会删除数据）
/*
SELECT 
  p.id,
  p.email,
  p.username,
  '这个 profile 将被删除' as note
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL;
*/

-- ⚠️ 确认后执行删除（取消注释以执行）
/*
DELETE FROM profiles
WHERE id IN (
  SELECT p.id
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  WHERE au.id IS NULL
);

-- 显示删除结果
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ 已删除 % 个孤立的 profiles 记录', deleted_count;
END $$;
*/


-- ----------------------------------------------------------------
-- 修复选项 C：同步邮箱不匹配的记录
-- ----------------------------------------------------------------
-- 说明：将 profiles 的邮箱更新为与 auth.users 一致
-- 适用场景：邮箱地址不匹配导致的显示问题

-- 🔍 先预览将要更新的记录（安全，不会修改数据）
/*
SELECT 
  au.id,
  au.email as auth_email,
  p.email as old_profile_email,
  p.username,
  '邮箱将被同步' as note
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE au.email != p.email;
*/

-- ⚠️ 确认后执行同步（取消注释以执行）
/*
UPDATE profiles p
SET 
  email = au.email,
  updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id
AND p.email != au.email;

-- 显示更新结果
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ 已同步 % 个用户的邮箱', updated_count;
END $$;
*/


-- ================================================================
-- 第四步：验证修复结果
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '验证修复结果';
  RAISE NOTICE '====================================';
  RAISE NOTICE '请重新执行第一步的检查查询';
  RAISE NOTICE '所有计数应该为 0（除了总用户数和总档案数）';
END $$;


-- ================================================================
-- 第五步：测试安全删除函数（可选）
-- ================================================================

-- 如果要测试 delete_user_completely 函数，可以：
-- 1. 创建一个测试用户
-- 2. 使用函数删除该用户
-- 3. 验证 auth.users 和 profiles 都被删除

-- 🧪 测试步骤（请勿在生产环境执行）
/*
-- 1. 首先通过 Supabase Auth 创建一个测试用户
--    （使用界面或 signUp 函数，例如: test-delete@example.com）

-- 2. 查找测试用户的 ID
SELECT id, email FROM auth.users WHERE email = 'test-delete@example.com';
SELECT id, email FROM profiles WHERE email = 'test-delete@example.com';

-- 3. 执行删除（替换 'user-id-here' 为实际的用户 ID）
SELECT delete_user_completely('user-id-here'::uuid);

-- 4. 验证删除结果
SELECT id, email FROM auth.users WHERE email = 'test-delete@example.com';
SELECT id, email FROM profiles WHERE email = 'test-delete@example.com';
-- 以上两个查询应该都返回空结果
*/


-- ================================================================
-- 使用建议
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '使用建议';
  RAISE NOTICE '====================================';
  RAISE NOTICE '1. 定期（例如每月）运行第一步的检查查询';
  RAISE NOTICE '2. 如果发现不一致，分析原因后再执行修复';
  RAISE NOTICE '3. 确保前端使用 delete_user_completely() 函数删除用户';
  RAISE NOTICE '4. 考虑使用软删除（is_active=false）代替硬删除';
  RAISE NOTICE '5. 在修复前务必备份重要数据';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 脚本执行完毕！';
END $$;
