export interface QuickReceipt {
  id: string
  companyId: string
  amount: number
  discount: number
  totalAmount: number
  createdAt: Date
  updatedAt: Date
  items?: QuickReceiptItem[]
}

export interface QuickReceiptItem {
  id: string
  quickReceiptId: string
  receiptId: string | null
  accountId: string
  amount: number
  discount: number
  totalAmount: number
  remarks: string | null
  paymentMode: 'cash' | 'cheque' | 'upi' | 'banktransfer' | null
  dateOfTransaction: string | null
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

export interface CreateQuickReceiptInput {
  companyId: string
  receiptDate: string
  items: CreateQuickReceiptItemInput[]
}

export interface CreateQuickReceiptItemInput {
  receiptId: string
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

export interface UpdateQuickReceiptInput {
  receiptDate?: string
  items?: CreateQuickReceiptItemInput[]
}
