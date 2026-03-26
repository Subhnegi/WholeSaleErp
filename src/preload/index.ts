import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  db: {
    getVersionInfo: () => ipcRenderer.invoke('db:getVersionInfo'),
    getMeta: (key: string) => ipcRenderer.invoke('db:getMeta', key),
    getAllMeta: () => ipcRenderer.invoke('db:getAllMeta'),
    setMeta: (key: string, value: string) => ipcRenderer.invoke('db:setMeta', key, value)
  },
  license: {
    register: (data: { name: string; email: string; password: string }) =>
      ipcRenderer.invoke('license:register', data),
    login: (data: { email: string; password: string }) =>
      ipcRenderer.invoke('license:login', data),
    logout: () => ipcRenderer.invoke('license:logout'),
    validate: (licenseKey?: string) => ipcRenderer.invoke('license:validate', licenseKey),
    isLoggedIn: () => ipcRenderer.invoke('license:isLoggedIn'),
    getUserData: () => ipcRenderer.invoke('license:getUserData'),
    isExpired: () => ipcRenderer.invoke('license:isExpired'),
    getDaysRemaining: () => ipcRenderer.invoke('license:getDaysRemaining')
  },
  enforcer: {
    checkEnforcement: () => ipcRenderer.invoke('enforcer:checkEnforcement'),
    forceValidation: () => ipcRenderer.invoke('enforcer:forceValidation'),
    getGracePeriodStatus: () => ipcRenderer.invoke('enforcer:getGracePeriodStatus'),
    getLastValidationTime: () => ipcRenderer.invoke('enforcer:getLastValidationTime'),
    needsValidation: () => ipcRenderer.invoke('enforcer:needsValidation')
  },
  company: {
    create: (data: any) => ipcRenderer.invoke('company:create', data),
    list: (userId: string) => ipcRenderer.invoke('company:list', userId),
    update: (id: string, data: any) => ipcRenderer.invoke('company:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('company:delete', id)
  },
  sync: {
    manual: () => ipcRenderer.invoke('sync:manual'),
    getLastSyncTime: () => ipcRenderer.invoke('sync:getLastSyncTime'),
    getQueueStatus: () => ipcRenderer.invoke('sync:getQueueStatus'),
    startAutoSync: (intervalHours: number) => ipcRenderer.invoke('sync:startAutoSync', intervalHours),
    stopAutoSync: () => ipcRenderer.invoke('sync:stopAutoSync'),
    schedule: (time: string) => ipcRenderer.invoke('sync:schedule', time),
    stopSchedule: () => ipcRenderer.invoke('sync:stopSchedule'),
    // Event listeners
    onSyncStarted: (callback: () => void) => {
      ipcRenderer.on('sync-started', callback)
    },
    onSyncProgress: (callback: (data: { step: string; progress: number }) => void) => {
      ipcRenderer.on('sync-progress', (_event, data) => callback(data))
    },
    onSyncCompleted: (callback: (data: { success: boolean; synced: number; failed: number }) => void) => {
      ipcRenderer.on('sync-completed', (_event, data) => callback(data))
    },
    onSyncFailed: (callback: (data: { error: string }) => void) => {
      ipcRenderer.on('sync-failed', (_event, data) => callback(data))
    },
    onSyncQueueUpdated: (callback: (data: { pending: number }) => void) => {
      ipcRenderer.on('sync-queue-updated', (_event, data) => callback(data))
    }
  },
  financialYear: {
    create: (data: any) => ipcRenderer.invoke('financialYear:create', data),
    list: () => ipcRenderer.invoke('financialYear:list'),
    linkToCompany: (companyId: string, financialYearId: string, isActive: boolean) =>
      ipcRenderer.invoke('financialYear:linkToCompany', companyId, financialYearId, isActive),
    getByCompany: (companyId: string) => ipcRenderer.invoke('financialYear:getByCompany', companyId),
    switch: (companyId: string, financialYearId: string) =>
      ipcRenderer.invoke('financialYear:switch', companyId, financialYearId),
    getActive: (companyId: string) => ipcRenderer.invoke('financialYear:getActive', companyId)
  },
  accountGroup: {
    create: (data: any) => ipcRenderer.invoke('accountGroup:create', data),
    list: (companyId: string) => ipcRenderer.invoke('accountGroup:list', companyId),
    get: (id: string) => ipcRenderer.invoke('accountGroup:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('accountGroup:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('accountGroup:delete', id)
  },
  account: {
    create: (data: any) => ipcRenderer.invoke('account:create', data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('account:listByCompany', companyId),
    listByGroup: (accountGroupId: string) => ipcRenderer.invoke('account:listByGroup', accountGroupId),
    get: (id: string) => ipcRenderer.invoke('account:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('account:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('account:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('account:bulkDelete', ids),
    bulkUpdateGroup: (ids: string[], accountGroupId: string) => 
      ipcRenderer.invoke('account:bulkUpdateGroup', ids, accountGroupId)
  },
  item: {
    create: (companyId: string, data: any) => ipcRenderer.invoke('item:create', companyId, data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('item:listByCompany', companyId),
    get: (id: string) => ipcRenderer.invoke('item:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('item:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('item:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('item:bulkDelete', ids)
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    forceReload: () => ipcRenderer.invoke('app:forceReload'),
    toggleDevTools: () => ipcRenderer.invoke('app:toggleDevTools'),
    toggleFullscreen: () => ipcRenderer.invoke('app:toggleFullscreen'),
    zoomIn: () => ipcRenderer.invoke('app:zoomIn'),
    zoomOut: () => ipcRenderer.invoke('app:zoomOut'),
    resetZoom: () => ipcRenderer.invoke('app:resetZoom'),
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
    checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
    showAbout: () => ipcRenderer.invoke('app:showAbout'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
    openDocumentation: () => ipcRenderer.invoke('app:openDocumentation'),
    checkConnectivity: () => ipcRenderer.invoke('app:checkConnectivity')
  },
  backup: {
    create: (options?: { companyId?: string; location?: string; password?: string }) =>
      ipcRenderer.invoke('backup:create', options),
    restore: (filePath: string) => ipcRenderer.invoke('backup:restore', filePath),
    list: (location?: string) => ipcRenderer.invoke('backup:list', location),
    delete: (filePath: string) => ipcRenderer.invoke('backup:delete', filePath),
    selectFolder: () => ipcRenderer.invoke('backup:selectFolder'),
    selectFile: () => ipcRenderer.invoke('backup:selectFile'),
    getDefaultFolder: () => ipcRenderer.invoke('backup:getDefaultFolder'),
    getLastBackupInfo: () => ipcRenderer.invoke('backup:getLastBackupInfo')
  },
  quickSale: {
    create: (data: any) => ipcRenderer.invoke('quickSale:create', data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('quickSale:listByCompany', companyId),
    listByDateRange: (companyId: string, startDate: string, endDate: string) => 
      ipcRenderer.invoke('quickSale:listByDateRange', companyId, startDate, endDate),
    get: (id: string) => ipcRenderer.invoke('quickSale:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('quickSale:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('quickSale:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('quickSale:bulkDelete', ids),
    getNextVoucherNo: (companyId: string, saleDate: string) =>
      ipcRenderer.invoke('quickSale:getNextVoucherNo', companyId, saleDate)
  },
  voucher: {
    create: (data: any) => ipcRenderer.invoke('voucher:create', data),
    list: (companyId: string, filters?: any) => ipcRenderer.invoke('voucher:list', companyId, filters),
    get: (id: string) => ipcRenderer.invoke('voucher:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('voucher:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('voucher:delete', id),
    export: (ids: string[]) => ipcRenderer.invoke('voucher:export', ids),
    import: () => ipcRenderer.invoke('voucher:import')
  },
  // ISSUE 2 FIX: Preferences API for DB persistence
  preferences: {
    get: () => ipcRenderer.invoke('preferences:get'),
    save: (preferences: any) => ipcRenderer.invoke('preferences:save', preferences)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
