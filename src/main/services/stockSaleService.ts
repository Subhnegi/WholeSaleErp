/**
 * Stock Sale Service
 * Phase 15.4 - Handles all Stock Sale operations
 * Phase 15.4 - Added stock ledger integration
 * Phase 18.7 - Added account ledger integration
 * 
 * Features:
 * - CRUD operations for StockSale and StockSaleItem
 * - Date-based filtering
 * - Integration with crate issue system
 * - Stock ledger updates
 * - Account ledger updates
 */

import DatabaseService from './database'
import { StockLedgerService } from './stockLedgerService'
import { AccountLedgerService } from './accountLedgerService'

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export interface StockSaleListFilters {
  startDate?: string
  endDate?: string
  supplierId?: string
  storeId?: string
  customerId?: string
  itemId?: string
}

export interface StockSaleItemData {
  supplierId: string  // Moved from StockSale to item level
  storeId: string | null  // Moved from StockSale to item level
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
}

export interface StockSaleData {
  date: string
  totalNug: number
  totalKg: number
  basicAmount: number
  supplierAmount: number
  customerAmount: number
  items: StockSaleItemData[]
  voucherNo?: string
}

export class StockSaleService {
  private static instance: StockSaleService
  private databaseService: DatabaseService
  private accountLedgerService: AccountLedgerService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.accountLedgerService = AccountLedgerService.getInstance()
  }

  public static getInstance(): StockSaleService {
    if (!StockSaleService.instance) {
      StockSaleService.instance = new StockSaleService()
    }
    return StockSaleService.instance
  }

  /**
   * Serialize dates in stock sale data to ISO strings for Redux compatibility
   */
  private serializeStockSale(stockSale: any): any {
    if (!stockSale) return stockSale
    
    return {
      ...stockSale,
      // saleDate is already a string in schema
      date: stockSale.saleDate || stockSale.date,
      createdAt: stockSale.createdAt instanceof Date 
        ? stockSale.createdAt.toISOString() 
        : stockSale.createdAt,
      updatedAt: stockSale.updatedAt instanceof Date 
        ? stockSale.updatedAt.toISOString() 
        : stockSale.updatedAt,
      items: stockSale.items?.map((item: any) => ({
        ...item,
        createdAt: item.createdAt instanceof Date 
          ? item.createdAt.toISOString() 
          : item.createdAt,
        updatedAt: item.updatedAt instanceof Date 
          ? item.updatedAt.toISOString() 
          : item.updatedAt
      }))
    }
  }

  /**
   * Generate voucher number with format SS-YYYYMMDD-XXX
   */
  private async generateVoucherNumber(companyId: string, saleDate: string): Promise<string> {
    try {
      const prisma = await this.databaseService.getClient()
      const dateObj = saleDate ? new Date(saleDate) : new Date()
      const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj
      const year = validDate.getFullYear()
      const month = String(validDate.getMonth() + 1).padStart(2, '0')
      const day = String(validDate.getDate()).padStart(2, '0')
      const datePrefix = `SS-${year}${month}${day}`

      const lastSale = await prisma.stockSale.findFirst({
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

      if (!lastSale || !lastSale.voucherNo) {
        return `${datePrefix}-001`
      }

      const parts = lastSale.voucherNo.split('-')
      const lastNumber = parseInt(parts[2] || '0', 10)
      const nextNumber = String(lastNumber + 1).padStart(3, '0')
      return `${datePrefix}-${nextNumber}`
    } catch (error) {
      console.error('[StockSaleService] Error generating voucher number:', error)
      const dateObj = saleDate ? new Date(saleDate) : new Date()
      const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj
      const year = validDate.getFullYear()
      const month = String(validDate.getMonth() + 1).padStart(2, '0')
      const day = String(validDate.getDate()).padStart(2, '0')
      return `SS-${year}${month}${day}-${Date.now()}`
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
   * Create or update crate issue entries for stock sale items
   * This syncs crate issue entries based on stock sale items with crates
   */
  private async syncCrateIssueEntries(
    companyId: string,
    stockSaleId: string,
    date: string,
    items: any[]
  ): Promise<void> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get items that have crate data
      const crateItems = items.filter(item => item.crateMarkaId && item.crateQty && Number(item.crateQty) > 0)

      // Find existing crate issue entries linked to this stock sale via slipNo
      const existingIssues = await prisma.crateIssue.findMany({
        where: {
          companyId,
          items: {
            some: {
              slipNo: stockSaleId
            }
          }
        },
        include: {
          items: true
        }
      })

      // If no crate items, delete all existing crate issue entries for this stock sale
      if (crateItems.length === 0) {
        for (const issue of existingIssues) {
          // Delete items linked to this stock sale
          await prisma.crateIssueItem.deleteMany({
            where: {
              crateIssueId: issue.id,
              slipNo: stockSaleId
            }
          })
          // Check if issue has any remaining items
          const remainingItems = await prisma.crateIssueItem.count({
            where: { crateIssueId: issue.id }
          })
          // If no remaining items, delete the issue entry
          if (remainingItems === 0) {
            await prisma.crateIssue.delete({
              where: { id: issue.id }
            })
          } else {
            // Recalculate totals
            await this.recalculateCrateIssueTotals(issue.id)
          }
        }
        return
      }

      // Calculate summary for crate items
      let totalQty = 0
      let totalCrateAmount = 0
      for (const item of crateItems) {
        const qty = Number(item.crateQty) || 0
        totalQty += qty
        // Get crate cost
        const crate = await prisma.crateMarka.findUnique({
          where: { id: item.crateMarkaId },
          select: { cost: true }
        })
        if (crate) {
          totalCrateAmount += qty * crate.cost
        }
      }

      if (existingIssues.length > 0) {
        // Update existing crate issue
        const issue = existingIssues[0]
        
        // Delete existing items linked to this stock sale
        await prisma.crateIssueItem.deleteMany({
          where: {
            crateIssueId: issue.id,
            slipNo: stockSaleId
          }
        })

        // Create new items (grouped by customer)
        for (const item of crateItems) {
          await prisma.crateIssueItem.create({
            data: {
              crateIssueId: issue.id,
              accountId: item.customerId,
              crateMarkaId: item.crateMarkaId,
              qty: Number(item.crateQty) || 0,
              slipNo: stockSaleId,
              remarks: `Auto-synced from Stock Sale`
            }
          })
        }

        // Recalculate totals for the crate issue
        await this.recalculateCrateIssueTotals(issue.id)

        console.log(`[StockSaleService] Updated crate issue ${issue.id} for stock sale ${stockSaleId}`)
      } else {
        // Create new crate issue
        const newIssue = await prisma.crateIssue.create({
          data: {
            companyId,
            issueDate: date,
            totalQty,
            totalCrateAmount,
            items: {
              create: crateItems.map(item => ({
                accountId: item.customerId,
                crateMarkaId: item.crateMarkaId,
                qty: Number(item.crateQty) || 0,
                slipNo: stockSaleId,
                remarks: `Auto-created from Stock Sale`
              }))
            }
          }
        })

        console.log(`[StockSaleService] Created crate issue ${newIssue.id} for stock sale ${stockSaleId}`)
      }
    } catch (error) {
      console.error('[StockSaleService] Error syncing crate issue entries:', error)
      // Don't throw - crate issue sync is not critical
    }
  }

  /**
   * Recalculate totals for a crate issue entry
   */
  private async recalculateCrateIssueTotals(crateIssueId: string): Promise<void> {
    const prisma = await this.databaseService.getClient()

    const items = await prisma.crateIssueItem.findMany({
      where: { crateIssueId },
      include: {
        crateMarka: {
          select: { cost: true }
        }
      }
    })

    let totalQty = 0
    let totalCrateAmount = 0

    for (const item of items) {
      totalQty += item.qty
      if (item.crateMarka) {
        totalCrateAmount += item.qty * item.crateMarka.cost
      }
    }

    await prisma.crateIssue.update({
      where: { id: crateIssueId },
      data: {
        totalQty,
        totalCrateAmount
      }
    })
  }

  /**
   * Delete crate issue entries linked to a stock sale
   */
  private async deleteCrateIssueEntries(companyId: string, stockSaleId: string): Promise<void> {
    try {
      const prisma = await this.databaseService.getClient()

      // Find existing crate issue entries linked to this stock sale via slipNo
      const existingIssues = await prisma.crateIssue.findMany({
        where: {
          companyId,
          items: {
            some: {
              slipNo: stockSaleId
            }
          }
        },
        include: {
          items: true
        }
      })

      for (const issue of existingIssues) {
        // Delete items linked to this stock sale
        await prisma.crateIssueItem.deleteMany({
          where: {
            crateIssueId: issue.id,
            slipNo: stockSaleId
          }
        })
        // Check if issue has any remaining items
        const remainingItems = await prisma.crateIssueItem.count({
          where: { crateIssueId: issue.id }
        })
        // If no remaining items, delete the issue entry
        if (remainingItems === 0) {
          await prisma.crateIssue.delete({
            where: { id: issue.id }
          })
          console.log(`[StockSaleService] Deleted crate issue ${issue.id} for stock sale ${stockSaleId}`)
        } else {
          // Recalculate totals
          await this.recalculateCrateIssueTotals(issue.id)
          console.log(`[StockSaleService] Removed stock sale items from crate issue ${issue.id}`)
        }
      }
    } catch (error) {
      console.error('[StockSaleService] Error deleting crate issue entries:', error)
      // Don't throw - crate issue deletion is not critical
    }
  }

  /**
   * Get stock sales by date range
   */
  async getStockSalesByFilters(
    companyId: string,
    filters?: StockSaleListFilters
  ): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      // Build where clause
      const where: any = { companyId }
      
      // saleDate is a string field, use string comparison
      if (filters?.startDate && filters?.endDate) {
        where.saleDate = {
          gte: filters.startDate,
          lte: filters.endDate
        }
      } else if (filters?.startDate) {
        where.saleDate = { gte: filters.startDate }
      } else if (filters?.endDate) {
        where.saleDate = { lte: filters.endDate }
      }

      const itemLevelFilters: any[] = []
      if (filters?.supplierId) {
        itemLevelFilters.push({ supplierId: filters.supplierId })
      }
      if (filters?.storeId) {
        itemLevelFilters.push({ storeId: filters.storeId })
      }
      if (filters?.customerId) {
        itemLevelFilters.push({ customerId: filters.customerId })
      }
      if (filters?.itemId) {
        itemLevelFilters.push({ itemId: filters.itemId })
      }

      if (itemLevelFilters.length > 0) {
        where.items = {
          some: {
            AND: itemLevelFilters
          }
        }
      }

      console.log('[StockSaleService] Fetching stock sales with filters:', { companyId, filters, where })

      const stockSales = await prisma.stockSale.findMany({
        where,
        include: {
          items: true
        },
        orderBy: {
          saleDate: 'desc'
        }
      })

      // Map to frontend expected format
      const serializedStockSales = stockSales.map((ss: any) => this.serializeStockSale(ss))

      console.log(`[StockSaleService] Found ${serializedStockSales.length} stock sales`)

      return {
        success: true,
        data: serializedStockSales
      }
    } catch (error) {
      console.error('[StockSaleService] Error fetching stock sales:', error)
      return {
        success: false,
        error: `Failed to fetch stock sales: ${error}`
      }
    }
  }

  /**
   * Get single stock sale by ID
   */
  async getStockSaleById(id: string): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      const stockSale = await prisma.stockSale.findUnique({
        where: { id },
        include: {
          items: true
        }
      })

      if (!stockSale) {
        return {
          success: false,
          error: 'Stock sale not found'
        }
      }

      return {
        success: true,
        data: this.serializeStockSale(stockSale)
      }
    } catch (error) {
      console.error('[StockSaleService] Error fetching stock sale:', error)
      return {
        success: false,
        error: `Failed to fetch stock sale: ${error}`
      }
    }
  }

  /**
   * Create new stock sale
   */
  async createStockSale(companyId: string, data: StockSaleData): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      console.log('[StockSaleService] Creating stock sale:', { companyId, data })

      const voucherNo = data.voucherNo || await this.generateVoucherNumber(companyId, data.date)

      // Get item, customer, supplier, and store names for denormalization
      const itemsWithNames = await Promise.all(data.items.map(async (item) => {
        const [itemRecord, customerRecord, supplierRecord, storeRecord] = await Promise.all([
          prisma.item.findUnique({
            where: { id: item.itemId },
            select: { itemName: true }
          }),
          prisma.account.findUnique({
            where: { id: item.customerId },
            select: { accountName: true }
          }),
          prisma.account.findUnique({
            where: { id: item.supplierId },
            select: { accountName: true }
          }),
          item.storeId ? prisma.store.findUnique({
            where: { id: item.storeId },
            select: { name: true }
          }) : Promise.resolve(null)
        ])
        
        return {
          ...item,
          itemName: itemRecord?.itemName || '',
          customerName: customerRecord?.accountName || '',
          supplierName: supplierRecord?.accountName || '',
          storeName: storeRecord?.name || null
        }
      }))

      // Calculate customerAmount as sum of all item netAmounts
      const calculatedCustomerAmount = itemsWithNames.reduce((sum, item) => sum + (item.netAmount || 0), 0)

      // Create stock sale with items
      const stockSale = await prisma.stockSale.create({
        data: {
          companyId,
          saleDate: data.date,
          voucherNo,
          totalNug: data.totalNug,
          totalKg: data.totalKg,
          basicAmount: data.basicAmount,
          supplierAmount: data.supplierAmount,
          customerAmount: calculatedCustomerAmount,
          items: {
            create: itemsWithNames.map(item => ({
              supplierId: item.supplierId,
              supplierName: item.supplierName,
              storeId: item.storeId || null,
              storeName: item.storeName,
              itemId: item.itemId,
              itemName: item.itemName,
              customerId: item.customerId,
              customerName: item.customerName,
              lotNoVariety: item.lotNo || '',
              nug: item.nug,
              kg: item.kg,
              rate: item.rate,
              customerRate: item.customerRate,
              supplierRate: item.supplierRate,
              per: item.per || 'nug',
              basicAmount: item.basicAmount,
              netAmount: item.netAmount,
              commission: item.commission || 0,
              commissionPer: item.commissionPer || 0,
              marketFees: item.marketFees || 0,
              rdf: item.rdf || 0,
              bardana: item.bardana || 0,
              bardanaAt: item.bardanaAt || 0,
              laga: item.laga || 0,
              lagaAt: item.lagaAt || 0,
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

      // Sync crate issue entries for each item
      await this.syncCrateIssueEntries(companyId, stockSale.id, data.date, data.items)

      // Update stock ledger for each item (items can have different suppliers/stores)
      for (const item of data.items) {
        await StockLedgerService.addStockSale(
          companyId,
          item.supplierId,
          item.storeId || null,
          [{
            itemId: item.itemId,
            lotNoVariety: item.lotNo || '',
            nug: item.nug,
            kg: item.kg
          }]
        )
      }

      // Phase 18.7: Record ledger entries grouped by customer
      const customerGroups = new Map<string, { items: typeof itemsWithNames, total: number }>()
      for (const item of itemsWithNames) {
        const existing = customerGroups.get(item.customerId)
        if (existing) {
          existing.items.push(item)
          existing.total += item.netAmount || 0
        } else {
          customerGroups.set(item.customerId, { items: [item], total: item.netAmount || 0 })
        }
      }

      for (const [customerId, group] of customerGroups) {
        const itemsSummary = group.items.map(i => `${i.itemName} ${i.nug}N/${i.kg}Kg`).join(', ')
        await this.accountLedgerService.recordStockSale(
          companyId,
          customerId,
          voucherNo,
          group.total,
          itemsSummary
        )
      }

      console.log('[StockSaleService] Created stock sale:', stockSale.id)

      return {
        success: true,
        data: this.serializeStockSale(stockSale),
        message: 'Stock sale created successfully'
      }
    } catch (error) {
      console.error('[StockSaleService] Error creating stock sale:', error)
      return {
        success: false,
        error: `Failed to create stock sale: ${error}`
      }
    }
  }

  /**
   * Update existing stock sale
   */
  async updateStockSale(id: string, data: StockSaleData): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      console.log('[StockSaleService] Updating stock sale:', { id, data })

      // Get existing stock sale to get companyId and old items
      const existing = await prisma.stockSale.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existing) {
        return {
          success: false,
          error: 'Stock sale not found'
        }
      }

      // Remove old items from stock ledger (each item can have different supplier/store)
      if (existing.items && existing.items.length > 0) {
        for (const item of existing.items) {
          await StockLedgerService.removeStockSale(
            existing.companyId,
            item.supplierId,
            item.storeId,
            [{
              itemId: item.itemId,
              lotNoVariety: item.lotNoVariety || '',
              nug: item.nug,
              kg: item.kg
            }]
          )
        }

        // Phase 18.7: Reverse old ledger entries grouped by customer
        const oldCustomerIds = [...new Set(existing.items.map(i => i.customerId).filter((id): id is string => id !== null))]
        for (const customerId of oldCustomerIds) {
          await this.accountLedgerService.reverseStockSale(
            existing.companyId,
            customerId,
            existing.voucherNo || existing.id
          )
        }
      }

      // Get supplier, store, item, and customer names for denormalization
      const itemsWithNames = await Promise.all(data.items.map(async (item) => {
        const [itemRecord, customerRecord, supplierRecord, storeRecord] = await Promise.all([
          prisma.item.findUnique({
            where: { id: item.itemId },
            select: { itemName: true }
          }),
          prisma.account.findUnique({
            where: { id: item.customerId },
            select: { accountName: true }
          }),
          item.supplierId ? prisma.account.findUnique({
            where: { id: item.supplierId },
            select: { accountName: true }
          }) : Promise.resolve(null),
          item.storeId ? prisma.store.findUnique({
            where: { id: item.storeId },
            select: { name: true }
          }) : Promise.resolve(null)
        ])

        return {
          ...item,
          itemName: itemRecord?.itemName || '',
          customerName: customerRecord?.accountName || '',
          supplierName: supplierRecord?.accountName || '',
          storeName: storeRecord?.name || ''
        }
      }))

      // Delete existing items
      await prisma.stockSaleItem.deleteMany({
        where: { stockSaleId: id }
      })

      // Calculate customerAmount as sum of all item netAmounts
      const calculatedCustomerAmount = itemsWithNames.reduce((sum, item) => sum + (item.netAmount || 0), 0)

      // Update stock sale header
      const stockSale = await prisma.stockSale.update({
        where: { id },
        data: {
          saleDate: data.date,
          totalNug: data.totalNug,
          totalKg: data.totalKg,
          basicAmount: data.basicAmount,
          supplierAmount: data.supplierAmount,
          customerAmount: calculatedCustomerAmount,
          items: {
            create: itemsWithNames.map(item => ({
              itemId: item.itemId,
              itemName: item.itemName,
              customerId: item.customerId,
              customerName: item.customerName,
              supplierId: item.supplierId,
              supplierName: item.supplierName,
              storeId: item.storeId || null,
              storeName: item.storeName,
              lotNoVariety: item.lotNo || '',
              nug: item.nug,
              kg: item.kg,
              rate: item.rate,
              customerRate: item.customerRate,
              supplierRate: item.supplierRate,
              per: item.per || 'nug',
              basicAmount: item.basicAmount,
              netAmount: item.netAmount,
              commission: item.commission || 0,
              commissionPer: item.commissionPer || 0,
              marketFees: item.marketFees || 0,
              rdf: item.rdf || 0,
              bardana: item.bardana || 0,
              bardanaAt: item.bardanaAt || 0,
              laga: item.laga || 0,
              lagaAt: item.lagaAt || 0,
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

      // Sync crate issue entries
      await this.syncCrateIssueEntries(existing.companyId, id, data.date, data.items)

      // Add new items to stock ledger (each item can have different supplier/store)
      for (const item of data.items) {
        await StockLedgerService.addStockSale(
          existing.companyId,
          item.supplierId,
          item.storeId || null,
          [{
            itemId: item.itemId,
            lotNoVariety: item.lotNo || '',
            nug: item.nug,
            kg: item.kg
          }]
        )
      }

      // Phase 18.7: Record new ledger entries grouped by customer
      const customerGroups = new Map<string, { items: typeof itemsWithNames, total: number }>()
      for (const item of itemsWithNames) {
        const existingGroup = customerGroups.get(item.customerId)
        if (existingGroup) {
          existingGroup.items.push(item)
          existingGroup.total += item.netAmount || 0
        } else {
          customerGroups.set(item.customerId, { items: [item], total: item.netAmount || 0 })
        }
      }

      for (const [customerId, group] of customerGroups) {
        const itemsSummary = group.items.map(i => `${i.itemName} ${i.nug}N/${i.kg}Kg`).join(', ')
        await this.accountLedgerService.recordStockSale(
          stockSale.companyId,
          customerId,
          stockSale.voucherNo || stockSale.id,
          group.total,
          itemsSummary
        )
      }

      console.log('[StockSaleService] Updated stock sale:', id)

      return {
        success: true,
        data: this.serializeStockSale(stockSale),
        message: 'Stock sale updated successfully'
      }
    } catch (error) {
      console.error('[StockSaleService] Error updating stock sale:', error)
      return {
        success: false,
        error: `Failed to update stock sale: ${error}`
      }
    }
  }

  /**
   * Delete stock sale
   */
  async deleteStockSale(id: string): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get stock sale to check if it exists and get items for ledger update
      const stockSale = await prisma.stockSale.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!stockSale) {
        return {
          success: false,
          error: 'Stock sale not found'
        }
      }

      // Remove from stock ledger (each item can have different supplier/store)
      if (stockSale.items && stockSale.items.length > 0) {
        for (const item of stockSale.items) {
          await StockLedgerService.removeStockSale(
            stockSale.companyId,
            item.supplierId,
            item.storeId,
            [{
              itemId: item.itemId,
              lotNoVariety: item.lotNoVariety || '',
              nug: item.nug,
              kg: item.kg
            }]
          )
        }

        // Phase 18.7: Reverse ledger entries grouped by customer
        const customerIds = [...new Set(stockSale.items.map(i => i.customerId).filter((id): id is string => id !== null))]
        for (const customerId of customerIds) {
          await this.accountLedgerService.reverseStockSale(
            stockSale.companyId,
            customerId,
            stockSale.voucherNo || stockSale.id
          )
        }
      }

      // Delete crate issue entries first
      await this.deleteCrateIssueEntries(stockSale.companyId, id)

      // Delete stock sale (items will cascade delete)
      await prisma.stockSale.delete({
        where: { id }
      })

      console.log('[StockSaleService] Deleted stock sale:', id)

      return {
        success: true,
        message: 'Stock sale deleted successfully'
      }
    } catch (error) {
      console.error('[StockSaleService] Error deleting stock sale:', error)
      return {
        success: false,
        error: `Failed to delete stock sale: ${error}`
      }
    }
  }

  /**
   * Bulk delete stock sales
   */
  async bulkDeleteStockSales(ids: string[]): Promise<ApiResponse<{ deletedCount: number; failedCount: number; errors: string[] }>> {
    try {
      const prisma = await this.databaseService.getClient()
      
      let deletedCount = 0
      let failedCount = 0
      const errors: string[] = []

      for (const id of ids) {
        try {
          // Get stock sale for companyId
          const stockSale = await prisma.stockSale.findUnique({
            where: { id },
            select: { companyId: true }
          })

          if (stockSale) {
            // Delete crate issue entries
            await this.deleteCrateIssueEntries(stockSale.companyId, id)

            // Delete stock sale
            await prisma.stockSale.delete({
              where: { id }
            })
            deletedCount++
          } else {
            failedCount++
            errors.push(`Stock sale ${id} not found`)
          }
        } catch (err) {
          failedCount++
          errors.push(`Failed to delete stock sale ${id}: ${err}`)
        }
      }

      console.log(`[StockSaleService] Bulk deleted ${deletedCount}/${ids.length} stock sales`)

      return {
        success: true,
        data: { deletedCount, failedCount, errors }
      }
    } catch (error) {
      console.error('[StockSaleService] Error bulk deleting stock sales:', error)
      return {
        success: false,
        error: `Failed to bulk delete stock sales: ${error}`
      }
    }
  }
}

export default StockSaleService
