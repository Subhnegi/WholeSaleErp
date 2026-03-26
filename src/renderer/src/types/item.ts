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
  photo: string | null
  createdAt: Date
  updatedAt: Date


}

export interface ItemFormData {
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
  companyId: string
}

export interface ItemFilters {
  search: string
}

export type ItemExportFormat = 'csv' | 'excel' | 'json'

export interface ItemImportResult {
  success: number
  failed: number
  errors: string[]
}
