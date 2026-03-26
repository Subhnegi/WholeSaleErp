/**
 * Dashboard Service
 * Phase 18.9 - Handles dashboard statistics and data aggregation
 * 
 * Provides:
 * - Summary statistics for sales, purchases, inventory
 * - Recent activity feed
 * - Sales trends for charts
 * - Top items and customers
 */

import DatabaseService from './database'

export interface DashboardStats {
  totalSales: number
  totalPurchases: number
  itemCount: number
  customerCount: number
  supplierCount: number
  todaySales: number
  todayPurchases: number
  pendingArrivals: number
  salesTrend: SalesTrendItem[]
  recentActivity: RecentActivity[]
  topItems: TopItem[]
  topCustomers: TopCustomer[]
}

export interface SalesTrendItem {
  date: string
  label: string
  quickSales: number
  stockSales: number
  total: number
}

export interface RecentActivity {
  id: string
  type: 'quick_sale' | 'stock_sale' | 'arrival' | 'receipt' | 'payment'
  description: string
  amount: number
  date: string
  voucherNo: string
}

export interface TopItem {
  id: string
  name: string
  totalKg: number
  totalAmount: number
}

export interface TopCustomer {
  id: string
  name: string
  totalAmount: number
  transactionCount: number
}

export class DashboardService {
  private static instance: DashboardService
  private databaseService: DatabaseService

  private constructor() {
    this.databaseService = DatabaseService.getInstance()
  }

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService()
    }
    return DashboardService.instance
  }

  /**
   * Get dashboard statistics for a company
   */
  async getStats(companyId: string): Promise<{ success: boolean; data?: DashboardStats; error?: string }> {
    try {
      const prisma = await this.databaseService.getClient()
      
      // Get today's date for filtering
      const today = new Date().toISOString().split('T')[0]
      
      // Get last 7 days for trends
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      const startDate = sevenDaysAgo.toISOString().split('T')[0]

      // Parallel queries for performance
      const [
        quickSalesTotal,
        stockSalesTotal,
        arrivalsTotal,
        todayQuickSales,
        todayStockSales,
        todayArrivals,
        itemCount,
        accountCount,
        pendingArrivals,
        recentQuickSales,
        recentStockSales,
        recentArrivals,
        quickSalesByDate,
        stockSalesByDate,
        topItemsData,
        topCustomersData
      ] = await Promise.all([
        // Total quick sales
        prisma.quickSale.aggregate({
          where: { companyId },
          _sum: { totalSaleAmount: true }
        }),
        // Total stock sales
        prisma.stockSale.aggregate({
          where: { companyId },
          _sum: { customerAmount: true }
        }),
        // Total arrivals (purchases)
        prisma.arrival.aggregate({
          where: { companyId },
          _sum: { netAmt: true }
        }),
        // Today's quick sales
        prisma.quickSale.aggregate({
          where: { companyId, saleDate: today },
          _sum: { totalSaleAmount: true }
        }),
        // Today's stock sales
        prisma.stockSale.aggregate({
          where: { companyId, saleDate: today },
          _sum: { customerAmount: true }
        }),
        // Today's arrivals
        prisma.arrival.aggregate({
          where: { companyId, date: today },
          _sum: { netAmt: true }
        }),
        // Item count
        prisma.item.count({ where: { companyId } }),
        // Account count
        prisma.account.count({ where: { companyId } }),
        // Pending arrivals
        prisma.arrival.count({ where: { companyId, status: 'pending' } }),
        // Recent quick sales (last 5)
        prisma.quickSale.findMany({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, voucherNo: true, saleDate: true, totalSaleAmount: true }
        }),
        // Recent stock sales (last 5)
        prisma.stockSale.findMany({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, voucherNo: true, saleDate: true, customerAmount: true }
        }),
        // Recent arrivals (last 5)
        prisma.arrival.findMany({
          where: { companyId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, voucherNo: true, date: true, netAmt: true }
        }),
        // Quick sales by date for trends
        prisma.quickSale.groupBy({
          by: ['saleDate'],
          where: { companyId, saleDate: { gte: startDate } },
          _sum: { totalSaleAmount: true },
          orderBy: { saleDate: 'asc' }
        }),
        // Stock sales by date for trends
        prisma.stockSale.groupBy({
          by: ['saleDate'],
          where: { companyId, saleDate: { gte: startDate } },
          _sum: { customerAmount: true },
          orderBy: { saleDate: 'asc' }
        }),
        // Top items by sales
        prisma.quickSaleItem.groupBy({
          by: ['itemId', 'itemName'],
          where: { quickSale: { companyId } },
          _sum: { kg: true, totalAmount: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 5
        }),
        // Top customers by sales
        prisma.quickSaleItem.groupBy({
          by: ['accountId', 'accountName'],
          where: { quickSale: { companyId } },
          _sum: { totalAmount: true },
          _count: { id: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 5
        })
      ])

      // Calculate totals
      const totalSales = (quickSalesTotal._sum?.totalSaleAmount || 0) + 
                         (stockSalesTotal._sum?.customerAmount || 0)
      const totalPurchases = arrivalsTotal._sum?.netAmt || 0
      const todaySales = (todayQuickSales._sum?.totalSaleAmount || 0) + 
                         (todayStockSales._sum?.customerAmount || 0)
      const todayPurchases = todayArrivals._sum?.netAmt || 0

      // Build sales trend data for last 7 days
      const salesTrend: SalesTrendItem[] = []
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = date.toISOString().split('T')[0]
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
        
        const quickSale = quickSalesByDate.find(s => s.saleDate === dateStr)
        const stockSale = stockSalesByDate.find(s => s.saleDate === dateStr)
        
        const qsAmount = quickSale?._sum?.totalSaleAmount || 0
        const ssAmount = stockSale?._sum?.customerAmount || 0
        
        salesTrend.push({
          date: dateStr,
          label: dayName,
          quickSales: qsAmount,
          stockSales: ssAmount,
          total: qsAmount + ssAmount
        })
      }

      // Build recent activity
      const recentActivity: RecentActivity[] = [
        ...recentQuickSales.map(s => ({
          id: s.id,
          type: 'quick_sale' as const,
          description: `Quick Sale ${s.voucherNo || ''}`,
          amount: s.totalSaleAmount,
          date: s.saleDate,
          voucherNo: s.voucherNo || ''
        })),
        ...recentStockSales.map(s => ({
          id: s.id,
          type: 'stock_sale' as const,
          description: `Stock Sale ${s.voucherNo || ''}`,
          amount: s.customerAmount,
          date: s.saleDate,
          voucherNo: s.voucherNo || ''
        })),
        ...recentArrivals.map(a => ({
          id: a.id,
          type: 'arrival' as const,
          description: `Arrival ${a.voucherNo}`,
          amount: a.netAmt,
          date: a.date,
          voucherNo: a.voucherNo
        }))
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)

      // Build top items
      const topItems: TopItem[] = topItemsData.map(item => ({
        id: item.itemId,
        name: item.itemName,
        totalKg: item._sum?.kg || 0,
        totalAmount: item._sum?.totalAmount || 0
      }))

      // Build top customers
      const topCustomers: TopCustomer[] = topCustomersData.map(customer => ({
        id: customer.accountId,
        name: customer.accountName,
        totalAmount: customer._sum?.totalAmount || 0,
        transactionCount: customer._count?.id || 0
      }))

      return {
        success: true,
        data: {
          totalSales,
          totalPurchases,
          itemCount,
          customerCount: accountCount, // Using total account count
          supplierCount: 0, // Not tracked separately
          todaySales,
          todayPurchases,
          pendingArrivals,
          salesTrend,
          recentActivity,
          topItems,
          topCustomers
        }
      }
    } catch (error) {
      console.error('Dashboard stats error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }
}

export const dashboardService = DashboardService.getInstance()
