/**
 * Crate Receive Types
 * Phase 13.5 - Type definitions for Crate Receive operations
 */

export interface CrateReceiveItem {
  id?: string
  crateReceiveId?: string
  slipNo?: string
  accountId: string
  accountName?: string // Denormalized for display
  crateMarkaId: string
  crateMarkaName?: string // Denormalized for display
  qty: number
  remarks?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface CrateReceive {
  id: string
  companyId: string
  receiveDate: string // ISO date string
  totalQty: number
  totalCrateAmount: number
  createdAt: Date
  updatedAt: Date
  items?: CrateReceiveItem[]
}

export interface CreateCrateReceiveInput {
  companyId: string
  receiveDate: string
  items: CrateReceiveItem[]
}

export interface UpdateCrateReceiveInput {
  receiveDate?: string
  items?: CrateReceiveItem[]
}

export interface CrateReceiveSummary {
  totalQty: number
  totalCrateAmount: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
