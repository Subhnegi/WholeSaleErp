/**
 * Quick Payment Service
 * Phase 18.3 - Handles all Quick Payment transaction operations
 * Phase 18.7 - Integration with Account Ledger
 */

import type { 
  QuickPayment, 
  CreateQuickPaymentInput,
  UpdateQuickPaymentInput,
  ApiResponse 
} from '../types/quickPayment'
import DatabaseService from './database'
import { AccountLedgerService } from './accountLedgerService'

export class QuickPaymentService {
  private static instance: QuickPaymentService
  private databaseService: DatabaseService
  private accountLedgerService: AccountLedgerService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.accountLedgerService = AccountLedgerService.getInstance()
  }

  public static getInstance(): QuickPaymentService {
    if (!QuickPaymentService.instance) {
      QuickPaymentService.instance = new QuickPaymentService()
    }
    return QuickPaymentService.instance
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
   * Create a new Quick Payment transaction
   */
  async createQuickPayment(data: CreateQuickPaymentInput): Promise<ApiResponse<QuickPayment>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Calculate summary from items
      const summary = this.calculateSummary(data.items)
      const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date()

      // Use Prisma transaction to ensure atomicity
      const quickPayment = await prisma.$transaction(async (tx) => {
        // Create QuickPayment with items in a single transaction
        return await tx.quickPayment.create({
          data: {
            companyId: data.companyId,
            createdAt: paymentDate,
            ...summary,
            items: {
              create: data.items.map(item => ({
                paymentId: item.paymentId,
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
      for (const item of quickPayment.items) {
        await this.accountLedgerService.recordQuickPayment(
          data.companyId,
          item.accountId,
          item.paymentId || quickPayment.id,
          item.totalAmount,
          item.paymentMode || 'cash',
          item.remarks || undefined
        )
      }

      return {
        success: true,
        data: quickPayment as QuickPayment
      }
    } catch (error: any) {
      console.error('Create quick payment error:', error)
      return {
        success: false,
        error: error.message || 'Failed to create quick payment'
      }
    }
  }

  /**
   * List all Quick Payments for a company
   */
  async listByCompany(companyId: string): Promise<ApiResponse<QuickPayment[]>> {
    try {
      const prisma = await this.databaseService.getClient()
      const quickPayments = await prisma.quickPayment.findMany({
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
        data: quickPayments as QuickPayment[]
      }
    } catch (error: any) {
      console.error('List quick payments error:', error)
      return {
        success: false,
        error: error.message || 'Failed to list quick payments'
      }
    }
  }

  /**
   * List Quick Payments by date range
   */
  async listByDateRange(
    companyId: string, 
    startDate: string, 
    endDate: string
  ): Promise<ApiResponse<QuickPayment[]>> {
    try {
      const prisma = await this.databaseService.getClient()
      const quickPayments = await prisma.quickPayment.findMany({
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
        data: quickPayments as QuickPayment[]
      }
    } catch (error: any) {
      console.error('List quick payments by date range error:', error)
      return {
        success: false,
        error: error.message || 'Failed to list quick payments'
      }
    }
  }

  /**
   * Get a single Quick Payment by ID
   */
  async get(id: string): Promise<ApiResponse<QuickPayment>> {
    try {
      const prisma = await this.databaseService.getClient()
      const quickPayment = await prisma.quickPayment.findUnique({
        where: { id },
        include: {
          items: true
        }
      })

      if (!quickPayment) {
        return {
          success: false,
          error: 'Quick payment not found'
        }
      }

      return {
        success: true,
        data: quickPayment as QuickPayment
      }
    } catch (error: any) {
      console.error('Get quick payment error:', error)
      return {
        success: false,
        error: error.message || 'Failed to get quick payment'
      }
    }
  }

  /**
   * Update an existing Quick Payment
   */
  async update(id: string, data: UpdateQuickPaymentInput): Promise<ApiResponse<QuickPayment>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get existing payment first for ledger reversal
      const existingPayment = await prisma.quickPayment.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existingPayment) {
        return {
          success: false,
          error: 'Quick payment not found'
        }
      }

      // Phase 18.7: Reverse old ledger entries
      for (const item of existingPayment.items) {
        await this.accountLedgerService.reverseQuickPayment(
          existingPayment.companyId,
          item.accountId,
          item.paymentId || existingPayment.id
        )
      }

      // Calculate new summary if items are provided
      const summary = data.items ? this.calculateSummary(data.items) : undefined

      const quickPayment = await prisma.$transaction(async (tx) => {
        // Delete existing items if new items are provided
        if (data.items) {
          await tx.quickPaymentItem.deleteMany({
            where: { quickPaymentId: id }
          })
        }

        // Update QuickPayment
        return await tx.quickPayment.update({
          where: { id },
          data: {
            ...(summary && summary),
            ...(data.paymentDate && { createdAt: new Date(data.paymentDate) }),
            ...(data.items && {
              items: {
                create: data.items.map(item => ({
                  paymentId: item.paymentId,
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
      for (const item of quickPayment.items) {
        await this.accountLedgerService.recordQuickPayment(
          existingPayment.companyId,
          item.accountId,
          item.paymentId || quickPayment.id,
          item.totalAmount,
          item.paymentMode || 'cash',
          item.remarks || undefined
        )
      }

      return {
        success: true,
        data: quickPayment as QuickPayment
      }
    } catch (error: any) {
      console.error('Update quick payment error:', error)
      return {
        success: false,
        error: error.message || 'Failed to update quick payment'
      }
    }
  }

  /**
   * Delete a Quick Payment
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Phase 18.7: Get payment with items for ledger reversal
      const payment = await prisma.quickPayment.findUnique({
        where: { id },
        include: { items: true }
      })

      if (payment) {
        // Reverse ledger entries before deleting
        for (const item of payment.items) {
          await this.accountLedgerService.reverseQuickPayment(
            payment.companyId,
            item.accountId,
            item.paymentId || payment.id
          )
        }
      }

      await prisma.quickPayment.delete({
        where: { id }
      })

      return {
        success: true
      }
    } catch (error: any) {
      console.error('Delete quick payment error:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete quick payment'
      }
    }
  }

  /**
   * Delete multiple Quick Payments
   */
  async deleteMany(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Phase 18.7: Get all payments with items for ledger reversal
      const payments = await prisma.quickPayment.findMany({
        where: { id: { in: ids } },
        include: { items: true }
      })

      // Reverse ledger entries for all payments
      for (const payment of payments) {
        for (const item of payment.items) {
          await this.accountLedgerService.reverseQuickPayment(
            payment.companyId,
            item.accountId,
            item.paymentId || payment.id
          )
        }
      }

      await prisma.quickPayment.deleteMany({
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
      console.error('Delete many quick payments error:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete quick payments'
      }
    }
  }
}
