/**
 * Stock Ledger Service
 * Manages running stock balance for lot-wise inventory tracking
 * Phase 15.4
 */

import DatabaseService from './database'
import { v4 as uuidv4 } from 'uuid'
import { ArrivalType } from '../types/arrivalType'

export interface StockLedgerEntry {
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
  createdAt: Date
  updatedAt: Date
}

export interface StockLedgerFilters {
  supplierId?: string
  itemId?: string
  storeId?: string
  lotNoVariety?: string
  includeZeroAvailable?: boolean
  upToDate?: string
}

export class StockLedgerService {
  private static readonly mallKhataAccountName = 'Mall Khata Purchase A/c'
  private static readonly mallKhataAccountCache = new Map<string, string | null>()

  private static async getMallKhataPurchaseAccountId(companyId: string): Promise<string | null> {
    if (this.mallKhataAccountCache.has(companyId)) {
      return this.mallKhataAccountCache.get(companyId) ?? null
    }

    const prisma = await DatabaseService.getInstance().getClient()
    let account = await prisma.account.findFirst({
      where: {
        companyId,
        accountName: this.mallKhataAccountName
      },
      select: { id: true, accountName: true }
    })

    if (!account) {
      const candidates = await prisma.account.findMany({
        where: { companyId },
        select: { id: true, accountName: true }
      })

      account = candidates.find((candidate) =>
        candidate.accountName?.toLowerCase() === this.mallKhataAccountName.toLowerCase()
      ) ?? null
    }

    const accountId = account?.id ?? null
    this.mallKhataAccountCache.set(companyId, accountId)
    return accountId
  }

  static async resolveLedgerSupplierId(
    companyId: string,
    partyId: string,
    purchaseType?: ArrivalType['purchaseType'] | null
  ): Promise<string> {
    if (purchaseType !== 'selfPurchase') {
      return partyId
    }

    const mallAccountId = await this.getMallKhataPurchaseAccountId(companyId)
    if (!mallAccountId) {
      console.warn(
        '[StockLedger] Mall Khata Purchase A/c not found, falling back to party for ledger entry',
        { companyId, partyId }
      )
      return partyId
    }

    return mallAccountId
  }

  /**
   * Get or create stock ledger entry
   */
  static async getOrCreate(
    companyId: string,
    itemId: string,
    lotNoVariety: string,
    supplierId: string,
    storeId: string | null
  ): Promise<StockLedgerEntry> {
    const prisma = await DatabaseService.getInstance().getClient()

    // Try to find existing entry
    let entry = await prisma.stockLedger.findFirst({
      where: {
        companyId,
        itemId,
        lotNoVariety,
        supplierId,
        storeId: storeId ?? null
      }
    })

    // Create if doesn't exist
    if (!entry) {
      entry = await prisma.stockLedger.create({
        data: {
          id: uuidv4(),
          companyId,
          itemId,
          lotNoVariety,
          supplierId,
          storeId,
          totalNug: 0,
          totalKg: 0,
          soldNug: 0,
          soldKg: 0,
          availableNug: 0,
          availableKg: 0
        }
      })
    }

    return entry as unknown as StockLedgerEntry
  }

  /**
   * Add arrival stock to ledger
   */
  static async addArrivalStock(
    companyId: string,
    supplierId: string,
    storeId: string | null,
    items: Array<{
      itemId: string
      lotNoVariety: string
      nug: number
      kg: number
    }>
  ): Promise<void> {
    const prisma = await DatabaseService.getInstance().getClient()

    for (const item of items) {
      const entry = await this.getOrCreate(
        companyId,
        item.itemId,
        item.lotNoVariety,
        supplierId,
        storeId
      )

      await prisma.stockLedger.update({
        where: { id: entry.id },
        data: {
          totalNug: entry.totalNug + item.nug,
          totalKg: entry.totalKg + item.kg,
          availableNug: entry.totalNug + item.nug - entry.soldNug,
          availableKg: entry.totalKg + item.kg - entry.soldKg,
          updatedAt: new Date()
        }
      })
    }
  }

  /**
   * Remove arrival stock from ledger (when arrival is deleted/updated)
   */
  static async removeArrivalStock(
    companyId: string,
    supplierId: string,
    storeId: string | null,
    items: Array<{
      itemId: string
      lotNoVariety: string
      nug: number
      kg: number
    }>
  ): Promise<void> {
    const prisma = await DatabaseService.getInstance().getClient()

    for (const item of items) {
      const entry = await this.getOrCreate(
        companyId,
        item.itemId,
        item.lotNoVariety,
        supplierId,
        storeId
      )

      await prisma.stockLedger.update({
        where: { id: entry.id },
        data: {
          totalNug: Math.max(0, entry.totalNug - item.nug),
          totalKg: Math.max(0, entry.totalKg - item.kg),
          availableNug: Math.max(0, entry.totalNug - item.nug - entry.soldNug),
          availableKg: Math.max(0, entry.totalKg - item.kg - entry.soldKg),
          updatedAt: new Date()
        }
      })
    }
  }

  /**
   * Add stock sale (reduce available stock)
   */
  static async addStockSale(
    companyId: string,
    supplierId: string,
    storeId: string | null,
    items: Array<{
      itemId: string
      lotNoVariety: string
      nug: number
      kg: number
    }>
  ): Promise<void> {
    const prisma = await DatabaseService.getInstance().getClient()

    for (const item of items) {
      // Find existing entry - DO NOT create if doesn't exist!
      const entry = await prisma.stockLedger.findFirst({
        where: {
          companyId,
          itemId: item.itemId,
          lotNoVariety: item.lotNoVariety,
          supplierId,
          storeId: storeId ?? null
        }
      })

      if (!entry) {
        // Get item and store names for better error message
        const prismaForError = await DatabaseService.getInstance().getClient()
        const [itemRecord, storeRecord] = await Promise.all([
          prismaForError.item.findUnique({
            where: { id: item.itemId },
            select: { itemName: true }
          }),
          storeId ? prismaForError.store.findUnique({
            where: { id: storeId },
            select: { name: true }
          }) : Promise.resolve(null)
        ])
        
        throw new Error(
          `Stock not available: ${itemRecord?.itemName || 'Item'} (Lot: ${item.lotNoVariety}) ` +
          `is not available at ${storeRecord?.name || 'selected store'}. ` +
          `Please check if the correct store is selected.`
        )
      }

      // Check if sufficient stock available
      if (entry.availableNug < item.nug) {
        // Get item and store names for better error message
        const prismaForError = await DatabaseService.getInstance().getClient()
        const [itemRecord, storeRecord] = await Promise.all([
          prismaForError.item.findUnique({
            where: { id: item.itemId },
            select: { itemName: true }
          }),
          storeId ? prismaForError.store.findUnique({
            where: { id: storeId },
            select: { name: true }
          }) : Promise.resolve(null)
        ])
        
        throw new Error(
          `Insufficient stock: ${itemRecord?.itemName || 'Item'} (Lot: ${item.lotNoVariety}) ` +
          `at ${storeRecord?.name || 'selected store'} has only ${entry.availableNug} nug available, ` +
          `but you're trying to sell ${item.nug} nug.`
        )
      }

      await prisma.stockLedger.update({
        where: { id: entry.id },
        data: {
          soldNug: entry.soldNug + item.nug,
          soldKg: entry.soldKg + item.kg,
          availableNug: Math.max(0, entry.totalNug - (entry.soldNug + item.nug)),
          availableKg: Math.max(0, entry.totalKg - (entry.soldKg + item.kg)),
          updatedAt: new Date()
        }
      })
    }
  }

  /**
   * Remove stock sale (restore available stock)
   */
  static async removeStockSale(
    companyId: string,
    supplierId: string,
    storeId: string | null,
    items: Array<{
      itemId: string
      lotNoVariety: string
      nug: number
      kg: number
    }>
  ): Promise<void> {
    const prisma = await DatabaseService.getInstance().getClient()

    for (const item of items) {
      const entry = await this.getOrCreate(
        companyId,
        item.itemId,
        item.lotNoVariety,
        supplierId,
        storeId
      )

      await prisma.stockLedger.update({
        where: { id: entry.id },
        data: {
          soldNug: Math.max(0, entry.soldNug - item.nug),
          soldKg: Math.max(0, entry.soldKg - item.kg),
          availableNug: entry.totalNug - Math.max(0, entry.soldNug - item.nug),
          availableKg: entry.totalKg - Math.max(0, entry.soldKg - item.kg),
          updatedAt: new Date()
        }
      })
    }
  }

  /**
   * Add stock transfer (reduce available stock from supplier's lot)
   * Stock transfer is similar to stock sale - items are transferred out
   */
  static async addStockTransfer(
    companyId: string,
    items: Array<{
      itemId: string
      lotNo: string | null
      nug: number
      kg: number
    }>
  ): Promise<void> {
    const prisma = await DatabaseService.getInstance().getClient()

    for (const item of items) {
      if (!item.lotNo) continue

      // Find the stock ledger entry for this item and lot
      // Note: We don't filter by supplierId since stock transfer can pull from any supplier's lot
      const entry = await prisma.stockLedger.findFirst({
        where: {
          companyId,
          itemId: item.itemId,
          lotNoVariety: item.lotNo
        }
      })

      if (!entry) {
        const itemRecord = await prisma.item.findUnique({
          where: { id: item.itemId },
          select: { itemName: true }
        })
        
        throw new Error(
          `Stock not available: ${itemRecord?.itemName || 'Item'} (Lot: ${item.lotNo}) ` +
          `is not available in stock ledger.`
        )
      }

      // Check if sufficient stock available
      if (entry.availableNug < item.nug) {
        const itemRecord = await prisma.item.findUnique({
          where: { id: item.itemId },
          select: { itemName: true }
        })
        
        throw new Error(
          `Insufficient stock: ${itemRecord?.itemName || 'Item'} (Lot: ${item.lotNo}) ` +
          `has only ${entry.availableNug} nug available, but you're trying to transfer ${item.nug} nug.`
        )
      }

      // Update the ledger - mark as sold (transferred out)
      await prisma.stockLedger.update({
        where: { id: entry.id },
        data: {
          soldNug: entry.soldNug + item.nug,
          soldKg: entry.soldKg + item.kg,
          availableNug: Math.max(0, entry.totalNug - (entry.soldNug + item.nug)),
          availableKg: Math.max(0, entry.totalKg - (entry.soldKg + item.kg)),
          updatedAt: new Date()
        }
      })
    }
  }

  /**
   * Remove stock transfer (restore available stock)
   */
  static async removeStockTransfer(
    companyId: string,
    items: Array<{
      itemId: string
      lotNo: string | null
      nug: number
      kg: number
    }>
  ): Promise<void> {
    const prisma = await DatabaseService.getInstance().getClient()

    for (const item of items) {
      if (!item.lotNo) continue

      // Find the stock ledger entry for this item and lot
      const entry = await prisma.stockLedger.findFirst({
        where: {
          companyId,
          itemId: item.itemId,
          lotNoVariety: item.lotNo
        }
      })

      if (!entry) {
        console.warn(
          `[StockLedger] Entry not found when removing stock transfer: ${item.itemId}, lot ${item.lotNo}`
        )
        continue
      }

      // Restore the stock
      await prisma.stockLedger.update({
        where: { id: entry.id },
        data: {
          soldNug: Math.max(0, entry.soldNug - item.nug),
          soldKg: Math.max(0, entry.soldKg - item.kg),
          availableNug: entry.totalNug - Math.max(0, entry.soldNug - item.nug),
          availableKg: entry.totalKg - Math.max(0, entry.soldKg - item.kg),
          updatedAt: new Date()
        }
      })
    }
  }

  /**
   * Get available stock with filters
   */
  static async getAvailableStock(
    companyId: string,
    filters: StockLedgerFilters = {}
  ): Promise<StockLedgerEntry[]> {
    const prisma = await DatabaseService.getInstance().getClient()

    const { includeZeroAvailable, upToDate, ...filterFields } = filters

    const where: any = {
      companyId
    }

    if (!includeZeroAvailable) {
      where.availableNug = { gt: 0 }
    }

    if (filterFields.supplierId) where.supplierId = filterFields.supplierId
    if (filterFields.itemId) where.itemId = filterFields.itemId
    if (filterFields.storeId) where.storeId = filterFields.storeId
    if (filterFields.lotNoVariety) where.lotNoVariety = filterFields.lotNoVariety

    if (upToDate) {
      const [year, month, day] = upToDate.split('-').map(part => Number(part))
      if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)
        where.updatedAt = { lte: endOfDay }
      }
    }

    const entries = await prisma.stockLedger.findMany({
      where,
      orderBy: [
        { supplierId: 'asc' },
        { itemId: 'asc' },
        { lotNoVariety: 'asc' }
      ]
    })

    return entries as unknown as StockLedgerEntry[]
  }

  /**
   * Initialize stock ledger from existing data
   */
  static async initializeFromExistingData(companyId: string): Promise<void> {
    const prisma = await DatabaseService.getInstance().getClient()

    console.log('[StockLedger] Initializing stock ledger from existing data...')

    // Clear existing ledger for this company
    await prisma.stockLedger.deleteMany({ where: { companyId } })

    // Get all arrivals
    const arrivals = await prisma.arrival.findMany({
      where: { companyId },
      include: { items: true, arrivalType: true }
    })

    // Add arrival stock
    for (const arrival of arrivals) {
      if (arrival.items && arrival.items.length > 0) {
        const supplierIdForLedger = await this.resolveLedgerSupplierId(
          companyId,
          arrival.partyId,
          (arrival.arrivalType?.purchaseType ?? null) as 'partyStock' | 'selfPurchase' | null
        )

        await this.addArrivalStock(
          companyId,
          supplierIdForLedger,
          arrival.storeId,
          arrival.items.map((item: any) => ({
            itemId: item.itemId,
            lotNoVariety: item.lotNoVariety || '',
            nug: item.nug || 0,
            kg: item.kg || 0
          }))
        )
      }
    }

    // Get all stock sales
    const stockSales = await prisma.stockSale.findMany({
      where: { companyId },
      include: { items: true }
    })

    // Subtract stock sales
    for (const sale of stockSales) {
      if (!sale.items || sale.items.length === 0) {
        continue
      }

      // Group items by supplier/store since each sale can span multiple suppliers/stores
      const groupedBySupplierStore = new Map<string, {
        supplierId: string
        storeId: string | null
        items: Array<{
          itemId: string
          lotNoVariety: string
          nug: number
          kg: number
        }>
      }>()

      for (const item of sale.items as any[]) {
        const supplierId = item.supplierId as string | undefined

        if (!supplierId) {
          console.warn('[StockLedger] Skipping stock sale item during initialization - missing supplierId', {
            saleId: sale.id,
            itemId: item.id
          })
          continue
        }

        const storeId = item.storeId ? String(item.storeId) : null
        const key = `${supplierId}::${storeId ?? 'null'}`

        if (!groupedBySupplierStore.has(key)) {
          groupedBySupplierStore.set(key, {
            supplierId,
            storeId,
            items: []
          })
        }

        groupedBySupplierStore.get(key)!.items.push({
          itemId: String(item.itemId),
          lotNoVariety: item.lotNoVariety ? String(item.lotNoVariety) : '',
          nug: item.nug ? Number(item.nug) : 0,
          kg: item.kg ? Number(item.kg) : 0
        })
      }

      for (const group of groupedBySupplierStore.values()) {
        if (group.items.length === 0) {
          continue
        }

        await this.addStockSale(
          companyId,
          group.supplierId,
          group.storeId,
          group.items
        )
      }
    }

    console.log('[StockLedger] Stock ledger initialized successfully')
  }
}

