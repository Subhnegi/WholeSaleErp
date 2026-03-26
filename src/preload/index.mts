import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  SellerBillPayload,
  StockTransferListFilters,
  StockTransferPayload,
  StockWattakListFilters,
  StockWattakPayload
} from './types'

// Custom APIs for renderer
const api = {
  db: {
    getVersionInfo: () => ipcRenderer.invoke('db:getVersionInfo'),
    getMeta: (key: string) => ipcRenderer.invoke('db:getMeta', key),
    getAllMeta: () => ipcRenderer.invoke('db:getAllMeta'),
    getUpdateInfo: () => ipcRenderer.invoke('db:getUpdateInfo'),
    saveUpdateInfo: (data: {
      lastCheckDate: Date
      currentVersion: string
      availableVersion?: string
      updateAvailable: boolean
    }) => ipcRenderer.invoke('db:saveUpdateInfo', data)
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
    needsValidation: () => ipcRenderer.invoke('enforcer:needsValidation'),
    startupCheck: () => ipcRenderer.invoke('license:startupCheck'),
    forceOnlineValidation: () => ipcRenderer.invoke('license:forceOnlineValidation')
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    checkConnectivity: () => ipcRenderer.invoke('app:checkConnectivity'),
    checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
    quit: () => ipcRenderer.invoke('app:quit'),
    // Window controls
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
    // View controls
    forceReload: () => ipcRenderer.invoke('app:forceReload'),
    // Window close confirmation
    onRequestCloseConfirmation: (callback: () => void) => {
      ipcRenderer.on('window:request-close-confirmation', callback)
      return () => ipcRenderer.removeListener('window:request-close-confirmation', callback)
    },
    confirmClose: () => ipcRenderer.send('window:close-confirmed'),
    cancelClose: () => ipcRenderer.send('window:close-cancelled'),
    toggleDevTools: () => ipcRenderer.invoke('app:toggleDevTools'),
    toggleFullscreen: () => ipcRenderer.invoke('app:toggleFullscreen'),
    zoomIn: () => ipcRenderer.invoke('app:zoomIn'),
    zoomOut: () => ipcRenderer.invoke('app:zoomOut'),
    resetZoom: () => ipcRenderer.invoke('app:resetZoom'),
    // Help
    showAbout: () => ipcRenderer.invoke('app:showAbout'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
    openDocumentation: () => ipcRenderer.invoke('app:openDocumentation')
  },
  company: {
    create: (data: any) => ipcRenderer.invoke('company:create', data),
    list: (userId: string) => ipcRenderer.invoke('company:list', userId),
    update: (id: string, data: any) => ipcRenderer.invoke('company:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('company:delete', id)
  },
  dashboard: {
    getStats: (companyId: string) => ipcRenderer.invoke('dashboard:getStats', companyId)
  },
  sync: {
    manual: () => ipcRenderer.invoke('sync:manual'),
    getLastSyncTime: () => ipcRenderer.invoke('sync:getLastSyncTime'),
    getQueueStatus: () => ipcRenderer.invoke('sync:getQueueStatus'),
    startAutoSync: (intervalHours: number) => ipcRenderer.invoke('sync:startAutoSync', intervalHours),
    stopAutoSync: () => ipcRenderer.invoke('sync:stopAutoSync'),
    schedule: (time: string) => ipcRenderer.invoke('sync:schedule', time),
    stopSchedule: () => ipcRenderer.invoke('sync:stopSchedule'),
    // Event listeners - return cleanup functions
    onSyncStarted: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('sync-started', listener)
      return () => ipcRenderer.removeListener('sync-started', listener)
    },
    onSyncProgress: (callback: (data: { step: string; progress: number }) => void) => {
      const listener = (_event: any, data: { step: string; progress: number }) => callback(data)
      ipcRenderer.on('sync-progress', listener)
      return () => ipcRenderer.removeListener('sync-progress', listener)
    },
    onSyncCompleted: (callback: (data: { success: boolean; synced: number; failed: number }) => void) => {
      const listener = (_event: any, data: { success: boolean; synced: number; failed: number }) => callback(data)
      ipcRenderer.on('sync-completed', listener)
      return () => ipcRenderer.removeListener('sync-completed', listener)
    },
    onSyncFailed: (callback: (data: { error: string }) => void) => {
      const listener = (_event: any, data: { error: string }) => callback(data)
      ipcRenderer.on('sync-failed', listener)
      return () => ipcRenderer.removeListener('sync-failed', listener)
    },
    onSyncQueueUpdated: (callback: (data: { pending: number }) => void) => {
      const listener = (_event: any, data: { pending: number }) => callback(data)
      ipcRenderer.on('sync-queue-updated', listener)
      return () => ipcRenderer.removeListener('sync-queue-updated', listener)
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
    delete: (id: string) => ipcRenderer.invoke('accountGroup:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('accountGroup:bulkDelete', ids)
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
  
  // Phase 5: Item API
  item: {
    create: (companyId: string, data: any) => ipcRenderer.invoke('item:create', companyId, data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('item:listByCompany', companyId),
    get: (id: string) => ipcRenderer.invoke('item:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('item:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('item:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('item:bulkDelete', ids)
  },
  
  // Phase 6: Crate Marka API
  crate: {
    create: (companyId: string, data: any) => ipcRenderer.invoke('crate:create', companyId, data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('crate:listByCompany', companyId),
    get: (id: string) => ipcRenderer.invoke('crate:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('crate:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('crate:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('crate:bulkDelete', ids)
  },
  
  // Phase 7: ArrivalType API
  arrivalType: {
    create: (companyId: string, data: any) => ipcRenderer.invoke('arrivalType:create', companyId, data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('arrivalType:listByCompany', companyId),
    get: (id: string) => ipcRenderer.invoke('arrivalType:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('arrivalType:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('arrivalType:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('arrivalType:bulkDelete', ids)
  },

  // Phase 14.4: OtherChargesHead API
  otherChargesHead: {
    create: (companyId: string, data: any) => ipcRenderer.invoke('otherChargesHead:create', companyId, data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('otherChargesHead:listByCompany', companyId),
    get: (id: string) => ipcRenderer.invoke('otherChargesHead:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('otherChargesHead:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('otherChargesHead:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('otherChargesHead:bulkDelete', ids)
  },

  // Phase 8: Packing API
  packing: {
    create: (data: any) => ipcRenderer.invoke('packing:create', data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('packing:listByCompany', companyId),
    get: (id: string) => ipcRenderer.invoke('packing:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('packing:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('packing:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('packing:bulkDelete', ids)
  },

  // Phase 9: Store API
  store: {
    create: (data: any) => ipcRenderer.invoke('store:create', data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('store:listByCompany', companyId),
    get: (id: string) => ipcRenderer.invoke('store:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('store:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('store:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('store:bulkDelete', ids)
  },

  // Phase 10: Quick Sale API
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

  // Phase 18: Quick Receipt API
  quickReceipt: {
    create: (data: any) => ipcRenderer.invoke('quickReceipt:create', data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('quickReceipt:listByCompany', companyId),
    listByDateRange: (companyId: string, startDate: string, endDate: string) =>
      ipcRenderer.invoke('quickReceipt:listByDateRange', companyId, startDate, endDate),
    get: (id: string) => ipcRenderer.invoke('quickReceipt:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('quickReceipt:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('quickReceipt:delete', id),
    deleteMany: (ids: string[]) => ipcRenderer.invoke('quickReceipt:deleteMany', ids)
  },

  // Phase 18.3: Quick Payment API
  quickPayment: {
    create: (data: any) => ipcRenderer.invoke('quickPayment:create', data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('quickPayment:listByCompany', companyId),
    listByDateRange: (companyId: string, startDate: string, endDate: string) =>
      ipcRenderer.invoke('quickPayment:listByDateRange', companyId, startDate, endDate),
    get: (id: string) => ipcRenderer.invoke('quickPayment:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('quickPayment:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('quickPayment:delete', id),
    deleteMany: (ids: string[]) => ipcRenderer.invoke('quickPayment:deleteMany', ids)
  },

  // Phase 18.5: Account Ledger API
  accountLedger: {
    getOrCreate: (companyId: string, accountId: string) =>
      ipcRenderer.invoke('accountLedger:getOrCreate', companyId, accountId),
    get: (companyId: string, accountId: string) =>
      ipcRenderer.invoke('accountLedger:get', companyId, accountId),
    getById: (id: string) => ipcRenderer.invoke('accountLedger:getById', id),
    list: (companyId: string, filters?: { accountId?: string; hasBalance?: boolean }) =>
      ipcRenderer.invoke('accountLedger:list', companyId, filters),
    getItems: (companyId: string, accountId: string, filters?: { startDate?: string; endDate?: string; type?: string }) =>
      ipcRenderer.invoke('accountLedger:getItems', companyId, accountId, filters),
    addEntry: (companyId: string, accountId: string, entry: { type: string; vchNo: string; name: string; particulars: string; debit: number; credit: number }) =>
      ipcRenderer.invoke('accountLedger:addEntry', companyId, accountId, entry),
    reverseEntry: (companyId: string, accountId: string, vchNo: string, type: string) =>
      ipcRenderer.invoke('accountLedger:reverseEntry', companyId, accountId, vchNo, type),
    // Record transaction entries
    recordQuickSale: (companyId: string, accountId: string, vchNo: string, totalAmount: number, itemsSummary: string) =>
      ipcRenderer.invoke('accountLedger:recordQuickSale', companyId, accountId, vchNo, totalAmount, itemsSummary),
    recordDailySale: (companyId: string, accountId: string, vchNo: string, totalAmount: number, itemsSummary: string) =>
      ipcRenderer.invoke('accountLedger:recordDailySale', companyId, accountId, vchNo, totalAmount, itemsSummary),
    recordStockSale: (companyId: string, customerId: string, vchNo: string, totalAmount: number, itemsSummary: string) =>
      ipcRenderer.invoke('accountLedger:recordStockSale', companyId, customerId, vchNo, totalAmount, itemsSummary),
    recordArrival: (companyId: string, supplierId: string, vchNo: string, totalAmount: number, itemsSummary: string) =>
      ipcRenderer.invoke('accountLedger:recordArrival', companyId, supplierId, vchNo, totalAmount, itemsSummary),
    recordSellerBill: (companyId: string, sellerId: string, vchNo: string, totalAmount: number, itemsSummary: string) =>
      ipcRenderer.invoke('accountLedger:recordSellerBill', companyId, sellerId, vchNo, totalAmount, itemsSummary),
    recordStockTransfer: (companyId: string, accountId: string, vchNo: string, totalAmount: number, itemsSummary: string) =>
      ipcRenderer.invoke('accountLedger:recordStockTransfer', companyId, accountId, vchNo, totalAmount, itemsSummary),
    recordStockWattak: (companyId: string, partyId: string, vchNo: string, totalAmount: number, itemsSummary: string) =>
      ipcRenderer.invoke('accountLedger:recordStockWattak', companyId, partyId, vchNo, totalAmount, itemsSummary),
    recordQuickReceipt: (companyId: string, accountId: string, receiptId: string, amount: number, paymentMode: string, remarks?: string) =>
      ipcRenderer.invoke('accountLedger:recordQuickReceipt', companyId, accountId, receiptId, amount, paymentMode, remarks),
    recordQuickPayment: (companyId: string, accountId: string, paymentId: string, amount: number, paymentMode: string, remarks?: string) =>
      ipcRenderer.invoke('accountLedger:recordQuickPayment', companyId, accountId, paymentId, amount, paymentMode, remarks),
    recordCrateIssue: (companyId: string, accountId: string, vchNo: string, crateQty: number, crateName: string) =>
      ipcRenderer.invoke('accountLedger:recordCrateIssue', companyId, accountId, vchNo, crateQty, crateName),
    recordCrateReceive: (companyId: string, accountId: string, vchNo: string, crateQty: number, crateName: string) =>
      ipcRenderer.invoke('accountLedger:recordCrateReceive', companyId, accountId, vchNo, crateQty, crateName),
    // Reverse transaction entries
    reverseQuickSale: (companyId: string, accountId: string, vchNo: string) =>
      ipcRenderer.invoke('accountLedger:reverseQuickSale', companyId, accountId, vchNo),
    reverseDailySale: (companyId: string, accountId: string, vchNo: string) =>
      ipcRenderer.invoke('accountLedger:reverseDailySale', companyId, accountId, vchNo),
    reverseStockSale: (companyId: string, accountId: string, vchNo: string) =>
      ipcRenderer.invoke('accountLedger:reverseStockSale', companyId, accountId, vchNo),
    reverseArrival: (companyId: string, accountId: string, vchNo: string) =>
      ipcRenderer.invoke('accountLedger:reverseArrival', companyId, accountId, vchNo),
    reverseSellerBill: (companyId: string, accountId: string, vchNo: string) =>
      ipcRenderer.invoke('accountLedger:reverseSellerBill', companyId, accountId, vchNo),
    reverseStockTransfer: (companyId: string, accountId: string, vchNo: string) =>
      ipcRenderer.invoke('accountLedger:reverseStockTransfer', companyId, accountId, vchNo),
    reverseStockWattak: (companyId: string, accountId: string, vchNo: string) =>
      ipcRenderer.invoke('accountLedger:reverseStockWattak', companyId, accountId, vchNo),
    reverseQuickReceipt: (companyId: string, accountId: string, receiptId: string) =>
      ipcRenderer.invoke('accountLedger:reverseQuickReceipt', companyId, accountId, receiptId),
    reverseQuickPayment: (companyId: string, accountId: string, paymentId: string) =>
      ipcRenderer.invoke('accountLedger:reverseQuickPayment', companyId, accountId, paymentId),
    reverseCrateIssue: (companyId: string, accountId: string, vchNo: string) =>
      ipcRenderer.invoke('accountLedger:reverseCrateIssue', companyId, accountId, vchNo),
    reverseCrateReceive: (companyId: string, accountId: string, vchNo: string) =>
      ipcRenderer.invoke('accountLedger:reverseCrateReceive', companyId, accountId, vchNo)
  },

  // Phase 12: Daily Sale Voucher API
  voucher: {
    create: (data: any) => ipcRenderer.invoke('voucher:create', data),
    listByCompany: (companyId: string) => ipcRenderer.invoke('voucher:listByCompany', companyId),
    list: (companyId: string, filters?: { startDate?: string; endDate?: string }) =>
      ipcRenderer.invoke('voucher:listByDateRange', companyId, filters?.startDate || '', filters?.endDate || ''),
    listByDateRange: (companyId: string, startDate: string, endDate: string) =>
      ipcRenderer.invoke('voucher:listByDateRange', companyId, startDate, endDate),
    get: (id: string) => ipcRenderer.invoke('voucher:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('voucher:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('voucher:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('voucher:bulkDelete', ids)
  },

  // Phase 13.5: Crate Issue API
  crateIssue: {
    create: (data: any) => ipcRenderer.invoke('crateIssue:create', data),
    listByCompany: (companyId: string, options?: { fromDate?: string; toDate?: string }) =>
      ipcRenderer.invoke('crateIssue:listByCompany', companyId, options),
    get: (id: string) => ipcRenderer.invoke('crateIssue:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('crateIssue:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('crateIssue:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('crateIssue:bulkDelete', ids),
    // Phase 13.7: Integration with Quick Sale and Daily Sale
    syncFromQuickSale: (companyId: string, saleDate: string, quickSaleId: string, items: any[]) =>
      ipcRenderer.invoke('crateIssue:syncFromQuickSale', companyId, saleDate, quickSaleId, items),
    deleteByQuickSale: (quickSaleItemIds: string[]) =>
      ipcRenderer.invoke('crateIssue:deleteByQuickSale', quickSaleItemIds),
    syncFromDailySale: (companyId: string, voucherDate: string, voucherNo: string, items: any[]) =>
      ipcRenderer.invoke('crateIssue:syncFromDailySale', companyId, voucherDate, voucherNo, items),
    deleteByDailySale: (voucherItemIds: string[]) =>
      ipcRenderer.invoke('crateIssue:deleteByDailySale', voucherItemIds)
  },

  // Phase 13.5: Crate Receive API
  crateReceive: {
    create: (data: any) => ipcRenderer.invoke('crateReceive:create', data),
    listByCompany: (companyId: string, options?: { fromDate?: string; toDate?: string }) =>
      ipcRenderer.invoke('crateReceive:listByCompany', companyId, options),
    get: (id: string) => ipcRenderer.invoke('crateReceive:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('crateReceive:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('crateReceive:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('crateReceive:bulkDelete', ids)
  },

  // Phase 14.6: Arrival API
  arrival: {
    create: (companyId: string, data: any) => ipcRenderer.invoke('arrival:create', companyId, data),
    list: (companyId: string, filters?: { startDate?: string; endDate?: string; status?: string }) =>
      ipcRenderer.invoke('arrival:list', companyId, filters),
    get: (id: string) => ipcRenderer.invoke('arrival:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('arrival:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('arrival:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('arrival:bulkDelete', ids),
    getNextVoucherNo: (companyId: string) => ipcRenderer.invoke('arrival:getNextVoucherNo', companyId)
  },

  // Phase 15.4: Stock Sale API
  stockSale: {
    create: (companyId: string, data: any) => ipcRenderer.invoke('stockSale:create', companyId, data),
    list: (
      companyId: string,
      filters?: { startDate?: string; endDate?: string; supplierId?: string; storeId?: string; customerId?: string; itemId?: string }
    ) =>
      ipcRenderer.invoke('stockSale:list', companyId, filters),
    get: (id: string) => ipcRenderer.invoke('stockSale:get', id),
    update: (id: string, data: any) => ipcRenderer.invoke('stockSale:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('stockSale:delete', id),
    bulkDelete: (ids: string[]) => ipcRenderer.invoke('stockSale:bulkDelete', ids),
    getNextVoucherNo: (companyId: string, saleDate: string) =>
      ipcRenderer.invoke('stockSale:getNextVoucherNo', companyId, saleDate)
  },

  sellerBill: {
    list: (
      companyId: string,
      filters?: { startDate?: string; endDate?: string; supplierId?: string; mode?: string; search?: string }
    ) => ipcRenderer.invoke('sellerBill:list', companyId, filters),
    get: (id: string) => ipcRenderer.invoke('sellerBill:get', id),
    create: (
      companyId: string,
      payload: SellerBillPayload
    ) => ipcRenderer.invoke('sellerBill:create', companyId, payload),
    update: (
      id: string,
      payload: SellerBillPayload
    ) => ipcRenderer.invoke('sellerBill:update', id, payload),
    delete: (id: string) => ipcRenderer.invoke('sellerBill:delete', id),
    getNextVoucherNo: (companyId: string) =>
      ipcRenderer.invoke('sellerBill:getNextVoucherNo', companyId),
    listVehicles: (companyId: string) =>
      ipcRenderer.invoke('sellerBill:listVehicles', companyId),
    listEligibleSuppliers: (companyId: string) =>
      ipcRenderer.invoke('sellerBill:listEligibleSuppliers', companyId),
    listVehiclesBySupplier: (companyId: string, supplierId: string) =>
      ipcRenderer.invoke('sellerBill:listVehiclesBySupplier', companyId, supplierId),
    listSoldItems: (
      companyId: string,
      params: { supplierId: string; vehicleRef?: string | null; sellerBillId?: string | null }
    ) => ipcRenderer.invoke('sellerBill:listSoldItems', companyId, params)
  },
  stockTransfer: {
    list: (companyId: string, filters?: StockTransferListFilters) =>
      ipcRenderer.invoke('stockTransfer:list', companyId, filters),
    get: (id: string) => ipcRenderer.invoke('stockTransfer:get', id),
    create: (companyId: string, payload: StockTransferPayload) =>
      ipcRenderer.invoke('stockTransfer:create', companyId, payload),
    update: (id: string, payload: StockTransferPayload) =>
      ipcRenderer.invoke('stockTransfer:update', id, payload),
    delete: (id: string) => ipcRenderer.invoke('stockTransfer:delete', id),
    getNextVoucherNo: (companyId: string) =>
      ipcRenderer.invoke('stockTransfer:getNextVoucherNo', companyId)
  },
  stockWattak: {
    list: (companyId: string, filters?: StockWattakListFilters) =>
      ipcRenderer.invoke('stockWattak:list', companyId, filters),
    get: (id: string) => ipcRenderer.invoke('stockWattak:get', id),
    create: (companyId: string, payload: StockWattakPayload) =>
      ipcRenderer.invoke('stockWattak:create', companyId, payload),
    update: (id: string, payload: StockWattakPayload) =>
      ipcRenderer.invoke('stockWattak:update', id, payload),
    delete: (id: string) => ipcRenderer.invoke('stockWattak:delete', id),
    getNextVoucherNo: (companyId: string) =>
      ipcRenderer.invoke('stockWattak:getNextVoucherNo', companyId),
    getAvailableTransfers: (
      companyId: string,
      filters?: { partyId?: string; vehicleNo?: string; challanNo?: string }
    ) => ipcRenderer.invoke('stockWattak:getAvailableTransfers', companyId, filters)
  },
  // Lot Stock API (View)
  lotStock: {
    list: (companyId: string, filters?: { itemId?: string; supplierId?: string; storeId?: string; lotNoVariety?: string }) =>
      ipcRenderer.invoke('lotStock:list', companyId, filters),
    getAvailable: (companyId: string, supplierId: string, itemId: string, storeId: string | null) =>
      ipcRenderer.invoke('lotStock:getAvailable', companyId, supplierId, itemId, storeId),
    summary: (companyId: string, filters?: { supplierId?: string; storeId?: string }) =>
      ipcRenderer.invoke('lotStock:summary', companyId, filters),
    getLotsForItem: (companyId: string, itemId: string, supplierId?: string, storeId?: string | null) =>
      ipcRenderer.invoke('lotStock:getLotsForItem', companyId, itemId, supplierId, storeId)
  },

  // Stock Ledger API (Running Balance)
  stockLedger: {
    getAvailable: (
      companyId: string,
      filters?: {
        supplierId?: string
        itemId?: string
        storeId?: string
        lotNoVariety?: string
        includeZeroAvailable?: boolean
        upToDate?: string
      }
    ) =>
      ipcRenderer.invoke('stockLedger:getAvailable', companyId, filters),
    initialize: (companyId: string) =>
      ipcRenderer.invoke('stockLedger:initialize', companyId)
  },
  reports: {
    saleSummaryCustomerBills: (
      companyId: string,
      filters: { startDate: string; endDate: string }
    ) => ipcRenderer.invoke('reports:saleSummaryCustomerBills', companyId, filters),
    pendingSellerBills: (
      companyId: string,
      filters: {
        startDate?: string
        endDate?: string
        supplierId?: string
        storeId?: string | null
        status?: 'sold' | 'unsold'
        search?: string
      }
    ) => ipcRenderer.invoke('reports:pendingSellerBills', companyId, filters),
    profitabilityReport: (
      companyId: string,
      filters: {
        startDate?: string
        endDate?: string
        supplierId?: string
        storeId?: string | null
        search?: string
      }
    ) => ipcRenderer.invoke('reports:profitabilityReport', companyId, filters)
    ,
    laddanProfitabilityReport: (
      companyId: string,
      filters: {
        startDate?: string
        endDate?: string
        accountId?: string
        search?: string
      }
    ) => ipcRenderer.invoke('reports:laddanProfitabilityReport', companyId, filters)
  },
  
  // Backup & Restore API
  backup: {
    create: (options?: { companyId?: string; location?: string; password?: string; archiveOld?: boolean }) =>
      ipcRenderer.invoke('backup:create', options),
    restore: (filePath: string) => ipcRenderer.invoke('backup:restore', filePath),
    list: (location?: string) => ipcRenderer.invoke('backup:list', location),
    delete: (filePath: string) => ipcRenderer.invoke('backup:delete', filePath),
    selectFolder: () => ipcRenderer.invoke('backup:selectFolder'),
    selectFile: () => ipcRenderer.invoke('backup:selectFile'),
    getDefaultFolder: () => ipcRenderer.invoke('backup:getDefaultFolder'),
    getDefaultBackupPath: () => ipcRenderer.invoke('backup:getDefaultBackupPath'),
    getLastBackupInfo: () => ipcRenderer.invoke('backup:getLastBackupInfo')
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
