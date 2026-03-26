/**
 * Quick Receipt Service
 * Phase 18.2 - Handles all Quick Receipt transaction operations
 * Phase 18.7 - Integration with Account Ledger
 */

import type { 
  QuickReceipt, 
  CreateQuickReceiptInput,
  UpdateQuickReceiptInput,
  ApiResponse 
} from '../types/quickReceipt'
import DatabaseService from './database'
import { AccountLedgerService } from './accountLedgerService'

export class QuickReceiptService {
  private static instance: QuickReceiptService
  private databaseService: DatabaseService
  private accountLedgerService: AccountLedgerService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.accountLedgerService = AccountLedgerService.getInstance()
  }

  public static getInstance(): QuickReceiptService {
    if (!QuickReceiptService.instance) {
      QuickReceiptService.instance = new QuickReceiptService()
    }
    return QuickReceiptService.instance
  }

  /**
   * Calculate summary from items
   */
  private calculateSummary(items: { 
    amount: number
    discount: number
    totalAmount: number
  }[]): {
    amount: number
    discount: number
    totalAmount: number
  } {
    return items.reduce((acc, item) => ({
      amount: acc.amount + item.amount,
      discount: acc.discount + item.discount,
      totalAmount: acc.totalAmount + item.totalAmount
    }), {
      amount: 0,
      discount: 0,
      totalAmount: 0
    })
  }

  /**
   * Create a new Quick Receipt transaction
   */
  async createQuickReceipt(data: CreateQuickReceiptInput): Promise<ApiResponse<QuickReceipt>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Calculate summary from items
      const summary = this.calculateSummary(data.items)
      const receiptDate = data.receiptDate ? new Date(data.receiptDate) : new Date()

      // Use Prisma transaction to ensure atomicity
      const quickReceipt = await prisma.$transaction(async (tx) => {
        // Create QuickReceipt with items in a single transaction
        return await tx.quickReceipt.create({
          data: {
            companyId: data.companyId,
            createdAt: receiptDate,
            ...summary,
            items: {
              create: data.items.map(item => ({
                receiptId: item.receiptId,
                accountId: item.accountId,
                amount: item.amount,
                discount: item.discount,
                totalAmount: item.totalAmount,
                remarks: item.remarks || null,
                paymentMode: item.paymentMode || null,
                dateOfTransaction: item.dateOfTransaction ? new Date(item.dateOfTransaction) : null,
                accountNo: item.accountNo || null,
                chequeNo: item.chequeNo || null,
                transactionId: item.transactionId || null,
                upiId: item.upiId || null,
                bank: item.bank || null,
                branch: item.branch || null,
                ifscNo: item.ifscNo || null
              }))
            }
          },
          include: {
            items: true
          }
        })
      })

      // Phase 18.7: Record ledger entries for each account
      for (const item of quickReceipt.items) {
        await this.accountLedgerService.recordQuickReceipt(
          data.companyId,
          item.accountId,
          item.receiptId || quickReceipt.id,
          item.totalAmount,
          item.paymentMode || 'cash',
          item.remarks || undefined
        )
      }

      return {
        success: true,
        data: quickReceipt as QuickReceipt
      }
    } catch (error: any) {
      console.error('Create quick receipt error:', error)
      return {
        success: false,
        error: error.message || 'Failed to create quick receipt'
      }
    }
  }

  /**
   * List all Quick Receipts for a company
   */
  async listByCompany(companyId: string): Promise<ApiResponse<QuickReceipt[]>> {
    try {
      const prisma = await this.databaseService.getClient()
      const quickReceipts = await prisma.quickReceipt.findMany({
        where: { companyId },
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return {
        success: true,
        data: quickReceipts as QuickReceipt[]
      }
    } catch (error: any) {
      console.error('List quick receipts error:', error)
      return {
        success: false,
        error: error.message || 'Failed to list quick receipts'
      }
    }
  }

  /**
   * List Quick Receipts by date range
   */
  async listByDateRange(
    companyId: string, 
    startDate: string, 
    endDate: string
  ): Promise<ApiResponse<QuickReceipt[]>> {
    try {
      const prisma = await this.databaseService.getClient()
      const quickReceipts = await prisma.quickReceipt.findMany({
        where: {
          companyId,
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return {
        success: true,
        data: quickReceipts as QuickReceipt[]
      }
    } catch (error: any) {
      console.error('List quick receipts by date range error:', error)
      return {
        success: false,
        error: error.message || 'Failed to list quick receipts'
      }
    }
  }

  /**
   * Get a single Quick Receipt by ID
   */
  async get(id: string): Promise<ApiResponse<QuickReceipt>> {
    try {
      const prisma = await this.databaseService.getClient()
      const quickReceipt = await prisma.quickReceipt.findUnique({
        where: { id },
        include: {
          items: true
        }
      })

      if (!quickReceipt) {
        return {
          success: false,
          error: 'Quick receipt not found'
        }
      }

      return {
        success: true,
        data: quickReceipt as QuickReceipt
      }
    } catch (error: any) {
      console.error('Get quick receipt error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get quick receipt'
      }
    }
  }

  /**
   * Update an existing Quick Receipt
   */
  async update(id: string, data: UpdateQuickReceiptInput): Promise<ApiResponse<QuickReceipt>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get existing receipt first for ledger reversal
      const existingReceipt = await prisma.quickReceipt.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existingReceipt) {
        return {
          success: false,
          error: 'Quick receipt not found'
        }
      }

      // Phase 18.7: Reverse old ledger entries
      for (const item of existingReceipt.items) {
        await this.accountLedgerService.reverseQuickReceipt(
          existingReceipt.companyId,
          item.accountId,
          item.receiptId || existingReceipt.id
        )
      }

      // Calculate new summary if items are provided
      const summary = data.items ? this.calculateSummary(data.items) : undefined

      const quickReceipt = await prisma.$transaction(async (tx) => {
        // Delete existing items if new items are provided
        if (data.items) {
          await tx.quickReceiptItem.deleteMany({
            where: { quickReceiptId: id }
          })
        }

        // Update QuickReceipt
        return await tx.quickReceipt.update({
          where: { id },
          data: {
            ...(summary && summary),
            ...(data.receiptDate && { createdAt: new Date(data.receiptDate) }),
            ...(data.items && {
              items: {
                create: data.items.map(item => ({
                  receiptId: item.receiptId,
                  accountId: item.accountId,
                  amount: item.amount,
                  discount: item.discount,
                  totalAmount: item.totalAmount,
                  remarks: item.remarks || null,
                  paymentMode: item.paymentMode || null,
                  dateOfTransaction: item.dateOfTransaction ? new Date(item.dateOfTransaction) : null,
                  accountNo: item.accountNo || null,
                  chequeNo: item.chequeNo || null,
                  transactionId: item.transactionId || null,
                  upiId: item.upiId || null,
                  bank: item.bank || null,
                  branch: item.branch || null,
                  ifscNo: item.ifscNo || null
                }))
              }
            })
          },
          include: {
            items: true
          }
        })
      })

      // Phase 18.7: Record new ledger entries
      for (const item of quickReceipt.items) {
        await this.accountLedgerService.recordQuickReceipt(
          existingReceipt.companyId,
          item.accountId,
          item.receiptId || quickReceipt.id,
          item.totalAmount,
          item.paymentMode || 'cash',
          item.remarks || undefined
        )
      }

      return {
        success: true,
        data: quickReceipt as QuickReceipt
      }
    } catch (error: any) {
      console.error('Update quick receipt error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update quick receipt'
      }
    }
  }

  /**
   * Delete a Quick Receipt
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Phase 18.7: Get receipt with items for ledger reversal
      const receipt = await prisma.quickReceipt.findUnique({
        where: { id },
        include: { items: true }
      })

      if (receipt) {
        // Reverse ledger entries before deleting
        for (const item of receipt.items) {
          await this.accountLedgerService.reverseQuickReceipt(
            receipt.companyId,
            item.accountId,
            item.receiptId || receipt.id
          )
        }
      }

      await prisma.quickReceipt.delete({
        where: { id }
      })

      return {
        success: true
      }
    } catch (error: any) {
      console.error('Delete quick receipt error:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete quick receipt'
      }
    }
  }

  /**
   * Delete multiple Quick Receipts
   */
  async deleteMany(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Phase 18.7: Get all receipts with items for ledger reversal
      const receipts = await prisma.quickReceipt.findMany({
        where: { id: { in: ids } },
        include: { items: true }
      })

      // Reverse ledger entries for all receipts
      for (const receipt of receipts) {
        for (const item of receipt.items) {
          await this.accountLedgerService.reverseQuickReceipt(
            receipt.companyId,
            item.accountId,
            item.receiptId || receipt.id
          )
        }
      }

      await prisma.quickReceipt.deleteMany({
        where: {
          id: {
            in: ids
          }
        }
      })

      return {
        success: true
      }
    } catch (error: any) {
      console.error('Delete many quick receipts error:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete quick receipts'
      }
    }
  }
}
