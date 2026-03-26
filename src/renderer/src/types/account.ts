export interface AccountGroup {
  id: string
  name: string
  parentGroupId: string | null
  level: number
  companyId: string
  createdAt: Date
  updatedAt: Date
  parentGroup?: AccountGroup | null
  childGroups?: AccountGroup[]
  accounts?: Account[]
  _count?: {
    accounts: number
  }
}

export interface Account {
  id: string
  accountName: string
  code: string | null
  accountGroupId: string
  companyId: string
  openingBalance: number
  drCr: string
  area: string | null
  srNo: string | null
  crLimit: number | null
  nameLang: string | null
  address: string | null
  address2: string | null
  city: string | null
  state: string | null
  panNo: string | null
  mobile1: string | null
  mobile2: string | null
  bankName1: string | null
  accountNo1: string | null
  bankName2: string | null
  accountNo2: string | null
  contactPerson: string | null
  ledgerFolioNo: string | null
  auditUpto: string | null
  maintainBillByBillBalance: boolean
  photo: string | null
  createdAt: Date
  updatedAt: Date


  
  accountGroup?: AccountGroup
}

export interface AccountFormData {
  accountName: string
  accountGroupId: string
  accountType: string
  openingBalance: number
  drCr: 'Dr' | 'Cr'
  currentBalance?: number
  
  // Address
  mailingName?: string
  address?: string
  country?: string
  state?: string
  pincode?: string
  
  // Contact
  phoneNo?: string
  mobileNo?: string
  faxNo?: string
  email?: string
  website?: string
  
  // Bank Details
  bankName?: string
  bankAccountNo?: string
  bankBranch?: string
  bankIfscCode?: string
  
  // Tax
  gstNo?: string
  panNo?: string
  
  // Credit/Debit Limits
  creditPeriod?: number
  creditLimit?: number
  
  // Flags
  enableChequeDetails?: boolean
  
  companyId: string
}

export interface AccountGroupFormData {
  name: string
  parentGroupId?: string
  companyId: string
}

export interface AccountFilters {
  search: string
  accountGroupId: string | null
  accountType: string | null
  drCr: 'Dr' | 'Cr' | null
}

export type ExportFormat = 'csv' | 'excel' | 'json'

export interface ImportResult {
  success: number
  failed: number
  errors: string[]
}
