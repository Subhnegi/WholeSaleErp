/**
 * Account Ledger Service
 * Phase 18.5 - Manages account ledger entries for financial tracking
 * 
 * This service maintains running balances and detailed transaction entries
 * for all accounts across various transaction types:
 * - Quick Sale, Daily Sale, Stock Sale
 * - Arrivals, Stock Transfer, Stock Wattak
 * - Quick Receipt, Quick Payment
 * - Crate Issue, Crate Receive
 */

import DatabaseService from './database'
import { v4 as uuidv4 } from 'uuid'

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

export interface AccountLedgerEntry {
  id: string
  companyId: string
  accountId: string
  totalDr: number
  totalCr: number
  balance: number
  createdAt: Date
  updatedAt: Date
  items?: AccountLedgerItemEntry[]
}

export interface AccountLedgerItemEntry {
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

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export class AccountLedgerService {
  private static instance: AccountLedgerService
  private databaseService: DatabaseService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
  }

  public static getInstance(): AccountLedgerService {
    if (!AccountLedgerService.instance) {
      AccountLedgerService.instance = new AccountLedgerService()
    }
    return AccountLedgerService.instance
  }

  /**
   * Get or create account ledger for a specific account
   */
  async getOrCreateLedger(companyId: string, accountId: string): Promise<AccountLedgerEntry> {
    const prisma = await this.databaseService.getClient()

    // Try to find existing ledger
    let ledger = await prisma.accountLedger.findFirst({
      where: {
        companyId,
        accountId
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    // Create new ledger if not found
    if (!ledger) {
      ledger = await prisma.accountLedger.create({
        data: {
          id: uuidv4(),
          companyId,
          accountId,
          totalDr: 0,
          totalCr: 0,
          balance: 0
        },
        include: {
          items: true
        }
      })
    }

    return ledger as AccountLedgerEntry
  }

  /**
   * Add a ledger entry and update running balance
   */
  async addLedgerEntry(
    companyId: string,
    accountId: string,
    entry: CreateLedgerItemInput
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get or create the ledger
      const ledger = await this.getOrCreateLedger(companyId, accountId)

      // Calculate new balance
      const newBalance = ledger.balance + entry.debit - entry.credit

      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Create ledger item
        const ledgerItem = await tx.accountLedgerItem.create({
          data: {
            id: uuidv4(),
            accountLedgerId: ledger.id,
            type: entry.type,
            vchNo: entry.vchNo,
            name: entry.name,
            particulars: entry.particulars,
            debit: entry.debit,
            credit: entry.credit,
            balance: newBalance
          }
        })

        // Update ledger totals
        await tx.accountLedger.update({
          where: { id: ledger.id },
          data: {
            totalDr: ledger.totalDr + entry.debit,
            totalCr: ledger.totalCr + entry.credit,
            balance: newBalance
          }
        })

        return ledgerItem
      })

      return {
        success: true,
        data: result as AccountLedgerItemEntry
      }
    } catch (error: any) {
      console.error('Add ledger entry error:', error)
      return {
        success: false,
        error: error.message || 'Failed to add ledger entry'
      }
    }
  }

  /**
   * Add multiple ledger entries in a single transaction
   */
  async addMultipleLedgerEntries(
    entries: Array<{
      companyId: string
      accountId: string
      entry: CreateLedgerItemInput
    }>
  ): Promise<ApiResponse<AccountLedgerItemEntry[]>> {
    try {
      const prisma = await this.databaseService.getClient()
      const results: AccountLedgerItemEntry[] = []

      await prisma.$transaction(async (tx) => {
        for (const { companyId, accountId, entry } of entries) {
          // Get or create the ledger
          let ledger = await tx.accountLedger.findFirst({
            where: { companyId, accountId }
          })

          if (!ledger) {
            ledger = await tx.accountLedger.create({
              data: {
                id: uuidv4(),
                companyId,
                accountId,
                totalDr: 0,
                totalCr: 0,
                balance: 0
              }
            })
          }

          // Calculate new balance
          const newBalance = ledger.balance + entry.debit - entry.credit

          // Create ledger item
          const ledgerItem = await tx.accountLedgerItem.create({
            data: {
              id: uuidv4(),
              accountLedgerId: ledger.id,
              type: entry.type,
              vchNo: entry.vchNo,
              name: entry.name,
              particulars: entry.particulars,
              debit: entry.debit,
              credit: entry.credit,
              balance: newBalance
            }
          })

          // Update ledger totals
          await tx.accountLedger.update({
            where: { id: ledger.id },
            data: {
              totalDr: ledger.totalDr + entry.debit,
              totalCr: ledger.totalCr + entry.credit,
              balance: newBalance
            }
          })

          results.push(ledgerItem as AccountLedgerItemEntry)
        }
      })

      return {
        success: true,
        data: results
      }
    } catch (error: any) {
      console.error('Add multiple ledger entries error:', error)
      return {
        success: false,
        error: error.message || 'Failed to add ledger entries'
      }
    }
  }

  /**
   * Reverse/delete a ledger entry by voucher number and type
   * Used when deleting or updating transactions
   */
  async reverseLedgerEntry(
    companyId: string,
    accountId: string,
    vchNo: string,
    type: LedgerEntryType | string
  ): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get the ledger
      const ledger = await prisma.accountLedger.findFirst({
        where: { companyId, accountId }
      })

      if (!ledger) {
        return { success: true } // No ledger found, nothing to reverse
      }

      // Find the entry to reverse
      const entryToReverse = await prisma.accountLedgerItem.findFirst({
        where: {
          accountLedgerId: ledger.id,
          vchNo,
          type
        }
      })

      if (!entryToReverse) {
        return { success: true } // No entry found, nothing to reverse
      }

      await prisma.$transaction(async (tx) => {
        // Update ledger totals (reverse the amounts)
        await tx.accountLedger.update({
          where: { id: ledger.id },
          data: {
            totalDr: ledger.totalDr - entryToReverse.debit,
            totalCr: ledger.totalCr - entryToReverse.credit,
            balance: ledger.balance - entryToReverse.debit + entryToReverse.credit
          }
        })

        // Delete the entry
        await tx.accountLedgerItem.delete({
          where: { id: entryToReverse.id }
        })

        // Recalculate running balances for all subsequent entries
        await this.recalculateRunningBalances(tx, ledger.id)
      })

      return { success: true }
    } catch (error: any) {
      console.error('Reverse ledger entry error:', error)
      return {
        success: false,
        error: error.message || 'Failed to reverse ledger entry'
      }
    }
  }

  /**
   * Recalculate running balances for all ledger items
   */
  private async recalculateRunningBalances(tx: any, ledgerId: string): Promise<void> {
    const items = await tx.accountLedgerItem.findMany({
      where: { accountLedgerId: ledgerId },
      orderBy: { createdAt: 'asc' }
    })

    let runningBalance = 0
    for (const item of items) {
      runningBalance = runningBalance + item.debit - item.credit
      await tx.accountLedgerItem.update({
        where: { id: item.id },
        data: { balance: runningBalance }
      })
    }
  }

  /**
   * Get ledger for an account
   */
  async getLedger(companyId: string, accountId: string): Promise<ApiResponse<AccountLedgerEntry | null>> {
    try {
      const prisma = await this.databaseService.getClient()

      const ledger = await prisma.accountLedger.findFirst({
        where: { companyId, accountId },
        include: {
          items: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      return {
        success: true,
        data: ledger as AccountLedgerEntry | null
      }
    } catch (error: any) {
      console.error('Get ledger error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get ledger'
      }
    }
  }

  /**
   * Get ledger by ID
   */
  async getLedgerById(id: string): Promise<ApiResponse<AccountLedgerEntry | null>> {
    try {
      const prisma = await this.databaseService.getClient()

      const ledger = await prisma.accountLedger.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { createdAt: 'asc' }
          },
          account: true
        }
      })

      return {
        success: true,
        data: ledger as AccountLedgerEntry | null
      }
    } catch (error: any) {
      console.error('Get ledger by ID error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get ledger'
      }
    }
  }

  /**
   * List all ledgers for a company
   */
  async listLedgers(
    companyId: string,
    filters?: {
      accountId?: string
      hasBalance?: boolean
    }
  ): Promise<ApiResponse<AccountLedgerEntry[]>> {
    try {
      const prisma = await this.databaseService.getClient()

      const whereClause: any = { companyId }

      if (filters?.accountId) {
        whereClause.accountId = filters.accountId
      }

      if (filters?.hasBalance === true) {
        whereClause.balance = { not: 0 }
      } else if (filters?.hasBalance === false) {
        whereClause.balance = 0
      }

      const ledgers = await prisma.accountLedger.findMany({
        where: whereClause,
        include: {
          account: true,
          items: {
            orderBy: { createdAt: 'desc' },
            take: 10 // Only get latest 10 items for list view
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      return {
        success: true,
        data: ledgers as AccountLedgerEntry[]
      }
    } catch (error: any) {
      console.error('List ledgers error:', error)
      return {
        success: false,
        error: error.message || 'Failed to list ledgers'
      }
    }
  }

  /**
   * Get ledger items by date range
   */
  async getLedgerItems(
    companyId: string,
    accountId: string,
    filters?: {
      startDate?: string
      endDate?: string
      type?: LedgerEntryType | string
    }
  ): Promise<ApiResponse<AccountLedgerItemEntry[]>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get the ledger first
      const ledger = await prisma.accountLedger.findFirst({
        where: { companyId, accountId }
      })

      if (!ledger) {
        return { success: true, data: [] }
      }

      const whereClause: any = { accountLedgerId: ledger.id }

      if (filters?.startDate) {
        whereClause.createdAt = {
          ...whereClause.createdAt,
          gte: new Date(filters.startDate)
        }
      }

      if (filters?.endDate) {
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999)
        whereClause.createdAt = {
          ...whereClause.createdAt,
          lte: endDate
        }
      }

      if (filters?.type) {
        whereClause.type = filters.type
      }

      const items = await prisma.accountLedgerItem.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' }
      })

      return {
        success: true,
        data: items as AccountLedgerItemEntry[]
      }
    } catch (error: any) {
      console.error('Get ledger items error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get ledger items'
      }
    }
  }

  /**
   * Delete all ledger entries for a company (used during data reset)
   */
  async deleteAllForCompany(companyId: string): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      await prisma.accountLedger.deleteMany({
        where: { companyId }
      })

      return { success: true }
    } catch (error: any) {
      console.error('Delete all ledgers error:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete ledgers'
      }
    }
  }

  // ============================================
  // Helper methods for specific transaction types
  // ============================================

  /**
   * Record Quick Sale entry in ledger
   * Debit: Customer (amount receivable)
   * Credit: Sales (for accounting purposes, handled separately if needed)
   */
  async recordQuickSale(
    companyId: string,
    accountId: string,
    vchNo: string,
    totalAmount: number,
    itemsSummary: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    return this.addLedgerEntry(companyId, accountId, {
      type: 'quick_sale',
      vchNo,
      name: 'Sales',
      particulars: itemsSummary,
      debit: totalAmount,
      credit: 0
    })
  }

  /**
   * Record Daily Sale (Voucher) entry in ledger
   */
  async recordDailySale(
    companyId: string,
    accountId: string,
    vchNo: string,
    totalAmount: number,
    itemsSummary: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    return this.addLedgerEntry(companyId, accountId, {
      type: 'daily_sale',
      vchNo,
      name: 'Sales',
      particulars: itemsSummary,
      debit: totalAmount,
      credit: 0
    })
  }

  /**
   * Record Stock Sale entry in ledger
   */
  async recordStockSale(
    companyId: string,
    customerId: string,
    vchNo: string,
    totalAmount: number,
    itemsSummary: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    return this.addLedgerEntry(companyId, customerId, {
      type: 'stock_sale',
      vchNo,
      name: 'Sales',
      particulars: itemsSummary,
      debit: totalAmount,
      credit: 0
    })
  }

  /**
   * Record Arrival entry in ledger
   * Credit: Supplier (amount payable)
   */
  async recordArrival(
    companyId: string,
    supplierId: string,
    vchNo: string,
    totalAmount: number,
    itemsSummary: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    return this.addLedgerEntry(companyId, supplierId, {
      type: 'arrival',
      vchNo,
      name: 'Purchase',
      particulars: itemsSummary,
      debit: 0,
      credit: totalAmount
    })
  }

  /**
   * Record Stock Transfer entry in ledger
   */
  async recordStockTransfer(
    companyId: string,
    accountId: string,
    vchNo: string,
    totalAmount: number,
    itemsSummary: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    return this.addLedgerEntry(companyId, accountId, {
      type: 'stock_transfer',
      vchNo,
      name: 'Transfer Out',
      particulars: itemsSummary,
      debit: 0,
      credit: totalAmount
    })
  }

  /**
   * Record Stock Wattak entry in ledger
   */
  async recordStockWattak(
    companyId: string,
    partyId: string,
    vchNo: string,
    totalAmount: number,
    itemsSummary: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    return this.addLedgerEntry(companyId, partyId, {
      type: 'stock_wattak',
      vchNo,
      name: 'Sales',
      particulars: itemsSummary,
      debit: totalAmount,
      credit: 0
    })
  }

  /**
   * Record Seller Bill entry in ledger
   */
  async recordSellerBill(
    companyId: string,
    sellerId: string,
    vchNo: string,
    totalAmount: number,
    itemsSummary: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    return this.addLedgerEntry(companyId, sellerId, {
      type: 'seller_bill',
      vchNo,
      name: 'Sales',
      particulars: itemsSummary,
      debit: totalAmount,
      credit: 0
    })
  }

  /**
   * Record Quick Receipt entry in ledger
   * Credit: Customer (reduces amount receivable)
   */
  async recordQuickReceipt(
    companyId: string,
    accountId: string,
    receiptId: string,
    amount: number,
    paymentMode: string,
    remarks?: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    const nameMap: Record<string, LedgerEntryName> = {
      cash: 'Cash Received',
      cheque: 'Cheque Received',
      upi: 'UPI Received',
      banktransfer: 'Bank Transfer Received'
    }

    return this.addLedgerEntry(companyId, accountId, {
      type: 'quick_receipt',
      vchNo: receiptId,
      name: nameMap[paymentMode] || 'Cash Received',
      particulars: remarks || `Payment received via ${paymentMode}`,
      debit: 0,
      credit: amount
    })
  }

  /**
   * Record Quick Payment entry in ledger
   * Debit: Supplier (reduces amount payable)
   */
  async recordQuickPayment(
    companyId: string,
    accountId: string,
    paymentId: string,
    amount: number,
    paymentMode: string,
    remarks?: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    const nameMap: Record<string, LedgerEntryName> = {
      cash: 'Cash Paid',
      cheque: 'Cheque Issued',
      upi: 'UPI Paid',
      banktransfer: 'Bank Transfer Paid'
    }

    return this.addLedgerEntry(companyId, accountId, {
      type: 'quick_payment',
      vchNo: paymentId,
      name: nameMap[paymentMode] || 'Cash Paid',
      particulars: remarks || `Payment made via ${paymentMode}`,
      debit: amount,
      credit: 0
    })
  }

  /**
   * Record Crate Issue entry in ledger
   * Note: Crate entries track quantity only, no monetary value in debit/credit
   */
  async recordCrateIssue(
    companyId: string,
    accountId: string,
    vchNo: string,
    crateQty: number,
    crateName: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    return this.addLedgerEntry(companyId, accountId, {
      type: 'crate_issue',
      vchNo,
      name: 'Crate Issue',
      particulars: `Issued ${crateQty} ${crateName} crates`,
      debit: 0,
      credit: 0
    })
  }

  /**
   * Record Crate Receive entry in ledger
   * Note: Crate entries track quantity only, no monetary value in debit/credit
   */
  async recordCrateReceive(
    companyId: string,
    accountId: string,
    vchNo: string,
    crateQty: number,
    crateName: string
  ): Promise<ApiResponse<AccountLedgerItemEntry>> {
    return this.addLedgerEntry(companyId, accountId, {
      type: 'crate_receive',
      vchNo,
      name: 'Crate Receive',
      particulars: `Received ${crateQty} ${crateName} crates`,
      debit: 0,
      credit: 0
    })
  }

  /**
   * Reverse Quick Sale entry
   */
  async reverseQuickSale(
    companyId: string,
    accountId: string,
    vchNo: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, vchNo, 'quick_sale')
  }

  /**
   * Reverse Daily Sale entry
   */
  async reverseDailySale(
    companyId: string,
    accountId: string,
    vchNo: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, vchNo, 'daily_sale')
  }

  /**
   * Reverse Stock Sale entry
   */
  async reverseStockSale(
    companyId: string,
    accountId: string,
    vchNo: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, vchNo, 'stock_sale')
  }

  /**
   * Reverse Arrival entry
   */
  async reverseArrival(
    companyId: string,
    accountId: string,
    vchNo: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, vchNo, 'arrival')
  }

  /**
   * Reverse Stock Transfer entry
   */
  async reverseStockTransfer(
    companyId: string,
    accountId: string,
    vchNo: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, vchNo, 'stock_transfer')
  }

  /**
   * Reverse Stock Wattak entry
   */
  async reverseStockWattak(
    companyId: string,
    accountId: string,
    vchNo: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, vchNo, 'stock_wattak')
  }

  /**
   * Reverse Seller Bill entry
   */
  async reverseSellerBill(
    companyId: string,
    accountId: string,
    vchNo: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, vchNo, 'seller_bill')
  }

  /**
   * Reverse Quick Receipt entry
   */
  async reverseQuickReceipt(
    companyId: string,
    accountId: string,
    receiptId: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, receiptId, 'quick_receipt')
  }

  /**
   * Reverse Quick Payment entry
   */
  async reverseQuickPayment(
    companyId: string,
    accountId: string,
    paymentId: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, paymentId, 'quick_payment')
  }

  /**
   * Reverse Crate Issue entry
   */
  async reverseCrateIssue(
    companyId: string,
    accountId: string,
    voucherNo: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, voucherNo, 'crate_issue')
  }

  /**
   * Reverse Crate Receive entry
   */
  async reverseCrateReceive(
    companyId: string,
    accountId: string,
    voucherNo: string
  ): Promise<ApiResponse<void>> {
    return this.reverseLedgerEntry(companyId, accountId, voucherNo, 'crate_receive')
  }
}

export default AccountLedgerService
