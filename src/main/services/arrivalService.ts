/**
 * Arrival Service
 * Phase 14.6 - Handles all Arrival book operations
 * Phase 14.8 - Added crate receive sync for arrival items
 * Phase 15.4 - Added stock ledger updates
 * Phase 18.7 - Integration with Account Ledger
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

export interface ArrivalListFilters {
  startDate?: string
  endDate?: string
  arrivalTypeId?: string
  partyId?: string
  storeId?: string
  status?: 'pending' | 'sold' | 'partial'
}

export class ArrivalService {
  private static instance: ArrivalService
  private databaseService: DatabaseService
  private accountLedgerService: AccountLedgerService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.accountLedgerService = AccountLedgerService.getInstance()
  }

  public static getInstance(): ArrivalService {
    if (!ArrivalService.instance) {
      ArrivalService.instance = new ArrivalService()
    }
    return ArrivalService.instance
  }

  /**
   * Serialize dates in arrival data to ISO strings for Redux compatibility
   */
  private serializeArrival(arrival: any): any {
    if (!arrival) return arrival
    
    return {
      ...arrival,
      createdAt: arrival.createdAt instanceof Date 
        ? arrival.createdAt.toISOString() 
        : arrival.createdAt,
      updatedAt: arrival.updatedAt instanceof Date 
        ? arrival.updatedAt.toISOString() 
        : arrival.updatedAt,
      items: arrival.items?.map((item: any) => ({
        ...item,
        createdAt: item.createdAt instanceof Date 
          ? item.createdAt.toISOString() 
          : item.createdAt,
        updatedAt: item.updatedAt instanceof Date 
          ? item.updatedAt.toISOString() 
          : item.updatedAt
      })),
      arrivalCharges: arrival.arrivalCharges?.map((charge: any) => ({
        ...charge,
        createdAt: charge.createdAt instanceof Date 
          ? charge.createdAt.toISOString() 
          : charge.createdAt,
        updatedAt: charge.updatedAt instanceof Date 
          ? charge.updatedAt.toISOString() 
          : charge.updatedAt
      }))
    }
  }


  /**
   * Create or update crate receive entries for arrival items
   * This syncs crate receive entries based on arrival items with crates
   */
  private async syncCrateReceiveEntries(
    companyId: string,
    voucherNo: string,
    date: string,
    partyId: string,
    items: any[]
  ): Promise<void> {
    try {
      const prisma = await this.databaseService.getClient()

      // Find existing crate receive entries linked to this arrival via slipNo
      const existingReceives = await prisma.crateReceive.findMany({
        where: {
          companyId,
          items: {
            some: {
              slipNo: voucherNo
            }
          }
        },
        include: {
          items: true
        }
      })

      // Get items that have crate data
      const crateItems = items.filter(item => item.crateMarkaId && item.crateQty && Number(item.crateQty) > 0)

      // If no crate items, delete all existing crate receive entries for this arrival
      if (crateItems.length === 0) {
        for (const receive of existingReceives) {
          // Get items to be deleted for ledger reversal
          const itemsToDelete = receive.items.filter(i => i.slipNo === voucherNo)
          const totalQtyToReverse = itemsToDelete.reduce((sum, i) => sum + i.qty, 0)
          
          // Delete items linked to this arrival
          await prisma.crateReceiveItem.deleteMany({
            where: {
              crateReceiveId: receive.id,
              slipNo: voucherNo
            }
          })
          // Check if receive has any remaining items
          const remainingItems = await prisma.crateReceiveItem.count({
            where: { crateReceiveId: receive.id }
          })
          // If no remaining items, delete the receive entry
          if (remainingItems === 0) {
            await prisma.crateReceive.delete({
              where: { id: receive.id }
            })
          } else {
            // Recalculate totals
            await this.recalculateCrateReceiveTotals(receive.id)
          }
          
          // Reverse ledger entry for the party
          if (totalQtyToReverse > 0) {
            await this.accountLedgerService.reverseCrateReceive(companyId, partyId, voucherNo)
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

      if (existingReceives.length > 0) {
        // Update existing crate receive
        const receive = existingReceives[0]
        
        // Delete existing items linked to this arrival
        await prisma.crateReceiveItem.deleteMany({
          where: {
            crateReceiveId: receive.id,
            slipNo: voucherNo
          }
        })

        // Create new items
        for (const item of crateItems) {
          await prisma.crateReceiveItem.create({
            data: {
              crateReceiveId: receive.id,
              accountId: partyId,
              crateMarkaId: item.crateMarkaId,
              qty: Number(item.crateQty) || 0,
              slipNo: voucherNo,
              remarks: `Auto-synced from Arrival ${voucherNo}`
            }
          })
        }

        // Recalculate totals for the crate receive
        await this.recalculateCrateReceiveTotals(receive.id)

        // Reverse old ledger entry and create new one
        await this.accountLedgerService.reverseCrateReceive(companyId, partyId, voucherNo)
        await this.accountLedgerService.recordCrateReceive(
          companyId,
          partyId,
          voucherNo,
          totalQty,
          `Arrival Crates`
        )

        console.log(`[ArrivalService] Updated crate receive ${receive.id} for arrival ${voucherNo}`)
      } else {
        // Create new crate receive
        const newReceive = await prisma.crateReceive.create({
          data: {
            companyId,
            receiveDate: date,
            totalQty,
            totalCrateAmount,
            items: {
              create: crateItems.map(item => ({
                accountId: partyId,
                crateMarkaId: item.crateMarkaId,
                qty: Number(item.crateQty) || 0,
                slipNo: voucherNo,
                remarks: `Auto-created from Arrival ${voucherNo}`
              }))
            }
          }
        })

        // Record ledger entry for the party
        await this.accountLedgerService.recordCrateReceive(
          companyId,
          partyId,
          voucherNo,
          totalQty,
          `Arrival Crates`
        )

        console.log(`[ArrivalService] Created crate receive ${newReceive.id} for arrival ${voucherNo}`)
      }
    } catch (error) {
      console.error('[ArrivalService] Error syncing crate receive entries:', error)
      // Don't throw - crate receive sync is not critical
    }
  }

  /**
   * Recalculate totals for a crate receive entry
   */
  private async recalculateCrateReceiveTotals(crateReceiveId: string): Promise<void> {
    const prisma = await this.databaseService.getClient()

    const items = await prisma.crateReceiveItem.findMany({
      where: { crateReceiveId },
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

    await prisma.crateReceive.update({
      where: { id: crateReceiveId },
      data: {
        totalQty,
        totalCrateAmount
      }
    })
  }

  /**
   * Delete crate receive entries linked to an arrival
   */
  private async deleteCrateReceiveEntries(companyId: string, voucherNo: string): Promise<void> {
    try {
      const prisma = await this.databaseService.getClient()

      // Find existing crate receive entries linked to this arrival via slipNo
      const existingReceives = await prisma.crateReceive.findMany({
        where: {
          companyId,
          items: {
            some: {
              slipNo: voucherNo
            }
          }
        },
        include: {
          items: true
        }
      })

      // Collect account IDs for ledger reversal
      const accountsToReverse = new Set<string>()

      for (const receive of existingReceives) {
        // Get items to be deleted for ledger reversal
        const itemsToDelete = receive.items.filter(i => i.slipNo === voucherNo)
        for (const item of itemsToDelete) {
          accountsToReverse.add(item.accountId)
        }
        
        // Delete items linked to this arrival
        await prisma.crateReceiveItem.deleteMany({
          where: {
            crateReceiveId: receive.id,
            slipNo: voucherNo
          }
        })
        // Check if receive has any remaining items
        const remainingItems = await prisma.crateReceiveItem.count({
          where: { crateReceiveId: receive.id }
        })
        // If no remaining items, delete the receive entry
        if (remainingItems === 0) {
          await prisma.crateReceive.delete({
            where: { id: receive.id }
          })
          console.log(`[ArrivalService] Deleted crate receive ${receive.id} for arrival ${voucherNo}`)
        } else {
          // Recalculate totals
          await this.recalculateCrateReceiveTotals(receive.id)
          console.log(`[ArrivalService] Removed arrival items from crate receive ${receive.id}`)
        }
      }

      // Reverse ledger entries for all affected accounts
      for (const accountId of accountsToReverse) {
        await this.accountLedgerService.reverseCrateReceive(companyId, accountId, voucherNo)
      }
    } catch (error) {
      console.error('[ArrivalService] Error deleting crate receive entries:', error)
      // Don't throw - crate receive deletion is not critical
    }
  }

  /**
   * Get arrivals by date range
   */
  async getArrivalsByFilters(
    companyId: string,
    filters?: ArrivalListFilters
  ): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      // Build where clause
      const where: any = { companyId }
      
      if (filters?.startDate && filters?.endDate) {
        where.date = {
          gte: filters.startDate,
          lte: filters.endDate
        }
      } else if (filters?.startDate) {
        where.date = { gte: filters.startDate }
      } else if (filters?.endDate) {
        where.date = { lte: filters.endDate }
      }

      if (filters?.arrivalTypeId) {
        where.arrivalTypeId = filters.arrivalTypeId
      }

      if (filters?.partyId) {
        where.partyId = filters.partyId
      }

      if (filters?.storeId) {
        where.storeId = filters.storeId
      }

      if (filters?.status) {
        where.status = filters.status
      }

      console.log('[ArrivalService] Fetching arrivals with filters:', { companyId, filters, where })

      const arrivals = await prisma.arrival.findMany({
        where,
        include: {
          items: true,
          arrivalCharges: {
            include: {
              otherChargesHead: true
            }
          },
          arrivalType: true,
          store: true
        },
        orderBy: {
          date: 'desc'
        }
      })

      // Get party names (accounts)
      const partyIds = [...new Set(arrivals.map(a => a.partyId))]
      const accounts = partyIds.length > 0 
        ? await prisma.account.findMany({
            where: { id: { in: partyIds } },
            select: { id: true, accountName: true }
          })
        : []
      const accountMap = new Map(accounts.map(a => [a.id, a.accountName]))

      // Get item names
      const itemIds = [...new Set(arrivals.flatMap(a => a.items.map(i => i.itemId)))]
      const items = itemIds.length > 0
        ? await prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, itemName: true }
          })
        : []
      const itemMap = new Map(items.map(i => [i.id, i.itemName]))

      console.log('[ArrivalService] Found', arrivals.length, 'arrivals')

      // Normalize store ID for consistent matching
      const normalizeStoreId = (storeId: string | null | undefined): string => {
        if (!storeId?.trim()) return 'default'
        return storeId.trim().toLowerCase()
      }

      // Normalize lot for consistent matching
      const normalizeLot = (lot: string | null | undefined): string => {
        if (!lot?.trim()) return 'default'
        return lot.trim().toLowerCase()
      }

      // Get unique store IDs from arrivals
      const storeIds = [...new Set(arrivals.map(a => a.storeId).filter((id): id is string => id !== null))]

      // Fetch ALL stock ledger entries for these stores and items
      // For self-purchase arrivals, supplierId in stock ledger may differ from arrival's partyId
      // So we match by store + item + lot instead
      const stockLedgerEntries = storeIds.length > 0 && itemIds.length > 0
        ? await prisma.stockLedger.findMany({
            where: {
              companyId,
              storeId: { in: storeIds },
              itemId: { in: itemIds }
            },
            select: {
              itemId: true,
              lotNoVariety: true,
              supplierId: true,
              storeId: true,
              totalNug: true,
              soldNug: true,
              availableNug: true
            }
          })
        : []

      // Create lookup maps for stock ledger
      // Key by store::item::lot (ignoring supplier for self-purchase compatibility)
      const stockLedgerMapByStoreItemLot = new Map<string, { totalNug: number; soldNug: number; availableNug: number }>()
      
      for (const entry of stockLedgerEntries) {
        const key = `${normalizeStoreId(entry.storeId)}::${entry.itemId}::${normalizeLot(entry.lotNoVariety)}`
        
        console.log('[ArrivalService] Stock ledger entry:', key, 'soldNug:', entry.soldNug, 'totalNug:', entry.totalNug, 'supplierId:', entry.supplierId)
        
        // Accumulate for same store/item/lot (may have multiple suppliers for same item/lot in a store)
        const existing = stockLedgerMapByStoreItemLot.get(key)
        if (existing) {
          stockLedgerMapByStoreItemLot.set(key, {
            totalNug: existing.totalNug + entry.totalNug,
            soldNug: existing.soldNug + entry.soldNug,
            availableNug: existing.availableNug + entry.availableNug
          })
        } else {
          stockLedgerMapByStoreItemLot.set(key, {
            totalNug: entry.totalNug,
            soldNug: entry.soldNug,
            availableNug: entry.availableNug
          })
        }
      }

      console.log('[ArrivalService] Stock ledger entries found:', stockLedgerEntries.length)

      // Build FIFO buckets from arrivals (ordered by date, voucherNo) for FIFO allocation
      const orderedArrivals = [...arrivals].sort((a, b) => {
        const dateCompare = (a.date || '').localeCompare(b.date || '')
        if (dateCompare !== 0) return dateCompare
        return (a.voucherNo || '').localeCompare(b.voucherNo || '')
      })

      // Build lot buckets for FIFO: key = storeId::itemId::lot (no supplier - works for both party stock and self-purchase)
      const lotBuckets = new Map<
        string,
        Array<{ arrivalId: string; remainingNug: number; originalNug: number }>
      >()

      for (const arrival of orderedArrivals) {
        const storeKey = normalizeStoreId(arrival.storeId)

        for (const item of arrival.items) {
          const nug = Number(item.nug) || 0
          const lotKey = `${storeKey}::${item.itemId}::${normalizeLot(item.lotNoVariety)}`
          
          console.log('[ArrivalService] Arrival bucket:', arrival.voucherNo, 'lotKey:', lotKey, 'nug:', nug)
          
          if (!lotBuckets.has(lotKey)) {
            lotBuckets.set(lotKey, [])
          }
          lotBuckets.get(lotKey)!.push({
            arrivalId: arrival.id,
            remainingNug: nug,
            originalNug: nug
          })
        }
      }

      // Map to track sold per arrival using FIFO allocation based on stock ledger soldNug
      const arrivalSoldMap = new Map<string, number>()
      for (const arrival of arrivals) {
        arrivalSoldMap.set(arrival.id, 0)
      }

      // For each lot bucket, allocate the sold quantity from stock ledger using FIFO
      for (const [lotKey, buckets] of lotBuckets.entries()) {
        const ledgerEntry = stockLedgerMapByStoreItemLot.get(lotKey)
        
        if (!ledgerEntry) {
          console.log('[ArrivalService] No ledger entry for:', lotKey)
          continue
        }

        let soldToAllocate = ledgerEntry.soldNug
        console.log('[ArrivalService] Allocating sold for', lotKey, 'soldNug:', soldToAllocate)

        for (const bucket of buckets) {
          if (soldToAllocate <= 0) break

          const take = Math.min(soldToAllocate, bucket.remainingNug)
          bucket.remainingNug = Number((bucket.remainingNug - take).toFixed(2))
          soldToAllocate = Number((soldToAllocate - take).toFixed(2))

          // Add to arrival's sold total
          const currentSold = arrivalSoldMap.get(bucket.arrivalId) || 0
          arrivalSoldMap.set(bucket.arrivalId, Number((currentSold + take).toFixed(2)))
          
          console.log('[ArrivalService] Allocated', take, 'to arrival', bucket.arrivalId)
        }
      }

      // Transform arrivals with additional info
      const transformedArrivals = arrivals.map(arrival => {
        const soldNug = arrivalSoldMap.get(arrival.id) || 0
        const balanceNug = Math.max(0, Number((arrival.totalNug - soldNug).toFixed(2)))
        
        console.log('[ArrivalService] Final:', arrival.voucherNo, 'totalNug:', arrival.totalNug, 'soldNug:', soldNug, 'balanceNug:', balanceNug)
        
        // Determine status based on sold vs total
        let status: 'pending' | 'sold' | 'partial' = 'pending'
        if (soldNug >= arrival.totalNug - 0.01) {
          status = 'sold'
        } else if (soldNug > 0.01) {
          status = 'partial'
        }

        return {
          ...this.serializeArrival(arrival),
          partyName: accountMap.get(arrival.partyId) || 'Unknown',
          arrivalTypeName: arrival.arrivalType?.name || '',
          storeName: arrival.store?.name || '',
          status,
          soldNug,
          balanceNug,
          items: arrival.items.map(item => ({
            ...item,
            itemName: itemMap.get(item.itemId) || 'Unknown',
            createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
            updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
          })),
          arrivalCharges: arrival.arrivalCharges.map(charge => ({
            ...charge,
            chargesHeadName: charge.otherChargesHead?.headingName || '',
            createdAt: charge.createdAt instanceof Date ? charge.createdAt.toISOString() : charge.createdAt,
            updatedAt: charge.updatedAt instanceof Date ? charge.updatedAt.toISOString() : charge.updatedAt
          }))
        }
      })

      return {
        success: true,
        data: transformedArrivals
      }
    } catch (error: any) {
      console.error('Error fetching arrivals:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch arrivals'
      }
    }
  }

  /**
   * Get a single arrival by ID
   */
  async getArrivalById(id: string): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      const arrival = await prisma.arrival.findUnique({
        where: { id },
        include: {
          items: true,
          arrivalCharges: {
            include: {
              otherChargesHead: true
            }
          },
          arrivalType: true,
          store: true
        }
      })

      if (!arrival) {
        return {
          success: false,
          error: 'Arrival not found'
        }
      }

      // Get party name
      const account = await prisma.account.findUnique({
        where: { id: arrival.partyId },
        select: { accountName: true }
      })

      // Get item names
      const itemIds = arrival.items.map(i => i.itemId)
      const items = itemIds.length > 0
        ? await prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, itemName: true }
          })
        : []
      const itemMap = new Map(items.map(i => [i.id, i.itemName]))

      const transformedArrival = {
        ...this.serializeArrival(arrival),
        partyName: account?.accountName || 'Unknown',
        arrivalTypeName: arrival.arrivalType?.name || '',
        storeName: arrival.store?.name || '',
        items: arrival.items.map(item => ({
          ...item,
          itemName: itemMap.get(item.itemId) || 'Unknown',
          createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
          updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
        })),
        arrivalCharges: arrival.arrivalCharges.map(charge => ({
          ...charge,
          chargesHeadName: charge.otherChargesHead?.headingName || '',
          createdAt: charge.createdAt instanceof Date ? charge.createdAt.toISOString() : charge.createdAt,
          updatedAt: charge.updatedAt instanceof Date ? charge.updatedAt.toISOString() : charge.updatedAt
        }))
      }

      return {
        success: true,
        data: transformedArrival
      }
    } catch (error: any) {
      console.error('Error fetching arrival:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch arrival'
      }
    }
  }

  /**
   * Generate unique voucher number for arrivals
   * Format: AR-YYYYMMDD-XXX (e.g., AR-20240115-001)
   */
  async generateVoucherNumber(companyId: string, date?: string): Promise<string> {
    try {
      const prisma = await this.databaseService.getClient()
      
      // Extract date parts
      const dateObj = date ? new Date(date) : new Date()
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      const datePrefix = `AR-${year}${month}${day}`

      // Find the last arrival for this company on this date
      const lastArrival = await prisma.arrival.findFirst({
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

      if (!lastArrival) {
        // First arrival of the day
        return `${datePrefix}-001`
      }

      // Extract the sequence number and increment
      const lastNumber = parseInt(lastArrival.voucherNo.split('-')[2] || '0')
      const nextNumber = String(lastNumber + 1).padStart(3, '0')
      
      return `${datePrefix}-${nextNumber}`
    } catch (error: any) {
      console.error('Error generating arrival voucher number:', error)
      // Fallback to timestamp-based number
      const timestamp = Date.now()
      const dateObj = date ? new Date(date) : new Date()
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      return `AR-${year}${month}${day}-${timestamp}`
    }
  }

  /**
   * Create a new arrival with items and charges
   */
  async createArrival(companyId: string, data: any): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      // Generate voucher number if not provided
      const voucherNo = data.voucherNo || await this.generateVoucherNumber(companyId, data.date)

      // Calculate totals from items
      const items = data.items || []
      const charges = data.arrivalCharges || []

      const totalNug = items.reduce((sum: number, item: any) => sum + (Number(item.nug) || 0), 0)
      const totalKg = items.reduce((sum: number, item: any) => sum + (Number(item.kg) || 0), 0)
      const basicAmt = items.reduce((sum: number, item: any) => {
        const rate = Number(item.rate) || 0
        const kg = Number(item.kg) || 0
        return sum + (rate * kg)
      }, 0)

      // Calculate charges total
      const chargesTotal = charges.reduce((sum: number, charge: any) => {
        const amount = Number(charge.amount) || 0
        return charge.plusMinus === '-' ? sum - amount : sum + amount
      }, 0)

      const netAmt = basicAmt + chargesTotal

      // Create arrival with items and charges
      const arrival = await prisma.arrival.create({
        data: {
          companyId,
          date: data.date || new Date().toISOString().split('T')[0],
          voucherNo,
          arrivalTypeId: data.arrivalTypeId,
          vehicleChallanNo: data.vehicleChallanNo || '',
          partyId: data.partyId,
          storeId: data.storeId || null,
          transport: data.transport || null,
          challanNo: data.challanNo || null,
          remarks: data.remarks || null,
          forwardingAgentId: data.forwardingAgentId || null,
          totalNug,
          totalKg,
          basicAmt,
          charges: chargesTotal,
          netAmt,
          status: 'pending',
          items: {
            create: items.map((item: any) => ({
              itemId: item.itemId,
              lotNoVariety: item.lotNoVariety || null,
              nug: Number(item.nug) || 0,
              kg: Number(item.kg) || 0,
              rate: item.rate ? Number(item.rate) : null,
              crateMarkaId: item.crateMarkaId || null,
              crateMarkaName: item.crateMarkaName || null,
              crateQty: item.crateQty ? Number(item.crateQty) : null,
              crateRate: item.crateRate ? Number(item.crateRate) : null,
              crateValue: item.crateValue ? Number(item.crateValue) : null
            }))
          },
          arrivalCharges: {
            create: charges.map((charge: any) => ({
              otherChargesId: charge.otherChargesId,
              onValue: charge.onValue ? Number(charge.onValue) : null,
              per: charge.per ? Number(charge.per) : null,
              atRate: charge.atRate ? Number(charge.atRate) : null,
              no: charge.no ? Number(charge.no) : null,
              plusMinus: charge.plusMinus || '+',
              amount: Number(charge.amount) || 0
            }))
          }
        },
        include: {
          items: true,
          arrivalCharges: {
            include: {
              otherChargesHead: true
            }
          },
          arrivalType: true,
          store: true
        }
      })

      // Get party name
      const account = await prisma.account.findUnique({
        where: { id: arrival.partyId },
        select: { accountName: true }
      })

      // Get item names
      const itemIds = arrival.items.map(i => i.itemId)
      const itemsWithNames = itemIds.length > 0
        ? await prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, itemName: true }
          })
        : []
      const itemMap = new Map(itemsWithNames.map(i => [i.id, i.itemName]))

      const transformedArrival = {
        ...this.serializeArrival(arrival),
        partyName: account?.accountName || 'Unknown',
        arrivalTypeName: arrival.arrivalType?.name || '',
        storeName: arrival.store?.name || '',
        items: arrival.items.map(item => ({
          ...item,
          itemName: itemMap.get(item.itemId) || 'Unknown',
          createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
          updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
        })),
        arrivalCharges: arrival.arrivalCharges.map(charge => ({
          ...charge,
          chargesHeadName: charge.otherChargesHead?.headingName || '',
          createdAt: charge.createdAt instanceof Date ? charge.createdAt.toISOString() : charge.createdAt,
          updatedAt: charge.updatedAt instanceof Date ? charge.updatedAt.toISOString() : charge.updatedAt
        }))
      }

      // Sync crate receive entries for items with crates
      await this.syncCrateReceiveEntries(
        companyId,
        voucherNo,
        data.date || new Date().toISOString().split('T')[0],
        data.partyId,
        items
      )

      const ledgerSupplierId = await StockLedgerService.resolveLedgerSupplierId(
        companyId,
        data.partyId,
        arrival.arrivalType?.purchaseType as 'partyStock' | 'selfPurchase' | null | undefined
      )

      // Update stock ledger
      await StockLedgerService.addArrivalStock(
        companyId,
        ledgerSupplierId,
        data.storeId || null,
        items.map((item: any) => ({
          itemId: item.itemId,
          lotNoVariety: item.lotNoVariety || '',
          nug: Number(item.nug) || 0,
          kg: Number(item.kg) || 0
        }))
      )

      // Phase 18.7: Record ledger entry for arrival (credit to supplier)
      // For self-purchase, use Mall Khata Purchase Account; for party stock, use party account
      const itemsSummary = items.map((item: any) => {
        const itemName = itemMap.get(item.itemId) || 'Item'
        return `${itemName} ${item.nug}N/${item.kg}Kg`
      }).join(', ')

      await this.accountLedgerService.recordArrival(
        companyId,
        ledgerSupplierId,
        voucherNo,
        netAmt,
        itemsSummary
      )

      return {
        success: true,
        message: 'Arrival created successfully',
        data: transformedArrival
      }
    } catch (error: any) {
      console.error('Error creating arrival:', error)
      return {
        success: false,
        error: error.message || 'Failed to create arrival'
      }
    }
  }

  /**
   * Update an existing arrival with items and charges
   */
  async updateArrival(id: string, data: any): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      // Check if arrival exists
      const existingArrival = await prisma.arrival.findUnique({
        where: { id },
        include: { items: true, arrivalCharges: true, arrivalType: true }
      })

      if (!existingArrival) {
        return {
          success: false,
          error: 'Arrival not found'
        }
      }

      // Calculate totals from items
      const items = data.items || []
      const charges = data.arrivalCharges || []

      const totalNug = items.reduce((sum: number, item: any) => sum + (Number(item.nug) || 0), 0)
      const totalKg = items.reduce((sum: number, item: any) => sum + (Number(item.kg) || 0), 0)
      const basicAmt = items.reduce((sum: number, item: any) => {
        const rate = Number(item.rate) || 0
        const kg = Number(item.kg) || 0
        return sum + (rate * kg)
      }, 0)

      // Calculate charges total
      const chargesTotal = charges.reduce((sum: number, charge: any) => {
        const amount = Number(charge.amount) || 0
        return charge.plusMinus === '-' ? sum - amount : sum + amount
      }, 0)

      const netAmt = basicAmt + chargesTotal

      const previousLedgerItems = existingArrival.items.map((item: any) => ({
        itemId: item.itemId,
        lotNoVariety: item.lotNoVariety || '',
        nug: Number(item.nug) || 0,
        kg: Number(item.kg) || 0
      }))

      const previousLedgerSupplierId = await StockLedgerService.resolveLedgerSupplierId(
        existingArrival.companyId,
        existingArrival.partyId,
        existingArrival.arrivalType?.purchaseType as 'partyStock' | 'selfPurchase' | null | undefined
      )

      const previousStoreId = existingArrival.storeId || null

      // Delete existing items and charges
      await prisma.arrivalItem.deleteMany({ where: { arrivalId: id } })
      await prisma.arrivalCharges.deleteMany({ where: { arrivalId: id } })

      // Update arrival with new items and charges
      const arrival = await prisma.arrival.update({
        where: { id },
        data: {
          date: data.date || existingArrival.date,
          arrivalTypeId: data.arrivalTypeId || existingArrival.arrivalTypeId,
          vehicleChallanNo: data.vehicleChallanNo ?? existingArrival.vehicleChallanNo,
          partyId: data.partyId || existingArrival.partyId,
          storeId: data.storeId !== undefined ? data.storeId : existingArrival.storeId,
          transport: data.transport !== undefined ? data.transport : existingArrival.transport,
          challanNo: data.challanNo !== undefined ? data.challanNo : existingArrival.challanNo,
          remarks: data.remarks !== undefined ? data.remarks : existingArrival.remarks,
          forwardingAgentId: data.forwardingAgentId !== undefined ? data.forwardingAgentId : existingArrival.forwardingAgentId,
          totalNug,
          totalKg,
          basicAmt,
          charges: chargesTotal,
          netAmt,
          items: {
            create: items.map((item: any) => ({
              itemId: item.itemId,
              lotNoVariety: item.lotNoVariety || null,
              nug: Number(item.nug) || 0,
              kg: Number(item.kg) || 0,
              rate: item.rate ? Number(item.rate) : null,
              crateMarkaId: item.crateMarkaId || null,
              crateMarkaName: item.crateMarkaName || null,
              crateQty: item.crateQty ? Number(item.crateQty) : null,
              crateRate: item.crateRate ? Number(item.crateRate) : null,
              crateValue: item.crateValue ? Number(item.crateValue) : null
            }))
          },
          arrivalCharges: {
            create: charges.map((charge: any) => ({
              otherChargesId: charge.otherChargesId,
              onValue: charge.onValue ? Number(charge.onValue) : null,
              per: charge.per ? Number(charge.per) : null,
              atRate: charge.atRate ? Number(charge.atRate) : null,
              no: charge.no ? Number(charge.no) : null,
              plusMinus: charge.plusMinus || '+',
              amount: Number(charge.amount) || 0
            }))
          }
        },
        include: {
          items: true,
          arrivalCharges: {
            include: {
              otherChargesHead: true
            }
          },
          arrivalType: true,
          store: true
        }
      })

      // Get party name
      const account = await prisma.account.findUnique({
        where: { id: arrival.partyId },
        select: { accountName: true }
      })

      // Get item names
      const itemIds = arrival.items.map(i => i.itemId)
      const itemsWithNames = itemIds.length > 0
        ? await prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, itemName: true }
          })
        : []
      const itemMap = new Map(itemsWithNames.map(i => [i.id, i.itemName]))

      const transformedArrival = {
        ...this.serializeArrival(arrival),
        partyName: account?.accountName || 'Unknown',
        arrivalTypeName: arrival.arrivalType?.name || '',
        storeName: arrival.store?.name || '',
        items: arrival.items.map(item => ({
          ...item,
          itemName: itemMap.get(item.itemId) || 'Unknown',
          createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
          updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt
        })),
        arrivalCharges: arrival.arrivalCharges.map(charge => ({
          ...charge,
          chargesHeadName: charge.otherChargesHead?.headingName || '',
          createdAt: charge.createdAt instanceof Date ? charge.createdAt.toISOString() : charge.createdAt,
          updatedAt: charge.updatedAt instanceof Date ? charge.updatedAt.toISOString() : charge.updatedAt
        }))
      }

      // Sync crate receive entries for items with crates
      await this.syncCrateReceiveEntries(
        existingArrival.companyId,
        existingArrival.voucherNo,
        data.date || existingArrival.date,
        data.partyId || existingArrival.partyId,
        items
      )

      if (previousLedgerItems.length > 0) {
        await StockLedgerService.removeArrivalStock(
          existingArrival.companyId,
          previousLedgerSupplierId,
          previousStoreId,
          previousLedgerItems
        )
      }

      if (items.length > 0) {
        const newLedgerSupplierId = await StockLedgerService.resolveLedgerSupplierId(
          existingArrival.companyId,
          arrival.partyId,
          arrival.arrivalType?.purchaseType as 'partyStock' | 'selfPurchase' | null | undefined
        )

        await StockLedgerService.addArrivalStock(
          existingArrival.companyId,
          newLedgerSupplierId,
          arrival.storeId || null,
          items.map((item: any) => ({
            itemId: item.itemId,
            lotNoVariety: item.lotNoVariety || '',
            nug: Number(item.nug) || 0,
            kg: Number(item.kg) || 0
          }))
        )
      }

      // Phase 18.7: Reverse old ledger entry and record new one
      // For self-purchase, use Mall Khata Purchase Account; for party stock, use party account
      await this.accountLedgerService.reverseArrival(
        existingArrival.companyId,
        previousLedgerSupplierId,
        existingArrival.voucherNo
      )

      const itemsSummary = items.map((item: any) => {
        const name = itemMap.get(item.itemId) || 'Item'
        return `${name} ${item.nug}N/${item.kg}Kg`
      }).join(', ')

      // Resolve new ledger account ID based on arrival type
      const newLedgerAccountId = await StockLedgerService.resolveLedgerSupplierId(
        existingArrival.companyId,
        arrival.partyId,
        arrival.arrivalType?.purchaseType as 'partyStock' | 'selfPurchase' | null | undefined
      )

      await this.accountLedgerService.recordArrival(
        existingArrival.companyId,
        newLedgerAccountId,
        arrival.voucherNo,
        netAmt,
        itemsSummary
      )

      return {
        success: true,
        message: 'Arrival updated successfully',
        data: transformedArrival
      }
    } catch (error: any) {
      console.error('Error updating arrival:', error)
      return {
        success: false,
        error: error.message || 'Failed to update arrival'
      }
    }
  }

  /**
   * Delete an arrival (cascade deletes items and charges)
   */
  async deleteArrival(id: string): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      // Check if arrival exists
      const arrival = await prisma.arrival.findUnique({
        where: { id },
        include: { items: true, arrivalType: true }
      })

      if (!arrival) {
        return {
          success: false,
          error: 'Arrival not found'
        }
      }

      // Phase 18.7: Reverse ledger entry before deletion
      // For self-purchase, use Mall Khata Purchase Account; for party stock, use party account
      const ledgerAccountId = await StockLedgerService.resolveLedgerSupplierId(
        arrival.companyId,
        arrival.partyId,
        arrival.arrivalType?.purchaseType as 'partyStock' | 'selfPurchase' | null | undefined
      )

      await this.accountLedgerService.reverseArrival(
        arrival.companyId,
        ledgerAccountId,
        arrival.voucherNo
      )

      // Delete crate receive entries linked to this arrival
      await this.deleteCrateReceiveEntries(arrival.companyId, arrival.voucherNo)

      // Delete the arrival (cascade will delete items and charges)
      await prisma.arrival.delete({
        where: { id }
      })

      return {
        success: true,
        message: 'Arrival deleted successfully'
      }
    } catch (error: any) {
      console.error('Error deleting arrival:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete arrival'
      }
    }
  }

  /**
   * Bulk delete arrivals
   */
  async bulkDeleteArrivals(ids: string[]): Promise<ApiResponse<{ deletedCount: number; failedCount: number; errors: string[] }>> {
    try {
      const prisma = await this.databaseService.getClient()

      let deletedCount = 0
      let failedCount = 0
      const errors: string[] = []

      for (const id of ids) {
        try {
          await prisma.arrival.delete({ where: { id } })
          deletedCount++
        } catch (err: any) {
          failedCount++
          errors.push(`Failed to delete arrival ${id}: ${err.message}`)
        }
      }

      return {
        success: true,
        message: `Deleted ${deletedCount} arrivals, ${failedCount} failed`,
        data: { deletedCount, failedCount, errors }
      }
    } catch (error: any) {
      console.error('Error bulk deleting arrivals:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete arrivals'
      }
    }
  }
}
