/**
 * Stock Sale Form Page
 * Phase 15.3 - Stock Sale form page with header, item entry, and summary
 *
 * Features:
 * - Header with date picker, supplier, store selection
 * - Item entry section with customer, lot, quantity fields
 * - Expense modal for commission, fees, crate details
 * - Items table with sorting, pagination, bulk actions
 * - Summary footer with totals
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, Edit2, RefreshCw, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { toast } from 'sonner'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import {
  startTabTransaction,
  endTabTransaction,
  selectTabTransactionState
} from '@/store/slices/tabSlice'
import { loadAccountGroups } from '@/store/slices/accountSlice'
import { AccountFormModal } from '@/components/AccountFormModal'
import { StoreFormModal } from '@/components/StoreFormModal'
import { ItemFormModal } from '@/components/ItemFormModal'
import { Badge } from '@/components/ui/badge'

// Types
interface Account {
  id: string
  accountName: string
  accountGroupId: string
  accountGroup?: {
    id: string
    name: string
  }
}

interface Item {
  id: string
  itemName: string
  commission: number
  marketFees: number
  rdf: number
  bardanaPerNug: number
  laga: number
  maintainCratesInSalePurchase: boolean
}

interface CrateMarka {
  id: string
  crateMarkaName: string
  cost: number
}

interface Store {
  id: string
  name: string
}

interface StockSaleItemRow {
  tempId: string
  itemId: string
  itemName: string
  customerId: string
  customerName: string
  supplierId: string
  storeId: string
  lotNo: string
  nug: number
  kg: number
  rate: number
  customerRate: number
  supplierRate: number
  per: 'kg' | 'nug'
  basicAmount: number
  netAmount: number
  commission: number
  commissionPer: number
  marketFees: number
  rdf: number
  bardana: number
  bardanaAt: number
  laga: number
  lagaAt: number
  crateMarkaId: string | null
  crateMarkaName: string | null
  crateQty: number | null
  crateRate: number | null
  crateValue: number | null
}

interface StockSaleFormPageProps {
  tabId: string
  currentRoute: string
}

const MALL_KHATA_ACCOUNT_NAME = 'Mall Khata Purchase A/c'

export function StockSaleFormPage({
  tabId,
  currentRoute
}: StockSaleFormPageProps): React.ReactElement {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  const { accountGroups } = useAppSelector((state) => state.account)
  const tabTransactionState = useAppSelector((state) => selectTabTransactionState(state, tabId))
  const companyId = activeCompany?.id || ''

  // Extract stockSaleId from currentRoute for edit mode
  const stockSaleId = useMemo(() => {
    if (currentRoute.startsWith('/entries/stock-sale/edit/')) {
      return currentRoute.replace('/entries/stock-sale/edit/', '')
    }
    return null
  }, [currentRoute])
  const isEditMode = !!stockSaleId

  // Main scroll container ref for keyboard scrolling
  const mainScrollRef = useRef<HTMLDivElement | null>(null)

  // Initial state ref for reverting on cancel
  const initialStateRef = useRef<{
    date: string
    supplierId: string
    storeId: string
    itemRows: StockSaleItemRow[]
  } | null>(null)

  // Loading state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Header fields
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [voucherNo, setVoucherNo] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [storeId, setStoreId] = useState('')

  // Item rows
  const [itemRows, setItemRows] = useState<StockSaleItemRow[]>([])
  const [nextTempId, setNextTempId] = useState(1)

  // Item entry form state
  const [selectedItemId, setSelectedItemId] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [lotNo, setLotNo] = useState('')
  const [nug, setNug] = useState('')
  const [kg, setKg] = useState('')
  const [customerRate, setCustomerRate] = useState('')
  const [supplierRate, setSupplierRate] = useState('')
  const [per, setPer] = useState<'kg' | 'nug'>('nug')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Expense modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [pendingItemData, setPendingItemData] = useState<{
    itemId: string
    itemName: string
    customerId: string
    customerName: string
    supplierId: string
    storeId: string
    lotNo: string
    nug: number
    kg: number
    customerRate: number
    supplierRate: number
    per: 'kg' | 'nug'
    basicAmount: number
  } | null>(null)

  // Expense form fields
  const [expenseCommissionPer, setExpenseCommissionPer] = useState('')
  const [expenseCommission, setExpenseCommission] = useState('')
  const [expenseMarketFees, setExpenseMarketFees] = useState('')
  const [expenseRdf, setExpenseRdf] = useState('')
  const [expenseBardanaAt, setExpenseBardanaAt] = useState('')
  const [expenseBardana, setExpenseBardana] = useState('')
  const [expenseLagaAt, setExpenseLagaAt] = useState('')
  const [expenseLaga, setExpenseLaga] = useState('')
  const [expenseCrateMarkaId, setExpenseCrateMarkaId] = useState('')
  const [expenseCrateQty, setExpenseCrateQty] = useState('')

  // Table state
  const [itemSearch, setItemSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<
    'itemName' | 'customerName' | 'nug' | 'kg' | 'basicAmount'
  >('itemName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null)

  // Delete confirmation
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  // Modal states
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showStoreModal, setShowStoreModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)

  // Master data
  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [crateMarkas, setCrateMarkas] = useState<CrateMarka[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [stockLedger, setStockLedger] = useState<any[]>([])

  const isEditingRow = Boolean(editingItemId)
  const canSelectStore = Boolean(supplierId) || isEditingRow
  const isItemFormLocked = !isEditingRow && (!supplierId || !storeId)

  // Find supplier and customer account group IDs for AccountFormModal
  const supplierAccountGroupId = useMemo(() => {
    let supplierGroup = accountGroups.find(
      (group) =>
        group.name?.toLowerCase() === 'supplier' || group.name?.toLowerCase().includes('supplier')
    )
    if (!supplierGroup) {
      supplierGroup = accountGroups.find((group) =>
        group.name?.toLowerCase().includes('sundry creditor')
      )
    }
    return supplierGroup?.id || ''
  }, [accountGroups])

  const customerAccountGroupId = useMemo(() => {
    let customerGroup = accountGroups.find(
      (group) =>
        group.name?.toLowerCase() === 'customer' || group.name?.toLowerCase().includes('customer')
    )
    if (!customerGroup) {
      customerGroup = accountGroups.find((group) =>
        group.name?.toLowerCase().includes('sundry debtor')
      )
    }
    return customerGroup?.id || ''
  }, [accountGroups])

  const mallKhataAccount = useMemo(() => {
    const target = MALL_KHATA_ACCOUNT_NAME.toLowerCase()
    return accounts.find((account) => account.accountName?.toLowerCase() === target)
  }, [accounts])

  // Get lot stock from stock ledger (already maintains running balance)
  const lotStock = useMemo(() => {
    // Start with stock ledger data
    const result = stockLedger.map((ledger: any) => ({
      supplierId: ledger.supplierId,
      itemId: ledger.itemId,
      lotNoVariety: ledger.lotNoVariety,
      storeId: ledger.storeId,
      totalNug: ledger.totalNug,
      totalKg: ledger.totalKg,
      soldNug: ledger.soldNug,
      soldKg: ledger.soldKg,
      availableNug: ledger.availableNug,
      availableKg: ledger.availableKg
    }))

    const findOrCreateEntry = (row: StockSaleItemRow) => {
      const entryMatchesRow = (l: any) =>
        l.supplierId === row.supplierId &&
        l.itemId === row.itemId &&
        l.lotNoVariety === row.lotNo &&
        l.storeId === row.storeId

      let ledgerEntry = result.find(entryMatchesRow)
      if (!ledgerEntry) {
        ledgerEntry = {
          supplierId: row.supplierId,
          itemId: row.itemId,
          lotNoVariety: row.lotNo,
          storeId: row.storeId,
          totalNug: 0,
          totalKg: 0,
          soldNug: 0,
          soldKg: 0,
          availableNug: 0,
          availableKg: 0
        }
        result.push(ledgerEntry)
      }
      return ledgerEntry
    }

    // In edit mode, add back the original items (they're already subtracted in the ledger)
    if (isEditMode && initialStateRef.current?.itemRows) {
      initialStateRef.current.itemRows.forEach((row) => {
        if (!row.lotNo) return
        const ledgerEntry = findOrCreateEntry(row)
        ledgerEntry.availableNug += row.nug || 0
        ledgerEntry.availableKg += row.kg || 0
      })
    }

    // Subtract items in current session (itemRows) that haven't been saved yet
    if (supplierId) {
      itemRows.forEach((row) => {
        if (!row.lotNo) return
        if (editingItemId && row.tempId === editingItemId) return

        const ledgerEntry = result.find(
          (l: any) =>
            l.supplierId === row.supplierId &&
            l.itemId === row.itemId &&
            l.lotNoVariety === row.lotNo &&
            l.storeId === row.storeId
        )

        if (ledgerEntry) {
          ledgerEntry.availableNug -= row.nug || 0
          ledgerEntry.availableKg -= row.kg || 0
        }
      })
    }

    // Filter out entries with no available stock
    return result.filter((lot: any) => lot.availableNug > 0 || lot.availableKg > 0)
  }, [stockLedger, itemRows, supplierId, isEditMode, editingItemId])

  // Filtered accounts
  const supplierAccounts = useMemo(() => {
    const baseSuppliers = accounts.filter(
      (account) =>
        account.accountGroup?.name?.toLowerCase().includes('sundry creditor') ||
        account.accountGroup?.name?.toLowerCase().includes('supplier')
    )

    const availableSupplierIds = new Set<string>()
    lotStock.forEach((lot) => {
      availableSupplierIds.add(lot.supplierId)
    })

    const forcedSupplierIds = new Set<string>()
    if (supplierId) forcedSupplierIds.add(supplierId)
    itemRows.forEach((row) => forcedSupplierIds.add(row.supplierId))

    const filtered = baseSuppliers.filter(
      (account) => availableSupplierIds.has(account.id) || forcedSupplierIds.has(account.id)
    )

    if (mallKhataAccount) {
      const shouldIncludeMallKhata =
        availableSupplierIds.has(mallKhataAccount.id) || forcedSupplierIds.has(mallKhataAccount.id)
      if (shouldIncludeMallKhata && !filtered.some((acc) => acc.id === mallKhataAccount.id)) {
        filtered.push(mallKhataAccount)
      }
    }

    return filtered
  }, [accounts, mallKhataAccount, lotStock, supplierId, itemRows])

  const customerAccounts = useMemo(() => {
    return accounts.filter(
      (account) =>
        account.accountGroup?.name?.toLowerCase().includes('sundry debtor') ||
        account.accountGroup?.name?.toLowerCase().includes('customer')
    )
  }, [accounts])

  // Combobox options
  const supplierOptions = useMemo(() => {
    return supplierAccounts.map((acc) => ({
      value: acc.id,
      label: acc.accountName
    }))
  }, [supplierAccounts])

  const customerOptions = useMemo(() => {
    return customerAccounts.map((acc) => ({
      value: acc.id,
      label: acc.accountName
    }))
  }, [customerAccounts])

  const itemOptions = useMemo(() => {
    if (!supplierId) return []

    // Require store selection for new entries; during edit the store will already be populated
    let activeStoreId = storeId
    if (!activeStoreId && editingItemId) {
      const editingItem = itemRows.find((row) => row.tempId === editingItemId)
      activeStoreId = editingItem?.storeId || ''
    }

    if (!activeStoreId) return []

    const itemIdsWithStock = new Set<string>()

    lotStock.forEach((ls) => {
      if (ls.supplierId === supplierId && ls.storeId === activeStoreId && ls.availableNug > 0) {
        itemIdsWithStock.add(ls.itemId)
      }
    })

    const includeRowItems = (rows?: StockSaleItemRow[] | null) => {
      if (!rows) return
      rows.forEach((row) => {
        if (row.supplierId !== supplierId) return
        if (row.storeId && row.storeId !== activeStoreId) return
        itemIdsWithStock.add(row.itemId)
      })
    }

    includeRowItems(initialStateRef.current?.itemRows || [])
    includeRowItems(itemRows)

    return items
      .filter((item) => itemIdsWithStock.has(item.id))
      .map((item) => ({
        value: item.id,
        label: item.itemName
      }))
  }, [items, supplierId, storeId, lotStock, editingItemId, itemRows])

  // Get stores where selected supplier+item has stock (from lot_stock_view)
  const supplierItemStoreIds = useMemo(() => {
    if (!supplierId) return new Set<string>()

    const storeIds = new Set<string>()

    lotStock.forEach((ls) => {
      if (ls.supplierId !== supplierId || !ls.storeId) return

      if (!selectedItemId || ls.itemId === selectedItemId) {
        if (ls.availableNug > 0) {
          storeIds.add(ls.storeId)
        }
      }
    })

    // Allow stores only when:
    // 1) They have stock in ledger (already handled above), or
    // 2) User is actively editing an item from that store (keeps current row editable)
    if (editingItemId) {
      const editingItem = itemRows.find((row) => row.tempId === editingItemId)
      if (editingItem?.storeId && editingItem.supplierId === supplierId) {
        if (!selectedItemId || editingItem.itemId === selectedItemId) {
          storeIds.add(editingItem.storeId)
        }
      }
    }

    return storeIds
  }, [supplierId, selectedItemId, lotStock, editingItemId, itemRows])

  const storeOptions = useMemo(() => {
    // If no supplier selected, show all stores
    if (!supplierId) {
      return stores.map((store) => ({
        value: store.id,
        label: store.name
      }))
    }
    // Filter stores to only those where supplier+item has stock
    const filtered = stores
      .filter((store) => supplierItemStoreIds.has(store.id))
      .map((store) => ({
        value: store.id,
        label: store.name
      }))

    return filtered
  }, [stores, supplierId, supplierItemStoreIds])

  const crateMarkaOptions = useMemo(() => {
    return crateMarkas.map((cm) => ({
      value: cm.id,
      label: `${cm.crateMarkaName} - ₹${cm.cost.toFixed(2)}`
    }))
  }, [crateMarkas])

  // Get selected crate marka
  const selectedCrateMarka = useMemo(() => {
    return crateMarkas.find((cm) => cm.id === expenseCrateMarkaId)
  }, [crateMarkas, expenseCrateMarkaId])

  // Get selected item for checking maintainCratesInSalePurchase
  const selectedItem = useMemo(() => {
    return items.find((i) => i.id === selectedItemId)
  }, [items, selectedItemId])

  // Get available lots for selected supplier, item, and store from lot_stock_view
  const availableLots = useMemo(() => {
    if (!supplierId || !selectedItemId || !storeId) return []

    // Filter lot stock by supplier, item, and store
    const filtered = lotStock.filter(
      (ls) => ls.supplierId === supplierId && ls.itemId === selectedItemId && ls.storeId === storeId
    )

    // Map to expected format and subtract already added items in current session
    const lots = filtered.map((ls) => ({
      lotNo: ls.lotNoVariety,
      availableNug: ls.availableNug,
      availableKg: ls.availableKg
    }))

    // Ensure current editing lot is available even if stock is zero
    if (editingItemId) {
      const editingItem = itemRows.find((row) => row.tempId === editingItemId)
      if (editingItem && editingItem.lotNo) {
        let lot = lots.find((l) => l.lotNo === editingItem.lotNo)
        if (!lot) {
          lots.push({
            lotNo: editingItem.lotNo,
            availableNug: editingItem.nug,
            availableKg: editingItem.kg
          })
        } else {
          lot.availableNug = Math.max(lot.availableNug, editingItem.nug)
          lot.availableKg = Math.max(lot.availableKg, editingItem.kg)
        }
      }
    }

    // Filter out lots with 0 or negative available
    return lots.filter((lot) => lot.availableNug > 0)
  }, [supplierId, selectedItemId, storeId, lotStock, itemRows, editingItemId])

  // Lot options for dropdown
  const lotOptions = useMemo(() => {
    return availableLots.map((lot) => ({
      value: lot.lotNo,
      label: `${lot.lotNo} (${lot.availableNug} nug available)`
    }))
  }, [availableLots])

  // Get available nug for selected item (total across all lots)
  const availableNugForItem = useMemo(() => {
    return availableLots.reduce((sum, lot) => sum + lot.availableNug, 0)
  }, [availableLots])

  const isOutOfStockForSelection = Boolean(selectedItemId && storeId && availableNugForItem <= 0)
  const shouldDisableItemInputs = isItemFormLocked || isOutOfStockForSelection

  // Reset item entry form (shared between modes)
  const resetItemForm = useCallback(() => {
    setSelectedItemId('')
    setSelectedCustomerId('')
    setLotNo('')
    setNug('')
    setKg('')
    setCustomerRate('')
    setSupplierRate('')
    setPer('nug')
  }, [])

  const clearEntryForm = useCallback(() => {
    setSupplierId('')
    setStoreId('')
    setEditingItemId(null)
    resetItemForm()
    setPendingItemData(null)
    setShowExpenseModal(false)
    setExpenseCommissionPer('')
    setExpenseCommission('')
    setExpenseMarketFees('')
    setExpenseRdf('')
    setExpenseBardanaAt('')
    setExpenseBardana('')
    setExpenseLagaAt('')
    setExpenseLaga('')
    setExpenseCrateMarkaId('')
    setExpenseCrateQty('')
  }, [resetItemForm])

  const hasEntryValues = useMemo(() => {
    return Boolean(
      supplierId ||
        storeId ||
        selectedItemId ||
        selectedCustomerId ||
        lotNo ||
        nug ||
        kg ||
        customerRate ||
        supplierRate ||
        editingItemId
    )
  }, [
    supplierId,
    storeId,
    selectedItemId,
    selectedCustomerId,
    lotNo,
    nug,
    kg,
    customerRate,
    supplierRate,
    editingItemId
  ])

  // Load master data
  const loadMasterData = useCallback(async () => {
    if (!companyId) return

    setLoading(true)
    try {
      // Load account groups for AccountFormModal pre-selection
      dispatch(loadAccountGroups(companyId))

      // Load accounts
      const accResponse = await window.api.account.listByCompany(companyId)
      if (accResponse.success && accResponse.data) {
        setAccounts(accResponse.data)
      }

      // Load items
      const itemResponse = await window.api.item.listByCompany(companyId)
      if (itemResponse.success && itemResponse.data) {
        setItems(itemResponse.data)
      }

      // Load crate markas
      const crateResponse = await window.api.crate.listByCompany(companyId)
      if (crateResponse.success && crateResponse.data) {
        setCrateMarkas(crateResponse.data)
      }

      // Load stores
      const storeResponse = await window.api.store.listByCompany(companyId)
      if (Array.isArray(storeResponse)) {
        setStores(storeResponse)
      }

      // Load stock ledger for available stock
      try {
        const ledgerResponse = await window.api.stockLedger.getAvailable(companyId, {
          includeZeroAvailable: true
        })
        if (ledgerResponse.success && ledgerResponse.data) {
          setStockLedger(ledgerResponse.data)

          // If ledger is empty, initialize it from existing data
          if (ledgerResponse.data.length === 0) {
            console.log('[StockSale] Stock ledger is empty, initializing from existing data...')
            const initResponse = await window.api.stockLedger.initialize(companyId)
            if (initResponse.success) {
              console.log('[StockSale] Stock ledger initialized successfully')
              // Reload the ledger
              const reloadResponse = await window.api.stockLedger.getAvailable(companyId, {
                includeZeroAvailable: true
              })
              if (reloadResponse.success && reloadResponse.data) {
                setStockLedger(reloadResponse.data)
                console.log(
                  '[StockSale] Stock ledger loaded:',
                  reloadResponse.data.length,
                  'entries'
                )
              }
            } else {
              console.error('[StockSale] Failed to initialize stock ledger:', initResponse.error)
            }
          } else {
            console.log('[StockSale] Stock ledger loaded:', ledgerResponse.data.length, 'entries')
          }
        }
      } catch (err) {
        console.error('Error loading stock ledger:', err)
      }
    } catch (error) {
      console.error('Error loading master data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [companyId])

  const fetchVoucherNo = useCallback(
    async (targetDate: string) => {
      if (!companyId || !targetDate) return
      try {
        setVoucherLoading(true)
        const response = await window.api.stockSale.getNextVoucherNo(companyId, targetDate)
        if (response.success && response.data) {
          setVoucherNo(response.data)
        } else if (response.error) {
          toast.error(response.error)
        }
      } catch (error) {
        console.error('Error fetching stock sale voucher number:', error)
        toast.error('Failed to fetch voucher number. Please try again.')
      } finally {
        setVoucherLoading(false)
      }
    },
    [companyId]
  )

  useEffect(() => {
    if (!isEditMode && date && companyId) {
      fetchVoucherNo(date)
    }
  }, [isEditMode, date, companyId, fetchVoucherNo])

  useEffect(() => {
    loadMasterData()
  }, [loadMasterData])

  // Load stock sale data for edit mode
  const loadStockSale = useCallback(async () => {
    if (!stockSaleId || !isEditMode) return

    setLoading(true)
    try {
      const response = await window.api.stockSale.get(stockSaleId)
      if (response.success && response.data) {
        const stockSale = response.data

        // Set header fields
        const loadedDate = stockSale.date.split('T')[0]
        setDate(loadedDate)
        setVoucherNo(stockSale.voucherNo || '')

        // Convert items to itemRows format
        let loadedRows: StockSaleItemRow[] = []
        if (stockSale.items && stockSale.items.length > 0) {
          loadedRows = stockSale.items.map((item: any, index: number) => ({
            tempId: `loaded-${index + 1}`,
            itemId: item.itemId,
            itemName: item.itemName || '',
            customerId: item.customerId,
            customerName: item.customerName || '',
            supplierId: item.supplierId || '',
            storeId: item.storeId || '',
            lotNo: item.lotNoVariety || '',
            nug: item.nug,
            kg: item.kg,
            rate: item.rate || item.customerRate,
            customerRate: item.customerRate,
            supplierRate: item.supplierRate,
            per: item.per as 'kg' | 'nug',
            basicAmount: item.basicAmount,
            netAmount: item.netAmount,
            commission: item.commission,
            commissionPer: item.commissionPer,
            marketFees: item.marketFees,
            rdf: item.rdf,
            bardana: item.bardana,
            bardanaAt: item.bardanaAt,
            laga: item.laga,
            lagaAt: item.lagaAt,
            crateMarkaId: item.crateMarkaId || undefined,
            crateMarkaName: item.crateMarkaName || undefined,
            crateQty: item.crateQty || undefined,
            crateRate: item.crateRate || undefined,
            crateValue: item.crateValue || undefined
          }))
          setItemRows(loadedRows)
          setNextTempId(loadedRows.length + 1)
        }

        // Ensure header selections stay empty until user picks them again
        setSupplierId('')
        setStoreId('')
        setEditingItemId(null)
        resetItemForm()
        setPendingItemData(null)
        setShowExpenseModal(false)
        setSelectedRowIds([])
        setFocusedRowId(null)
        setCurrentPage(1)

        // Store initial state for cancel/revert
        initialStateRef.current = {
          date: loadedDate,
          supplierId: '',
          storeId: '',
          itemRows: loadedRows
        }

        // Don't start transaction here - it will be started when user makes changes
      } else {
        toast.error(response.error || 'Failed to load stock sale')
        navigate('/entries/stock-sale')
      }
    } catch (error) {
      console.error('Error loading stock sale:', error)
      toast.error('Failed to load stock sale')
      navigate('/entries/stock-sale')
    } finally {
      setLoading(false)
    }
  }, [stockSaleId, isEditMode, dispatch, tabId, navigate, resetItemForm])

  // Load stock sale when in edit mode (after master data is loaded)
  useEffect(() => {
    if (isEditMode && stockSaleId && !loading) {
      loadStockSale()
    }
  }, [isEditMode, stockSaleId, loadStockSale])

  // Set initial state for new mode (when not editing)
  useEffect(() => {
    if (!isEditMode && !loading && !initialStateRef.current) {
      initialStateRef.current = {
        date: date,
        supplierId: '',
        storeId: '',
        itemRows: []
      }
    }
  }, [isEditMode, loading, date])

  // Refresh stock data when needed to get updated availability
  const refreshLotStock = useCallback(async () => {
    if (!companyId) return

    try {
      // Reload stock ledger
      const ledgerResponse = await window.api.stockLedger.getAvailable(companyId, {
        includeZeroAvailable: true
      })
      if (ledgerResponse.success && ledgerResponse.data) {
        setStockLedger(ledgerResponse.data)
      }
    } catch (err) {
      console.error('Error refreshing stock data:', err)
    }
  }, [companyId])

  useEffect(() => {
    refreshLotStock()
  }, [refreshLotStock])

  // Clear storeId if it's no longer in available options (e.g., stock depleted)
  // BUT: Don't clear if we already have items added (they're using that store)
  useEffect(() => {
    // Only clear if:
    // 1. Not loading
    // 2. We have a supplier and store selected
    // 3. Store is not in available options
    // 4. We don't have any items added yet (if we have items, keep the store)
    if (
      !loading &&
      supplierId &&
      storeId &&
      itemRows.length === 0 &&
      !storeOptions.some((opt) => opt.value === storeId)
    ) {
      console.log('[StockSale] Clearing storeId - not in available options:', {
        storeId,
        availableStores: storeOptions.map((opt) => opt.value)
      })
      setStoreId('')
      setLotNo('')
    }
  }, [storeId, storeOptions, loading, supplierId, itemRows.length])

  // Clear selectedItemId if it's no longer in available options (e.g., all stock sold)
  useEffect(() => {
    if (selectedItemId && !itemOptions.some((opt) => opt.value === selectedItemId)) {
      setSelectedItemId('')
      setLotNo('')
    }
  }, [selectedItemId, itemOptions])

  // Calculate basic amount
  const calculateBasicAmount = (
    nugVal: number,
    kgVal: number,
    rate: number,
    perUnit: 'kg' | 'nug'
  ): number => {
    if (perUnit === 'kg') {
      return kgVal * rate
    }
    return nugVal * rate
  }

  // Handle add item click - opens expense modal
  const handleAddItemClick = () => {
    if (!supplierId) {
      toast.error('Please select a supplier')
      return
    }
    if (!storeId) {
      toast.error('Please select a store')
      return
    }
    if (!selectedItemId) {
      toast.error('Please select an item')
      return
    }
    if (!selectedCustomerId) {
      toast.error('Please select a customer')
      return
    }

    const nugVal = parseInt(nug) || 0
    const kgVal = parseFloat(kg) || 0
    const custRateVal = parseFloat(customerRate) || 0
    const suppRateVal = parseFloat(supplierRate) || 0

    if (nugVal <= 0 && kgVal <= 0) {
      toast.error('Please enter quantity (Nug or Kg)')
      return
    }

    let nugCapacity: number | null = null
    if (lotNo) {
      const selectedLot = availableLots.find((lot) => lot.lotNo === lotNo)
      if (selectedLot) {
        nugCapacity = selectedLot.availableNug
      }
    } else if (selectedItemId) {
      nugCapacity = availableNugForItem
    }

    if (nugCapacity !== null && nugVal > nugCapacity) {
      toast.error(`Only ${nugCapacity} nug available for this selection`)
      return
    }

    const item = items.find((i) => i.id === selectedItemId)
    const customer = customerAccounts.find((c) => c.id === selectedCustomerId)

    if (!item || !customer) {
      toast.error('Invalid item or customer selection')
      return
    }

    const basicAmount = calculateBasicAmount(nugVal, kgVal, custRateVal, per)

    // Store pending item data and open expense modal
    setPendingItemData({
      itemId: selectedItemId,
      itemName: item.itemName,
      customerId: selectedCustomerId,
      customerName: customer.accountName,
      supplierId,
      storeId,
      lotNo,
      nug: nugVal,
      kg: kgVal,
      customerRate: custRateVal,
      supplierRate: suppRateVal,
      per,
      basicAmount
    })

    // Pre-fill expense fields from item defaults - only when adding new item, not when editing
    if (!editingItemId) {
      setExpenseCommissionPer(item.commission?.toString() || '')
      setExpenseCommission('')
      setExpenseMarketFees(item.marketFees?.toString() || '')
      setExpenseRdf(item.rdf?.toString() || '')
      setExpenseBardanaAt(item.bardanaPerNug?.toString() || '')
      setExpenseBardana('')
      setExpenseLagaAt(item.laga?.toString() || '')
      setExpenseLaga('')
      setExpenseCrateMarkaId('')
      setExpenseCrateQty('')
    }

    setShowExpenseModal(true)
  }

  // Calculate expense values
  useEffect(() => {
    if (!pendingItemData) return

    const basicAmount = pendingItemData.basicAmount
    const commissionPerVal = parseFloat(expenseCommissionPer) || 0
    const bardanaAtVal = parseFloat(expenseBardanaAt) || 0
    const lagaAtVal = parseFloat(expenseLagaAt) || 0

    // Commission = basicAmount * commissionPer / 100
    if (commissionPerVal > 0) {
      setExpenseCommission(((basicAmount * commissionPerVal) / 100).toFixed(2))
    }

    // Bardana = nug * bardanaAt
    if (bardanaAtVal > 0) {
      setExpenseBardana((pendingItemData.nug * bardanaAtVal).toFixed(2))
    }

    // Laga = kg * lagaAt
    if (lagaAtVal > 0) {
      setExpenseLaga((pendingItemData.kg * lagaAtVal).toFixed(2))
    }
  }, [pendingItemData, expenseCommissionPer, expenseBardanaAt, expenseLagaAt])

  // Calculate crate value from crate marka cost
  const crateCost = selectedCrateMarka?.cost || 0
  const crateValue = useMemo(() => {
    const qty = parseInt(expenseCrateQty) || 0
    return qty * crateCost
  }, [expenseCrateQty, crateCost])

  // Handle expense modal save
  const handleSaveExpense = () => {
    if (!pendingItemData) return

    // Start transaction if not active
    if (!tabTransactionState.isActive) {
      dispatch(startTabTransaction({ tabId, transactionType: 'stock-sale' }))
    }

    const commissionPerVal = parseFloat(expenseCommissionPer) || 0
    const commissionValInput = parseFloat(expenseCommission)
    const marketFees = parseFloat(expenseMarketFees) || 0
    const rdf = parseFloat(expenseRdf) || 0
    const bardanaAtVal = parseFloat(expenseBardanaAt) || 0
    const bardanaValInput = parseFloat(expenseBardana)
    const lagaAtVal = parseFloat(expenseLagaAt) || 0
    const lagaValInput = parseFloat(expenseLaga)

    // Recompute expense amounts to avoid stale derived values when pressing Enter
    const commission = Number.isFinite(commissionValInput)
      ? commissionValInput
      : commissionPerVal > 0
        ? (pendingItemData.basicAmount * commissionPerVal) / 100
        : 0

    const bardana = Number.isFinite(bardanaValInput)
      ? bardanaValInput
      : bardanaAtVal > 0
        ? pendingItemData.nug * bardanaAtVal
        : 0

    const laga = Number.isFinite(lagaValInput)
      ? lagaValInput
      : lagaAtVal > 0
        ? pendingItemData.kg * lagaAtVal
        : 0

    // Calculate net amount = basic - expenses (including crate value)
    const totalExpenses = commission + marketFees + rdf + bardana + laga
    const netAmount = pendingItemData.basicAmount + totalExpenses

    const crateMarka = crateMarkas.find((cm) => cm.id === expenseCrateMarkaId)

    const newItem: StockSaleItemRow = {
      tempId: editingItemId || `item-${nextTempId}`,
      itemId: pendingItemData.itemId,
      itemName: pendingItemData.itemName,
      customerId: pendingItemData.customerId,
      customerName: pendingItemData.customerName,
      supplierId: pendingItemData.supplierId,
      storeId: pendingItemData.storeId,
      lotNo: pendingItemData.lotNo,
      nug: pendingItemData.nug,
      kg: pendingItemData.kg,
      rate: pendingItemData.customerRate,
      customerRate: pendingItemData.customerRate,
      supplierRate: pendingItemData.supplierRate,
      per: pendingItemData.per,
      basicAmount: pendingItemData.basicAmount,
      netAmount,
      commission,
      commissionPer: commissionPerVal,
      marketFees,
      rdf,
      bardana,
      bardanaAt: bardanaAtVal,
      laga,
      lagaAt: lagaAtVal,
      crateMarkaId: expenseCrateMarkaId || null,
      crateMarkaName: crateMarka?.crateMarkaName || null,
      crateQty: parseInt(expenseCrateQty) || null,
      crateRate: crateMarka?.cost || null,
      crateValue: crateValue || null
    }

    if (editingItemId) {
      setItemRows((prev) => prev.map((row) => (row.tempId === editingItemId ? newItem : row)))
      toast.success('Item updated')
      setEditingItemId(null)
    } else {
      setItemRows((prev) => [...prev, newItem])
      setNextTempId((prev) => prev + 1)
      toast.success('Item added')
    }

    // Refresh lot stock to update availability in real-time
    refreshLotStock()

    // Reset form to initial state
    clearEntryForm()
  }

  const handleItemEntryKeyDown = (e: React.KeyboardEvent) => {
    if (showExpenseModal) return
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItemClick()
    }
  }

  // Handle edit item
  const handleEditItem = (item: StockSaleItemRow) => {
    setEditingItemId(item.tempId)
    setSupplierId(item.supplierId)
    setStoreId(item.storeId)
    setSelectedItemId(item.itemId)
    setSelectedCustomerId(item.customerId)
    setLotNo(item.lotNo)
    setNug(item.nug.toString())
    setKg(item.kg.toString())
    setCustomerRate(item.customerRate.toString())
    setSupplierRate(item.supplierRate.toString())
    setPer(item.per)

    // Set expense fields
    setExpenseCommissionPer(item.commissionPer.toString())
    setExpenseCommission(item.commission.toString())
    setExpenseMarketFees(item.marketFees.toString())
    setExpenseRdf(item.rdf.toString())
    setExpenseBardanaAt(item.bardanaAt.toString())
    setExpenseBardana(item.bardana.toString())
    setExpenseLagaAt(item.lagaAt.toString())
    setExpenseLaga(item.laga.toString())
    setExpenseCrateMarkaId(item.crateMarkaId || '')
    setExpenseCrateQty(item.crateQty?.toString() || '')

    // Scroll to top
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle delete item
  const handleDeleteItem = (tempId: string) => {
    if (!tabTransactionState.isActive) {
      dispatch(startTabTransaction({ tabId, transactionType: 'stock-sale' }))
    }
    setItemRows((prev) => prev.filter((row) => row.tempId !== tempId))
    setSelectedRowIds((prev) => prev.filter((id) => id !== tempId))
    if (focusedRowId === tempId) {
      setFocusedRowId(null)
    }
    toast.success('Item deleted')
    // Refresh lot stock to update availability in real-time
    refreshLotStock()
  }

  // Bulk delete - show confirmation
  const handleBulkDelete = () => {
    if (selectedRowIds.length === 0) return
    setShowBulkDeleteConfirm(true)
  }

  // Confirm bulk delete
  const confirmBulkDelete = () => {
    if (!tabTransactionState.isActive) {
      dispatch(startTabTransaction({ tabId, transactionType: 'stock-sale' }))
    }
    setItemRows((prev) => prev.filter((row) => !selectedRowIds.includes(row.tempId)))
    if (focusedRowId && selectedRowIds.includes(focusedRowId)) {
      setFocusedRowId(null)
    }
    toast.success(`${selectedRowIds.length} item(s) deleted`)
    setSelectedRowIds([])
    setShowBulkDeleteConfirm(false)
    // Refresh lot stock to update availability in real-time
    refreshLotStock()
  }

  // Toggle row selection
  const toggleRowSelection = (tempId: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(tempId) ? prev.filter((id) => id !== tempId) : [...prev, tempId]
    )
  }

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedRowIds.length === filteredItems.length) {
      setSelectedRowIds([])
    } else {
      setSelectedRowIds(filteredItems.map((item) => item.tempId))
    }
  }

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...itemRows]

    // Filter by search
    if (itemSearch) {
      const search = itemSearch.toLowerCase()
      result = result.filter(
        (item) =>
          item.itemName.toLowerCase().includes(search) ||
          item.customerName.toLowerCase().includes(search) ||
          item.lotNo.toLowerCase().includes(search)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = a[sortColumn]
      let bVal: string | number = b[sortColumn]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    })

    return result
  }, [itemRows, itemSearch, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calculate totals
  const totals = useMemo(() => {
    return itemRows.reduce(
      (acc, item) => {
        // Calculate supplier amount based on supplier rate
        const supplierAmount =
          item.per === 'nug' ? item.nug * item.supplierRate : item.kg * item.supplierRate
        // Customer amount is the net amount (basic amount minus deductions plus charges)
        const customerAmount = item.netAmount

        return {
          totalNug: acc.totalNug + item.nug,
          totalKg: acc.totalKg + item.kg,
          basicAmount: acc.basicAmount + item.basicAmount,
          supplierAmount: acc.supplierAmount + supplierAmount,
          customerAmount: acc.customerAmount + customerAmount
        }
      },
      { totalNug: 0, totalKg: 0, basicAmount: 0, supplierAmount: 0, customerAmount: 0 }
    )
  }, [itemRows])

  // Delete stock sale confirmation state
  const [showDeleteSaleConfirm, setShowDeleteSaleConfirm] = useState(false)

  // Handle save
  const handleSave = async () => {
    // In edit mode, if no items, ask to delete the stock sale
    if (isEditMode && stockSaleId && itemRows.length === 0) {
      setShowDeleteSaleConfirm(true)
      return
    }
    if (itemRows.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    setSaving(true)
    try {
      // Prepare stock sale data
      const stockSaleData = {
        date,
        voucherNo,
        totalNug: totals.totalNug,
        totalKg: totals.totalKg,
        basicAmount: totals.basicAmount,
        supplierAmount: totals.supplierAmount,
        customerAmount: totals.customerAmount,
        items: itemRows.map((item) => ({
          itemId: item.itemId,
          customerId: item.customerId,
          supplierId: item.supplierId, // From item row (can be different per item)
          storeId: item.storeId, // From item row (can be different per item)
          lotNo: item.lotNo,
          nug: item.nug,
          kg: item.kg,
          rate: item.customerRate, // Use customer rate as primary rate
          customerRate: item.customerRate,
          supplierRate: item.supplierRate,
          per: item.per,
          basicAmount: item.basicAmount,
          netAmount: item.netAmount,
          commission: item.commission,
          commissionPer: item.commissionPer,
          marketFees: item.marketFees,
          rdf: item.rdf,
          bardana: item.bardana,
          bardanaAt: item.bardanaAt,
          laga: item.laga,
          lagaAt: item.lagaAt,
          crateMarkaId: item.crateMarkaId || undefined,
          crateMarkaName: item.crateMarkaName || undefined,
          crateQty: item.crateQty || undefined,
          crateRate: item.crateRate || undefined,
          crateValue: item.crateValue || undefined
        }))
      }

      let response
      if (isEditMode && stockSaleId) {
        response = await window.api.stockSale.update(stockSaleId, stockSaleData as any)
      } else {
        let payload = stockSaleData
        if (!voucherNo) {
          const voucherResponse = await window.api.stockSale.getNextVoucherNo(companyId, date)
          if (voucherResponse.success && voucherResponse.data) {
            payload = { ...stockSaleData, voucherNo: voucherResponse.data }
            setVoucherNo(voucherResponse.data)
          }
        }
        response = await window.api.stockSale.create(companyId, payload as any)
      }

      if (response.success) {
        toast.success(
          isEditMode ? 'Stock sale updated successfully' : 'Stock sale saved successfully'
        )
        dispatch(endTabTransaction({ tabId, saved: true }))
        navigate('/entries/stock-sale')
      } else {
        toast.error(response.error || 'Failed to save stock sale')
      }
    } catch (error) {
      console.error('Error saving stock sale:', error)
      toast.error('Failed to save stock sale')
    } finally {
      setSaving(false)
    }
  }

  // Handle refresh - reload from DB in edit mode, clear form in new mode
  const handleRefresh = async () => {
    if (isEditMode && stockSaleId) {
      // In edit mode, reload data from database
      await loadStockSale()
    } else {
      // In new mode, clear the form
      setDate(new Date().toISOString().split('T')[0])
      setSupplierId('')
      setStoreId('')
      setItemRows([])
      setNextTempId(1)
      resetItemForm()
      setSelectedRowIds([])
      setFocusedRowId(null)
      dispatch(endTabTransaction({ tabId, saved: false }))
    }
  }

  // Handle print
  const handlePrint = () => {
    toast.info('Print functionality coming soon')
  }

  // Handle cancel - show confirmation if there are unsaved changes
  const handleCancel = () => {
    if (tabTransactionState.isActive) {
      // If there are unsaved changes, show confirmation
      setShowCloseConfirmation(true)
    } else {
      // No unsaved changes, just go back
      navigate('/entries/stock-sale')
    }
  }

  // Handle close/back navigation
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)

  const handleClose = () => {
    if (tabTransactionState.isActive) {
      setShowCloseConfirmation(true)
    } else {
      navigate('/entries/stock-sale')
    }
  }

  // Revert to initial state (cancel without saving)
  const revertToInitialState = () => {
    if (initialStateRef.current) {
      setDate(initialStateRef.current.date)
      setSupplierId(initialStateRef.current.supplierId)
      setStoreId(initialStateRef.current.storeId)
      setItemRows(initialStateRef.current.itemRows)
      setNextTempId(initialStateRef.current.itemRows.length + 1)
      resetItemForm()
      setSelectedRowIds([])
      setFocusedRowId(null)
    }
    dispatch(endTabTransaction({ tabId, saved: false }))
    setShowCloseConfirmation(false)
    toast.info('Changes discarded')
  }

  const handleDiscardChanges = () => {
    setShowCloseConfirmation(false)
    handleRefresh()
    navigate('/entries/stock-sale')
    dispatch(endTabTransaction({ tabId, saved: false }))
  }

  const handleContinueEditing = () => {
    setShowCloseConfirmation(false)
  }

  // Handle window close when transaction is active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tabTransactionState.isActive) {
        e.preventDefault()
        // Show confirmation dialog
        setShowCloseConfirmation(true)
        // Return value needed for some browsers
        return (e.returnValue = '')
      }
      return undefined
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [tabTransactionState.isActive])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S to save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        if (!tabTransactionState.isActive) {
          toast('No active transaction to save', { icon: 'ℹ️' })
          return
        }
        handleSave()
        return
      }

      // Delete key to delete focused/selected rows
      if (e.key === 'Delete' && !showExpenseModal) {
        const target = e.target as HTMLElement
        // Don't trigger if in an input field
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

        e.preventDefault()
        if (focusedRowId) {
          // Delete focused row
          handleDeleteItem(focusedRowId)
        } else if (selectedRowIds.length > 0) {
          // Delete selected rows
          handleBulkDelete()
        }
        return
      }

      // Enter to load focused row for editing (when not in expense modal or input)
      if (e.key === 'Enter' && !showExpenseModal && focusedRowId) {
        const target = e.target as HTMLElement
        // Don't trigger if in item entry form or input field
        if (
          target.closest('.item-entry-form') ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA'
        )
          return

        e.preventDefault()
        const item = itemRows.find((row) => row.tempId === focusedRowId)
        if (item) {
          handleEditItem(item)
        }
        return
      }

      // Enter in expense modal to save
      if (e.key === 'Enter' && showExpenseModal) {
        e.preventDefault()
        handleSaveExpense()
      }
    }

    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [
    showExpenseModal,
    selectedItemId,
    selectedCustomerId,
    focusedRowId,
    selectedRowIds,
    itemRows,
    nug,
    kg,
    tabTransactionState.isActive
  ])

  if (!activeCompany) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Please select a company first</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditMode ? 'Edit Stock Sale' : 'New Stock Sale'}
              </h1>
            </div>
          </div>
            <div className="grid grid-cols-2 gap-4 mr-4">
              {/* Date Picker */}
              <div className="flex items-center gap-2 col-span-1">
                <Label htmlFor="date" className="text-sm font-medium whitespace-nowrap">
                  Date:
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-40"
                />
              </div>

              {/* Voucher Number */}
              <div className="flex items-center gap-2 col-span-1">
                <Label className="text-sm font-medium whitespace-nowrap">Voucher:</Label>
                <div className="relative">
                  <Input
                    value={voucherNo}
                    readOnly
                    placeholder={voucherLoading ? 'Generating...' : 'Auto-generated'}
                    className="w-44 bg-muted pr-10"
                  />
                  {voucherLoading && (
                    <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Supplier */}
              <div className="flex items-center gap-2 col-span-1">
                <Label className="text-sm font-medium whitespace-nowrap">Supplier:</Label>
                <Combobox
                  options={supplierOptions}
                  value={supplierId}
                  onChange={(value) => {
                    setSupplierId(value)
                    // Reset item, store and lot when supplier changes
                    setSelectedItemId('')
                    setStoreId('')
                    setLotNo('')
                  }}
                  placeholder="Select supplier"
                  searchPlaceholder="Search suppliers..."
                  emptyText="No suppliers found"
                  className="w-48"
                  onCreateNew={() => setShowSupplierModal(true)}
                  createNewLabel="Create new supplier"
                />
              </div>

              {/* Store */}
              <div className="flex items-center gap-2 col-span-1">
                <Label className="text-sm font-medium whitespace-nowrap">Store:</Label>
                <Combobox
                  options={storeOptions}
                  value={storeId}
                  onChange={(value) => {
                    setStoreId(value)
                    // Reset lot when store changes
                    setLotNo('')
                  }}
                  placeholder={canSelectStore ? 'Select store' : 'Select supplier first'}
                  searchPlaceholder="Search stores..."
                  emptyText={supplierId ? 'No stores with supplier stock' : 'No stores found'}
                  className="w-40"
                  onCreateNew={() => setShowStoreModal(true)}
                  createNewLabel="Create new store"
                  disabled={!canSelectStore}
                />
              </div>
            </div>
            <div className='flex items-center gap-4'>
              {/* Action Buttons */}
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="icon"
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !tabTransactionState.isActive}
                variant="success"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {tabTransactionState.isActive && (
                <Button onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
              )}
              <Button onClick={handlePrint} variant="outline-blue">
                <Printer className="h-4 w-4 mr-2 text-blue-600" />
                Print
              </Button>
            </div>

        </div>
      </div>

      {/* Main Content */}
      <div ref={mainScrollRef} className="flex-1 overflow-auto p-4">
        {/* Item Entry Form */}
        <Card className="mb-4 border-l-4 border-l-primary">
          <CardHeader className="py-3">
            <CardTitle className="text-lg">{editingItemId ? 'Edit Item' : 'Add Item'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="item-entry-form grid grid-cols-3 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]"
              onKeyDown={handleItemEntryKeyDown}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {/* Item with available nug badge */}
                <div className="space-y-1.5 col-span-2">
                  <div className="flex items-center justify-between">
                    <Label>Item</Label>
                    {selectedItemId && availableNugForItem > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {availableNugForItem} nug available
                      </Badge>
                    )}
                  </div>
                  <Combobox
                    options={itemOptions}
                    value={selectedItemId}
                    onChange={(val) => {
                      setSelectedItemId(val)
                      setLotNo('') // Reset lot when item changes
                    }}
                    placeholder={isItemFormLocked ? 'Select supplier & store first' : 'Select item'}
                    searchPlaceholder="Search items..."
                    emptyText={
                      isItemFormLocked ? 'Select supplier & store first' : 'No items found'
                    }
                    onCreateNew={() => setShowItemModal(true)}
                    createNewLabel="Create new item"
                    disabled={isItemFormLocked}
                  />
                </div>

                {/* Customer */}
                <div className="space-y-1.5 col-span-2">
                  <Label>Customer</Label>
                  <Combobox
                    options={customerOptions}
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    placeholder="Select customer"
                    searchPlaceholder="Search customers..."
                    emptyText="No customers found"
                    onCreateNew={() => setShowCustomerModal(true)}
                    createNewLabel="Create new customer"
                    disabled={shouldDisableItemInputs}
                  />
                </div>

                {/* Lot No / Variety - Dropdown from lot stock */}
                <div className="space-y-1.5 col-span-2">
                  <Label>Lot / Variety</Label>
                  <Select
                    value={lotNo}
                    onValueChange={setLotNo}
                    disabled={isItemFormLocked || !selectedItemId || isOutOfStockForSelection}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isItemFormLocked
                            ? 'Select supplier & store first'
                            : !selectedItemId
                              ? 'Select item first'
                              : isOutOfStockForSelection
                                ? 'No stock available'
                                : 'Select lot'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {lotOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nug */}
                <div className="space-y-1.5">
                  <Label htmlFor="nug">Nug</Label>
                  <Input
                    id="nug"
                    type="number"
                    value={nug}
                    onChange={(e) => setNug(e.target.value)}
                    placeholder="0"
                    disabled={shouldDisableItemInputs}
                  />
                  {isOutOfStockForSelection && !isItemFormLocked && (
                    <p className="text-xs text-destructive">No stock available</p>
                  )}
                </div>

                {/* Kg */}
                <div className="space-y-1.5">
                  <Label htmlFor="kg">Weight (Kg)</Label>
                  <Input
                    id="kg"
                    type="number"
                    step="0.01"
                    value={kg}
                    onChange={(e) => setKg(e.target.value)}
                    placeholder="0.00"
                    disabled={shouldDisableItemInputs}
                  />
                </div>

                {/* Customer Rate */}
                <div className="space-y-1.5">
                  <Label htmlFor="customerRate">Cust Rate</Label>
                  <Input
                    id="customerRate"
                    type="number"
                    step="0.01"
                    value={customerRate}
                    onChange={(e) => setCustomerRate(e.target.value)}
                    placeholder="0.00"
                    disabled={shouldDisableItemInputs}
                  />
                </div>

                {/* Supplier Rate */}
                <div className="space-y-1.5">
                  <Label htmlFor="supplierRate">Supp Rate</Label>
                  <Input
                    id="supplierRate"
                    type="number"
                    step="0.01"
                    value={supplierRate}
                    onChange={(e) => setSupplierRate(e.target.value)}
                    placeholder="0.00"
                    disabled={shouldDisableItemInputs}
                  />
                </div>

                {/* Per */}
                <div className="space-y-1.5">
                  <Label>Per</Label>
                  <Select
                    value={per}
                    onValueChange={(v) => setPer(v as 'kg' | 'nug')}
                    disabled={shouldDisableItemInputs}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="nug">Nug</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Basic Amount (calculated) */}
                <div className="space-y-1.5 col-span-2">
                  <Label>Basic Amt</Label>
                  <Input
                    value={calculateBasicAmount(
                      parseInt(nug) || 0,
                      parseFloat(kg) || 0,
                      parseFloat(customerRate) || 0,
                      per
                    ).toFixed(2)}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                {/* Net Amount (calculated - same as basic for now, will subtract expenses) */}
                <div className="space-y-1.5 col-span-2">
                  <Label>Net Amt</Label>
                  <Input
                    value={calculateBasicAmount(
                      parseInt(nug) || 0,
                      parseFloat(kg) || 0,
                      parseFloat(customerRate) || 0,
                      per
                    ).toFixed(2)}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid-col-1 row-span-2 h-full">
                <div className="relative w-full lg:w-40 flex justify-center items-center flex-col gap-2 h-full">
                  {hasEntryValues && (
                    <button
                      type="button"
                      onClick={clearEntryForm}
                      className="absolute -top-2 right-0"
                      title="Clear form"
                    >
                      <Badge
                        variant="outline"
                        className="cursor-pointer text-red-600 hover:bg-red-100 border-red-600"
                      >
                        Clear
                      </Badge>
                    </button>
                  )}
                  <Button
                    onClick={handleAddItemClick}
                    className="w-full"
                    disabled={shouldDisableItemInputs}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {editingItemId ? 'Update' : 'Add'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="mb-4">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Items ({itemRows.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search items..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-64"
                />
                {selectedRowIds.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedRowIds.length})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedRowIds.length === filteredItems.length && filteredItems.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-12">Sr.</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => {
                        setSortColumn('itemName')
                        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                      }}
                    >
                      Item Name {sortColumn === 'itemName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => {
                        setSortColumn('customerName')
                        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                      }}
                    >
                      Customer{' '}
                      {sortColumn === 'customerName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Lot No</TableHead>
                    <TableHead className="text-right">Nug</TableHead>
                    <TableHead className="text-right">Kg</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Per</TableHead>
                    <TableHead className="text-right">Basic Amt</TableHead>
                    <TableHead className="text-right">Net Amt</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        No items added yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item, index) => (
                      <TableRow
                        key={item.tempId}
                        className={`cursor-pointer ${focusedRowId === item.tempId ? 'bg-blue-100 ring-2 ring-blue-400' : selectedRowIds.includes(item.tempId) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        onClick={() => setFocusedRowId(item.tempId)}
                        tabIndex={0}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRowIds.includes(item.tempId)}
                            onCheckedChange={() => toggleRowSelection(item.tempId)}
                          />
                        </TableCell>
                        <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.customerName}</TableCell>
                        <TableCell>{item.lotNo}</TableCell>
                        <TableCell className="text-right">{item.nug}</TableCell>
                        <TableCell className="text-right">{item.kg.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.customerRate.toFixed(2)}</TableCell>
                        <TableCell>{item.per}</TableCell>
                        <TableCell className="text-right">{item.basicAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.netAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              title="Edit item"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleEditItem(item)
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              title="Delete item"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteItem(item.tempId)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredItems.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredItems.length)} of{' '}
                  {filteredItems.length} items
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.max(1, totalPages)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages <= 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Footer - Fixed at bottom */}
      <div className="shrink-0 border-t bg-white">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-black font-semibold text-center border-r">
                  Count
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Total Nug
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Total Kg
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Basic Amount
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  Supplier Amount
                </TableHead>
                <TableHead className="text-black font-semibold text-center">
                  Customer Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="text-center font-semibold border-r">
                  {itemRows.length}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  {totals.totalNug}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  {totals.totalKg.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  ₹{totals.basicAmount.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  ₹{totals.supplierAmount.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  ₹{totals.customerAmount.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense & Crate Details</DialogTitle>
            <DialogDescription>
              Enter commission, fees, and crate details for this item
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
            {/* Commission % */}
            <div className="space-y-1.5">
              <Label htmlFor="commissionPer">Commission %</Label>
              <Input
                id="commissionPer"
                type="number"
                step="0.01"
                value={expenseCommissionPer}
                onChange={(e) => setExpenseCommissionPer(e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Commission Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="commission">Commission</Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                value={expenseCommission}
                onChange={(e) => setExpenseCommission(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Market Fees */}
            <div className="space-y-1.5">
              <Label htmlFor="marketFees">Market Fees</Label>
              <Input
                id="marketFees"
                type="number"
                step="0.01"
                value={expenseMarketFees}
                onChange={(e) => setExpenseMarketFees(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* RDF */}
            <div className="space-y-1.5">
              <Label htmlFor="rdf">RDF</Label>
              <Input
                id="rdf"
                type="number"
                step="0.01"
                value={expenseRdf}
                onChange={(e) => setExpenseRdf(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Bardana At */}
            <div className="space-y-1.5">
              <Label htmlFor="bardanaAt">Bardana @</Label>
              <Input
                id="bardanaAt"
                type="number"
                step="0.01"
                value={expenseBardanaAt}
                onChange={(e) => setExpenseBardanaAt(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Bardana */}
            <div className="space-y-1.5">
              <Label htmlFor="bardana">Bardana</Label>
              <Input
                id="bardana"
                type="number"
                step="0.01"
                value={expenseBardana}
                onChange={(e) => setExpenseBardana(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Laga At */}
            <div className="space-y-1.5">
              <Label htmlFor="lagaAt">Laga @</Label>
              <Input
                id="lagaAt"
                type="number"
                step="0.01"
                value={expenseLagaAt}
                onChange={(e) => setExpenseLagaAt(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Laga */}
            <div className="space-y-1.5">
              <Label htmlFor="laga">Laga</Label>
              <Input
                id="laga"
                type="number"
                step="0.01"
                value={expenseLaga}
                onChange={(e) => setExpenseLaga(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Crate Section - Only show for items with maintainCratesInSalePurchase */}
            {selectedItem?.maintainCratesInSalePurchase && (
              <>
                <div className="col-span-4 border-t pt-4 mt-2">
                  <h4 className="font-medium mb-3">Crate Details</h4>
                </div>

                {/* Crate Marka */}
                <div className="space-y-1.5 col-span-2">
                  <Label>Crate Marka</Label>
                  <Combobox
                    options={crateMarkaOptions}
                    value={expenseCrateMarkaId}
                    onChange={setExpenseCrateMarkaId}
                    placeholder="Select crate marka"
                    searchPlaceholder="Search..."
                    emptyText="No crate markas found"
                  />
                </div>

                {/* Crate Qty */}
                <div className="space-y-1.5">
                  <Label htmlFor="crateQty">Crate Qty</Label>
                  <Input
                    id="crateQty"
                    type="number"
                    value={expenseCrateQty}
                    onChange={(e) => setExpenseCrateQty(e.target.value)}
                    placeholder="0"
                    disabled={!expenseCrateMarkaId}
                  />
                </div>

                {/* Crate Cost (from marka) - only show when marka selected */}
                {expenseCrateMarkaId && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Crate Cost (per crate)</Label>
                      <Input value={crateCost.toFixed(2)} disabled className="bg-gray-100" />
                    </div>

                    {/* Crate Value (calculated) */}
                    <div className="space-y-1.5">
                      <Label>Total Crate Value</Label>
                      <Input
                        value={crateValue.toFixed(2)}
                        disabled
                        className="bg-gray-100 font-semibold"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpenseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveExpense}>
              {editingItemId ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteSaleConfirm} onOpenChange={setShowDeleteSaleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              No items in the sale. Do you want to delete this stock sale? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowDeleteSaleConfirm(false)
                setSaving(true)
                try {
                  const response = await window.api.stockSale.delete(stockSaleId!)
                  if (response.success) {
                    toast.success('Stock sale deleted successfully')
                    dispatch(endTabTransaction({ tabId, saved: true }))
                    navigate('/entries/stock-sale')
                  } else {
                    toast.error(response.error || 'Failed to delete stock sale')
                  }
                } catch (error) {
                  console.error('Error deleting stock sale:', error)
                  toast.error('Failed to delete stock sale')
                } finally {
                  setSaving(false)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedRowIds.length} Item(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRowIds.length} selected item(s)? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modals */}
      <AccountFormModal
        open={showSupplierModal}
        onOpenChange={setShowSupplierModal}
        onSuccess={() => {
          loadMasterData()
        }}
        defaultAccountGroupId={supplierAccountGroupId}
      />

      <AccountFormModal
        open={showCustomerModal}
        onOpenChange={setShowCustomerModal}
        onSuccess={() => {
          loadMasterData()
        }}
        defaultAccountGroupId={customerAccountGroupId}
      />

      <StoreFormModal
        open={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        onSuccess={() => {
          setShowStoreModal(false)
          loadMasterData()
        }}
        companyId={companyId}
      />

      <ItemFormModal
        open={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSuccess={() => {
          setShowItemModal(false)
          loadMasterData()
        }}
        companyId={companyId}
      />

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleContinueEditing}>Continue Editing</AlertDialogCancel>
            <Button variant="outline" onClick={revertToInitialState}>
              Revert Changes
            </Button>
            <AlertDialogAction onClick={handleDiscardChanges}>Discard & Go Back</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default StockSaleFormPage
