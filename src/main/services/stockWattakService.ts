import DatabaseService from './database'
import type { Prisma } from '@prisma/client'
import { AccountLedgerService } from './accountLedgerService'

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export interface StockWattakListFilters {
  startDate?: string
  endDate?: string
  partyId?: string
  search?: string
}

export interface StockWattakTotals {
  totalWattaks: number
  totalNug: number
  totalWt: number
  totalBasicAmount: number
  totalCharges: number
  totalRoundOff: number
  totalAmount: number
}

export interface StockWattakListResponse {
  wattaks: any[]
  totals: StockWattakTotals
}

interface StockWattakItemInput {
  id?: string
  stockTransferId?: string | null  // Link to source stock transfer - can be null
  itemId: string
  lotNo?: string | null
  nug: number
  wt: number
  rate: number
  per?: string
  basicAmount?: number
  issuedNug?: number
  balanceNug?: number
}

interface NormalizedStockWattakItem extends StockWattakItemInput {
  stockTransferId: string | null
  lotNo: string | null
  per: string
  basicAmount: number
  issuedNug: number
  balanceNug: number
}

interface StockWattakChargeInput {
  id?: string
  otherChargesId: string
  onValue?: number | null
  per?: number | null
  atRate?: number | null
  no?: number | null
  plusMinus?: '+' | '-'
  amount?: number
}

interface NormalizedStockWattakCharge extends StockWattakChargeInput {
  plusMinus: '+' | '-'
  amount: number
}

export interface StockWattakPayload {
  partyId: string
  vchNo?: string
  vehicleNo?: string | null
  challanNo?: string | null
  totalNug?: number
  totalWt?: number
  basicAmount?: number
  totalCharges?: number
  roundOff?: number
  totalAmount?: number
  items?: StockWattakItemInput[]
  chargeLines?: StockWattakChargeInput[]
}

const DEFAULT_TOTALS: StockWattakTotals = {
  totalWattaks: 0,
  totalNug: 0,
  totalWt: 0,
  totalBasicAmount: 0,
  totalCharges: 0,
  totalRoundOff: 0,
  totalAmount: 0
}

export class StockWattakService {
  private static instance: StockWattakService
  private databaseService: DatabaseService
  private accountLedgerService: AccountLedgerService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.accountLedgerService = AccountLedgerService.getInstance()
  }

  public static getInstance(): StockWattakService {
    if (!StockWattakService.instance) {
      StockWattakService.instance = new StockWattakService()
    }
    return StockWattakService.instance
  }

  private normalizeDate(value: any) {
    return value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : ''
  }

  private async serializeStockWattak(wattak: any) {
    if (!wattak) return wattak
    return {
      ...wattak,
      createdAt: this.normalizeDate(wattak.createdAt),
      updatedAt: this.normalizeDate(wattak.updatedAt),
      partyName: wattak.party?.accountName || wattak.partyName,
      items:
        wattak.items?.map((item: any) => ({
          ...item,
          itemName: item.item?.itemName || item.itemName,
          createdAt: this.normalizeDate(item.createdAt),
          updatedAt: this.normalizeDate(item.updatedAt)
        })) || [],
      chargeLines:
        wattak.charges?.map((charge: any) => ({
          ...charge,
          chargesHeadName: charge.otherChargesHead?.headingName || charge.chargesHeadName,
          createdAt: this.normalizeDate(charge.createdAt),
          updatedAt: this.normalizeDate(charge.updatedAt)
        })) || []
    }
  }

  private reduceTotals(wattaks: any[]): StockWattakTotals {
    if (!wattaks.length) {
      return { ...DEFAULT_TOTALS }
    }

    return wattaks.reduce(
      (acc, wattak) => ({
        totalWattaks: acc.totalWattaks + 1,
        totalNug: acc.totalNug + Number(wattak.totalNug || 0),
        totalWt: acc.totalWt + Number(wattak.totalWt || 0),
        totalBasicAmount: acc.totalBasicAmount + Number(wattak.basicAmount || 0),
        totalCharges: acc.totalCharges + Number(wattak.totalCharges || 0),
        totalRoundOff: acc.totalRoundOff + Number(wattak.roundOff || 0),
        totalAmount: acc.totalAmount + Number(wattak.totalAmount || 0)
      }),
      { ...DEFAULT_TOTALS }
    )
  }

  private calculateItemAmount(item: StockWattakItemInput): number {
    if (typeof item.basicAmount === 'number' && !Number.isNaN(item.basicAmount)) {
      return Number(item.basicAmount)
    }
    const per = (item.per || 'nug').toLowerCase()
    const quantity = per === 'kg' ? Number(item.wt || 0) : Number(item.nug || 0)
    return Number(quantity * Number(item.rate || 0))
  }

  private normalizeItems(items?: StockWattakItemInput[]): NormalizedStockWattakItem[] {
    if (!items || !Array.isArray(items)) {
      return []
    }

    return items
      .filter((item) => item && item.itemId)
      .map((item) => ({
        stockTransferId: item.stockTransferId ?? null,
        itemId: item.itemId,
        lotNo: (item.lotNo ?? null) as string,
        nug: Number(item.nug || 0),
        wt: Number(item.wt || 0),
        rate: Number(item.rate || 0),
        per: (item.per || 'nug') as string,
        basicAmount: this.calculateItemAmount(item),
        issuedNug: Number(item.issuedNug || 0),
        balanceNug: Number(item.balanceNug || 0)
      }))
  }

  private normalizeCharges(charges?: StockWattakChargeInput[]): NormalizedStockWattakCharge[] {
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
    payload: StockWattakPayload,
    items: NormalizedStockWattakItem[],
    charges: NormalizedStockWattakCharge[]
  ) {
    const totalNug = Number(payload.totalNug ?? items.reduce((sum, item) => sum + Number(item.nug || 0), 0))
    const totalWt = Number(payload.totalWt ?? items.reduce((sum, item) => sum + Number(item.wt || 0), 0))
    const basicAmount = Number(
      payload.basicAmount ?? items.reduce((sum, item) => sum + Number(item.basicAmount || 0), 0)
    )
    const totalCharges = Number(
      payload.totalCharges ?? charges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0)
    )
    const roundOff = Number(payload.roundOff ?? 0)
    const totalAmount = Number(payload.totalAmount ?? basicAmount + totalCharges + roundOff)

    return {
      totalNug,
      totalWt,
      basicAmount,
      totalCharges,
      roundOff,
      totalAmount
    }
  }

  private async generateVoucherNumber(companyId: string): Promise<string> {
    const prisma = await this.databaseService.getClient()
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const prefix = `SW-${year}${month}${day}`

    const lastWattak = await prisma.stockWattak.findFirst({
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

    if (!lastWattak?.vchNo) {
      return `${prefix}-001`
    }

    const parts = lastWattak.vchNo.split('-')
    const counter = Number(parts[2] || '0') + 1
    return `${prefix}-${String(counter).padStart(3, '0')}`
  }

  public async listStockWattaks(
    companyId: string,
    filters?: StockWattakListFilters
  ): Promise<ApiResponse<StockWattakListResponse>> {
    try {
      const prisma = await this.databaseService.getClient()
      const where: Prisma.StockWattakWhereInput = {
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

      if (filters?.partyId) {
        where.partyId = filters.partyId
      }

      if (filters?.search) {
        const searchTerm = filters.search.trim().toLowerCase()
        if (searchTerm) {
          where.OR = [
            { vchNo: { contains: searchTerm } },
            { vehicleNo: { contains: searchTerm } },
            { challanNo: { contains: searchTerm } },
            {
              party: {
                accountName: {
                  contains: searchTerm
                }
              }
            }
          ]
        }
      }

      const wattaks = await prisma.stockWattak.findMany({
        where,
        include: {
          party: { select: { accountName: true } },
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const serialized = await Promise.all(
        wattaks.map((entry) => this.serializeStockWattak(entry))
      )

      return {
        success: true,
        data: {
          wattaks: serialized,
          totals: this.reduceTotals(serialized)
        }
      }
    } catch (error: any) {
      console.error('[StockWattakService] Failed to list stock wattaks', error)
      return {
        success: false,
        error: error?.message || 'Unable to list stock wattaks'
      }
    }
  }

  public async getStockWattakById(id: string): Promise<ApiResponse<any>> {
    try {
      const prisma = await this.databaseService.getClient()
      const wattak = await prisma.stockWattak.findUnique({
        where: { id },
        include: {
          party: { select: { accountName: true } },
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

      if (!wattak) {
        return { success: false, error: 'Stock wattak not found' }
      }

      return {
        success: true,
        data: await this.serializeStockWattak(wattak)
      }
    } catch (error: any) {
      console.error('[StockWattakService] Failed to fetch stock wattak', error)
      return {
        success: false,
        error: error?.message || 'Unable to fetch stock wattak'
      }
    }
  }

  public async createStockWattak(
    companyId: string,
    payload: StockWattakPayload
  ): Promise<ApiResponse<any>> {
    try {
      const prisma = await this.databaseService.getClient()
      const normalizedItems = this.normalizeItems(payload.items)
      const normalizedCharges = this.normalizeCharges(payload.chargeLines)
      const totals = this.computeTotals(payload, normalizedItems, normalizedCharges)

      // Validate each item against ledger before creating wattak
      for (const item of normalizedItems) {
        if (!item.stockTransferId) {
          return {
            success: false,
            error: `Item ${item.itemId} must be linked to a stock transfer`
          }
        }

        const ledgerEntry = await prisma.stockTransferWattakLedger.findUnique({
          where: {
            stockTransferId_itemId_lotNo: {
              stockTransferId: item.stockTransferId,
              itemId: item.itemId,
              lotNo: (item.lotNo ?? null) as string
            }
          }
        })

        if (!ledgerEntry) {
          return {
            success: false,
            error: `No ledger entry found for item ${item.itemId} in transfer ${item.stockTransferId}`
          }
        }

        if (ledgerEntry.remainingNug < item.nug) {
          return {
            success: false,
            error: `Item ${item.itemId}: Cannot bill ${item.nug} nug. Only ${ledgerEntry.remainingNug} nug remaining`
          }
        }

        if (ledgerEntry.remainingWt < item.wt) {
          return {
            success: false,
            error: `Item ${item.itemId}: Cannot bill ${item.wt} kg. Only ${ledgerEntry.remainingWt} kg remaining`
          }
        }
      }

      // Create wattak and update ledger in transaction
      const wattak = await prisma.$transaction(async (tx) => {
        const newWattak = await tx.stockWattak.create({
          data: {
            companyId,
            partyId: payload.partyId,
            vchNo: payload.vchNo || (await this.generateVoucherNumber(companyId)),
            vehicleNo: payload.vehicleNo ?? null,
            challanNo: payload.challanNo ?? null,
            totalNug: totals.totalNug,
            totalWt: totals.totalWt,
            basicAmount: totals.basicAmount,
            totalCharges: totals.totalCharges,
            roundOff: totals.roundOff,
            totalAmount: totals.totalAmount,
            items: {
              create: normalizedItems.map((item) => ({
                stockTransferId: item.stockTransferId!,
                itemId: item.itemId,
                lotNo: item.lotNo,
                nug: item.nug,
                wt: item.wt,
                rate: item.rate,
                per: item.per,
                basicAmount: item.basicAmount,
                issuedNug: item.issuedNug,
                balanceNug: item.balanceNug
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
            }
          },
          include: {
            party: { select: { accountName: true } },
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

        // Update ledger entries
        for (const item of normalizedItems) {
          await tx.stockTransferWattakLedger.update({
            where: {
              stockTransferId_itemId_lotNo: {
                stockTransferId: item.stockTransferId!,
                itemId: item.itemId,
                lotNo: (item.lotNo ?? null) as string
              }
            },
            data: {
              billedNug: {
                increment: item.nug
              },
              billedWt: {
                increment: item.wt
              },
              remainingNug: {
                decrement: item.nug
              },
              remainingWt: {
                decrement: item.wt
              }
            }
          })
        }

        return newWattak
      })

      // Phase 18.7: Record ledger entry for stock wattak
      const itemsSummary = wattak.items.map(i => `${i.item?.itemName || 'Item'} ${i.nug}N/${i.wt}Kg`).join(', ')
      await this.accountLedgerService.recordStockWattak(
        companyId,
        payload.partyId,
        wattak.vchNo,
        totals.totalAmount,
        itemsSummary
      )

      return {
        success: true,
        data: await this.serializeStockWattak(wattak)
      }
    } catch (error: any) {
      console.error('[StockWattakService] Failed to create stock wattak', error)
      return {
        success: false,
        error: error?.message || 'Unable to create stock wattak'
      }
    }
  }

  public async updateStockWattak(
    id: string,
    payload: StockWattakPayload
  ): Promise<ApiResponse<any>> {
    try {
      const prisma = await this.databaseService.getClient()
      const existing = await prisma.stockWattak.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existing) {
        return { success: false, error: 'Stock wattak not found' }
      }

      // Phase 18.7: Reverse old ledger entry before update
      await this.accountLedgerService.reverseStockWattak(
        existing.companyId,
        existing.partyId,
        existing.vchNo
      )

      const normalizedItems = this.normalizeItems(payload.items)
      const normalizedCharges = this.normalizeCharges(payload.chargeLines)
      const totals = this.computeTotals(payload, normalizedItems, normalizedCharges)

      // Validate each new item against ledger
      for (const item of normalizedItems) {
        if (!item.stockTransferId) {
          return {
            success: false,
            error: `Item ${item.itemId} must be linked to a stock transfer`
          }
        }

        const ledgerEntry = await prisma.stockTransferWattakLedger.findUnique({
          where: {
            stockTransferId_itemId_lotNo: {
              stockTransferId: item.stockTransferId,
              itemId: item.itemId,
              lotNo: (item.lotNo ?? null) as string
            }
          }
        })

        if (!ledgerEntry) {
          return {
            success: false,
            error: `No ledger entry found for item ${item.itemId} in transfer ${item.stockTransferId}`
          }
        }

        // Find if this item was in the old wattak
        const oldItem = existing.items.find(
          (i) =>
            i.stockTransferId === item.stockTransferId &&
            i.itemId === item.itemId &&
            (i.lotNo ?? null) === (item.lotNo ?? null)
        )

        // Calculate net change (new quantity - old quantity, or new quantity if no old item)
        const netNugChange = item.nug - (oldItem?.nug ?? 0)
        const netWtChange = item.wt - (oldItem?.wt ?? 0)

        // Check if we have enough remaining quantity for the net increase
        if (netNugChange > 0 && ledgerEntry.remainingNug < netNugChange) {
          return {
            success: false,
            error: `Item ${item.itemId}: Cannot add ${netNugChange} more nug. Only ${ledgerEntry.remainingNug} nug remaining`
          }
        }

        if (netWtChange > 0 && ledgerEntry.remainingWt < netWtChange) {
          return {
            success: false,
            error: `Item ${item.itemId}: Cannot add ${netWtChange} more kg. Only ${ledgerEntry.remainingWt} kg remaining`
          }
        }
      }

      // Update wattak and ledger in transaction
      const wattak = await prisma.$transaction(async (tx) => {
        // Reverse old ledger entries
        for (const oldItem of existing.items) {
          await tx.stockTransferWattakLedger.update({
            where: {
              stockTransferId_itemId_lotNo: {
                stockTransferId: oldItem.stockTransferId!,
                itemId: oldItem.itemId,
                lotNo: (oldItem.lotNo ?? null) as string
              }
            },
            data: {
              billedNug: {
                decrement: oldItem.nug
              },
              billedWt: {
                decrement: oldItem.wt
              },
              remainingNug: {
                increment: oldItem.nug
              },
              remainingWt: {
                increment: oldItem.wt
              }
            }
          })
        }

        // Delete old items and charges
        await tx.stockWattakItem.deleteMany({ where: { stockWattakId: id } })
        await tx.stockWattakCharge.deleteMany({ where: { stockWattakId: id } })

        // Update wattak header and create new items/charges
        const updatedWattak = await tx.stockWattak.update({
          where: { id },
          data: {
            partyId: payload.partyId,
            vchNo: payload.vchNo || existing.vchNo,
            vehicleNo: payload.vehicleNo ?? null,
            challanNo: payload.challanNo ?? null,
            totalNug: totals.totalNug,
            totalWt: totals.totalWt,
            basicAmount: totals.basicAmount,
            totalCharges: totals.totalCharges,
            roundOff: totals.roundOff,
            totalAmount: totals.totalAmount,
            items: {
              create: normalizedItems.map((item) => ({
                stockTransferId: item.stockTransferId!,
                itemId: item.itemId,
                lotNo: item.lotNo,
                nug: item.nug,
                wt: item.wt,
                rate: item.rate,
                per: item.per,
                basicAmount: item.basicAmount,
                issuedNug: item.issuedNug,
                balanceNug: item.balanceNug
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
            }
          },
          include: {
            party: { select: { accountName: true } },
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

        // Apply new ledger entries
        for (const item of normalizedItems) {
          await tx.stockTransferWattakLedger.update({
            where: {
              stockTransferId_itemId_lotNo: {
                stockTransferId: item.stockTransferId!,
                itemId: item.itemId,
                lotNo: (item.lotNo ?? null) as string
              }
            },
            data: {
              billedNug: {
                increment: item.nug
              },
              billedWt: {
                increment: item.wt
              },
              remainingNug: {
                decrement: item.nug
              },
              remainingWt: {
                decrement: item.wt
              }
            }
          })
        }

        return updatedWattak
      })

      // Phase 18.7: Record new ledger entry after update
      const itemsSummary = wattak.items.map(i => `${i.item?.itemName || 'Item'} ${i.nug}N/${i.wt}Kg`).join(', ')
      await this.accountLedgerService.recordStockWattak(
        existing.companyId,
        payload.partyId,
        wattak.vchNo,
        totals.totalAmount,
        itemsSummary
      )

      return {
        success: true,
        data: await this.serializeStockWattak(wattak)
      }
    } catch (error: any) {
      console.error('[StockWattakService] Failed to update stock wattak', error)
      return {
        success: false,
        error: error?.message || 'Unable to update stock wattak'
      }
    }
  }

  public async deleteStockWattak(id: string): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()
      const existing = await prisma.stockWattak.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existing) {
        return { success: false, error: 'Stock wattak not found' }
      }

      // Phase 18.7: Reverse ledger entry before deletion
      await this.accountLedgerService.reverseStockWattak(
        existing.companyId,
        existing.partyId,
        existing.vchNo
      )

      // Delete wattak and reverse ledger entries in transaction
      await prisma.$transaction(async (tx) => {
        // Reverse ledger entries
        for (const item of existing.items) {
          if (item.stockTransferId) {
            await tx.stockTransferWattakLedger.update({
              where: {
                stockTransferId_itemId_lotNo: {
                  stockTransferId: item.stockTransferId,
                  itemId: item.itemId,
                  lotNo: (item.lotNo ?? null) as string
                }
              },
              data: {
                billedNug: {
                  decrement: item.nug
                },
                billedWt: {
                  decrement: item.wt
                },
                remainingNug: {
                  increment: item.nug
                },
                remainingWt: {
                  increment: item.wt
                }
              }
            })
          }
        }

        // Delete the wattak (items and charges will be deleted via CASCADE)
        await tx.stockWattak.delete({ where: { id } })
      })

      return {
        success: true,
        message: 'Stock wattak deleted'
      }
    } catch (error: any) {
      console.error('[StockWattakService] Failed to delete stock wattak', error)
      return {
        success: false,
        error: error?.message || 'Unable to delete stock wattak'
      }
    }
  }

  public async getNextVoucherNumber(companyId: string): Promise<ApiResponse<string>> {
    try {
      return {
        success: true,
        data: await this.generateVoucherNumber(companyId)
      }
    } catch (error: any) {
      console.error('[StockWattakService] Failed to generate voucher no', error)
      return {
        success: false,
        error: error?.message || 'Unable to generate voucher number'
      }
    }
  }

  /**
   * Get available stock transfers with remaining quantities from ledger
   * Filters by party, vehicle, challan and excludes fully-billed transfers
   */
  public async getAvailableTransfers(
    companyId: string,
    filters?: { partyId?: string; vehicleNo?: string; challanNo?: string; excludeWattakId?: string }
  ): Promise<ApiResponse<any[]>> {
    try {
      const prisma = await this.databaseService.getClient()
      const where: any = { companyId }

      if (filters?.partyId) {
        where.accountId = filters.partyId
      }

      if (filters?.vehicleNo) {
        where.vehicleNo = { contains: filters.vehicleNo, mode: 'insensitive' }
      }

      if (filters?.challanNo) {
        where.challanNo = { contains: filters.challanNo, mode: 'insensitive' }
      }

      // If editing, we need to temporarily "reverse" the quantities from the wattak being edited
      let excludedWattakItems: Array<{ stockTransferId: string; itemId: string; lotNo: string | null; nug: number; wt: number }> = []
      if (filters?.excludeWattakId) {
        const excludedWattak = await prisma.stockWattak.findUnique({
          where: { id: filters.excludeWattakId },
          include: { items: true }
        })
        if (excludedWattak) {
          excludedWattakItems = excludedWattak.items
            .filter(item => item.stockTransferId)
            .map(item => ({
              stockTransferId: item.stockTransferId!,
              itemId: item.itemId,
              lotNo: item.lotNo,
              nug: Number(item.nug) || 0,
              wt: Number(item.wt) || 0
            }))
        }
      }

      // Get transfers with their ledger entries
      const transfers = await prisma.stockTransfer.findMany({
        where,
        include: {
          account: { select: { accountName: true } },
          items: {
            include: {
              item: { select: { itemName: true } }
            }
          },
          wattakLedger: true
        },
        orderBy: { createdAt: 'desc' }
      })

      // Filter and enrich transfers
      const availableTransfers = transfers
        .map(transfer => {
          // Enrich items with ledger data (adjusted for excluded wattak)
          const enrichedItems = transfer.items.map(item => {
            const ledger = transfer.wattakLedger.find(
              l => l.itemId === item.itemId && (l.lotNo ?? null) === (item.lotNo ?? null)
            )
            
            let remainingNug = ledger?.remainingNug ?? item.nug
            let remainingWt = ledger?.remainingWt ?? item.kg
            
            // Add back quantities from the excluded wattak
            if (filters?.excludeWattakId) {
              const excludedItem = excludedWattakItems.find(
                ex => ex.stockTransferId === transfer.id && 
                      ex.itemId === item.itemId && 
                      (ex.lotNo ?? null) === (item.lotNo ?? null)
              )
              if (excludedItem) {
                remainingNug += excludedItem.nug
                remainingWt += excludedItem.wt
              }
            }
            
            return {
              ...item,
              transferredNug: ledger?.transferredNug ?? item.nug,
              transferredWt: ledger?.transferredWt ?? item.kg,
              billedNug: ledger?.billedNug ?? 0,
              billedWt: ledger?.billedWt ?? 0,
              remainingNug,
              remainingWt,
              hasRemaining: remainingNug > 0 || remainingWt > 0
            }
          }).filter(item => item.hasRemaining) // Only include items with remaining quantities

          return {
            ...transfer,
            items: enrichedItems,
            accountName: transfer.account.accountName,
            wattakLedger: undefined // Remove raw ledger data from response
          }
        })
        .filter(transfer => transfer.items.length > 0) // Only include transfers with available items

      return {
        success: true,
        data: availableTransfers
      }
    } catch (error: any) {
      console.error('[StockWattakService] Failed to get available transfers', error)
      return {
        success: false,
        error: error?.message || 'Unable to get available transfers'
      }
    }
  }
}

export default StockWattakService
