/**
 * Packing Type Definitions (Main Process)
 * Phase 8.2 - Type definitions for packing management
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
