/**
 * Quick Sale Service
 * Phase 10.2 - Handles all Quick Sale transaction operations
 * Phase 13.7 - Integration with Crate Issue (auto-sync crates)
 * Phase 18.7 - Integration with Account Ledger
 */

import type { 
  QuickSale, 
  CreateQuickSaleInput,
  UpdateQuickSaleInput,
  QuickSaleSummary,
  ApiResponse 
} from '../types/quickSale'
import DatabaseService from './database'
import { CrateIssueService } from './crateIssueService'
import { AccountLedgerService } from './accountLedgerService'

export class QuickSaleService {
  private static instance: QuickSaleService
  private databaseService: DatabaseService
  private crateIssueService: CrateIssueService
  private accountLedgerService: AccountLedgerService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.crateIssueService = CrateIssueService.getInstance()
    this.accountLedgerService = AccountLedgerService.getInstance()
  }

  public static getInstance(): QuickSaleService {
    if (!QuickSaleService.instance) {
      QuickSaleService.instance = new QuickSaleService()
    }
    return QuickSaleService.instance
  }

  /**
   * Calculate summary from items
   */
  private calculateSummary(items: { 
    nug: number
    kg: number
    basicAmount: number
    totalAmount: number
    crateQty?: number | null
  }[]): QuickSaleSummary {
    const summary = items.reduce((acc, item) => ({
      totalItems: acc.totalItems + 1,
      totalCrates: acc.totalCrates + (item.crateQty || 0),
      totalNug: acc.totalNug + item.nug,
      totalWeight: acc.totalWeight + item.kg,
      basicAmount: acc.basicAmount + item.basicAmount,
      totalSaleAmount: acc.totalSaleAmount + item.totalAmount,
      commissionExpenses: 0 // Will be calculated after reduce
    }), {
      totalItems: 0,
      totalCrates: 0,
      totalNug: 0,
      totalWeight: 0,
      basicAmount: 0,
      totalSaleAmount: 0,
      commissionExpenses: 0
    })

    // Commission + Expenses = Total Sale - Basic Amount
    summary.commissionExpenses = summary.totalSaleAmount - summary.basicAmount

    return summary
  }

  /**
   * Generate voucher number with format QS-YYYYMMDD-XXX
   */
  private async generateVoucherNumber(companyId: string, saleDate: string): Promise<string> {
    try {
      const prisma = await this.databaseService.getClient()
      const dateObj = saleDate ? new Date(saleDate) : new Date()
      const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj
      const year = validDate.getFullYear()
      const month = String(validDate.getMonth() + 1).padStart(2, '0')
      const day = String(validDate.getDate()).padStart(2, '0')
      const datePrefix = `QS-${year}${month}${day}`

      const lastVoucher = await prisma.quickSale.findFirst({
        where: {
          companyId,
          voucherNo: {
            startsWith: datePrefix
          }
        },
        orderBy: {
          voucherNo: 'desc'
        }
      })

      if (!lastVoucher || !lastVoucher.voucherNo) {
        return `${datePrefix}-001`
      }

      const parts = lastVoucher.voucherNo.split('-')
      const lastNumber = parseInt(parts[2] || '0', 10)
      const nextNumber = String(lastNumber + 1).padStart(3, '0')
      return `${datePrefix}-${nextNumber}`
    } catch (error) {
      console.error('Error generating Quick Sale voucher number:', error)
      const timestamp = Date.now()
      const dateObj = saleDate ? new Date(saleDate) : new Date()
      const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj
      const year = validDate.getFullYear()
      const month = String(validDate.getMonth() + 1).padStart(2, '0')
      const day = String(validDate.getDate()).padStart(2, '0')
      return `QS-${year}${month}${day}-${timestamp}`
    }
  }

  async getNextVoucherNumber(companyId: string, saleDate: string): Promise<ApiResponse<string>> {
    try {
      const voucherNo = await this.generateVoucherNumber(companyId, saleDate)
      return {
        success: true,
        data: voucherNo
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate voucher number'
      }
    }
  }

  /**
   * Create a new Quick Sale transaction
   * Phase 13.7 - Also creates crate issue entries for items with crate data
   */
  async createQuickSale(data: CreateQuickSaleInput): Promise<ApiResponse<QuickSale>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Calculate summary from items
      const summary = this.calculateSummary(data.items)
      const voucherNo = data.voucherNo || await this.generateVoucherNumber(data.companyId, data.saleDate)

      // Use Prisma transaction to ensure atomicity
      const quickSale = await prisma.$transaction(async (tx) => {
        // Create QuickSale with items in a single transaction
        return await tx.quickSale.create({
          data: {
            companyId: data.companyId,
            saleDate: data.saleDate,
            voucherNo,
            ...summary,
            items: {
              create: data.items.map(item => ({
                itemId: item.itemId,
                itemName: item.itemName,
                accountId: item.accountId,
                accountName: item.accountName,
                nug: item.nug,
                kg: item.kg,
                rate: item.rate,
                per: item.per,
                basicAmount: item.basicAmount,
                totalAmount: item.totalAmount,
                crateMarkaId: item.crateMarkaId || null,
                crateMarkaName: item.crateMarkaName || null,
                crateQty: item.crateQty || null,
                crateRate: item.crateRate || null,
                crateValue: item.crateValue || null
              }))
            }
          },
          include: {
            items: true
          }
        })
      })

      // Phase 13.7: Sync crate issues for items with crate data
      const crateItems = quickSale.items
        .filter(item => item.crateMarkaId && item.crateQty && item.crateQty > 0)
        .map(item => ({
          quickSaleItemId: item.id,
          accountId: item.accountId,
          crateMarkaId: item.crateMarkaId!,
          qty: item.crateQty!,
          remarks: `Quick Sale - ${voucherNo || data.saleDate}`
        }))

      if (crateItems.length > 0) {
        await this.crateIssueService.syncFromQuickSale(
          data.companyId,
          data.saleDate,
          quickSale.id,
          crateItems
        )
      }

      // Phase 18.7: Record ledger entries for each customer account
      const accountTotals = new Map<string, { total: number; items: string[] }>()
      for (const item of quickSale.items) {
        const existing = accountTotals.get(item.accountId) || { total: 0, items: [] }
        existing.total += item.totalAmount
        existing.items.push(`${item.itemName} ${item.nug}N/${item.kg}Kg`)
        accountTotals.set(item.accountId, existing)
      }

      for (const [accountId, details] of accountTotals) {
        await this.accountLedgerService.recordQuickSale(
          data.companyId,
          accountId,
          voucherNo,
          details.total,
          details.items.join(', ')
        )
      }

      return {
        success: true,
        message: 'Quick Sale transaction created successfully',
        data: quickSale as QuickSale
      }
    } catch (error: any) {
      console.error('Error creating Quick Sale transaction:', error)
      return {
        success: false,
        error: error.message || 'Failed to create Quick Sale transaction'
      }
    }
  }

  /**
   * Get all Quick Sales for a company
   */
  async getQuickSalesByCompany(companyId: string): Promise<ApiResponse<QuickSale[]>> {
    try {
      const prisma = await this.databaseService.getClient()

      const quickSales = await prisma.quickSale.findMany({
        where: { companyId },
        include: {
          items: true
        },
        orderBy: {
          saleDate: 'desc'
        }
      })

      return {
        success: true,
        data: quickSales as QuickSale[]
      }
    } catch (error: any) {
      console.error('Error fetching Quick Sales:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch Quick Sales'
      }
    }
  }

  /**
   * Get Quick Sales by date range
   */
  async getQuickSalesByDateRange(
    companyId: string, 
    startDate: string, 
    endDate: string
  ): Promise<ApiResponse<QuickSale[]>> {
    try {
      const prisma = await this.databaseService.getClient()

      const quickSales = await prisma.quickSale.findMany({
        where: {
          companyId,
          saleDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          items: true
        },
        orderBy: {
          saleDate: 'desc'
        }
      })

      return {
        success: true,
        data: quickSales as QuickSale[]
      }
    } catch (error: any) {
      console.error('Error fetching Quick Sales by date range:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch Quick Sales'
      }
    }
  }

  /**
   * Get a single Quick Sale by ID
   */
  async getQuickSaleById(id: string): Promise<ApiResponse<QuickSale>> {
    try {
      const prisma = await this.databaseService.getClient()

      const quickSale = await prisma.quickSale.findUnique({
        where: { id },
        include: {
          items: true
        }
      })

      if (!quickSale) {
        return {
          success: false,
          error: 'Quick Sale not found'
        }
      }

      return {
        success: true,
        data: quickSale as QuickSale
      }
    } catch (error: any) {
      console.error('Error fetching Quick Sale:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch Quick Sale'
      }
    }
  }

  /**
   * Update a Quick Sale transaction
   * Phase 13.7 - Also updates crate issue entries for items with crate data
   */
  async updateQuickSale(id: string, data: UpdateQuickSaleInput): Promise<ApiResponse<QuickSale>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get existing quick sale to get companyId
      const existingQuickSale = await prisma.quickSale.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existingQuickSale) {
        return {
          success: false,
          error: 'Quick Sale not found'
        }
      }

      // Phase 18.7: Reverse old ledger entries before updating
      const oldAccountIds = [...new Set(existingQuickSale.items.map(item => item.accountId))]
      for (const accountId of oldAccountIds) {
        await this.accountLedgerService.reverseQuickSale(
          existingQuickSale.companyId,
          accountId,
          existingQuickSale.voucherNo || ''
        )
      }

      // Phase 13.7: Delete old crate issues for old items before updating
      const oldItemIds = existingQuickSale.items.map(item => item.id)
      if (oldItemIds.length > 0) {
        await this.crateIssueService.deleteByQuickSale(oldItemIds)
      }

      // Use Prisma transaction to ensure atomicity
      const quickSale = await prisma.$transaction(async (tx) => {
        // If items are being updated, delete old items and create new ones
        if (data.items) {
          // Calculate new summary
          const summary = this.calculateSummary(data.items)

          // Delete old items
          await tx.quickSaleItem.deleteMany({
            where: { quickSaleId: id }
          })

          // Update QuickSale and create new items
          return await tx.quickSale.update({
            where: { id },
            data: {
              saleDate: data.saleDate,
              ...summary,
              items: {
                create: data.items.map(item => ({
                  itemId: item.itemId,
                  itemName: item.itemName,
                  accountId: item.accountId,
                  accountName: item.accountName,
                  nug: item.nug,
                  kg: item.kg,
                  rate: item.rate,
                  per: item.per,
                  basicAmount: item.basicAmount,
                  totalAmount: item.totalAmount,
                  crateMarkaId: item.crateMarkaId || null,
                  crateMarkaName: item.crateMarkaName || null,
                  crateQty: item.crateQty || null,
                  crateRate: item.crateRate || null,
                  crateValue: item.crateValue || null
                }))
              }
            },
            include: {
              items: true
            }
          })
        } else {
          // Just update the date
          return await tx.quickSale.update({
            where: { id },
            data: {
              saleDate: data.saleDate
            },
            include: {
              items: true
            }
          })
        }
      })

      // Phase 13.7: Sync new crate issues for items with crate data
      const saleDate = data.saleDate || existingQuickSale.saleDate
      const voucherNo = existingQuickSale.voucherNo || ''
      const crateItems = quickSale.items
        .filter(item => item.crateMarkaId && item.crateQty && item.crateQty > 0)
        .map(item => ({
          quickSaleItemId: item.id,
          accountId: item.accountId,
          crateMarkaId: item.crateMarkaId!,
          qty: item.crateQty!,
          remarks: `Quick Sale - ${voucherNo || saleDate}`
        }))

      if (crateItems.length > 0) {
        await this.crateIssueService.syncFromQuickSale(
          existingQuickSale.companyId,
          saleDate,
          quickSale.id,
          crateItems
        )
      }

      // Phase 18.7: Record new ledger entries for each customer account
      const accountTotals = new Map<string, { total: number; items: string[] }>()
      for (const item of quickSale.items) {
        const existing = accountTotals.get(item.accountId) || { total: 0, items: [] }
        existing.total += item.totalAmount
        existing.items.push(`${item.itemName} ${item.nug}N/${item.kg}Kg`)
        accountTotals.set(item.accountId, existing)
      }

      for (const [accountId, details] of accountTotals) {
        await this.accountLedgerService.recordQuickSale(
          existingQuickSale.companyId,
          accountId,
          voucherNo,
          details.total,
          details.items.join(', ')
        )
      }

      return {
        success: true,
        message: 'Quick Sale transaction updated successfully',
        data: quickSale as QuickSale
      }
    } catch (error: any) {
      console.error('Error updating Quick Sale transaction:', error)
      return {
        success: false,
        error: error.message || 'Failed to update Quick Sale transaction'
      }
    }
  }

  /**
   * Delete a Quick Sale transaction (cascade deletes items)
   * Phase 13.7 - Also deletes related crate issue entries
   * Phase 18.7 - Also reverses ledger entries
   */
  async deleteQuickSale(id: string): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get the quick sale with items first for crate issue cleanup
      const quickSale = await prisma.quickSale.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!quickSale) {
        return {
          success: false,
          error: 'Quick Sale transaction not found'
        }
      }

      // Phase 18.7: Reverse ledger entries before deleting
      const accountIds = [...new Set(quickSale.items.map(item => item.accountId))]
      for (const accountId of accountIds) {
        await this.accountLedgerService.reverseQuickSale(
          quickSale.companyId,
          accountId,
          quickSale.voucherNo || ''
        )
      }

      // Phase 13.7: Delete related crate issues first
      const itemIds = quickSale.items.map(item => item.id)
      if (itemIds.length > 0) {
        await this.crateIssueService.deleteByQuickSale(itemIds)
      }

      // Delete the Quick Sale (cascade will delete items automatically)
      await prisma.quickSale.delete({
        where: { id }
      })

      return {
        success: true,
        message: 'Quick Sale transaction deleted successfully'
      }
    } catch (error: any) {
      console.error('Error deleting Quick Sale transaction:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete Quick Sale transaction'
      }
    }
  }

  /**
   * Bulk delete Quick Sale transactions
   * Phase 13.7 - Also deletes related crate issue entries
   */
  async bulkDeleteQuickSales(ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get all quick sales with items for crate issue cleanup
      const quickSales = await prisma.quickSale.findMany({
        where: {
          id: { in: ids }
        },
        include: { items: true }
      })

      if (quickSales.length !== ids.length) {
        return {
          success: false,
          error: 'Some Quick Sale transactions not found'
        }
      }

      // Phase 18.7: Reverse ledger entries for all quick sales
      for (const qs of quickSales) {
        const accountIds = [...new Set(qs.items.map(item => item.accountId))]
        for (const accountId of accountIds) {
          await this.accountLedgerService.reverseQuickSale(
            qs.companyId,
            accountId,
            qs.voucherNo || ''
          )
        }
      }

      // Phase 13.7: Collect all item IDs and delete related crate issues
      const allItemIds = quickSales.flatMap(qs => qs.items.map(item => item.id))
      if (allItemIds.length > 0) {
        await this.crateIssueService.deleteByQuickSale(allItemIds)
      }

      // Delete all Quick Sales (cascade will delete items)
      const result = await prisma.quickSale.deleteMany({
        where: {
          id: { in: ids }
        }
      })

      return {
        success: true,
        message: `${result.count} Quick Sale transactions deleted successfully`,
        data: { deletedCount: result.count }
      }
    } catch (error: any) {
      console.error('Error bulk deleting Quick Sale transactions:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete Quick Sale transactions'
      }
    }
  }
}
