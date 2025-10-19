import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useLanguage } from '../contexts/LanguageContext'
import { useCity } from '../contexts/CityContext'
import './UserManagement.css'

export default function UserManagement() {
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const { availableCities, isSuperAdmin } = useCity()
  const cityOptions = availableCities // 使用 availableCities 别名
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
  const [newUserCities, setNewUserCities] = useState(['MIA']) // 新用户默认 MIA
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editUsername, setEditUsername] = useState('')
  const [editCities, setEditCities] = useState([]) // 编辑用户城市权限
  const [showCityModal, setShowCityModal] = useState(false)
  const [cityEditUser, setCityEditUser] = useState(null)
  const [showRoleModal, setShowRoleModal] = useState(false) // 角色编辑模态框
  const [roleEditUser, setRoleEditUser] = useState(null) // 正在编辑角色的用户
  const [selectedRole, setSelectedRole] = useState('') // 选择的角色

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
      setError(t('messages.loadingFailed') + ': ' + error.message)
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
        (currentUserRole === 'admin' || currentUserRole === 'super_admin')

      if (isSelfDemotion) {
        if (!window.confirm(t('userManagement.demoteWarning'))) {
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

      setSuccess(t('userManagement.roleUpdated') + '!')
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

  // 打开角色编辑模态框
  const handleEditRole = (user) => {
    if (user.id === currentUserId) return // 不能编辑自己的角色
    setRoleEditUser(user)
    setSelectedRole(user.role)
    setShowRoleModal(true)
  }

  // 保存角色更改
  const handleSaveRole = async () => {
    if (!roleEditUser || !selectedRole) return
    
    try {
      setError('')
      setSuccess('')

      // 检查是否是当前用户降低自己的权限（理论上不会发生，但保留检查）
      const isSelfDemotion = roleEditUser.id === currentUserId && 
        (selectedRole === 'user' || selectedRole === 'manager') && 
        (currentUserRole === 'admin' || currentUserRole === 'super_admin')

      if (isSelfDemotion) {
        if (!window.confirm(t('userManagement.demoteWarning'))) {
          setShowRoleModal(false)
          return
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole, updated_at: new Date().toISOString() })
        .eq('id', roleEditUser.id)

      if (error) throw error

      setSuccess(t('userManagement.roleUpdated') + '!')
      setShowRoleModal(false)
      setRoleEditUser(null)
      setSelectedRole('')
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

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      setError('')
      setSuccess('')

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      setSuccess(t('userManagement.statusUpdated') + '!')
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
        setError(t('userManagement.cannotDeleteSelf') + '!')
        return
      }

      const user = users.find(u => u.id === userId)
      // 二次确认
      const confirmed = window.confirm(
        `⚠️ ${t('userManagement.deleteWarning')}\n\n${t('userManagement.deleteConfirm')} "${user?.username || userEmail}"?\n\n${t('messages.actionCannotUndo')}`
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
      
      setSuccess(`${t('userManagement.userDeleted')}: "${user?.username || userEmail}"!`)
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess('')
      }, 3000)
    } catch (error) {
      console.error('删除用户失败:', error)
      setError(t('messages.deleteFailed') + ': ' + error.message)
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
        throw new Error(t('userManagement.usernameMinLength'))
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
          throw new Error(t('userManagement.userExists'))
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

      setSuccess(`${t('userManagement.userUpdated')}: "${editUsername.trim()}"!`)
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
        throw new Error(t('auth.passwordTooShort'))
      }

      if (!newUserUsername || newUserUsername.trim().length < 2) {
        throw new Error(t('userManagement.usernameMinLength'))
      }

      // 检查用户名是否已存在
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', newUserUsername.trim())
        .single()

      if (existingUser) {
        throw new Error(t('userManagement.userExists'))
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

      // 更新用户角色、用户名和城市权限
      if (data.user) {
        // 根据角色设置城市权限
        const cities = newUserRole === 'super_admin' 
          ? ['MIA', 'WPB', 'FTM', 'MCO', 'TPA']  // super_admin 所有城市
          : newUserCities  // 其他角色使用选择的城市

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            role: newUserRole,
            username: newUserUsername.trim(),
            cities: cities,
            current_city: cities[0] || 'MIA'
          })
          .eq('id', data.user.id)

        if (profileError) throw profileError
      }

      setSuccess(t('userManagement.userCreated') + '!')
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
      setError(t('messages.createFailed') + ': ' + error.message)
    }
  }

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'super_admin':
        return 'badge-super-admin'
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
      case 'super_admin':
        return t('roles.super_admin')
      case 'admin':
        return t('roles.admin')
      case 'manager':
        return t('roles.manager')
      default:
        return t('roles.user')
    }
  }
  
  // 获取城市名称列表
  const getCityNames = (cities) => {
    if (!cities || cities.length === 0) return t('city.noCityAccess')
    return cities.map(code => {
      const city = cityOptions.find(c => c.code === code)
      // 中文环境显示中文名称，英文环境显示城市代号
      if (language === 'zh') {
        return city ? city.nameZh : code
      } else {
        return city ? city.code : code
      }
    }).join(', ')
  }
  
  // 打开城市编辑 modal
  const handleEditCities = (user) => {
    setCityEditUser(user)
    setEditCities(user.cities || [])
    setShowCityModal(true)
  }
  
  // 保存城市权限
  const handleSaveCities = async () => {
    if (!cityEditUser) return
    
    try {
      setError('')
      setSuccess('')
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          cities: editCities, 
          current_city: editCities.length > 0 ? editCities[0] : null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', cityEditUser.id)
      
      if (error) throw error
      
      setSuccess(t('city.cityPermissions') + ' ' + t('messages.updateSuccess'))
      setShowCityModal(false)
      await fetchUsers()
    } catch (error) {
      setError(t('messages.updateFailed') + ': ' + error.message)
    }
  }
  
  // 切换城市选择
  const toggleCitySelection = (cityCode) => {
    setEditCities(prev => {
      if (prev.includes(cityCode)) {
        return prev.filter(c => c !== cityCode)
      } else {
        return [...prev, cityCode]
      }
    })
  }

  // 角色加载中，显示加载状态
  if (roleLoading) {
    return (
      <div className="user-management">
        <div className="loading">{t('common.loading')}</div>
      </div>
    )
  }

  // 只有管理员和超级管理员可以访问此页面
  if (currentUserRole !== 'admin' && currentUserRole !== 'super_admin') {
    return (
      <div className="user-management">
        <div className="access-denied">
          <h2>⛔ {t('userManagement.accessDenied')}</h2>
          <p>{t('userManagement.adminOnly')}</p>
          <button onClick={() => navigate('/')} className="btn-back">
            {t('common.back')}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="user-management">
      <button className="back-button-top" onClick={() => navigate('/')}>
        ← {t('common.back')}
      </button>
      
      <div className="management-content">
        <div className="management-header">
          <div className="management-icon">👥</div>
          <h1>{t('userManagement.title')}</h1>
          <p className="subtitle">{t('userManagement.subtitle')}</p>
          
          <div className="header-content">
            <button 
              className="btn-create-user"
              onClick={() => setShowCreateUser(true)}
            >
              ➕ {t('userManagement.createUser')}
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
          <div className="stat-label">{t('userManagement.totalUsers')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {users.filter(u => u.is_active).length}
          </div>
          <div className="stat-label">{t('userManagement.activeUsers')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {users.filter(u => u.role === 'admin').length}
          </div>
          <div className="stat-label">{t('userManagement.admins')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            {users.filter(u => u.role === 'manager').length}
          </div>
          <div className="stat-label">{t('userManagement.managers')}</div>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>{t('auth.email')}</th>
              <th>{t('userManagement.username')}</th>
              <th>{t('roles.role')}</th>
              {isSuperAdmin && <th>{t('city.cityPermissions')}</th>}
              <th>{t('userManagement.status')}</th>
              <th>{t('userManagement.registrationDate')}</th>
              <th>{t('userManagement.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={!user.is_active ? 'inactive-row' : ''}>
                <td>{user.email}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>{user.username || '-'}</strong>
                    <button
                      onClick={() => handleEditUser(user)}
                      className="btn-icon"
                      title={t('common.edit')}
                    >
                      ✏️
                    </button>
                  </div>
                </td>
                <td>
                  <button 
                    className={`role-badge ${getRoleBadgeClass(user.role)} ${user.id !== currentUserId ? 'clickable' : ''}`}
                    onClick={() => user.id !== currentUserId && handleEditRole(user)}
                    title={user.id !== currentUserId ? t('userManagement.clickToChangeRole') : ''}
                    disabled={user.id === currentUserId}
                  >
                    {getRoleText(user.role)}
                  </button>
                </td>
                {isSuperAdmin && (
                  <td>
                    <button 
                      className="city-permissions-btn" 
                      onClick={() => handleEditCities(user)}
                      title={t('city.clickToAssignCities')}
                    >
                      {getCityNames(user.cities) || t('city.noCities')}
                    </button>
                  </td>
                )}
                <td>
                  <span 
                    className={`status-badge ${user.is_active ? 'active' : 'inactive'} ${user.id !== currentUserId ? 'clickable' : ''}`}
                    onClick={() => user.id !== currentUserId && toggleUserStatus(user.id, user.is_active)}
                    title={user.id !== currentUserId ? t('userManagement.clickToToggleStatus') : ''}
                  >
                    {user.is_active ? t('userManagement.active') : t('userManagement.inactive')}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
                <td>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.email)}
                    className="btn-delete-icon"
                    disabled={user.id === currentUserId}
                    title={user.id === currentUserId ? t('userManagement.cannotDeleteSelf') : t('userManagement.deleteUser')}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        {users.length === 0 && (
          <div className="empty-state">
            <p>{t('messages.loadingFailed')}</p>
          </div>
        )}
      </div>

      {/* 编辑用户弹窗 */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('userManagement.editUser')}</h2>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleSaveEdit()
            }}>
              <div className="form-group">
                <label>{t('auth.email')}</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  style={{background: '#f5f5f5', cursor: 'not-allowed', color: '#999'}}
                />
                <small style={{color: '#999', fontSize: '0.85em'}}>
                  ℹ️ {t('userManagement.emailCannotChange')}
                </small>
              </div>
              <div className="form-group">
                <label>{t('userManagement.username')}</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder={t('userManagement.enterUsername')}
                  required
                  minLength={2}
                  maxLength={50}
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-submit">
                  {t('common.save')}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel-modal"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingUser(null)
                  }}
                >
                  {t('common.cancel')}
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
            <h2>{t('userManagement.createUser')}</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>{t('auth.email')}</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder={t('auth.enterEmail')}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('userManagement.username')}</label>
                <input
                  type="text"
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  placeholder={t('userManagement.enterUsername')}
                  required
                  minLength={2}
                  maxLength={50}
                />
                <small style={{color: '#666', fontSize: '0.85em'}}>
                  {t('userManagement.usernameForDisplay')}
                </small>
              </div>
              <div className="form-group">
                <label>{t('userManagement.initialPassword')}</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder={t('userManagement.enterInitialPassword')}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>{t('roles.role')}</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="role-select-modal"
                >
                  <option value="user">{t('roles.user')}</option>
                  <option value="manager">{t('roles.manager')}</option>
                  <option value="admin">{t('roles.admin')}</option>
                  {currentUserRole === 'super_admin' && (
                    <option value="super_admin">{t('roles.super_admin')}</option>
                  )}
                </select>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn-submit">
                  {t('common.submit')}
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
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 角色编辑弹窗 */}
      {showRoleModal && roleEditUser && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('userManagement.editUser')} - {roleEditUser.username}</h2>
            <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f7ff', borderRadius: '6px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                {t('userManagement.clickToChangeRole')}
              </p>
            </div>
            <div className="form-group">
              <label>{t('roles.role')}</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="role-select-modal"
              >
                <option value="user">{t('roles.user')}</option>
                <option value="manager">{t('roles.manager')}</option>
                <option value="admin">{t('roles.admin')}</option>
                {currentUserRole === 'super_admin' && (
                  <option value="super_admin">{t('roles.super_admin')}</option>
                )}
              </select>
            </div>
            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-submit"
                onClick={handleSaveRole}
              >
                {t('common.save')}
              </button>
              <button 
                type="button" 
                className="btn-cancel-modal"
                onClick={() => {
                  setShowRoleModal(false)
                  setRoleEditUser(null)
                  setSelectedRole('')
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 城市权限编辑弹窗 */}
      {showCityModal && cityEditUser && (
        <div className="modal-overlay" onClick={() => setShowCityModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('city.assignCities')} - {cityEditUser.username}</h2>
            <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f7ff', borderRadius: '6px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                {t('city.selectCities')}
              </p>
            </div>
            <div style={{ display: 'grid', gap: '10px' }}>
              {cityOptions.map(city => (
                <label 
                  key={city.code} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '12px', 
                    border: '2px solid', 
                    borderColor: editCities.includes(city.code) ? '#667eea' : '#e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: editCities.includes(city.code) ? '#f0f7ff' : 'white',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input 
                    type="checkbox" 
                    checked={editCities.includes(city.code)}
                    onChange={() => toggleCitySelection(city.code)}
                    style={{ marginRight: '10px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '16px', fontWeight: editCities.includes(city.code) ? '600' : '400' }}>
                    {city.nameZh} ({city.code})
                  </span>
                </label>
              ))}
            </div>
            <div className="modal-buttons" style={{ marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-submit"
                onClick={handleSaveCities}
                disabled={editCities.length === 0}
              >
                {t('common.save')}
              </button>
              <button 
                type="button" 
                className="btn-cancel-modal"
                onClick={() => {
                  setShowCityModal(false)
                  setCityEditUser(null)
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

