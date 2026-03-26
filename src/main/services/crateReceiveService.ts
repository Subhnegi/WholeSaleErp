/**
 * Crate Receive Service
 * Phase 13.5 - Handles all Crate Receive transaction operations
 * Phase 18.7 - Added account ledger integration
 */

import type { 
  CrateReceive, 
  CreateCrateReceiveInput,
  UpdateCrateReceiveInput,
  CrateReceiveSummary,
  ApiResponse 
} from '../types/crateReceive'
import DatabaseService from './database'
import { AccountLedgerService } from './accountLedgerService'

export class CrateReceiveService {
  private static instance: CrateReceiveService
  private databaseService: DatabaseService
  private accountLedgerService: AccountLedgerService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.accountLedgerService = AccountLedgerService.getInstance()
  }

  public static getInstance(): CrateReceiveService {
    if (!CrateReceiveService.instance) {
      CrateReceiveService.instance = new CrateReceiveService()
    }
    return CrateReceiveService.instance
  }

  /**
   * Calculate summary from items
   */
  private async calculateSummary(items: { 
    qty: number
    crateMarkaId: string
  }[]): Promise<CrateReceiveSummary> {
    const prisma = await this.databaseService.getClient()
    
    let totalQty = 0
    let totalCrateAmount = 0

    for (const item of items) {
      totalQty += item.qty

      // Get crate cost
      const crate = await prisma.crateMarka.findUnique({
        where: { id: item.crateMarkaId },
        select: { cost: true }
      })

      if (crate) {
        totalCrateAmount += item.qty * crate.cost
      }
    }

    return {
      totalQty,
      totalCrateAmount
    }
  }

  /**
   * Create a new Crate Receive transaction
   */
  async createCrateReceive(data: CreateCrateReceiveInput): Promise<ApiResponse<CrateReceive>> {
    try {
      console.log('CrateReceiveService.createCrateReceive called with:', data)
      const prisma = await this.databaseService.getClient()

      // Calculate summary from items
      const summary = await this.calculateSummary(data.items)
      console.log('Calculated summary:', summary)

      // Use Prisma transaction to ensure atomicity
      const crateReceive = await prisma.$transaction(async (tx) => {
        // Create CrateReceive with items in a single transaction
        return await tx.crateReceive.create({
          data: {
            companyId: data.companyId,
            receiveDate: data.receiveDate,
            ...summary,
            items: {
              create: data.items.map(item => ({
                slipNo: item.slipNo || null,
                accountId: item.accountId,
                crateMarkaId: item.crateMarkaId,
                qty: item.qty,
                remarks: item.remarks || null
              }))
            }
          },
          include: {
            items: {
              include: {
                account: {
                  select: { accountName: true }
                },
                crateMarka: {
                  select: { crateMarkaName: true }
                }
              }
            }
          }
        })
      })

      console.log('CrateReceive created successfully:', crateReceive.id)

      // Phase 18.7: Record ledger entry for each account
      const accountGroups = new Map<string, number>()
      for (const item of crateReceive.items) {
        const existingQty = accountGroups.get(item.accountId) || 0
        accountGroups.set(item.accountId, existingQty + item.qty)
      }

      for (const [accountId, totalQty] of accountGroups) {
        const accItems = crateReceive.items.filter(i => i.accountId === accountId)
        const accName = accItems[0]?.account?.accountName || 'Account'
        await this.accountLedgerService.recordCrateReceive(
          data.companyId,
          accountId,
          `CR-${crateReceive.id.slice(-6)}`,
          totalQty,
          `Crate Receive from ${accName}`
        )
      }

      return {
        success: true,
        data: crateReceive as CrateReceive
      }
    } catch (error) {
      console.error('Create Crate Receive error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create crate receive'
      }
    }
  }

  /**
   * Get all Crate Receive transactions for a company
   */
  async getCrateReceivesByCompany(
    companyId: string, 
    options?: { fromDate?: string; toDate?: string }
  ): Promise<ApiResponse<CrateReceive[]>> {
    try {
      const prisma = await this.databaseService.getClient()

      const where: any = { companyId }

      if (options?.fromDate || options?.toDate) {
        where.receiveDate = {}
        if (options.fromDate) where.receiveDate.gte = options.fromDate
        if (options.toDate) where.receiveDate.lte = options.toDate
      }

      const crateReceives = await prisma.crateReceive.findMany({
        where,
        include: {
          items: {
            include: {
              account: {
                select: { accountName: true }
              },
              crateMarka: {
                select: { crateMarkaName: true }
              }
            }
          }
        },
        orderBy: {
          receiveDate: 'desc'
        }
      })

      return {
        success: true,
        data: crateReceives as CrateReceive[]
      }
    } catch (error) {
      console.error('Get Crate Receives error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get crate receives'
      }
    }
  }

  /**
   * Get a single Crate Receive by ID
   */
  async getCrateReceiveById(id: string): Promise<ApiResponse<CrateReceive>> {
    try {
      const prisma = await this.databaseService.getClient()

      const crateReceive = await prisma.crateReceive.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              account: {
                select: { accountName: true }
              },
              crateMarka: {
                select: { crateMarkaName: true }
              }
            }
          }
        }
      })

      if (!crateReceive) {
        return {
          success: false,
          message: 'Crate Receive not found'
        }
      }

      return {
        success: true,
        data: crateReceive as CrateReceive
      }
    } catch (error) {
      console.error('Get Crate Receive error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get crate receive'
      }
    }
  }

  /**
   * Update a Crate Receive transaction
   */
  async updateCrateReceive(
    id: string, 
    data: UpdateCrateReceiveInput
  ): Promise<ApiResponse<CrateReceive>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get existing to reverse ledger entries
      const existingReceive = await prisma.crateReceive.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existingReceive) {
        return { success: false, message: 'Crate Receive not found' }
      }

      // Phase 18.7: Reverse old ledger entries
      const oldAccountIds = [...new Set(existingReceive.items.map(i => i.accountId))]
      for (const accountId of oldAccountIds) {
        await this.accountLedgerService.reverseCrateReceive(
          existingReceive.companyId,
          accountId,
          `CR-${existingReceive.id.slice(-6)}`
        )
      }

      // If items are being updated, recalculate summary
      let summary: CrateReceiveSummary | undefined
      if (data.items) {
        summary = await this.calculateSummary(data.items)
      }

      const crateReceive = await prisma.$transaction(async (tx) => {
        // If items are provided, delete old items and create new ones
        if (data.items) {
          await tx.crateReceiveItem.deleteMany({
            where: { crateReceiveId: id }
          })
        }

        return await tx.crateReceive.update({
          where: { id },
          data: {
            ...(data.receiveDate && { receiveDate: data.receiveDate }),
            ...(summary && summary),
            ...(data.items && {
              items: {
                create: data.items.map(item => ({
                  slipNo: item.slipNo || null,
                  accountId: item.accountId,
                  crateMarkaId: item.crateMarkaId,
                  qty: item.qty,
                  remarks: item.remarks || null
                }))
              }
            })
          },
          include: {
            items: {
              include: {
                account: {
                  select: { accountName: true }
                },
                crateMarka: {
                  select: { crateMarkaName: true }
                }
              }
            }
          }
        })
      })

      // Phase 18.7: Record new ledger entries
      const accountGroups = new Map<string, number>()
      for (const item of crateReceive.items) {
        const existingQty = accountGroups.get(item.accountId) || 0
        accountGroups.set(item.accountId, existingQty + item.qty)
      }

      for (const [accountId, totalQty] of accountGroups) {
        const accItems = crateReceive.items.filter(i => i.accountId === accountId)
        const accName = accItems[0]?.account?.accountName || 'Account'
        await this.accountLedgerService.recordCrateReceive(
          existingReceive.companyId,
          accountId,
          `CR-${crateReceive.id.slice(-6)}`,
          totalQty,
          `Crate Receive from ${accName}`
        )
      }

      return {
        success: true,
        data: crateReceive as CrateReceive
      }
    } catch (error) {
      console.error('Update Crate Receive error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update crate receive'
      }
    }
  }

  /**
   * Delete a Crate Receive transaction
   */
  async deleteCrateReceive(id: string): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get existing to reverse ledger entries
      const existingReceive = await prisma.crateReceive.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existingReceive) {
        return { success: false, message: 'Crate Receive not found' }
      }

      // Phase 18.7: Reverse ledger entries before deletion
      const accountIds = [...new Set(existingReceive.items.map(i => i.accountId))]
      for (const accountId of accountIds) {
        await this.accountLedgerService.reverseCrateReceive(
          existingReceive.companyId,
          accountId,
          `CR-${existingReceive.id.slice(-6)}`
        )
      }

      await prisma.crateReceive.delete({
        where: { id }
      })

      return {
        success: true,
        message: 'Crate Receive deleted successfully'
      }
    } catch (error) {
      console.error('Delete Crate Receive error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete crate receive'
      }
    }
  }

  /**
   * Bulk delete Crate Receive transactions
   */
  async bulkDeleteCrateReceives(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      await prisma.crateReceive.deleteMany({
        where: {
          id: {
            in: ids
          }
        }
      })

      return {
        success: true,
        message: `${ids.length} Crate Receive(s) deleted successfully`
      }
    } catch (error) {
      console.error('Bulk delete Crate Receives error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete crate receives'
      }
    }
  }
}
