/**
 * Lot Stock Service
 * Phase 15 - Service for querying lot-wise stock availability
 */

import DatabaseService from './database'

export interface LotStock {
  itemId: string
  lotNoVariety: string | null
  supplierId: string
  storeId: string | null
  companyId: string
  arrivalDate: string
  totalNug: number
  totalKg: number
  soldNug: number
  soldKg: number
  availableNug: number
  availableKg: number
}

export class LotStockService {
  private static instance: LotStockService
  private databaseService: DatabaseService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
  }

  static getInstance(): LotStockService {
    if (!LotStockService.instance) {
      LotStockService.instance = new LotStockService()
    }
    return LotStockService.instance
  }

  /**
   * Get lot-wise stock for a company
   */
  async getLotStock(
    companyId: string,
    filters?: {
      itemId?: string
      supplierId?: string
      storeId?: string
      lotNoVariety?: string
    }
  ): Promise<LotStock[]> {
    try {
      const prisma = await this.databaseService.getClient()
      
      let whereClause = `companyId = '${companyId}'`

      if (filters?.itemId) {
        whereClause += ` AND itemId = '${filters.itemId}'`
      }
      if (filters?.supplierId) {
        whereClause += ` AND supplierId = '${filters.supplierId}'`
      }
      if (filters?.storeId) {
        whereClause += ` AND storeId = '${filters.storeId}'`
      }
      if (filters?.lotNoVariety) {
        whereClause += ` AND lotNoVariety = '${filters.lotNoVariety}'`
      }

      const query = `
        SELECT * FROM lot_stock_view
        WHERE ${whereClause}
        ORDER BY arrivalDate DESC, lotNoVariety
      `

      const result = await prisma.$queryRawUnsafe<LotStock[]>(query)
      return result
    } catch (error) {
      console.error('Error getting lot stock:', error)
      throw error
    }
  }

  /**
   * Get available stock for a specific supplier, item, and store
   */
  async getAvailableStock(
    companyId: string,
    supplierId: string,
    itemId: string,
    storeId: string | null
  ): Promise<LotStock[]> {
    try {
      const prisma = await this.databaseService.getClient()
      
      const storeCondition = storeId 
        ? `AND storeId = '${storeId}'`
        : 'AND storeId IS NULL'

      const query = `
        SELECT * FROM lot_stock_view
        WHERE companyId = '${companyId}'
          AND supplierId = '${supplierId}'
          AND itemId = '${itemId}'
          ${storeCondition}
          AND (availableNug > 0 OR availableKg > 0)
        ORDER BY arrivalDate, lotNoVariety
      `

      const result = await prisma.$queryRawUnsafe<LotStock[]>(query)
      return result
    } catch (error) {
      console.error('Error getting available stock:', error)
      throw error
    }
  }

  /**
   * Get total available stock grouped by item (aggregated across all lots)
   */
  async getItemStockSummary(
    companyId: string,
    filters?: {
      supplierId?: string
      storeId?: string
    }
  ): Promise<{
    itemId: string
    supplierId: string
    storeId: string | null
    totalAvailableNug: number
    totalAvailableKg: number
    lotCount: number
  }[]> {
    try {
      const prisma = await this.databaseService.getClient()
      
      let whereClause = `companyId = '${companyId}'`

      if (filters?.supplierId) {
        whereClause += ` AND supplierId = '${filters.supplierId}'`
      }
      if (filters?.storeId) {
        whereClause += ` AND storeId = '${filters.storeId}'`
      }

      const query = `
        SELECT 
          itemId,
          supplierId,
          storeId,
          SUM(availableNug) as totalAvailableNug,
          SUM(availableKg) as totalAvailableKg,
          COUNT(*) as lotCount
        FROM lot_stock_view
        WHERE ${whereClause}
        GROUP BY itemId, supplierId, storeId
        HAVING totalAvailableNug > 0 OR totalAvailableKg > 0
        ORDER BY itemId
      `

      const result = await prisma.$queryRawUnsafe<any[]>(query)
      return result
    } catch (error) {
      console.error('Error getting item stock summary:', error)
      throw error
    }
  }

  /**
   * Get lots for a specific item with available stock
   */
  async getLotsForItem(
    companyId: string,
    itemId: string,
    supplierId?: string,
    storeId?: string | null
  ): Promise<LotStock[]> {
    try {
      const prisma = await this.databaseService.getClient()
      
      let whereClause = `companyId = '${companyId}' AND itemId = '${itemId}'`

      if (supplierId) {
        whereClause += ` AND supplierId = '${supplierId}'`
      }
      if (storeId !== undefined) {
        whereClause += storeId 
          ? ` AND storeId = '${storeId}'`
          : ' AND storeId IS NULL'
      }

      const query = `
        SELECT * FROM lot_stock_view
        WHERE ${whereClause}
          AND (availableNug > 0 OR availableKg > 0)
        ORDER BY arrivalDate, lotNoVariety
      `

      const result = await prisma.$queryRawUnsafe<LotStock[]>(query)
      return result
    } catch (error) {
      console.error('Error getting lots for item:', error)
      throw error
    }
  }
}

export const lotStockService = LotStockService.getInstance()
