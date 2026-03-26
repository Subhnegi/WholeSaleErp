// ArrivalType types for Phase 14

export interface ArrivalType {
  id: string
  companyId: string
  name: string
  purchaseType: 'partyStock' | 'selfPurchase'
  vehicleNoByDefault: string | null
  autoRoundOffAmount: boolean
  askForAdditionalFields: boolean
  requireForwardingAgent: boolean
  requireBroker: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ArrivalTypeCreateInput {
  name: string
  purchaseType?: 'partyStock' | 'selfPurchase'
  vehicleNoByDefault?: string | null
  autoRoundOffAmount?: boolean
  askForAdditionalFields?: boolean
  requireForwardingAgent?: boolean
  requireBroker?: boolean
}

export interface ArrivalTypeUpdateInput {
  name?: string
  purchaseType?: 'partyStock' | 'selfPurchase'
  vehicleNoByDefault?: string | null
  autoRoundOffAmount?: boolean
  askForAdditionalFields?: boolean
  requireForwardingAgent?: boolean
  requireBroker?: boolean
}
