// OtherChargesHead types for Phase 14.4

export interface OtherChargesHead {
  id: string
  companyId: string
  headingName: string
  printAs: string | null
  accountHeadId: string | null
  chargeType: 'plus' | 'minus'
  feedAs: 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti'
  createdAt: Date
  updatedAt: Date
}

export interface OtherChargesHeadCreateInput {
  headingName: string
  printAs?: string | null
  accountHeadId?: string | null
  chargeType?: 'plus' | 'minus'
  feedAs?: 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti'
}

export interface OtherChargesHeadUpdateInput {
  headingName?: string
  printAs?: string | null
  accountHeadId?: string | null
  chargeType?: 'plus' | 'minus'
  feedAs?: 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti'
}
