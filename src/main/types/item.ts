/**
 * Item Type Definitions for Main Process
 */

export interface Item {
  id: string
  companyId: string
  itemName: string
  code: string | null
  printAs: string | null
  printAsLang: string | null
  commission: number
  commissionAsPer: string | null
  marketFees: number
  rdf: number
  bardanaPerNug: number
  laga: number
  wtPerNug: number
  kaatPerNug: number
  maintainCratesInSalePurchase: boolean
  disableWeight: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ItemCreateInput {
  itemName: string
  code?: string
  printAs?: string
  printAsLang?: string
  commission?: number
  commissionAsPer?: string
  marketFees?: number
  rdf?: number
  bardanaPerNug?: number
  laga?: number
  wtPerNug?: number
  kaatPerNug?: number
  maintainCratesInSalePurchase?: boolean
  disableWeight?: boolean
}

export interface ItemUpdateInput {
  itemName?: string
  code?: string
  printAs?: string
  printAsLang?: string
  commission?: number
  commissionAsPer?: string
  marketFees?: number
  rdf?: number
  bardanaPerNug?: number
  laga?: number
  wtPerNug?: number
  kaatPerNug?: number
  maintainCratesInSalePurchase?: boolean
  disableWeight?: boolean
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}
