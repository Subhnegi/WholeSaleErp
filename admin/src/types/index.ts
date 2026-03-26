// User types
export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

// License types
export interface License {
  id?: string
  userId?: string
  licenseKey: string
  status: 'active' | 'expired' | 'suspended'
  plan?: LicensePlan
  isTrial?: boolean
  startDate: string
  endDate: string // Server uses endDate, not expiryDate
  expiryDate?: string // Alias for endDate (for backwards compatibility)
  lastValidated?: string
  createdAt?: string
  updatedAt?: string
}

export type LicensePlan = 'monthly' | 'quarterly' | 'yearly' | 'lifetime'

export interface LicensePlanOption {
  id: LicensePlan
  name: string
  duration: number // in days
  price: number
  savings?: string
}

// Auth types
export interface AuthState {
  user: User | null
  license: License | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  message?: string
  data?: {
    user: User
    license: License
    token: string
  }
  error?: string
}

// Payment types
export interface PaymentDetails {
  cardNumber: string
  cardHolder: string
  expiryDate: string
  cvv: string
}

export interface PaymentRequest {
  userId: string
  licenseId: string
  plan: LicensePlan
  amount: number
  paymentMethod: 'card' | 'upi'
  paymentDetails?: PaymentDetails
  upiId?: string
}

export interface PaymentResponse {
  success: boolean
  message?: string
  transactionId?: string
  newExpiryDate?: string
  error?: string
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
}
