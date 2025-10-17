import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getAllPackages, updatePackage, deletePackage } from '../services/dataService'
import './CenterReturnManagement.css'

function CenterReturnManagement() {
  const navigate = useNavigate()
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

  // 从 Supabase 加载包裹数据
  useEffect(() => {
    loadPackages()
  }, [])

  // 🔄 实时监听包裹变化
  useEffect(() => {
    const subscription = supabase
      .channel('packages-center-return')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packages'
        },
        (payload) => {
          console.log('📦 包裹数据变化（中心退回管理）：', payload)
          
          if (payload.eventType === 'INSERT') {
            // 新增包裹
            setPackages(prev => {
              if (prev.some(p => p.id === payload.new.id)) return prev
              return [payload.new, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            // 包裹更新
            setPackages(prev => prev.map(p => 
              p.id === payload.new.id ? payload.new : p
            ))
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
  }, [])

  const loadPackages = async () => {
    try {
      const allPackages = await getAllPackages()
      // 格式化时间字段
      const packagesWithFormattedTime = allPackages.map(pkg => ({
        ...pkg,
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
      }))
      setPackages(packagesWithFormattedTime)
      filterPackages(packagesWithFormattedTime, activeTab, searchQuery)
    } catch (error) {
      console.error('Error loading packages:', error)
      showNotification('加载包裹数据失败', 'error')
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
  }, [activeTab, searchQuery, packages, appliedTimeFilter])

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
      showNotification('请先选择要操作的运单', 'error')
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
      showNotification(`已将 ${selectedPackages.length} 个运单设置为"${instructionLabel}"，状态已更新为"待下架"`, 'success')
    } catch (error) {
      console.error('Error updating packages:', error)
      showNotification('更新失败：' + error.message, 'error')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedPackages.length === 0) {
      showNotification('请先选择要删除的运单', 'error')
      return
    }

    // 删除操作需要二次确认
    if (window.confirm(`确定要删除选中的 ${selectedPackages.length} 个运单吗？\n\n此操作不可恢复！`)) {
      try {
        // 批量删除
        const deletePromises = selectedPackages.map(pkgId => deletePackage(pkgId))
        await Promise.all(deletePromises)
        
        // 重新加载数据
        await loadPackages()
        showNotification(`已从云端删除 ${selectedPackages.length} 个运单`, 'success')
        setSelectedPackages([])
      } catch (error) {
        console.error('Error deleting packages:', error)
        showNotification('删除失败：' + error.message, 'error')
      }
    }
  }

  const handleExportData = () => {
    if (selectedPackages.length === 0) {
      showNotification('请先选择要导出的运单', 'error')
      return
    }

    // 获取选中的包裹数据
    const selectedData = packages.filter(pkg => selectedPackages.includes(pkg.id))

    // CSV 表头（所有列）
    const headers = [
      '运单号',
      '库位',
      '包裹状态',
      '客服指令',
      '上架时间',
      '下达指令时间',
      '下架时间'
    ]

    // 状态和指令的映射
    const statusMap = {
      'in-warehouse': '在库内',
      'pending-removal': '待下架',
      'removed': '已下架'
    }

    const instructionMap = {
      're-dispatch': '重派',
      're-dispatch-new-label': '重派（新面单）',
      'return-to-customer': '退回客户'
    }

    // 生成CSV内容
    const rows = selectedData.map(pkg => [
      pkg.package_number || pkg.packageNumber || '',
      pkg.location || '',
      statusMap[pkg.package_status || pkg.packageStatus] || '',
      instructionMap[pkg.customer_service || pkg.customerService] || '',
      pkg.shelving_time_display || pkg.shelvingTimeDisplay || '',
      pkg.instruction_time_display || pkg.instructionTimeDisplay || '',
      pkg.unshelving_time_display || pkg.unshelvingTimeDisplay || ''
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
    link.setAttribute('download', `运单数据_${new Date().toLocaleDateString('zh-CN')}_${Date.now()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    showNotification(`已导出 ${selectedPackages.length} 个运单数据`, 'success')
  }

  const handleUpdatePackage = async (updates) => {
    try {
      // 更新到 Supabase
      await updatePackage(currentPackage.id, updates)
      
      // 重新加载数据
      await loadPackages()
      setCurrentPackage(null)
      setShowManageModal(false)
      showNotification('运单信息已更新到云端', 'success')
    } catch (error) {
      console.error('Error updating package:', error)
      showNotification('更新失败：' + error.message, 'error')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'in-warehouse': { label: '在库内', color: '#4CAF50' },
      'pending-removal': { label: '待下架', color: '#FF9800' },
      'removed': { label: '已下架', color: '#999' }
    }
    const config = statusConfig[status] || { label: '未知', color: '#999' }
    return (
      <span className="status-badge" style={{ backgroundColor: config.color }}>
        {config.label}
      </span>
    )
  }

  const getInstructionBadge = (instruction) => {
    if (!instruction) return <span className="instruction-badge empty">-</span>
    
    const instructionConfig = {
      're-dispatch': { label: '重派', color: '#9C27B0' },
      're-dispatch-new-label': { label: '重派（新面单）', color: '#75D025' },
      'return-to-customer': { label: '退回客户', color: '#F44336' }
    }
    const config = instructionConfig[instruction] || { label: '未知', color: '#999' }
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
          ⚠️ 连接已断开，正在重连...
        </div>
      )}

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="center-return-container">
        <button className="back-button" onClick={() => navigate('/return-dashboard')}>
          ← 返回退件看板
        </button>

        <div className="center-header">
          <div className="header-icon">📊</div>
          <h1>中心退回管理</h1>
          <p>运单查询、分类和状态管理</p>
        </div>

        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="搜索运单号或库位号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="time-filter-section">
          <div className="filter-label">时间筛选：</div>
          <select 
            className="filter-select"
            value={timeFilter.type}
            onChange={(e) => setTimeFilter({ ...timeFilter, type: e.target.value })}
          >
            <option value="shelving">上架时间</option>
            <option value="unshelving">下架时间</option>
            <option value="instruction">下达指令时间</option>
          </select>
          <input
            type="date"
            className="filter-date"
            value={timeFilter.startDate}
            onChange={(e) => setTimeFilter({ ...timeFilter, startDate: e.target.value })}
            placeholder="开始日期"
          />
          <span className="filter-separator">至</span>
          <input
            type="date"
            className="filter-date"
            value={timeFilter.endDate}
            onChange={(e) => setTimeFilter({ ...timeFilter, endDate: e.target.value })}
            placeholder="结束日期"
          />
          {(timeFilter.startDate || timeFilter.endDate) && (
            <button 
              className="filter-apply-button"
              onClick={() => setAppliedTimeFilter(timeFilter)}
              disabled={!timeFilter.startDate || !timeFilter.endDate}
            >
              进行筛选
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
              清除筛选
            </button>
          )}
        </div>

        <div className="tabs-section">
          <div className="tab-group">
            <div className="tab-group-label">状态</div>
            <button
              className={`tab-button ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => handleTabChange('all')}
            >
              全部 ({getTabCount('all')})
            </button>
            <button
              className={`tab-button ${activeTab === 'in-warehouse' ? 'active' : ''}`}
              onClick={() => handleTabChange('in-warehouse')}
            >
              在库内 ({getTabCount('in-warehouse')})
            </button>
            <button
              className={`tab-button ${activeTab === 'pending-removal' ? 'active' : ''}`}
              onClick={() => handleTabChange('pending-removal')}
            >
              待下架 ({getTabCount('pending-removal')})
            </button>
            <button
              className={`tab-button ${activeTab === 'removed' ? 'active' : ''}`}
              onClick={() => handleTabChange('removed')}
            >
              已下架 ({getTabCount('removed')})
            </button>
          </div>
          
          <div className="tab-group">
            <div className="tab-group-label">客服指令</div>
            <button
              className={`tab-button ${activeTab === 're-dispatch' ? 'active' : ''}`}
              onClick={() => handleTabChange('re-dispatch')}
            >
              重派 ({getTabCount('re-dispatch')})
            </button>
            <button
              className={`tab-button ${activeTab === 're-dispatch-new-label' ? 'active' : ''}`}
              onClick={() => handleTabChange('re-dispatch-new-label')}
            >
              重派（新面单） ({getTabCount('re-dispatch-new-label')})
            </button>
            <button
              className={`tab-button ${activeTab === 'return-to-customer' ? 'active' : ''}`}
              onClick={() => handleTabChange('return-to-customer')}
            >
              退回客户 ({getTabCount('return-to-customer')})
            </button>
          </div>
        </div>

        <div className="actions-bar">
          <div className="selection-info">
            {selectedPackages.length > 0 && (
              <span>已选择 {selectedPackages.length} 个运单</span>
            )}
          </div>
          <div className="action-buttons">
            {filteredPackages.length > 0 && (
              <button className="select-all-button" onClick={handleSelectAll}>
                {selectedPackages.length === filteredPackages.length ? '取消全选' : '全选'}
              </button>
            )}
            <button
              className="export-button-batch"
              onClick={handleExportData}
              disabled={selectedPackages.length === 0}
            >
              导出数据 📊
            </button>
            <button
              className="action-button"
              onClick={() => setShowActionModal(true)}
              disabled={selectedPackages.length === 0}
            >
              指令下达 📋
            </button>
            <button
              className="delete-button-batch"
              onClick={handleBatchDelete}
              disabled={selectedPackages.length === 0}
            >
              删除运单 🗑️
            </button>
          </div>
        </div>

        {filteredPackages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>{searchQuery ? '未找到匹配的运单' : '暂无运单记录'}</p>
            <p className="empty-hint">
              {searchQuery ? '尝试修改搜索关键词' : '通过"上架"或"下架"功能添加运单'}
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
                  <th>运单号</th>
                  <th>库位</th>
                  <th>状态</th>
                  <th>客服指令</th>
                  <th>上架时间</th>
                  <th>下达指令时间</th>
                  <th>下架时间</th>
                  <th>操作</th>
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
                    <td>
                      <button
                        className="quick-action-button"
                        onClick={() => {
                          setCurrentPackage(pkg)
                          setShowManageModal(true)
                        }}
                      >
                        管理
                      </button>
                    </td>
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
            <h2>指令下达</h2>
            <p className="modal-subtitle">选择要执行的操作（已选择 {selectedPackages.length} 个运单）</p>
            <div className="modal-actions">
              <button
                className="modal-action-button re-dispatch"
                onClick={() => handleUpdateInstruction('re-dispatch', '重派')}
              >
                <span className="action-icon">🚚</span>
                <span>重派</span>
              </button>
              <button
                className="modal-action-button re-dispatch-new"
                onClick={() => handleUpdateInstruction('re-dispatch-new-label', '重派（新面单）')}
              >
                <span className="action-icon">📋</span>
                <span>重派（新面单）</span>
              </button>
              <button
                className="modal-action-button return-customer"
                onClick={() => handleUpdateInstruction('return-to-customer', '退回客户')}
              >
                <span className="action-icon">↩️</span>
                <span>退回客户</span>
              </button>
            </div>
            <button className="modal-close-button" onClick={() => setShowActionModal(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {showManageModal && currentPackage && (
        <div className="modal-overlay" onClick={() => setShowManageModal(false)}>
          <div className="modal-content manage-modal" onClick={(e) => e.stopPropagation()}>
            <h2>运单管理</h2>
            <p className="modal-subtitle">修改状态和客服指令</p>
            
            <div className="manage-content">
              <div className="manage-info-row">
                <span className="manage-label">运单号：</span>
                <span className="manage-value">{currentPackage.package_number || currentPackage.packageNumber}</span>
              </div>
              <div className="manage-info-row">
                <span className="manage-label">库位：</span>
                <span className="manage-value">{currentPackage.location}</span>
              </div>
            </div>

            <div className="manage-edit-section">
              <h3 className="section-title-small">修改状态</h3>
              <div className="status-buttons">
                <button
                  className={`status-edit-button ${(currentPackage.package_status || currentPackage.packageStatus) === 'in-warehouse' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ package_status: 'in-warehouse' })}
                >
                  在库内
                </button>
                <button
                  className={`status-edit-button ${(currentPackage.package_status || currentPackage.packageStatus) === 'pending-removal' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ package_status: 'pending-removal' })}
                >
                  待下架
                </button>
                <button
                  className={`status-edit-button ${(currentPackage.package_status || currentPackage.packageStatus) === 'removed' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ package_status: 'removed' })}
                >
                  已下架
                </button>
              </div>

              <h3 className="section-title-small">修改客服指令</h3>
              <div className="instruction-buttons">
                <button
                  className={`instruction-edit-button ${(currentPackage.customer_service || currentPackage.customerService) === 're-dispatch' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ customer_service: 're-dispatch' })}
                >
                  重派
                </button>
                <button
                  className={`instruction-edit-button ${(currentPackage.customer_service || currentPackage.customerService) === 're-dispatch-new-label' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ customer_service: 're-dispatch-new-label' })}
                >
                  重派（新面单）
                </button>
                <button
                  className={`instruction-edit-button ${(currentPackage.customer_service || currentPackage.customerService) === 'return-to-customer' ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ customer_service: 'return-to-customer' })}
                >
                  退回客户
                </button>
                <button
                  className={`instruction-edit-button ${!(currentPackage.customer_service || currentPackage.customerService) ? 'active' : ''}`}
                  onClick={() => handleUpdatePackage({ customer_service: null })}
                >
                  清除指令
                </button>
              </div>
            </div>

            <div className="manage-actions">
              <button className="manage-close-button full-width" onClick={() => setShowManageModal(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CenterReturnManagement

