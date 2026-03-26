/**
 * Store Type Definitions (Renderer Process)
 * Phase 14.5 - Type definitions for store management UI
 */

export interface Store {
  id: string
  companyId: string
  name: string
  address: string | null
  address2: string | null
  address3: string | null
  contactNo: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateStoreInput {
  name: string
  companyId: string
  address?: string | null
  address2?: string | null
  address3?: string | null
  contactNo?: string | null
}

export interface UpdateStoreInput {
  name?: string
  address?: string | null
  address2?: string | null
  address3?: string | null
  contactNo?: string | null
}
