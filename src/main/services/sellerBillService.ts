import DatabaseService from './database'
import type { Prisma } from '@prisma/client'
import { AccountLedgerService } from './accountLedgerService'

const MALL_KHATA_ACCOUNT_NAME = 'Mall Khata Purchase A/c'
const MALL_KHATA_ACCOUNT_NAME_LOWER = MALL_KHATA_ACCOUNT_NAME.toLowerCase()

export interface SellerBillArrivalCharge {
  id: string
  arrivalId: string
  otherChargesId: string
  chargesHeadName: string
  onValue: number | null
  per: number | null
  atRate: number | null
  no: number | null
  plusMinus: '+' | '-'
  amount: number
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

interface SellerBillListFilters {
  supplierId?: string
  mode?: string
  startDate?: string
  endDate?: string
  search?: string
}

interface SellerBillListItem {
  id: string
  companyId: string
  accountId: string
  supplierName: string
  vchNo: string
  mode: string | null
  vehicleNo: string | null
  stockSaleId: string | null
  stockSaleVoucherNo: string | null
  saleDate: string | null
  totalNug: number
  totalKg: number
  basicAmount: number
  arrivalExpenses: number
  charges: number
  roundOff: number
  netAmount: number
  createdAt: string
  updatedAt: string
  items: any[]
  chargeLines: any[]
}

interface SellerBillListTotals {
  totalBills: number
  totalNug: number
  totalKg: number
  totalBasicAmount: number
  totalArrivalExpenses: number
  totalCharges: number
  totalRoundOff: number
  totalNetAmount: number
}

interface SellerBillListResponse {
  bills: SellerBillListItem[]
  totals: SellerBillListTotals
}

interface SellerBillSoldItem {
  stockSaleItemId: string
  stockSaleId: string
  stockSaleVoucherNo: string | null
  stockSaleDate: string | null
  itemId: string
  itemName: string
  lotNo: string
  per: string
  nug: number
  kg: number
  rate: number
  amount: number
}

interface PendingSellerBillRow {
  arrivalId: string
  date: string
  voucherNo: string
  vehicleNo: string | null
  challanNo: string | null
  supplierId: string
  supplierName: string
  status: 'sold' | 'unsold'  // NEW: indicates if this row is for sold or unsold items
  nug: number                 // Quantity (sold nug OR unsold nug)
  kg: number                  // Quantity (sold kg OR unsold kg)
  wattakAmount: number        // Only for sold items (unbilled)
  storeId: string | null
  storeName: string | null
}

interface PendingSellerBillTotals {
  totalRecords: number
  totalSoldNug: number
  totalSoldKg: number
  totalUnsoldNug: number
  totalUnsoldKg: number
  totalWattakAmount: number
}

// Internal accumulator type for tracking arrival data during FIFO allocation
interface ArrivalAccumulator {
  arrivalId: string
  date: string
  voucherNo: string
  vehicleNo: string | null
  challanNo: string | null
  supplierId: string
  supplierName: string
  storeId: string | null
  storeName: string | null
  nugReceived: number         // Total received for this arrival
  kgReceived: number
  nugSoldTotal: number        // ALL sold (billed + unbilled)
  kgSoldTotal: number
  nugSoldUnbilled: number     // Only unbilled sold
  kgSoldUnbilled: number
  wattakAmount: number        // Only UNBILLED sold amount
}

interface PendingSellerBillResponse {
  rows: PendingSellerBillRow[]
  totals: PendingSellerBillTotals
}

interface ProfitabilityReportFilters {
  startDate?: string
  endDate?: string
  supplierId?: string
  storeId?: string | null
  search?: string
}

type TransferStatus = 'none' | 'partial' | 'full'

interface ProfitabilityReportRow {
  arrivalId: string
  date: string
  voucherNo: string
  vehicleNo: string | null
  challanNo: string | null
  supplierId: string
  supplierName: string
  storeId: string | null
  storeName: string | null
  nugReceived: number
  nugSold: number
  nugTransferred: number
  balanceNug: number
  kgReceived: number
  kgSold: number
  kgTransferred: number
  actualSaleAmount: number
  sellerBillAmount: number
  profitLossAmount: number
  transferStatus: TransferStatus
}

interface ProfitabilityReportTotals {
  totalRecords: number
  totalNugReceived: number
  totalNugSold: number
  totalNugTransferred: number
  totalBalanceNug: number
  totalKgReceived: number
  totalKgSold: number
  totalKgTransferred: number
  totalActualSaleAmount: number
  totalSellerBillAmount: number
  totalProfitLossAmount: number
}

interface ProfitabilityReportResponse {
  rows: ProfitabilityReportRow[]
  totals: ProfitabilityReportTotals
}

export class SellerBillService {
  private static instance: SellerBillService
  private databaseService: DatabaseService
  private accountLedgerService: AccountLedgerService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.accountLedgerService = AccountLedgerService.getInstance()
  }

  public static getInstance(): SellerBillService {
    if (!SellerBillService.instance) {
      SellerBillService.instance = new SellerBillService()
    }
    return SellerBillService.instance
  }

  private resolveItemAmount(item: { per: string; nug: number; kg: number; rate: number }): number {
    const quantity = item.per === 'kg' ? item.kg : item.nug
    return Number((quantity * item.rate).toFixed(2))
  }

  private calculateChargesNet(charges: Array<{ plusMinus: '+' | '-'; amount: number }>): number {
    return charges.reduce((sum, charge) => {
      const amount = Number(charge.amount) || 0
      return charge.plusMinus === '-' ? sum - amount : sum + amount
    }, 0)
  }

  private serializeBillRecord(bill: any, itemMap: Map<string, string>): SellerBillListItem {
    const basicAmount = Number(bill.basicAmount) || 0
    const arrivalExpenses = Number(bill.arrivalExpenses) || 0
    const charges = Number(bill.charges) || 0
    const roundOff = Number(bill.roundOff) || 0
    const netAmount = basicAmount + arrivalExpenses + charges + roundOff

    const saleDate = bill.stockSale?.saleDate
      ? typeof bill.stockSale.saleDate === 'string'
        ? bill.stockSale.saleDate
        : bill.stockSale.saleDate.toISOString().split('T')[0]
      : null

    const items = bill.items.map((item: any) => ({
      id: item.id,
      itemId: item.itemId,
      itemName: itemMap.get(item.itemId) || '',
      lotNo: item.lotNo || '',
      nug: Number(item.nug) || 0,
      kg: Number(item.kg) || 0,
      rate: Number(item.rate) || 0,
      per: item.per || 'nug',
      amount: Number(item.amount) || 0,
      stockSaleItemId: item.stockSaleItemId || null
    }))

    const chargeLines = bill.chargeLines.map((charge: any) => ({
      id: charge.id,
      otherChargesId: charge.otherChargesId,
      arrivalChargeId: charge.arrivalChargeId,
      chargesHeadName: charge.otherChargesHead?.headingName || '',
      onValue: charge.onValue !== null ? Number(charge.onValue) : null,
      per: charge.per !== null ? Number(charge.per) : null,
      atRate: charge.atRate !== null ? Number(charge.atRate) : null,
      no: charge.no !== null ? Number(charge.no) : null,
      plusMinus: charge.plusMinus === '-' ? '-' : '+',
      amount: Number(charge.amount) || 0
    }))

    return {
      id: bill.id,
      companyId: bill.companyId,
      accountId: bill.accountId,
      supplierName: bill.account?.accountName || '',
      vchNo: bill.vchNo,
      mode: bill.mode,
      vehicleNo: bill.vehicleNo,
      stockSaleId: bill.stockSaleId,
      stockSaleVoucherNo: bill.stockSale?.voucherNo || null,
      saleDate,
      totalNug: Number(bill.totalNug) || 0,
      totalKg: Number(bill.totalKg) || 0,
      basicAmount,
      arrivalExpenses,
      charges,
      roundOff,
      netAmount,
      createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : bill.createdAt,
      updatedAt: bill.updatedAt instanceof Date ? bill.updatedAt.toISOString() : bill.updatedAt,
      items,
      chargeLines
    }
  }

  async getSellerBillsByFilters(
    companyId: string,
    filters?: SellerBillListFilters
  ): Promise<ApiResponse<SellerBillListResponse>> {
    try {
      const prisma = await this.databaseService.getClient()
      const where: any = { companyId }

      if (filters?.supplierId) {
        where.accountId = filters.supplierId
      }

      if (filters?.mode) {
        where.mode = filters.mode
      }

      if (filters?.startDate || filters?.endDate) {
        const saleDateFilter: any = {}
        if (filters.startDate) {
          saleDateFilter.gte = filters.startDate
        }
        if (filters.endDate) {
          saleDateFilter.lte = filters.endDate
        }

        const createdAtFilter: any = {}
        if (filters.startDate) {
          const start = new Date(filters.startDate)
          start.setHours(0, 0, 0, 0)
          createdAtFilter.gte = start
        }
        if (filters.endDate) {
          const end = new Date(filters.endDate)
          end.setHours(23, 59, 59, 999)
          createdAtFilter.lte = end
        }

        const dateConditions: any[] = []
        if (Object.keys(saleDateFilter).length > 0) {
          dateConditions.push({
            stockSaleId: { not: null },
            stockSale: { saleDate: saleDateFilter }
          })
        }
        if (Object.keys(createdAtFilter).length > 0) {
          dateConditions.push({
            stockSaleId: null,
            createdAt: createdAtFilter
          })
        }

        if (dateConditions.length > 0) {
          where.AND = [...(where.AND || []), { OR: dateConditions }]
        }
      }

      if (filters?.search?.trim()) {
        const searchTerm = filters.search.trim()
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { vchNo: { contains: searchTerm, mode: 'insensitive' } },
              { account: { accountName: { contains: searchTerm, mode: 'insensitive' } } },
              { stockSale: { voucherNo: { contains: searchTerm, mode: 'insensitive' } } }
            ]
          }
        ]
      }

      const bills = await prisma.sellerBill.findMany({
        where,
        include: {
          account: { select: { accountName: true } },
          stockSale: { select: { voucherNo: true, saleDate: true } },
          items: true,
          chargeLines: {
            include: {
              otherChargesHead: { select: { headingName: true } }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      const itemIds = Array.from(new Set(bills.flatMap((bill) => bill.items.map((item) => item.itemId))))
      const itemMap = itemIds.length
        ? new Map(
            (
              await prisma.item.findMany({
                where: { id: { in: itemIds } },
                select: { id: true, itemName: true }
              })
            ).map((item) => [item.id, item.itemName])
          )
        : new Map<string, string>()

      const serializedBills: SellerBillListItem[] = bills.map((bill) =>
        this.serializeBillRecord(bill, itemMap)
      )

      const totals: SellerBillListTotals = serializedBills.reduce(
        (acc, bill) => {
          acc.totalBills += 1
          acc.totalNug += bill.totalNug
          acc.totalKg += bill.totalKg
          acc.totalBasicAmount += bill.basicAmount
          acc.totalArrivalExpenses += bill.arrivalExpenses
          acc.totalCharges += bill.charges
          acc.totalRoundOff += bill.roundOff
          acc.totalNetAmount += bill.netAmount
          return acc
        },
        {
          totalBills: 0,
          totalNug: 0,
          totalKg: 0,
          totalBasicAmount: 0,
          totalArrivalExpenses: 0,
          totalCharges: 0,
          totalRoundOff: 0,
          totalNetAmount: 0
        }
      )

      return {
        success: true,
        data: {
          bills: serializedBills,
          totals
        }
      }
    } catch (error) {
      console.error('[SellerBillService] Error fetching seller bills:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch seller bills'
      }
    }
  }

  async getSellerBillById(id: string): Promise<ApiResponse<SellerBillListItem>> {
    try {
      const prisma = await this.databaseService.getClient()
      const bill = await prisma.sellerBill.findUnique({
        where: { id },
        include: {
          account: { select: { accountName: true } },
          stockSale: { select: { voucherNo: true, saleDate: true } },
          items: true,
          chargeLines: {
            include: {
              otherChargesHead: { select: { headingName: true } }
            }
          }
        }
      })

      if (!bill) {
        return { success: false, error: 'Seller bill not found' }
      }

      const itemIds = Array.from(new Set(bill.items.map((item: any) => item.itemId)))
      const itemMap = itemIds.length
        ? new Map(
            (
              await prisma.item.findMany({
                where: { id: { in: itemIds } },
                select: { id: true, itemName: true }
              })
            ).map((item) => [item.id, item.itemName])
          )
        : new Map<string, string>()

      return {
        success: true,
        data: this.serializeBillRecord(bill, itemMap)
      }
    } catch (error) {
      console.error('[SellerBillService] Error fetching seller bill:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch seller bill'
      }
    }
  }

  async generateVoucherNumber(companyId: string): Promise<string> {
    try {
      const prisma = await this.databaseService.getClient()
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const prefix = `SB-${year}${month}${day}`

      const lastBill = await prisma.sellerBill.findFirst({
        where: {
          companyId,
          vchNo: { startsWith: prefix }
        },
        orderBy: {
          vchNo: 'desc'
        }
      })

      if (!lastBill) {
        return `${prefix}-001`
      }

      const lastNumber = parseInt(lastBill.vchNo.split('-')[2] || '0', 10)
      const nextNumber = String(lastNumber + 1).padStart(3, '0')
      return `${prefix}-${nextNumber}`
    } catch (error) {
      console.error('[SellerBillService] Error generating voucher number:', error)
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `SB-${year}${month}${day}-${Date.now()}`
    }
  }

  async createSellerBill(companyId: string, data: any): Promise<ApiResponse<SellerBillListItem>> {
    try {
      const prisma = await this.databaseService.getClient()

      const voucherNo = data?.vchNo || data?.voucherNo || (await this.generateVoucherNumber(companyId))
      const items = Array.isArray(data?.items) ? data.items : []
      const chargeLines = Array.isArray(data?.chargeLines) ? data.chargeLines : []
      const createdAtDate = data?.billDate ? new Date(`${data.billDate}T00:00:00`) : null

      const normalizedItems = items.map((item: any) => {
        const per = (item.per || 'nug').toLowerCase()
        const nug = Number(item.nug) || 0
        const kg = Number(item.kg) || 0
        const rate = Number(item.rate) || 0
        const amount = this.resolveItemAmount({ ...item, per, nug, kg, rate })

        return {
          itemId: item.itemId,
          lotNo: item.lotNo || item.lotNoVariety || null,
          nug,
          kg,
          rate,
          per,
          amount,
          stockSaleItemId: item.stockSaleItemId || null
        }
      })

      const normalizedCharges = chargeLines.map((charge: any) => ({
        otherChargesId: charge.otherChargesId,
        arrivalChargeId:
          typeof charge.arrivalChargeId === 'string' && charge.arrivalChargeId.trim().length
            ? charge.arrivalChargeId.trim()
            : null,
        onValue: charge.onValue !== undefined && charge.onValue !== null ? Number(charge.onValue) : null,
        per: charge.per !== undefined && charge.per !== null ? Number(charge.per) : null,
        atRate: charge.atRate !== undefined && charge.atRate !== null ? Number(charge.atRate) : null,
        no: charge.no !== undefined && charge.no !== null ? Number(charge.no) : null,
        plusMinus: charge.plusMinus === '-' ? '-' : '+',
        amount: Number(charge.amount) || 0
      }))

      const totalNug = normalizedItems.reduce((sum, item) => sum + item.nug, 0)
      const totalKg = normalizedItems.reduce((sum, item) => sum + item.kg, 0)
      const basicAmount = normalizedItems.reduce((sum, item) => sum + item.amount, 0)
      const chargesTotal = this.calculateChargesNet(normalizedCharges)
      const arrivalExpenses = Number(data?.arrivalExpenses) || 0
      const roundOff = Number(data?.roundOff) || 0

      const created = await prisma.sellerBill.create({
        data: {
          companyId,
          accountId: data.accountId,
          vchNo: voucherNo,
          mode: data.mode || null,
          vehicleNo: data.vehicleNo ? String(data.vehicleNo).trim() || null : null,
          stockSaleId: data.stockSaleId || null,
          totalNug,
          totalKg,
          basicAmount,
          arrivalExpenses,
          charges: chargesTotal,
          roundOff,
          ...(createdAtDate ? { createdAt: createdAtDate } : {}),
          items: {
            create: normalizedItems.map((item) => ({
              itemId: item.itemId,
              lotNo: item.lotNo,
              nug: item.nug,
              kg: item.kg,
              rate: item.rate,
              per: item.per,
              amount: item.amount,
              stockSaleItemId: item.stockSaleItemId
            }))
          },
          chargeLines: {
            create: normalizedCharges.map((charge) => ({
              otherChargesId: charge.otherChargesId,
              arrivalChargeId: charge.arrivalChargeId,
              onValue: charge.onValue,
              per: charge.per,
              atRate: charge.atRate,
              no: charge.no,
              plusMinus: charge.plusMinus,
              amount: charge.amount
            }))
          }
        }
      })

      // Phase 18.7: Record ledger entry for seller bill (debit to supplier)
      const netAmount = basicAmount + arrivalExpenses + chargesTotal + roundOff
      const itemsSummary = normalizedItems.length > 0
        ? `${normalizedItems.length} item(s), ${totalNug}N/${totalKg}Kg`
        : 'Seller Bill'
      await this.accountLedgerService.recordSellerBill(
        companyId,
        data.accountId,
        voucherNo,
        netAmount,
        itemsSummary
      )

      return this.getSellerBillById(created.id)
    } catch (error: any) {
      console.error('[SellerBillService] Error creating seller bill:', error)
      if (error?.code === 'P2002') {
        return { success: false, error: 'Duplicate voucher number for this company' }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create seller bill'
      }
    }
  }

  async updateSellerBill(id: string, data: any): Promise<ApiResponse<SellerBillListItem>> {
    try {
      const prisma = await this.databaseService.getClient()
      const existing = await prisma.sellerBill.findUnique({ where: { id } })

      if (!existing) {
        return { success: false, error: 'Seller bill not found' }
      }

      // Phase 18.7: Reverse old ledger entry before update
      await this.accountLedgerService.reverseSellerBill(
        existing.companyId,
        existing.accountId,
        existing.vchNo
      )

      const voucherNo = data?.vchNo || data?.voucherNo || existing.vchNo
      const items = Array.isArray(data?.items) ? data.items : []
      const chargeLines = Array.isArray(data?.chargeLines) ? data.chargeLines : []
      const createdAtDate = data?.billDate ? new Date(`${data.billDate}T00:00:00`) : null

      const normalizedItems = items.map((item: any) => {
        const per = (item.per || 'nug').toLowerCase()
        const nug = Number(item.nug) || 0
        const kg = Number(item.kg) || 0
        const rate = Number(item.rate) || 0
        const amount = this.resolveItemAmount({ ...item, per, nug, kg, rate })

        return {
          itemId: item.itemId,
          lotNo: item.lotNo || item.lotNoVariety || null,
          nug,
          kg,
          rate,
          per,
          amount,
          stockSaleItemId: item.stockSaleItemId || null
        }
      })

      const normalizedCharges = chargeLines.map((charge: any) => ({
        otherChargesId: charge.otherChargesId,
        arrivalChargeId:
          typeof charge.arrivalChargeId === 'string' && charge.arrivalChargeId.trim().length
            ? charge.arrivalChargeId.trim()
            : null,
        onValue: charge.onValue !== undefined && charge.onValue !== null ? Number(charge.onValue) : null,
        per: charge.per !== undefined && charge.per !== null ? Number(charge.per) : null,
        atRate: charge.atRate !== undefined && charge.atRate !== null ? Number(charge.atRate) : null,
        no: charge.no !== undefined && charge.no !== null ? Number(charge.no) : null,
        plusMinus: charge.plusMinus === '-' ? '-' : '+',
        amount: Number(charge.amount) || 0
      }))

      const totalNug = normalizedItems.reduce((sum, item) => sum + item.nug, 0)
      const totalKg = normalizedItems.reduce((sum, item) => sum + item.kg, 0)
      const basicAmount = normalizedItems.reduce((sum, item) => sum + item.amount, 0)
      const chargesTotal = this.calculateChargesNet(normalizedCharges)
      const arrivalExpenses = Number(data?.arrivalExpenses) || 0
      const roundOff = Number(data?.roundOff) || 0

      await prisma.sellerBill.update({
        where: { id },
        data: {
          accountId: data.accountId,
          vchNo: voucherNo,
          mode: data.mode || null,
          vehicleNo: data.vehicleNo ? String(data.vehicleNo).trim() || null : null,
          stockSaleId: data.stockSaleId || null,
          totalNug,
          totalKg,
          basicAmount,
          arrivalExpenses,
          charges: chargesTotal,
          roundOff,
          ...(createdAtDate ? { createdAt: createdAtDate } : {}),
          items: {
            deleteMany: {},
            create: normalizedItems.map((item) => ({
              itemId: item.itemId,
              lotNo: item.lotNo,
              nug: item.nug,
              kg: item.kg,
              rate: item.rate,
              per: item.per,
              amount: item.amount,
              stockSaleItemId: item.stockSaleItemId
            }))
          },
          chargeLines: {
            deleteMany: {},
            create: normalizedCharges.map((charge) => ({
              otherChargesId: charge.otherChargesId,
              arrivalChargeId: charge.arrivalChargeId,
              onValue: charge.onValue,
              per: charge.per,
              atRate: charge.atRate,
              no: charge.no,
              plusMinus: charge.plusMinus,
              amount: charge.amount
            }))
          }
        }
      })

      // Phase 18.7: Record new ledger entry after update
      const netAmount = basicAmount + arrivalExpenses + chargesTotal + roundOff
      const itemsSummary = normalizedItems.length > 0
        ? `${normalizedItems.length} item(s), ${totalNug}N/${totalKg}Kg`
        : 'Seller Bill'
      await this.accountLedgerService.recordSellerBill(
        existing.companyId,
        data.accountId,
        voucherNo,
        netAmount,
        itemsSummary
      )

      return this.getSellerBillById(id)
    } catch (error: any) {
      console.error('[SellerBillService] Error updating seller bill:', error)
      if (error?.code === 'P2002') {
        return { success: false, error: 'Duplicate voucher number for this company' }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update seller bill'
      }
    }
  }

  async deleteSellerBill(id: string): Promise<ApiResponse<void>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get existing to reverse ledger entry
      const existing = await prisma.sellerBill.findUnique({ where: { id } })
      if (!existing) {
        return { success: false, error: 'Seller bill not found' }
      }

      // Phase 18.7: Reverse ledger entry before deletion
      await this.accountLedgerService.reverseSellerBill(
        existing.companyId,
        existing.accountId,
        existing.vchNo
      )

      await prisma.sellerBill.delete({ where: { id } })
      return { success: true }
    } catch (error) {
      console.error('[SellerBillService] Error deleting seller bill:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete seller bill'
      }
    }
  }

  async listVehicles(companyId: string): Promise<ApiResponse<string[]>> {
    try {
      const prisma = await this.databaseService.getClient()
      const vehicles = await prisma.sellerBill.findMany({
        where: {
          companyId,
          vehicleNo: { not: null }
        },
        distinct: ['vehicleNo'],
        select: { vehicleNo: true },
        orderBy: {
          vehicleNo: 'asc'
        }
      })

      const data = vehicles
        .map((record) => record.vehicleNo)
        .filter((value): value is string => Boolean(value && value.trim()))

      return { success: true, data }
    } catch (error) {
      console.error('[SellerBillService] Error listing vehicles:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load vehicles'
      }
    }
  }

  async listEligibleSuppliers(companyId: string): Promise<ApiResponse<Array<{ id: string; name: string }>>> {
    try {
      const prisma = await this.databaseService.getClient()
      const stockSales = await prisma.stockSale.findMany({
        where: { companyId },
        select: {
          items: {
            select: { supplierId: true }
          }
        }
      })

      const supplierIds = new Set<string>()
      for (const sale of stockSales) {
        for (const item of sale.items) {
          const id = typeof item.supplierId === 'string' ? item.supplierId.trim() : ''
          if (id) {
            supplierIds.add(id)
          }
        }
      }

      if (supplierIds.size === 0) {
        return { success: true, data: [] }
      }

      const supplierIdList = Array.from(supplierIds)

      const accounts = await prisma.account.findMany({
        where: {
          companyId,
          id: { in: supplierIdList }
        },
        select: {
          id: true,
          accountName: true
        }
      })

      const accountMap = new Map(accounts.map((account) => [account.id, account.accountName]))

      const arrivalRecords = await prisma.arrival.findMany({
        where: {
          companyId,
          partyId: { in: supplierIdList }
        },
        select: {
          partyId: true,
          arrivalType: {
            select: {
              purchaseType: true
            }
          }
        }
      })

      const arrivalTypeMap = new Map<string, { hasEntry: boolean; hasPartyStock: boolean }>()
      arrivalRecords.forEach((record) => {
        const key = record.partyId
        if (!key) return
        const current = arrivalTypeMap.get(key) || { hasEntry: false, hasPartyStock: false }
        current.hasEntry = true
        if (record.arrivalType?.purchaseType?.toLowerCase() !== 'selfpurchase') {
          current.hasPartyStock = true
        }
        arrivalTypeMap.set(key, current)
      })

      const filteredSupplierIds = supplierIdList.filter((id) => {
        const arrivalInfo = arrivalTypeMap.get(id)
        if (!arrivalInfo) {
          return true
        }
        return arrivalInfo.hasPartyStock
      })

      if (filteredSupplierIds.length === 0) {
        return { success: true, data: [] }
      }

      const missingIds = filteredSupplierIds.filter((id) => !accountMap.has(id))

      if (missingIds.length) {
        const fallbackRecords = await prisma.stockSaleItem.findMany({
          where: {
            supplierId: { in: missingIds },
            stockSale: { companyId }
          },
          distinct: ['supplierId'],
          select: {
            supplierId: true,
            supplierName: true
          }
        })

        fallbackRecords.forEach((record) => {
          if (!record.supplierId) return
          const id = record.supplierId.trim()
          if (!id || accountMap.has(id)) return
          const label = record.supplierName?.trim() || 'Unknown supplier'
          accountMap.set(id, label)
        })
      }

      const data = filteredSupplierIds
        .map((id) => ({ id, name: accountMap.get(id) || 'Unknown supplier' }))
        .filter((supplier) => supplier.name.trim().toLowerCase() !== MALL_KHATA_ACCOUNT_NAME_LOWER)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

      return { success: true, data }
    } catch (error) {
      console.error('[SellerBillService] Error listing eligible suppliers:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load suppliers with sold stock'
      }
    }
  }

  async listVehiclesBySupplier(companyId: string, supplierId: string): Promise<ApiResponse<string[]>> {
    try {
      if (!supplierId?.trim()) {
        return { success: true, data: [] }
      }

      const prisma = await this.databaseService.getClient()
      const arrivals = await prisma.arrival.findMany({
        where: {
          companyId,
          partyId: supplierId
        },
        select: {
          id: true,
          vehicleChallanNo: true,
          challanNo: true,
          arrivalType: {
            select: {
              purchaseType: true
            }
          }
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
      })

      const normalizeRef = (value?: string | null) => value?.trim() || ''
      const normalizeLot = (value?: string | null) => value?.trim().toLowerCase() || ''

      const referenceMap = new Map<string, { value: string; arrivalIds: Set<string> }>()
      const arrivalIdsSet = new Set<string>()

      for (const arrival of arrivals) {
        const purchaseType = arrival.arrivalType?.purchaseType?.toLowerCase()
        if (purchaseType === 'selfpurchase') {
          continue
        }

        const references = [normalizeRef(arrival.vehicleChallanNo), normalizeRef(arrival.challanNo)].filter(
          Boolean
        ) as string[]

        if (!references.length) {
          continue
        }

        arrivalIdsSet.add(arrival.id)

        for (const reference of references) {
          const key = reference.toLowerCase()
          if (!referenceMap.has(key)) {
            referenceMap.set(key, { value: reference, arrivalIds: new Set([arrival.id]) })
          } else {
            referenceMap.get(key)!.arrivalIds.add(arrival.id)
          }
        }
      }

      if (!referenceMap.size) {
        return { success: true, data: [] }
      }

      const arrivalIds = Array.from(arrivalIdsSet)

      const arrivalItems = arrivalIds.length
        ? await prisma.arrivalItem.findMany({
            where: { arrivalId: { in: arrivalIds } },
            select: { arrivalId: true, itemId: true, lotNoVariety: true }
          })
        : []

      const arrivalLotMap = new Map<string, Set<string>>()
      const validLotKeys = new Set<string>()

      for (const item of arrivalItems) {
        const key = `${item.itemId}::${normalizeLot(item.lotNoVariety)}`
        let lotSet = arrivalLotMap.get(item.arrivalId)
        if (!lotSet) {
          lotSet = new Set<string>()
          arrivalLotMap.set(item.arrivalId, lotSet)
        }
        lotSet.add(key)
        validLotKeys.add(key)
      }

      const arrivalCharges = arrivalIds.length
        ? await prisma.arrivalCharges.findMany({
            where: { arrivalId: { in: arrivalIds } },
            select: {
              arrivalId: true,
              sellerBillCharge: {
                select: { id: true }
              }
            }
          })
        : []

      const arrivalIdsWithPendingCharges = new Set<string>()
      for (const charge of arrivalCharges) {
        if (!charge.sellerBillCharge) {
          arrivalIdsWithPendingCharges.add(charge.arrivalId)
        }
      }

      let pendingLotKeys = new Set<string>()
      if (validLotKeys.size) {
        const saleItems = await prisma.stockSaleItem.findMany({
          where: {
            supplierId,
            stockSale: { companyId }
          },
          select: {
            id: true,
            itemId: true,
            lotNoVariety: true
          }
        })

        const saleItemIds = saleItems.map((item) => item.id)
        let billedSaleItemIds = new Set<string>()
        if (saleItemIds.length) {
          const billedItems = await prisma.sellerBillItem.findMany({
            where: {
              stockSaleItemId: { in: saleItemIds }
            },
            select: { stockSaleItemId: true }
          })

          billedSaleItemIds = new Set(
            billedItems
              .map((item) => item.stockSaleItemId)
              .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          )
        }

        pendingLotKeys = new Set<string>()
        for (const saleItem of saleItems) {
          const key = `${saleItem.itemId}::${normalizeLot(saleItem.lotNoVariety)}`
          if (!validLotKeys.has(key)) {
            continue
          }
          if (billedSaleItemIds.has(saleItem.id)) {
            continue
          }
          pendingLotKeys.add(key)
        }
      }

      const arrivalIdsWithPendingItems = new Set<string>()
      for (const [arrivalId, lotKeys] of arrivalLotMap.entries()) {
        for (const lotKey of lotKeys) {
          if (pendingLotKeys.has(lotKey)) {
            arrivalIdsWithPendingItems.add(arrivalId)
            break
          }
        }
      }

      const data: string[] = []
      for (const entry of referenceMap.values()) {
        const hasPending = Array.from(entry.arrivalIds).some(
          (arrivalId) =>
            arrivalIdsWithPendingCharges.has(arrivalId) || arrivalIdsWithPendingItems.has(arrivalId)
        )
        if (hasPending) {
          data.push(entry.value)
        }
      }

      return { success: true, data }
    } catch (error) {
      console.error('[SellerBillService] Error listing vehicles by supplier:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load supplier vehicles'
      }
    }
  }

  async listPendingSellerBills(
    companyId: string,
    filters?: {
      startDate?: string
      endDate?: string
      supplierId?: string
      storeId?: string | null
      status?: 'sold' | 'unsold'
      search?: string
    }
  ): Promise<ApiResponse<PendingSellerBillResponse>> {
    try {
      const prisma = await this.databaseService.getClient()

      let mallKhataAccount = await prisma.account.findFirst({
        where: {
          companyId,
          accountName: MALL_KHATA_ACCOUNT_NAME
        },
        select: {
          id: true,
          accountName: true
        }
      })

      if (!mallKhataAccount) {
        const potentialAccounts = await prisma.account.findMany({
          where: { companyId },
          select: { id: true, accountName: true }
        })
        mallKhataAccount = potentialAccounts.find(
          (account) => (account.accountName || '').trim().toLowerCase() === MALL_KHATA_ACCOUNT_NAME_LOWER
        ) || null
      }

      const mallKhataAccountId = mallKhataAccount?.id || null
      const isMallKhataFilter = Boolean(
        filters?.supplierId && mallKhataAccountId && filters.supplierId === mallKhataAccountId
      )

      const normalizeLot = (value?: string | null) => value?.trim().toLowerCase() || ''
      const normalizeStoreId = (value?: string | null) => value?.trim() || '__NO_STORE__'
      const displayQuantity = (nugValue: number, kgValue: number) => {
        if (Number.isFinite(nugValue) && nugValue !== 0) {
          return nugValue
        }
        if (Number.isFinite(kgValue) && kgValue !== 0) {
          return kgValue
        }
        return 0
      }

      const arrivalWhere: any = { companyId }
      if (filters?.startDate || filters?.endDate) {
        arrivalWhere.date = {}
        if (filters.startDate) {
          arrivalWhere.date.gte = filters.startDate
        }
        if (filters.endDate) {
          arrivalWhere.date.lte = filters.endDate
        }
      }
      if (filters?.supplierId && !isMallKhataFilter) {
        arrivalWhere.partyId = filters.supplierId
      }
      if (isMallKhataFilter) {
        arrivalWhere.arrivalType = {
          ...(arrivalWhere.arrivalType || {}),
          purchaseType: 'selfPurchase'
        }
      }
      if (filters?.storeId !== undefined) {
        arrivalWhere.storeId = filters.storeId
      }

      const arrivals = await prisma.arrival.findMany({
        where: arrivalWhere,
        include: {
          items: true,
          arrivalType: {
            select: {
              purchaseType: true
            }
          },
          store: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
      })

      if (!arrivals.length) {
        return {
          success: true,
          data: {
            rows: [],
            totals: {
              totalRecords: 0,
              totalSoldNug: 0,
              totalSoldKg: 0,
              totalUnsoldNug: 0,
              totalUnsoldKg: 0,
              totalWattakAmount: 0
            }
          }
        }
      }

      const eligibleArrivals = arrivals.filter((arrival) => {
        const purchaseType = arrival.arrivalType?.purchaseType?.toLowerCase() || 'partystock'
        return purchaseType !== 'selfpurchase'
      })

      if (!eligibleArrivals.length) {
        return {
          success: true,
          data: {
            rows: [],
            totals: {
              totalRecords: 0,
              totalSoldNug: 0,
              totalSoldKg: 0,
              totalUnsoldNug: 0,
              totalUnsoldKg: 0,
              totalWattakAmount: 0
            }
          }
        }
      }

      const supplierIds = Array.from(
        new Set(
          eligibleArrivals
            .map((arrival) => arrival.partyId)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        )
      )

      const accounts = supplierIds.length
        ? await prisma.account.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, accountName: true }
          })
        : []

      const accountMap = new Map(accounts.map((account) => [account.id, account.accountName || '']))

      const lotBuckets = new Map<
        string,
        Array<{ arrivalId: string; remainingDisplayQty: number; remainingKg: number }>
      >()
      const arrivalAccumulator = new Map<string, ArrivalAccumulator>()

      const orderedArrivals = [...eligibleArrivals].sort((a, b) => {
        const dateCompare = (a.date || '').localeCompare(b.date || '')
        if (dateCompare !== 0) return dateCompare
        return (a.voucherNo || '').localeCompare(b.voucherNo || '')
      })

      for (const arrival of orderedArrivals) {
        const supplierId = arrival.partyId
        if (!supplierId?.trim()) {
          continue
        }

        let totalNugReceived = 0
        let totalKgReceived = 0
        const storeKey = normalizeStoreId(arrival.storeId)

        for (const item of arrival.items) {
          const nug = Number(item.nug) || 0
          const kg = Number(item.kg) || 0
          totalNugReceived += displayQuantity(nug, kg)
          totalKgReceived += kg

          const lotKey = `${supplierId}::${storeKey}::${item.itemId}::${normalizeLot(item.lotNoVariety)}`
          if (!lotBuckets.has(lotKey)) {
            lotBuckets.set(lotKey, [])
          }
          lotBuckets.get(lotKey)!.push({
            arrivalId: arrival.id,
            remainingDisplayQty: Number(displayQuantity(nug, kg).toFixed(2)),
            remainingKg: Number(kg.toFixed(2))
          })
        }

        arrivalAccumulator.set(arrival.id, {
          arrivalId: arrival.id,
          date: arrival.date,
          voucherNo: arrival.voucherNo,
          vehicleNo: arrival.vehicleChallanNo?.trim() || null,
          challanNo: arrival.challanNo?.trim() || null,
          supplierId,
          supplierName: accountMap.get(supplierId) || 'Unknown Supplier',
          storeId: arrival.storeId || null,
          storeName: arrival.store?.name?.trim() || null,
          nugReceived: Number(totalNugReceived.toFixed(2)),
          kgReceived: Number(totalKgReceived.toFixed(2)),
          nugSoldTotal: 0,       // ALL sold (billed + unbilled)
          kgSoldTotal: 0,
          nugSoldUnbilled: 0,    // Only unbilled sold
          kgSoldUnbilled: 0,
          wattakAmount: 0        // Only UNBILLED sold amount
        })
      }

      if (arrivalAccumulator.size === 0) {
        return {
          success: true,
          data: {
            rows: [],
            totals: {
              totalRecords: 0,
              totalSoldNug: 0,
              totalSoldKg: 0,
              totalUnsoldNug: 0,
              totalUnsoldKg: 0,
              totalWattakAmount: 0
            }
          }
        }
      }

      // Fetch ALL stock sale items (with billing status) for accurate sold/pending calculations
      const allStockSaleItems = supplierIds.length
        ? await prisma.stockSaleItem.findMany({
            where: {
              supplierId: { in: supplierIds },
              stockSale: { companyId }
            },
            select: {
              id: true,
              supplierId: true,
              itemId: true,
              lotNoVariety: true,
              nug: true,
              kg: true,
              per: true,
              supplierRate: true,
              storeId: true,
              sellerBillItems: { select: { id: true } },
              stockSale: {
                select: {
                  sellerBills: { select: { id: true } }
                }
              }
            }
          })
        : []

      console.log('[DEBUG] All stock sale items:', allStockSaleItems.length)

      // Create a copy of lotBuckets for tracking total sold (need fresh buckets for each pass)
      const lotBucketsForTotalSold = new Map<
        string,
        Array<{ arrivalId: string; remainingDisplayQty: number; remainingKg: number }>
      >()
      for (const [key, buckets] of lotBuckets.entries()) {
        lotBucketsForTotalSold.set(key, buckets.map(b => ({ ...b })))
      }

      // First pass: Allocate ALL stock sale items to calculate total sold per arrival
      for (const item of allStockSaleItems) {
        const supplierId = item.supplierId?.trim()
        if (!supplierId) continue

        const storeKey = normalizeStoreId(item.storeId)
        const lotKey = `${supplierId}::${storeKey}::${item.itemId}::${normalizeLot(item.lotNoVariety)}`
        const buckets = lotBucketsForTotalSold.get(lotKey)
        if (!buckets?.length) continue

        let remainingDisplayQty = displayQuantity(Number(item.nug) || 0, Number(item.kg) || 0)
        let remainingKg = Number(item.kg) || 0

        for (const bucket of buckets) {
          if (remainingDisplayQty <= 0 && remainingKg <= 0) break
          if (bucket.remainingDisplayQty <= 0 && bucket.remainingKg <= 0) continue

          const accumulator = arrivalAccumulator.get(bucket.arrivalId)
          if (!accumulator) continue

          let takeDisplay = 0
          let takeKg = 0

          if (remainingDisplayQty > 0 && bucket.remainingDisplayQty > 0) {
            takeDisplay = Number(Math.min(remainingDisplayQty, bucket.remainingDisplayQty).toFixed(2))
            remainingDisplayQty = Number((remainingDisplayQty - takeDisplay).toFixed(2))
            bucket.remainingDisplayQty = Number((bucket.remainingDisplayQty - takeDisplay).toFixed(2))
            accumulator.nugSoldTotal = Number((accumulator.nugSoldTotal + takeDisplay).toFixed(2))
          }

          if (remainingKg > 0 && bucket.remainingKg > 0) {
            takeKg = Number(Math.min(remainingKg, bucket.remainingKg).toFixed(2))
            remainingKg = Number((remainingKg - takeKg).toFixed(2))
            bucket.remainingKg = Number((bucket.remainingKg - takeKg).toFixed(2))
            accumulator.kgSoldTotal = Number((accumulator.kgSoldTotal + takeKg).toFixed(2))
          }
        }
      }

      // Second pass: Calculate unbilled sold and wattak amount from UNBILLED stock sale items only
      const unbilledStockSaleItems = allStockSaleItems.filter(item => {
        const hasBillItems = item.sellerBillItems.length > 0
        const saleHasBills = (item.stockSale?.sellerBills?.length || 0) > 0
        return !hasBillItems && !saleHasBills
      })

      console.log('[DEBUG] Unbilled stock sale items:', unbilledStockSaleItems.length)

      // Reset lotBuckets for unbilled calculation (use original fresh copy)
      const lotBucketsForUnbilled = new Map<
        string,
        Array<{ arrivalId: string; remainingDisplayQty: number; remainingKg: number }>
      >()
      for (const arrival of orderedArrivals) {
        const supplierId = arrival.partyId
        if (!supplierId?.trim()) continue
        const storeKey = normalizeStoreId(arrival.storeId)
        
        for (const item of arrival.items) {
          const nug = Number(item.nug) || 0
          const kg = Number(item.kg) || 0
          const lotKey = `${supplierId}::${storeKey}::${item.itemId}::${normalizeLot(item.lotNoVariety)}`
          if (!lotBucketsForUnbilled.has(lotKey)) {
            lotBucketsForUnbilled.set(lotKey, [])
          }
          lotBucketsForUnbilled.get(lotKey)!.push({
            arrivalId: arrival.id,
            remainingDisplayQty: Number(displayQuantity(nug, kg).toFixed(2)),
            remainingKg: Number(kg.toFixed(2))
          })
        }
      }

      for (const item of unbilledStockSaleItems) {
        const supplierId = item.supplierId?.trim()
        if (!supplierId) continue

        const storeKey = normalizeStoreId(item.storeId)
        const lotKey = `${supplierId}::${storeKey}::${item.itemId}::${normalizeLot(item.lotNoVariety)}`
        const buckets = lotBucketsForUnbilled.get(lotKey)
        if (!buckets?.length) continue

        let remainingDisplayQty = displayQuantity(Number(item.nug) || 0, Number(item.kg) || 0)
        let remainingKg = Number(item.kg) || 0
        const per = (item.per || 'nug').toLowerCase()
        const rate = Number(item.supplierRate) || 0

        for (const bucket of buckets) {
          if (remainingDisplayQty <= 0 && remainingKg <= 0) break
          if (bucket.remainingDisplayQty <= 0 && bucket.remainingKg <= 0) continue

          const accumulator = arrivalAccumulator.get(bucket.arrivalId)
          if (!accumulator) continue

          let takeDisplay = 0
          let takeKg = 0

          if (remainingDisplayQty > 0 && bucket.remainingDisplayQty > 0) {
            takeDisplay = Number(Math.min(remainingDisplayQty, bucket.remainingDisplayQty).toFixed(2))
            remainingDisplayQty = Number((remainingDisplayQty - takeDisplay).toFixed(2))
            bucket.remainingDisplayQty = Number((bucket.remainingDisplayQty - takeDisplay).toFixed(2))
            accumulator.nugSoldUnbilled = Number((accumulator.nugSoldUnbilled + takeDisplay).toFixed(2))
          }

          if (remainingKg > 0 && bucket.remainingKg > 0) {
            takeKg = Number(Math.min(remainingKg, bucket.remainingKg).toFixed(2))
            remainingKg = Number((remainingKg - takeKg).toFixed(2))
            bucket.remainingKg = Number((bucket.remainingKg - takeKg).toFixed(2))
            accumulator.kgSoldUnbilled = Number((accumulator.kgSoldUnbilled + takeKg).toFixed(2))
          }

          const quantityForAmount = per === 'kg' ? takeKg : takeDisplay
          if (quantityForAmount > 0 && rate !== 0) {
            accumulator.wattakAmount = Number(
              (accumulator.wattakAmount + quantityForAmount * rate).toFixed(2)
            )
          }
        }
      }

      // Check for unbilled arrival charges per arrival
      const arrivalIds = Array.from(arrivalAccumulator.keys())
      const arrivalCharges = arrivalIds.length
        ? await prisma.arrivalCharges.findMany({
            where: { arrivalId: { in: arrivalIds } },
            select: {
              arrivalId: true,
              sellerBillCharge: { select: { id: true } }
            }
          })
        : []

      console.log('[DEBUG] arrivalCharges count:', arrivalCharges.length)
      for (const charge of arrivalCharges) {
        console.log('[DEBUG] Charge for arrival:', charge.arrivalId, 'isBilled:', !!charge.sellerBillCharge)
      }

      const arrivalsWithPendingCharges = new Set<string>()
      for (const charge of arrivalCharges) {
        if (!charge.sellerBillCharge) {
          arrivalsWithPendingCharges.add(charge.arrivalId)
        }
      }

      // Create separate rows for SOLD (unbilled) and UNSOLD items
      let rows: PendingSellerBillRow[] = []
      for (const acc of arrivalAccumulator.values()) {
        // Round to 2 decimals and use threshold to avoid floating point issues
        const unsoldNug = Math.round(Math.max(acc.nugReceived - acc.nugSoldTotal, 0) * 100) / 100
        const unsoldKg = Math.round(Math.max(acc.kgReceived - acc.kgSoldTotal, 0) * 100) / 100
        const hasUnbilledCharges = arrivalsWithPendingCharges.has(acc.arrivalId)

        console.log('[DEBUG] Processing:', acc.voucherNo,
          'received:', acc.nugReceived, '/', acc.kgReceived,
          'soldTotal:', acc.nugSoldTotal, '/', acc.kgSoldTotal,
          'soldUnbilled:', acc.nugSoldUnbilled, '/', acc.kgSoldUnbilled,
          'unsold:', unsoldNug, '/', unsoldKg,
          'wattak:', acc.wattakAmount,
          'hasUnbilledCharges:', hasUnbilledCharges)

        // Row for SOLD items (unbilled) - only if there are unbilled sold items or charges
        if (acc.nugSoldUnbilled > 0.001 || acc.kgSoldUnbilled > 0.001 || hasUnbilledCharges) {
          rows.push({
            arrivalId: acc.arrivalId,
            date: acc.date,
            voucherNo: acc.voucherNo,
            vehicleNo: acc.vehicleNo,
            challanNo: acc.challanNo,
            supplierId: acc.supplierId,
            supplierName: acc.supplierName,
            storeId: acc.storeId,
            storeName: acc.storeName,
            status: 'sold',
            nug: acc.nugSoldUnbilled,
            kg: acc.kgSoldUnbilled,
            wattakAmount: acc.wattakAmount
          })
        }

        // Row for UNSOLD items - only if there's remaining stock
        // Check only nug (primary unit) since kg may vary due to weight differences at sale time
        // In mandi, once all nugs (crates/pieces) are sold, the arrival is considered fully sold
        if (unsoldNug >= 0.01) {
          rows.push({
            arrivalId: acc.arrivalId,
            date: acc.date,
            voucherNo: acc.voucherNo,
            vehicleNo: acc.vehicleNo,
            challanNo: acc.challanNo,
            supplierId: acc.supplierId,
            supplierName: acc.supplierName,
            storeId: acc.storeId,
            storeName: acc.storeName,
            status: 'unsold',
            nug: unsoldNug,
            kg: unsoldKg,
            wattakAmount: 0  // No wattak for unsold items
          })
        }
      }

      console.log('[DEBUG] Final rows count:', rows.length)

      if (!rows.length) {
        return {
          success: true,
          data: {
            rows: [],
            totals: {
              totalRecords: 0,
              totalSoldNug: 0,
              totalSoldKg: 0,
              totalUnsoldNug: 0,
              totalUnsoldKg: 0,
              totalWattakAmount: 0
            }
          }
        }
      }

      if (filters?.status) {
        rows = rows.filter((row) => row.status === filters.status)
      }

      if (filters?.search?.trim()) {
        const search = filters.search.trim().toLowerCase()
        rows = rows.filter((row) => {
          const voucher = row.voucherNo?.toLowerCase() || ''
          const vehicle = row.vehicleNo?.toLowerCase() || ''
          const challan = row.challanNo?.toLowerCase() || ''
          const supplierName = row.supplierName.toLowerCase()
          const storeName = (row.storeName || '').toLowerCase()
          return (
            voucher.includes(search) ||
            vehicle.includes(search) ||
            challan.includes(search) ||
            supplierName.includes(search) ||
            storeName.includes(search)
          )
        })
      }

      // Sort by date desc, then voucher desc, then status (sold before unsold)
      rows.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) return dateCompare
        const voucherCompare = b.voucherNo.localeCompare(a.voucherNo)
        if (voucherCompare !== 0) return voucherCompare
        // sold rows come before unsold rows
        if (a.status === 'sold' && b.status === 'unsold') return -1
        if (a.status === 'unsold' && b.status === 'sold') return 1
        return 0
      })

      const totals = rows.reduce<PendingSellerBillTotals>(
        (acc, row) => {
          acc.totalRecords += 1
          if (row.status === 'sold') {
            acc.totalSoldNug += row.nug
            acc.totalSoldKg += row.kg
            acc.totalWattakAmount += row.wattakAmount
          } else {
            acc.totalUnsoldNug += row.nug
            acc.totalUnsoldKg += row.kg
          }
          return acc
        },
        {
          totalRecords: 0,
          totalSoldNug: 0,
          totalSoldKg: 0,
          totalUnsoldNug: 0,
          totalUnsoldKg: 0,
          totalWattakAmount: 0
        }
      )

      totals.totalSoldNug = Number(totals.totalSoldNug.toFixed(2))
      totals.totalSoldKg = Number(totals.totalSoldKg.toFixed(2))
      totals.totalUnsoldNug = Number(totals.totalUnsoldNug.toFixed(2))
      totals.totalUnsoldKg = Number(totals.totalUnsoldKg.toFixed(2))
      totals.totalWattakAmount = Number(totals.totalWattakAmount.toFixed(2))

      return {
        success: true,
        data: {
          rows,
          totals
        }
      }
    } catch (error) {
      console.error('[SellerBillService] Error listing pending seller bills:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to load pending seller bills'
      }
    }
  }

  async getProfitabilityReport(
    companyId: string,
    filters?: ProfitabilityReportFilters
  ): Promise<ApiResponse<ProfitabilityReportResponse>> {
    try {
      const prisma = await this.databaseService.getClient()

      let mallKhataAccount = await prisma.account.findFirst({
        where: {
          companyId,
          accountName: MALL_KHATA_ACCOUNT_NAME
        },
        select: {
          id: true,
          accountName: true
        }
      })

      if (!mallKhataAccount) {
        const potentialAccounts = await prisma.account.findMany({
          where: { companyId },
          select: { id: true, accountName: true }
        })
        mallKhataAccount = potentialAccounts.find(
          (account) => (account.accountName || '').trim().toLowerCase() === MALL_KHATA_ACCOUNT_NAME_LOWER
        ) || null
      }

      const mallKhataAccountId = mallKhataAccount?.id || null
      const mallKhataAccountLabel = mallKhataAccount?.accountName?.trim() || MALL_KHATA_ACCOUNT_NAME
      const isMallKhataFilter = Boolean(
        filters?.supplierId && mallKhataAccountId && filters.supplierId === mallKhataAccountId
      )

      const normalizeLot = (value?: string | null) => value?.trim().toLowerCase() || ''
      const normalizeStoreId = (value?: string | null) => value?.trim() || '__NO_STORE__'
      const displayQuantity = (nugValue: number, kgValue: number) => {
        const nug = Number.isFinite(nugValue) ? nugValue : 0
        const kg = Number.isFinite(kgValue) ? kgValue : 0
        if (nug !== 0) {
          return nug
        }
        if (kg !== 0) {
          return kg
        }
        return 0
      }
      const round2 = (value: number) => {
        if (!Number.isFinite(value)) {
          return 0
        }
        const rounded = Math.round(value * 100) / 100
        return Math.abs(rounded) < 0.00001 ? 0 : rounded
      }

      const arrivalWhere: any = { companyId }
      if (filters?.startDate || filters?.endDate) {
        arrivalWhere.date = {}
        if (filters.startDate) {
          arrivalWhere.date.gte = filters.startDate
        }
        if (filters.endDate) {
          arrivalWhere.date.lte = filters.endDate
        }
      }
      if (filters?.supplierId && !isMallKhataFilter) {
        arrivalWhere.partyId = filters.supplierId
      }
      if (isMallKhataFilter) {
        arrivalWhere.arrivalType = {
          ...(arrivalWhere.arrivalType || {}),
          purchaseType: 'selfPurchase'
        }
      }
      if (filters?.storeId !== undefined) {
        arrivalWhere.storeId = filters.storeId
      }

      const arrivals = await prisma.arrival.findMany({
        where: arrivalWhere,
        include: {
          items: true,
          arrivalType: {
            select: {
              purchaseType: true
            }
          },
          store: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }]
      })

      if (!arrivals.length) {
        return {
          success: true,
          data: {
            rows: [],
            totals: {
              totalRecords: 0,
              totalNugReceived: 0,
              totalNugSold: 0,
              totalNugTransferred: 0,
              totalBalanceNug: 0,
              totalKgReceived: 0,
              totalKgSold: 0,
              totalKgTransferred: 0,
              totalActualSaleAmount: 0,
              totalSellerBillAmount: 0,
              totalProfitLossAmount: 0
            }
          }
        }
      }

      const supplierIds = Array.from(
        new Set(
          arrivals
            .map((arrival) => arrival.partyId)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        )
      )

      const accounts = supplierIds.length
        ? await prisma.account.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, accountName: true }
          })
        : []

      const accountMap = new Map(accounts.map((account) => [account.id, account.accountName || '']))

      interface ProfitabilityAccumulator {
        arrivalId: string
        date: string
        voucherNo: string
        vehicleNo: string | null
        challanNo: string | null
        supplierId: string
        supplierName: string
        storeId: string | null
        storeName: string | null
        nugReceived: number
        kgReceived: number
        nugSold: number
        kgSold: number
        nugTransferred: number
        kgTransferred: number
        actualSaleAmount: number
        expectedSellerAmount: number
        billedSellerAmount: number
      }

      interface AllocationBucketEntry {
        arrivalId: string
        remainingDisplayQty: number
        remainingKg: number
      }

      const lotBuckets = new Map<string, AllocationBucketEntry[]>()
      const transferLotBuckets = new Map<string, AllocationBucketEntry[]>()
      const arrivalAccumulator = new Map<string, ProfitabilityAccumulator>()

      for (const arrival of arrivals) {
        const supplierId = arrival.partyId?.trim()
        if (!supplierId) {
          continue
        }

        const purchaseType = arrival.arrivalType?.purchaseType?.toLowerCase() || 'partystock'
        const supplierDisplayName =
          purchaseType === 'selfpurchase'
            ? mallKhataAccountLabel
            : accountMap.get(supplierId) || 'Unknown Supplier'
        const effectiveSupplierId =
          purchaseType === 'selfpurchase' && mallKhataAccountId ? mallKhataAccountId : supplierId

        const storeKey = normalizeStoreId(arrival.storeId)
        let totalNugReceived = 0
        let totalKgReceived = 0

        for (const item of arrival.items) {
          const nug = Number(item.nug) || 0
          const kg = Number(item.kg) || 0
          const displayQty = Number(displayQuantity(nug, kg).toFixed(4))
          totalNugReceived += displayQty
          totalKgReceived += kg

          const lotKey = `${supplierId}::${storeKey}::${item.itemId}::${normalizeLot(item.lotNoVariety)}`
          if (!lotBuckets.has(lotKey)) {
            lotBuckets.set(lotKey, [])
          }
          lotBuckets.get(lotKey)!.push({
            arrivalId: arrival.id,
            remainingDisplayQty: displayQty,
            remainingKg: Number(kg.toFixed(4))
          })

          const transferLotKey = `${item.itemId}::${normalizeLot(item.lotNoVariety)}`
          if (transferLotKey.trim()) {
            if (!transferLotBuckets.has(transferLotKey)) {
              transferLotBuckets.set(transferLotKey, [])
            }
            transferLotBuckets.get(transferLotKey)!.push({
              arrivalId: arrival.id,
              remainingDisplayQty: displayQty,
              remainingKg: Number(kg.toFixed(4))
            })
          }
        }

        arrivalAccumulator.set(arrival.id, {
          arrivalId: arrival.id,
          date: arrival.date,
          voucherNo: arrival.voucherNo,
          vehicleNo: arrival.vehicleChallanNo?.trim() || null,
          challanNo: arrival.challanNo?.trim() || null,
          supplierId: effectiveSupplierId,
          supplierName: supplierDisplayName,
          storeId: arrival.storeId || null,
          storeName: arrival.store?.name?.trim() || null,
          nugReceived: Number(totalNugReceived.toFixed(2)),
          kgReceived: Number(totalKgReceived.toFixed(2)),
          nugSold: 0,
          kgSold: 0,
          nugTransferred: 0,
          kgTransferred: 0,
          actualSaleAmount: 0,
          expectedSellerAmount: 0,
          billedSellerAmount: 0
        })
      }

      if (!arrivalAccumulator.size) {
        return {
          success: true,
          data: {
            rows: [],
            totals: {
              totalRecords: 0,
              totalNugReceived: 0,
              totalNugSold: 0,
              totalNugTransferred: 0,
              totalBalanceNug: 0,
              totalKgReceived: 0,
              totalKgSold: 0,
              totalKgTransferred: 0,
              totalActualSaleAmount: 0,
              totalSellerBillAmount: 0,
              totalProfitLossAmount: 0
            }
          }
        }
      }

      if (transferLotBuckets.size) {
        const stockTransferWhere: Prisma.StockTransferItemWhereInput = {
          stockTransfer: {
            is: {
              companyId
            }
          }
        }

        if (filters?.startDate || filters?.endDate) {
          const createdAtFilter: Prisma.DateTimeFilter = {}
          if (filters.startDate) {
            createdAtFilter.gte = new Date(filters.startDate)
          }
          if (filters.endDate) {
            const endDate = new Date(filters.endDate)
            endDate.setHours(23, 59, 59, 999)
            createdAtFilter.lte = endDate
          }

          stockTransferWhere.stockTransfer = {
            is: {
              companyId,
              createdAt: createdAtFilter
            }
          }
        }

        const stockTransferItems = await prisma.stockTransferItem.findMany({
          where: stockTransferWhere,
          select: {
            id: true,
            itemId: true,
            lotNo: true,
            nug: true,
            kg: true
          }
        })

        for (const transferItem of stockTransferItems) {
          const normalizedLot = normalizeLot(transferItem.lotNo)
          if (!normalizedLot) {
            continue
          }

          const lotKey = `${transferItem.itemId}::${normalizedLot}`
          const buckets = transferLotBuckets.get(lotKey)
          if (!buckets?.length) {
            continue
          }

          let remainingDisplayQty = displayQuantity(Number(transferItem.nug) || 0, Number(transferItem.kg) || 0)
          let remainingKg = Number(transferItem.kg) || 0

          for (const bucket of buckets) {
            if (remainingDisplayQty <= 0 && remainingKg <= 0) {
              break
            }
            if (bucket.remainingDisplayQty <= 0 && bucket.remainingKg <= 0) {
              continue
            }

            const accumulator = arrivalAccumulator.get(bucket.arrivalId)
            if (!accumulator) {
              continue
            }

            let takeDisplay = 0
            let takeKg = 0

            if (remainingDisplayQty > 0 && bucket.remainingDisplayQty > 0) {
              takeDisplay = Number(Math.min(remainingDisplayQty, bucket.remainingDisplayQty).toFixed(4))
              remainingDisplayQty = Number((remainingDisplayQty - takeDisplay).toFixed(4))
              bucket.remainingDisplayQty = Number((bucket.remainingDisplayQty - takeDisplay).toFixed(4))
              accumulator.nugTransferred = Number((accumulator.nugTransferred + takeDisplay).toFixed(4))
            }

            if (remainingKg > 0 && bucket.remainingKg > 0) {
              takeKg = Number(Math.min(remainingKg, bucket.remainingKg).toFixed(4))
              remainingKg = Number((remainingKg - takeKg).toFixed(4))
              bucket.remainingKg = Number((bucket.remainingKg - takeKg).toFixed(4))
              accumulator.kgTransferred = Number((accumulator.kgTransferred + takeKg).toFixed(4))
            }
          }
        }
      }

      interface SaleItemAllocationGroup {
        per: 'nug' | 'kg'
        allocations: Array<{ arrivalId: string; nug: number; kg: number }>
      }

      const saleItemAllocations = new Map<string, SaleItemAllocationGroup>()

      const stockSaleItems = supplierIds.length
        ? await prisma.stockSaleItem.findMany({
            where: {
              supplierId: { in: supplierIds },
              stockSale: { companyId }
            },
            select: {
              id: true,
              supplierId: true,
              itemId: true,
              lotNoVariety: true,
              nug: true,
              kg: true,
              per: true,
              netAmount: true,
              basicAmount: true,
              customerRate: true,
              supplierRate: true,
              storeId: true
            }
          })
        : []

      for (const item of stockSaleItems) {
        const supplierId = item.supplierId?.trim()
        if (!supplierId) {
          continue
        }
        const storeKey = normalizeStoreId(item.storeId)
        const lotKey = `${supplierId}::${storeKey}::${item.itemId}::${normalizeLot(item.lotNoVariety)}`
        const buckets = lotBuckets.get(lotKey)
        if (!buckets?.length) {
          continue
        }

        const per = (item.per || 'nug').toLowerCase() === 'kg' ? 'kg' : 'nug'
        const nugQuantity = Number(item.nug) || 0
        const kgQuantity = Number(item.kg) || 0
        const displayQty = Number(displayQuantity(nugQuantity, kgQuantity).toFixed(4))
        const perQuantity = per === 'kg' ? kgQuantity : nugQuantity
        const effectivePerQuantity = perQuantity || displayQty || 0

        const totalActualSaleAmount = (() => {
          const netAmount = Number(item.netAmount) || 0
          if (netAmount !== 0) {
            return netAmount
          }
          const basicAmount = Number(item.basicAmount) || 0
          if (basicAmount !== 0) {
            return basicAmount
          }
          const rate = Number(item.customerRate) || 0
          if (rate !== 0 && effectivePerQuantity !== 0) {
            return rate * effectivePerQuantity
          }
          return 0
        })()

        const totalSupplierAmount = (() => {
          const rate = Number(item.supplierRate) || 0
          if (rate !== 0 && effectivePerQuantity !== 0) {
            return rate * effectivePerQuantity
          }
          return 0
        })()

        let remainingDisplayQty = displayQty
        let remainingKg = kgQuantity
        let remainingPerQty = effectivePerQuantity
        let remainingActualSale = totalActualSaleAmount
        let remainingSupplierAmount = totalSupplierAmount

        for (const bucket of buckets) {
          if (remainingDisplayQty <= 0 && remainingKg <= 0) {
            break
          }
          if (bucket.remainingDisplayQty <= 0 && bucket.remainingKg <= 0) {
            continue
          }

          const accumulator = arrivalAccumulator.get(bucket.arrivalId)
          if (!accumulator) {
            continue
          }

          let takeDisplay = 0
          let takeKg = 0

          if (remainingDisplayQty > 0 && bucket.remainingDisplayQty > 0) {
            takeDisplay = Number(Math.min(remainingDisplayQty, bucket.remainingDisplayQty).toFixed(4))
            remainingDisplayQty = Number((remainingDisplayQty - takeDisplay).toFixed(4))
            bucket.remainingDisplayQty = Number((bucket.remainingDisplayQty - takeDisplay).toFixed(4))
            accumulator.nugSold += takeDisplay
          }

          if (remainingKg > 0 && bucket.remainingKg > 0) {
            takeKg = Number(Math.min(remainingKg, bucket.remainingKg).toFixed(4))
            remainingKg = Number((remainingKg - takeKg).toFixed(4))
            bucket.remainingKg = Number((bucket.remainingKg - takeKg).toFixed(4))
            accumulator.kgSold += takeKg
          }

          const quantityForPer = per === 'kg' ? takeKg : takeDisplay
          let actualShare = 0
          let supplierShare = 0

          if (effectivePerQuantity > 0 && quantityForPer > 0) {
            if (remainingPerQty <= quantityForPer + 0.0001) {
              actualShare = remainingActualSale
              supplierShare = remainingSupplierAmount
              remainingActualSale = 0
              remainingSupplierAmount = 0
              remainingPerQty = 0
            } else {
              const ratio = quantityForPer / effectivePerQuantity
              actualShare = round2(totalActualSaleAmount * ratio)
              supplierShare = round2(totalSupplierAmount * ratio)
              remainingActualSale = round2(remainingActualSale - actualShare)
              remainingSupplierAmount = round2(remainingSupplierAmount - supplierShare)
              remainingPerQty = Number((remainingPerQty - quantityForPer).toFixed(4))
            }
          }

          accumulator.actualSaleAmount = round2(accumulator.actualSaleAmount + actualShare)
          accumulator.expectedSellerAmount = round2(accumulator.expectedSellerAmount + supplierShare)

          if (!saleItemAllocations.has(item.id)) {
            saleItemAllocations.set(item.id, {
              per,
              allocations: []
            })
          }
          saleItemAllocations.get(item.id)!.allocations.push({
            arrivalId: bucket.arrivalId,
            nug: takeDisplay,
            kg: takeKg
          })
        }
      }

      if (saleItemAllocations.size) {
        const sellerBillItems = await prisma.sellerBillItem.findMany({
          where: {
            sellerBill: {
              companyId,
              ...(supplierIds.length ? { accountId: { in: supplierIds } } : {})
            }
          },
          select: {
            stockSaleItemId: true,
            amount: true,
            per: true,
            nug: true,
            kg: true
          }
        })

        for (const billItem of sellerBillItems) {
          const stockSaleItemId = billItem.stockSaleItemId
          if (!stockSaleItemId) {
            continue
          }
          const allocation = saleItemAllocations.get(stockSaleItemId)
          if (!allocation || !allocation.allocations.length) {
            continue
          }

          const per = (billItem.per || allocation.per).toLowerCase() === 'kg' ? 'kg' : 'nug'
          const totalQuantity = allocation.allocations.reduce((sum, entry) => {
            const quantity = per === 'kg' ? entry.kg : entry.nug
            return sum + (Number(quantity) || 0)
          }, 0)

          if (totalQuantity <= 0) {
            continue
          }

          let remainingAmount = Number(billItem.amount) || 0
          let remainingQuantity = totalQuantity

          for (const [index, entry] of allocation.allocations.entries()) {
            const quantity = per === 'kg' ? entry.kg : entry.nug
            if (!quantity) {
              continue
            }
            const accumulator = arrivalAccumulator.get(entry.arrivalId)
            if (!accumulator) {
              continue
            }

            let amountShare = 0
            const qtyNumber = Number(quantity) || 0
            if (index === allocation.allocations.length - 1 || remainingQuantity <= qtyNumber + 0.0001) {
              amountShare = remainingAmount
              remainingAmount = 0
              remainingQuantity = 0
            } else {
              const ratio = qtyNumber / totalQuantity
              amountShare = round2((Number(billItem.amount) || 0) * ratio)
              remainingAmount = round2(remainingAmount - amountShare)
              remainingQuantity = Number((remainingQuantity - qtyNumber).toFixed(4))
            }

            accumulator.billedSellerAmount = round2(accumulator.billedSellerAmount + amountShare)
          }
        }

        const sellerBillCharges = await prisma.sellerBillCharge.findMany({
          where: {
            sellerBill: {
              companyId,
              ...(supplierIds.length ? { accountId: { in: supplierIds } } : {})
            }
          },
          select: {
            amount: true,
            plusMinus: true,
            arrivalCharge: {
              select: {
                arrivalId: true
              }
            }
          }
        })

        for (const charge of sellerBillCharges) {
          const arrivalId = charge.arrivalCharge?.arrivalId
          if (!arrivalId) {
            continue
          }
          const accumulator = arrivalAccumulator.get(arrivalId)
          if (!accumulator) {
            continue
          }
          const amount = Number(charge.amount) || 0
          const signedAmount = charge.plusMinus === '-' ? -amount : amount
          accumulator.billedSellerAmount = round2(accumulator.billedSellerAmount + signedAmount)
        }
      }

      let rows: ProfitabilityReportRow[] = []

      for (const accumulator of arrivalAccumulator.values()) {
        const nugSold = round2(accumulator.nugSold)
        const kgSold = round2(accumulator.kgSold)
        const transferredNug = round2(accumulator.nugTransferred)
        const transferredKg = round2(accumulator.kgTransferred)
        const balanceNug = round2(Math.max(accumulator.nugReceived - nugSold - transferredNug, 0))
        const actualSale = round2(accumulator.actualSaleAmount)
        const expectedSeller = round2(accumulator.expectedSellerAmount)
        const billedSeller = round2(accumulator.billedSellerAmount)
        const sellerBillAmount = billedSeller !== 0 ? billedSeller : expectedSeller
        const profitLoss = round2(actualSale - sellerBillAmount)
        const transferStatus: TransferStatus = transferredNug <= 0.001
          ? 'none'
          : balanceNug <= 0.001
            ? 'full'
            : 'partial'

        rows.push({
          arrivalId: accumulator.arrivalId,
          date: accumulator.date,
          voucherNo: accumulator.voucherNo || '',
          vehicleNo: accumulator.vehicleNo,
          challanNo: accumulator.challanNo,
          supplierId: accumulator.supplierId,
          supplierName: accumulator.supplierName,
          storeId: accumulator.storeId,
          storeName: accumulator.storeName,
          nugReceived: round2(accumulator.nugReceived),
          nugSold,
          nugTransferred: transferredNug,
          balanceNug,
          kgReceived: round2(accumulator.kgReceived),
          kgSold,
          kgTransferred: transferredKg,
          actualSaleAmount: actualSale,
          sellerBillAmount: sellerBillAmount,
          profitLossAmount: profitLoss,
          transferStatus
        })
      }

      if (filters?.supplierId) {
        rows = rows.filter((row) => row.supplierId === filters.supplierId)
      }

      if (filters?.search?.trim()) {
        const search = filters.search.trim().toLowerCase()
        rows = rows.filter((row) => {
          const vehicleCombined = `${row.vehicleNo || ''} ${row.challanNo || ''}`.toLowerCase()
          const storeName = (row.storeName || '').toLowerCase()
          return (
            (row.voucherNo || '').toLowerCase().includes(search) ||
            (row.vehicleNo || '').toLowerCase().includes(search) ||
            (row.challanNo || '').toLowerCase().includes(search) ||
            row.supplierName.toLowerCase().includes(search) ||
            vehicleCombined.includes(search) ||
            storeName.includes(search)
          )
        })
      }

      if (!rows.length) {
        return {
          success: true,
          data: {
            rows: [],
            totals: {
              totalRecords: 0,
              totalNugReceived: 0,
              totalNugSold: 0,
              totalNugTransferred: 0,
              totalBalanceNug: 0,
              totalKgReceived: 0,
              totalKgSold: 0,
              totalKgTransferred: 0,
              totalActualSaleAmount: 0,
              totalSellerBillAmount: 0,
              totalProfitLossAmount: 0
            }
          }
        }
      }

      rows.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) {
          return dateCompare
        }
        return (b.voucherNo || '').localeCompare(a.voucherNo || '')
      })

      const totals = rows.reduce<ProfitabilityReportTotals>(
        (acc, row) => {
          acc.totalRecords += 1
          acc.totalNugReceived += row.nugReceived
          acc.totalNugSold += row.nugSold
          acc.totalNugTransferred += row.nugTransferred
          acc.totalBalanceNug += row.balanceNug
          acc.totalKgReceived += row.kgReceived
          acc.totalKgSold += row.kgSold
          acc.totalKgTransferred += row.kgTransferred
          acc.totalActualSaleAmount += row.actualSaleAmount
          acc.totalSellerBillAmount += row.sellerBillAmount
          acc.totalProfitLossAmount += row.profitLossAmount
          return acc
        },
        {
          totalRecords: 0,
          totalNugReceived: 0,
          totalNugSold: 0,
          totalNugTransferred: 0,
          totalBalanceNug: 0,
          totalKgReceived: 0,
          totalKgSold: 0,
          totalKgTransferred: 0,
          totalActualSaleAmount: 0,
          totalSellerBillAmount: 0,
          totalProfitLossAmount: 0
        }
      )

      return {
        success: true,
        data: {
          rows,
          totals: {
            totalRecords: totals.totalRecords,
            totalNugReceived: round2(totals.totalNugReceived),
            totalNugSold: round2(totals.totalNugSold),
            totalNugTransferred: round2(totals.totalNugTransferred),
            totalBalanceNug: round2(totals.totalBalanceNug),
            totalKgReceived: round2(totals.totalKgReceived),
            totalKgSold: round2(totals.totalKgSold),
            totalKgTransferred: round2(totals.totalKgTransferred),
            totalActualSaleAmount: round2(totals.totalActualSaleAmount),
            totalSellerBillAmount: round2(totals.totalSellerBillAmount),
            totalProfitLossAmount: round2(totals.totalProfitLossAmount)
          }
        }
      }
    } catch (error) {
      console.error('[SellerBillService] Error generating profitability report:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load profitability report'
      }
    }
  }

  async listSoldItems(
    companyId: string,
    params: { supplierId: string; vehicleRef?: string | null; sellerBillId?: string | null }
  ): Promise<ApiResponse<{ items: SellerBillSoldItem[]; arrivalCharges: SellerBillArrivalCharge[] }>> {
    try {
      const prisma = await this.databaseService.getClient()
      const supplierId = params.supplierId?.trim()
      const currentBillId = params.sellerBillId?.trim() || null

      if (!supplierId) {
        return { success: false, error: 'Supplier is required' }
      }

      const vehicleRef = params.vehicleRef?.trim()
      const arrivals = await prisma.arrival.findMany({
        where: {
          companyId,
          partyId: supplierId
        },
        select: {
          id: true,
          vehicleChallanNo: true,
          challanNo: true
        }
      })

      if (!arrivals.length) {
        return { success: true, data: { items: [], arrivalCharges: [] } }
      }

      const normalizeRef = (value: string | null | undefined) => value?.trim().toLowerCase() || ''
      const normalizedVehicleRef = normalizeRef(vehicleRef)
      const matchingArrivals = normalizedVehicleRef
        ? arrivals.filter((arrival) => {
            const candidates = [arrival.vehicleChallanNo, arrival.challanNo]
            return candidates.some((candidate) => normalizeRef(candidate) === normalizedVehicleRef)
          })
        : arrivals

      if (!matchingArrivals.length) {
        return { success: true, data: { items: [], arrivalCharges: [] } }
      }

      const arrivalIds = matchingArrivals.map((arrival) => arrival.id)

      const arrivalChargesRecords = await prisma.arrivalCharges.findMany({
        where: { arrivalId: { in: arrivalIds } },
        include: {
          otherChargesHead: {
            select: {
              headingName: true
            }
          }
        }
      })

      const arrivalChargeIds = arrivalChargesRecords.map((charge) => charge.id)
      let billedArrivalChargeIds = new Set<string>()

      if (arrivalChargeIds.length) {
        const billedCharges = await prisma.sellerBillCharge.findMany({
          where: {
            arrivalChargeId: { in: arrivalChargeIds },
            ...(currentBillId ? { sellerBillId: { not: currentBillId } } : {})
          },
          select: {
            arrivalChargeId: true
          }
        })

        billedArrivalChargeIds = new Set(
          billedCharges
            .map((charge) => charge.arrivalChargeId)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        )
      }

      const arrivalCharges: SellerBillArrivalCharge[] = arrivalChargesRecords
        .filter((charge) => !billedArrivalChargeIds.has(charge.id))
        .map((charge) => ({
          id: charge.id,
          arrivalId: charge.arrivalId,
          otherChargesId: charge.otherChargesId,
          chargesHeadName: charge.otherChargesHead?.headingName || '',
          onValue:
            charge.onValue !== null && charge.onValue !== undefined ? Number(charge.onValue) : null,
          per: charge.per !== null && charge.per !== undefined ? Number(charge.per) : null,
          atRate: charge.atRate !== null && charge.atRate !== undefined ? Number(charge.atRate) : null,
          no: charge.no !== null && charge.no !== undefined ? Number(charge.no) : null,
          plusMinus: charge.plusMinus === '-' ? '-' : '+',
          amount: Number(charge.amount) || 0
        }))

      const arrivalItems = await prisma.arrivalItem.findMany({
        where: { arrivalId: { in: arrivalIds } },
        select: {
          arrivalId: true,
          itemId: true,
          lotNoVariety: true
        }
      })

      if (!arrivalItems.length) {
        return { success: true, data: { items: [], arrivalCharges } }
      }

      const normalizeLot = (value: string | null | undefined) => value?.trim().toLowerCase() || ''
      const validLotKeys = new Set<string>()

      arrivalItems.forEach((item) => {
        const key = `${item.itemId}::${normalizeLot(item.lotNoVariety)}`
        validLotKeys.add(key)
      })

      if (!validLotKeys.size) {
        return { success: true, data: { items: [], arrivalCharges } }
      }

      const saleItems = await prisma.stockSaleItem.findMany({
        where: {
          supplierId,
          stockSale: { companyId }
        },
        include: {
          stockSale: {
            select: {
              id: true,
              voucherNo: true,
              saleDate: true
            }
          }
        }
      })

      const saleItemIds = saleItems.map((item) => item.id)
      let billedStockItemIds = new Set<string>()
      if (saleItemIds.length) {
        const billedItems = await prisma.sellerBillItem.findMany({
          where: {
            stockSaleItemId: {
              in: saleItemIds
            },
            ...(currentBillId ? { sellerBillId: { not: currentBillId } } : {})
          },
          select: {
            stockSaleItemId: true
          }
        })
        billedStockItemIds = new Set(
          billedItems
            .map((item) => item.stockSaleItemId)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        )
      }

      const items: SellerBillSoldItem[] = saleItems
        .filter((item) => validLotKeys.has(`${item.itemId}::${normalizeLot(item.lotNoVariety)}`))
        .filter((item) => !billedStockItemIds.has(item.id))
        .map((item) => {
          const per = item.per?.toLowerCase() === 'kg' ? 'kg' : 'nug'
          const quantity = per === 'kg' ? Number(item.kg) || 0 : Number(item.nug) || 0
          const rate = Number(item.supplierRate) || 0
          const amount = Number((rate * quantity).toFixed(2))

          return {
            stockSaleItemId: item.id,
            stockSaleId: item.stockSaleId,
            stockSaleVoucherNo: item.stockSale?.voucherNo || null,
            stockSaleDate: item.stockSale?.saleDate || null,
            itemId: item.itemId,
            itemName: item.itemName || '',
            lotNo: item.lotNoVariety?.trim() || '',
            per,
            nug: Number(item.nug) || 0,
            kg: Number(item.kg) || 0,
            rate,
            amount
          }
        })

      return { success: true, data: { items, arrivalCharges } }
    } catch (error) {
      console.error('[SellerBillService] Error listing sold items:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load sold stock items'
      }
    }
  }
}
