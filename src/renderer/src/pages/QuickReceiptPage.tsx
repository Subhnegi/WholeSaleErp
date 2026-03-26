import { useState, useEffect, useRef } from 'react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { store } from '@/store'
import { 
  startTabTransaction,
  endTabTransaction,
  setTabTransactionState,
  selectTabTransactionState
} from '@/store/slices/tabSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Save,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Printer,
  Pencil
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { Textarea } from '@/components/ui/textarea'
import { AccountCreateDialog } from '@/components/dialogs/AccountCreateDialog'
import type { Account } from '@/types/account'

// Local interface definitions matching the API response
interface QuickReceiptItem {
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

interface QuickReceipt {
  id: string
  companyId: string
  amount: number
  discount: number
  totalAmount: number
  createdAt: Date
  updatedAt: Date
  items?: QuickReceiptItem[]
}

interface CreateQuickReceiptItemInput {
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

// Simple date formatting helper
const formatDateToISO = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

type ReceiptFormState = Omit<CreateQuickReceiptItemInput, 'paymentMode'> & {
  paymentMode: 'cash' | 'cheque' | 'upi' | 'banktransfer'
  accountName: string
}

const formatReceiptNumber = (sequence: number) => sequence.toString().padStart(3, '0')

const extractReceiptSequence = (receiptId?: string | null) => {
  if (!receiptId) return null
  const parsed = parseInt(receiptId, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const computeNextReceiptNumber = (
  receipts: QuickReceipt[],
  fallbackSequence = 1
) => {
  const sequences = receipts
    .flatMap(receipt => receipt.items || [])
    .map(item => extractReceiptSequence(item.receiptId))
    .filter((value): value is number => value !== null)
  const nextSequence = sequences.length > 0
    ? Math.max(...sequences) + 1
    : fallbackSequence
  return formatReceiptNumber(nextSequence)
}

const incrementReceiptNumber = (current?: string | null) => {
  const nextSequence = (extractReceiptSequence(current) || 0) + 1
  return formatReceiptNumber(nextSequence)
}

const toDateOnlyString = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  return formatDateToISO(date)
}

const createEmptyReceiptItem = (
  overrides: Partial<ReceiptFormState> = {}
): ReceiptFormState => ({
  receiptId: formatReceiptNumber(1),
  accountId: '',
  accountName: '',
  amount: 0,
  discount: 0,
  totalAmount: 0,
  remarks: '',
  paymentMode: 'cash',
  dateOfTransaction: '',
  chequeNo: '',
  transactionId: '',
  upiId: '',
  accountNo: '',
  bank: '',
  branch: '',
  ifscNo: '',
  ...overrides
})

interface ItemRow extends CreateQuickReceiptItemInput {
  tempId: string
  accountName: string
}

type LegacyItemRow = Partial<ItemRow> & {
  receiptNo?: string
  bankName?: string
  branchName?: string
}

const normalizeItemRow = (row: LegacyItemRow, index: number): ItemRow => ({
  tempId: row.tempId || `restored-${index}`,
  receiptId: row.receiptId || row.receiptNo || formatReceiptNumber(index + 1),
  accountId: row.accountId || '',
  accountName: row.accountName || '',
  amount: row.amount || 0,
  discount: row.discount || 0,
  totalAmount: row.totalAmount || 0,
  remarks: row.remarks || '',
  paymentMode: row.paymentMode || 'cash',
  dateOfTransaction: row.dateOfTransaction || '',
  chequeNo: row.chequeNo || '',
  transactionId: row.transactionId || '',
  upiId: row.upiId || '',
  accountNo: row.accountNo || '',
  bank: row.bank || row.bankName || '',
  branch: row.branch || row.branchName || '',
  ifscNo: row.ifscNo || ''
})

interface QuickReceiptPageProps {
  tabId: string
}

// Payment mode modals
interface ChequeDetailsModalProps {
  open: boolean
  onClose: () => void
  onSave: (details: ChequeDetails) => void
  initialData?: ChequeDetails
}

interface ChequeDetails {
  dateOfTransaction: string
  chequeNo: string
  accountNo: string
  bank: string
  branch: string
  ifscNo: string
}

function ChequeDetailsModal({ open, onClose, onSave, initialData }: ChequeDetailsModalProps) {
  const [details, setDetails] = useState<ChequeDetails>(
    initialData || {
      dateOfTransaction: formatDateToISO(new Date()),
      chequeNo: '',
      accountNo: '',
      bank: '',
      branch: '',
      ifscNo: ''
    }
  )

  useEffect(() => {
    if (initialData) {
      setDetails(initialData)
    }
  }, [initialData])

  const handleSave = () => {
    if (!details.chequeNo || !details.bank) {
      toast.error('Cheque No and Bank Name are required')
      return
    }
    onSave(details)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cheque Details</DialogTitle>
          <DialogDescription>Enter cheque payment details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date of Transaction</Label>
            <Input
              type="date"
              value={details.dateOfTransaction}
              onChange={(e) => setDetails({ ...details, dateOfTransaction: e.target.value })}
            />
          </div>
          <div>
            <Label>Cheque No *</Label>
            <Input
              value={details.chequeNo}
              onChange={(e) => setDetails({ ...details, chequeNo: e.target.value })}
              placeholder="Enter cheque number"
            />
          </div>
          <div>
            <Label>Account No</Label>
            <Input
              value={details.accountNo}
              onChange={(e) => setDetails({ ...details, accountNo: e.target.value })}
              placeholder="Enter account number"
            />
          </div>
          <div>
            <Label>Bank Name *</Label>
            <Input
              value={details.bank}
              onChange={(e) => setDetails({ ...details, bank: e.target.value })}
              placeholder="Enter bank name"
            />
          </div>
          <div>
            <Label>Branch Name</Label>
            <Input
              value={details.branch}
              onChange={(e) => setDetails({ ...details, branch: e.target.value })}
              placeholder="Enter branch name"
            />
          </div>
          <div>
            <Label>IFSC No</Label>
            <Input
              value={details.ifscNo}
              onChange={(e) => setDetails({ ...details, ifscNo: e.target.value })}
              placeholder="Enter IFSC code"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface BankTransferDetailsModalProps {
  open: boolean
  onClose: () => void
  onSave: (details: BankTransferDetails) => void
  initialData?: BankTransferDetails
}

interface BankTransferDetails {
  dateOfTransaction: string
  transactionId: string
  accountNo: string
  bank: string
  branch: string
  ifscNo: string
}

function BankTransferDetailsModal({ open, onClose, onSave, initialData }: BankTransferDetailsModalProps) {
  const [details, setDetails] = useState<BankTransferDetails>(
    initialData || {
      dateOfTransaction: formatDateToISO(new Date()),
      transactionId: '',
      accountNo: '',
      bank: '',
      branch: '',
      ifscNo: ''
    }
  )

  useEffect(() => {
    if (initialData) {
      setDetails(initialData)
    }
  }, [initialData])

  const handleSave = () => {
    if (!details.transactionId || !details.bank) {
      toast.error('Transaction ID and Bank Name are required')
      return
    }
    onSave(details)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bank Transfer Details</DialogTitle>
          <DialogDescription>Enter bank transfer payment details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date of Transaction</Label>
            <Input
              type="date"
              value={details.dateOfTransaction}
              onChange={(e) => setDetails({ ...details, dateOfTransaction: e.target.value })}
            />
          </div>
          <div>
            <Label>Transaction ID *</Label>
            <Input
              value={details.transactionId}
              onChange={(e) => setDetails({ ...details, transactionId: e.target.value })}
              placeholder="Enter transaction ID"
            />
          </div>
          <div>
            <Label>Account No</Label>
            <Input
              value={details.accountNo}
              onChange={(e) => setDetails({ ...details, accountNo: e.target.value })}
              placeholder="Enter account number"
            />
          </div>
          <div>
            <Label>Bank Name *</Label>
            <Input
              value={details.bank}
              onChange={(e) => setDetails({ ...details, bank: e.target.value })}
              placeholder="Enter bank name"
            />
          </div>
          <div>
            <Label>Branch Name</Label>
            <Input
              value={details.branch}
              onChange={(e) => setDetails({ ...details, branch: e.target.value })}
              placeholder="Enter branch name"
            />
          </div>
          <div>
            <Label>IFSC No</Label>
            <Input
              value={details.ifscNo}
              onChange={(e) => setDetails({ ...details, ifscNo: e.target.value })}
              placeholder="Enter IFSC code"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface UPIDetailsModalProps {
  open: boolean
  onClose: () => void
  onSave: (details: UPIDetails) => void
  initialData?: UPIDetails
}

interface UPIDetails {
  dateOfTransaction: string
  transactionId: string
  upiId: string
}

function UPIDetailsModal({ open, onClose, onSave, initialData }: UPIDetailsModalProps) {
  const [details, setDetails] = useState<UPIDetails>(
    initialData || {
      dateOfTransaction: formatDateToISO(new Date()),
      transactionId: '',
      upiId: ''
    }
  )

  useEffect(() => {
    if (initialData) {
      setDetails(initialData)
    }
  }, [initialData])

  const handleSave = () => {
    if (!details.transactionId || !details.upiId) {
      toast.error('Transaction ID and UPI ID are required')
      return
    }
    onSave(details)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>UPI Details</DialogTitle>
          <DialogDescription>Enter UPI payment details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date of Transaction</Label>
            <Input
              type="date"
              value={details.dateOfTransaction}
              onChange={(e) => setDetails({ ...details, dateOfTransaction: e.target.value })}
            />
          </div>
          <div>
            <Label>Transaction ID *</Label>
            <Input
              value={details.transactionId}
              onChange={(e) => setDetails({ ...details, transactionId: e.target.value })}
              placeholder="Enter transaction ID"
            />
          </div>
          <div>
            <Label>UPI ID *</Label>
            <Input
              value={details.upiId}
              onChange={(e) => setDetails({ ...details, upiId: e.target.value })}
              placeholder="Enter UPI ID"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function QuickReceiptPage({ tabId }: QuickReceiptPageProps) {
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  const tabTransactionState = useAppSelector((state) => 
    selectTabTransactionState(state, tabId)
  )
  const activeCompanyId = activeCompany?.id ?? null
  const activeCompanyName = activeCompany?.companyName ?? 'Select a company'
  
  // Create a unique state key for this tab instance
  const stateKey = `quickreceipt-${tabId}`
  
  // Data lists
  const [, setAccounts] = useState<Account[]>([])
  const [customerAccounts, setCustomerAccounts] = useState<Account[]>([])
  
  // Shared Quick Receipts data for cross-tab synchronization
  const [, setQuickReceipts] = useState<QuickReceipt[]>([])
  
  // Current entry form state
  const [receiptDate, setReceiptDate] = useState('')
  const [currentItem, setCurrentItem] = useState<ReceiptFormState>(() => createEmptyReceiptItem())
  
  // Items added to current quick receipt
  const [itemRows, setItemRows] = useState<ItemRow[]>([])
  const [savedItemRows, setSavedItemRows] = useState<ItemRow[]>([])
  const [nextTempId, setNextTempId] = useState(1)
  const [nextReceiptNumber, setNextReceiptNumber] = useState(() => formatReceiptNumber(1))
  
  // Multi-select state
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  
  // Row selection for keyboard navigation
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  
  // Editing state
  const [editingQuickReceiptId, setEditingQuickReceiptId] = useState<string | null>(null)
  const [editingItemTempId, setEditingItemTempId] = useState<string | null>(null)
  const prevDateRef = useRef<string>('')
  const shouldLoadRef = useRef<boolean>(true)
  const prevTabIdRef = useRef<string | null>(null)
  
  // Loading states
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Alert dialogs
  const [showCancelAlert, setShowCancelAlert] = useState(false)
  
  // Payment mode modals
  const [showChequeModal, setShowChequeModal] = useState(false)
  const [showBankTransferModal, setShowBankTransferModal] = useState(false)
  const [showUPIModal, setShowUPIModal] = useState(false)
  
  // Dialogs
  const [showAccountCreateDialog, setShowAccountCreateDialog] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  
  // Initialize shouldLoadRef from sessionStorage if available
  useEffect(() => {
    const savedShouldLoad = sessionStorage.getItem(`shouldLoad-${tabId}`)
    if (savedShouldLoad !== null) {
      shouldLoadRef.current = JSON.parse(savedShouldLoad)
    }
  }, [tabId])

  // Cross-tab synchronization using BroadcastChannel
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  
  const broadcastQuickReceiptSave = () => {
    console.log('[QuickReceipt] Broadcasting save event to other tabs')
    const event = {
      type: 'QUICK_RECEIPT_SAVED',
      timestamp: Date.now(),
      tabId: tabId
    }
    
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event)
    }
    
    localStorage.setItem('quickReceiptSync', JSON.stringify(event))
    setTimeout(() => {
      localStorage.removeItem('quickReceiptSync')
    }, 100)
  }
  
  // Save and restore tab-specific state
  useEffect(() => {
    if (prevTabIdRef.current !== tabId) {
      prevTabIdRef.current = tabId
      
      const savedState = sessionStorage.getItem(stateKey)
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState)
          const restoredItems = Array.isArray(parsed.itemRows)
            ? parsed.itemRows.map((row: LegacyItemRow, index: number) => normalizeItemRow(row || {}, index))
            : []
          const restoredSavedItems = Array.isArray(parsed.savedItemRows)
            ? parsed.savedItemRows.map((row: LegacyItemRow, index: number) => normalizeItemRow(row || {}, index))
            : []
          setItemRows(restoredItems)
          setSavedItemRows(restoredSavedItems)
          setReceiptDate(parsed.receiptDate || '')
          setEditingQuickReceiptId(parsed.editingQuickReceiptId || null)
        } catch (error) {
          console.error('Failed to restore tab state:', error)
        }
      }
    }
  }, [stateKey, tabId])
  
  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    const state = {
      itemRows,
      savedItemRows,
      receiptDate,
      editingQuickReceiptId
    }
    sessionStorage.setItem(stateKey, JSON.stringify(state))
  }, [itemRows, savedItemRows, receiptDate, editingQuickReceiptId, stateKey])
  
  // Cleanup sessionStorage when tab is closed
  useEffect(() => {
    return () => {
      const tabs = store.getState().tabs.tabs
      const tabExists = tabs.some(tab => tab.id === tabId)
      if (!tabExists) {
        sessionStorage.removeItem(stateKey)
      }
    }
  }, [stateKey, tabId])
  
  // Transaction state
  const isTransactionActive = tabTransactionState.isActive
  
  // Check if any input fields have values
  const hasInputValues = currentItem.accountId !== '' || 
    currentItem.amount !== 0 || currentItem.discount !== 0
  
  // Sync unsaved changes with tab state
  useEffect(() => {
    const currentHasChanges = JSON.stringify(itemRows) !== JSON.stringify(savedItemRows)
    dispatch(setTabTransactionState({ 
      tabId: tabId, 
      transactionState: { 
        isDirty: currentHasChanges,
        transactionType: 'quickreceipt'
      }
    }))
  }, [itemRows, savedItemRows, tabId, dispatch])
  
  // Initialize BroadcastChannel
  useEffect(() => {
    broadcastChannelRef.current = new BroadcastChannel('quickreceipt-sync')
    
    broadcastChannelRef.current.onmessage = (event) => {
      if (event.data.type === 'QUICK_RECEIPT_SAVED' && event.data.tabId !== tabId) {
        console.log('[QuickReceipt] Received save event from another tab, refreshing...')
        loadQuickReceipts()
      }
    }
    
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
      }
    }
  }, [tabId])
  
  // Initialize date
  useEffect(() => {
    if (!receiptDate) {
      setReceiptDate(formatDateToISO(new Date()))
    }
  }, [receiptDate])
  
  // Load accounts when component mounts
  useEffect(() => {
    if (activeCompanyId) {
      loadAccounts()
    } else {
      setAccounts([])
      setCustomerAccounts([])
    }
  }, [activeCompanyId])
  
  // Load accounts
  const loadAccounts = async () => {
    if (!activeCompanyId) return
    try {
      const result = await window.api.account.listByCompany(activeCompanyId)
      if (result.success && result.data) {
        setAccounts(result.data)
        // Filter customer accounts (sundry debtor or customer)
        const customers = result.data.filter(acc => 
          acc.accountGroup?.name?.toLowerCase().includes('sundry debtor') ||
          acc.accountGroup?.name?.toLowerCase().includes('customer')
        )
        setCustomerAccounts(customers)
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
      toast.error('Failed to load accounts')
    }
  }
  
  // Load quick receipts
  const loadQuickReceipts = async () => {
    if (!receiptDate || !activeCompanyId) return
    
    try {
      setLoading(true)
      const result = await window.api.quickReceipt.listByCompany(activeCompanyId)
      if (result.success && result.data) {
        // Filter by date
        const filtered = result.data.filter(r => 
          toDateOnlyString(r.createdAt) === receiptDate
        )
        setQuickReceipts(filtered as any)
        
        // Load saved items into the table (like QuickSale)
        if (filtered.length > 0 && shouldLoadRef.current) {
          const quickReceiptForDate = filtered[0] // Get the first receipt for this date
          if (quickReceiptForDate && (quickReceiptForDate as any).items) {
            const loadedItems = (quickReceiptForDate as any).items.map((item: any, index: number) => ({
              tempId: `existing-${item.id}-${index}`,
              receiptId: item.receiptId || formatReceiptNumber(index + 1),
              accountId: item.accountId,
              accountName: item.account?.accountName || '',
              amount: item.amount,
              discount: item.discount,
              totalAmount: item.totalAmount,
              remarks: item.remarks || '',
              paymentMode: item.paymentMode || 'cash',
              dateOfTransaction: item.dateOfTransaction || '',
              chequeNo: item.chequeNo || '',
              transactionId: item.transactionId || '',
              upiId: item.upiId || '',
              accountNo: item.accountNo || '',
              bank: item.bank || '',
              branch: item.branch || '',
              ifscNo: item.ifscNo || ''
            }))
            setEditingQuickReceiptId(quickReceiptForDate.id)
            setItemRows(loadedItems)
            setSavedItemRows(loadedItems) // Set saved state
            shouldLoadRef.current = false
          } else {
            // No items for this date
            setEditingQuickReceiptId(null)
            setItemRows([])
            setSavedItemRows([])
            setSelectedRowIndex(null)
            shouldLoadRef.current = false
          }
        } else if (filtered.length === 0 && shouldLoadRef.current) {
          // No saved receipts for this date
          setEditingQuickReceiptId(null)
          setItemRows([])
          setSavedItemRows([])
          setSelectedRowIndex(null)
          shouldLoadRef.current = false
        }
        
        const localMax = itemRows.reduce((max, row) => {
          const sequence = extractReceiptSequence(row.receiptId)
          return sequence && sequence > max ? sequence : max
        }, 0)
        const fallbackSequence = localMax + 1
        const nextNumber = computeNextReceiptNumber(filtered as any, fallbackSequence)
        setNextReceiptNumber(nextNumber)
        setCurrentItem(prev => ({
          ...prev,
          receiptId: nextNumber
        }))
      }
    } catch (error) {
      console.error('Failed to load quick receipts:', error)
      toast.error('Failed to load quick receipts')
    } finally {
      setLoading(false)
    }
  }
  
  // Load receipts when date changes
  useEffect(() => {
    if (receiptDate && receiptDate !== prevDateRef.current) {
      prevDateRef.current = receiptDate
      if (shouldLoadRef.current) {
        loadQuickReceipts()
      }
    }
  }, [receiptDate])
  
  // Keep current receipt id in sync with counter
  useEffect(() => {
    setCurrentItem(prev => (
      prev.receiptId === nextReceiptNumber
        ? prev
        : { ...prev, receiptId: nextReceiptNumber }
    ))
  }, [nextReceiptNumber])
  
  // Handle account selection
  const handleAccountSelect = (accountId: string) => {
    const account = customerAccounts.find(a => a.id === accountId)
    if (account) {
      setCurrentItem(prev => ({
        ...prev,
        accountId: account.id,
        accountName: account.accountName
      }))
    }
  }
  
  // Handle payment mode change
  const handlePaymentModeChange = (mode: string) => {
    const paymentMode = mode as 'cash' | 'cheque' | 'upi' | 'banktransfer'
    setCurrentItem(prev => ({
      ...prev,
      paymentMode,
      // Reset payment details when changing mode
      dateOfTransaction: '',
      chequeNo: '',
      transactionId: '',
      upiId: '',
      accountNo: '',
      bank: '',
      branch: '',
      ifscNo: ''
    }))
    
    // Show appropriate modal
    if (paymentMode === 'cheque') {
      setShowChequeModal(true)
    } else if (paymentMode === 'banktransfer') {
      setShowBankTransferModal(true)
    } else if (paymentMode === 'upi') {
      setShowUPIModal(true)
    }
  }
  
  // Handle cheque details save
  const handleChequeDetailsSave = (details: ChequeDetails) => {
    setCurrentItem(prev => ({
      ...prev,
      dateOfTransaction: details.dateOfTransaction,
      chequeNo: details.chequeNo,
      accountNo: details.accountNo,
      bank: details.bank,
      branch: details.branch,
      ifscNo: details.ifscNo
    }))
  }
  
  // Handle bank transfer details save
  const handleBankTransferDetailsSave = (details: BankTransferDetails) => {
    setCurrentItem(prev => ({
      ...prev,
      dateOfTransaction: details.dateOfTransaction,
      transactionId: details.transactionId,
      accountNo: details.accountNo,
      bank: details.bank,
      branch: details.branch,
      ifscNo: details.ifscNo
    }))
  }
  
  // Handle UPI details save
  const handleUPIDetailsSave = (details: UPIDetails) => {
    setCurrentItem(prev => ({
      ...prev,
      dateOfTransaction: details.dateOfTransaction,
      transactionId: details.transactionId,
      upiId: details.upiId
    }))
  }
  
  // Calculate total amount
  useEffect(() => {
    const total = currentItem.amount - currentItem.discount
    setCurrentItem(prev => ({
      ...prev,
      totalAmount: Math.max(0, total)
    }))
  }, [currentItem.amount, currentItem.discount])
  
  // Add item to list
  const handleAddItem = () => {
    if (!currentItem.accountId) {
      toast.error('Please select an account')
      return
    }
    
    if (currentItem.amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    // Validate payment mode details
    if (currentItem.paymentMode === 'cheque' && !currentItem.chequeNo) {
      toast.error('Please enter cheque details')
      setShowChequeModal(true)
      return
    }
    
    if (currentItem.paymentMode === 'banktransfer' && !currentItem.transactionId) {
      toast.error('Please enter bank transfer details')
      setShowBankTransferModal(true)
      return
    }
    
    if (currentItem.paymentMode === 'upi' && !currentItem.transactionId) {
      toast.error('Please enter UPI details')
      setShowUPIModal(true)
      return
    }
    
    const accountName = currentItem.accountName || 
      customerAccounts.find(a => a.id === currentItem.accountId)?.accountName || ''

    const itemToAdd: Omit<ItemRow, 'tempId'> = {
      receiptId: currentItem.receiptId,
      accountId: currentItem.accountId,
      accountName,
      amount: currentItem.amount,
      discount: currentItem.discount,
      totalAmount: currentItem.totalAmount,
      remarks: currentItem.remarks,
      paymentMode: currentItem.paymentMode,
      dateOfTransaction: currentItem.dateOfTransaction,
      chequeNo: currentItem.chequeNo,
      transactionId: currentItem.transactionId,
      upiId: currentItem.upiId,
      accountNo: currentItem.accountNo,
      bank: currentItem.bank,
      branch: currentItem.branch,
      ifscNo: currentItem.ifscNo
    }
    
    // Start transaction if not already active
    if (!isTransactionActive) {
      dispatch(startTabTransaction({ 
        tabId, 
        transactionType: 'quickreceipt' 
      }))
    }
    
    if (editingItemTempId) {
      // Update existing item
      setItemRows(itemRows.map(row => 
        row.tempId === editingItemTempId 
          ? { ...row, ...itemToAdd }
          : row
      ))
      setEditingItemTempId(null)
      toast.success('Receipt item updated successfully')
    } else {
      // Add new item
      setItemRows([...itemRows, {
        tempId: `temp-${nextTempId}`,
        ...itemToAdd
      }])
      setNextTempId(prev => prev + 1)
      const upcomingReceiptId = incrementReceiptNumber(nextReceiptNumber)
      setNextReceiptNumber(upcomingReceiptId)
      toast.success('Receipt item added')
    }
    
    // Reset form
    const upcomingReceiptId = editingItemTempId ? nextReceiptNumber : incrementReceiptNumber(nextReceiptNumber)
    setCurrentItem(createEmptyReceiptItem({ receiptId: upcomingReceiptId }))
  }
  
  // Delete item from list
  const handleDeleteItem = (tempId: string) => {
    // Start transaction if not already active (delete operation starts transaction)
    if (!isTransactionActive) {
      dispatch(startTabTransaction({ 
        tabId, 
        transactionType: 'quickreceipt' 
      }))
    }
    
    setItemRows(prev => prev.filter(item => item.tempId !== tempId))
    toast.success('Receipt item removed')
  }
  
  // Toggle select all rows
  const toggleSelectAll = () => {
    if (selectedRows.length === itemRows.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(itemRows.map(row => row.tempId))
    }
  }
  
  // Delete selected rows (bulk delete)
  const deleteSelectedRows = () => {
    if (selectedRows.length === 0) return
    
    // Start transaction if not already active
    if (!isTransactionActive) {
      dispatch(startTabTransaction({ 
        tabId, 
        transactionType: 'quickreceipt' 
      }))
    }
    
    setItemRows(itemRows.filter(row => !selectedRows.includes(row.tempId)))
    const deletedCount = selectedRows.length
    setSelectedRows([])
    toast.success(`${deletedCount} item(s) deleted successfully`)
  }
  
  // Edit item from list
  const editItemFromList = (tempId: string) => {
    const itemToEdit = itemRows.find((row) => row.tempId === tempId)
    if (!itemToEdit) return

    // Set editing state
    setEditingItemTempId(tempId)

    // Populate the form with the item data
    setCurrentItem({
      receiptId: itemToEdit.receiptId,
      accountId: itemToEdit.accountId,
      accountName: itemToEdit.accountName,
      amount: itemToEdit.amount,
      discount: itemToEdit.discount,
      totalAmount: itemToEdit.totalAmount,
      remarks: itemToEdit.remarks,
      paymentMode: itemToEdit.paymentMode || 'cash',
      dateOfTransaction: itemToEdit.dateOfTransaction,
      chequeNo: itemToEdit.chequeNo,
      transactionId: itemToEdit.transactionId,
      upiId: itemToEdit.upiId,
      accountNo: itemToEdit.accountNo,
      bank: itemToEdit.bank,
      branch: itemToEdit.branch,
      ifscNo: itemToEdit.ifscNo
    })

    toast.info('Receipt item loaded for editing')
  }
  
  // Clear form inputs
  const clearInputs = () => {
    setCurrentItem(createEmptyReceiptItem({ receiptId: nextReceiptNumber }))
    setEditingItemTempId(null)
    toast.success('Inputs cleared')
  }
  
  // Toggle row selection for checkbox
  const toggleRowSelection = (tempId: string) => {
    setSelectedRows(prev => 
      prev.includes(tempId) 
        ? prev.filter(id => id !== tempId) 
        : [...prev, tempId]
    )
  }
  
  // Keyboard shortcuts: Enter to add item, Ctrl+S to save, arrows to navigate table
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInModal = target.closest('[role="dialog"]')
      
      // Enter key to add item
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (isInModal) {
          return // Let modal handle Enter
        } else {
          // Check if we have a selected row - toggle checkbox
          if (selectedRowIndex !== null && itemRows.length > 0) {
            e.preventDefault()
            const actualIndex = (currentPage - 1) * itemsPerPage + selectedRowIndex
            if (actualIndex < itemRows.length) {
              toggleRowSelection(itemRows[actualIndex].tempId)
            }
          } else {
            // Add to list (skip for textareas and combobox elements)
            if (target.tagName === 'TEXTAREA' || target.hasAttribute('role')) {
              return
            }
            e.preventDefault()
            handleAddItem()
          }
        }
      }
      
      // Arrow Down: Navigate to next row
      if (e.key === 'ArrowDown' && !isInModal && itemRows.length > 0) {
        e.preventDefault()
        setSelectedRowIndex(prev => {
          const totalPageRows = Math.min(itemsPerPage, itemRows.length - (currentPage - 1) * itemsPerPage)
          if (prev === null) return 0
          return Math.min(prev + 1, totalPageRows - 1)
        })
      }
      
      // Arrow Up: Navigate to previous row
      if (e.key === 'ArrowUp' && !isInModal && itemRows.length > 0) {
        e.preventDefault()
        setSelectedRowIndex(prev => {
          if (prev === null) return 0
          return Math.max(prev - 1, 0)
        })
      }
      
      // Delete key: Remove all checked rows
      if (e.key === 'Delete' && !isInModal && selectedRows.length > 0) {
        e.preventDefault()
        deleteSelectedRows()
        // Reset selectedRowIndex if needed
        const remainingRows = itemRows.length - selectedRows.length
        if (remainingRows === 0) {
          setSelectedRowIndex(null)
        } else if (selectedRowIndex !== null) {
          const totalPageRows = Math.min(itemsPerPage, remainingRows - (currentPage - 1) * itemsPerPage)
          if (selectedRowIndex >= totalPageRows) {
            setSelectedRowIndex(Math.max(0, totalPageRows - 1))
          }
        }
      }
      
      // Ctrl+S to save transaction
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentItem, itemRows, receiptDate, selectedRowIndex, currentPage, itemsPerPage, selectedRows])
  
  // Save quick receipt
  const handleSave = async () => {
    // Allow saving with 0 items only if we're editing (to delete the receipt)
    if (itemRows.length === 0 && !editingQuickReceiptId) {
      toast.error('Please add at least one receipt item')
      return
    }
    
    if (!receiptDate) {
      toast.error('Please select a receipt date')
      return
    }
    
    try {
      setSubmitting(true)
      
      if (!activeCompanyId) {
        toast.error('Select a company to continue')
        return
      }

      // Prepare items for save
      const preparedItems = itemRows.map(item => ({
        receiptId: item.receiptId,
        accountId: item.accountId,
        amount: item.amount,
        discount: item.discount,
        totalAmount: item.totalAmount,
        remarks: item.remarks || undefined,
        paymentMode: item.paymentMode,
        dateOfTransaction: item.dateOfTransaction || null,
        chequeNo: item.chequeNo || null,
        transactionId: item.transactionId || null,
        upiId: item.upiId || null,
        accountNo: item.accountNo || null,
        bank: item.bank || null,
        branch: item.branch || null,
        ifscNo: item.ifscNo || null
      }))

      let result

      if (editingQuickReceiptId) {
        // If editing and no items, delete the receipt
        if (itemRows.length === 0) {
          result = await window.api.quickReceipt.delete(editingQuickReceiptId)
          if (result.success) {
            toast.success('Quick receipt deleted successfully')
          }
        } else {
          // Update existing receipt
          result = await window.api.quickReceipt.update(editingQuickReceiptId, {
            receiptDate,
            items: preparedItems
          })
          if (result.success) {
            toast.success('Quick receipt updated successfully')
          }
        }
      } else {
        // Create new receipt
        result = await window.api.quickReceipt.create({
          companyId: activeCompanyId,
          receiptDate,
          items: preparedItems
        })
        if (result.success) {
          toast.success('Quick receipt saved successfully')
        }
      }
      
      if (result.success) {
        // Update saved state to match current items (transaction complete)
        setSavedItemRows([...itemRows])
        
        // Clear selection
        setSelectedRows([])
        setSelectedRowIndex(null)
        
        // End transaction - saved is true so it's complete
        dispatch(endTabTransaction({ tabId, saved: true }))
        
        // Broadcast save event
        broadcastQuickReceiptSave()
        
        // Enable loading for the reload
        shouldLoadRef.current = true
        
        // Reload receipts to get the saved data
        await loadQuickReceipts()
      } else {
        toast.error(result.error || 'Failed to save quick receipt')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save quick receipt')
    } finally {
      setSubmitting(false)
    }
  }
  
  // Cancel transaction - show alert
  const handleCancel = () => {
    // Only show confirmation if there are unsaved changes
    if (itemRows.length > 0 || JSON.stringify(itemRows) !== JSON.stringify(savedItemRows)) {
      setShowCancelAlert(true)
    } else {
      dispatch(endTabTransaction({ tabId }))
    }
  }
  
  // Confirm cancel transaction
  const confirmCancel = () => {
    // Restore from saved state
    setItemRows([...savedItemRows])
    
    // End transaction
    dispatch(endTabTransaction({ 
      tabId, 
      saved: false 
    }))
    
    setShowCancelAlert(false)
    toast.success('Changes cancelled - restored to last saved state')
  }
  
  // Handle refresh
  const handleRefresh = () => {
    loadQuickReceipts()
    toast.success('Refreshed')
  }
  
  // Calculate summary
  const summary = itemRows.reduce((acc, item) => ({
    amount: acc.amount + item.amount,
    discount: acc.discount + item.discount,
    totalAmount: acc.totalAmount + item.totalAmount
  }), { amount: 0, discount: 0, totalAmount: 0 })
  
  // Pagination
  const totalPages = Math.ceil(itemRows.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedRows = itemRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const endIndex = startIndex + paginatedRows.length
  
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Quick Receipt</h1>
            <p className="text-sm text-muted-foreground">
              Company: {activeCompanyName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Date</Label>
          <Input
            type="date"
            value={receiptDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const val = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (val > today) return
              setReceiptDate(val)
            }}
            className="w-40"
          />
          <Button
            variant="ghost"
            size="icon"
            title="Print"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {isTransactionActive && (
            <>
              <Button
                onClick={handleSave}
                disabled={submitting}
                variant="success"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
              >
                Cancel Transaction
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-[1400px] mx-auto space-y-4">
            {/* Current Item Entry */}
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-3 items-end">
                  {/* Receipt No */}
                  <div className="col-span-1">
                    <Label className="text-sm font-semibold mb-1">Receipt No</Label>
                    <Input
                      value={currentItem.receiptId}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  {/* Account Name */}
                  <div className="col-span-3">
                    <Label className="text-sm font-semibold mb-1">Account</Label>
                    <Combobox
                      options={customerAccounts.map(account => ({ 
                        value: account.id, 
                        label: account.accountName 
                      }))}
                      value={currentItem.accountId}
                      onChange={handleAccountSelect}
                      onCreateNew={() => {
                        setNewAccountName('')
                        setShowAccountCreateDialog(true)
                      }}
                      placeholder="Select account"
                      searchPlaceholder="Search accounts..."
                      emptyText="No account found"
                      createNewLabel="+ Create New Account"
                    />
                  </div>

                  {/* Amount */}
                  <div className="col-span-1">
                    <Label className="text-sm font-semibold mb-1">Amount</Label>
                    <Input
                      type="number"
                      value={currentItem.amount || ''}
                      onChange={(e) => setCurrentItem(prev => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  {/* Discount */}
                  <div className="col-span-1">
                    <Label className="text-sm font-semibold mb-1">Discount</Label>
                    <Input
                      type="number"
                      value={currentItem.discount || ''}
                      onChange={(e) => setCurrentItem(prev => ({
                        ...prev,
                        discount: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  {/* Total Amount */}
                  <div className="col-span-1">
                    <Label className="text-sm font-semibold mb-1">Total</Label>
                    <Input
                      value={currentItem.totalAmount.toFixed(2)}
                      disabled
                      className="bg-muted font-semibold"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold mb-1">Payment Mode</Label>
                    <Select
                      value={currentItem.paymentMode}
                      onValueChange={handlePaymentModeChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="banktransfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Remarks */}
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold mb-1">Remarks</Label>
                    <Textarea
                      value={currentItem.remarks ?? ''}
                      onChange={(e) => setCurrentItem(prev => ({
                        ...prev,
                        remarks: e.target.value
                      }))}
                      placeholder="Enter remarks"
                      rows={1}
                      className="resize-none"
                    />
                  </div>

                  {/* Add/Update Button */}
                  <div className="col-span-1">
                    <Label className="text-sm font-semibold mb-1">&nbsp;</Label>
                    <div className="flex flex-col gap-1">
                      {hasInputValues && (
                        <Button
                          onClick={clearInputs}
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
                        >
                          Clear Input
                        </Button>
                      )}
                      <Button 
                        onClick={handleAddItem}
                        className="w-full h-10"
                        variant="default"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {editingItemTempId ? 'Update' : 'Add'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Receipt Items Table */}
            <Card>
              {selectedRows.length > 0 && (
                <div className="flex items-center justify-between p-4 border-b">
                  <span className="text-sm font-medium">
                    {selectedRows.length} item(s) selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelectedRows}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              )}
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold w-12">
                        <Checkbox
                          checked={itemRows.length > 0 && selectedRows.length === itemRows.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-bold">S.N</TableHead>
                      <TableHead className="font-bold">Receipt No</TableHead>
                      <TableHead className="font-bold">Account</TableHead>
                      <TableHead className="font-bold text-right">Amount</TableHead>
                      <TableHead className="font-bold text-right">Discount</TableHead>
                      <TableHead className="font-bold text-right">Total</TableHead>
                      <TableHead className="font-bold">Payment Mode</TableHead>
                      <TableHead className="font-bold">Remarks</TableHead>
                      <TableHead className="font-bold text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                      {paginatedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                            No receipts added yet. Add receipts using the form above.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRows.map((row, index) => {
                          const actualIndex = startIndex + index
                          const isSelected = selectedRowIndex === index
                          const account = customerAccounts.find(a => a.id === row.accountId)
                          const accountLabel = row.accountName || account?.accountName || 'Unknown'
                          return (
                            <TableRow 
                              key={row.tempId} 
                              className={`cursor-pointer ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                              onDoubleClick={() => editItemFromList(row.tempId)}
                              onClick={() => setSelectedRowIndex(index)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  checked={selectedRows.includes(row.tempId)}
                                  onCheckedChange={() => {
                                    if (selectedRows.includes(row.tempId)) {
                                      setSelectedRows(prev => prev.filter(id => id !== row.tempId))
                                    } else {
                                      setSelectedRows(prev => [...prev, row.tempId])
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{itemRows.length - actualIndex}</TableCell>
                              <TableCell className="font-medium">{row.receiptId}</TableCell>
                              <TableCell>{accountLabel}</TableCell>
                              <TableCell className="text-right">₹{row.amount.toFixed(2)}</TableCell>
                              <TableCell className="text-right">₹{row.discount.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-semibold">₹{row.totalAmount.toFixed(2)}</TableCell>
                              <TableCell className="uppercase">{row.paymentMode}</TableCell>
                              <TableCell>{row.remarks || '-'}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      editItemFromList(row.tempId)
                                    }}
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteItem(row.tempId)
                                    }}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  {itemRows.length > 0 && (
                    <div className="flex items-center justify-between p-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                          setItemsPerPage(Number(value))
                          setCurrentPage(1)
                          setSelectedRowIndex(null)
                        }}>
                          <SelectTrigger className="w-20 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground ml-4">
                          {startIndex + 1}-{Math.min(endIndex, itemRows.length)} of {itemRows.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentPage(prev => Math.max(1, prev - 1))
                            setSelectedRowIndex(null)
                          }}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentPage(prev => Math.min(totalPages, prev + 1))
                            setSelectedRowIndex(null)
                          }}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>
        </div>
      </div>

      {/* Summary Footer - Fixed at Bottom */}
      <div className="border-t bg-white shadow-lg">
        <div className="max-w-[1400px] mx-auto p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Amount</div>
              <div className="text-xl font-bold">{summary.amount.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Discount</div>
              <div className="text-xl font-bold">{summary.discount.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Amount</div>
              <div className="text-xl font-bold text-primary">{summary.totalAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Mode Modals */}
      <ChequeDetailsModal
        open={showChequeModal}
        onClose={() => setShowChequeModal(false)}
        onSave={handleChequeDetailsSave}
        initialData={currentItem.chequeNo ? {
          dateOfTransaction: currentItem.dateOfTransaction || formatDateToISO(new Date()),
          chequeNo: currentItem.chequeNo || '',
          accountNo: currentItem.accountNo || '',
          bank: currentItem.bank || '',
          branch: currentItem.branch || '',
          ifscNo: currentItem.ifscNo || ''
        } : undefined}
      />

      <BankTransferDetailsModal
        open={showBankTransferModal}
        onClose={() => setShowBankTransferModal(false)}
        onSave={handleBankTransferDetailsSave}
        initialData={currentItem.transactionId && currentItem.paymentMode === 'banktransfer' ? {
          dateOfTransaction: currentItem.dateOfTransaction || formatDateToISO(new Date()),
          transactionId: currentItem.transactionId || '',
          accountNo: currentItem.accountNo || '',
          bank: currentItem.bank || '',
          branch: currentItem.branch || '',
          ifscNo: currentItem.ifscNo || ''
        } : undefined}
      />

      <UPIDetailsModal
        open={showUPIModal}
        onClose={() => setShowUPIModal(false)}
        onSave={handleUPIDetailsSave}
        initialData={currentItem.upiId ? {
          dateOfTransaction: currentItem.dateOfTransaction || formatDateToISO(new Date()),
          transactionId: currentItem.transactionId || '',
          upiId: currentItem.upiId
        } : undefined}
      />

      {/* Account Create Dialog */}
      <AccountCreateDialog
        open={showAccountCreateDialog}
        onOpenChange={(open) => {
          setShowAccountCreateDialog(open)
          if (!open) loadAccounts()
        }}
        onAccountCreated={() => {
          loadAccounts()
          setShowAccountCreateDialog(false)
        }}
        initialName={newAccountName}
      />

      {/* Cancel Transaction Alert Dialog */}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              All unsaved changes will be lost and the transaction will revert to the last saved state.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>
              Yes, Cancel Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
