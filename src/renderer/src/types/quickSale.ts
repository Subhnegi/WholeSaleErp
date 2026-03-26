export interface QuickSale {
  id: string
  companyId: string
  saleDate: string // ISO date string
  voucherNo?: string
  totalItems: number
  totalCrates: number
  totalNug: number
  totalWeight: number
  basicAmount: number
  commissionExpenses: number
  totalSaleAmount: number
  createdAt: Date
  updatedAt: Date
  items?: QuickSaleItem[]
}

export interface QuickSaleItem {
  id: string
  quickSaleId: string
  itemId: string
  itemName: string
  accountId: string
  accountName: string
  nug: number
  kg: number
  rate: number
  per: 'nug' | 'kg'
  basicAmount: number
  totalAmount: number
  crateMarkaId: string | null
  crateMarkaName: string | null
  crateQty: number | null
  crateRate: number | null
  crateValue: number | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateQuickSaleInput {
  companyId: string
  saleDate: string
  voucherNo?: string
  items: CreateQuickSaleItemInput[]
}

export interface CreateQuickSaleItemInput {
  itemId: string
  itemName: string
  accountId: string
  accountName: string
  nug: number
  kg: number
  rate: number
  per: 'nug' | 'kg'
  basicAmount: number
  totalAmount: number
  crateMarkaId?: string
  crateMarkaName?: string
  crateQty?: number
  crateRate?: number
  crateValue?: number
}

export interface UpdateQuickSaleInput {
  saleDate?: string
  voucherNo?: string
  items?: CreateQuickSaleItemInput[]
}

export interface QuickSaleFilters {
  startDate?: string
  endDate?: string
  search?: string
}
