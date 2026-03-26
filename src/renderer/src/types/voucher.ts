/**
 * Daily Sale (Voucher) Type Definitions
 * Phase 12.3 - Type definitions for voucher transaction management
 */

export interface Voucher {
  id: string
  voucherNo: string // Changed from number to string (DS-YYYYMMDD-XXX format)
  voucherDate: string // ISO date string
  companyId: string
  
  // Supplier (Party) info
  supplierId: string
  supplierName: string
  
  // Legacy fields for backward compatibility
  accountId?: string
  accountName?: string
  vehicleNo?: string
  
  // Summary fields from Item Entry
  totalItems: number
  totalNug: number // Changed from totalQuantity
  totalWeight: number
  totalBasicAmount: number // Changed from subTotal
  expenseAmount: number // Changed from totalExpenses
  commissionAmount: number // Total commission
  buyersAmount: number // basicAmount + expenseAmount + commissionAmount
  sellersItemValue: number // Total seller's item value
  
  // Charges fields
  totalOtherCharges: number // Changed from totalCharges
  transport: number
  freight: number
  grRrNo?: string | null // GR/RR Number
  narration?: string | null // Changed from notes
  advancePayment: number
  roundoff: number
  
  // Final totals
  totalAmount: number // Changed from grandTotal
  
  // Legacy fields for backward compatibility
  totalQuantity?: number
  totalCrates?: number
  subTotal?: number
  totalExpenses?: number
  totalCharges?: number
  grandTotal?: number
  commission?: number
  marketFees?: number
  rdf?: number
  bardana?: number
  laga?: number
  chargeOne?: number
  chargeTwo?: number
  chargeThree?: number
  chargeFour?: number
  chargeFive?: number
  notes?: string
  
  createdAt: string // Changed from Date to string (ISO)
  updatedAt: string // Changed from Date to string (ISO)
  
  // Relations
  items?: VoucherItem[]
  charges?: VoucherCharge[]
}

export interface VoucherItem {
  id: string
  voucherId: string
  itemId: string
  itemName?: string
  customerId: string // Changed from optional to required
  customerName: string // Changed from optional to required
  
  // Pricing flags
  netRate: boolean // Changed from useNetRate
  
  // Quantity fields
  nug: number // Changed from quantity
  weight: number
  customerPrice: number // Changed from customerRate
  supplierPrice: number // Changed from supplierRate
  per?: 'nug' | 'kg'
  
  // Calculated amounts
  basicAmount: number // Changed from customerAmount
  netAmount: number // Changed from customerRetail
  
  // Expense fields
  commission: number
  commissionPer: number
  marketFees: number
  rdf: number
  bardana: number
  bardanaAt: number
  laga: number
  lagaAt: number
  
  // Crate fields
  crateMarkaId?: string | null
  crateMarkaName?: string | null
  crateQty?: number | null // Changed from crates
  crateRate?: number | null
  crateValue?: number | null
  
  // Seller pricing removed at item level: compute from `supplierPrice * nug/weight` when needed
  
  // Legacy fields for backward compatibility
  arrivalTypeId?: string
  arrivalTypeName?: string
  quantity?: number
  crates?: number
  customerRate?: number
  customerAmount?: number
  customerRetail?: number
  supplierRate?: number
  supplierAmount?: number
  supplierRetail?: number
  useNetRate?: boolean
  totalExpenses?: number
  cratesTotalQuantity?: number
  cratesAadQuantity?: number
  cratesPerCrate?: number
  cratesPurQuantity?: number
  cratesPurAmount?: number
  notes?: string
  
  createdAt: string // Changed from Date to string
  updatedAt: string // Changed from Date to string
}

export interface VoucherCharge {
  id: string
  voucherId: string
  otherChargesId?: string | null // References OtherChargesHead
  chargesHeadName?: string // Denormalized name from OtherChargesHead
  chargeName: string // Changed from label (fallback when otherChargesId is null)
  onValue: number
  per?: number | null // Per unit value (e.g., per kg)
  atRate: number
  no?: number | null // Count/number (e.g., number of pettis)
  plusMinus: string // "+" or "-"
  amount: number
  
  // Legacy fields for backward compatibility
  label?: string
  isAddition?: boolean
  appliedAmount?: number
  
  createdAt: string // Changed from Date to string
  updatedAt: string // Changed from Date to string
}

// Form input types for creating vouchers
export interface CreateVoucherItemInput {
  itemId: string
  itemName: string
  customerId: string
  customerName: string
  
  netRate: boolean
  nug: number
  weight: number
  customerPrice: number
  supplierPrice: number
  per: string
  basicAmount: number
  netAmount: number
  
  commission: number
  commissionPer: number
  marketFees: number
  rdf: number
  bardana: number
  bardanaAt: number
  laga: number
  lagaAt: number
  
  crateMarkaId?: string | null
  crateMarkaName?: string | null
  crateQty?: number | null
  crateRate?: number | null
  crateValue?: number | null
  
  // sellerItemValue removed: computed on server from supplierPrice * nug/weight
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
  supplierId: string
  supplierName: string
  transport?: number
  freight?: number
  grRrNo?: string
  narration?: string
  vehicleNo?: string
  advancePayment?: number
  roundoff?: number
  items: CreateVoucherItemInput[]
  charges?: CreateVoucherChargeInput[]
}

export interface UpdateVoucherInput {
  voucherDate?: string
  supplierId?: string
  supplierName?: string
  transport?: number
  freight?: number
  grRrNo?: string
  narration?: string
  vehicleNo?: string
  advancePayment?: number
  roundoff?: number
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

export interface VoucherFilters {
  startDate?: string
  endDate?: string
  search?: string
}

// Form state for modal - keep old field names for now, will map during submit
export interface VoucherItemRow {
  tempId: string
  itemId: string
  itemName: string
  customerId: string
  customerName: string
  arrivalTypeId?: string
  arrivalTypeName?: string
  
  quantity: number
  crates?: number
  weight: number
  
  customerRate: number
  customerAmount: number
  customerRetail: number
  
  supplierRate: number
  supplierAmount: number
  supplierRetail: number
  
  per?: 'nug' | 'kg'
  
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
  
  crateMarkaId?: string | null
  crateMarkaName?: string | null
  
  cratesTotalQuantity?: number
  cratesAadQuantity?: number
  cratesPerCrate?: number
  cratesPurQuantity?: number
  cratesPurAmount?: number
  
  notes?: string
}

export interface VoucherChargeRow {
  tempId: string
  otherChargesId?: string | null // References OtherChargesHead
  label: string // Display name (from OtherChargesHead.headingName or fallback chargeName)
  chargeName: string // Fallback name
  feedAs?: string // From OtherChargesHead: "absolute", "percentage", "onWeight", "onNug", "onPetti"
  onValue: number
  per?: number | null
  atRate: number
  no?: number | null
  plusMinus: string
  amount: number
  isAddition: boolean
  appliedAmount: number
}
