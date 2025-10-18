import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getAllPackages, updatePackage, deletePackage } from '../services/dataService'
import { useLanguage } from '../contexts/LanguageContext'
import { useCity } from '../contexts/CityContext'
import './CenterReturnManagement.css'

function CenterReturnManagement() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { currentCity } = useCity()
  const [packages, setPackages] = useState([])
  const [filteredPackages, setFilteredPackages] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [selectedPackages, setSelectedPackages] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [notification, setNotification] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [currentPackage, setCurrentPackage] = useState(null)
  const [isOnline, setIsOnline] = useState(true)
  const [userRole, setUserRole] = useState(null)  // 用户角色
  const [timeFilter, setTimeFilter] = useState({
    type: 'shelving',  // 默认选中"上架时间"
    startDate: '',
    endDate: ''
  })
  const [appliedTimeFilter, setAppliedTimeFilter] = useState({
    type: 'shelving',
    startDate: '',
    endDate: ''
  })
  const [locationFilter, setLocationFilter] = useState('')  // 库位筛选
  const [availableLocations, setAvailableLocations] = useState([])  // 可用库位列表

  // 从 Supabase 加载包裹数据（城市过滤）
  useEffect(() => {
    if (currentCity) {
      loadPackages()
      loadUserRole()
    }
  }, [currentCity])

  // 🔄 实时监听包裹变化（城市过滤）
  useEffect(() => {
    if (!currentCity) return

    const subscription = supabase
      .channel(`packages-center-return-${currentCity}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages',
          filter: `city=eq.${currentCity}` // 只监听当前城市的包裹
        },
        async (payload) => {
          console.log('📦 包裹数据变化（中心退回管理）：', payload)
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // 重新加载完整数据以获取用户名
            await loadPackages()
          } else if (payload.eventType === 'DELETE') {
            // 包裹删除
            setPackages(prev => prev.filter(p => p.id !== payload.old.id))
            setSelectedPackages(prev => prev.filter(id => id !== payload.old.id))
          }
        }
      )
      .subscribe((status) => {
        console.log('🔗 中心退回管理订阅状态：', status)
        setIsOnline(status === 'SUBSCRIBED')
      })

    return () => subscription.unsubscribe()
  }, [currentCity])

  const loadUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile) {
          setUserRole(profile.role)
        }
      }
    } catch (error) {
      console.error('Error loading user role:', error)
    }
  }

  const loadPackages = async () => {
    try {
      // 先获取所有包裹（城市过滤）
      const { data: allPackages, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('city', currentCity) // 添加城市过滤
        .order('created_at', { ascending: false })

      if (packagesError) throw packagesError

      // 获取所有唯一的用户ID
      const userIds = [...new Set(allPackages.map(pkg => pkg.last_modified_by).filter(Boolean))]
      
      // 批量获取用户信息
      let userMap = {}
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', userIds)
        
        if (!profilesError && profiles) {
          userMap = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile
            return acc
          }, {})
        }
      }

      // 格式化时间字段和用户名
      const packagesWithFormattedTime = (allPackages || []).map(pkg => {
        const userProfile = pkg.last_modified_by ? userMap[pkg.last_modified_by] : null
        
        return {
          ...pkg,
          last_modified_by_username: userProfile?.username || userProfile?.email || '-',
          shelving_time_display: pkg.shelving_time ? new Date(pkg.shelving_time).toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
          }).replace(/\//g, '-') : '-',
          unshelving_time_display: pkg.unshelving_time ? new Date(pkg.unshelving_time).toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
          }).replace(/\//g, '-') : '-',
          instruction_time_display: pkg.instruction_time ? new Date(pkg.instruction_time).toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
          }).replace(/\//g, '-') : '-'
        }
      })
      
      setPackages(packagesWithFormattedTime)
      
      // 提取所有唯一的库位号
      const locations = [...new Set(packagesWithFormattedTime.map(pkg => pkg.location).filter(Boolean))]
      setAvailableLocations(locations.sort())
      
      filterPackages(packagesWithFormattedTime, activeTab, searchQuery)
    } catch (error) {
      console.error('Error loading packages:', error)
      showNotification(t('messages.loadingFailed'), 'error')
    }
  }

  const filterPackages = (pkgs, tab, query) => {
    let filtered = pkgs

    // 按标签页过滤（新的状态维度）
    switch (tab) {
      case 'in-warehouse':
        filtered = pkgs.filter(pkg => (pkg.package_status || pkg.packageStatus) === 'in-warehouse')
        break
      case 'pending-removal':
        filtered = pkgs.filter(pkg => (pkg.package_status || pkg.packageStatus) === 'pending-removal')
        break
      case 'removed':
        filtered = pkgs.filter(pkg => (pkg.package_status || pkg.packageStatus) === 'removed')
        break
      case 're-dispatch':
        filtered = pkgs.filter(pkg => (pkg.customer_service || pkg.customerService) === 're-dispatch')
        break
      case 're-dispatch-new-label':
        filtered = pkgs.filter(pkg => (pkg.customer_service || pkg.customerService) === 're-dispatch-new-label')
        break
      case 'return-to-customer':
        filtered = pkgs.filter(pkg => (pkg.customer_service || pkg.customerService) === 'return-to-customer')
        break
      default:
        filtered = pkgs
    }

    // 按搜索关键词过滤
    if (query.trim()) {
      filtered = filtered.filter(pkg => {
        const packageNum = pkg.package_number || pkg.packageNumber
        return packageNum.toLowerCase().includes(query.toLowerCase()) ||
          (pkg.location && pkg.location.toLowerCase().includes(query.toLowerCase()))
      })
    }

    // 按库位筛选
    if (locationFilter) {
      filtered = filtered.filter(pkg => pkg.location === locationFilter)
    }

    // 按时间过滤（使用 appliedTimeFilter）
    if (appliedTimeFilter.type && appliedTimeFilter.startDate && appliedTimeFilter.endDate) {
      const startTime = new Date(appliedTimeFilter.startDate).getTime()
      const endTime = new Date(appliedTimeFilter.endDate).getTime() + 86400000 // 加一天包含结束日期

      filtered = filtered.filter(pkg => {
        let targetTime = null
        switch (appliedTimeFilter.type) {
          case 'shelving':
            targetTime = (pkg.shelving_time || pkg.shelvingTime) ? new Date(pkg.shelving_time || pkg.shelvingTime).getTime() : null
            break
          case 'unshelving':
            targetTime = (pkg.unshelving_time || pkg.unshelvingTime) ? new Date(pkg.unshelving_time || pkg.unshelvingTime).getTime() : null
            break
          case 'instruction':
            targetTime = (pkg.instruction_time || pkg.instructionTime) ? new Date(pkg.instruction_time || pkg.instructionTime).getTime() : null
            break
          default:
            return true
        }
        return targetTime && targetTime >= startTime && targetTime <= endTime
      })
    }

    setFilteredPackages(filtered)
  }

  useEffect(() => {
    filterPackages(packages, activeTab, searchQuery)
  }, [activeTab, searchQuery, packages, appliedTimeFilter, locationFilter])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSelectedPackages([])
  }

  const handleSelectPackage = (id) => {
    setSelectedPackages(prev => {
      if (prev.includes(id)) {
        return prev.filter(pid => pid !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedPackages.length === filteredPackages.length) {
      setSelectedPackages([])
    } else {
      setSelectedPackages(filteredPackages.map(pkg => pkg.id))
    }
  }

  const handleUpdateInstruction = async (instruction, instructionLabel) => {
    if (selectedPackages.length === 0) {
      showNotification(t('centerReturn.selectPackagesFirst'), 'error')
      return
    }

    try {
      // 批量更新到 Supabase（使用正确的字段名：snake_case）
      const updatePromises = selectedPackages.map(pkgId => 
        updatePackage(pkgId, {
          customer_service: instruction,        // 修复：使用 snake_case
          package_status: 'pending-removal',    // 修复：使用 snake_case
          instruction_time: new Date().toISOString()  // 添加指令时间
        })
      )
      
      await Promise.all(updatePromises)
      
      // 重新加载数据
      await loadPackages()
      setSelectedPackages([])
      setShowActionModal(false)
      showNotification(t('centerReturn.instructionIssued', { count: selectedPackages.length, instruction: instructionLabel }), 'success')
    } catch (error) {
      console.error('Error updating packages:', error)
      showNotification(t('messages.updateFailed') + ': ' + error.message, 'error')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedPackages.length === 0) {
      showNotification(t('centerReturn.selectPackagesFirst'), 'error')
      return
    }

    // 删除操作需要二次确认
    if (window.confirm(t('centerReturn.deleteConfirm', { count: selectedPackages.length }) + '\n\n' + t('messages.actionCannotUndo'))) {
      try {
        // 批量删除
        const deletePromises = selectedPackages.map(pkgId => deletePackage(pkgId))
        await Promise.all(deletePromises)
        
        // 重新加载数据
        await loadPackages()
        showNotification(t('centerReturn.packagesDeleted', { count: selectedPackages.length }), 'success')
        setSelectedPackages([])
      } catch (error) {
        console.error('Error deleting packages:', error)
        showNotification(t('messages.deleteFailed') + ': ' + error.message, 'error')
      }
    }
  }

  const handleExportData = () => {
    if (selectedPackages.length === 0) {
      showNotification(t('centerReturn.selectPackagesFirst'), 'error')
      return
    }

    // 获取选中的包裹数据
    const selectedData = packages.filter(pkg => selectedPackages.includes(pkg.id))

    // CSV 表头（所有列）
    const headers = [
      t('centerReturn.packageNumber'),
      t('centerReturn.location'),
      t('centerReturn.packageStatus'),
      t('centerReturn.customerService'),
      t('centerReturn.shelvingTime'),
      t('centerReturn.instructionTime'),
      t('centerReturn.unshelvingTime'),
      t('centerReturn.lastOperator')
    ]

    // 状态和指令的映射
    const statusMap = {
      'in-warehouse': t('packageStatus.in-warehouse'),
      'pending-removal': t('packageStatus.pending-removal'),
      'removed': t('packageStatus.removed')
    }

    const instructionMap = {
      're-dispatch': t('customerService.re-dispatch'),
      're-dispatch-new-label': t('customerService.re-dispatch-new-label'),
      'return-to-customer': t('customerService.return-to-customer')
    }

    // 生成CSV内容
    const rows = selectedData.map(pkg => [
      pkg.package_number || pkg.packageNumber || '',
      pkg.location || '',
      statusMap[pkg.package_status || pkg.packageStatus] || '',
      instructionMap[pkg.customer_service || pkg.customerService] || '',
      pkg.shelving_time_display || pkg.shelvingTimeDisplay || '',
      pkg.instruction_time_display || pkg.instructionTimeDisplay || '',
      pkg.unshelving_time_display || pkg.unshelvingTimeDisplay || '',
      pkg.last_modified_by_username || '-'
    ])

    // 组合CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // 下载文件
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${t('centerReturn.packageData')}_${new Date().toLocaleDateString('zh-CN')}_${Date.now()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showNotification(t('centerReturn.dataExported', { count: selectedPackages.length }), 'success')
  }

  const handleUpdatePackage = async (updates) => {
    try {
      // 获取当前用户ID
      const { data: { user } } = await supabase.auth.getUser()
      
      // 更新到 Supabase，添加操作用户信息
      await updatePackage(currentPackage.id, {
        ...updates,
        last_modified_by: user?.id,
        last_modified_at: new Date().toISOString()
      })
      
      // 重新加载数据
      await loadPackages()
      setCurrentPackage(null)
      setShowManageModal(false)
      showNotification(t('centerReturn.packageUpdated'), 'success')
    } catch (error) {
      console.error('Error updating package:', error)
      showNotification(t('messages.updateFailed') + ': ' + error.message, 'error')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'in-warehouse': { label: t('packageStatus.in-warehouse'), color: '#4CAF50' },
      'pending-removal': { label: t('packageStatus.pending-removal'), color: '#FF9800' },
      'removed': { label: t('packageStatus.removed'), color: '#999' }
    }
    const config = statusConfig[status] || { label: t('packageStatus.unknown'), color: '#999' }
    return (
      <span className="status-badge" style={{ backgroundColor: config.color }}>
        {config.label}
      </span>
    )
  }

  const getInstructionBadge = (instruction) => {
    if (!instruction) return <span className="instruction-badge empty">-</span>
    
    const instructionConfig = {
      're-dispatch': { label: t('customerService.re-dispatch'), color: '#9C27B0' },
      're-dispatch-new-label': { label: t('customerService.re-dispatch-new-label'), color: '#75D025' },
      'return-to-customer': { label: t('customerService.return-to-customer'), color: '#F44336' }
    }
    const config = instructionConfig[instruction] || { label: t('packageStatus.unknown'), color: '#999' }
    return (
      <span className="instruction-badge" style={{ backgroundColor: config.color }}>
        {config.label}
      </span>
    )
  }

  const getTabCount = (tab) => {
    switch (tab) {
      case 'all':
        return packages.length
      case 'in-warehouse':
        return packages.filter(pkg => (pkg.package_status || pkg.packageStatus) === 'in-warehouse').length
      case 'pending-removal':
        return packages.filter(pkg => (pkg.package_status || pkg.packageStatus) === 'pending-removal').length
      case 'removed':
        return packages.filter(pkg => (pkg.package_status || pkg.packageStatus) === 'removed').length
      case 're-dispatch':
        return packages.filter(pkg => (pkg.customer_service || pkg.customerService) === 're-dispatch').length
      case 're-dispatch-new-label':
        return packages.filter(pkg => (pkg.customer_service || pkg.customerService) === 're-dispatch-new-label').length
      case 'return-to-customer':
        return packages.filter(pkg => (pkg.customer_service || pkg.customerService) === 'return-to-customer').length
      default:
        return 0
    }
  }

  return (
    <div className="center-return-page">
      {/* 离线指示器 */}
      {!isOnline && (
        <div className="offline-indicator">
          ⚠️ {t('messages.reconnecting')}
        </div>
      )}

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="center-return-container">
        <button className="back-button" onClick={() => navigate('/return-dashboard')}>
          ← {t('locationManagement.backToDashboard')}
        </button>

        <div className="center-header">
          <div className="header-icon">📊</div>
          <h1>{t('centerReturn.title')}</h1>
          <p>{t('centerReturn.subtitle')}</p>
        </div>

        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder={t('centerReturn.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-section">
          <div className="filter-label">{t('centerReturn.locationFilter')}:</div>
          <select
            className="filter-select"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <option value="">{t('centerReturn.allLocations')}</option>
            {availableLocations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          {locationFilter && (
            <button
              className="filter-clear-button"
              onClick={() => setLocationFilter('')}
            >
              {t('centerReturn.clear')}
            </button>
          )}
        </div>

        <div className="time-filter-section">
          <div className="filter-label">{t('centerReturn.timeFilter')}:</div>
          <select 
            className="filter-select"
            value={timeFilter.type}
            onChange={(e) => setTimeFilter({ ...timeFilter, type: e.target.value })}
          >
            <option value="shelving">{t('centerReturn.shelvingTime')}</option>
            <option value="unshelving">{t('centerReturn.unshelvingTime')}</option>
            <option value="instruction">{t('centerReturn.instructionTime')}</option>
          </select>
          <input
            type="date"
            className="filter-date"
            value={timeFilter.startDate}
            onChange={(e) => setTimeFilter({ ...timeFilter, startDate: e.target.value })}
            placeholder={t('centerReturn.startDate')}
          />
          <span className="filter-separator">{t('centerReturn.to')}</span>
          <input
            type="date"
            className="filter-date"
            value={timeFilter.endDate}
            onChange={(e) => setTimeFilter({ ...timeFilter, endDate: e.target.value })}
            placeholder={t('centerReturn.endDate')}
          />
          {(timeFilter.startDate || timeFilter.endDate) && (
            <button 
              className="filter-apply-button"
              onClick={() => setAppliedTimeFilter(timeFilter)}
              disabled={!timeFilter.startDate || !timeFilter.endDate}
            >
              {t('centerReturn.applyFilter')}
            </button>
          )}
          {(appliedTimeFilter.startDate || appliedTimeFilter.endDate) && (
            <button 
              className="filter-clear-button"
              onClick={() => {
                setTimeFilter({ type: 'shelving', startDate: '', endDate: '' })
                setAppliedTimeFilter({ type: 'shelving', startDate: '', endDate: '' })
              }}
            >
              {t('centerReturn.clearFilter')}
            </button>
          )}
        </div>

        <div className="tabs-section">
          <div className="tab-group">
            <div className="tab-group-label">{t('centerReturn.status')}</div>
            <button
              className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => handleTabChange('all')}
            >
              {t('centerReturn.all')} ({getTabCount('all')})
            </button>
            <button
              className={`tab-button ${activeTab === 'in-warehouse' ? 'active' : ''}`}
              onClick={() => handleTabChange('in-warehouse')}
            >
              {t('packageStatus.in-warehouse')} ({getTabCount('in-warehouse')})
            </button>
            <button
              className={`tab-button ${activeTab === 'pending-removal' ? 'active' : ''}`}
              onClick={() => handleTabChange('pending-removal')}
            >
              {t('packageStatus.pending-removal')} ({getTabCount('pending-removal')})
            </button>
            <button
              className={`tab-button ${activeTab === 'removed' ? 'active' : ''}`}
              onClick={() => handleTabChange('removed')}
            >
              {t('packageStatus.removed')} ({getTabCount('removed')})
            </button>
          </div>
          
          <div className="tab-group">
            <div className="tab-group-label">{t('centerReturn.customerService')}</div>
            <button
              className={`tab-button ${activeTab === 're-dispatch' ? 'active' : ''}`}
              onClick={() => handleTabChange('re-dispatch')}
            >
              {t('customerService.re-dispatch')} ({getTabCount('re-dispatch')})
            </button>
            <button
              className={`tab-button ${activeTab === 're-dispatch-new-label' ? 'active' : ''}`}
              onClick={() => handleTabChange('re-dispatch-new-label')}
            >
              {t('customerService.re-dispatch-new-label')} ({getTabCount('re-dispatch-new-label')})
            </button>
            <button
              className={`tab-button ${activeTab === 'return-to-customer' ? 'active' : ''}`}
              onClick={() => handleTabChange('return-to-customer')}
            >
              {t('customerService.return-to-customer')} ({getTabCount('return-to-customer')})
            </button>
          </div>
        </div>

        <div className="actions-bar">
          <div className="selection-info">
            {selectedPackages.length > 0 && (
              <span>{t('centerReturn.selected', { count: selectedPackages.length })}</span>
            )}
          </div>
          <div className="action-buttons">
            {filteredPackages.length > 0 && (
              <button className="select-all-button" onClick={handleSelectAll}>
                {selectedPackages.length === filteredPackages.length ? t('centerReturn.deselectAll') : t('centerReturn.selectAll')}
              </button>
            )}
            <button
              className="export-button-batch"
              onClick={handleExportData}
              disabled={selectedPackages.length === 0}
            >
              {t('centerReturn.exportData')} 📊
            </button>
            {(userRole === 'admin' || userRole === 'manager') && (
              <button
                className="action-button"
                onClick={() => setShowActionModal(true)}
                disabled={selectedPackages.length === 0}
              >
                {t('centerReturn.issueInstruction')} 📋
              </button>
            )}
            {userRole === 'admin' && (
              <button
                className="delete-button-batch"
                onClick={handleBatchDelete}
                disabled={selectedPackages.length === 0}
              >
                {t('centerReturn.deletePackages')} 🗑️
              </button>
            )}
          </div>
        </div>

        {filteredPackages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>{searchQuery ? t('centerReturn.noMatchingPackages') : t('centerReturn.noPackages')}</p>
            <p className="empty-hint">
              {searchQuery ? t('centerReturn.tryDifferentKeyword') : t('centerReturn.addPackagesHint')}
            </p>
          </div>
        ) : (
          <div className="packages-table-container">
            <table className="packages-table">
              <thead>
                <tr>
                  <th width="50">
                    <input
                      type="checkbox"
                      checked={selectedPackages.length === filteredPackages.length && filteredPackages.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>{t('centerReturn.packageNumber')}</th>
                  <th>{t('centerReturn.location')}</th>
                  <th>{t('centerReturn.status')}</th>
                  <th>{t('centerReturn.customerService')}</th>
                  <th>{t('centerReturn.shelvingTime')}</th>
                  <th>{t('centerReturn.instructionTime')}</th>
                  <th>{t('centerReturn.unshelvingTime')}</th>
                  <th>{t('centerReturn.lastOperator')}</th>
                  {(userRole === 'admin' || userRole === 'manager') && <th>{t('centerReturn.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredPackages.map((pkg) => (
                  <tr key={pkg.id} className={selectedPackages.includes(pkg.id) ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedPackages.includes(pkg.id)}
                        onChange={() => handleSelectPackage(pkg.id)}
                      />
                    </td>
                    <td className="package-number">{pkg.package_number || pkg.packageNumber}</td>
                    <td>{pkg.location || '-'}</td>
                    <td>{getStatusBadge(pkg.package_status || pkg.packageStatus)}</td>
                    <td>{getInstructionBadge(pkg.customer_service || pkg.customerService)}</td>
                    <td className="package-time">{pkg.shelving_time_display || pkg.shelvingTimeDisplay || '-'}</td>
                    <td className="package-time">{pkg.instruction_time_display || pkg.instructionTimeDisplay || '-'}</td>
                    <td className="package-time">{pkg.unshelving_time_display || pkg.unshelvingTimeDisplay || '-'}</td>
                    <td><span className="username-badge">{pkg.last_modified_by_username}</span></td>
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <td>
                        <button
                          className="quick-action-button"
                          onClick={() => {
                            setCurrentPackage(pkg)
                            setShowManageModal(true)
                          }}
                        >
                          {t('centerReturn.manage')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showActionModal && (
        <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{t('centerReturn.issueInstruction')}</h2>
            <p className="modal-subtitle">{t('centerReturn.selectOperation', { count: selectedPackages.length })}</p>
            <div className="modal-actions">
              <button
                className="modal-action-button re-dispatch"
                onClick={() => handleUpdateInstruction('re-dispatch', t('customerService.re-dispatch'))}
              >
                <span className="action-icon">🚚</span>
                <span>{t('customerService.re-dispatch')}</span>
              </button>
              <button
                className="modal-action-button re-dispatch-new"
                onClick={() => handleUpdateInstruction('re-dispatch-new-label', t('customerService.re-dispatch-new-label'))}
              >
                <span className="action-icon">📋</span>
                <span>{t('customerService.re-dispatch-new-label')}</span>
              </button>
              <button
                className="modal-action-button return-customer"
                onClick={() => handleUpdateInstruction('return-to-customer', t('customerService.return-to-customer'))}
              >
                <span className="action-icon">↩️</span>
                <span>{t('customerService.return-to-customer')}</span>
              </button>
            </div>
            <button className="modal-close-button" onClick={() => setShowActionModal(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {showManageModal && currentPackage && (
        <div className="modal-overlay" onClick={() => setShowManageModal(false)}>
          <div className="modal-content manage-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('centerReturn.packageManagement')}</h2>
            <p className="modal-subtitle">{t('centerReturn.modifyStatus')}</p>
            
            <div className="manage-content">
              <div className="manage-info-row">
                <span className="manage-label">{t('centerReturn.packageNumber')}:</span>
                <span className="manage-value">{currentPackage.package_number || currentPackage.packageNumber}</span>
              </div>
              <div className="manage-info-row">
                <span className="manage-label">{t('centerReturn.location')}:</span>
                <span className="manage-value">{currentPackage.location}</span>
              </div>
              <div className="manage-info-row">
                <span className="manage-label">{t('centerReturn.shelvingTime')}:</span>
                <span className="manage-value">{currentPackage.shelving_time_display || '-'}</span>
              </div>
              <div className="manage-info-row">
                <span className="manage-label">{t('centerReturn.instructionTime')}:</span>
                <span className="manage-value">{currentPackage.instruction_time_display || '-'}</span>
              </div>
              <div className="manage-info-row">
                <span className="manage-label">{t('centerReturn.unshelvingTime')}:</span>
                <span className="manage-value">{currentPackage.unshelving_time_display || '-'}</span>
              </div>
            </div>

            <div className="manage-edit-section">
              <h3 className="section-title-small">{t('centerReturn.modifyPackageStatus')}</h3>
              <div className="status-buttons">
                <button
                  className={`status-edit-button ${(currentPackage.package_status || currentPackage.packageStatus) === 'in-warehouse' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ package_status: 'in-warehouse' })}
                >
                  {t('packageStatus.in-warehouse')}
                </button>
                <button
                  className={`status-edit-button ${(currentPackage.package_status || currentPackage.packageStatus) === 'pending-removal' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ package_status: 'pending-removal' })}
                >
                  {t('packageStatus.pending-removal')}
                </button>
                <button
                  className={`status-edit-button ${(currentPackage.package_status || currentPackage.packageStatus) === 'removed' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ package_status: 'removed' })}
                >
                  {t('packageStatus.removed')}
                </button>
              </div>

              <h3 className="section-title-small">{t('centerReturn.modifyCustomerService')}</h3>
              <div className="instruction-buttons">
                <button
                  className={`instruction-edit-button ${(currentPackage.customer_service || currentPackage.customerService) === 're-dispatch' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ customer_service: 're-dispatch' })}
                >
                  {t('customerService.re-dispatch')}
                </button>
                <button
                  className={`instruction-edit-button ${(currentPackage.customer_service || currentPackage.customerService) === 're-dispatch-new-label' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ customer_service: 're-dispatch-new-label' })}
                >
                  {t('customerService.re-dispatch-new-label')}
                </button>
                <button
                  className={`instruction-edit-button ${(currentPackage.customer_service || currentPackage.customerService) === 'return-to-customer' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ customer_service: 'return-to-customer' })}
                >
                  {t('customerService.return-to-customer')}
                </button>
                <button
                  className={`instruction-edit-button ${!(currentPackage.customer_service || currentPackage.customerService) ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ customer_service: null })}
                >
                  {t('centerReturn.clearInstruction')}
                </button>
              </div>
            </div>

            <div className="manage-actions">
              <button className="manage-close-button full-width" onClick={() => setShowManageModal(false)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CenterReturnManagement

