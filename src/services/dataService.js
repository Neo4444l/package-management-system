import { supabase } from '../supabaseClient'

// ==================== 包裹相关操作 ====================

/**
 * 获取所有包裹
 */
export async function getAllPackages() {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('获取包裹失败:', error)
    return []
  }
}

/**
 * 根据状态获取包裹
 */
export async function getPackagesByStatus(status) {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('package_status', status)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('获取包裹失败:', error)
    return []
  }
}

/**
 * 根据库位获取包裹
 */
export async function getPackagesByLocation(location) {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('location', location)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('获取包裹失败:', error)
    return []
  }
}

/**
 * 添加包裹
 */
export async function addPackage(packageData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('packages')
      .insert([{
        user_id: user?.id,
        package_number: packageData.packageNumber,
        location: packageData.location,
        package_status: packageData.packageStatus || 'in-warehouse',
        customer_service: packageData.customerService || null,
        shelving_time: new Date().toISOString(),
        status_history: packageData.statusHistory || []
      }])
      .select()
    
    if (error) throw error
    return data[0]
  } catch (error) {
    console.error('添加包裹失败:', error)
    throw error
  }
}

/**
 * 更新包裹
 */
export async function updatePackage(id, updates) {
  try {
    const { data, error } = await supabase
      .from('packages')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  } catch (error) {
    console.error('更新包裹失败:', error)
    throw error
  }
}

/**
 * 删除包裹
 */
export async function deletePackage(id) {
  try {
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('删除包裹失败:', error)
    throw error
  }
}

/**
 * 搜索包裹
 */
export async function searchPackages(searchTerm) {
  try {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .or(`package_number.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('搜索包裹失败:', error)
    return []
  }
}

/**
 * 下架包裹
 */
export async function unshelvingPackage(packageNumber) {
  try {
    const { data, error } = await supabase
      .from('packages')
      .update({
        package_status: 'removed',
        unshelving_time: new Date().toISOString()
      })
      .eq('package_number', packageNumber)
      .select()
    
    if (error) throw error
    return data[0]
  } catch (error) {
    console.error('下架包裹失败:', error)
    throw error
  }
}

/**
 * 批量更新包裹状态
 */
export async function batchUpdatePackages(packageIds, updates) {
  try {
    const { data, error } = await supabase
      .from('packages')
      .update(updates)
      .in('id', packageIds)
      .select()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('批量更新包裹失败:', error)
    throw error
  }
}

// ==================== 库位相关操作 ====================

/**
 * 获取所有库位
 */
export async function getAllLocations() {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('获取库位失败:', error)
    return []
  }
}

/**
 * 添加库位
 */
export async function addLocation(code) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .insert([{ 
        code,
        created_at: new Date().toISOString()
      }])
      .select()
    
    if (error) {
      // 检查是否是重复的库位号
      if (error.code === '23505') {
        throw new Error('库位号已存在')
      }
      throw error
    }
    return data[0]
  } catch (error) {
    console.error('添加库位失败:', error)
    throw error
  }
}

/**
 * 删除库位
 */
export async function deleteLocation(id) {
  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('删除库位失败:', error)
    throw error
  }
}

/**
 * 批量删除库位
 */
export async function batchDeleteLocations(locationIds) {
  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .in('id', locationIds)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('批量删除库位失败:', error)
    throw error
  }
}

// ==================== 数据迁移工具 ====================

/**
 * 从LocalStorage迁移数据到Supabase
 */
export async function migrateFromLocalStorage() {
  try {
    const results = {
      packages: { success: 0, failed: 0 },
      locations: { success: 0, failed: 0 }
    }

    // 迁移库位
    const locationsStr = localStorage.getItem('locations')
    if (locationsStr) {
      const locations = JSON.parse(locationsStr)
      for (const loc of locations) {
        try {
          await addLocation(loc.code)
          results.locations.success++
        } catch (error) {
          if (error.message === '库位号已存在') {
            results.locations.success++
          } else {
            results.locations.failed++
          }
        }
      }
    }

    // 迁移包裹
    const packagesStr = localStorage.getItem('packages')
    if (packagesStr) {
      const packages = JSON.parse(packagesStr)
      for (const pkg of packages) {
        try {
          await addPackage({
            packageNumber: pkg.packageNumber,
            location: pkg.location,
            packageStatus: pkg.packageStatus,
            customerService: pkg.customerService,
            statusHistory: pkg.statusHistory || []
          })
          results.packages.success++
        } catch (error) {
          console.error('迁移包裹失败:', pkg.packageNumber, error)
          results.packages.failed++
        }
      }
    }

    return results
  } catch (error) {
    console.error('数据迁移失败:', error)
    throw error
  }
}

/**
 * 清除LocalStorage数据
 */
export function clearLocalStorage() {
  localStorage.removeItem('packages')
  localStorage.removeItem('locations')
  console.log('LocalStorage数据已清除')
}

