/**
 * Daily Sale (Voucher) Type Definitions (Main Process)
 * Phase 12.3 - Type definitions for voucher transaction management
 */

export interface Voucher {
  id: string
  voucherNo: number
  voucherDate: string // ISO date string
  companyId: string
  accountId: string
  accountName?: string
  vehicleNo?: string
  
  // Summary fields
  totalItems: number
  totalQuantity: number
  totalCrates: number
  totalWeight: number
  subTotal: number
  totalExpenses: number
  totalCharges: number
  grandTotal: number
  
  // Individual expense fields
  commission: number
  marketFees: number
  rdf: number
  bardana: number
  laga: number
  
  // Named charges (5 pre-defined)
  chargeOneLabel?: string
  chargeOne: number
  chargeTwoLabel?: string
  chargeTwo: number
  chargeThreeLabel?: string
  chargeThree: number
  chargeFourLabel?: string
  chargeFour: number
  chargeFiveLabel?: string
  chargeFive: number
  
  notes?: string
  createdAt: Date
  updatedAt: Date
  
  // Relations
  items?: VoucherItem[]
  charges?: VoucherCharge[]
}

export interface VoucherItem {
  id: string
  voucherId: string
  itemId: string
  itemName?: string
  arrivalTypeId?: string
  arrivalTypeName?: string
  crateMarkaId?: string
  crateMarkaName?: string
  
  // Quantity fields
  quantity: number
  crates?: number
  weight: number
  
  // Pricing fields - Customer side
  customerRate: number
  customerAmount: number
  customerRetail: number
  
  // Pricing fields - Supplier side
  supplierRate: number
  supplierAmount: number
  supplierRetail: number
  
  // Net rate flag
  useNetRate: boolean
  
  // Expense fields
  commission: number
  commissionPer: number
  marketFees: number
  rdf: number
  bardana: number
  bardanaAt: number
  laga: number
  lagaAt: number
  totalExpenses: number
  
  // Crate fields
  cratesTotalQuantity?: number
  cratesAadQuantity?: number
  cratesPerCrate?: number
  cratesPurQuantity?: number
  cratesPurAmount?: number
  
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface VoucherCharge {
  id: string
  voucherId: string
  otherChargesId?: string | null // References OtherChargesHead
  chargesHeadName?: string // Denormalized name from OtherChargesHead
  chargeName: string // Fallback when otherChargesId is null
  onValue: number
  per?: number | null
  atRate: number
  no?: number | null
  plusMinus: string // "+" or "-"
  amount: number
  
  // Legacy fields for backward compatibility
  label?: string
  isAddition?: boolean
  appliedAmount?: number
  
  createdAt: Date
  updatedAt: Date
}

// Form input types for creating vouchers
export interface CreateVoucherItemInput {
  itemId: string
  itemName: string
  arrivalTypeId?: string
  arrivalTypeName?: string
  crateMarkaId?: string
  crateMarkaName?: string
  
  quantity: number
  crates?: number
  weight: number
  
  customerRate: number
  customerAmount: number
  customerRetail: number
  
  supplierRate: number
  supplierAmount: number
  supplierRetail: number
  
  useNetRate: boolean
  
  commission: number
  commissionPer: number
  marketFees: number
  rdf: number
  bardana: number
  bardanaAt: number
  laga: number
  lagaAt: number
  totalExpenses: number
  
  cratesTotalQuantity?: number
  cratesAadQuantity?: number
  cratesPerCrate?: number
  cratesPurQuantity?: number
  cratesPurAmount?: number
  
  notes?: string
}

export interface CreateVoucherChargeInput {
  otherChargesId?: string | null // References OtherChargesHead (optional)
  chargeName: string // Fallback when otherChargesId is null
  onValue: number
  per?: number | null
  atRate: number
  no?: number | null
  plusMinus: string
  amount: number
}

export interface CreateVoucherInput {
  companyId: string
  voucherDate: string
  accountId: string
  vehicleNo?: string
  
  // Named charges
  chargeOneLabel?: string
  chargeOne?: number
  chargeTwoLabel?: string
  chargeTwo?: number
  chargeThreeLabel?: string
  chargeThree?: number
  chargeFourLabel?: string
  chargeFour?: number
  chargeFiveLabel?: string
  chargeFive?: number
  
  notes?: string
  
  items: CreateVoucherItemInput[]
  charges?: CreateVoucherChargeInput[]
}

export interface UpdateVoucherInput {
  voucherDate?: string
  accountId?: string
  vehicleNo?: string
  
  chargeOneLabel?: string
  chargeOne?: number
  chargeTwoLabel?: string
  chargeTwo?: number
  chargeThreeLabel?: string
  chargeThree?: number
  chargeFourLabel?: string
  chargeFour?: number
  chargeFiveLabel?: string
  chargeFive?: number
  
  notes?: string
  
  items?: CreateVoucherItemInput[]
  charges?: CreateVoucherChargeInput[]
}

export interface VoucherSummary {
  totalItems: number
  totalQuantity: number
  totalCrates: number
  totalWeight: number
  subTotal: number
  totalExpenses: number
  totalCharges: number
  grandTotal: number
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
}
