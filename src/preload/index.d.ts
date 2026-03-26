import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  VersionInfo,
  Meta,
  UpdateInfo,
  User,
  License,
  AuthData,
  ApiResponse,
  Company,
  EnforcementResult,
  GracePeriodStatus,
  DatabaseAPI,
  LicenseAPI,
  EnforcerAPI,
  AppAPI,
  CompanyAPI,
  DashboardAPI,
  SyncAPI,
  AccountGroupAPI,
  AccountAPI,
  ItemAPI,
  CrateMarkaAPI,
  ArrivalTypeAPI,
  PackingAPI,
  StoreAPI,
  BackupAPI,
  PreferencesAPI,
  QuickSaleAPI,
  QuickReceiptAPI,
  QuickPaymentAPI,
  VoucherAPI,
  CrateIssueAPI,
  CrateReceiveAPI,
  OtherChargesHeadAPI,
  ArrivalAPI,
  StockSaleAPI,
  SellerBillAPI,
  StockTransferAPI,
  StockWattakAPI,
  LotStockAPI,
  StockLedgerAPI,
  ReportsAPI,
  AccountLedgerAPI
} from './types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      db: DatabaseAPI
      license: LicenseAPI
      enforcer: EnforcerAPI
      company: CompanyAPI
      dashboard: DashboardAPI
      sync: SyncAPI
      app: AppAPI
      accountGroup: AccountGroupAPI
      account: AccountAPI
      item: ItemAPI
      crate: CrateMarkaAPI
      arrivalType: ArrivalTypeAPI
      packing: PackingAPI
      store: StoreAPI
      backup: BackupAPI
      preferences: PreferencesAPI
      quickSale: QuickSaleAPI
      quickReceipt: QuickReceiptAPI
      quickPayment: QuickPaymentAPI
      voucher: VoucherAPI
      crateIssue: CrateIssueAPI
      crateReceive: CrateReceiveAPI
      otherChargesHead: OtherChargesHeadAPI
      arrival: ArrivalAPI
      stockSale: StockSaleAPI
      sellerBill: SellerBillAPI
      stockTransfer: StockTransferAPI
      stockWattak: StockWattakAPI
      lotStock: LotStockAPI
      stockLedger: StockLedgerAPI
      reports: ReportsAPI
      accountLedger: AccountLedgerAPI
    }
  }
}


