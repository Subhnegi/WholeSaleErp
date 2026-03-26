/**
 * Packing Type Definitions (Renderer Process)
 * Phase 8.3 - Type definitions for packing UI
 */

export interface Packing {
  id: string
  packingName: string
  calculate: 'nug' | 'weight'
  divideBy: number
  companyId: string
  createdAt: Date
  updatedAt: Date


}

export interface CreatePackingInput {
  packingName: string
  calculate: 'nug' | 'weight'
  divideBy: number
  companyId: string
}

export interface UpdatePackingInput {
  packingName?: string
  calculate?: 'nug' | 'weight'
  divideBy?: number
}
