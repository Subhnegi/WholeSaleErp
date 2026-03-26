/**
 * Preload Types
 * Types for IPC communication between main and renderer processes
 */

export interface VersionInfo {
  appVersion: string
  dbVersion: string
  setupStatus: string
}

export interface Meta {
  id: number
  key: string
  value: string
  createdAt: Date
  updatedAt: Date
}

export interface UpdateInfo {
  lastCheckDate: Date
  currentVersion: string
  availableVersion?: string
  updateAvailable: boolean
}

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface License {
  licenseKey: string
  startDate: string
  endDate: string
  isTrial: boolean
  status: string
}

export interface AuthData {
  user: User
  license: License
  token: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  error?: string
  data?: T
}

export interface Company {
  id: string
  companyName: string
  printName?: string
  printNameLang?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  countryCode?: string
  mobile1?: string
  mobile2?: string
  email?: string
  website?: string
  contactPerson?: string
  billTitle?: string
  userId: string
  companyPassword?: string
  
  // Financial Year fields (embedded)
  fyStartDate: string | Date
  fyEndDate: string | Date
  fyLabel: string
  
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface EnforcementResult {
  allowed: boolean
  reason?: string
  requiresAction?: 'renew' | 'validate' | 'login'
  daysRemaining?: number
  gracePeriodRemaining?: number
}

export interface GracePeriodStatus {
  inGracePeriod: boolean
  daysRemaining: number
  expiresAt: string | null
}

// API Interfaces
export interface DatabaseAPI {
  getVersionInfo: () => Promise<VersionInfo>
  getMeta: (key: string) => Promise<Meta | null>
  getAllMeta: () => Promise<Meta[]>
  setMeta: (key: string, value: string) => Promise<void>
  getUpdateInfo: () => Promise<UpdateInfo | null>
  saveUpdateInfo: (data: {
    lastCheckDate: Date
    currentVersion: string
    availableVersion?: string
    updateAvailable: boolean
  }) => Promise<void>
}

// ISSUE 2 FIX: Preferences API for DB persistence
export interface PreferencesAPI {
  get: () => Promise<any | null>
  save: (preferences: any) => Promise<{ success: boolean; error?: string }>
}

export interface LicenseAPI {
  register: (data: { name: string; email: string; password: string }) => Promise<ApiResponse<AuthData>>
  login: (data: { email: string; password: string }) => Promise<ApiResponse<AuthData>>
  logout: () => Promise<ApiResponse>
  validate: (licenseKey?: string) => Promise<ApiResponse<{ user: User; license: License }>>
  isLoggedIn: () => Promise<boolean>
  getUserData: () => Promise<AuthData | null>
  isExpired: () => Promise<boolean>
  getDaysRemaining: () => Promise<number>
}

export interface EnforcerAPI {
  checkEnforcement: () => Promise<EnforcementResult>
  forceValidation: () => Promise<{ success: boolean; message: string }>
  getGracePeriodStatus: () => Promise<GracePeriodStatus>
  getLastValidationTime: () => Promise<string | null>
  needsValidation: () => Promise<boolean>
  startupCheck: () => Promise<{ success: boolean; enforcement?: EnforcementResult; error?: string }>
  forceOnlineValidation: () => Promise<{ success: boolean; enforcement?: EnforcementResult; message?: string }>
}

export interface AppAPI {
  getVersion: () => Promise<string>
  checkConnectivity: () => Promise<boolean>
  checkForUpdates: () => Promise<{ success: boolean; error?: string }>
  relaunch: () => void
  quit: () => void
  forceReload: () => Promise<void>
  toggleDevTools: () => Promise<void>
  toggleFullscreen: () => Promise<void>
  zoomIn: () => Promise<void>
  zoomOut: () => Promise<void>
  resetZoom: () => Promise<void>
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  onRequestCloseConfirmation: (callback: () => void) => () => void
  confirmClose: () => void
  cancelClose: () => void
  showAbout: () => Promise<void>
  openExternal: (url: string) => Promise<void>
  openDocumentation: () => Promise<void>
}

export interface CompanyAPI {
  create: (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ApiResponse<Company>>
  list: (userId: string) => Promise<ApiResponse<Company[]>>
  update: (id: string, data: Partial<Company>) => Promise<ApiResponse<Company>>
  delete: (id: string) => Promise<ApiResponse>
}

// Dashboard types
export interface DashboardStats {
  totalSales: number
  totalPurchases: number
  itemCount: number
  customerCount: number
  supplierCount: number
  todaySales: number
  todayPurchases: number
  pendingArrivals: number
  salesTrend: SalesTrendItem[]
  recentActivity: RecentActivity[]
  topItems: TopItem[]
  topCustomers: TopCustomer[]
}

export interface SalesTrendItem {
  date: string
  label: string
  quickSales: number
  stockSales: number
  total: number
}

export interface RecentActivity {
  id: string
  type: 'quick_sale' | 'stock_sale' | 'arrival' | 'receipt' | 'payment'
  description: string
  amount: number
  date: string
  voucherNo: string
}

export interface TopItem {
  id: string
  name: string
  totalKg: number
  totalAmount: number
}

export interface TopCustomer {
  id: string
  name: string
  totalAmount: number
  transactionCount: number
}

export interface DashboardAPI {
  getStats: (companyId: string) => Promise<ApiResponse<DashboardStats>>
}

export interface SyncResult {
  success: boolean
  message: string
  synced: number
  failed: number
  errors?: string[]
}

export interface SyncQueueStatus {
  pending: number
  items: any[]
}

export interface SyncAPI {
  manual: () => Promise<SyncResult>
  getLastSyncTime: () => Promise<ApiResponse<Date | null>>
  getQueueStatus: () => Promise<ApiResponse<SyncQueueStatus>>
  startAutoSync: (intervalHours: number) => Promise<ApiResponse>
  stopAutoSync: () => Promise<ApiResponse>
  schedule: (time: string) => Promise<ApiResponse>
  stopSchedule: () => Promise<ApiResponse>
  // Event listeners - return cleanup functions
  onSyncStarted: (callback: () => void) => () => void
  onSyncProgress: (callback: (data: { step: string; progress: number }) => void) => () => void
  onSyncCompleted: (callback: (data: { success: boolean; synced: number; failed: number }) => void) => () => void
  onSyncFailed: (callback: (data: { error: string }) => void) => () => void
  onSyncQueueUpdated: (callback: (data: { pending: number }) => void) => () => void
}

export interface AccountGroup {
  id: string
  name: string
  parentGroupId: string | null
  level: number
  companyId: string
  createdAt: Date
  updatedAt: Date
  parentGroup?: AccountGroup | null
  childGroups?: AccountGroup[]
  accounts?: Account[]
}

export interface Account {
  id: string
  accountName: string
  code: string | null
  accountGroupId: string
  companyId: string
  openingBalance: number
  drCr: string
  area: string | null
  srNo: string | null
  crLimit: number | null
  nameLang: string | null
  address: string | null
  address2: string | null
  city: string | null
  state: string | null
  panNo: string | null
  mobile1: string | null
  mobile2: string | null
  bankName1: string | null
  accountNo1: string | null
  bankName2: string | null
  accountNo2: string | null
  contactPerson: string | null
  ledgerFolioNo: string | null
  auditUpto: string | null
  maintainBillByBillBalance: boolean
  photo: string | null
  createdAt: Date
  updatedAt: Date
  accountGroup?: AccountGroup
}

export interface AccountGroupAPI {
  create: (data: { name: string; parentGroupId?: string; companyId: string }) => Promise<ApiResponse<AccountGroup>>
  list: (companyId: string) => Promise<ApiResponse<AccountGroup[]>>
  get: (id: string) => Promise<ApiResponse<AccountGroup>>
  update: (id: string, data: { name?: string; parentGroupId?: string }) => Promise<ApiResponse<AccountGroup>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse<{ deletedCount: number; failedCount: number; errors: string[] }>>
}

export interface AccountAPI {
  create: (data: Partial<Account>) => Promise<ApiResponse<Account>>
  listByCompany: (companyId: string) => Promise<ApiResponse<Account[]>>
  listByGroup: (accountGroupId: string) => Promise<ApiResponse<Account[]>>
  get: (id: string) => Promise<ApiResponse<Account>>
  update: (id: string, data: Partial<Account>) => Promise<ApiResponse<Account>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse>
  bulkUpdateGroup: (ids: string[], accountGroupId: string) => Promise<ApiResponse>
}

// Phase 5: Item Types
export interface Item {
  id: string
  companyId: string
  itemName: string
  code: string | null
  printAs: string | null
  printAsLang: string | null
  commission: number
  commissionAsPer: string | null
  marketFees: number
  rdf: number
  bardanaPerNug: number
  laga: number
  wtPerNug: number
  kaatPerNug: number
  maintainCratesInSalePurchase: boolean
  disableWeight: boolean
  photo: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ItemAPI {
  create: (companyId: string, data: Partial<Item>) => Promise<ApiResponse<Item>>
  listByCompany: (companyId: string) => Promise<ApiResponse<Item[]>>
  get: (id: string) => Promise<ApiResponse<Item>>
  update: (id: string, data: Partial<Item>) => Promise<ApiResponse<Item>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse>
}

// Phase 6: CrateMarka Types
export interface CrateMarka {
  id: string
  crateMarkaName: string
  printAs: string | null
  opQty: number
  cost: number
  companyId: string
  createdAt: Date
  updatedAt: Date
}

export interface CrateMarkaAPI {
  create: (companyId: string, data: Partial<CrateMarka>) => Promise<ApiResponse<CrateMarka>>
  listByCompany: (companyId: string) => Promise<ApiResponse<CrateMarka[]>>
  get: (id: string) => Promise<ApiResponse<CrateMarka>>
  update: (id: string, data: Partial<CrateMarka>) => Promise<ApiResponse<CrateMarka>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse>
}

// Phase 7: ArrivalType Types
export interface ArrivalType {
  id: string
  name: string
  purchaseType: 'partyStock' | 'selfPurchase'
  vehicleNoByDefault: string | null
  autoRoundOffAmount: boolean
  askForAdditionalFields: boolean
  requireForwardingAgent: boolean
  requireBroker: boolean
  companyId: string
  createdAt: Date
  updatedAt: Date
}

export interface ArrivalTypeAPI {
  create: (companyId: string, data: Partial<ArrivalType>) => Promise<ApiResponse<ArrivalType>>
  listByCompany: (companyId: string) => Promise<ApiResponse<ArrivalType[]>>
  get: (id: string) => Promise<ApiResponse<ArrivalType>>
  update: (id: string, data: Partial<ArrivalType>) => Promise<ApiResponse<ArrivalType>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse>
}

// Phase 8: Packing Types
export interface Packing {
  id: string
  packingName: string
  calculate: 'nug' | 'weight'
  divideBy: number
  companyId: string
  createdAt: Date
  updatedAt: Date
  synced: boolean
  lastSyncedAt: Date | null
}

export interface Packing {
  id: string
  packingName: string
  calculate: 'nug' | 'weight'
  divideBy: number
  companyId: string
  createdAt: Date
  updatedAt: Date
}

export interface PackingAPI {
  create: (data: Partial<Packing>) => Promise<Packing>
  listByCompany: (companyId: string) => Promise<Packing[]>
  get: (id: string) => Promise<Packing | null>
  update: (id: string, data: Partial<Packing>) => Promise<Packing>
  delete: (id: string) => Promise<{ success: boolean }>
  bulkDelete: (ids: string[]) => Promise<{ success: boolean; deletedCount: number }>
}

export interface Store {
  id: string
  companyId: string
  name: string
  address: string | null
  address2: string | null
  address3: string | null
  contactNo: string | null
  createdAt: Date
  updatedAt: Date
}

export interface StoreAPI {
  create: (data: Partial<Store>) => Promise<Store>
  listByCompany: (companyId: string) => Promise<Store[]>
  get: (id: string) => Promise<Store | null>
  update: (id: string, data: Partial<Store>) => Promise<Store>
  delete: (id: string) => Promise<{ success: boolean }>
  bulkDelete: (ids: string[]) => Promise<{ success: boolean; deletedCount: number }>
}

export interface BackupFile {
  id: string
  name: string
  path: string
  size: string
  date: Date
  location: 'local' | 'custom'
}

export interface BackupResult {
  success: boolean
  filePath?: string
  message?: string
  recordsBackedUp?: number
}

export interface RestoreResult {
  success: boolean
  message: string
  recordsRestored: number
  errors?: string[]
}

export interface BackupAPI {
  create: (options?: { 
    companyId?: string
    location?: string
    password?: string
    archiveOld?: boolean
  }) => Promise<BackupResult>
  restore: (filePath: string) => Promise<RestoreResult>
  list: (location?: string) => Promise<{ success: boolean; backups: BackupFile[]; message?: string }>
  delete: (filePath: string) => Promise<{ success: boolean; message: string }>
  selectFolder: () => Promise<{ success: boolean; path?: string; message?: string }>
  selectFile: () => Promise<{ success: boolean; path?: string; message?: string }>
  getDefaultFolder: () => Promise<{ success: boolean; path?: string; message?: string }>
  getDefaultBackupPath: () => Promise<{ success: boolean; path?: string; message?: string }>
  getLastBackupInfo: () => Promise<{ success: boolean; lastBackup?: string; message?: string }>
}

// Phase 10: Quick Sale Types
export interface QuickSale {
  id: string
  companyId: string
  saleDate: string // ISO date string
  totalItems: number
  totalCrates: number
  totalNug: number
  totalWeight: number
  basicAmount: number
  commissionExpenses: number
  totalSaleAmount: number
  voucherNo?: string
  createdAt: Date
  updatedAt: Date
  items?: QuickSaleItem[]
}

export interface QuickSaleItem {
  id: string
  quickSaleId: string
  itemId: string
  itemName: string
  accountId: string
  accountName: string
  nug: number
  kg: number
  rate: number
  per: 'nug' | 'kg'
  basicAmount: number
  totalAmount: number
  crateMarkaId: string | null
  crateMarkaName: string | null
  crateQty: number | null
  crateRate: number | null
  crateValue: number | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateQuickSaleInput {
  companyId: string
  saleDate: string
  items: CreateQuickSaleItemInput[]
  voucherNo?: string
}

export interface CreateQuickSaleItemInput {
  itemId: string
  itemName: string
  accountId: string
  accountName: string
  nug: number
  kg: number
  rate: number
  per: 'nug' | 'kg'
  basicAmount: number
  totalAmount: number
  crateMarkaId?: string
  crateMarkaName?: string
  crateQty?: number
  crateRate?: number
  crateValue?: number
}

export interface UpdateQuickSaleInput {
  saleDate?: string
  items?: CreateQuickSaleItemInput[]
  voucherNo?: string
}

export interface QuickSaleAPI {
  create: (data: CreateQuickSaleInput) => Promise<ApiResponse<QuickSale>>
  listByCompany: (companyId: string) => Promise<ApiResponse<QuickSale[]>>
  listByDateRange: (companyId: string, startDate: string, endDate: string) => Promise<ApiResponse<QuickSale[]>>
  get: (id: string) => Promise<ApiResponse<QuickSale>>
  update: (id: string, data: UpdateQuickSaleInput) => Promise<ApiResponse<QuickSale>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse<{ deletedCount: number }>>
  getNextVoucherNo: (companyId: string, saleDate: string) => Promise<ApiResponse<string>>
}

// Phase 18: Quick Receipt Types
export interface QuickReceipt {
  id: string
  companyId: string
  amount: number
  discount: number
  totalAmount: number
  createdAt: Date
  updatedAt: Date
  items?: QuickReceiptItem[]
}

export interface QuickReceiptItem {
  id: string
  quickReceiptId: string
  receiptId: string | null
  accountId: string
  amount: number
  discount: number
  totalAmount: number
  remarks: string | null
  paymentMode: 'cash' | 'cheque' | 'upi' | 'banktransfer' | null
  dateOfTransaction: string | null
  accountNo: string | null
  chequeNo: string | null
  transactionId: string | null
  upiId: string | null
  bank: string | null
  branch: string | null
  ifscNo: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateQuickReceiptInput {
  companyId: string
  receiptDate: string
  items: CreateQuickReceiptItemInput[]
}

export interface CreateQuickReceiptItemInput {
  receiptId: string
  accountId: string
  amount: number
  discount: number
  totalAmount: number
  remarks?: string | null
  paymentMode?: 'cash' | 'cheque' | 'upi' | 'banktransfer'
  dateOfTransaction?: string | null
  accountNo?: string | null
  chequeNo?: string | null
  transactionId?: string | null
  upiId?: string | null
  bank?: string | null
  branch?: string | null
  ifscNo?: string | null
}

export interface UpdateQuickReceiptInput {
  receiptDate?: string
  items?: CreateQuickReceiptItemInput[]
}

export interface QuickReceiptAPI {
  create: (data: CreateQuickReceiptInput) => Promise<ApiResponse<QuickReceipt>>
  listByCompany: (companyId: string) => Promise<ApiResponse<QuickReceipt[]>>
  listByDateRange: (companyId: string, startDate: string, endDate: string) => Promise<ApiResponse<QuickReceipt[]>>
  get: (id: string) => Promise<ApiResponse<QuickReceipt>>
  update: (id: string, data: UpdateQuickReceiptInput) => Promise<ApiResponse<QuickReceipt>>
  delete: (id: string) => Promise<ApiResponse>
  deleteMany: (ids: string[]) => Promise<ApiResponse>
}

// Quick Payment types (Phase 18.3)
export interface QuickPayment {
  id: string
  companyId: string
  amount: number
  discount: number
  totalAmount: number
  createdAt: Date
  updatedAt: Date
  items?: QuickPaymentItem[]
}

export interface QuickPaymentItem {
  id: string
  quickPaymentId: string
  paymentId: string | null
  accountId: string
  amount: number
  discount: number
  totalAmount: number
  remarks: string | null
  paymentMode: 'cash' | 'cheque' | 'upi' | 'banktransfer' | null
  dateOfTransaction: Date | null
  accountNo: string | null
  chequeNo: string | null
  transactionId: string | null
  upiId: string | null
  bank: string | null
  branch: string | null
  ifscNo: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateQuickPaymentInput {
  companyId: string
  paymentDate: string
  items: CreateQuickPaymentItemInput[]
}

export interface CreateQuickPaymentItemInput {
  paymentId: string
  accountId: string
  amount: number
  discount: number
  totalAmount: number
  remarks?: string | null
  paymentMode?: 'cash' | 'cheque' | 'upi' | 'banktransfer'
  dateOfTransaction?: string | null
  accountNo?: string | null
  chequeNo?: string | null
  transactionId?: string | null
  upiId?: string | null
  bank?: string | null
  branch?: string | null
  ifscNo?: string | null
}

export interface UpdateQuickPaymentInput {
  paymentDate?: string
  items?: CreateQuickPaymentItemInput[]
}

export interface QuickPaymentAPI {
  create: (data: CreateQuickPaymentInput) => Promise<ApiResponse<QuickPayment>>
  listByCompany: (companyId: string) => Promise<ApiResponse<QuickPayment[]>>
  listByDateRange: (companyId: string, startDate: string, endDate: string) => Promise<ApiResponse<QuickPayment[]>>
  get: (id: string) => Promise<ApiResponse<QuickPayment>>
  update: (id: string, data: UpdateQuickPaymentInput) => Promise<ApiResponse<QuickPayment>>
  delete: (id: string) => Promise<ApiResponse>
  deleteMany: (ids: string[]) => Promise<ApiResponse>
}

// Voucher (Daily Sale) types
export interface Voucher {
  id: string
  voucherNo: string // Changed from number to string
  voucherDate: string
  companyId: string
  
  // Supplier (Party) info
  supplierId: string
  supplierName: string
  
  // Legacy fields for backward compatibility
  accountId?: string
  accountName?: string
  vehicleNo?: string
  
  // Summary fields from Item Entry
  totalItems: number
  totalNug: number // Changed from totalQuantity
  totalWeight: number
  totalBasicAmount: number // Changed from subTotal
  expenseAmount: number // Changed from totalExpenses
  commissionAmount: number
  buyersAmount: number
  sellersItemValue: number
  
  // Charges fields
  totalOtherCharges: number // Changed from totalCharges
  transport: number
  freight: number
  grRrNo?: string | null
  narration?: string | null
  advancePayment: number
  roundoff: number
  
  // Final totals
  totalAmount: number // Changed from grandTotal
  
  // Legacy fields for backward compatibility
  totalQuantity?: number
  totalCrates?: number
  subTotal?: number
  totalExpenses?: number
  totalCharges?: number
  grandTotal?: number
  commission?: number
  marketFees?: number
  rdf?: number
  bardana?: number
  laga?: number
  chargeOneLabel?: string
  chargeOne?: number
  chargeTwoLabel?: string
  chargeTwo?: number
  chargeThreeLabel?: string
  chargeThree?: number
  chargeFourLabel?: string
  chargeFour?: number
  chargeFiveLabel?: string
  chargeFive?: number
  notes?: string
  
  createdAt: string // Changed from Date to string
  updatedAt: string // Changed from Date to string
  items?: VoucherItem[]
  charges?: VoucherCharge[]
}

export interface VoucherItem {
  id: string
  voucherId: string
  itemId: string
  itemName?: string
  customerId: string
  customerName: string
  
  netRate: boolean
  nug: number
  weight: number
  customerPrice: number
  supplierPrice: number
  per?: 'nug' | 'kg'
  
  basicAmount: number
  netAmount: number
  
  commission: number
  commissionPer: number
  marketFees: number
  rdf: number
  bardana: number
  bardanaAt: number
  laga: number
  lagaAt: number
  
  crateMarkaId?: string | null
  crateMarkaName?: string | null
  crateQty?: number | null
  crateRate?: number | null
  crateValue?: number | null
  
  // sellerItemValue removed: computed from supplierPrice * nug/weight when needed
  
  // Legacy fields
  arrivalTypeId?: string
  arrivalTypeName?: string
  quantity?: number
  crates?: number
  customerRate?: number
  customerAmount?: number
  customerRetail?: number
  supplierRate?: number
  supplierAmount?: number
  supplierRetail?: number
  useNetRate?: boolean
  totalExpenses?: number
  cratesTotalQuantity?: number
  cratesAadQuantity?: number
  cratesPerCrate?: number
  cratesPurQuantity?: number
  cratesPurAmount?: number
  notes?: string
  
  createdAt: string
  updatedAt: string
}

export interface VoucherCharge {
  id: string
  voucherId: string
  otherChargesId?: string | null // References OtherChargesHead
  chargesHeadName?: string // Denormalized name from OtherChargesHead
  chargeName: string
  onValue: number
  per?: number | null
  atRate: number
  no?: number | null
  plusMinus: string
  amount: number
  
  // Legacy fields
  label?: string
  isAddition?: boolean
  appliedAmount?: number
  
  createdAt: string
  updatedAt: string
}

export interface CreateVoucherItemInput {
  itemId: string
  itemName: string
  customerId: string
  customerName: string
  
  netRate: boolean
  nug: number
  weight: number
  customerPrice: number
  supplierPrice: number
  per: string
  basicAmount: number
  netAmount: number
  
  commission: number
  commissionPer: number
  marketFees: number
  rdf: number
  bardana: number
  bardanaAt: number
  laga: number
  lagaAt: number
  
  crateMarkaId?: string | null
  crateMarkaName?: string | null
  crateQty?: number | null
  crateRate?: number | null
  crateValue?: number | null
  
  // sellerItemValue removed from Create input; server computes it from supplierPrice * nug/weight
}

export interface CreateVoucherChargeInput {
  otherChargesId?: string | null // References OtherChargesHead (optional)
  chargeName: string // Fallback when otherChargesId is null
  onValue: number
  per?: number | null
  atRate: number
  no?: number | null
  plusMinus: string
  amount: number
}

export interface CreateVoucherInput {
  companyId: string
  voucherDate: string
  supplierId: string
  supplierName: string
  transport?: number
  freight?: number
  grRrNo?: string
  narration?: string
  vehicleNo?: string
  advancePayment?: number
  roundoff?: number
  items: CreateVoucherItemInput[]
  charges?: CreateVoucherChargeInput[]
}

export interface UpdateVoucherInput {
  voucherDate?: string
  supplierId?: string
  supplierName?: string
  transport?: number
  freight?: number
  grRrNo?: string
  narration?: string
  vehicleNo?: string
  advancePayment?: number
  roundoff?: number
  items?: CreateVoucherItemInput[]
  charges?: CreateVoucherChargeInput[]
}

export interface VoucherFilters {
  startDate?: string
  endDate?: string
  search?: string
}

export interface VoucherAPI {
  create: (data: CreateVoucherInput) => Promise<ApiResponse<Voucher>>
  list: (companyId: string, filters?: VoucherFilters) => Promise<ApiResponse<Voucher[]>>
  listByDateRange: (companyId: string, startDate: string, endDate: string) => Promise<ApiResponse<Voucher[]>>
  get: (id: string) => Promise<ApiResponse<Voucher>>
  update: (id: string, data: UpdateVoucherInput) => Promise<ApiResponse<Voucher>>
  delete: (id: string) => Promise<ApiResponse>
  export: (ids: string[]) => Promise<ApiResponse>
  import: () => Promise<ApiResponse>
}

// Crate Issue/Receive types
export interface CrateIssueItem {
  id?: string
  slipNo?: string
  accountId: string
  crateMarkaId: string
  qty: number
  remarks?: string
}

export interface CrateIssue {
  id: string
  companyId: string
  issueDate: string
  totalQty: number
  totalCrateAmount: number
  items?: CrateIssueItem[]
}

export interface CreateCrateIssueInput {
  companyId: string
  issueDate: string
  items: CrateIssueItem[]
}

export interface CrateIssueAPI {
  create: (data: CreateCrateIssueInput) => Promise<ApiResponse<CrateIssue>>
  listByCompany: (companyId: string, options?: { fromDate?: string; toDate?: string }) => Promise<ApiResponse<CrateIssue[]>>
  get: (id: string) => Promise<ApiResponse<CrateIssue>>
  update: (id: string, data: any) => Promise<ApiResponse<CrateIssue>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse>
}

export interface CrateReceiveItem {
  id?: string
  slipNo?: string
  accountId: string
  crateMarkaId: string
  qty: number
  remarks?: string
}

export interface CrateReceive {
  id: string
  companyId: string
  receiveDate: string
  totalQty: number
  totalCrateAmount: number
  items?: CrateReceiveItem[]
}

export interface CreateCrateReceiveInput {
  companyId: string
  receiveDate: string
  items: CrateReceiveItem[]
}

export interface CrateReceiveAPI {
  create: (data: CreateCrateReceiveInput) => Promise<ApiResponse<CrateReceive>>
  listByCompany: (companyId: string, options?: { fromDate?: string; toDate?: string }) => Promise<ApiResponse<CrateReceive[]>>
  get: (id: string) => Promise<ApiResponse<CrateReceive>>
  update: (id: string, data: any) => Promise<ApiResponse<CrateReceive>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse>
}

// Phase 14.4: OtherChargesHead Types
export interface OtherChargesHead {
  id: string
  companyId: string
  headingName: string
  printAs: string | null
  accountHeadId: string | null
  chargeType: 'plus' | 'minus'
  feedAs: 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti'
  createdAt: Date
  updatedAt: Date
}

export interface OtherChargesHeadCreateInput {
  headingName: string
  printAs?: string | null
  accountHeadId?: string | null
  chargeType: 'plus' | 'minus'
  feedAs: 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti'
}

export interface OtherChargesHeadUpdateInput {
  headingName?: string
  printAs?: string | null
  accountHeadId?: string | null
  chargeType?: 'plus' | 'minus'
  feedAs?: 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti'
}

export interface OtherChargesHeadAPI {
  create: (companyId: string, data: OtherChargesHeadCreateInput) => Promise<ApiResponse<OtherChargesHead>>
  listByCompany: (companyId: string) => Promise<ApiResponse<OtherChargesHead[]>>
  get: (id: string) => Promise<ApiResponse<OtherChargesHead>>
  update: (id: string, data: OtherChargesHeadUpdateInput) => Promise<ApiResponse<OtherChargesHead>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse<{ deletedCount: number; failedCount: number; errors: string[] }>>
}

// Phase 14.6: Arrival Types
export interface ArrivalItem {
  id: string
  arrivalId: string
  itemId: string
  itemName?: string
  lotNoVariety: string | null
  nug: number
  kg: number
  rate: number | null
  crateMarkaId: string | null
  crateMarkaName: string | null
  crateQty: number | null
  crateRate: number | null
  crateValue: number | null
  createdAt: Date
  updatedAt: Date
}

export interface ArrivalCharges {
  id: string
  arrivalId: string
  otherChargesId: string
  chargesHeadName?: string
  onValue: number | null
  per: number | null
  atRate: number | null
  no: number | null
  plusMinus: '+' | '-'
  amount: number
  createdAt: Date
  updatedAt: Date
}

export interface Arrival {
  id: string
  companyId: string
  date: string
  voucherNo: string
  arrivalTypeId: string
  arrivalTypeName?: string
  vehicleChallanNo: string
  partyId: string
  partyName?: string
  storeId: string | null
  storeName?: string
  transport: string | null
  challanNo: string | null
  remarks: string | null
  forwardingAgentId: string | null
  forwardingAgentName?: string
  totalNug: number
  totalKg: number
  basicAmt: number
  charges: number
  netAmt: number
  status: 'pending' | 'sold' | 'partial'
  soldNug?: number
  balanceNug?: number
  createdAt: Date
  updatedAt: Date
  items?: ArrivalItem[]
  arrivalCharges?: ArrivalCharges[]
}

export interface ArrivalListFilters {
  startDate?: string
  endDate?: string
  arrivalTypeId?: string
  partyId?: string
  storeId?: string
  status?: 'pending' | 'sold' | 'partial'
}

export interface ArrivalAPI {
  create: (companyId: string, data: Partial<Arrival>) => Promise<ApiResponse<Arrival>>
  list: (companyId: string, filters?: ArrivalListFilters) => Promise<ApiResponse<Arrival[]>>
  get: (id: string) => Promise<ApiResponse<Arrival>>
  update: (id: string, data: Partial<Arrival>) => Promise<ApiResponse<Arrival>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse<{ deletedCount: number; failedCount: number; errors: string[] }>>
  getNextVoucherNo: (companyId: string) => Promise<ApiResponse<string>>
}

// ========================
// Phase 15.4: Stock Sale Types
// ========================

export interface StockSaleItem {
  id: string
  stockSaleId: string
  itemId: string
  customerId: string
  lotNo: string
  nug: number
  kg: number
  rate: number
  customerRate: number
  supplierRate: number
  per: string
  basicAmount: number
  netAmount: number
  commission: number
  commissionPer: number
  marketFees: number
  rdf: number
  bardana: number
  bardanaAt: number
  laga: number
  lagaAt: number
  crateMarkaId?: string
  crateMarkaName?: string
  crateQty?: number
  crateRate?: number
  crateValue?: number
  createdAt: string
  updatedAt: string
  item?: Item
  customer?: Account
  crateMarka?: CrateMarka
}

export interface StockSale {
  id: string
  companyId: string
  date: string
  voucherNo?: string
  supplierId: string
  storeId: string
  totalNug: number
  totalKg: number
  basicAmount: number
  supplierAmount: number
  customerAmount: number
  createdAt: string
  updatedAt: string
  items?: StockSaleItem[]
  supplier?: Account
  store?: Store
  supplierName?: string
  storeName?: string
}

export interface StockSaleListFilters {
  startDate?: string
  endDate?: string
  supplierId?: string
  storeId?: string
  customerId?: string
  itemId?: string
}

export interface StockSaleAPI {
  create: (companyId: string, data: Partial<StockSale>) => Promise<ApiResponse<StockSale>>
  list: (companyId: string, filters?: StockSaleListFilters) => Promise<ApiResponse<StockSale[]>>
  get: (id: string) => Promise<ApiResponse<StockSale>>
  update: (id: string, data: Partial<StockSale>) => Promise<ApiResponse<StockSale>>
  delete: (id: string) => Promise<ApiResponse>
  bulkDelete: (ids: string[]) => Promise<ApiResponse<{ deletedCount: number; failedCount: number; errors: string[] }>>
  getNextVoucherNo: (companyId: string, saleDate: string) => Promise<ApiResponse<string>>
}

// ===== Seller Bill Types (Phase 16.3) =====
export interface SellerBillItem {
  id: string
  sellerBillId: string
  stockSaleItemId?: string | null
  itemId: string
  itemName?: string
  lotNo?: string | null
  nug: number
  kg: number
  rate: number
  per: string
  amount: number
  createdAt: string
  updatedAt: string
}

export interface SellerBillCharge {
  id: string
  sellerBillId: string
  otherChargesId: string
  chargesHeadName?: string
  arrivalChargeId?: string | null
  onValue: number | null
  per: number | null
  atRate: number | null
  no: number | null
  plusMinus: string
  amount: number
  createdAt: string
  updatedAt: string
}

export interface SellerBill {
  id: string
  companyId: string
  accountId: string
  accountName?: string
  vchNo: string
  mode?: string | null
  vehicleNo?: string | null
  stockSaleId?: string | null
  stockSaleVoucherNo?: string | null
  saleDate?: string
  totalNug: number
  totalKg: number
  basicAmount: number
  arrivalExpenses: number
  charges: number
  roundOff?: number
  netAmount: number
  createdAt: string
  updatedAt: string
  items?: SellerBillItem[]
  chargeLines?: SellerBillCharge[]
}

export interface SellerBillListTotals {
  totalBills: number
  totalNug: number
  totalKg: number
  totalBasicAmount: number
  totalArrivalExpenses: number
  totalCharges: number
  totalNetAmount: number
}

export interface SellerBillListResponse {
  bills: SellerBill[]
  totals: SellerBillListTotals
}
export interface SellerBillSoldItem {
  stockSaleItemId: string
  stockSaleId: string
  stockSaleVoucherNo: string | null
  stockSaleDate: string | null
  itemId: string
  itemName: string
  lotNo: string
  per: 'nug' | 'kg'
  nug: number
  kg: number
  rate: number
  amount: number
}

export interface SellerBillArrivalCharge {
  id: string
  arrivalId: string
  otherChargesId: string
  chargesHeadName: string
  onValue: number | null
  per: number | null
  atRate: number | null
  no: number | null
  plusMinus: '+' | '-'
  amount: number
}

export interface SellerBillAutoPopulateData {
  items: SellerBillSoldItem[]
  arrivalCharges: SellerBillArrivalCharge[]
}


export interface SellerBillListFilters {
  startDate?: string
  endDate?: string
  supplierId?: string
  mode?: string
  search?: string
}

export interface SellerBillItemInput {
  id?: string
  stockSaleItemId?: string | null
  itemId: string
  lotNo?: string | null
  nug: number
  kg: number
  rate: number
  per: string
  amount?: number
}

export interface SellerBillChargeInput {
  id?: string
  otherChargesId: string
  arrivalChargeId?: string | null
  onValue?: number | null
  per?: number | null
  atRate?: number | null
  no?: number | null
  plusMinus?: '+' | '-'
  amount: number
}

export interface SellerBillPayload {
  accountId: string
  vchNo?: string
  voucherNo?: string
  mode?: string | null
  vehicleNo?: string | null
  stockSaleId?: string | null
  items: SellerBillItemInput[]
  chargeLines: SellerBillChargeInput[]
  arrivalExpenses?: number
  roundOff?: number
  billDate?: string
}

export interface SellerBillSupplier {
  id: string
  name: string
}

export interface SellerBillAPI {
  list: (companyId: string, filters?: SellerBillListFilters) => Promise<ApiResponse<SellerBillListResponse>>
  get: (id: string) => Promise<ApiResponse<SellerBill>>
  create: (companyId: string, payload: SellerBillPayload) => Promise<ApiResponse<SellerBill>>
  update: (id: string, payload: SellerBillPayload) => Promise<ApiResponse<SellerBill>>
  delete: (id: string) => Promise<ApiResponse<void>>
  getNextVoucherNo: (companyId: string) => Promise<ApiResponse<string>>
  listVehicles: (companyId: string) => Promise<ApiResponse<string[]>>
  listEligibleSuppliers: (companyId: string) => Promise<ApiResponse<SellerBillSupplier[]>>
  listVehiclesBySupplier: (companyId: string, supplierId: string) => Promise<ApiResponse<string[]>>
  listSoldItems: (
    companyId: string,
    params: { supplierId: string; vehicleRef?: string | null; sellerBillId?: string | null }
  ) => Promise<ApiResponse<SellerBillAutoPopulateData>>
}

// ===== Stock Transfer Types (Phase 17) =====
export interface StockTransferItem {
  id: string
  stockTransferId: string
  itemId: string
  itemName?: string
  lotNo?: string | null
  nug: number
  kg: number
  rate: number
  per: 'nug' | 'kg'
  basicAmount: number
  createdAt: string
  updatedAt: string
}

export interface StockTransferCharge {
  id: string
  stockTransferId: string
  otherChargesId: string
  chargesHeadName?: string
  onValue: number | null
  per: number | null
  atRate: number | null
  no: number | null
  plusMinus: '+' | '-'
  amount: number
  createdAt: string
  updatedAt: string
}

export interface StockTransfer {
  id: string
  companyId: string
  accountId: string
  accountName?: string
  vchNo: string
  vehicleNo?: string | null
  challanNo?: string | null
  remarks?: string | null
  driverName?: string | null
  fromLocation?: string | null
  toLocation?: string | null
  freightAmount: number
  advanceAmount: number
  totalOurCost: number
  totalOurRate: number
  totalNug: number
  totalWt: number
  basicAmount: number
  totalCharges: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  items?: StockTransferItem[]
  chargeLines?: StockTransferCharge[]
}

export interface StockTransferListTotals {
  totalTransfers: number
  totalNug: number
  totalWt: number
  totalBasicAmount: number
  totalCharges: number
  totalAmount: number
  totalFreightAmount: number
  totalAdvanceAmount: number
  totalOurCost: number
  totalOurRate: number
}

export interface StockTransferListResponse {
  transfers: StockTransfer[]
  totals: StockTransferListTotals
}

export interface StockTransferListFilters {
  startDate?: string
  endDate?: string
  accountId?: string
  search?: string
}

export interface StockTransferItemInput {
  id?: string
  itemId: string
  lotNo?: string | null
  nug: number
  kg: number
  rate: number
  per: 'nug' | 'kg'
  basicAmount?: number
}

export interface StockTransferChargeInput {
  id?: string
  otherChargesId: string
  onValue?: number | null
  per?: number | null
  atRate?: number | null
  no?: number | null
  plusMinus?: '+' | '-'
  amount: number
}

export interface StockTransferPayload {
  accountId: string
  vchNo?: string
  vehicleNo?: string | null
  challanNo?: string | null
  remarks?: string | null
  driverName?: string | null
  fromLocation?: string | null
  toLocation?: string | null
  freightAmount?: number
  advanceAmount?: number
  totalOurCost?: number
  totalNug?: number
  totalWt?: number
  basicAmount?: number
  totalCharges?: number
  totalAmount?: number
  items: StockTransferItemInput[]
  chargeLines: StockTransferChargeInput[]
}

export interface StockTransferAPI {
  list: (
    companyId: string,
    filters?: StockTransferListFilters
  ) => Promise<ApiResponse<StockTransferListResponse>>
  get: (id: string) => Promise<ApiResponse<StockTransfer>>
  create: (companyId: string, payload: StockTransferPayload) => Promise<ApiResponse<StockTransfer>>
  update: (id: string, payload: StockTransferPayload) => Promise<ApiResponse<StockTransfer>>
  delete: (id: string) => Promise<ApiResponse<void>>
  getNextVoucherNo: (companyId: string) => Promise<ApiResponse<string>>
}

// ===== Stock Wattak Types (Phase 17.5 / 17.6) =====
export interface StockWattakItem {
  id: string
  stockWattakId: string
  itemId: string
  itemName?: string
  lotNo?: string | null
  nug: number
  wt: number
  rate: number
  per: 'nug' | 'kg'
  basicAmount: number
  issuedNug: number
  balanceNug: number
  createdAt: string
  updatedAt: string
}

export interface StockWattakCharge {
  id: string
  stockWattakId: string
  otherChargesId: string
  chargesHeadName?: string
  onValue: number | null
  per: number | null
  atRate: number | null
  no: number | null
  plusMinus: '+' | '-'
  amount: number
  createdAt: string
  updatedAt: string
}

export interface StockWattak {
  id: string
  companyId: string
  partyId: string
  partyName?: string
  vchNo: string
  vehicleNo?: string | null
  challanNo?: string | null
  totalNug: number
  totalWt: number
  basicAmount: number
  totalCharges: number
  roundOff: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  items?: StockWattakItem[]
  chargeLines?: StockWattakCharge[]
}

export interface StockWattakTotals {
  totalWattaks: number
  totalNug: number
  totalWt: number
  totalBasicAmount: number
  totalCharges: number
  totalRoundOff: number
  totalAmount: number
}

export interface StockWattakListResponse {
  wattaks: StockWattak[]
  totals: StockWattakTotals
}

export interface StockWattakListFilters {
  startDate?: string
  endDate?: string
  partyId?: string
  search?: string
}

export interface StockWattakItemInput {
  id?: string
  stockTransferId?: string  // Link to source stock transfer
  itemId: string
  lotNo?: string | null
  nug: number
  wt: number
  rate: number
  per?: 'nug' | 'kg'
  basicAmount?: number
  issuedNug?: number
  balanceNug?: number
}

export interface StockWattakChargeInput {
  id?: string
  otherChargesId: string
  onValue?: number | null
  per?: number | null
  atRate?: number | null
  no?: number | null
  plusMinus?: '+' | '-'
  amount?: number
}

export interface StockWattakPayload {
  partyId: string
  vchNo?: string
  vehicleNo?: string | null
  challanNo?: string | null
  totalNug?: number
  totalWt?: number
  basicAmount?: number
  totalCharges?: number
  roundOff?: number
  totalAmount?: number
  items?: StockWattakItemInput[]
  chargeLines?: StockWattakChargeInput[]
}

export interface StockWattakAPI {
  list: (
    companyId: string,
    filters?: StockWattakListFilters
  ) => Promise<ApiResponse<StockWattakListResponse>>
  get: (id: string) => Promise<ApiResponse<StockWattak>>
  create: (companyId: string, payload: StockWattakPayload) => Promise<ApiResponse<StockWattak>>
  update: (id: string, payload: StockWattakPayload) => Promise<ApiResponse<StockWattak>>
  delete: (id: string) => Promise<ApiResponse<void>>
  getNextVoucherNo: (companyId: string) => Promise<ApiResponse<string>>
  getAvailableTransfers: (
    companyId: string,
    filters?: { partyId?: string; vehicleNo?: string; challanNo?: string; excludeWattakId?: string }
  ) => Promise<ApiResponse<any[]>>  // Returns transfers with remaining quantities from ledger
}

export interface PendingSellerBillRow {
  arrivalId: string
  date: string
  voucherNo: string
  vehicleNo: string | null
  challanNo: string | null
  supplierId: string
  supplierName: string
  storeId: string | null
  storeName: string | null
  status: 'sold' | 'unsold'
  nug: number
  kg: number
  wattakAmount: number
}

export interface PendingSellerBillTotals {
  totalRecords: number
  totalSoldNug: number
  totalSoldKg: number
  totalUnsoldNug: number
  totalUnsoldKg: number
  totalWattakAmount: number
}

export interface PendingSellerBillResponse {
  rows: PendingSellerBillRow[]
  totals: PendingSellerBillTotals
}

export interface ProfitabilityReportRow {
  arrivalId: string
  date: string
  voucherNo: string
  vehicleNo: string | null
  challanNo: string | null
  supplierId: string
  supplierName: string
  storeId: string | null
  storeName: string | null
  nugReceived: number
  nugSold: number
  nugTransferred: number
  balanceNug: number
  kgReceived: number
  kgSold: number
  kgTransferred: number
  actualSaleAmount: number
  sellerBillAmount: number
  profitLossAmount: number
  transferStatus: 'none' | 'partial' | 'full'
}

export interface ProfitabilityReportTotals {
  totalRecords: number
  totalNugReceived: number
  totalNugSold: number
  totalNugTransferred: number
  totalBalanceNug: number
  totalKgReceived: number
  totalKgSold: number
  totalKgTransferred: number
  totalActualSaleAmount: number
  totalSellerBillAmount: number
  totalProfitLossAmount: number
}

export interface ProfitabilityReportResponse {
  rows: ProfitabilityReportRow[]
  totals: ProfitabilityReportTotals
}

export interface LaddanProfitabilityReportRow {
  transferId: string
  date: string
  voucherNo: string
  vehicleNo: string | null
  challanNo: string | null
  accountId: string
  accountName: string
  nugReceived: number
  nugSold: number
  balanceNug: number
  kgReceived: number
  kgSold: number
  actualSaleAmount: number
  sellerBillAmount: number
  profitLossAmount: number
}

export interface LaddanProfitabilityReportTotals {
  totalRecords: number
  totalNugReceived: number
  totalNugSold: number
  totalBalanceNug: number
  totalKgReceived: number
  totalKgSold: number
  totalActualSaleAmount: number
  totalSellerBillAmount: number
  totalProfitLossAmount: number
}

export interface LaddanProfitabilityReportResponse {
  rows: LaddanProfitabilityReportRow[]
  totals: LaddanProfitabilityReportTotals
}

export interface SaleSummaryRow {
  id: string
  source: string
  sourceLabel: string
  referenceId: string
  date: string
  voucherNo: string
  customerId: string | null
  customerName: string
  itemId: string | null
  itemName: string
  nug: number
  kg: number
  rate: number
  per: string
  basicAmount: number
  expenses: number
  amount: number
  supplierName?: string | null
  storeName?: string | null
}

export interface SaleSummaryTotals {
  totalRows: number
  totalNug: number
  totalKg: number
  totalBasicAmount: number
  totalExpenses: number
  totalAmount: number
}

export interface SaleSummaryResponse {
  rows: SaleSummaryRow[]
  totals: SaleSummaryTotals
}

export interface ReportsAPI {
  saleSummaryCustomerBills: (
    companyId: string,
    filters: { startDate: string; endDate: string }
  ) => Promise<ApiResponse<SaleSummaryResponse>>
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
  ) => Promise<ApiResponse<PendingSellerBillResponse>>
  profitabilityReport: (
    companyId: string,
    filters: {
      startDate?: string
      endDate?: string
      supplierId?: string
      storeId?: string | null
      search?: string
    }
  ) => Promise<ApiResponse<ProfitabilityReportResponse>>
  laddanProfitabilityReport: (
    companyId: string,
    filters: {
      startDate?: string
      endDate?: string
      accountId?: string
      search?: string
    }
  ) => Promise<ApiResponse<LaddanProfitabilityReportResponse>>
}

// ===== Lot Stock Types (Phase 15 - View) =====
export interface LotStock {
  itemId: string
  lotNoVariety: string | null
  supplierId: string
  storeId: string | null
  companyId: string
  arrivalDate: string
  totalNug: number
  totalKg: number
  soldNug: number
  soldKg: number
  availableNug: number
  availableKg: number
}

export interface LotStockFilters {
  itemId?: string
  supplierId?: string
  storeId?: string
  lotNoVariety?: string
}

export interface LotStockSummary {
  itemId: string
  supplierId: string
  storeId: string | null
  totalAvailableNug: number
  totalAvailableKg: number
  lotCount: number
}

export interface LotStockAPI {
  list: (companyId: string, filters?: LotStockFilters) => Promise<ApiResponse<LotStock[]>>
  getAvailable: (companyId: string, supplierId: string, itemId: string, storeId: string | null) => Promise<ApiResponse<LotStock[]>>
  summary: (companyId: string, filters?: { supplierId?: string; storeId?: string }) => Promise<ApiResponse<LotStockSummary[]>>
  getLotsForItem: (companyId: string, itemId: string, supplierId?: string, storeId?: string | null) => Promise<ApiResponse<LotStock[]>>
}

// Stock Ledger Types (Running Balance)
export interface StockLedger {
  id: string
  companyId: string
  itemId: string
  lotNoVariety: string
  supplierId: string
  storeId: string | null
  totalNug: number
  totalKg: number
  soldNug: number
  soldKg: number
  availableNug: number
  availableKg: number
  item?: {
    id: string
    name: string
    nameInGujarati: string | null
  }
  supplier?: {
    id: string
    name: string
    nameInGujarati: string | null
  }
  store?: {
    id: string
    name: string
  } | null
}

export interface StockLedgerFilters {
  supplierId?: string
  itemId?: string
  storeId?: string
  lotNoVariety?: string
  includeZeroAvailable?: boolean
  upToDate?: string
}

export interface StockLedgerAPI {
  getAvailable: (companyId: string, filters?: StockLedgerFilters) => Promise<ApiResponse<StockLedger[]>>
  initialize: (companyId: string) => Promise<ApiResponse<void>>
}

// ===== Account Ledger Types (Phase 18) =====
export interface AccountLedger {
  id: string
  companyId: string
  accountId: string
  totalDr: number
  totalCr: number
  balance: number
  createdAt: Date
  updatedAt: Date
}

export interface AccountLedgerItem {
  id: string
  accountLedgerId: string
  type: string
  vchNo: string
  name: string
  particulars: string
  debit: number
  credit: number
  balance: number
  createdAt: Date
  updatedAt: Date
}

export interface AccountLedgerFilters {
  startDate?: string
  endDate?: string
  type?: string
}

export interface AccountLedgerAPI {
  getOrCreate: (companyId: string, accountId: string) => Promise<ApiResponse<AccountLedger>>
  get: (companyId: string, accountId: string) => Promise<ApiResponse<AccountLedger | null>>
  getById: (id: string) => Promise<ApiResponse<AccountLedger | null>>
  list: (companyId: string, filters?: { accountId?: string; hasBalance?: boolean }) => Promise<ApiResponse<AccountLedger[]>>
  getItems: (companyId: string, accountId: string, filters?: AccountLedgerFilters) => Promise<ApiResponse<AccountLedgerItem[]>>
  addEntry: (companyId: string, accountId: string, entry: { type: string; vchNo: string; name: string; particulars: string; debit: number; credit: number }) => Promise<ApiResponse<AccountLedgerItem>>
  reverseEntry: (companyId: string, accountId: string, vchNo: string, type: string) => Promise<ApiResponse<void>>
  recordQuickSale: (companyId: string, accountId: string, vchNo: string, totalAmount: number, itemsSummary: string) => Promise<ApiResponse<AccountLedgerItem>>
  recordDailySale: (companyId: string, accountId: string, vchNo: string, totalAmount: number, itemsSummary: string) => Promise<ApiResponse<AccountLedgerItem>>
  recordStockSale: (companyId: string, customerId: string, vchNo: string, totalAmount: number, itemsSummary: string) => Promise<ApiResponse<AccountLedgerItem>>
  recordArrival: (companyId: string, supplierId: string, vchNo: string, totalAmount: number, itemsSummary: string) => Promise<ApiResponse<AccountLedgerItem>>
  recordSellerBill: (companyId: string, sellerId: string, vchNo: string, totalAmount: number, itemsSummary: string) => Promise<ApiResponse<AccountLedgerItem>>
  recordStockTransfer: (companyId: string, accountId: string, vchNo: string, totalAmount: number, itemsSummary: string) => Promise<ApiResponse<AccountLedgerItem>>
  recordStockWattak: (companyId: string, partyId: string, vchNo: string, totalAmount: number, itemsSummary: string) => Promise<ApiResponse<AccountLedgerItem>>
  recordQuickReceipt: (companyId: string, accountId: string, receiptId: string, amount: number, paymentMode: string, remarks?: string) => Promise<ApiResponse<AccountLedgerItem>>
  recordQuickPayment: (companyId: string, accountId: string, paymentId: string, amount: number, paymentMode: string, remarks?: string) => Promise<ApiResponse<AccountLedgerItem>>
  recordCrateIssue: (companyId: string, accountId: string, vchNo: string, crateQty: number, crateName: string) => Promise<ApiResponse<AccountLedgerItem>>
  recordCrateReceive: (companyId: string, accountId: string, vchNo: string, crateQty: number, crateName: string) => Promise<ApiResponse<AccountLedgerItem>>
  reverseQuickSale: (companyId: string, accountId: string, vchNo: string) => Promise<ApiResponse<void>>
  reverseDailySale: (companyId: string, accountId: string, vchNo: string) => Promise<ApiResponse<void>>
  reverseStockSale: (companyId: string, accountId: string, vchNo: string) => Promise<ApiResponse<void>>
  reverseArrival: (companyId: string, accountId: string, vchNo: string) => Promise<ApiResponse<void>>
  reverseSellerBill: (companyId: string, accountId: string, vchNo: string) => Promise<ApiResponse<void>>
  reverseStockTransfer: (companyId: string, accountId: string, vchNo: string) => Promise<ApiResponse<void>>
  reverseStockWattak: (companyId: string, accountId: string, vchNo: string) => Promise<ApiResponse<void>>
  reverseQuickReceipt: (companyId: string, accountId: string, receiptId: string) => Promise<ApiResponse<void>>
  reverseQuickPayment: (companyId: string, accountId: string, paymentId: string) => Promise<ApiResponse<void>>
  reverseCrateIssue: (companyId: string, accountId: string, vchNo: string) => Promise<ApiResponse<void>>
  reverseCrateReceive: (companyId: string, accountId: string, vchNo: string) => Promise<ApiResponse<void>>
}

