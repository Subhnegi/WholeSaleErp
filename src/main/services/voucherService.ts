/**
 * Voucher Service
 * Phase 12.4 - Handles all Daily Sale voucher operations
 * Phase 13.7 - Integration with Crate Issue (auto-sync crates)
 */

import DatabaseService from './database'
import { CrateIssueService } from './crateIssueService'

// Interfaces matching the Prisma schema
export interface VoucherItem {
  id?: string
  itemId: string
  itemName: string
  customerId: string
  customerName: string
  netRate: boolean
  nug: number
  weight: number
  customerPrice: number
  supplierPrice: number
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
  crateMarkaId?: string | null
  crateMarkaName?: string | null
  crateQty?: number | null
  crateRate?: number | null
  crateValue?: number | null
}

export interface VoucherCharge {
  id?: string
  otherChargesId?: string | null
  chargeName: string
  onValue: number
  per?: number | null
  atRate: number
  no?: number | null
  plusMinus: string
  amount: number
}

export interface CreateVoucherInput {
  companyId: string
  voucherDate: string
  supplierId: string
  supplierName: string
  transport?: number
  freight?: number
  grRrNo?: string
  narration?: string
  vehicleNo?: string
  advancePayment?: number
  roundoff?: number
  items: VoucherItem[]
  charges?: VoucherCharge[]
}

export interface UpdateVoucherInput {
  voucherDate?: string
  supplierId?: string
  supplierName?: string
  transport?: number
  freight?: number
  grRrNo?: string
  narration?: string
  vehicleNo?: string
  advancePayment?: number
  roundoff?: number
  items?: VoucherItem[]
  charges?: VoucherCharge[]
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

export class VoucherService {
  private static instance: VoucherService
  private databaseService: DatabaseService
  private crateIssueService: CrateIssueService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
    this.crateIssueService = CrateIssueService.getInstance()
  }

  public static getInstance(): VoucherService {
    if (!VoucherService.instance) {
      VoucherService.instance = new VoucherService()
    }
    return VoucherService.instance
  }

  /**
   * Serialize dates in voucher data to ISO strings for Redux compatibility
   */
  private serializeVoucher(voucher: any): any {
    if (!voucher) return voucher
    
    return {
      ...voucher,
      voucherDate: voucher.voucherDate instanceof Date 
        ? voucher.voucherDate.toISOString() 
        : voucher.voucherDate,
      createdAt: voucher.createdAt instanceof Date 
        ? voucher.createdAt.toISOString() 
        : voucher.createdAt,
      updatedAt: voucher.updatedAt instanceof Date 
        ? voucher.updatedAt.toISOString() 
        : voucher.updatedAt,
      items: voucher.items?.map((item: any) => ({
        ...item,
        createdAt: item.createdAt instanceof Date 
          ? item.createdAt.toISOString() 
          : item.createdAt,
        updatedAt: item.updatedAt instanceof Date 
          ? item.updatedAt.toISOString() 
          : item.updatedAt
      })),
      charges: voucher.charges?.map((charge: any) => ({
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
   * Generate unique voucher number for a company
   * Format: DS-YYYYMMDD-XXX (e.g., DS-20240115-001)
   */
  async generateVoucherNumber(companyId: string, voucherDate: string): Promise<string> {
    try {
      const prisma = await this.databaseService.getClient()
      
      // Extract date parts
      const date = new Date(voucherDate)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const datePrefix = `DS-${year}${month}${day}`

      // Find the last voucher for this company on this date
      const lastVoucher = await prisma.voucher.findFirst({
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

      if (!lastVoucher) {
        // First voucher of the day
        return `${datePrefix}-001`
      }

      // Extract the sequence number and increment
      const lastNumber = parseInt(lastVoucher.voucherNo.split('-')[2] || '0')
      const nextNumber = String(lastNumber + 1).padStart(3, '0')
      
      return `${datePrefix}-${nextNumber}`
    } catch (error: any) {
      console.error('Error generating voucher number:', error)
      // Fallback to timestamp-based number
      const timestamp = Date.now()
      const date = new Date(voucherDate)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `DS-${year}${month}${day}-${timestamp}`
    }
  }

  /**
   * Calculate summary from items and charges
   */
  private calculateSummary(items: VoucherItem[], charges: VoucherCharge[] = []): {
    totalItems: number
    totalNug: number
    totalWeight: number
    totalBasicAmount: number
    expenseAmount: number
    commissionAmount: number
    buyersAmount: number
    sellersItemValue: number
    totalOtherCharges: number
  } {
    // Calculate item totals
    const itemSummary = items.reduce((acc, item) => {
      const itemSellerValue = (item.supplierPrice || 0) * (item.per === 'nug' ? item.nug : item.weight)
      return {
        totalItems: acc.totalItems + 1,
        totalNug: acc.totalNug + item.nug,
        totalWeight: acc.totalWeight + item.weight,
        totalBasicAmount: acc.totalBasicAmount + item.basicAmount,
        expenseAmount: acc.expenseAmount + (item.marketFees + item.rdf + item.bardana + item.laga),
        commissionAmount: acc.commissionAmount + item.commission,
        sellersItemValue: acc.sellersItemValue + itemSellerValue
      }
    }, {
      totalItems: 0,
      totalNug: 0,
      totalWeight: 0,
      totalBasicAmount: 0,
      expenseAmount: 0,
      commissionAmount: 0,
      sellersItemValue: 0
    })

    // Calculate total other charges
    const totalOtherCharges = charges.reduce((sum, charge) => {
      return charge.plusMinus === '+' ? sum + charge.amount : sum - charge.amount
    }, 0)

    // Buyers Amount = Basic Amount + Expenses + Commission
    const buyersAmount = itemSummary.totalBasicAmount + itemSummary.expenseAmount + itemSummary.commissionAmount

    return {
      ...itemSummary,
      buyersAmount,
      totalOtherCharges
    }
  }

  /**
   * Create a new Daily Sale voucher
   * Phase 13.7 - Also creates crate issue entries for items with crate data
   */
  async createVoucher(data: CreateVoucherInput): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      // Generate voucher number
      const voucherNo = await this.generateVoucherNumber(data.companyId, data.voucherDate)

      // Calculate summary
      const summary = this.calculateSummary(data.items, data.charges || [])

      // Calculate total amount: sellersItemValue + totalOtherCharges + transport + freight + roundoff
      const transport = data.transport || 0
      const freight = data.freight || 0
      const roundoff = data.roundoff || 0
      // Total amount = seller item value - other charges + transport + freight + roundoff
      const totalAmount = summary.sellersItemValue + summary.totalOtherCharges + transport + freight + roundoff

      // Create voucher with items and charges in a transaction
      const voucher = await prisma.$transaction(async (tx) => {
        return await tx.voucher.create({
          data: {
            companyId: data.companyId,
            voucherNo,
            voucherDate: data.voucherDate,
            supplierId: data.supplierId,
            supplierName: data.supplierName,
            ...summary,
            transport,
            freight,
            grRrNo: data.grRrNo || null,
            narration: data.narration || null,
            vehicleNo: data.vehicleNo || null,
            advancePayment: data.advancePayment || 0,
            roundoff,
            totalAmount,
            items: {
              create: data.items.map(item => ({
                itemId: item.itemId,
                itemName: item.itemName,
                customerId: item.customerId,
                customerName: item.customerName,
                netRate: item.netRate,
                nug: item.nug,
                weight: item.weight,
                customerPrice: item.customerPrice,
                supplierPrice: item.supplierPrice,
                per: item.per,
                basicAmount: item.basicAmount,
                netAmount: item.netAmount,
                commission: item.commission,
                commissionPer: item.commissionPer,
                marketFees: item.marketFees,
                rdf: item.rdf,
                bardana: item.bardana,
                bardanaAt: item.bardanaAt,
                laga: item.laga,
                lagaAt: item.lagaAt,
                crateMarkaId: item.crateMarkaId || null,
                crateMarkaName: item.crateMarkaName || null,
                crateQty: item.crateQty || null,
                crateRate: item.crateRate || null,
                crateValue: item.crateValue || null,
                // seller item value is computed from supplierPrice * quantity (per nug/weight)
              }))
            },
            charges: data.charges ? {
              create: data.charges.map(charge => ({
                otherChargesId: charge.otherChargesId || null,
                chargeName: charge.chargeName,
                onValue: charge.onValue,
                per: charge.per || null,
                atRate: charge.atRate,
                no: charge.no || null,
                plusMinus: charge.plusMinus,
                amount: charge.amount
              }))
            } : undefined
          },
          include: {
            items: true,
            charges: true
          }
        })
      })

      // Phase 13.7: Sync crate issues for items with crate data
      // For daily sale, crates go to customers (customerId)
      const crateItems = voucher.items
        .filter(item => item.crateMarkaId && item.crateQty && item.crateQty > 0)
        .map(item => ({
          voucherItemId: item.id,
          accountId: item.customerId,  // Customer receives the crates
          crateMarkaId: item.crateMarkaId!,
          qty: item.crateQty!,
          remarks: `Daily Sale - ${voucherNo}`
        }))

      if (crateItems.length > 0) {
        await this.crateIssueService.syncFromDailySale(
          data.companyId,
          data.voucherDate,
          voucherNo,
          crateItems
        )
      }

      return {
        success: true,
        message: 'Daily Sale voucher created successfully',
        data: this.serializeVoucher(voucher)
      }
    } catch (error: any) {
      console.error('Error creating voucher:', error)
      return {
        success: false,
        error: error.message || 'Failed to create voucher'
      }
    }
  }

  /**
   * Get all vouchers for a company
   */
  async getVouchersByCompany(companyId: string): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      const vouchers = await prisma.voucher.findMany({
        where: { companyId },
        include: {
          items: true,
          charges: true
        },
        orderBy: {
          voucherDate: 'desc'
        }
      })

      return {
        success: true,
        data: vouchers.map(v => this.serializeVoucher(v))
      }
    } catch (error: any) {
      console.error('Error fetching vouchers:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch vouchers'
      }
    }
  }

  /**
   * Get vouchers by date range
   */
  async getVouchersByDateRange(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      const vouchers = await prisma.voucher.findMany({
        where: {
          companyId,
          voucherDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          items: true,
          charges: true
        },
        orderBy: {
          voucherDate: 'desc'
        }
      })

      return {
        success: true,
        data: vouchers.map(v => this.serializeVoucher(v))
      }
    } catch (error: any) {
      console.error('Error fetching vouchers by date range:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch vouchers'
      }
    }
  }

  /**
   * Get a single voucher by ID
   */
  async getVoucherById(id: string): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      const voucher = await prisma.voucher.findUnique({
        where: { id },
        include: {
          items: true,
          charges: true
        }
      })

      if (!voucher) {
        return {
          success: false,
          error: 'Voucher not found'
        }
      }

      return {
        success: true,
        data: this.serializeVoucher(voucher)
      }
    } catch (error: any) {
      console.error('Error fetching voucher:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch voucher'
      }
    }
  }

  /**
   * Update a voucher
   * Phase 13.7 - Also updates crate issue entries for items with crate data
   */
  async updateVoucher(id: string, data: UpdateVoucherInput): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get existing voucher to get companyId and old items
      const existingVoucher = await prisma.voucher.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!existingVoucher) {
        return {
          success: false,
          error: 'Voucher not found'
        }
      }

      // Phase 13.7: Delete old crate issues for old items before updating
      const oldItemIds = existingVoucher.items.map(item => item.id)
      if (oldItemIds.length > 0) {
        await this.crateIssueService.deleteByDailySale(oldItemIds)
      }

      // Use transaction for atomicity
      const voucher = await prisma.$transaction(async (tx) => {
        // If items are being updated, recalculate summary
        if (data.items) {
          // Calculate new summary
          const summary = this.calculateSummary(data.items, data.charges || [])

          // Calculate total amount
          const transport = data.transport || 0
          const freight = data.freight || 0
          const roundoff = data.roundoff || 0
          // Total amount = seller item value - other charges + transport + freight + roundoff
          const totalAmount = summary.sellersItemValue - summary.totalOtherCharges + transport + freight + roundoff

          // Delete old items and charges
          await tx.voucherItem.deleteMany({
            where: { voucherId: id }
          })
          
          await tx.voucherCharge.deleteMany({
            where: { voucherId: id }
          })

          // Update voucher with new data
          return await tx.voucher.update({
            where: { id },
            data: {
              voucherDate: data.voucherDate,
              supplierId: data.supplierId,
              supplierName: data.supplierName,
              ...summary,
              transport,
              freight,
              grRrNo: data.grRrNo || null,
              narration: data.narration || null,
              vehicleNo: data.vehicleNo || null,
              advancePayment: data.advancePayment || 0,
              roundoff,
              totalAmount,
              items: {
                create: data.items.map(item => ({
                  itemId: item.itemId,
                  itemName: item.itemName,
                  customerId: item.customerId,
                  customerName: item.customerName,
                  netRate: item.netRate,
                  nug: item.nug,
                  weight: item.weight,
                  customerPrice: item.customerPrice,
                  supplierPrice: item.supplierPrice,
                  per: item.per,
                  basicAmount: item.basicAmount,
                  netAmount: item.netAmount,
                  commission: item.commission,
                  commissionPer: item.commissionPer,
                  marketFees: item.marketFees,
                  rdf: item.rdf,
                  bardana: item.bardana,
                  bardanaAt: item.bardanaAt,
                  laga: item.laga,
                  lagaAt: item.lagaAt,
                  crateMarkaId: item.crateMarkaId || null,
                  crateMarkaName: item.crateMarkaName || null,
                  crateQty: item.crateQty || null,
                  crateRate: item.crateRate || null,
                  crateValue: item.crateValue || null,
                  // seller item value is not persisted at item level; computed from supplierPrice * nug/weight
                }))
              },
              charges: data.charges ? {
                create: data.charges.map(charge => ({
                  otherChargesId: charge.otherChargesId || null,
                  chargeName: charge.chargeName,
                  onValue: charge.onValue,
                  per: charge.per || null,
                  atRate: charge.atRate,
                  no: charge.no || null,
                  plusMinus: charge.plusMinus,
                  amount: charge.amount
                }))
              } : undefined
            },
            include: {
              items: true,
              charges: true
            }
          })
        } else {
          // Just update basic fields
          return await tx.voucher.update({
            where: { id },
            data: {
              voucherDate: data.voucherDate,
              supplierId: data.supplierId,
              supplierName: data.supplierName,
              transport: data.transport,
              freight: data.freight,
              grRrNo: data.grRrNo || null,
              narration: data.narration || null,
              vehicleNo: data.vehicleNo || null,
              advancePayment: data.advancePayment,
              roundoff: data.roundoff
            },
            include: {
              items: true,
              charges: true
            }
          })
        }
      })

      // Phase 13.7: Sync new crate issues for items with crate data
      // Both data.voucherDate and existingVoucher.voucherDate are strings
      const dateStr = data.voucherDate || String(existingVoucher.voucherDate)
      const voucherNo = existingVoucher.voucherNo
      const crateItems = voucher.items
        .filter(item => item.crateMarkaId && item.crateQty && item.crateQty > 0)
        .map(item => ({
          voucherItemId: item.id,
          accountId: item.customerId,  // Customer receives the crates
          crateMarkaId: item.crateMarkaId!,
          qty: item.crateQty!,
          remarks: `Daily Sale - ${voucherNo}`
        }))

      if (crateItems.length > 0) {
        await this.crateIssueService.syncFromDailySale(
          existingVoucher.companyId,
          dateStr,
          voucherNo,
          crateItems
        )
      }

      return {
        success: true,
        message: 'Voucher updated successfully',
        data: this.serializeVoucher(voucher)
      }
    } catch (error: any) {
      console.error('Error updating voucher:', error)
      return {
        success: false,
        error: error.message || 'Failed to update voucher'
      }
    }
  }

  /**
   * Delete a voucher (cascade deletes items and charges)
   * Phase 13.7 - Also deletes related crate issue entries
   */
  async deleteVoucher(id: string): Promise<ApiResponse> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get the voucher with items first for crate issue cleanup
      const voucher = await prisma.voucher.findUnique({
        where: { id },
        include: { items: true }
      })

      if (!voucher) {
        return {
          success: false,
          error: 'Voucher not found'
        }
      }

      // Phase 13.7: Delete related crate issues first
      const itemIds = voucher.items.map(item => item.id)
      if (itemIds.length > 0) {
        await this.crateIssueService.deleteByDailySale(itemIds)
      }

      // Delete the voucher (cascade will delete items and charges)
      await prisma.voucher.delete({
        where: { id }
      })

      return {
        success: true,
        message: 'Voucher deleted successfully'
      }
    } catch (error: any) {
      console.error('Error deleting voucher:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete voucher'
      }
    }
  }

  /**
   * Bulk delete vouchers
   * Phase 13.7 - Also deletes related crate issue entries
   */
  async bulkDeleteVouchers(ids: string[]): Promise<ApiResponse<{ deletedCount: number }>> {
    try {
      const prisma = await this.databaseService.getClient()

      // Get all vouchers with items for crate issue cleanup
      const vouchers = await prisma.voucher.findMany({
        where: {
          id: { in: ids }
        },
        include: { items: true }
      })

      if (vouchers.length !== ids.length) {
        return {
          success: false,
          error: 'Some vouchers not found'
        }
      }

      // Phase 13.7: Collect all item IDs and delete related crate issues
      const allItemIds = vouchers.flatMap(v => v.items.map(item => item.id))
      if (allItemIds.length > 0) {
        await this.crateIssueService.deleteByDailySale(allItemIds)
      }

      // Delete all vouchers (cascade will delete items and charges)
      const result = await prisma.voucher.deleteMany({
        where: {
          id: { in: ids }
        }
      })

      return {
        success: true,
        message: `${result.count} vouchers deleted successfully`,
        data: { deletedCount: result.count }
      }
    } catch (error: any) {
      console.error('Error bulk deleting vouchers:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete vouchers'
      }
    }
  }
}
