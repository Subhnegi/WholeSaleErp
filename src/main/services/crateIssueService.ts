/**
 * Crate Issue Service
 * Phase 13.5 - Handles all Crate Issue transaction operations
 * Phase 18.7 - Added account ledger integration
 */

import type { 
  CrateIssue, 
  CreateCrateIssueInput,
  UpdateCrateIssueInput,
  CrateIssueSummary,
  ApiResponse 
} from '../types/crateIssue'
import DatabaseService from './database'
import { AccountLedgerService } from './accountLedgerService'

export class CrateIssueService {
  private static instance: CrateIssueService
  private databaseService: DatabaseService
  private accountLedgerService: AccountLedgerService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.accountLedgerService = AccountLedgerService.getInstance()
  }

  public static getInstance(): CrateIssueService {
    if (!CrateIssueService.instance) {
      CrateIssueService.instance = new CrateIssueService()
    }
    return CrateIssueService.instance
  }

  /**
   * Calculate summary from items
   */
  private async calculateSummary(items: { 
    qty: number
    crateMarkaId: string
  }[]): Promise<CrateIssueSummary> {
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
   * Create a new Crate Issue transaction
   */
  async createCrateIssue(data: CreateCrateIssueInput): Promise<ApiResponse<CrateIssue>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Calculate summary from items
      const summary = await this.calculateSummary(data.items)

      // Use Prisma transaction to ensure atomicity
      const crateIssue = await prisma.$transaction(async (tx) => {
        // Create CrateIssue with items in a single transaction
        return await tx.crateIssue.create({
          data: {
            companyId: data.companyId,
            issueDate: data.issueDate,
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

      // Phase 18.7: Record ledger entry for each account
      const accountGroups = new Map<string, number>()
      for (const item of crateIssue.items) {
        const existingQty = accountGroups.get(item.accountId) || 0
        accountGroups.set(item.accountId, existingQty + item.qty)
      }

      for (const [accountId, totalQty] of accountGroups) {
        // Get account name for particulars
        const accItems = crateIssue.items.filter(i => i.accountId === accountId)
        const accName = accItems[0]?.account?.accountName || 'Account'
        await this.accountLedgerService.recordCrateIssue(
          data.companyId,
          accountId,
          `CI-${crateIssue.id.slice(-6)}`,
          totalQty,
          `Crate Issue to ${accName}`
        )
      }

      return {
        success: true,
        data: crateIssue as CrateIssue
      }
    } catch (error) {
      console.error('Create Crate Issue error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create crate issue'
      }
    }
  }

  /**
   * Get all Crate Issue transactions for a company
   */
  async getCrateIssuesByCompany(
    companyId: string, 
    options?: { fromDate?: string; toDate?: string }
  ): Promise<ApiResponse<CrateIssue[]>> {
    try {
      const prisma = await this.databaseService.getClient()

      const where: any = { companyId }

      if (options?.fromDate || options?.toDate) {
        where.issueDate = {}
        if (options.fromDate) where.issueDate.gte = options.fromDate
        if (options.toDate) where.issueDate.lte = options.toDate
      }

      const crateIssues = await prisma.crateIssue.findMany({
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
          issueDate: 'desc'
        }
      })

      return {
        success: true,
        data: crateIssues as CrateIssue[]
      }
    } catch (error) {
      console.error('Get Crate Issues error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get crate issues'
      }
    }
  }

  /**
   * Get a single Crate Issue by ID
   */
  async getCrateIssueById(id: string): Promise<ApiResponse<CrateIssue>> {
    try {
      const prisma = await this.databaseService.getClient()

      const crateIssue = await prisma.crateIssue.findUnique({
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

      if (!crateIssue) {
        return {
          success: false,
          message: 'Crate Issue not found'
        }
      }

      return {
        success: true,
        data: crateIssue as CrateIssue
      }
    } catch (error) {
      console.error('Get Crate Issue error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get crate issue'
      }
    }
  }

  /**
   * Update a Crate Issue transaction
   */
  async updateCrateIssue(
    id: string, 
    data: UpdateCrateIssueInput
  ): Promise<ApiResponse<CrateIssue>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get existing crate issue to reverse ledger entries
      const existingIssue = await prisma.crateIssue.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existingIssue) {
        return { success: false, message: 'Crate Issue not found' }
      }

      // Phase 18.7: Reverse old ledger entries
      const oldAccountIds = [...new Set(existingIssue.items.map(i => i.accountId))]
      for (const accountId of oldAccountIds) {
        await this.accountLedgerService.reverseCrateIssue(
          existingIssue.companyId,
          accountId,
          `CI-${existingIssue.id.slice(-6)}`
        )
      }

      // If items are being updated, recalculate summary
      let summary: CrateIssueSummary | undefined
      if (data.items) {
        summary = await this.calculateSummary(data.items)
      }

      const crateIssue = await prisma.$transaction(async (tx) => {
        // If items are provided, delete old items and create new ones
        if (data.items) {
          await tx.crateIssueItem.deleteMany({
            where: { crateIssueId: id }
          })
        }

        return await tx.crateIssue.update({
          where: { id },
          data: {
            ...(data.issueDate && { issueDate: data.issueDate }),
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
      for (const item of crateIssue.items) {
        const existingQty = accountGroups.get(item.accountId) || 0
        accountGroups.set(item.accountId, existingQty + item.qty)
      }

      for (const [accountId, totalQty] of accountGroups) {
        const accItems = crateIssue.items.filter(i => i.accountId === accountId)
        const accName = accItems[0]?.account?.accountName || 'Account'
        await this.accountLedgerService.recordCrateIssue(
          existingIssue.companyId,
          accountId,
          `CI-${crateIssue.id.slice(-6)}`,
          totalQty,
          `Crate Issue to ${accName}`
        )
      }

      return {
        success: true,
        data: crateIssue as CrateIssue
      }
    } catch (error) {
      console.error('Update Crate Issue error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update crate issue'
      }
    }
  }

  /**
   * Delete a Crate Issue transaction
   */
  async deleteCrateIssue(id: string): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get existing to reverse ledger entries
      const existingIssue = await prisma.crateIssue.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existingIssue) {
        return { success: false, message: 'Crate Issue not found' }
      }

      // Phase 18.7: Reverse ledger entries before deletion
      const accountIds = [...new Set(existingIssue.items.map(i => i.accountId))]
      for (const accountId of accountIds) {
        await this.accountLedgerService.reverseCrateIssue(
          existingIssue.companyId,
          accountId,
          `CI-${existingIssue.id.slice(-6)}`
        )
      }

      await prisma.crateIssue.delete({
        where: { id }
      })

      return {
        success: true,
        message: 'Crate Issue deleted successfully'
      }
    } catch (error) {
      console.error('Delete Crate Issue error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete crate issue'
      }
    }
  }

  /**
   * Bulk delete Crate Issue transactions
   */
  async bulkDeleteCrateIssues(ids: string[]): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      await prisma.crateIssue.deleteMany({
        where: {
          id: {
            in: ids
          }
        }
      })

      return {
        success: true,
        message: `${ids.length} Crate Issue(s) deleted successfully`
      }
    } catch (error) {
      console.error('Bulk delete Crate Issues error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete crate issues'
      }
    }
  }

  /**
   * Create or update crate issue items from Quick Sale
   * Phase 13.7 - Integration with Quick Sale
   */
  async syncFromQuickSale(
    companyId: string,
    saleDate: string,
    _quickSaleId: string,
    items: Array<{
      quickSaleItemId: string
      accountId: string
      crateMarkaId: string
      qty: number
      remarks?: string
    }>
  ): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Generate vchNo for quick sale: Q + date (YYYYMMDD format)
      const dateObj = new Date(saleDate)
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      const vchNo = `Q${year}${month}${day}`

      await prisma.$transaction(async (tx) => {
        // Find or create CrateIssue for this date
        let crateIssue = await tx.crateIssue.findFirst({
          where: {
            companyId,
            issueDate: saleDate
          }
        })

        if (!crateIssue) {
          crateIssue = await tx.crateIssue.create({
            data: {
              companyId,
              issueDate: saleDate,
              totalQty: 0,
              totalCrateAmount: 0
            }
          })
        }

        // Delete existing items from this quick sale (to handle updates)
        await tx.crateIssueItem.deleteMany({
          where: {
            crateIssueId: crateIssue.id,
            sourceType: 'quick_sale',
            sourceId: {
              in: items.map(i => i.quickSaleItemId)
            }
          }
        })

        // Create new crate issue items for items with qty > 0
        const validItems = items.filter(i => i.qty > 0)
        
        if (validItems.length > 0) {
          for (const item of validItems) {
            await tx.crateIssueItem.create({
              data: {
                crateIssueId: crateIssue.id,
                accountId: item.accountId,
                crateMarkaId: item.crateMarkaId,
                qty: item.qty,
                remarks: item.remarks || `Quick Sale - ${saleDate}`,
                sourceType: 'quick_sale',
                sourceId: item.quickSaleItemId,
                vchNo
              }
            })
          }
        }

        // Recalculate totals for the crate issue
        const allItems = await tx.crateIssueItem.findMany({
          where: { crateIssueId: crateIssue.id },
          include: { crateMarka: { select: { cost: true } } }
        })

        const totalQty = allItems.reduce((sum, i) => sum + i.qty, 0)
        const totalCrateAmount = allItems.reduce((sum, i) => sum + (i.qty * (i.crateMarka?.cost || 0)), 0)

        await tx.crateIssue.update({
          where: { id: crateIssue.id },
          data: { totalQty, totalCrateAmount }
        })

        // If no items left, delete the crate issue
        if (allItems.length === 0) {
          await tx.crateIssue.delete({
            where: { id: crateIssue.id }
          })
        }
      })

      // Create ledger entries for crate issues grouped by account
      // First reverse any existing entries for this voucher, then record new ones
      const validItems = items.filter(i => i.qty > 0)
      const accountGroups = new Map<string, { qty: number; crateMarkaIds: string[] }>()
      for (const item of validItems) {
        const existing = accountGroups.get(item.accountId) || { qty: 0, crateMarkaIds: [] }
        existing.qty += item.qty
        if (!existing.crateMarkaIds.includes(item.crateMarkaId)) {
          existing.crateMarkaIds.push(item.crateMarkaId)
        }
        accountGroups.set(item.accountId, existing)
      }

      for (const [accountId, details] of accountGroups) {
        // Reverse any existing entry first
        await this.accountLedgerService.reverseCrateIssue(companyId, accountId, vchNo)
        // Record new entry
        await this.accountLedgerService.recordCrateIssue(
          companyId,
          accountId,
          vchNo,
          details.qty,
          `Quick Sale Crates`
        )
      }

      return {
        success: true,
        message: 'Crate issues synced from Quick Sale successfully'
      }
    } catch (error) {
      console.error('Sync from Quick Sale error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync crate issues from Quick Sale'
      }
    }
  }

  /**
   * Delete crate issue items by quick sale ID
   * Phase 13.7 - Called when a Quick Sale is deleted
   */
  async deleteByQuickSale(quickSaleItemIds: string[]): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Find items and their account/vchNo for ledger reversal before deletion
      const itemsForLedger = await prisma.crateIssueItem.findMany({
        where: {
          sourceType: 'quick_sale',
          sourceId: { in: quickSaleItemIds }
        },
        select: {
          accountId: true,
          vchNo: true,
          qty: true,
          crateIssue: { select: { companyId: true } }
        }
      })

      await prisma.$transaction(async (tx) => {
        // Find all crate issue items from this quick sale
        const items = await tx.crateIssueItem.findMany({
          where: {
            sourceType: 'quick_sale',
            sourceId: { in: quickSaleItemIds }
          },
          select: { crateIssueId: true }
        })

        const crateIssueIds = [...new Set(items.map(i => i.crateIssueId))]

        // Delete the items
        await tx.crateIssueItem.deleteMany({
          where: {
            sourceType: 'quick_sale',
            sourceId: { in: quickSaleItemIds }
          }
        })

        // Recalculate totals for affected crate issues
        for (const crateIssueId of crateIssueIds) {
          const remainingItems = await tx.crateIssueItem.findMany({
            where: { crateIssueId },
            include: { crateMarka: { select: { cost: true } } }
          })

          if (remainingItems.length === 0) {
            // Delete empty crate issue
            await tx.crateIssue.delete({
              where: { id: crateIssueId }
            })
          } else {
            // Recalculate totals
            const totalQty = remainingItems.reduce((sum, i) => sum + i.qty, 0)
            const totalCrateAmount = remainingItems.reduce((sum, i) => sum + (i.qty * (i.crateMarka?.cost || 0)), 0)

            await tx.crateIssue.update({
              where: { id: crateIssueId },
              data: { totalQty, totalCrateAmount }
            })
          }
        }
      })

      // Reverse ledger entries for deleted crate issues
      const accountVchMap = new Map<string, { companyId: string; accountId: string; vchNo: string }>()
      for (const item of itemsForLedger) {
        if (item.vchNo && item.crateIssue?.companyId) {
          const key = `${item.crateIssue.companyId}-${item.accountId}-${item.vchNo}`
          if (!accountVchMap.has(key)) {
            accountVchMap.set(key, {
              companyId: item.crateIssue.companyId,
              accountId: item.accountId,
              vchNo: item.vchNo
            })
          }
        }
      }

      for (const { companyId, accountId, vchNo } of accountVchMap.values()) {
        await this.accountLedgerService.reverseCrateIssue(companyId, accountId, vchNo)
      }

      return {
        success: true,
        message: 'Crate issues deleted for Quick Sale successfully'
      }
    } catch (error) {
      console.error('Delete by Quick Sale error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete crate issues for Quick Sale'
      }
    }
  }

  /**
   * Create or update crate issue items from Daily Sale (Voucher)
   * Phase 13.7 - Integration with Daily Sale
   */
  async syncFromDailySale(
    companyId: string,
    voucherDate: string,
    voucherNo: string,
    items: Array<{
      voucherItemId: string
      accountId: string  // Customer ID
      crateMarkaId: string
      qty: number
      remarks?: string
    }>
  ): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      await prisma.$transaction(async (tx) => {
        // Find or create CrateIssue for this date
        let crateIssue = await tx.crateIssue.findFirst({
          where: {
            companyId,
            issueDate: voucherDate
          }
        })

        if (!crateIssue) {
          crateIssue = await tx.crateIssue.create({
            data: {
              companyId,
              issueDate: voucherDate,
              totalQty: 0,
              totalCrateAmount: 0
            }
          })
        }

        // Delete existing items from this voucher (to handle updates)
        await tx.crateIssueItem.deleteMany({
          where: {
            crateIssueId: crateIssue.id,
            sourceType: 'daily_sale',
            sourceId: {
              in: items.map(i => i.voucherItemId)
            }
          }
        })

        // Create new crate issue items for items with qty > 0
        const validItems = items.filter(i => i.qty > 0)
        
        if (validItems.length > 0) {
          for (const item of validItems) {
            await tx.crateIssueItem.create({
              data: {
                crateIssueId: crateIssue.id,
                accountId: item.accountId,
                crateMarkaId: item.crateMarkaId,
                qty: item.qty,
                remarks: item.remarks || `Daily Sale - ${voucherNo}`,
                sourceType: 'daily_sale',
                sourceId: item.voucherItemId,
                vchNo: voucherNo
              }
            })
          }
        }

        // Recalculate totals for the crate issue
        const allItems = await tx.crateIssueItem.findMany({
          where: { crateIssueId: crateIssue.id },
          include: { crateMarka: { select: { cost: true } } }
        })

        const totalQty = allItems.reduce((sum, i) => sum + i.qty, 0)
        const totalCrateAmount = allItems.reduce((sum, i) => sum + (i.qty * (i.crateMarka?.cost || 0)), 0)

        await tx.crateIssue.update({
          where: { id: crateIssue.id },
          data: { totalQty, totalCrateAmount }
        })

        // If no items left, delete the crate issue
        if (allItems.length === 0) {
          await tx.crateIssue.delete({
            where: { id: crateIssue.id }
          })
        }
      })

      // Create ledger entries for crate issues grouped by account
      // First reverse any existing entries for this voucher, then record new ones
      const validItems = items.filter(i => i.qty > 0)
      const accountGroups = new Map<string, { qty: number; crateMarkaIds: string[] }>()
      for (const item of validItems) {
        const existing = accountGroups.get(item.accountId) || { qty: 0, crateMarkaIds: [] }
        existing.qty += item.qty
        if (!existing.crateMarkaIds.includes(item.crateMarkaId)) {
          existing.crateMarkaIds.push(item.crateMarkaId)
        }
        accountGroups.set(item.accountId, existing)
      }

      for (const [accountId, details] of accountGroups) {
        // Reverse any existing entry first
        await this.accountLedgerService.reverseCrateIssue(companyId, accountId, voucherNo)
        // Record new entry
        await this.accountLedgerService.recordCrateIssue(
          companyId,
          accountId,
          voucherNo,
          details.qty,
          `Daily Sale Crates`
        )
      }

      return {
        success: true,
        message: 'Crate issues synced from Daily Sale successfully'
      }
    } catch (error) {
      console.error('Sync from Daily Sale error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync crate issues from Daily Sale'
      }
    }
  }

  /**
   * Delete crate issue items by voucher item IDs
   * Phase 13.7 - Called when a Daily Sale (Voucher) is deleted
   */
  async deleteByDailySale(voucherItemIds: string[]): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Find items and their account/vchNo for ledger reversal before deletion
      const itemsForLedger = await prisma.crateIssueItem.findMany({
        where: {
          sourceType: 'daily_sale',
          sourceId: { in: voucherItemIds }
        },
        select: {
          accountId: true,
          vchNo: true,
          qty: true,
          crateIssue: { select: { companyId: true } }
        }
      })

      await prisma.$transaction(async (tx) => {
        // Find all crate issue items from this voucher
        const items = await tx.crateIssueItem.findMany({
          where: {
            sourceType: 'daily_sale',
            sourceId: { in: voucherItemIds }
          },
          select: { crateIssueId: true }
        })

        const crateIssueIds = [...new Set(items.map(i => i.crateIssueId))]

        // Delete the items
        await tx.crateIssueItem.deleteMany({
          where: {
            sourceType: 'daily_sale',
            sourceId: { in: voucherItemIds }
          }
        })

        // Recalculate totals for affected crate issues
        for (const crateIssueId of crateIssueIds) {
          const remainingItems = await tx.crateIssueItem.findMany({
            where: { crateIssueId },
            include: { crateMarka: { select: { cost: true } } }
          })

          if (remainingItems.length === 0) {
            // Delete empty crate issue
            await tx.crateIssue.delete({
              where: { id: crateIssueId }
            })
          } else {
            // Recalculate totals
            const totalQty = remainingItems.reduce((sum, i) => sum + i.qty, 0)
            const totalCrateAmount = remainingItems.reduce((sum, i) => sum + (i.qty * (i.crateMarka?.cost || 0)), 0)

            await tx.crateIssue.update({
              where: { id: crateIssueId },
              data: { totalQty, totalCrateAmount }
            })
          }
        }
      })

      // Reverse ledger entries for deleted crate issues
      const accountVchMap = new Map<string, { companyId: string; accountId: string; vchNo: string }>()
      for (const item of itemsForLedger) {
        if (item.vchNo && item.crateIssue?.companyId) {
          const key = `${item.crateIssue.companyId}-${item.accountId}-${item.vchNo}`
          if (!accountVchMap.has(key)) {
            accountVchMap.set(key, {
              companyId: item.crateIssue.companyId,
              accountId: item.accountId,
              vchNo: item.vchNo
            })
          }
        }
      }

      for (const { companyId, accountId, vchNo } of accountVchMap.values()) {
        await this.accountLedgerService.reverseCrateIssue(companyId, accountId, vchNo)
      }

      return {
        success: true,
        message: 'Crate issues deleted for Daily Sale successfully'
      }
    } catch (error) {
      console.error('Delete by Daily Sale error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete crate issues for Daily Sale'
      }
    }
  }
}
