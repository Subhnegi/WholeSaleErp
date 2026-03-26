/**
 * Crate Issue Types
 * Phase 13.5 - Type definitions for Crate Issue operations
 */

export interface CrateIssueItem {
  id?: string
  crateIssueId?: string
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

export interface CrateIssue {
  id: string
  companyId: string
  issueDate: string // ISO date string
  totalQty: number
  totalCrateAmount: number
  createdAt: Date
  updatedAt: Date
  items?: CrateIssueItem[]
}

export interface CreateCrateIssueInput {
  companyId: string
  issueDate: string
  items: CrateIssueItem[]
}

export interface UpdateCrateIssueInput {
  issueDate?: string
  items?: CrateIssueItem[]
}

export interface CrateIssueSummary {
  totalQty: number
  totalCrateAmount: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
