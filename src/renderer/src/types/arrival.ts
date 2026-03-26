/**
 * Arrival Types for Renderer
 * Phase 14.6/14.7 - Types for arrival book and arrival entry
 */

export interface ArrivalItem {
  id: string
  arrivalId: string
  itemId: string
  itemName?: string
  lotNoVariety: string | null
  nug: number
  kg: number
  rate: number | null
  crateMarkaId: string | null
  crateMarkaName: string | null
  crateQty: number | null
  crateRate: number | null
  crateValue: number | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface ArrivalCharges {
  id: string
  arrivalId: string
  otherChargesId: string
  chargesHeadName?: string
  onValue: number | null
  per: number | null
  atRate: number | null
  no: number | null
  plusMinus: '+' | '-'
  amount: number
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Arrival {
  id: string
  companyId: string
  date: string
  voucherNo: string
  arrivalTypeId: string
  arrivalTypeName?: string
  vehicleChallanNo: string
  partyId: string
  partyName?: string
  storeId: string | null
  storeName?: string
  transport: string | null
  challanNo: string | null
  remarks: string | null
  forwardingAgentId: string | null
  forwardingAgentName?: string
  totalNug: number
  totalKg: number
  basicAmt: number
  charges: number
  netAmt: number
  status: 'pending' | 'sold' | 'partial'
  soldNug?: number
  balanceNug?: number
  createdAt: Date | string
  updatedAt: Date | string
  items?: ArrivalItem[]
  arrivalCharges?: ArrivalCharges[]
}

export interface ArrivalListFilters {
  startDate?: string
  endDate?: string
  arrivalTypeId?: string
  partyId?: string
  storeId?: string
  status?: 'pending' | 'sold' | 'partial'
}
