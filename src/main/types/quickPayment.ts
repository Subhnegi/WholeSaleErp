/**
 * Quick Payment Type Definitions (Main Process)
 * Phase 18.3 - Payment & receipt management
 */

export type { ApiResponse } from './quickSale'

export interface QuickPayment {
  id: string
  companyId: string
  amount: number
  discount: number
  totalAmount: number
  createdAt: Date
  updatedAt: Date
  items?: QuickPaymentItem[]
}

export interface QuickPaymentItem {
  id: string
  quickPaymentId: string
  paymentId: string | null
  accountId: string
  amount: number
  discount: number
  totalAmount: number
  remarks: string | null
  paymentMode: 'cash' | 'cheque' | 'upi' | 'banktransfer' | null
  dateOfTransaction: Date | null
  accountNo: string | null
  chequeNo: string | null
  transactionId: string | null
  upiId: string | null
  bank: string | null
  branch: string | null
  ifscNo: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateQuickPaymentInput {
  companyId: string
  paymentDate: string
  items: CreateQuickPaymentItemInput[]
}

export interface CreateQuickPaymentItemInput {
  paymentId: string
  accountId: string
  amount: number
  discount: number
  totalAmount: number
  remarks?: string | null
  paymentMode?: 'cash' | 'cheque' | 'upi' | 'banktransfer'
  dateOfTransaction?: string | null
  accountNo?: string | null
  chequeNo?: string | null
  transactionId?: string | null
  upiId?: string | null
  bank?: string | null
  branch?: string | null
  ifscNo?: string | null
}

export interface UpdateQuickPaymentInput {
  paymentDate?: string
  items?: CreateQuickPaymentItemInput[]
}
