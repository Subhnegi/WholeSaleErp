/**
 * Account Ledger Type Definitions (Main Process)
 * Phase 18.5 - Account Ledger Management
 */

export type { ApiResponse } from './quickSale'

// Transaction types for ledger entries
export type LedgerEntryType = 
  | 'quick_sale' 
  | 'daily_sale' 
  | 'stock_sale'
  | 'arrival'
  | 'stock_transfer'
  | 'stock_wattak'
  | 'quick_receipt'
  | 'quick_payment'
  | 'crate_issue'
  | 'crate_receive'
  | 'seller_bill'
  | 'opening_balance'
  | 'adjustment'

// Transaction names for ledger entries
export type LedgerEntryName = 
  | 'Sales'
  | 'Purchase'
  | 'Transfer Out'
  | 'Transfer In'
  | 'Cash Received'
  | 'Cheque Received'
  | 'UPI Received'
  | 'Bank Transfer Received'
  | 'Cash Paid'
  | 'Cheque Issued'
  | 'UPI Paid'
  | 'Bank Transfer Paid'
  | 'Crate Issue'
  | 'Crate Receive'
  | 'Opening Balance'
  | 'Adjustment'
  | 'Commission'
  | 'Charges'

export interface AccountLedger {
  id: string
  companyId: string
  accountId: string
  totalDr: number
  totalCr: number
  balance: number
  createdAt: Date
  updatedAt: Date
  items?: AccountLedgerItem[]
  account?: {
    id: string
    accountName: string
  }
}

export interface AccountLedgerItem {
  id: string
  accountLedgerId: string
  type: LedgerEntryType | string
  vchNo: string
  name: LedgerEntryName | string
  particulars: string
  debit: number
  credit: number
  balance: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateLedgerItemInput {
  type: LedgerEntryType | string
  vchNo: string
  name: LedgerEntryName | string
  particulars: string
  debit: number
  credit: number
}

export interface LedgerFilters {
  accountId?: string
  hasBalance?: boolean
}

export interface LedgerItemFilters {
  startDate?: string
  endDate?: string
  type?: LedgerEntryType | string
}
