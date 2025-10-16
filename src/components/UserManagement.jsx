import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './UserManagement.css'

export default function UserManagement() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(true) // 添加角色加载状态
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchUsers()
    getCurrentUserRole()
  }, [])

  const getCurrentUserRole = async () => {
    try {
      setRoleLoading(true) // 开始加载
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        setCurrentUserRole(data?.role)
      }
    } catch (error) {
      console.error('获取用户角色失败:', error)
    } finally {
      setRoleLoading(false) // 加载完成
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      setError('获取用户列表失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId, newRole) => {
    try {
      setError('')
      setSuccess('')

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      setSuccess('角色更新成功！')
      fetchUsers()
    } catch (error) {
      setError('更新失败：' + error.message)
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      setError('')
      setSuccess('')

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      setSuccess('用户状态更新成功！')
      fetchUsers()
    } catch (error) {
      setError('更新失败：' + error.message)
    }
  }

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'badge-admin'
      case 'manager':
        return 'badge-manager'
      default:
        return 'badge-user'
    }
  }

  const getRoleText = (role) => {
    switch (role) {
      case 'admin':
        return '管理员'
      case 'manager':
        return '经理'
      default:
        return '普通用户'
    }
  }

  // 角色加载中，显示加载状态
  if (roleLoading) {
    return (
      <div className="user-management">
        <div className="loading">正在验证权限...</div>
      </div>
    )
  }

  // 只有管理员可以访问此页面
  if (currentUserRole !== 'admin') {
    return (
      <div className="user-management">
        <div className="access-denied">
          <h2>⛔ 访问被拒绝</h2>
          <p>只有管理员可以访问用户管理页面</p>
          <button onClick={() => navigate('/')} className="btn-back">
            返回首页
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="user-management">
      <button className="back-button" onClick={() => navigate('/')}>
        ← 返回首页
      </button>
      
      <div className="management-header">
        <h1>👥 用户管理</h1>
        <p className="subtitle">管理系统用户和权限</p>
      </div>

      {error && (
        <div className="message error-message">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="message success-message">
          ✅ {success}
        </div>
      )}

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-number">{users.length}</div>
          <div className="stat-label">总用户数</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {users.filter(u => u.is_active).length}
          </div>
          <div className="stat-label">激活用户</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {users.filter(u => u.role === 'admin').length}
          </div>
          <div className="stat-label">管理员</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {users.filter(u => u.role === 'manager').length}
          </div>
          <div className="stat-label">经理</div>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>邮箱</th>
              <th>姓名</th>
              <th>角色</th>
              <th>部门</th>
              <th>状态</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={!user.is_active ? 'inactive-row' : ''}>
                <td>{user.email}</td>
                <td>{user.full_name || '-'}</td>
                <td>
                  <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                    {getRoleText(user.role)}
                  </span>
                </td>
                <td>{user.department || '-'}</td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? '激活' : '停用'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
                <td>
                  <div className="action-buttons">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="role-select"
                      disabled={user.id === (supabase.auth.getUser().then(u => u.data?.user?.id))}
                    >
                      <option value="user">普通用户</option>
                      <option value="manager">经理</option>
                      <option value="admin">管理员</option>
                    </select>
                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className={`btn-toggle ${user.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                    >
                      {user.is_active ? '停用' : '激活'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="empty-state">
          <p>暂无用户数据</p>
        </div>
      )}
    </div>
  )
}

