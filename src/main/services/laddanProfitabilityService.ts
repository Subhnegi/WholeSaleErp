import DatabaseService from './database'
import type { Prisma } from '@prisma/client'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface LaddanProfitabilityReportFilters {
  startDate?: string
  endDate?: string
  accountId?: string
  search?: string
}

export interface LaddanProfitabilityReportRow {
  transferId: string
  date: string
  voucherNo: string
  vehicleNo: string | null
  challanNo: string | null
  accountId: string
  accountName: string
  nugReceived: number
  nugSold: number
  balanceNug: number
  kgReceived: number
  kgSold: number
  actualSaleAmount: number
  sellerBillAmount: number
  profitLossAmount: number
}

export interface LaddanProfitabilityReportTotals {
  totalRecords: number
  totalNugReceived: number
  totalNugSold: number
  totalBalanceNug: number
  totalKgReceived: number
  totalKgSold: number
  totalActualSaleAmount: number
  totalSellerBillAmount: number
  totalProfitLossAmount: number
}

export interface LaddanProfitabilityReportResponse {
  rows: LaddanProfitabilityReportRow[]
  totals: LaddanProfitabilityReportTotals
}

const EMPTY_TOTALS: LaddanProfitabilityReportTotals = {
  totalRecords: 0,
  totalNugReceived: 0,
  totalNugSold: 0,
  totalBalanceNug: 0,
  totalKgReceived: 0,
  totalKgSold: 0,
  totalActualSaleAmount: 0,
  totalSellerBillAmount: 0,
  totalProfitLossAmount: 0
}

const round2 = (value: number) => {
  if (!Number.isFinite(value)) {
    return 0
  }
  const rounded = Math.round(value * 100) / 100
  return Math.abs(rounded) < 0.00001 ? 0 : rounded
}

class LaddanProfitabilityService {
  private static instance: LaddanProfitabilityService
  private databaseService: DatabaseService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
  }

  public static getInstance(): LaddanProfitabilityService {
    if (!LaddanProfitabilityService.instance) {
      LaddanProfitabilityService.instance = new LaddanProfitabilityService()
    }
    return LaddanProfitabilityService.instance
  }

  public async getReport(
    companyId: string,
    filters?: LaddanProfitabilityReportFilters
  ): Promise<ApiResponse<LaddanProfitabilityReportResponse>> {
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

      if (filters?.search?.trim()) {
        const search = filters.search.trim().toLowerCase()
        where.OR = [
          { vchNo: { contains: search } },
          { vehicleNo: { contains: search } },
          { challanNo: { contains: search } },
          {
            account: {
              accountName: { contains: search }
            }
          }
        ]
      }

      const transfers = await prisma.stockTransfer.findMany({
        where,
        include: {
          account: { select: { accountName: true } },
          wattakLedger: true
        },
        orderBy: { createdAt: 'desc' }
      })

      if (!transfers.length) {
        return { success: true, data: { rows: [], totals: { ...EMPTY_TOTALS } } }
      }

      const transferIds = transfers.map((transfer) => transfer.id)
      const rowsMap = new Map<string, {
        transferId: string
        date: string
        voucherNo: string
        vehicleNo: string | null
        challanNo: string | null
        accountId: string
        accountName: string
        nugReceived: number
        kgReceived: number
        nugSold: number
        kgSold: number
        balanceNug: number
        wattakAmount: number
        transferCost: number
      }>()

      for (const transfer of transfers) {
        const ledgerTotals = transfer.wattakLedger.reduce(
          (acc, entry) => {
            acc.nugSold += Number(entry.billedNug) || 0
            acc.kgSold += Number(entry.billedWt) || 0
            acc.remainingNug += Number(entry.remainingNug) || 0
            return acc
          },
          { nugSold: 0, kgSold: 0, remainingNug: 0 }
        )

        rowsMap.set(transfer.id, {
          transferId: transfer.id,
          date:
            transfer.createdAt instanceof Date
              ? transfer.createdAt.toISOString().split('T')[0]
              : typeof transfer.createdAt === 'string'
                ? (transfer.createdAt as string).split('T')[0]
                : '',
          voucherNo: transfer.vchNo || '',
          vehicleNo: transfer.vehicleNo || null,
          challanNo: transfer.challanNo || null,
          accountId: transfer.accountId,
          accountName: transfer.account?.accountName || 'Unknown Party',
          nugReceived: Number(transfer.totalNug || 0),
          kgReceived: Number(transfer.totalWt || 0),
          nugSold: round2(ledgerTotals.nugSold),
          kgSold: round2(ledgerTotals.kgSold),
          balanceNug: round2(Math.max(Number(transfer.totalNug || 0) - ledgerTotals.nugSold, 0)),
          wattakAmount: 0,
          transferCost: Number(transfer.totalOurCost || 0)
        })
      }

      if (transferIds.length) {
        const wattaks = await prisma.stockWattak.findMany({
          where: {
            companyId,
            items: {
              some: {
                stockTransferId: { in: transferIds }
              }
            }
          },
          select: {
            id: true,
            totalAmount: true,
            items: {
              select: {
                stockTransferId: true,
                basicAmount: true
              }
            }
          }
        })

        for (const wattak of wattaks) {
          const relevantItems = wattak.items.filter(
            (item) => item.stockTransferId && rowsMap.has(item.stockTransferId)
          )
          if (!relevantItems.length) {
            continue
          }

          const totalAmount = Number(wattak.totalAmount) || 0
          if (totalAmount === 0) {
            continue
          }

          const totalBasic = relevantItems.reduce(
            (sum, item) => sum + (Number(item.basicAmount) || 0),
            0
          )

          let remainingAmount = totalAmount
          const denominator = totalBasic > 0 ? totalBasic : relevantItems.length

          relevantItems.forEach((item, index) => {
            const base = totalBasic > 0 ? Number(item.basicAmount) || 0 : 1
            const ratio = denominator === 0 ? 0 : base / denominator
            let allocation = round2(totalAmount * ratio)

            if (index === relevantItems.length - 1) {
              allocation = round2(remainingAmount)
            } else {
              remainingAmount = round2(remainingAmount - allocation)
            }

            const row = rowsMap.get(item.stockTransferId as string)
            if (row) {
              row.wattakAmount = round2(row.wattakAmount + allocation)
            }
          })
        }
      }

      let rows = Array.from(rowsMap.values()).map((row) => {
        const actualSaleAmount = round2(row.wattakAmount)
        const sellerBillAmount = round2(row.transferCost)
        const profitLossAmount = round2(actualSaleAmount - sellerBillAmount)

        return {
          transferId: row.transferId,
          date: row.date,
          voucherNo: row.voucherNo,
          vehicleNo: row.vehicleNo,
          challanNo: row.challanNo,
          accountId: row.accountId,
          accountName: row.accountName,
          nugReceived: round2(row.nugReceived),
          nugSold: round2(row.nugSold),
          balanceNug: round2(row.balanceNug),
          kgReceived: round2(row.kgReceived),
          kgSold: round2(row.kgSold),
          actualSaleAmount,
          sellerBillAmount,
          profitLossAmount
        }
      })

      if (filters?.search?.trim()) {
        const search = filters.search.trim().toLowerCase()
        rows = rows.filter((row) => {
          const vehicleCombined = `${row.vehicleNo || ''} ${row.challanNo || ''}`.toLowerCase()
          return (
            (row.voucherNo || '').toLowerCase().includes(search) ||
            (row.vehicleNo || '').toLowerCase().includes(search) ||
            (row.challanNo || '').toLowerCase().includes(search) ||
            row.accountName.toLowerCase().includes(search) ||
            vehicleCombined.includes(search)
          )
        })
      }

      rows.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) {
          return dateCompare
        }
        return (b.voucherNo || '').localeCompare(a.voucherNo || '')
      })

      const totals = rows.reduce(
        (acc, row) => {
          acc.totalRecords += 1
          acc.totalNugReceived += row.nugReceived
          acc.totalNugSold += row.nugSold
          acc.totalBalanceNug += row.balanceNug
          acc.totalKgReceived += row.kgReceived
          acc.totalKgSold += row.kgSold
          acc.totalActualSaleAmount += row.actualSaleAmount
          acc.totalSellerBillAmount += row.sellerBillAmount
          acc.totalProfitLossAmount += row.profitLossAmount
          return acc
        },
        { ...EMPTY_TOTALS }
      )

      return {
        success: true,
        data: {
          rows,
          totals: {
            totalRecords: totals.totalRecords,
            totalNugReceived: round2(totals.totalNugReceived),
            totalNugSold: round2(totals.totalNugSold),
            totalBalanceNug: round2(totals.totalBalanceNug),
            totalKgReceived: round2(totals.totalKgReceived),
            totalKgSold: round2(totals.totalKgSold),
            totalActualSaleAmount: round2(totals.totalActualSaleAmount),
            totalSellerBillAmount: round2(totals.totalSellerBillAmount),
            totalProfitLossAmount: round2(totals.totalProfitLossAmount)
          }
        }
      }
    } catch (error) {
      console.error('[LaddanProfitabilityService] Error generating laddan profitability report:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load laddan profitability report'
      }
    }
  }
}

export default LaddanProfitabilityService
