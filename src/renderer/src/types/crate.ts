/**
 * Crate Marka Type Definitions for Renderer Process
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

export interface CrateMarkaFormData {
  crateMarkaName: string
  printAs?: string
  opQty?: number
  cost?: number
}
