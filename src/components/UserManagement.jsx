import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './UserManagement.css'

export default function UserManagement() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pendingRoleChanges, setPendingRoleChanges] = useState({})
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserUsername, setNewUserUsername] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('user')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editUsername, setEditUsername] = useState('')

  useEffect(() => {
    fetchUsers()
    getCurrentUserRole()
  }, [])

  const getCurrentUserRole = async () => {
    try {
      setRoleLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
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
      setRoleLoading(false)
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
      
      // 过滤掉可能的空记录或已删除的用户
      const validUsers = (data || []).filter(user => user.email && user.id)
      setUsers(validUsers)
    } catch (error) {
      setError('获取用户列表失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 处理角色选择变化（不立即保存）
  const handleRoleChange = (userId, newRole) => {
    setPendingRoleChanges({
      ...pendingRoleChanges,
      [userId]: newRole
    })
  }

  // 确认角色更改
  const confirmRoleChange = async (userId) => {
    const newRole = pendingRoleChanges[userId]
    if (!newRole) return

    try {
      setError('')
      setSuccess('')

      // 检查是否是当前用户降低自己的权限
      const isSelfDemotion = userId === currentUserId && 
        (newRole === 'user' || newRole === 'manager') && 
        currentUserRole === 'admin'

      if (isSelfDemotion) {
        if (!window.confirm('警告：您正在降低自己的权限！\n\n降级后您将无法访问用户管理页面，并会自动返回首页。\n\n确定要继续吗？')) {
          // 取消更改
          const newPending = { ...pendingRoleChanges }
          delete newPending[userId]
          setPendingRoleChanges(newPending)
          return
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      // 清除待确认状态
      const newPending = { ...pendingRoleChanges }
      delete newPending[userId]
      setPendingRoleChanges(newPending)

      setSuccess('角色更新成功！')
      await fetchUsers()

      // 如果是自己降级，跳转到首页
      if (isSelfDemotion) {
        setTimeout(() => {
          navigate('/')
        }, 1500)
      }
    } catch (error) {
      setError('更新失败：' + error.message)
    }
  }

  // 取消角色更改
  const cancelRoleChange = (userId) => {
    const newPending = { ...pendingRoleChanges }
    delete newPending[userId]
    setPendingRoleChanges(newPending)
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

  const handleDeleteUser = async (userId, userEmail) => {
    try {
      setError('')
      setSuccess('')

      // 防止删除自己
      if (userId === currentUserId) {
        setError('不能删除当前登录的用户！')
        return
      }

      const user = users.find(u => u.id === userId)
      // 二次确认
      const confirmed = window.confirm(
        `⚠️ 警告：此操作不可撤销！\n\n确定要删除用户 "${user?.username || userEmail}" 吗？\n\n删除后该用户将无法登录系统。`
      )

      if (!confirmed) return

      // 从profiles表删除用户
      const { error, count } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
        .select()

      if (error) {
        console.error('删除错误详情:', error)
        throw error
      }

      // 验证删除是否成功 - 立即从state中移除该用户
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId))
      
      setSuccess(`用户"${user?.username || userEmail}"已成功删除！`)
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (error) {
      console.error('删除用户失败:', error)
      setError('删除失败：' + error.message)
      // 如果删除失败，刷新列表以恢复正确状态
      await fetchUsers()
    }
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setEditUsername(user.username || '')
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    try {
      setError('')
      setSuccess('')

      // 验证用户名
      if (!editUsername || editUsername.trim().length < 2) {
        throw new Error('用户名至少需要2个字符')
      }

      // 检查用户名是否与其他用户重复
      if (editUsername.trim() !== editingUser.username) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', editUsername.trim())
          .neq('id', editingUser.id)
          .single()

        if (existingUser) {
          throw new Error('用户名已存在，请使用其他用户名')
        }
      }

      // 更新profiles表
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: editUsername.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id)

      if (profileError) throw profileError

      setSuccess(`用户"${editUsername.trim()}"的信息已更新！`)
      setShowEditModal(false)
      setEditingUser(null)
      await fetchUsers()
    } catch (error) {
      setError('更新失败：' + error.message)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (newUserPassword.length < 6) {
        throw new Error('密码至少需要6个字符')
      }

      if (!newUserUsername || newUserUsername.trim().length < 2) {
        throw new Error('用户名至少需要2个字符')
      }

      // 检查用户名是否已存在
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', newUserUsername.trim())
        .single()

      if (existingUser) {
        throw new Error('用户名已存在，请使用其他用户名')
      }

      // 创建新用户
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          emailRedirectTo: window.location.origin,
        }
      })

      if (error) throw error

      // 更新用户角色和用户名
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            role: newUserRole,
            username: newUserUsername.trim()
          })
          .eq('id', data.user.id)

        if (profileError) throw profileError
      }

      setSuccess('用户创建成功！')
      setShowCreateUser(false)
      setNewUserEmail('')
      setNewUserUsername('')
      setNewUserPassword('')
      setNewUserRole('user')
      
      // 刷新用户列表
      setTimeout(() => {
        fetchUsers()
      }, 1000)
    } catch (error) {
      setError('创建失败：' + error.message)
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
      <button className="back-button-top" onClick={() => navigate('/')}>
        ← 返回首页
      </button>
      
      <div className="management-content">
        <div className="management-header">
          <div className="management-icon">👥</div>
          <h1>用户管理</h1>
          <p className="subtitle">管理系统用户和权限</p>
          
          <div className="header-content">
            <button 
              className="btn-create-user"
              onClick={() => setShowCreateUser(true)}
            >
              ➕ 创建新用户
            </button>
          </div>
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
              <th>用户名</th>
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
                <td><strong>{user.username || '-'}</strong></td>
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
                      value={pendingRoleChanges[user.id] || user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="role-select"
                      disabled={user.id === currentUserId}
                    >
                      <option value="user">普通用户</option>
                      <option value="manager">经理</option>
                      <option value="admin">管理员</option>
                    </select>
                    {pendingRoleChanges[user.id] && pendingRoleChanges[user.id] !== user.role && (
                      <div className="confirm-buttons">
                        <button
                          onClick={() => confirmRoleChange(user.id)}
                          className="btn-confirm"
                          title="确认更改"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => cancelRoleChange(user.id)}
                          className="btn-cancel"
                          title="取消更改"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className={`btn-toggle ${user.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                      disabled={user.id === currentUserId}
                    >
                      {user.is_active ? '停用' : '激活'}
                    </button>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="btn-edit"
                      title="编辑用户名"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="btn-delete"
                      disabled={user.id === currentUserId}
                      title={user.id === currentUserId ? '不能删除自己' : '删除用户'}
                    >
                      🗑️
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

      {/* 编辑用户弹窗 */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>编辑用户信息</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleSaveEdit()
            }}>
              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  style={{background: '#f5f5f5', cursor: 'not-allowed', color: '#999'}}
                />
                <small style={{color: '#999', fontSize: '0.85em'}}>
                  ℹ️ 邮箱不可修改，如需更改请删除用户后重新创建
                </small>
              </div>
              <div className="form-group">
                <label>用户名</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="请输入用户名"
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-submit">
                  保存
                </button>
                <button 
                  type="button" 
                  className="btn-cancel-modal"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingUser(null)
                  }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 创建用户弹窗 */}
      {showCreateUser && (
        <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>创建新用户</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="请输入用户邮箱"
                  required
                />
              </div>
              <div className="form-group">
                <label>用户名</label>
                <input
                  type="text"
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  placeholder="请输入用户名（至少2位）"
                  required
                  minLength={2}
                  maxLength={50}
                />
                <small style={{color: '#666', fontSize: '0.85em'}}>
                  用户名用于系统显示，不能重复
                </small>
              </div>
              <div className="form-group">
                <label>初始密码</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="请输入初始密码（至少6位）"
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>角色</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="role-select-modal"
                >
                  <option value="user">普通用户</option>
                  <option value="manager">经理</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-submit">
                  创建
                </button>
                <button 
                  type="button" 
                  className="btn-cancel-modal"
                  onClick={() => {
                    setShowCreateUser(false)
                    setNewUserEmail('')
                    setNewUserUsername('')
                    setNewUserPassword('')
                    setNewUserRole('user')
                  }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

