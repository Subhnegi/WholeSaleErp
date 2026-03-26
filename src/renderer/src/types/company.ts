/**
 * Company Types for Renderer Process
 */

export interface Company {
  id: string
  companyName: string
  printName?: string
  printNameLang?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  countryCode?: string
  mobile1?: string
  mobile2?: string
  email?: string
  website?: string
  contactPerson?: string
  billTitle?: string
  userId: string
  companyPassword?: string
  
  // Financial Year fields (embedded)
  fyStartDate: string | Date
  fyEndDate: string | Date
  fyLabel: string
  
  createdAt?: string | Date
  updatedAt?: string | Date
}

// Redux State Types
export interface CompanyState {
  companies: Company[]
  currentCompany: Company | null
  loading: boolean
  error: string | null
}
