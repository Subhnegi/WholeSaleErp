import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { startTabTransaction, endTabTransaction, selectTabTransactionState } from '@/store/slices/tabSlice'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Combobox } from '@/components/ui/combobox'
import { toast } from 'sonner'
import { Edit3, Plus, Trash2, Save, Printer, RefreshCw } from 'lucide-react'
import { AccountFormModal } from '@/components/AccountFormModal'
import { ItemFormModal } from '@/components/ItemFormModal'
import type {
  Voucher,
  CreateVoucherItemInput,
  CreateVoucherChargeInput,
  VoucherItemRow,
  VoucherChargeRow
} from '@/types/voucher'
import type { Item } from '@/types/item'
import type { Account } from '@/types/account'
import type { CrateMarka } from '@/types/crate'
import { ArrowLeft } from 'lucide-react'
// import type { ArrivalType } from '@/types/arrivalType'

// OtherChargesHead interface for charge types
interface OtherChargesHead {
  id: string
  headingName: string
  chargeType: 'plus' | 'minus'
  feedAs: 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti'
}

interface DailySaleFormPageProps {
  tabId: string
  currentRoute?: string  // Tab's stored route (to extract ID correctly with multiple tabs)
}

export function DailySaleFormPage({ tabId, currentRoute }: DailySaleFormPageProps) {
  const navigate = useNavigate()
  // Extract ID from currentRoute (tab's stored route) instead of useParams()
  // This prevents issues when multiple tabs are open and browser URL differs from tab route
  const pathParts = (currentRoute || '').split('/')
  const isEditPath = pathParts.includes('edit')
  const id = isEditPath ? pathParts[pathParts.length - 1] : undefined
  const location = useLocation()
  const { activeCompany } = useAppSelector((state) => state.company)
  const dispatch = useAppDispatch()
  const tabTransactionState = useAppSelector((state) => selectTabTransactionState(state, tabId))

  // Get voucher from location state if passed during navigation
  // Use a ref to preserve the initial value and prevent re-triggering when location changes due to tab switching
  const initialVoucherFromState = useRef<Voucher | undefined>(location.state?.voucher as Voucher | undefined)
  const [voucher, setVoucher] = useState<Voucher | null>(initialVoucherFromState.current || null)
  // Track if we've already loaded/received the voucher data to prevent re-loading on tab switch
  const hasLoadedVoucher = useRef(!!initialVoucherFromState.current)
  const [loading, setLoading] = useState(false)
  const companyId = activeCompany?.id || ''
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('items')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)

  // Load voucher if editing and not passed via state
  useEffect(() => {
    const loadVoucher = async () => {
      // Skip if we already have the voucher data (either from state or previous load)
      if (hasLoadedVoucher.current) return
      
      if (id && activeCompany) {
        setLoading(true)
        try {
          // Load voucher by fetching and filtering since getById may not exist
          const response = await window.api.voucher.list(activeCompany.id, {})
          if (response.success && response.data) {
            const foundVoucher = response.data.find((v) => v.id === id)
            if (foundVoucher) {
              setVoucher(foundVoucher)
              hasLoadedVoucher.current = true
            } else {
              toast.error('Voucher not found')
              navigate('/entries/daily-sale')
            }
          } else {
            toast.error(response.error || 'Failed to load voucher')
            navigate('/entries/daily-sale')
          }
        } catch (error: any) {
          console.error('Load voucher error:', error)
          toast.error(error.message || 'An error occurred')
          navigate('/entries/daily-sale')
        } finally {
          setLoading(false)
        }
      }
    }
    loadVoucher()
  }, [id, activeCompany, navigate])

  // Data lists
  const [items, setItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [crateMarkas, setCrateMarkas] = useState<CrateMarka[]>([])
  // const [arrivalTypes, setArrivalTypes] = useState<ArrivalType[]>([])

  // Filtered account lists
  const supplierAccounts = accounts.filter(
    (account) =>
      account.accountGroup?.name?.toLowerCase().includes('sundry creditor') ||
      account.accountGroup?.name?.toLowerCase().includes('supplier')
  )
  const customerAccounts = accounts.filter(
    (account) =>
      account.accountGroup?.name?.toLowerCase().includes('sundry debtor') ||
      account.accountGroup?.name?.toLowerCase().includes('customer')
  )

  // Form data - Header
  const [voucherDate, setVoucherDate] = useState('')
  const [voucherNo, setVoucherNo] = useState('') // Auto-generated voucher number
  const [accountId, setAccountId] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')

  // Form data - Items
  const [itemRows, setItemRows] = useState<VoucherItemRow[]>([])
  const [nextItemTempId, setNextItemTempId] = useState(1)

  // Editing state for items
  const [editingItemTempId, setEditingItemTempId] = useState<string | null>(null)

  // Current item being entered (form fields)
  const [currentItemId, setCurrentItemId] = useState('')
  const [currentAccountId, setCurrentAccountId] = useState('')
  const [currentNetRate, setCurrentNetRate] = useState(false)
  const [currentNug, setCurrentNug] = useState(0)
  const [currentWeight, setCurrentWeight] = useState(0)
  const [currentCustomerPrice, setCurrentCustomerPrice] = useState(0)
  const [currentSupplierPrice, setCurrentSupplierPrice] = useState(0)
  const [currentPer, setCurrentPer] = useState<'nug' | 'kg'>('nug')

  // Full modals for creation
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showChargeAccountModal, setShowChargeAccountModal] = useState(false)
  
  // OtherChargesHead state for charges (same as Arrival Entry)
  const [otherChargesHeads, setOtherChargesHeads] = useState<OtherChargesHead[]>([])
  const [selectedChargeHeadId, setSelectedChargeHeadId] = useState('')
  const [selectedChargeHeadFeedAs, setSelectedChargeHeadFeedAs] = useState<string>('')
  const [chargeOnValue, setChargeOnValue] = useState('')
  const [chargePer, setChargePer] = useState('')
  const [chargeAtRate, setChargeAtRate] = useState('')
  const [chargeNo, setChargeNo] = useState('')
  const [chargePlusMinus, setChargePlusMinus] = useState<'+' | '-'>('+')
  const [chargeAmount, setChargeAmount] = useState('')
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null)
  const [nextChargeTempId, setNextChargeTempId] = useState(1)

  // Form data - Named charges (unused for now)
  // const [chargeOneLabel, setChargeOneLabel] = useState('Charge 1')
  const [chargeOne, setChargeOne] = useState(0)
  // const [chargeTwoLabel, setChargeTwoLabel] = useState('Charge 2')
  const [chargeTwo, setChargeTwo] = useState(0)
  // const [chargeThreeLabel, setChargeThreeLabel] = useState('Charge 3')
  const [chargeThree, setChargeThree] = useState(0)
  // const [chargeFourLabel, setChargeFourLabel] = useState('Charge 4')
  const [chargeFour, setChargeFour] = useState(0)
  // const [chargeFiveLabel, setChargeFiveLabel] = useState('Charge 5')
  const [chargeFive, setChargeFive] = useState(0)

  // Form data - Dynamic charges
  const [chargeRows, setChargeRows] = useState<VoucherChargeRow[]>([])
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([])
  // const [nextChargeTempId, setNextChargeTempId] = useState(1)

  // Additional charge fields
  const [transport, setTransport] = useState('')
  const [freight, setFreight] = useState('')
  const [grRrNo, setGrRrNo] = useState('')
  const [narration, setNarration] = useState('')
  const [advancePayment, setAdvancePayment] = useState(0)
  const [roundOff, setRoundOff] = useState<'none' | 'up' | 'down'>('none')

  // Table state for items
  const [itemSearch, setItemSearch] = useState('')
  const [itemSortColumn, setItemSortColumn] = useState<
    'itemName' | 'nug' | 'weight' | 'basicAmount'
  >('itemName')
  const [itemSortDirection, setItemSortDirection] = useState<'asc' | 'desc'>('asc')
  const [itemCurrentPage, setItemCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  // Expense modal state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [expenseCommissionPer, setExpenseCommissionPer] = useState(0)
  const [expenseCommission, setExpenseCommission] = useState(0)
  const [expenseMarketFees, setExpenseMarketFees] = useState(0)
  const [expenseRdf, setExpenseRdf] = useState(0)
  const [expenseBardanaAt, setExpenseBardanaAt] = useState(0)
  const [expenseBardana, setExpenseBardana] = useState(0)
  const [expenseLagaAt, setExpenseLagaAt] = useState(0)
  const [expenseLaga, setExpenseLaga] = useState(0)
  const [expenseCrateMarkaId, setExpenseCrateMarkaId] = useState('')
  const [expenseCrateCount, setExpenseCrateCount] = useState(0)
  // Preview of net amount (basic + expenses + crate) shown above Net Amt field
  const [previewNetAmount, setPreviewNetAmount] = useState(0)

  // Load data on mount
  useEffect(() => {
    if (activeCompany?.id) {
      loadItems()
      loadAccounts()
      loadCrateMarkas()
      loadOtherChargesHeads()
    }
  }, [activeCompany?.id])

  // Update selected charge head feedAs when selection changes
  useEffect(() => {
    const chargeHead = otherChargesHeads.find(ch => ch.id === selectedChargeHeadId)
    if (chargeHead) {
      setSelectedChargeHeadFeedAs(chargeHead.feedAs)
      // Set default plus/minus based on charge type
      setChargePlusMinus(chargeHead.chargeType === 'minus' ? '-' : '+')
    } else {
      setSelectedChargeHeadFeedAs('')
    }
  }, [selectedChargeHeadId, otherChargesHeads])

  // Auto-calculate charge amount based on feedAs (same as Arrival Entry)
  useEffect(() => {
    if (!selectedChargeHeadFeedAs || selectedChargeHeadFeedAs === 'absolute') return

    const onValue = parseFloat(chargeOnValue) || 0
    const per = parseFloat(chargePer) || 0
    const atRate = parseFloat(chargeAtRate) || 0
    const no = parseFloat(chargeNo) || 0

    let calculatedAmount = 0

    switch (selectedChargeHeadFeedAs) {
      case 'percentage':
        // percentage of onValue
        calculatedAmount = (onValue * atRate) / 100
        break
      case 'onWeight':
        // per kg rate: onValue (total kg) / per (per kg) * atRate
        if (per > 0) {
          calculatedAmount = (onValue / per) * atRate
        } else {
          calculatedAmount = onValue * atRate
        }
        break
      case 'onNug':
      case 'onPetti':
        // count based: no * atRate
        if (no > 0) {
          calculatedAmount = no * atRate
        } else {
          calculatedAmount = onValue * atRate
        }
        break
    }

    if (calculatedAmount > 0) {
      setChargeAmount(calculatedAmount.toFixed(2))
    }
  }, [selectedChargeHeadFeedAs, chargeOnValue, chargePer, chargeAtRate, chargeNo])

  // Main scroll container ref (used for ArrowUp/ArrowDown scrolling)
  const mainScrollRef = useRef<HTMLDivElement | null>(null)

  // Keyboard handler: ArrowUp/ArrowDown scroll main content; ArrowLeft/ArrowRight switch tabs
  // Handler ref for Ctrl+S to access latest handleSubmit
  const handleSubmitRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S to save - works from anywhere
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (handleSubmitRef.current && !submitting) {
          handleSubmitRef.current()
        }
        return
      }

      // Ignore if inside inputs/select/textarea or dialogs for other shortcuts
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.closest('[role="dialog"]')) {
          return
        }
      }

      const scrollEl = mainScrollRef.current
      const scrollStep = 120

      if (e.key === 'ArrowDown') {
        if (scrollEl) {
          e.preventDefault()
          scrollEl.scrollBy({ top: scrollStep, behavior: 'smooth' })
        }
      } else if (e.key === 'ArrowUp') {
        if (scrollEl) {
          e.preventDefault()
          scrollEl.scrollBy({ top: -scrollStep, behavior: 'smooth' })
        }
      } else if (e.key === 'ArrowLeft') {
        // switch to previous tab
        if (activeTab === 'charges') {
          e.preventDefault()
          setActiveTab('items')
        }
      } else if (e.key === 'ArrowRight') {
        // switch to next tab
        if (activeTab === 'items') {
          e.preventDefault()
          setActiveTab('charges')
        }
      }
    }

    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [activeTab, submitting])

  // Initialize form when voucher changes
  useEffect(() => {
    if (voucher) {
      setVoucherDate(voucher.voucherDate)
      setAccountId(voucher.supplierId || voucher.accountId || '')
      setVehicleNo(voucher.vehicleNo || '')
      setChargeOne(voucher.chargeOne || 0)
      setChargeTwo(voucher.chargeTwo || 0)
      setChargeThree(voucher.chargeThree || 0)
      setChargeFour(voucher.chargeFour || 0)
      setChargeFive(voucher.chargeFive || 0)

      // Items
      if (voucher.items) {
        setItemRows(
          voucher.items.map((item, index) => ({
            tempId: `existing-${index}`,
            itemId: item.itemId,
            itemName: item.itemName || '',
            customerId: item.customerId || '',
            customerName: item.customerName || '',
            arrivalTypeId: item.arrivalTypeId,
            arrivalTypeName: item.arrivalTypeName,
            crateMarkaId: item.crateMarkaId,
            crateMarkaName: item.crateMarkaName,
            quantity: item.nug || item.quantity || 0,
            crates: item.crateQty || item.crates,
            weight: item.weight || 0,
            customerRate: item.customerPrice || item.customerRate || 0,
            customerAmount: item.basicAmount || item.customerAmount || 0,
            customerRetail: item.netAmount || item.customerRetail || 0,
            supplierRate: item.supplierPrice || item.supplierRate || 0,
            supplierAmount: item.supplierPrice
              ? (item.per === 'nug' ? item.nug || 0 : item.weight || 0) * item.supplierPrice
              : item.supplierAmount || 0,
            supplierRetail: item.supplierRetail || 0,
            per: item.per,
            useNetRate: item.netRate ?? item.useNetRate ?? false,
            commission: item.commission || 0,
            commissionPer: item.commissionPer || 0,
            marketFees: item.marketFees || 0,
            rdf: item.rdf || 0,
            bardana: item.bardana || 0,
            bardanaAt: item.bardanaAt || 0,
            laga: item.laga || 0,
            lagaAt: item.lagaAt || 0,
            totalExpenses:
              item.totalExpenses ||
              (item.commission || 0) +
                (item.marketFees || 0) +
                (item.rdf || 0) +
                (item.bardana || 0) +
                (item.laga || 0),
            cratesTotalQuantity: item.cratesTotalQuantity,
            cratesAadQuantity: item.cratesAadQuantity,
            cratesPerCrate: item.cratesPerCrate,
            cratesPurQuantity: item.cratesPurQuantity,
            cratesPurAmount: item.cratesPurAmount,
            notes: item.notes
          }))
        )
      }

      // Dynamic charges
      if (voucher.charges) {
        setChargeRows(
          voucher.charges.map((charge, index) => ({
            tempId: `existing-${index}`,
            label: charge.chargeName || charge.label || '',
            chargeName: charge.chargeName || charge.label || '',
            onValue: charge.onValue || 0,
            atRate: charge.atRate || 0,
            plusMinus: charge.plusMinus || (charge.isAddition ? '+' : '-'),
            amount: charge.amount || 0,
            isAddition: charge.plusMinus ? charge.plusMinus === '+' : (charge.isAddition ?? true),
            appliedAmount: charge.appliedAmount || charge.amount || 0
          }))
        )
      }
    } else {
      // Reset for new voucher
      const today = new Date()
      const year = today.getFullYear()
      const month = (today.getMonth() + 1).toString().padStart(2, '0')
      const day = today.getDate().toString().padStart(2, '0')
      setVoucherDate(`${year}-${month}-${day}`)

      // Generate voucher number: DS-YYYYMMDD-XXX format
      const timestamp = Date.now().toString().slice(-3) // Last 3 digits of timestamp
      const generatedVoucherNo = `DS-${year}${month}${day}-${timestamp}`
      setVoucherNo(generatedVoucherNo)

      setAccountId('')
      setVehicleNo('')
      setItemRows([])
      setChargeRows([])
      setNextItemTempId(1)
      setChargeOne(0)
      setChargeTwo(0)
      setChargeThree(0)
      setChargeFour(0)
      setChargeFive(0)
    }
  }, [voucher])

  const loadItems = async () => {
    try {
      const response = await window.api.item.listByCompany(companyId)
      if (response.success && response.data) {
        setItems(response.data)
      }
    } catch (error) {
      console.error('Load items error:', error)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await window.api.account.listByCompany(companyId)
      if (response.success && response.data) {
        setAccounts(response.data)
      }
    } catch (error) {
      console.error('Load accounts error:', error)
    }
  }

  const loadCrateMarkas = async () => {
    try {
      const response = await window.api.crate.listByCompany(companyId)
      if (response.success && response.data) {
        setCrateMarkas(response.data)
      }
    } catch (error) {
      console.error('Load crate markas error:', error)
    }
  }

  const loadOtherChargesHeads = async () => {
    try {
      const response = await window.api.otherChargesHead.listByCompany(companyId)
      if (response.success && response.data) {
        setOtherChargesHeads(response.data)
      }
    } catch (error) {
      console.error('Load other charges heads error:', error)
    }
  }

  const removeItemRow = (tempId: string) => {
    if (!tabTransactionState.isActive) {
      dispatch(startTabTransaction({ tabId, transactionType: 'daily-sale' }))
    }
    setItemRows(itemRows.filter((row) => row.tempId !== tempId))
    setHasUnsavedChanges(true)
  }

  const removeBulkItems = () => {
    if (!tabTransactionState.isActive) {
      dispatch(startTabTransaction({ tabId, transactionType: 'daily-sale' }))
    }
    setItemRows(itemRows.filter((row) => !selectedItemIds.includes(row.tempId)))
    setSelectedItemIds([])
    setHasUnsavedChanges(true)
    toast.success(`${selectedItemIds.length} item(s) deleted`)
  }

  const toggleItemSelection = (tempId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(tempId) ? prev.filter((id) => id !== tempId) : [...prev, tempId]
    )
  }

  const toggleSelectAllItems = (filteredItems: VoucherItemRow[]) => {
    if (selectedItemIds.length === filteredItems.length) {
      setSelectedItemIds([])
    } else {
      setSelectedItemIds(filteredItems.map((item) => item.tempId))
    }
  }

  // Add charge to the list (same logic as Arrival Entry)
  const handleAddCharge = () => {
    if (!selectedChargeHeadId) {
      toast.error('Please select a charges head')
      return
    }

    const chargeHead = otherChargesHeads.find((ch) => ch.id === selectedChargeHeadId)
    if (!chargeHead) {
      toast.error('Invalid charges head')
      return
    }

    const amountVal = parseFloat(chargeAmount) || 0

    const newCharge: VoucherChargeRow = {
      tempId: editingChargeId || `charge-${nextChargeTempId}`,
      otherChargesId: chargeHead.id,
      label: chargeHead.headingName,
      chargeName: chargeHead.headingName,
      feedAs: chargeHead.feedAs,
      onValue: parseFloat(chargeOnValue) || 0,
      per: parseFloat(chargePer) || null,
      atRate: parseFloat(chargeAtRate) || 0,
      no: parseFloat(chargeNo) || null,
      plusMinus: chargePlusMinus,
      amount: amountVal,
      isAddition: chargePlusMinus === '+',
      appliedAmount: amountVal
    }

    if (editingChargeId) {
      // Update existing charge
      setChargeRows(chargeRows.map((row) => (row.tempId === editingChargeId ? newCharge : row)))
      setEditingChargeId(null)
      toast.success('Charge updated successfully')
      if (!tabTransactionState.isActive) {
        dispatch(startTabTransaction({ tabId, transactionType: 'daily-sale' }))
      }
      setHasUnsavedChanges(true)
    } else {
      // Add new charge
      setChargeRows((prev) => [...prev, newCharge])
      setNextChargeTempId((prev) => prev + 1)
      toast.success('Charge added successfully')
      if (!tabTransactionState.isActive) {
        dispatch(startTabTransaction({ tabId, transactionType: 'daily-sale' }))
      }
      setHasUnsavedChanges(true)
    }

    // Reset form
    setSelectedChargeHeadId('')
    setChargeOnValue('')
    setChargePer('')
    setChargeAtRate('')
    setChargeNo('')
    setChargePlusMinus('+')
    setChargeAmount('')
    setHasUnsavedChanges(true)
  }

  // Remove charge from the list
  const removeChargeRow = (tempId: string) => {
    if (!tabTransactionState.isActive) {
      dispatch(startTabTransaction({ tabId, transactionType: 'daily-sale' }))
    }
    setChargeRows((prev) => prev.filter((row) => row.tempId !== tempId))
    setHasUnsavedChanges(true)
  }

  const removeBulkCharges = () => {
    setChargeRows(chargeRows.filter((row) => !selectedChargeIds.includes(row.tempId)))
    setSelectedChargeIds([])
    toast.success(`${selectedChargeIds.length} charge(s) deleted`)
  }

  const toggleChargeSelection = (tempId: string) => {
    setSelectedChargeIds((prev) =>
      prev.includes(tempId) ? prev.filter((id) => id !== tempId) : [...prev, tempId]
    )
  }

  const toggleSelectAllCharges = () => {
    if (selectedChargeIds.length === chargeRows.length) {
      setSelectedChargeIds([])
    } else {
      setSelectedChargeIds(chargeRows.map((charge) => charge.tempId))
    }
  }

  // Calculate summary
  const calculateSummary = () => {
    const totalItems = itemRows.length
    const totalQuantity = itemRows.reduce((sum, row) => sum + row.quantity, 0)
    const totalCrates = itemRows.reduce((sum, row) => sum + (row.crates || 0), 0)
    const totalWeight = itemRows.reduce((sum, row) => sum + row.weight, 0)
    const subTotal = itemRows.reduce((sum, row) => sum + row.customerAmount, 0)
    const totalExpenses = itemRows.reduce((sum, row) => sum + row.totalExpenses, 0)
    // Sum of supplier-side values (seller item value) — supplierAmount is calculated as
    // supplierPrice * quantity (nug or weight) when items are added.
    const sellersItemValue = itemRows.reduce((sum, row) => sum + (row.supplierAmount || 0), 0)

    const namedCharges = chargeOne + chargeTwo + chargeThree + chargeFour + chargeFive
    // Dynamic charges: add (+) charges, subtract (-) charges
    const dynamicCharges = chargeRows.reduce((sum, row) => {
      return row.isAddition ? sum + row.appliedAmount : sum - row.appliedAmount
    }, 0)
    const totalCharges = namedCharges + dynamicCharges

    // Total amount = seller item value - other charges (+ transport + freight). Transport/freight are stored as strings in state.
    const transportValue = Number(transport) || 0
    const freightValue = Number(freight) || 0
    let grandTotal = sellersItemValue + totalCharges + transportValue + freightValue

    // Apply roundoff
    let roundOffAmount = 0
    if (roundOff === 'up') {
      const rounded = Math.ceil(grandTotal)
      roundOffAmount = rounded - grandTotal
      grandTotal = rounded
    } else if (roundOff === 'down') {
      const rounded = Math.floor(grandTotal)
      roundOffAmount = rounded - grandTotal
      grandTotal = rounded
    }

    return {
      totalItems,
      totalQuantity,
      totalCrates,
      totalWeight,
      subTotal,
      totalExpenses,
      // seller-side aggregated value
      sellersItemValue,
      totalCharges,
      roundOffAmount,
      grandTotal
    }
  }

  const summary = calculateSummary()

  // Edit item from list (double-click handler)
  const editItemFromList = (tempId: string) => {
    const itemToEdit = itemRows.find((row) => row.tempId === tempId)
    if (!itemToEdit) return

    // Populate form fields with existing item data
    setCurrentItemId(itemToEdit.itemId)
    setCurrentAccountId(itemToEdit.customerId)
    setCurrentNetRate(itemToEdit.useNetRate)
    setCurrentNug(itemToEdit.quantity)
    setCurrentWeight(itemToEdit.weight)
    setCurrentCustomerPrice(itemToEdit.customerRate)
    setCurrentSupplierPrice(itemToEdit.supplierRate)
    setCurrentPer(itemToEdit.per || 'nug')

    // Populate expense fields
    setExpenseCommissionPer(itemToEdit.commissionPer)
    setExpenseCommission(itemToEdit.commission)
    setExpenseMarketFees(itemToEdit.marketFees)
    setExpenseRdf(itemToEdit.rdf)
    setExpenseBardanaAt(itemToEdit.bardanaAt)
    setExpenseBardana(itemToEdit.bardana)
    setExpenseLagaAt(itemToEdit.lagaAt)
    setExpenseLaga(itemToEdit.laga)
    setExpenseCrateMarkaId(itemToEdit.crateMarkaId || '')
    setExpenseCrateCount(itemToEdit.crates || 0)

    // Set editing state
    setEditingItemTempId(tempId)

    // Switch to items tab if not already there
    setActiveTab('items')
    // Notify user that item is loaded for editing
    toast.info('Item loaded for editing')
  }

  // Edit charge from list (double-click handler)
  // Edit charge from list (same as Arrival Entry handleEditCharge)
  const handleEditCharge = (tempId: string) => {
    const chargeToEdit = chargeRows.find((row) => row.tempId === tempId)
    if (!chargeToEdit) return

    // Populate form fields with existing charge data
    if (chargeToEdit.otherChargesId) {
      setSelectedChargeHeadId(chargeToEdit.otherChargesId)
    } else {
      // For legacy charges without otherChargesId, try to find by name
      const chargeHead = otherChargesHeads.find(ch => ch.headingName === chargeToEdit.chargeName)
      if (chargeHead) {
        setSelectedChargeHeadId(chargeHead.id)
      }
    }
    setChargeOnValue(chargeToEdit.onValue?.toString() || '')
    setChargePer(chargeToEdit.per?.toString() || '')
    setChargeNo(chargeToEdit.no?.toString() || '')
    setChargeAtRate(chargeToEdit.atRate?.toString() || '')
    setChargePlusMinus(chargeToEdit.plusMinus as '+' | '-')
    setChargeAmount(chargeToEdit.amount?.toString() || '')

    // Set editing state
    setEditingChargeId(tempId)

    // Switch to charges tab if not already there
    setActiveTab('charges')
  }

  // Handle adding item (used by both button click and Enter key)
  const handleAddItemClick = () => {
    // Validate basic fields
    if (!currentItemId || !currentAccountId) {
      toast.error('Please select item and customer')
      return
    }
    if (currentNug <= 0 || currentWeight <= 0) {
      toast.error('Please enter nug and weight')
      return
    }
    if (currentCustomerPrice <= 0) {
      toast.error('Please enter customer price')
      return
    }

    // Get selected item
    const selectedItem = items.find((i) => i.id === currentItemId)
    if (!selectedItem) {
      toast.error('Selected item not found')
      return
    }

    // Calculate basic amount
    const basicAmount =
      currentPer === 'nug'
        ? currentNug * currentCustomerPrice
        : currentWeight * currentCustomerPrice

    // Fetch expense fields from item
    // If net rate is checked, set commission and expenses to 0
    // Only reset expense fields when adding a NEW item, not when editing
    if (!editingItemTempId) {
      if (currentNetRate) {
        setExpenseCommissionPer(0)
        setExpenseCommission(0)
        setExpenseMarketFees(0)
        setExpenseRdf(0)
      } else {
        setExpenseCommissionPer(selectedItem.commission || 0)
        setExpenseCommission((basicAmount * (selectedItem.commission || 0)) / 100)
        setExpenseMarketFees(selectedItem.marketFees || 0)
        setExpenseRdf(selectedItem.rdf || 0)
      }
      // Bardana and Laga still apply even with net rate
      setExpenseBardanaAt(selectedItem.bardanaPerNug || 0)
      setExpenseBardana(currentNug * (selectedItem.bardanaPerNug || 0))
      setExpenseLagaAt(selectedItem.laga || 0)
      setExpenseLaga(currentNug * (selectedItem.laga || 0))
      setExpenseCrateMarkaId('')
      setExpenseCrateCount(0)
    }
    // When editing, expense fields are already populated from editItemFromList

    // Open expense modal
    setExpenseModalOpen(true)
  }

  // Handle Enter key in item entry form
  const handleItemEntryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItemClick()
    }
  }



  // Handle saving item with expenses from modal
  const handleSaveItemWithExpenses = () => {
    // Get selected item and account
    const selectedItem = items.find((i) => i.id === currentItemId)
    const selectedAccount = accounts.find((a) => a.id === currentAccountId)

    if (!selectedItem || !selectedAccount) {
      toast.error('Invalid item or account selection')
      return
    }

    // Calculate basic amounts
    const basicAmount =
      currentPer === 'nug'
        ? currentNug * currentCustomerPrice
        : currentWeight * currentCustomerPrice

    // If net rate is checked, only include bardana and laga in expenses
    const totalExpenses = currentNetRate
      ? expenseBardana + expenseLaga
      : expenseCommission + expenseMarketFees + expenseRdf + expenseBardana + expenseLaga

    // Get selected crate marka if applicable
    const selectedCrate = expenseCrateMarkaId
      ? crateMarkas.find((c) => c.id === expenseCrateMarkaId)
      : undefined

    // Get selected customer account
    const selectedCustomer = accounts.find((a) => a.id === currentAccountId)

    // Create new item row
    const newItem: VoucherItemRow = {
      tempId: editingItemTempId || `new-${nextItemTempId}`,
      itemId: currentItemId,
      itemName: selectedItem.itemName,
      customerId: currentAccountId,
      customerName: selectedCustomer?.accountName || '',
      arrivalTypeId: undefined,
      arrivalTypeName: undefined,
      crateMarkaId: expenseCrateMarkaId || undefined,
      crateMarkaName: selectedCrate?.crateMarkaName || undefined,
      quantity: currentNug,
      crates:
        selectedItem.maintainCratesInSalePurchase && expenseCrateMarkaId
          ? expenseCrateCount
          : undefined,
      weight: currentWeight,
      customerRate: currentCustomerPrice,
      customerAmount: basicAmount,
      customerRetail: basicAmount + totalExpenses,
      supplierRate: currentSupplierPrice,
      supplierAmount:
        currentPer === 'nug'
          ? currentNug * currentSupplierPrice
          : currentWeight * currentSupplierPrice,
      supplierRetail: 0, // Will be calculated
      useNetRate: currentNetRate,
      commission: currentNetRate ? 0 : expenseCommission,
      commissionPer: currentNetRate ? 0 : expenseCommissionPer,
      marketFees: currentNetRate ? 0 : expenseMarketFees,
      rdf: currentNetRate ? 0 : expenseRdf,
      bardana: expenseBardana,
      bardanaAt: expenseBardanaAt,
      laga: expenseLaga,
      lagaAt: expenseLagaAt,
      totalExpenses: totalExpenses,
      per: currentPer, // Store the pricing unit (nug or kg)
      cratesTotalQuantity: undefined,
      cratesAadQuantity: undefined,
      cratesPerCrate: undefined,
      cratesPurQuantity: undefined,
      cratesPurAmount: undefined,
      notes: undefined
    }

    if (editingItemTempId) {
      // Update existing item
      setItemRows(itemRows.map((row) => (row.tempId === editingItemTempId ? newItem : row)))
      setEditingItemTempId(null)
      toast.success('Item updated successfully')
      if (!tabTransactionState.isActive) {
        dispatch(startTabTransaction({ tabId, transactionType: 'daily-sale' }))
      }
      setHasUnsavedChanges(true)
    } else {
      // Add new item
      setItemRows([...itemRows, newItem])
      setNextItemTempId(nextItemTempId + 1)
      toast.success('Item added successfully')
      if (!tabTransactionState.isActive) {
        dispatch(startTabTransaction({ tabId, transactionType: 'daily-sale' }))
      }
      setHasUnsavedChanges(true)
    }

    // Reset current item fields
    setCurrentItemId('')
    setCurrentAccountId('')
    setCurrentNetRate(false)
    setCurrentNug(0)
    setCurrentWeight(0)
    setCurrentCustomerPrice(0)
    setCurrentSupplierPrice(0)
    setCurrentPer('nug')

    // Close expense modal
    setExpenseModalOpen(false)
  }

  // Flags to show clear buttons when inputs have values
  const hasItemInputValues =
    !!currentItemId || !!currentAccountId || currentNug !== 0 || currentWeight !== 0 ||
    currentCustomerPrice !== 0 || currentSupplierPrice !== 0

  // Clear item entry inputs (like Quick Sale clearInputs)
  const clearItemInputs = () => {
    setCurrentItemId('')
    setCurrentAccountId('')
    setCurrentNetRate(false)
    setCurrentNug(0)
    setCurrentWeight(0)
    setCurrentCustomerPrice(0)
    setCurrentSupplierPrice(0)
    setCurrentPer('nug')
    setExpenseCommissionPer(0)
    setExpenseCommission(0)
    setExpenseMarketFees(0)
    setExpenseRdf(0)
    setExpenseBardanaAt(0)
    setExpenseBardana(0)
    setExpenseLagaAt(0)
    setExpenseLaga(0)
    setExpenseCrateMarkaId('')
    setExpenseCrateCount(0)
    toast.success('Inputs cleared')
  }

  // Recalculate preview net amount whenever relevant fields change so user sees Total above Net Amt
  useEffect(() => {
    const basic = currentPer === 'nug' ? currentNug * currentCustomerPrice : currentWeight * currentCustomerPrice
    const expenses = currentNetRate
      ? expenseBardana + expenseLaga
      : expenseCommission + expenseMarketFees + expenseRdf + expenseBardana + expenseLaga
    // Crate value is tracked separately, not added to net amount
    const net = basic + expenses
    setPreviewNetAmount(Number(net.toFixed(2)))
  }, [currentPer, currentNug, currentWeight, currentCustomerPrice, currentNetRate, expenseCommission, expenseMarketFees, expenseRdf, expenseBardana, expenseLaga, expenseCrateMarkaId, expenseCrateCount, crateMarkas])

  const handleSubmit = async () => {
    // Validation
    if (!voucherDate) {
      toast.error('Please select voucher date')
      return
    }

    if (!accountId) {
      toast.error('Please select account')
      return
    }

    if (itemRows.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    // Validate all item rows
    for (const row of itemRows) {
      if (!row.itemId) {
        toast.error('Please select item for all rows')
        return
      }
      if (row.quantity === 0) {
        toast.error('Please enter quantity for all items')
        return
      }
      if (row.weight === 0) {
        toast.error('Please enter weight for all items')
        return
      }
      if (row.customerRate === 0 && row.supplierRate === 0) {
        toast.error('Please enter either customer rate or supplier rate for all items')
        return
      }
    }

    // Validate charge rows
    for (const row of chargeRows) {
      if (!row.label || row.label.trim() === '') {
        toast.error('Please enter label for all charges')
        return
      }
    }

    setSubmitting(true)

    try {
      // Get supplier name
      const supplier = accounts.find((a) => a.id === accountId)

      // Prepare items - map form fields to service fields
      const preparedItems: CreateVoucherItemInput[] = itemRows.map((row) => ({
        itemId: row.itemId,
        itemName: row.itemName,
        customerId: row.customerId,
        customerName: row.customerName,
        netRate: row.useNetRate,
        nug: row.quantity,
        weight: row.weight,
        customerPrice: row.customerRate,
        supplierPrice: row.supplierRate,
        per: row.per || 'nug',
        basicAmount: row.customerAmount,
        netAmount: row.customerRetail,
        commission: row.commission,
        commissionPer: row.commissionPer,
        marketFees: row.marketFees,
        rdf: row.rdf,
        bardana: row.bardana,
        bardanaAt: row.bardanaAt,
        laga: row.laga,
        lagaAt: row.lagaAt,
        crateMarkaId: row.crateMarkaId || null,
        crateMarkaName: row.crateMarkaName || null,
        crateQty: row.crates || null,
        crateRate: null,
        crateValue: null
      }))

      // Prepare charges - map form fields to service fields
      const preparedCharges: CreateVoucherChargeInput[] = chargeRows.map((row) => ({
        otherChargesId: row.otherChargesId || null,
        chargeName: row.label || row.chargeName,
        onValue: row.onValue,
        per: row.per || null,
        atRate: row.atRate,
        no: row.no || null,
        plusMinus: row.plusMinus || (row.isAddition ? '+' : '-'),
        amount: row.amount
      }))

      let response

      if (voucher) {
        // Update existing
        response = await window.api.voucher.update(voucher.id, {
          voucherDate,
          supplierId: accountId,
          supplierName: supplier?.accountName || '',
          vehicleNo: vehicleNo || undefined,
          transport: Number(transport) || 0,
          freight: Number(freight) || 0,
          grRrNo: grRrNo || undefined,
          narration: narration || undefined,
          advancePayment: advancePayment,
          roundoff: summary.roundOffAmount,
          items: preparedItems,
          charges: preparedCharges
        })
      } else {
        // Create new
        response = await window.api.voucher.create({
          companyId,
          voucherDate,
          supplierId: accountId,
          supplierName: supplier?.accountName || '',
          vehicleNo: vehicleNo || undefined,
          transport: Number(transport) || 0,
          freight: Number(freight) || 0,
          grRrNo: grRrNo || undefined,
          narration: narration || undefined,
          advancePayment: advancePayment,
          roundoff: summary.roundOffAmount,
          items: preparedItems,
          charges: preparedCharges
        })
      }

      if (response.success) {
        toast.success(
          voucher ? 'Daily sale updated successfully' : 'Daily sale created successfully'
        )
          setHasUnsavedChanges(false)
          // End transaction for this tab after successful save
          dispatch(endTabTransaction({ tabId, saved: true }))
          navigate('/entries/daily-sale')
      } else {
        toast.error(response.error || 'Failed to save daily sale')
      }
    } catch (error: any) {
      console.error('Submit error:', error)
      toast.error(error.message || 'An error occurred while saving')
    } finally {
      setSubmitting(false)
    }
  }

  // Update ref for Ctrl+S shortcut
  handleSubmitRef.current = handleSubmit

  const handlePrint = () => {
    toast.info('Print functionality coming soon')
  }

  const resetForm = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    const day = today.getDate().toString().padStart(2, '0')
    setVoucherDate(`${year}-${month}-${day}`)
    setAccountId('')
    setVehicleNo('')
    setItemRows([])
    setChargeRows([])
    setNextItemTempId(1)
    setChargeOne(0)
    setChargeTwo(0)
    setChargeThree(0)
    setChargeFour(0)
    setChargeFive(0)
    setHasUnsavedChanges(false)
    // Ensure transaction state is cleared for this tab
    try {
      dispatch(endTabTransaction({ tabId, saved: false }))
    } catch (err) {
      // ignore if dispatch not available during tests
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowCloseConfirmation(true)
    } else {
      resetForm()
      navigate('/entries/daily-sale')
    }
  }

  const handleDiscardChanges = () => {
    setShowCloseConfirmation(false)
    resetForm()
    navigate('/entries/daily-sale')
    // End the tab transaction as changes were discarded
    dispatch(endTabTransaction({ tabId, saved: false }))
  }

  const handleContinueEditing = () => {
    setShowCloseConfirmation(false)
  }

  const handleRefresh = () => {
    // Reset form directly without confirmation dialog
    resetForm()
  }

  if (!activeCompany) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading voucher...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col  h-full overflow-y-hidden bg-gray-50">
      {/* Header - Fixed at top */}
      <div className="shrink-0 border-b bg-white px-6 py-4 ">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {voucher ? 'Edit Daily Sale Voucher' : 'New Voucher'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="voucherDate" className="text-sm font-medium whitespace-nowrap">
                Date:
              </Label>
              <Input
                id="voucherDate"
                type="date"
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-40"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="voucherNo" className="text-sm font-medium whitespace-nowrap">
                Voucher No:
              </Label>
              <Input
                id="voucherNo"
                value={voucher ? `#${voucher.voucherNo}` : voucherNo}
                disabled
                className="w-32"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="accountId" className="text-sm font-medium whitespace-nowrap">
                Supplier:
              </Label>
              <Combobox
                options={supplierAccounts.map((account) => ({
                  value: account.id,
                  label: account.accountName
                }))}
                value={accountId}
                onChange={setAccountId}
                placeholder="Select supplier"
                searchPlaceholder="Search suppliers..."
                emptyText="No suppliers found"
                className="w-64"
                onCreateNew={() => setShowSupplierModal(true)}
                createNewLabel="Create new supplier"
              />
            </div>

            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="icon"
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} variant="success">
              <Save className="h-4 w-4 mr-2" />
              {submitting ? 'Saving...' : voucher ? 'Update' : 'Save'}
            </Button>
            <Button onClick={handlePrint} variant="outline-blue">
              <Printer className="h-4 w-4 mr-2 text-blue-600" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div ref={mainScrollRef} className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-2 rounded-none bg-gray-100">
            <TabsTrigger
              value="items"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Item Entry
            </TabsTrigger>
            <TabsTrigger
              value="charges"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Charges
            </TabsTrigger>
          </TabsList>
          <div className="h-full overflow-auto">
            <div className="p-6">
              <TabsContent value="items" className="space-y-4 mt-0">
                {/* Item Entry Form */}
                <Card className="border-l-4 border-l-primary">
                  <CardHeader>
                    <CardTitle className="text-lg">Current Item Entry</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3" onKeyDown={handleItemEntryKeyDown}>
                      {/* Row 1 */}
                      <div className="grid grid-cols-12 gap-3 items-end">
                        {/* Item Name */}
                        <div className="col-span-3">
                          <Label className="text-sm font-semibold mb-1">Item Name *</Label>
                          <Combobox
                            options={items.map((item) => ({
                              value: item.id,
                              label: item.itemName
                            }))}
                            value={currentItemId}
                            onChange={setCurrentItemId}
                            placeholder="Select item"
                            searchPlaceholder="Search items..."
                            emptyText="No items found"
                            onCreateNew={() => setShowItemModal(true)}
                            createNewLabel="Create new item"
                          />
                        </div>

                        {/* Customer Name */}
                        <div className="col-span-3">
                          <Label className="text-sm font-semibold mb-1">Customer Name *</Label>
                          <Combobox
                            options={customerAccounts.map((account) => ({
                              value: account.id,
                              label: account.accountName
                            }))}
                            value={currentAccountId}
                            onChange={setCurrentAccountId}
                            placeholder="Select customer"
                            searchPlaceholder="Search customers..."
                            emptyText="No customers found"
                            onCreateNew={() => setShowCustomerModal(true)}
                            createNewLabel="Create new customer"
                          />
                        </div>

                        {/* Net Rate Checkbox */}
                        <div className="col-span-2 flex items-center gap-2 pb-2">
                          <Checkbox
                            id="netRate"
                            checked={currentNetRate}
                            onCheckedChange={(checked) => setCurrentNetRate(checked as boolean)}
                          />
                          <Label htmlFor="netRate" className="text-sm font-semibold cursor-pointer">
                            Net Rate
                          </Label>
                        </div>

                        {/* Nug */}
                        <div className="col-span-2">
                          <Label className="text-sm font-semibold mb-1">Nug *</Label>
                          <Input
                            type="number"
                            value={currentNug || ''}
                            onChange={(e) => setCurrentNug(Number(e.target.value))}
                            className="h-10 text-center"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        {/* Weight */}
                        <div className="col-span-2">
                          <Label className="text-sm font-semibold mb-1">Weight *</Label>
                          <Input
                            type="number"
                            value={currentWeight || ''}
                            onChange={(e) => setCurrentWeight(Number(e.target.value))}
                            className="h-10 text-center"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>

                      {/* Row 2 */}
                      <div className="grid grid-cols-12 gap-3 items-end">
                        {/* Customer Price */}
                        <div className="col-span-2">
                          <Label className="text-sm font-semibold mb-1">Cust. Price *</Label>
                          <Input
                            type="number"
                            value={currentCustomerPrice || ''}
                            onChange={(e) => setCurrentCustomerPrice(Number(e.target.value))}
                            className="h-10 text-center"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        {/* Supplier Price */}
                        <div className="col-span-2">
                          <Label className="text-sm font-semibold mb-1">Supplier Price *</Label>
                          <Input
                            type="number"
                            value={currentSupplierPrice || ''}
                            onChange={(e) => setCurrentSupplierPrice(Number(e.target.value))}
                            className="h-10 text-center"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        {/* Per */}
                        <div className="col-span-2">
                          <Label className="text-sm font-semibold mb-1">Per *</Label>
                          <Select
                            value={currentPer}
                            onValueChange={(value) => setCurrentPer(value as 'nug' | 'kg')}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nug">Nug</SelectItem>
                              <SelectItem value="kg">Kg</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Basic Amount (auto-calc) */}
                        <div className="col-span-2">
                          <Label className="text-sm font-semibold mb-1">Basic Amt</Label>
                          <Input
                            type="number"
                            value={
                              currentPer === 'nug'
                                ? (currentNug * currentCustomerPrice).toFixed(2)
                                : (currentWeight * currentCustomerPrice).toFixed(2)
                            }
                            readOnly
                            className="h-10 text-center font-semibold bg-gray-50"
                          />
                        </div>

                        {/* Net Amount (auto-calc) - same as basic for now, will include expenses after modal */}
                        <div className="col-span-2">
                          <Label className="text-sm font-semibold mb-1">
                            Net Amt
                            {previewNetAmount > 0 && (
                              <span className="text-red-600 ml-2">₹{previewNetAmount.toFixed(2)}</span>
                            )}
                          </Label>
                          <Input
                            type="number"
                            value={previewNetAmount.toFixed(2)}
                            readOnly
                            className="h-10 text-center font-semibold bg-gray-50"
                          />
                        </div>

                        {/* Add Item Button */}
                        <div className="col-span-2">
                          <Label className="text-sm font-semibold mb-1">&nbsp;</Label>
                          <div className="flex flex-col gap-1">
                            {hasItemInputValues && (
                              <Button
                                onClick={clearItemInputs}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
                              >
                                Clear Input
                              </Button>
                            )}
                            <Button
                              onClick={handleAddItemClick}
                              className="w-full h-10"
                              disabled={
                                !currentItemId ||
                                !currentAccountId ||
                                currentNug <= 0 ||
                                currentWeight <= 0 ||
                                currentCustomerPrice <= 0
                              }
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {editingItemTempId ? 'Update' : 'Add'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Added Items Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Added Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {itemRows.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No items added yet. Use the form above to add items.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Search Bar */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-sm">
                            <Input
                              placeholder="Search by item name or account..."
                              value={itemSearch}
                              onChange={(e) => {
                                setItemSearch(e.target.value)
                                setItemCurrentPage(1)
                              }}
                              className="pl-3"
                            />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {(() => {
                              // Filter items
                              const filtered = itemRows.filter((row) => {
                                const searchLower = itemSearch.toLowerCase()
                                const accountName =
                                  accounts.find((a) => a.id === accountId)?.accountName || ''
                                return (
                                  row.itemName.toLowerCase().includes(searchLower) ||
                                  accountName.toLowerCase().includes(searchLower)
                                )
                              })

                              // Sort items
                              const sorted = [...filtered].sort((a, b) => {
                                let comparison = 0
                                switch (itemSortColumn) {
                                  case 'itemName':
                                    comparison = a.itemName.localeCompare(b.itemName)
                                    break
                                  case 'nug':
                                    comparison = a.quantity - b.quantity
                                    break
                                  case 'weight':
                                    comparison = a.weight - b.weight
                                    break
                                  case 'basicAmount':
                                    comparison = a.customerAmount - b.customerAmount
                                    break
                                }
                                return itemSortDirection === 'asc' ? comparison : -comparison
                              })

                              const startIndex = (itemCurrentPage - 1) * itemsPerPage
                              const endIndex = Math.min(startIndex + itemsPerPage, sorted.length)
                              return `Showing ${startIndex + 1}-${endIndex} of ${sorted.length} items`
                            })()}
                          </div>
                          {selectedItemIds.length > 0 && (
                            <Button variant="destructive" size="sm" onClick={removeBulkItems}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete ({selectedItemIds.length})
                            </Button>
                          )}
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">
                                  <Checkbox
                                    checked={(() => {
                                      const filtered = itemRows.filter((row) => {
                                        const searchLower = itemSearch.toLowerCase()
                                        const accountName =
                                          accounts.find((a) => a.id === accountId)?.accountName ||
                                          ''
                                        return (
                                          row.itemName.toLowerCase().includes(searchLower) ||
                                          accountName.toLowerCase().includes(searchLower)
                                        )
                                      })
                                      return (
                                        selectedItemIds.length === filtered.length &&
                                        filtered.length > 0
                                      )
                                    })()}
                                    onCheckedChange={() => {
                                      const filtered = itemRows.filter((row) => {
                                        const searchLower = itemSearch.toLowerCase()
                                        const accountName =
                                          accounts.find((a) => a.id === accountId)?.accountName ||
                                          ''
                                        return (
                                          row.itemName.toLowerCase().includes(searchLower) ||
                                          accountName.toLowerCase().includes(searchLower)
                                        )
                                      })
                                      toggleSelectAllItems(filtered)
                                    }}
                                  />
                                </TableHead>
                                <TableHead className="w-16">Sr.</TableHead>
                                <TableHead>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 font-semibold"
                                    onClick={() => {
                                      if (itemSortColumn === 'itemName') {
                                        setItemSortDirection(
                                          itemSortDirection === 'asc' ? 'desc' : 'asc'
                                        )
                                      } else {
                                        setItemSortColumn('itemName')
                                        setItemSortDirection('asc')
                                      }
                                    }}
                                  >
                                    Item Name
                                    {itemSortColumn === 'itemName' && (
                                      <span className="ml-1">
                                        {itemSortDirection === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </Button>
                                </TableHead>
                                <TableHead>Account Name</TableHead>
                                <TableHead className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 font-semibold"
                                    onClick={() => {
                                      if (itemSortColumn === 'nug') {
                                        setItemSortDirection(
                                          itemSortDirection === 'asc' ? 'desc' : 'asc'
                                        )
                                      } else {
                                        setItemSortColumn('nug')
                                        setItemSortDirection('asc')
                                      }
                                    }}
                                  >
                                    Nug
                                    {itemSortColumn === 'nug' && (
                                      <span className="ml-1">
                                        {itemSortDirection === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 font-semibold"
                                    onClick={() => {
                                      if (itemSortColumn === 'weight') {
                                        setItemSortDirection(
                                          itemSortDirection === 'asc' ? 'desc' : 'asc'
                                        )
                                      } else {
                                        setItemSortColumn('weight')
                                        setItemSortDirection('asc')
                                      }
                                    }}
                                  >
                                    Wt
                                    {itemSortColumn === 'weight' && (
                                      <span className="ml-1">
                                        {itemSortDirection === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </Button>
                                </TableHead>
                                <TableHead className="text-right">Price Per</TableHead>
                                <TableHead className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 font-semibold"
                                    onClick={() => {
                                      if (itemSortColumn === 'basicAmount') {
                                        setItemSortDirection(
                                          itemSortDirection === 'asc' ? 'desc' : 'asc'
                                        )
                                      } else {
                                        setItemSortColumn('basicAmount')
                                        setItemSortDirection('asc')
                                      }
                                    }}
                                  >
                                    Basic Amount
                                    {itemSortColumn === 'basicAmount' && (
                                      <span className="ml-1">
                                        {itemSortDirection === 'asc' ? '↑' : '↓'}
                                      </span>
                                    )}
                                  </Button>
                                </TableHead>
                                <TableHead className="text-right w-24">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(() => {
                                // Filter items
                                const filtered = itemRows.filter((row) => {
                                  const searchLower = itemSearch.toLowerCase()
                                  const accountName =
                                    accounts.find((a) => a.id === currentAccountId)?.accountName ||
                                    ''
                                  return (
                                    row.itemName.toLowerCase().includes(searchLower) ||
                                    accountName.toLowerCase().includes(searchLower)
                                  )
                                })

                                // Sort items
                                const sorted = [...filtered].sort((a, b) => {
                                  let comparison = 0
                                  switch (itemSortColumn) {
                                    case 'itemName':
                                      comparison = a.itemName.localeCompare(b.itemName)
                                      break
                                    case 'nug':
                                      comparison = a.quantity - b.quantity
                                      break
                                    case 'weight':
                                      comparison = a.weight - b.weight
                                      break
                                    case 'basicAmount':
                                      comparison = a.customerAmount - b.customerAmount
                                      break
                                  }
                                  return itemSortDirection === 'asc' ? comparison : -comparison
                                })

                                // Paginate items
                                const startIndex = (itemCurrentPage - 1) * itemsPerPage
                                const paginated = sorted.slice(
                                  startIndex,
                                  startIndex + itemsPerPage
                                )

                                return paginated.map((row, index) => {
                                  const globalIndex = startIndex + index
                                  const pricePer = (row as any).per === 'nug' ? 'Nug' : 'Kg'

                                  return (
                                    <TableRow
                                      key={row.tempId}
                                      onDoubleClick={() => editItemFromList(row.tempId)}
                                      className="cursor-pointer hover:bg-gray-50"
                                    >
                                      <TableCell>
                                        <Checkbox
                                          checked={selectedItemIds.includes(row.tempId)}
                                          onCheckedChange={() => toggleItemSelection(row.tempId)}
                                        />
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {globalIndex + 1}
                                      </TableCell>
                                      <TableCell>{row.itemName}</TableCell>
                                      <TableCell>{row.customerName}</TableCell>
                                      <TableCell className="text-right">
                                        {row.quantity.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {row.weight.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-right">{pricePer}</TableCell>
                                      <TableCell className="text-right font-semibold">
                                        ₹{row.customerAmount.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              editItemFromList(row.tempId)
                                            }}
                                          >
                                            <Edit3 className="h-4 w-4 text-blue-600" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeItemRow(row.tempId)}
                                          >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })
                              })()}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Pagination Controls */}
                        {(() => {
                          const filtered = itemRows.filter((row) => {
                            const searchLower = itemSearch.toLowerCase()
                            const accountName =
                              accounts.find((a) => a.id === currentAccountId)?.accountName || ''
                            return (
                              row.itemName.toLowerCase().includes(searchLower) ||
                              accountName.toLowerCase().includes(searchLower)
                            )
                          })
                          const totalPages = Math.ceil(filtered.length / itemsPerPage)

                          return (
                            <div className="flex items-center justify-between pt-2">
                              <div className="text-sm text-muted-foreground">
                                Page {itemCurrentPage} of {totalPages}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setItemCurrentPage((p) => Math.max(1, p - 1))}
                                  disabled={itemCurrentPage === 1}
                                >
                                  Previous
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setItemCurrentPage((p) => Math.min(totalPages, p + 1))
                                  }
                                  disabled={itemCurrentPage === totalPages}
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="charges" className="space-y-4 mt-0">
                {/* Other Charges Section - Same layout as Arrival Entry */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Other Charges</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Charge Entry Form - Grid layout like Arrival Entry */}
                    <div 
                      className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCharge()
                        }
                      }}
                    >
                      {/* Charges Head */}
                      <div className="space-y-1.5 col-span-2">
                        <Label>Charges Head</Label>
                        <Select value={selectedChargeHeadId} onValueChange={setSelectedChargeHeadId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select charges head" />
                          </SelectTrigger>
                          <SelectContent>
                            {otherChargesHeads.map(ch => (
                              <SelectItem key={ch.id} value={ch.id}>
                                {ch.headingName} ({ch.feedAs})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* On Value - Show for onWeight, onNug, onPetti, percentage */}
                      {selectedChargeHeadFeedAs && selectedChargeHeadFeedAs !== 'absolute' && (
                        <div className="space-y-1.5">
                          <Label htmlFor="chargeOnValue">
                            {selectedChargeHeadFeedAs === 'onWeight' ? 'Total Kg' :
                             selectedChargeHeadFeedAs === 'onNug' ? 'Total Nug' :
                             selectedChargeHeadFeedAs === 'onPetti' ? 'Total Petti' :
                             'On Value'}
                          </Label>
                          <Input
                            id="chargeOnValue"
                            type="number"
                            step="0.01"
                            value={chargeOnValue}
                            onChange={(e) => setChargeOnValue(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      {/* Per - Show for onWeight (per kg) */}
                      {selectedChargeHeadFeedAs === 'onWeight' && (
                        <div className="space-y-1.5">
                          <Label htmlFor="chargePer">Per Kg</Label>
                          <Input
                            id="chargePer"
                            type="number"
                            step="0.01"
                            value={chargePer}
                            onChange={(e) => setChargePer(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      )}

                      {/* No - Show for onNug, onPetti (count) */}
                      {(selectedChargeHeadFeedAs === 'onNug' || selectedChargeHeadFeedAs === 'onPetti') && (
                        <div className="space-y-1.5">
                          <Label htmlFor="chargeNo">No.</Label>
                          <Input
                            id="chargeNo"
                            type="number"
                            step="1"
                            value={chargeNo}
                            onChange={(e) => setChargeNo(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      )}

                      {/* At Rate - Show for onWeight, onNug, onPetti, percentage */}
                      {selectedChargeHeadFeedAs && selectedChargeHeadFeedAs !== 'absolute' && (
                        <div className="space-y-1.5">
                          <Label htmlFor="chargeAtRate">
                            {selectedChargeHeadFeedAs === 'percentage' ? 'Percentage' : 'At Rate'}
                          </Label>
                          <Input
                            id="chargeAtRate"
                            type="number"
                            step="0.01"
                            value={chargeAtRate}
                            onChange={(e) => setChargeAtRate(e.target.value)}
                            placeholder={selectedChargeHeadFeedAs === 'percentage' ? "%" : "0.00"}
                          />
                        </div>
                      )}

                      {/* Plus/Minus */}
                      <div className="space-y-1.5">
                        <Label>+/-</Label>
                        <Select value={chargePlusMinus} onValueChange={(v) => setChargePlusMinus(v as '+' | '-')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+">+ Plus</SelectItem>
                            <SelectItem value="-">- Minus</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Amount (editable) */}
                      <div className="space-y-1.5">
                        <Label htmlFor="chargeAmount">Amount</Label>
                        <Input
                          id="chargeAmount"
                          type="number"
                          step="0.01"
                          value={chargeAmount}
                          onChange={(e) => setChargeAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>

                      {/* Add/Update Button */}
                      <div className="flex items-end">
                        <Button onClick={handleAddCharge} className="w-full">
                          {editingChargeId ? 'Update' : 'Add'}
                        </Button>
                      </div>
                    </div>

                    {/* Charges Table */}
                    {chargeRows.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border rounded-md">
                        No charges added. Use the form above to add charges.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Bulk Delete */}
                        {selectedChargeIds.length > 0 && (
                          <div className="mb-2">
                            <Button variant="destructive" size="sm" onClick={removeBulkCharges}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Selected ({selectedChargeIds.length})
                            </Button>
                          </div>
                        )}
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">
                                  <Checkbox
                                    checked={
                                      selectedChargeIds.length === chargeRows.length &&
                                      chargeRows.length > 0
                                    }
                                    onCheckedChange={toggleSelectAllCharges}
                                  />
                                </TableHead>
                                <TableHead className="font-semibold">Charges Head</TableHead>
                                <TableHead className="text-right font-semibold">On Value</TableHead>
                                <TableHead className="text-right font-semibold">Per</TableHead>
                                <TableHead className="text-right font-semibold">At Rate</TableHead>
                                <TableHead className="text-center font-semibold">+/-</TableHead>
                                <TableHead className="text-right font-semibold">Amount</TableHead>
                                <TableHead className="w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {chargeRows.map((row) => (
                                <TableRow
                                  key={row.tempId}
                                  onDoubleClick={() => handleEditCharge(row.tempId)}
                                  className="cursor-pointer hover:bg-gray-50"
                                >
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedChargeIds.includes(row.tempId)}
                                      onCheckedChange={() => toggleChargeSelection(row.tempId)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium text-blue-600">
                                    {row.label}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {row.onValue ? row.onValue.toFixed(2) : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {row.per ? row.per.toFixed(2) : '-'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {row.atRate ? row.atRate.toFixed(2) : '-'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {row.plusMinus}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    ₹{row.amount.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEditCharge(row.tempId)
                                        }}
                                      >
                                        <Edit3 className="h-4 w-4 text-blue-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeChargeRow(row.tempId)}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Additional Fields */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="transport">Transport</Label>
                        <Input
                          id="transport"
                          value={transport}
                          onChange={(e) => setTransport(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="freight">Freight</Label>
                        <Input
                          id="freight"
                          value={freight}
                          onChange={(e) => setFreight(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grRrNo">GR / RR No.</Label>
                        <Input
                          id="grRrNo"
                          value={grRrNo}
                          onChange={(e) => setGrRrNo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="narration">Narration</Label>
                        <Input
                          id="narration"
                          value={narration}
                          onChange={(e) => setNarration(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleNo">Vehicle No.</Label>
                        <Input
                          id="vehicleNo"
                          value={vehicleNo}
                          onChange={(e) => setVehicleNo(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="advancePayment">Advance Payment (if any)</Label>
                        <Input
                          id="advancePayment"
                          type="number"
                          value={advancePayment}
                          onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)}
                          step="0.01"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Shared Summary Footer - Fixed at bottom */}
      <div className="shrink-0 border-t bg-white">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow className="">
                <TableHead className="text-black font-semibold text-center border-r">
                  Count
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Total Nug
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Total Wt.
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Basic Amt
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Comm. + Exp Amt
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Buyer's Amt
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Seller Item Value
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Other Charges
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Round Off
                </TableHead>
                <TableHead className="text-black font-semibold text-center">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="text-center font-semibold border-r">
                  {summary.totalItems}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  {summary.totalQuantity.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  {summary.totalWeight.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  ₹{summary.subTotal.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  ₹{summary.totalExpenses.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  ₹{(summary.subTotal + summary.totalExpenses).toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  ₹{summary.sellersItemValue.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  ₹{summary.totalCharges.toFixed(2)}
                </TableCell>
                <TableCell className="text-center border-r">
                  <div className="flex items-center justify-center gap-2">
                    <Select
                      value={roundOff}
                      onValueChange={(value: 'none' | 'up' | 'down') => setRoundOff(value)}
                    >
                      <SelectTrigger className="h-8 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="up">Round Up</SelectItem>
                        <SelectItem value="down">Round Down</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="font-semibold">₹{summary.roundOffAmount.toFixed(2)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold text-primary text-base">
                  ₹{summary.grandTotal.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Item Expense Modal */}
      <ItemExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onSave={handleSaveItemWithExpenses}
        itemName={items.find((i) => i.id === currentItemId)?.itemName || ''}
        accountName={accounts.find((a) => a.id === currentAccountId)?.accountName || ''}
        basicAmount={
          currentPer === 'nug'
            ? currentNug * currentCustomerPrice
            : currentWeight * currentCustomerPrice
        }
        nug={currentNug}
        useNetRate={currentNetRate}
        itemMaintainsCrates={
          items.find((i) => i.id === currentItemId)?.maintainCratesInSalePurchase || 
          Boolean(expenseCrateMarkaId) || 
          expenseCrateCount > 0
        }
        crateMarkas={crateMarkas}
        commissionPer={expenseCommissionPer}
        setCommissionPer={setExpenseCommissionPer}
        commission={expenseCommission}
        setCommission={setExpenseCommission}
        marketFees={expenseMarketFees}
        setMarketFees={setExpenseMarketFees}
        rdf={expenseRdf}
        setRdf={setExpenseRdf}
        bardanaAt={expenseBardanaAt}
        setBardanaAt={setExpenseBardanaAt}
        bardana={expenseBardana}
        setBardana={setExpenseBardana}
        lagaAt={expenseLagaAt}
        setLagaAt={setExpenseLagaAt}
        laga={expenseLaga}
        setLaga={setExpenseLaga}
        crateMarkaId={expenseCrateMarkaId}
        setCrateMarkaId={setExpenseCrateMarkaId}
        crateCount={expenseCrateCount}
        setCrateCount={setExpenseCrateCount}
      />

      {/* Full Create Modals */}
      <AccountFormModal
        open={showSupplierModal}
        onOpenChange={setShowSupplierModal}
        onSuccess={() => {
          loadAccounts()
        }}
      />

      <AccountFormModal
        open={showCustomerModal}
        onOpenChange={setShowCustomerModal}
        onSuccess={() => {
          loadAccounts()
        }}
      />

      <ItemFormModal
        open={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSuccess={() => {
          loadItems()
        }}
        companyId={companyId}
      />

      <AccountFormModal
        open={showChargeAccountModal}
        onOpenChange={setShowChargeAccountModal}
        onSuccess={() => {
          loadAccounts()
        }}
      />

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this voucher. Do you want to save your changes before
              closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardChanges}>Discard Changes</AlertDialogCancel>
            <AlertDialogAction onClick={handleContinueEditing}>Continue Editing</AlertDialogAction>
            <AlertDialogAction onClick={handleSubmit}>
              Save & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Item Expense Modal Component
interface ItemExpenseModalProps {
  open: boolean
  onClose: () => void
  onSave: () => void
  itemName: string
  accountName: string
  basicAmount: number
  nug: number
  useNetRate: boolean
  itemMaintainsCrates: boolean
  crateMarkas: CrateMarka[]
  commissionPer: number
  setCommissionPer: (value: number) => void
  commission: number
  setCommission: (value: number) => void
  marketFees: number
  setMarketFees: (value: number) => void
  rdf: number
  setRdf: (value: number) => void
  bardanaAt: number
  setBardanaAt: (value: number) => void
  bardana: number
  setBardana: (value: number) => void
  lagaAt: number
  setLagaAt: (value: number) => void
  laga: number
  setLaga: (value: number) => void
  crateMarkaId: string
  setCrateMarkaId: (value: string) => void
  crateCount: number
  setCrateCount: (value: number) => void
}

function ItemExpenseModal({
  open,
  onClose,
  onSave,
  itemName,
  accountName,
  basicAmount,
  nug,
  useNetRate,
  itemMaintainsCrates,
  crateMarkas,
  commissionPer,
  setCommissionPer,
  commission,
  setCommission,
  marketFees,
  setMarketFees,
  rdf,
  setRdf,
  bardanaAt,
  setBardanaAt,
  bardana,
  setBardana,
  lagaAt,
  setLagaAt,
  laga,
  setLaga,
  crateMarkaId,
  setCrateMarkaId,
  crateCount,
  setCrateCount
}: ItemExpenseModalProps) {
  // Auto-calculate commission when % changes
  useEffect(() => {
    if (commissionPer > 0) {
      const calculatedCommission = (basicAmount * commissionPer) / 100
      setCommission(Number(calculatedCommission.toFixed(2)))
    }
  }, [commissionPer, basicAmount])

  // Auto-calculate bardana when @ changes
  useEffect(() => {
    if (bardanaAt > 0) {
      const calculatedBardana = nug * bardanaAt
      setBardana(Number(calculatedBardana.toFixed(2)))
    }
  }, [bardanaAt, nug])

  // Auto-calculate laga when @ changes
  useEffect(() => {
    if (lagaAt > 0) {
      const calculatedLaga = nug * lagaAt
      setLaga(Number(calculatedLaga.toFixed(2)))
    }
  }, [lagaAt, nug])

  const selectedCrate = crateMarkas?.find((c) => c.id === crateMarkaId)
  const crateCost = selectedCrate?.cost || 0
  const totalExpenses = commission + marketFees + rdf + bardana + laga
  const crateTotal = itemMaintainsCrates && crateMarkaId ? crateCount * crateCost : 0
  // Crate value is tracked separately, not added to net amount
  const netAmount = basicAmount + totalExpenses

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-2xl [&>button]:w-auto [&>button]:h-auto [&>button]:px-3 [&>button]:py-1 [&>button]:rounded [&>button]:bg-gray-100 hover:[&>button]:bg-gray-200 [&>button]:text-gray-700 [&>button]:text-sm [&>button]:font-medium after:[&>button]:content-['Close'] [&>button>svg]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Item Expenses & Commission</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm pt-2 text-muted-foreground">
          <div>
            <span className="text-muted-foreground">Item:</span>
            <span className="ml-2 font-medium">{itemName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Customer:</span>
            <span className="ml-2 font-medium">{accountName}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Basic Amount:</span>
            <span className="ml-2 font-medium">₹{basicAmount.toFixed(2)}</span>
          </div>
        </div>

        <div
          className="space-y-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            }
          }}
        >
          {/* Expense Fields */}
          <div className="space-y-3">
            {/* Commission */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="commissionPer">Commission %</Label>
                <Input
                  id="commissionPer"
                  type="number"
                  step="0.01"
                  value={commissionPer || ''}
                  onChange={(e) => setCommissionPer(Number(e.target.value))}
                  placeholder="0.00"
                  disabled={useNetRate}
                  className={useNetRate ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
              </div>
              <div>
                <Label htmlFor="commission">Commission ₹</Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  value={commission || ''}
                  onChange={(e) => setCommission(Number(e.target.value))}
                  placeholder="0.00"
                  disabled={useNetRate}
                  className={useNetRate ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
              </div>
            </div>

            {/* Market Fees & RDF */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="marketFees">Market Fees ₹</Label>
                <Input
                  id="marketFees"
                  type="number"
                  step="0.01"
                  value={marketFees || ''}
                  onChange={(e) => setMarketFees(Number(e.target.value))}
                  placeholder="0.00"
                  disabled={useNetRate}
                  className={useNetRate ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
              </div>
              <div>
                <Label htmlFor="rdf">RDF ₹</Label>
                <Input
                  id="rdf"
                  type="number"
                  step="0.01"
                  value={rdf || ''}
                  onChange={(e) => setRdf(Number(e.target.value))}
                  placeholder="0.00"
                  disabled={useNetRate}
                  className={useNetRate ? 'bg-gray-100 cursor-not-allowed' : ''}
                />
              </div>
            </div>

            {/* Bardana */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bardanaAt">Bardana @</Label>
                <Input
                  id="bardanaAt"
                  type="number"
                  step="0.01"
                  value={bardanaAt || ''}
                  onChange={(e) => setBardanaAt(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="bardana">Bardana ₹</Label>
                <Input
                  id="bardana"
                  type="number"
                  step="0.01"
                  value={bardana || ''}
                  onChange={(e) => setBardana(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Laga */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="lagaAt">Laga @</Label>
                <Input
                  id="lagaAt"
                  type="number"
                  step="0.01"
                  value={lagaAt || ''}
                  onChange={(e) => setLagaAt(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="laga">Laga ₹</Label>
                <Input
                  id="laga"
                  type="number"
                  step="0.01"
                  value={laga || ''}
                  onChange={(e) => setLaga(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Crate Fields (if item maintains crates) */}
            {itemMaintainsCrates && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="crateMarka">Crate Marka</Label>
                    <Select value={crateMarkaId} onValueChange={setCrateMarkaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select crate" />
                      </SelectTrigger>
                      <SelectContent>
                        {(crateMarkas || []).map((crate) => (
                          <SelectItem key={crate.id} value={crate.id}>
                            {crate.crateMarkaName} - ₹{crate.cost.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="crateCount">Crate Count</Label>
                    <Input
                      id="crateCount"
                      type="number"
                      value={crateCount || ''}
                      onChange={(e) => setCrateCount(Number(e.target.value))}
                      placeholder="0"
                      disabled={!crateMarkaId}
                    />
                  </div>
                </div>
                {crateMarkaId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="crateValue">Crate Cost (per crate)</Label>
                      <Input
                        id="crateValue"
                        type="number"
                        value={crateCost.toFixed(2)}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="crateTotalValue">Total Crate Value</Label>
                      <Input
                        id="crateTotalValue"
                        type="number"
                        value={crateTotal.toFixed(2)}
                        disabled
                        className="bg-gray-50 font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="border-t pt-1 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Expenses:</span>
              <span className="font-semibold">₹{totalExpenses.toFixed(2)}</span>
            </div>
            {itemMaintainsCrates && crateCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Crate Total:</span>
                <span className="font-semibold">₹{crateTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold text-primary">
              <span>Net Amount:</span>
              <span>₹{netAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
