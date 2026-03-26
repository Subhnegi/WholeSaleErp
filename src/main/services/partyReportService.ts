import DatabaseService from './database'

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export type SaleSummarySource = 'quickSale' | 'dailySale' | 'stockSale'

export interface SaleSummaryFilters {
  startDate: string
  endDate: string
}

export interface SaleSummaryRow {
  id: string
  source: SaleSummarySource
  sourceLabel: string
  referenceId: string
  date: string
  voucherNo: string
  customerId: string | null
  customerName: string
  itemId: string | null
  itemName: string
  nug: number
  kg: number
  rate: number
  per: string
  basicAmount: number
  expenses: number
  amount: number
  supplierName?: string | null
  storeName?: string | null
}

export interface SaleSummaryTotals {
  totalRows: number
  totalNug: number
  totalKg: number
  totalBasicAmount: number
  totalExpenses: number
  totalAmount: number
}

export interface SaleSummaryResponse {
  rows: SaleSummaryRow[]
  totals: SaleSummaryTotals
}

const ZERO_TOTALS: SaleSummaryTotals = {
  totalRows: 0,
  totalNug: 0,
  totalKg: 0,
  totalBasicAmount: 0,
  totalExpenses: 0,
  totalAmount: 0
}

const normalizeDate = (value: unknown): string => {
  if (!value) {
    return ''
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  const str = String(value)
  if (str.includes('T')) {
    return str.split('T')[0] ?? ''
  }
  return str
}

const toNumber = (value: unknown): number => {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

export class PartyReportService {
  private static instance: PartyReportService
  private databaseService: DatabaseService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
  }

  public static getInstance(): PartyReportService {
    if (!PartyReportService.instance) {
      PartyReportService.instance = new PartyReportService()
    }
    return PartyReportService.instance
  }

  public async getSaleSummaryCustomerBills(
    companyId: string,
    filters: SaleSummaryFilters
  ): Promise<ApiResponse<SaleSummaryResponse>> {
    try {
      const { startDate, endDate } = filters

      if (!companyId) {
        return {
          success: false,
          error: 'Company ID is required'
        }
      }

      if (!startDate || !endDate) {
        return {
          success: false,
          error: 'Start date and end date are required'
        }
      }

      if (startDate > endDate) {
        return {
          success: false,
          error: 'Start date cannot be after end date'
        }
      }

      const prisma = await this.databaseService.getClient()

      const [quickSales, vouchers, stockSales] = await Promise.all([
        prisma.quickSale.findMany({
          where: {
            companyId,
            saleDate: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            items: true
          }
        }),
        prisma.voucher.findMany({
          where: {
            companyId,
            voucherDate: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            items: true
          }
        }),
        prisma.stockSale.findMany({
          where: {
            companyId,
            saleDate: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            items: true
          }
        })
      ])

      const rows: SaleSummaryRow[] = []

      quickSales.forEach((sale) => {
        const saleDate = normalizeDate(sale.saleDate)
        sale.items.forEach((item) => {
          const nug = toNumber(item.nug)
          const weight = toNumber(item.kg)
          const basicAmount = toNumber(item.basicAmount)
          const amount = toNumber(item.totalAmount)
          const expenses = amount - basicAmount

          rows.push({
            id: `quick-${item.id}`,
            source: 'quickSale',
            sourceLabel: 'Quick Sale',
            referenceId: sale.id,
            date: saleDate,
            voucherNo: sale.voucherNo ?? '',
            customerId: item.accountId ?? null,
            customerName: item.accountName || 'Direct Customer',
            itemId: item.itemId ?? null,
            itemName: item.itemName || 'Unknown Item',
            nug,
            kg: weight,
            rate: toNumber(item.rate),
            per: (item.per || 'nug').toLowerCase(),
            basicAmount,
            expenses,
            amount,
            supplierName: null,
            storeName: null
          })
        })
      })

      vouchers.forEach((voucher) => {
        const voucherDate = normalizeDate(voucher.voucherDate)
        voucher.items.forEach((item) => {
          const nug = toNumber(item.nug)
          const weight = toNumber(item.weight)
          const basicAmount = toNumber(item.basicAmount)
          const netAmount = toNumber(item.netAmount)
          const expenses =
            toNumber(item.commission) +
            toNumber(item.marketFees) +
            toNumber(item.rdf) +
            toNumber(item.bardana) +
            toNumber(item.laga)

          rows.push({
            id: `daily-${item.id}`,
            source: 'dailySale',
            sourceLabel: 'Daily Sale',
            referenceId: voucher.id,
            date: voucherDate,
            voucherNo: voucher.voucherNo ?? '',
            customerId: item.customerId ?? null,
            customerName: item.customerName || 'Unknown Customer',
            itemId: item.itemId ?? null,
            itemName: item.itemName || 'Unknown Item',
            nug,
            kg: weight,
            rate: toNumber(item.customerPrice ?? item.supplierPrice),
            per: (item.per || 'nug').toLowerCase(),
            basicAmount,
            expenses,
            amount: netAmount,
            supplierName: voucher.supplierName || null,
            storeName: null
          })
        })
      })

      stockSales.forEach((sale) => {
        const saleDate = normalizeDate(sale.saleDate)
        sale.items.forEach((item) => {
          const nug = toNumber(item.nug)
          const weight = toNumber(item.kg)
          const basicAmount = toNumber(item.basicAmount)
          const netAmount = toNumber(item.netAmount)
          const expenses =
            toNumber(item.commission) +
            toNumber(item.marketFees) +
            toNumber(item.rdf) +
            toNumber(item.bardana) +
            toNumber(item.laga)

          rows.push({
            id: `stock-${item.id}`,
            source: 'stockSale',
            sourceLabel: 'Stock Sale',
            referenceId: sale.id,
            date: saleDate,
            voucherNo: sale.voucherNo ?? '',
            customerId: item.customerId ?? null,
            customerName: item.customerName || 'Unknown Customer',
            itemId: item.itemId ?? null,
            itemName: item.itemName || 'Unknown Item',
            nug,
            kg: weight,
            rate: toNumber(item.customerRate ?? item.rate),
            per: (item.per || 'nug').toLowerCase(),
            basicAmount,
            expenses,
            amount: netAmount,
            supplierName: item.supplierName || null,
            storeName: item.storeName || null
          })
        })
      })

      rows.sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date)
        }
        if (a.voucherNo !== b.voucherNo) {
          return (a.voucherNo || '').localeCompare(b.voucherNo || '')
        }
        return a.id.localeCompare(b.id)
      })

      const totals = rows.reduce<SaleSummaryTotals>((acc, row) => {
        acc.totalRows += 1
        acc.totalNug += row.nug
        acc.totalKg += row.kg
        acc.totalBasicAmount += row.basicAmount
        acc.totalExpenses += row.expenses
        acc.totalAmount += row.amount
        return acc
      }, { ...ZERO_TOTALS })

      return {
        success: true,
        data: {
          rows,
          totals
        }
      }
    } catch (error: any) {
      console.error('[PartyReportService] Failed to build sale summary report', error)
      return {
        success: false,
        error: error?.message || 'Failed to load Sale Summary & Customer Bills report'
      }
    }
  }
}

export const partyReportService = PartyReportService.getInstance()
