/**
 * CrateMarka Type Definitions for Main Process
 */

export interface CrateMarka {
  id: string
  crateMarkaName: string
  printAs: string | null
  opQty: number
  cost: number
  companyId: string
  createdAt: Date
  updatedAt: Date
}

export interface CrateMarkaCreateInput {
  crateMarkaName: string
  printAs?: string
  opQty?: number
  cost?: number
}

export interface CrateMarkaUpdateInput {
  crateMarkaName?: string
  printAs?: string
  opQty?: number
  cost?: number
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}
