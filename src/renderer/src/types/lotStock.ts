/**
 * Lot Stock View Types
 * Phase 15 - Types for lot-wise stock tracking view
 */

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

export interface LotStockWithNames extends LotStock {
  itemName?: string
  supplierName?: string
  storeName?: string
}
