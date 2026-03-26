import DatabaseService from './database'
import { StockLedgerService } from './stockLedgerService'
import { AccountLedgerService } from './accountLedgerService'
import type { Prisma } from '@prisma/client'

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export interface StockTransferListFilters {
  startDate?: string
  endDate?: string
  accountId?: string
  search?: string
}

export interface StockTransferTotals {
  totalTransfers: number
  totalNug: number
  totalWt: number
  totalBasicAmount: number
  totalCharges: number
  totalAmount: number
  totalFreightAmount: number
  totalAdvanceAmount: number
  totalOurCost: number
  totalOurRate: number
}

export interface StockTransferListResponse {
  transfers: any[]
  totals: StockTransferTotals
}

interface StockTransferItemInput {
  id?: string
  itemId: string
  lotNo: string | null  // Changed from optional to required (can be null)
  nug: number
  kg: number
  rate: number
  ourRate?: number
  per?: string
  basicAmount?: number
}

interface NormalizedStockTransferItem extends StockTransferItemInput {
  basicAmount: number
  ourRate: number
  per: string
}

interface StockTransferChargeInput {
  id?: string
  otherChargesId: string
  onValue?: number | null
  per?: number | null
  atRate?: number | null
  no?: number | null
  plusMinus?: '+' | '-'
  amount?: number
}

interface NormalizedStockTransferCharge extends StockTransferChargeInput {
  plusMinus: '+' | '-'
  amount: number
}

export interface StockTransferPayload {
  accountId: string
  vchNo?: string
  vehicleNo?: string | null
  challanNo?: string | null
  remarks?: string | null
  driverName?: string | null
  fromLocation?: string | null
  toLocation?: string | null
  freightAmount?: number
  advanceAmount?: number
  totalOurCost?: number
  totalNug?: number
  totalWt?: number
  basicAmount?: number
  totalCharges?: number
  totalAmount?: number
  items?: StockTransferItemInput[]
  chargeLines?: StockTransferChargeInput[]
}

const DEFAULT_TOTALS: StockTransferTotals = {
  totalTransfers: 0,
  totalNug: 0,
  totalWt: 0,
  totalBasicAmount: 0,
  totalCharges: 0,
  totalAmount: 0,
  totalFreightAmount: 0,
  totalAdvanceAmount: 0,
  totalOurCost: 0,
  totalOurRate: 0
}

export class StockTransferService {
  private static instance: StockTransferService
  private databaseService: DatabaseService
  private accountLedgerService: AccountLedgerService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.accountLedgerService = AccountLedgerService.getInstance()
  }

  public static getInstance(): StockTransferService {
    if (!StockTransferService.instance) {
      StockTransferService.instance = new StockTransferService()
    }
    return StockTransferService.instance
  }

  private async serializeStockTransfer(transfer: any) {
    if (!transfer) return transfer
    const normalizeDate = (value: any) =>
      value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : ''

    // Calculate wattak status based on ledger
    let wattakStatus: 'pending' | 'partial' | 'clear' = 'pending'
    if (transfer.wattakLedger && transfer.wattakLedger.length > 0) {
      const allCleared = transfer.wattakLedger.every((ledger: any) => 
        (Number(ledger.remainingNug) || 0) === 0 && (Number(ledger.remainingWt) || 0) === 0
      )
      if (allCleared) {
        wattakStatus = 'clear'
      } else {
        // Check if any billing has occurred
        const hasAnyBilling = transfer.wattakLedger.some((ledger: any) => 
          (Number(ledger.billedNug) || 0) > 0 || (Number(ledger.billedWt) || 0) > 0
        )
        wattakStatus = hasAnyBilling ? 'partial' : 'pending'
      }
    }

    // Get supplier names from stock ledger for the items
    let supplierName: string | null = null
    if (transfer.items && transfer.items.length > 0) {
      try {
        const itemIds = transfer.items.map((item: any) => item.itemId)
        const lotNos = transfer.items.map((item: any) => item.lotNo).filter(Boolean)
        
        if (itemIds.length > 0 && lotNos.length > 0) {
          // Query stock ledger to find supplier IDs for these items
          const prisma = this.databaseService.getPrisma()
          const stockLedgers = await prisma.stockLedger.findMany({
            where: {
              companyId: transfer.companyId,
              itemId: { in: itemIds },
              lotNoVariety: { in: lotNos }
            },
            select: {
              supplierId: true
            },
            distinct: ['supplierId']
          })

          if (stockLedgers.length > 0) {
            // Get unique supplier IDs
            const supplierIds = [...new Set(stockLedgers.map(sl => sl.supplierId))]
            
            // Fetch supplier names from accounts
            const suppliers = await prisma.account.findMany({
              where: {
                id: { in: supplierIds }
              },
              select: {
                accountName: true
              }
            })

            if (suppliers.length > 0) {
              // Join multiple supplier names with comma if there are multiple
              supplierName = suppliers.map(s => s.accountName).join(', ')
            }
          }
        }
      } catch (error) {
        console.error('Error fetching supplier names:', error)
      }
    }

    return {
      ...transfer,
      createdAt: normalizeDate(transfer.createdAt),
      updatedAt: normalizeDate(transfer.updatedAt),
      accountName: transfer.account?.accountName || transfer.accountName,
      supplierName: supplierName,
      wattakStatus, // Add status to serialized data
      items: transfer.items?.map((item: any) => ({
        ...item,
        itemName: item.item?.itemName || item.itemName,
        createdAt: normalizeDate(item.createdAt),
        updatedAt: normalizeDate(item.updatedAt)
      })) || [],
      chargeLines:
        transfer.charges?.map((charge: any) => ({
          ...charge,
          chargesHeadName: charge.otherChargesHead?.headingName || charge.chargesHeadName,
          createdAt: normalizeDate(charge.createdAt),
          updatedAt: normalizeDate(charge.updatedAt)
        })) || [],
      wattakLedger: undefined // Remove raw ledger data from response
    }
  }

  private reduceTotals(transfers: any[]): StockTransferTotals {
    if (!transfers.length) {
      return { ...DEFAULT_TOTALS }
    }

    return transfers.reduce(
      (acc, transfer) => {
        return {
          totalTransfers: acc.totalTransfers + 1,
          totalNug: acc.totalNug + Number(transfer.totalNug || 0),
          totalWt: acc.totalWt + Number(transfer.totalWt || 0),
          totalBasicAmount: acc.totalBasicAmount + Number(transfer.basicAmount || 0),
          totalCharges: acc.totalCharges + Number(transfer.totalCharges || 0),
          totalAmount: acc.totalAmount + Number(transfer.totalAmount || 0),
          totalFreightAmount: acc.totalFreightAmount + Number(transfer.freightAmount || 0),
          totalAdvanceAmount: acc.totalAdvanceAmount + Number(transfer.advanceAmount || 0),
          totalOurCost: acc.totalOurCost + Number(transfer.totalOurCost || 0),
          totalOurRate: acc.totalOurRate + (transfer.items || []).reduce((sum: number, item: any) => sum + Number(item.ourRate || 0), 0)
        }
      },
      { ...DEFAULT_TOTALS }
    )
  }

  private calculateItemAmount(item: StockTransferItemInput): number {
    if (typeof item.basicAmount === 'number' && !Number.isNaN(item.basicAmount)) {
      return Number(item.basicAmount)
    }
    const per = (item.per || 'nug').toLowerCase()
    const qty = per === 'kg' ? Number(item.kg || 0) : Number(item.nug || 0)
    return Number(qty * Number(item.rate || 0))
  }

  private normalizeItems(items?: StockTransferItemInput[]): NormalizedStockTransferItem[] {
    if (!items || !Array.isArray(items)) {
      return []
    }

    return items
      .filter((item) => item && item.itemId)
      .map((item) => ({
        itemId: item.itemId,
        lotNo: item.lotNo ?? null,
        nug: Number(item.nug || 0),
        kg: Number(item.kg || 0),
        rate: Number(item.rate || 0),
        ourRate: Number(item.ourRate || 0),
        per: (item.per || 'nug') as string,
        basicAmount: this.calculateItemAmount(item)
      }))
  }

  private normalizeCharges(charges?: StockTransferChargeInput[]): NormalizedStockTransferCharge[] {
    if (!charges || !Array.isArray(charges)) {
      return []
    }

    return charges
      .filter((charge) => charge && charge.otherChargesId)
      .map((charge) => ({
        otherChargesId: charge.otherChargesId,
        onValue: charge.onValue ?? null,
        per: charge.per ?? null,
        atRate: charge.atRate ?? null,
        no: charge.no ?? null,
        plusMinus: charge.plusMinus === '-' ? '-' : '+',
        amount: Number(charge.amount || 0)
      }))
  }

  private computeTotals(
    payload: StockTransferPayload,
    items: NormalizedStockTransferItem[],
    charges: NormalizedStockTransferCharge[]
  ) {
    const totalNug = Number(
      payload.totalNug ?? items.reduce((sum, item) => sum + Number(item.nug || 0), 0)
    )
    const totalWt = Number(
      payload.totalWt ?? items.reduce((sum, item) => sum + Number(item.kg || 0), 0)
    )
    const basicAmount = Number(
      payload.basicAmount ?? items.reduce((sum, item) => sum + Number(item.basicAmount || 0), 0)
    )
    const totalCharges = Number(
      payload.totalCharges ?? charges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0)
    )
    const freightAmount = Number(payload.freightAmount ?? 0)
    const advanceAmount = Number(payload.advanceAmount ?? 0)
    const totalOurCost = Number(payload.totalOurCost ?? 0)
    const totalAmount = Number(
      payload.totalAmount ?? basicAmount + totalCharges + totalOurCost + freightAmount - advanceAmount
    )

    return {
      totalNug,
      totalWt,
      basicAmount,
      totalCharges,
      freightAmount,
      advanceAmount,
      totalOurCost,
      totalAmount
    }
  }

  private async generateVoucherNumber(companyId: string): Promise<string> {
    const prisma = await this.databaseService.getClient()
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const prefix = `ST-${year}${month}${day}`

    const lastTransfer = await prisma.stockTransfer.findFirst({
      where: {
        companyId,
        vchNo: {
          startsWith: prefix
        }
      },
      orderBy: {
        vchNo: 'desc'
      }
    })

    if (!lastTransfer?.vchNo) {
      return `${prefix}-001`
    }

    const parts = lastTransfer.vchNo.split('-')
    const counter = Number(parts[2] || '0') + 1
    return `${prefix}-${String(counter).padStart(3, '0')}`
  }

  public async listStockTransfers(
    companyId: string,
    filters?: StockTransferListFilters
  ): Promise<ApiResponse<StockTransferListResponse>> {
    try {
      const prisma = await this.databaseService.getClient()
      const where: Prisma.StockTransferWhereInput = {
        companyId
      }

      if (filters?.startDate || filters?.endDate) {
        where.createdAt = {}
        if (filters.startDate) {
          where.createdAt.gte = new Date(filters.startDate)
        }
        if (filters.endDate) {
          const endDate = new Date(filters.endDate)
          endDate.setHours(23, 59, 59, 999)
          where.createdAt.lte = endDate
        }
      }

      if (filters?.accountId) {
        where.accountId = filters.accountId
      }

      if (filters?.search) {
        const searchTerm = filters.search.trim().toLowerCase()
        if (searchTerm) {
          where.OR = [
            { vchNo: { contains: searchTerm } },
            { vehicleNo: { contains: searchTerm } },
            { challanNo: { contains: searchTerm } },
            { remarks: { contains: searchTerm } },
            {
              account: {
                accountName: {
                  contains: searchTerm
                }
              }
            }
          ]
        }
      }

      const transfers = await prisma.stockTransfer.findMany({
        where,
        include: {
          account: { select: { accountName: true } },
          items: {
            include: {
              item: {
                select: {
                  itemName: true
                }
              }
            }
          },
          charges: {
            include: {
              otherChargesHead: {
                select: {
                  headingName: true
                }
              }
            }
          },
          wattakLedger: true // Include ledger for status calculation
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const serialized = await Promise.all(
        transfers.map((transfer) => this.serializeStockTransfer(transfer))
      )
      const totals = this.reduceTotals(transfers)

      return {
        success: true,
        data: {
          transfers: serialized,
          totals
        }
      }
    } catch (error: any) {
      console.error('[StockTransferService] Failed to list stock transfers', error)
      return {
        success: false,
        error: error?.message || 'Failed to list stock transfers'
      }
    }
  }

  public async getStockTransferById(id: string): Promise<ApiResponse<any>> {
    try {
      const prisma = await this.databaseService.getClient()
      const transfer = await prisma.stockTransfer.findUnique({
        where: { id },
        include: {
          account: { select: { accountName: true } },
          items: {
            include: {
              item: {
                select: {
                  itemName: true
                }
              }
            }
          },
          charges: {
            include: {
              otherChargesHead: {
                select: {
                  headingName: true
                }
              }
            }
          }
        }
      })

      if (!transfer) {
        return {
          success: false,
          error: 'Stock transfer not found'
        }
      }

      return {
        success: true,
        data: await this.serializeStockTransfer(transfer)
      }
    } catch (error: any) {
      console.error('[StockTransferService] Failed to fetch stock transfer', error)
      return {
        success: false,
        error: error?.message || 'Failed to fetch stock transfer'
      }
    }
  }

  public async createStockTransfer(
    companyId: string,
    payload: StockTransferPayload
  ): Promise<ApiResponse<any>> {
    try {
      const prisma = await this.databaseService.getClient()
      const normalizedItems = this.normalizeItems(payload.items)
      const normalizedCharges = this.normalizeCharges(payload.chargeLines)
      const totals = this.computeTotals(payload, normalizedItems, normalizedCharges)
      const voucherNo = payload.vchNo?.trim() || (await this.generateVoucherNumber(companyId))

      const transfer = await prisma.stockTransfer.create({
        data: {
          companyId,
          accountId: payload.accountId,
          vchNo: voucherNo,
          vehicleNo: payload.vehicleNo ?? null,
          challanNo: payload.challanNo ?? null,
          remarks: payload.remarks ?? null,
          driverName: payload.driverName ?? null,
          fromLocation: payload.fromLocation ?? null,
          toLocation: payload.toLocation ?? null,
          freightAmount: totals.freightAmount,
          advanceAmount: totals.advanceAmount,
          totalOurCost: totals.totalOurCost,
          totalNug: totals.totalNug,
          totalWt: totals.totalWt,
          basicAmount: totals.basicAmount,
          totalCharges: totals.totalCharges,
          totalAmount: totals.totalAmount,
          items: {
            create: normalizedItems.map((item) => ({
              itemId: item.itemId,
              lotNo: item.lotNo ?? null,
              nug: item.nug,
              kg: item.kg,
              rate: item.rate,
              ourRate: item.ourRate ?? 0,
              per: item.per,
              basicAmount: item.basicAmount
            }))
          },
          charges: {
            create: normalizedCharges.map((charge) => ({
              otherChargesId: charge.otherChargesId,
              onValue: charge.onValue,
              per: charge.per,
              atRate: charge.atRate,
              no: charge.no,
              plusMinus: charge.plusMinus,
              amount: charge.amount
            }))
          },
          // Initialize wattak ledger entries
          wattakLedger: {
            create: normalizedItems.map((item) => ({
              companyId,
              itemId: item.itemId,
              lotNo: item.lotNo ?? null,
              transferredNug: item.nug,
              transferredWt: item.kg,
              billedNug: 0,
              billedWt: 0,
              remainingNug: item.nug,
              remainingWt: item.kg
            }))
          }
        },
        include: {
          account: { select: { accountName: true } },
          items: {
            include: {
              item: { select: { itemName: true } }
            }
          },
          charges: {
            include: {
              otherChargesHead: { select: { headingName: true } }
            }
          }
        }
      })

      // Update stock ledger
      try {
        await StockLedgerService.addStockTransfer(companyId, normalizedItems)
      } catch (ledgerError: any) {
        // Rollback the transfer if stock ledger update fails
        await prisma.stockTransfer.delete({ where: { id: transfer.id } })
        throw new Error(`Stock ledger update failed: ${ledgerError.message}`)
      }

      // Phase 18.7: Record ledger entry for stock transfer
      const itemsSummary = normalizedItems.map(i => {
        const itemName = transfer.items.find(ti => ti.itemId === i.itemId)?.item?.itemName || 'Item'
        return `${itemName} ${i.nug}N/${i.kg}Kg`
      }).join(', ')
      await this.accountLedgerService.recordStockTransfer(
        companyId,
        payload.accountId,
        voucherNo,
        totals.totalAmount,
        itemsSummary
      )

      return {
        success: true,
        data: await this.serializeStockTransfer(transfer)
      }
    } catch (error: any) {
      console.error('[StockTransferService] Failed to create stock transfer', error)
      return {
        success: false,
        error: error?.message || 'Failed to create stock transfer'
      }
    }
  }

  public async updateStockTransfer(
    id: string,
    payload: StockTransferPayload
  ): Promise<ApiResponse<any>> {
    try {
      const prisma = await this.databaseService.getClient()
      const existing = await prisma.stockTransfer.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existing) {
        return {
          success: false,
          error: 'Stock transfer not found'
        }
      }

      const normalizedItems = this.normalizeItems(payload.items)
      const normalizedCharges = this.normalizeCharges(payload.chargeLines)
      const totals = this.computeTotals(payload, normalizedItems, normalizedCharges)
      const voucherNo = payload.vchNo?.trim() || existing.vchNo || (await this.generateVoucherNumber(existing.companyId))

      // Remove old items from stock ledger
      const oldItems = existing.items.map((item) => ({
        itemId: item.itemId,
        lotNo: item.lotNo,
        nug: item.nug,
        kg: item.kg
      }))

      await prisma.$transaction(async (tx) => {
        // Delete old ledger entries and items/charges
        await tx.stockTransferWattakLedger.deleteMany({ where: { stockTransferId: id } })
        await tx.stockTransferItem.deleteMany({ where: { stockTransferId: id } })
        await tx.stockTransferCharge.deleteMany({ where: { stockTransferId: id } })

        await tx.stockTransfer.update({
          where: { id },
          data: {
            accountId: payload.accountId,
            vchNo: voucherNo,
            vehicleNo: payload.vehicleNo ?? null,
            challanNo: payload.challanNo ?? null,
            remarks: payload.remarks ?? null,
            driverName: payload.driverName ?? null,
            fromLocation: payload.fromLocation ?? null,
            toLocation: payload.toLocation ?? null,
            freightAmount: totals.freightAmount,
            advanceAmount: totals.advanceAmount,
            totalOurCost: totals.totalOurCost,
            totalNug: totals.totalNug,
            totalWt: totals.totalWt,
            basicAmount: totals.basicAmount,
            totalCharges: totals.totalCharges,
            totalAmount: totals.totalAmount
          }
        })

        if (normalizedItems.length) {
          await tx.stockTransferItem.createMany({
            data: normalizedItems.map((item) => ({
              stockTransferId: id,
              itemId: item.itemId,
              lotNo: item.lotNo ?? null,
              nug: item.nug,
              kg: item.kg,
              rate: item.rate,
              ourRate: item.ourRate ?? 0,
              per: item.per,
              basicAmount: item.basicAmount
            }))
          })

          // Create new ledger entries
          await tx.stockTransferWattakLedger.createMany({
            data: normalizedItems.map((item) => ({
              companyId: existing.companyId,
              stockTransferId: id,
              itemId: item.itemId,
              lotNo: item.lotNo ?? null,
              transferredNug: item.nug,
              transferredWt: item.kg,
              billedNug: 0,
              billedWt: 0,
              remainingNug: item.nug,
              remainingWt: item.kg
            }))
          })
        }

        if (normalizedCharges.length) {
          await tx.stockTransferCharge.createMany({
            data: normalizedCharges.map((charge) => ({
              stockTransferId: id,
              otherChargesId: charge.otherChargesId,
              onValue: charge.onValue,
              per: charge.per,
              atRate: charge.atRate,
              no: charge.no,
              plusMinus: charge.plusMinus,
              amount: charge.amount
            }))
          })
        }
      })

      // Update stock ledger: remove old items, add new items
      try {
        await StockLedgerService.removeStockTransfer(existing.companyId, oldItems)
        await StockLedgerService.addStockTransfer(existing.companyId, normalizedItems)
      } catch (ledgerError: any) {
        console.error('[StockTransferService] Stock ledger update failed during update', ledgerError)
        throw new Error(`Stock ledger update failed: ${ledgerError.message}`)
      }

      // Phase 18.7: Reverse old ledger entry and record new one
      await this.accountLedgerService.reverseStockTransfer(
        existing.companyId,
        existing.accountId,
        existing.vchNo
      )

      const itemIds = normalizedItems.map(i => i.itemId)
      const itemRecords = itemIds.length > 0
        ? await prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, itemName: true } })
        : []
      const itemMap = new Map(itemRecords.map(i => [i.id, i.itemName]))
      const itemsSummary = normalizedItems.map(i => `${itemMap.get(i.itemId) || 'Item'} ${i.nug}N/${i.kg}Kg`).join(', ')
      
      await this.accountLedgerService.recordStockTransfer(
        existing.companyId,
        payload.accountId,
        voucherNo,
        totals.totalAmount,
        itemsSummary
      )

      return this.getStockTransferById(id)
    } catch (error: any) {
      console.error('[StockTransferService] Failed to update stock transfer', error)
      return {
        success: false,
        error: error?.message || 'Failed to update stock transfer'
      }
    }
  }

  public async deleteStockTransfer(id: string): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()
      
      // Get the transfer items before deletion
      const existing = await prisma.stockTransfer.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existing) {
        return {
          success: false,
          error: 'Stock transfer not found'
        }
      }

      // Restore stock in ledger
      const items = existing.items.map((item) => ({
        itemId: item.itemId,
        lotNo: item.lotNo,
        nug: item.nug,
        kg: item.kg
      }))

      try {
        await StockLedgerService.removeStockTransfer(existing.companyId, items)
      } catch (ledgerError: any) {
        console.error('[StockTransferService] Stock ledger restore failed during delete', ledgerError)
        throw new Error(`Stock ledger restore failed: ${ledgerError.message}`)
      }

      // Phase 18.7: Reverse ledger entry before deletion
      await this.accountLedgerService.reverseStockTransfer(
        existing.companyId,
        existing.accountId,
        existing.vchNo
      )

      await prisma.stockTransfer.delete({ where: { id } })
      return { success: true, message: 'Stock transfer deleted successfully' }
    } catch (error: any) {
      console.error('[StockTransferService] Failed to delete stock transfer', error)
      return {
        success: false,
        error: error?.message || 'Failed to delete stock transfer'
      }
    }
  }

  public async getNextVoucherNumber(companyId: string): Promise<ApiResponse<string>> {
    try {
      const voucherNo = await this.generateVoucherNumber(companyId)
      return {
        success: true,
        data: voucherNo
      }
    } catch (error: any) {
      console.error('[StockTransferService] Failed to generate voucher no', error)
      return {
        success: false,
        error: error?.message || 'Failed to generate voucher number'
      }
    }
  }
}

export default StockTransferService
