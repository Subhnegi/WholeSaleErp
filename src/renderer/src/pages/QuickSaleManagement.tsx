import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { store } from '@/store'
import { loadAccountGroups } from '@/store/slices/accountSlice'
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
  Package,
  Pencil,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { ItemCreateDialog } from '@/components/dialogs/ItemCreateDialog'
import { AccountCreateDialog } from '@/components/dialogs/AccountCreateDialog'
import type { QuickSale, CreateQuickSaleItemInput } from '@/types/quickSale'
import type { Item } from '@/types/item'
import type { Account } from '@/types/account'
import type { CrateMarka } from '@/types/crate'

// Simple date formatting helper
const formatDateToISO = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface ItemRow extends CreateQuickSaleItemInput {
  tempId: string
}

interface QuickSaleManagementProps {
  tabId: string
}

export function QuickSaleManagement({ tabId }: QuickSaleManagementProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  // Use the specific tab ID passed as prop for this component instance
  const tabTransactionState = useAppSelector((state) => 
    selectTabTransactionState(state, tabId)
  )
  
  // Create a unique state key for this tab instance
  const stateKey = `quicksale-${tabId}`
  
  // Data lists
  const [items, setItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [crateMarkas, setCrateMarkas] = useState<CrateMarka[]>([])
  
  // Shared Quick Sales data for cross-tab synchronization
  const [quickSales, setQuickSales] = useState<QuickSale[]>([])
  const [quickSalesLoaded, setQuickSalesLoaded] = useState(false)
  
  // Current entry form state
  const [saleDate, setSaleDate] = useState('')
  const [voucherNo, setVoucherNo] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [currentItem, setCurrentItem] = useState({
    itemId: '',
    itemName: '',
    accountId: '',
    accountName: '',
    nug: 0,
    kg: 0,
    rate: 0,
    per: 'nug' as 'nug' | 'kg',
    basicAmount: 0,
    totalAmount: 0,
    crateMarkaId: '',
    crateMarkaName: '',
    crateQty: 0,
    crateRate: 0,
    crateValue: 0
  })
  
  // Items added to current quick sale
  const [itemRows, setItemRows] = useState<ItemRow[]>([])
  const [savedItemRows, setSavedItemRows] = useState<ItemRow[]>([]) // Last saved/loaded state
  const [nextTempId, setNextTempId] = useState(1)
  
  // Multi-select state
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  
  // Row selection for keyboard navigation
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  
  // Editing state
  const [editingQuickSaleId, setEditingQuickSaleId] = useState<string | null>(null)
  const [editingItemTempId, setEditingItemTempId] = useState<string | null>(null)
  const prevDateRef = useRef<string>('')
  // Tab-specific shouldLoadRef to prevent cross-tab interference
  const shouldLoadRef = useRef<boolean>(true)
  const prevTabIdRef = useRef<string | null>(null)
  
  // Initialize shouldLoadRef from sessionStorage if available
  useEffect(() => {
    const savedShouldLoad = sessionStorage.getItem(`shouldLoad-${tabId}`)
    if (savedShouldLoad !== null) {
      shouldLoadRef.current = JSON.parse(savedShouldLoad)
    }
  }, [tabId])
  
  // Save shouldLoadRef to sessionStorage when it changes
  const setShouldLoad = (value: boolean) => {
    shouldLoadRef.current = value
    sessionStorage.setItem(`shouldLoad-${tabId}`, JSON.stringify(value))
  }

  // Cross-tab synchronization for Quick Sales data using BroadcastChannel
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  
  const broadcastQuickSaleSave = () => {
    console.log('[QuickSale] Broadcasting save event to other tabs')
    const event = {
      type: 'QUICK_SALE_SAVED',
      timestamp: Date.now(),
      tabId: tabId
    }
    
    // Use BroadcastChannel for reliable cross-tab communication
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event)
    }
    
    // Also use localStorage as fallback
    localStorage.setItem('quickSaleSync', JSON.stringify(event))
    setTimeout(() => {
      localStorage.removeItem('quickSaleSync')
    }, 100)
  }
  
  // Save and restore tab-specific state
  useEffect(() => {
    // Detect tab switch: restore state when switching to this tab
    if (prevTabIdRef.current !== tabId) {
      prevTabIdRef.current = tabId
      
      const savedState = sessionStorage.getItem(stateKey)
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState)
          setItemRows(parsed.itemRows || [])
          setSavedItemRows(parsed.savedItemRows || [])
          setSaleDate(parsed.saleDate || '')
          setEditingQuickSaleId(parsed.editingQuickSaleId || null)
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
      saleDate,
      editingQuickSaleId
    }
    sessionStorage.setItem(stateKey, JSON.stringify(state))
  }, [itemRows, savedItemRows, saleDate, editingQuickSaleId, stateKey])
  
  // Cleanup sessionStorage when tab is closed
  useEffect(() => {
    return () => {
      // Only cleanup if this tab is being removed from the tabs array
      const tabs = store.getState().tabs.tabs
      const tabExists = tabs.some(tab => tab.id === tabId)
      if (!tabExists) {
        sessionStorage.removeItem(stateKey)
      }
    }
  }, [stateKey, tabId])
  
  // Transaction state: active when user has made changes (now tab-specific)
  const isTransactionActive = tabTransactionState.isActive
  
  // Check if any input fields have values
  const hasInputValues = currentItem.itemId !== '' || currentItem.accountId !== '' || 
    currentItem.nug !== 0 || currentItem.kg !== 0 || currentItem.rate !== 0
  
  // Sync unsaved changes with tab state
  useEffect(() => {
    const currentHasChanges = JSON.stringify(itemRows) !== JSON.stringify(savedItemRows)
    dispatch(setTabTransactionState({ 
      tabId: tabId, 
      transactionState: { 
        isDirty: currentHasChanges,
        transactionType: 'quicksale'
      }
    }))
  }, [itemRows, savedItemRows, tabId, dispatch])
  
  // Alert dialog for cancel confirmation
  const [showCancelAlert, setShowCancelAlert] = useState(false)
  
  // Alert dialog for refresh confirmation
  const [showRefreshAlert, setShowRefreshAlert] = useState(false)
  
  // Loading state
  const [loading, setLoading] = useState(false)
  
  // Create dialogs
  const [showItemCreateDialog, setShowItemCreateDialog] = useState(false)
  const [showAccountCreateDialog, setShowAccountCreateDialog] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newAccountName, setNewAccountName] = useState('')
  
  // Modal for commission/expenses/crate info
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [detailsModalData, setDetailsModalData] = useState({
    commission: 0,
    commissionPer: 0,
    marketFees: 0,
    rdf: 0,
    bardana: 0,
    bardanaAt: 0,
    laga: 0,
    lagaAt: 0,
    crateMarkaId: '',
    crateQty: 0,
    crateRate: 0,
    crateValue: 0
  })
  
  const [submitting, setSubmitting] = useState(false)

  // Load data on mount
  useEffect(() => {
    if (activeCompany?.id) {
      loadItems()
      loadAccounts()
      loadCrateMarkas()
      loadQuickSales()
      // Load account groups for account creation modal
      dispatch(loadAccountGroups(activeCompany.id))
    }
    
    // Set today's date
    const today = new Date()
    setSaleDate(formatDateToISO(today))
  }, [activeCompany?.id, dispatch])

  const fetchVoucherNo = useCallback(async (date: string) => {
    if (!activeCompany?.id || !date) return
    try {
      setVoucherLoading(true)
      const response = await window.api.quickSale.getNextVoucherNo(activeCompany.id, date)
      if (response.success && response.data) {
        setVoucherNo(response.data)
      } else if (response.error) {
        toast.error(response.error)
      }
    } catch (error) {
      console.error('Fetch voucher number error:', error)
      toast.error('Failed to fetch voucher number. Please try again.')
    } finally {
      setVoucherLoading(false)
    }
  }, [activeCompany?.id])

  // Auto-load saved quick sale items when date changes or after save
  useEffect(() => {
    // Don't run until quickSales has been loaded at least once
    if (!saleDate || !quickSalesLoaded) return
    
    // Check if date has actually changed
    const dateChanged = prevDateRef.current !== saleDate
    
    // Only load if:
    // 1. Date changed (user manually changed date) OR
    // 2. shouldLoadRef is true (initial load or after save/delete operation)
    if (!dateChanged && !shouldLoadRef.current) {
      return // Don't reload if just quickSales reference changed
    }
    
    // Update the date ref
    prevDateRef.current = saleDate
    
    if (quickSales.length > 0) {
      const quickSaleForDate = quickSales.find(sale => {
        const saleDateOnly = sale.saleDate.split('T')[0]
        return saleDateOnly === saleDate
      })
      
      if (quickSaleForDate && quickSaleForDate.items) {
        const loadedItems = quickSaleForDate.items.map((item, index) => ({
          tempId: `existing-${item.id}-${index}`,
          itemId: item.itemId,
          itemName: item.itemName,
          accountId: item.accountId,
          accountName: item.accountName,
          nug: item.nug,
          kg: item.kg,
          rate: item.rate,
          per: item.per,
          basicAmount: item.basicAmount,
          totalAmount: item.totalAmount,
          crateMarkaId: item.crateMarkaId || '',
          crateMarkaName: item.crateMarkaName || '',
          crateQty: item.crateQty || 0,
          crateRate: item.crateRate || 0,
          crateValue: item.crateValue || 0
        }))
        setEditingQuickSaleId(quickSaleForDate.id)
        setItemRows(loadedItems)
        setSavedItemRows(loadedItems) // Set saved state
        setVoucherNo(quickSaleForDate.voucherNo || '')
        setShouldLoad(false) // Reset after successful load
      } else {
        // Clear items if no saved sale for this date
        setEditingQuickSaleId(null)
        setItemRows([])
        setSavedItemRows([]) // Clear saved state
        setSelectedRowIndex(null) // Reset keyboard navigation
        setVoucherNo('')
        setShouldLoad(false) // Reset after clearing
      }
    } else {
      // No saved sales exist yet, clear everything
      setEditingQuickSaleId(null)
      setItemRows([])
      setSavedItemRows([]) // Clear saved state
      setSelectedRowIndex(null) // Reset keyboard navigation
      setVoucherNo('')
      setShouldLoad(false) // Reset after clearing
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleDate, quickSales, quickSalesLoaded])

  useEffect(() => {
    if (!saleDate || !activeCompany?.id) return
    if (editingQuickSaleId) return
    fetchVoucherNo(saleDate)
  }, [saleDate, activeCompany?.id, editingQuickSaleId, fetchVoucherNo])

  // Auto-calculate basic amount when nug/kg/rate/per changes
  useEffect(() => {
    const quantity = currentItem.per === 'nug' ? currentItem.nug : currentItem.kg
    const calculated = quantity * currentItem.rate
    setCurrentItem(prev => ({ ...prev, basicAmount: calculated }))
  }, [currentItem.nug, currentItem.kg, currentItem.rate, currentItem.per])

  // Auto-calculate total amount when basic amount changes (without opening modal)
  useEffect(() => {
    if (currentItem.basicAmount > 0 && currentItem.itemId && currentItem.accountId) {
      const selectedItem = items.find(i => i.id === currentItem.itemId)
      if (selectedItem) {
        // Calculate based on item defaults
        const quantity = currentItem.per === 'nug' ? currentItem.nug : currentItem.kg
        const commission = (selectedItem.commission || 0) / 100 * currentItem.basicAmount
        const marketFees = (selectedItem.marketFees || 0) / 100 * currentItem.basicAmount
        const rdf = (selectedItem.rdf || 0) / 100 * currentItem.basicAmount
        const bardana = (selectedItem.bardanaPerNug || 0) * quantity
        const laga = (selectedItem.laga || 0) * quantity
        const crateValue = (currentItem.crateQty || 0) * (currentItem.crateRate || 0)
        
        // Crate value is tracked separately, not added to total
        const totalAmount = currentItem.basicAmount + commission + marketFees + rdf + bardana + laga
        
        setCurrentItem(prev => ({ ...prev, totalAmount }))
        
        // Populate modal data (but don't open it automatically - Issue 1 fix)
        setDetailsModalData({
          commission: selectedItem.commission || 0,
          commissionPer: commission,
          marketFees: selectedItem.marketFees || 0,
          rdf: selectedItem.rdf || 0,
          bardana: selectedItem.bardanaPerNug || 0,
          bardanaAt: 0,
          laga: selectedItem.laga || 0,
          lagaAt: 0,
          crateMarkaId: currentItem.crateMarkaId || '',
          crateQty: currentItem.crateQty || 0,
          crateRate: currentItem.crateRate || 0,
          crateValue: crateValue
        })
      }
    }
  }, [currentItem.basicAmount, currentItem.itemId, currentItem.accountId, items])

  // Auto-calculate crate value in modal
  useEffect(() => {
    const calculated = detailsModalData.crateQty * detailsModalData.crateRate
    setDetailsModalData(prev => ({ ...prev, crateValue: calculated }))
  }, [detailsModalData.crateQty, detailsModalData.crateRate])

  // Keyboard shortcuts: Enter to add item, Ctrl+S to save, arrows to navigate table
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInModal = target.closest('[role="dialog"]')
      
      // Enter key to add item or apply modal
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (isInModal) {
          // In modal: trigger Apply button
          if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
            e.preventDefault()
            handleDetailsModalSave()
          }
        } else {
          // Not in modal: check if we have a selected row or should add item
          if (selectedRowIndex !== null && itemRows.length > 0) {
            // Toggle checkbox for the selected row
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
            addItemToList()
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
  }, [currentItem, itemRows, saleDate, selectedRowIndex, currentPage, itemsPerPage, selectedRows])

  const loadItems = async () => {
    try {
      const response = await window.api.item.listByCompany(activeCompany!.id)
      if (response.success && response.data) {
        setItems(response.data)
      }
    } catch (error) {
      console.error('Load items error:', error)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await window.api.account.listByCompany(activeCompany!.id)
      if (response.success && response.data) {
        // Filter to show only customer accounts (sundry debtor) for quick sale
        const customerAccounts = response.data.filter(account =>
          account.accountGroup?.name?.toLowerCase().includes('sundry debtor') ||
          account.accountGroup?.name?.toLowerCase().includes('customer')
        )
        setAccounts(customerAccounts)
      }
    } catch (error) {
      console.error('Load accounts error:', error)
    }
  }

  const loadCrateMarkas = async () => {
    try {
      const response = await window.api.crate.listByCompany(activeCompany!.id)
      if (response.success && response.data) {
        setCrateMarkas(response.data)
      }
    } catch (error) {
      console.error('Load crate markas error:', error)
    }
  }

  const loadQuickSales = async () => {
    try {
      const response = await window.api.quickSale.listByCompany(activeCompany!.id)
      if (response.success && response.data) {
        setQuickSales(response.data)
        setQuickSalesLoaded(true)
      }
    } catch (error) {
      console.error('Load quick sales error:', error)
      setQuickSalesLoaded(true) // Mark as loaded even on error
    }
  }

  // Listen for cross-tab save events using BroadcastChannel
  useEffect(() => {
    // Initialize BroadcastChannel
    const channel = new BroadcastChannel('quicksale-sync')
    broadcastChannelRef.current = channel
    
    const handleMessage = (event: MessageEvent) => {
      console.log('[QuickSale] BroadcastChannel message received:', event.data)
      if (event.data.type === 'QUICK_SALE_SAVED' && event.data.tabId !== tabId) {
        console.log('[QuickSale] Cross-tab sync event received, refreshing data...')
        // Another tab saved data, refresh our Quick Sales
        setShouldLoad(true)
        loadQuickSales()
      }
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'quickSaleSync' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue)
          if (event.type === 'QUICK_SALE_SAVED' && event.tabId !== tabId) {
            console.log('[QuickSale] localStorage sync event received (fallback), refreshing data...')
            // Another tab saved data, refresh our Quick Sales
            setShouldLoad(true)
            loadQuickSales()
          }
        } catch (error) {
          console.error('Error parsing cross-tab sync event:', error)
        }
      }
    }

    channel.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      channel.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorageChange)
      channel.close()
      broadcastChannelRef.current = null
    }
  }, [tabId])

  const handleItemSelect = (itemId: string) => {
    console.log('handleItemSelect called with:', itemId)
    const selectedItem = items.find(i => i.id === itemId)
    console.log('Found item:', selectedItem)
    if (selectedItem) {
      setCurrentItem(prev => ({
        ...prev,
        itemId,
        itemName: selectedItem.itemName
      }))
    }
  }

  const handleAccountSelect = (accountId: string) => {
    console.log('handleAccountSelect called with:', accountId)
    const selectedAccount = accounts.find(a => a.id === accountId)
    console.log('Found account:', selectedAccount)
    if (selectedAccount) {
      setCurrentItem(prev => ({
        ...prev,
        accountId,
        accountName: selectedAccount.accountName
      }))
    }
  }

  const handleDetailsModalSave = () => {
    // Recalculate total amount based on modal inputs (Issue 2)
    const quantity = currentItem.per === 'nug' ? currentItem.nug : currentItem.kg
    const commissionAmount = (detailsModalData.commission / 100) * currentItem.basicAmount
    const marketFeesAmount = (detailsModalData.marketFees / 100) * currentItem.basicAmount
    const rdfAmount = (detailsModalData.rdf / 100) * currentItem.basicAmount
    const bardanaAmount = detailsModalData.bardana * quantity
    const lagaAmount = detailsModalData.laga * quantity
    const crateValue = detailsModalData.crateValue
    
    // Crate value is tracked separately, not added to total
    const totalAmount = currentItem.basicAmount + commissionAmount + marketFeesAmount + rdfAmount + bardanaAmount + lagaAmount
    
    // Create the updated item with all values including crate details
    const updatedItem = {
      ...currentItem,
      totalAmount,
      crateMarkaId: detailsModalData.crateMarkaId,
      crateQty: detailsModalData.crateQty,
      crateRate: detailsModalData.crateRate,
      crateValue: crateValue
    }
    
    setCurrentItem(updatedItem)
    setShowDetailsModal(false)
    
    // Pass the updated item directly to avoid state update race condition
    setTimeout(() => {
      completeAddItemToList(updatedItem)
    }, 100)
  }

  const handleDetailsModalCancel = () => {
    // Don't reset modal data - just close it
    setShowDetailsModal(false)
  }

  const addItemToList = () => {
    // Validation
    if (!currentItem.itemId || !currentItem.accountId) {
      toast.error('Please select item and account')
      return
    }
    if (currentItem.nug === 0 && currentItem.kg === 0) {
      toast.error('Please enter nug or kg')
      return
    }
    if (currentItem.rate === 0) {
      toast.error('Please enter rate')
      return
    }

    // Get the selected item to check for default values and open modal (Issue 2 fix)
    const selectedItem = items.find(i => i.id === currentItem.itemId)
    if (selectedItem) {
      const quantity = currentItem.per === 'nug' ? currentItem.nug : currentItem.kg
      const commissionAmount = (selectedItem.commission || 0) / 100 * currentItem.basicAmount
      
      // Populate details modal with calculated values from item defaults
      setDetailsModalData({
        commission: selectedItem.commission || 0,
        commissionPer: commissionAmount,
        marketFees: selectedItem.marketFees || 0,
        rdf: selectedItem.rdf || 0,
        bardana: selectedItem.bardanaPerNug || 0,
        bardanaAt: (selectedItem.bardanaPerNug || 0) * quantity,
        laga: selectedItem.laga || 0,
        lagaAt: (selectedItem.laga || 0) * quantity,
        crateMarkaId: currentItem.crateMarkaId || '',
        crateQty: currentItem.crateQty || 0,
        crateRate: currentItem.crateRate || 0,
        crateValue: currentItem.crateValue || 0
      })
      setShowDetailsModal(true)
    }
  }

  const completeAddItemToList = (itemToAdd = currentItem) => {
    // This is called after modal is saved
    if (itemToAdd.totalAmount === 0) {
      toast.error('Please configure commission and expenses')
      return
    }
    
    // Start transaction if not already active (Issue 2: add operation starts transaction)
    if (!tabTransactionState.isActive) {
      dispatch(startTabTransaction({ 
        tabId: tabId, 
        transactionType: 'quicksale' 
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
      toast.success('Item updated successfully')
    } else {
      // Add new item
      setItemRows([...itemRows, {
        tempId: `new-${nextTempId}`,
        ...itemToAdd
      }])
      setNextTempId(nextTempId + 1)
      toast.success('Item added to list')
    }

    // Reset current item
    setCurrentItem({
      itemId: '',
      itemName: '',
      accountId: '',
      accountName: '',
      nug: 0,
      kg: 0,
      rate: 0,
      per: 'nug',
      basicAmount: 0,
      totalAmount: 0,
      crateMarkaId: '',
      crateMarkaName: '',
      crateQty: 0,
      crateRate: 0,
      crateValue: 0
    })
  }

  const removeItemFromList = (tempId: string) => {
    // Start transaction if not already active (Issue 2: delete operation starts transaction)
    if (!tabTransactionState.isActive) {
      dispatch(startTabTransaction({ 
        tabId: tabId, 
        transactionType: 'quicksale' 
      }))
    }
    
    setItemRows(itemRows.filter(row => row.tempId !== tempId))
    toast.success('Item removed successfully')
  }

  const editItemFromList = (tempId: string) => {
    const itemToEdit = itemRows.find((row) => row.tempId === tempId)
    if (!itemToEdit) return

    // Set editing state
    setEditingItemTempId(tempId)

    // Populate the form with the item data (but don't remove from list)
    setCurrentItem({
      itemId: itemToEdit.itemId,
      itemName: itemToEdit.itemName,
      accountId: itemToEdit.accountId,
      accountName: itemToEdit.accountName,
      nug: itemToEdit.nug,
      kg: itemToEdit.kg,
      rate: itemToEdit.rate,
      per: itemToEdit.per,
      basicAmount: itemToEdit.basicAmount,
      totalAmount: itemToEdit.totalAmount,
      crateMarkaId: itemToEdit.crateMarkaId || '',
      crateMarkaName: itemToEdit.crateMarkaName || '',
      crateQty: itemToEdit.crateQty || 0,
      crateRate: itemToEdit.crateRate || 0,
      crateValue: itemToEdit.crateValue || 0,
    })

    toast.info('Item loaded for editing')
  }

  const clearInputs = () => {
    setCurrentItem({
      itemId: '',
      itemName: '',
      accountId: '',
      accountName: '',
      nug: 0,
      kg: 0,
      rate: 0,
      per: 'kg',
      basicAmount: 0,
      totalAmount: 0,
      crateMarkaId: '',
      crateMarkaName: '',
      crateQty: 0,
      crateRate: 0,
      crateValue: 0
    })
    setDetailsModalData({
      commission: 0,
      commissionPer: 0,
      marketFees: 0,
      rdf: 0,
      bardana: 0,
      bardanaAt: 0,
      laga: 0,
      lagaAt: 0,
      crateMarkaId: '',
      crateQty: 0,
      crateRate: 0,
      crateValue: 0
    })
    setEditingItemTempId(null) // Clear editing state
    toast.success('Inputs cleared')
  }

  const toggleSelectAll = () => {
    if (selectedRows.length === itemRows.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(itemRows.map(row => row.tempId))
    }
  }

  const toggleRowSelection = (tempId: string) => {
    setSelectedRows(prev => 
      prev.includes(tempId) 
        ? prev.filter(id => id !== tempId)
        : [...prev, tempId]
    )
  }

  const deleteSelectedRows = () => {
    if (selectedRows.length === 0) return
    
    // Start transaction if not already active (Issue 2: delete operation starts transaction)
    if (!tabTransactionState.isActive) {
      dispatch(startTabTransaction({ 
        tabId: tabId, 
        transactionType: 'quicksale' 
      }))
    }
    
    setItemRows(itemRows.filter(row => !selectedRows.includes(row.tempId)))
    setSelectedRows([])
    toast.success(`${selectedRows.length} item(s) deleted successfully`)
  }

  const handleSave = async () => {
    if (!saleDate) {
      toast.error('Please select sale date')
      return
    }

    setSubmitting(true)

    try {
      // Prepare items
      const preparedItems = itemRows.map(row => {
        const item: CreateQuickSaleItemInput = {
          itemId: row.itemId,
          itemName: row.itemName,
          accountId: row.accountId,
          accountName: row.accountName,
          nug: row.nug,
          kg: row.kg,
          rate: row.rate,
          per: row.per,
          basicAmount: row.basicAmount,
          totalAmount: row.totalAmount
        }

        if (row.crateMarkaId) item.crateMarkaId = row.crateMarkaId
        if (row.crateMarkaName) item.crateMarkaName = row.crateMarkaName
        if (row.crateQty) item.crateQty = row.crateQty
        if (row.crateRate) item.crateRate = row.crateRate
        if (row.crateValue) item.crateValue = row.crateValue

        return item
      })

      let voucherToUse = voucherNo

      if (!editingQuickSaleId && !voucherToUse) {
        const voucherResponse = await window.api.quickSale.getNextVoucherNo(activeCompany!.id, saleDate)
        if (voucherResponse.success && voucherResponse.data) {
          voucherToUse = voucherResponse.data
          setVoucherNo(voucherResponse.data)
        }
      }

      let response

      if (editingQuickSaleId) {
        response = await window.api.quickSale.update(editingQuickSaleId, {
          saleDate,
          voucherNo: voucherToUse,
          items: preparedItems
        })
      } else {
        response = await window.api.quickSale.create({
          companyId: activeCompany!.id,
          saleDate,
          voucherNo: voucherToUse,
          items: preparedItems
        })
      }

      if (response.success) {
        toast.success(editingQuickSaleId ? 'Quick sale updated' : 'Quick sale saved')
        
        // End transaction after successful save (Issue 2: save ends transaction)
        dispatch(endTabTransaction({ 
          tabId: tabId, 
          saved: true 
        }))
        
        setShouldLoad(true) // Trigger reload after save
        await loadQuickSales() // This will trigger auto-load which will update savedItemRows
        
        // Broadcast to other tabs that data was saved
        broadcastQuickSaleSave()
      } else {
        toast.error(response.message || 'Failed to save quick sale')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save quick sale')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Only show confirmation if there are unsaved changes
    if (!isTransactionActive) return
    
    // Show alert dialog
    setShowCancelAlert(true)
  }
  
  const handleRefresh = async () => {
    if (isTransactionActive) {
      setShowRefreshAlert(true)
      return
    }
    await performRefresh()
  }
  
  const performRefresh = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadItems(),
        loadAccounts(),
        loadCrateMarkas()
      ])
      // Trigger reload after refresh (fixes refresh button not updating item list)
      setShouldLoad(true)
      // Reload quick sales (which will trigger auto-load for current date)
      await loadQuickSales()
      toast.success('Data refreshed successfully')
    } catch (error) {
      console.error('Refresh error:', error)
      toast.error('Failed to refresh data')
    } finally {
      setLoading(false)
      setShowRefreshAlert(false)
    }
  }

  const confirmCancel = () => {
    // Restore from saved state (atomic operation)
    setItemRows([...savedItemRows])
    
    // End transaction after cancel (Issue 2: cancel ends transaction)
    dispatch(endTabTransaction({ 
      tabId: tabId, 
      saved: false 
    }))
    
    setShowCancelAlert(false)
    toast.success('Changes cancelled - restored to last saved state')
  }


  // Get selected item to check if it maintains crates
  const selectedItem = items.find(i => i.id === currentItem.itemId)
  const showCrateFields = selectedItem?.maintainCratesInSalePurchase || false

  // Pagination calculations
  const totalPages = Math.ceil(itemRows.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRows = itemRows.slice(startIndex, endIndex)
  
  // Reset to page 1 when items change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [itemRows.length, currentPage, totalPages])

  // Calculate summary totals (Issues 3 & 4 fix)
  const summary = itemRows.reduce((acc, row) => ({
    count: acc.count + 1,
    totalCrates: acc.totalCrates + (row.crateQty || 0),
    totalCrateValue: acc.totalCrateValue + (row.crateValue || 0),
    totalNug: acc.totalNug + row.nug,
    totalWt: acc.totalWt + row.kg,
    basicAmt: acc.basicAmt + row.basicAmount,
    commExp: acc.commExp + (row.totalAmount - row.basicAmount),
    totalSalesAmt: acc.totalSalesAmt + row.totalAmount
  }), {
    count: 0,
    totalCrates: 0,
    totalCrateValue: 0,
    totalNug: 0,
    totalWt: 0,
    basicAmt: 0,
    commExp: 0,
    totalSalesAmt: 0
  })

  // Get current item balance for display
  const getItemBalance = () => {
    if (!currentItem.itemId) return null
    return `Bal. = ${currentItem.basicAmount.toFixed(2)} Dr.`
  }

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Package className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to manage quick sales</p>
        <Button onClick={() => navigate('/companies')}>
          Go to Company Manager
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Quick Sale</h1>
            <p className="text-sm text-muted-foreground">
              Company: {activeCompany.companyName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Date</Label>
          <Input
            type="date"
            value={saleDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const val = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (val > today) return
              setSaleDate(val)
            }}
            className="w-40"
          />
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Voucher</Label>
            <Input
              value={voucherNo}
              readOnly
              placeholder={voucherLoading ? 'Generating...' : 'Auto-generated'}
              className="w-44 bg-muted"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting || !isTransactionActive}
            variant="success"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          {isTransactionActive && (
            <Button
              onClick={handleCancel}
              variant="outline"
            >
              Cancel Transaction
            </Button>
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
                {/* Item Name */}
                <div className="col-span-2">
                  <Label className="text-sm font-semibold mb-1">Item Name</Label>
                  <Combobox
                    options={items.map(item => ({ value: item.id, label: item.itemName }))}
                    value={currentItem.itemId}
                    onChange={handleItemSelect}
                    onCreateNew={() => {
                      setNewItemName('')
                      setShowItemCreateDialog(true)
                    }}
                    placeholder="Select item"
                    searchPlaceholder="Search items..."
                    emptyText="No item found"
                    createNewLabel="+ Create New Item"
                  />
                </div>

                {/* Account Name */}
                <div className="col-span-2">
                  <Label className="text-sm font-semibold mb-1">
                    Name {getItemBalance() && (
                      <span className="text-red-500 ml-2 text-xs">
                        {getItemBalance()}
                      </span>
                    )}
                  </Label>
                  <Combobox
                    options={accounts.map(account => ({ value: account.id, label: account.accountName }))}
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

                {/* Nug */}
                <div className="col-span-1">
                  <Label className="text-sm font-semibold mb-1">Nug</Label>
                  <Input
                    type="number"
                    value={currentItem.nug || ''}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, nug: Number(e.target.value) }))}
                    className="h-10 text-center font-medium"
                    min="0"
                  />
                </div>

                {/* Kg */}
                <div className="col-span-1">
                  <Label className="text-sm font-semibold mb-1">Kg</Label>
                  <Input
                    type="number"
                    value={currentItem.kg || ''}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, kg: Number(e.target.value) }))}
                    className="h-10 text-center font-medium"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Rate */}
                <div className="col-span-1">
                  <Label className="text-sm font-semibold mb-1">Rate</Label>
                  <Input
                    type="number"
                    value={currentItem.rate || ''}
                    onChange={(e) => setCurrentItem(prev => ({ ...prev, rate: Number(e.target.value) }))}
                    className="h-10 text-center font-medium"
                    min="0"
                  />
                </div>

                {/* Per */}
                <div className="col-span-1">
                  <Label className="text-sm font-semibold mb-1">Per</Label>
                  <Select
                    value={currentItem.per}
                    onValueChange={(value) => setCurrentItem(prev => ({ ...prev, per: value as 'nug' | 'kg' }))}
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

                {/* Basic Amt */}
                <div className="col-span-2">
                  <Label className="text-sm font-semibold mb-1">Basic Amt</Label>
                  <Input
                    type="number"
                    value={currentItem.basicAmount || ''}
                    readOnly
                    className="h-10 text-center font-semibold bg-gray-50"
                  />
                </div>

                {/* Total Amt */}
                <div className="col-span-1">
                  <Label className="text-sm font-semibold mb-1">
                    Total Amt {currentItem.totalAmount > 0 && (
                      <span className="text-red-600 ml-2">
                        {currentItem.totalAmount.toFixed(2)}
                      </span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    value={currentItem.totalAmount || ''}
                    readOnly
                    className="h-10 text-center font-semibold bg-gray-50"
                    min="0"
                  />
                </div>

                {/* Add Button */}
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
                      onClick={addItemToList}
                      className="w-full h-10"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {editingItemTempId ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Added Items List */}
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
                    <TableHead className="font-bold">ItemName</TableHead>
                    <TableHead className="font-bold">AccountName</TableHead>
                    <TableHead className="font-bold text-right">Nug</TableHead>
                    <TableHead className="font-bold text-right">Wt</TableHead>
                    <TableHead className="font-bold text-right">Price</TableHead>
                    <TableHead className="font-bold">Per</TableHead>
                    <TableHead className="font-bold text-right">Basic</TableHead>
                    <TableHead className="font-bold text-right">Amount</TableHead>
                    <TableHead className="font-bold">Crate Marka</TableHead>
                    <TableHead className="font-bold text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                        No items added yet. Add items using the form above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row, index) => {
                      const actualIndex = startIndex + index
                      const isSelected = selectedRowIndex === index
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
                            onCheckedChange={() => toggleRowSelection(row.tempId)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{itemRows.length - actualIndex}</TableCell>
                        <TableCell className="font-medium">{row.itemName}</TableCell>
                        <TableCell>{row.accountName}</TableCell>
                        <TableCell className="text-right">{row.nug}</TableCell>
                        <TableCell className="text-right">{row.kg}</TableCell>
                        <TableCell className="text-right">{row.rate.toFixed(2)}</TableCell>
                        <TableCell className="uppercase">{row.per}</TableCell>
                        <TableCell className="text-right">{row.basicAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">{row.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>{row.crateMarkaName || '-'}</TableCell>
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
                                removeItemFromList(row.tempId)
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})
                  )}
                </TableBody>
              </Table>
            </CardContent>
            
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
                  <span className="text-sm font-medium">
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
          </Card>
          </div>
        </div>
      </div>

      {/* Summary Footer - Fixed at Bottom */}
      <div className="border-t bg-white shadow-lg">
        <div className="max-w-[1400px] mx-auto p-4">
          <div className="grid grid-cols-8 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Count</div>
              <div className="text-xl font-bold">{summary.count}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Crates</div>
              <div className="text-xl font-bold">{summary.totalCrates}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Crate Value</div>
              <div className="text-xl font-bold">{summary.totalCrateValue.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Nug</div>
              <div className="text-xl font-bold">{summary.totalNug}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Wt.</div>
              <div className="text-xl font-bold">{summary.totalWt.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Basic Amt</div>
              <div className="text-xl font-bold">{summary.basicAmt.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Comm. + Exp</div>
              <div className="text-xl font-bold">{summary.commExp.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Sales Amt</div>
              <div className="text-xl font-bold text-primary">{summary.totalSalesAmt.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal - Commission, Expenses, Crate */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Commission, Expenses & Crate Details</DialogTitle>
            <DialogDescription>
              Configure commission, market fees, expenses, and crate information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Commission and Expenses - Editable (Issue 2) */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-3">Commission & Expenses (editable - changes will recalculate total)</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Cm%</Label>
                    <Input
                      type="number"
                      value={detailsModalData.commission || ''}
                      onChange={(e) => setDetailsModalData(prev => ({ ...prev, commission: Number(e.target.value) || 0 }))}
                      className="h-9"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Commission</Label>
                    <Input
                      type="number"
                      value={((detailsModalData.commission / 100) * currentItem.basicAmount).toFixed(2)}
                      readOnly
                      className="h-9 bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">MarketFees%</Label>
                    <Input
                      type="number"
                      value={detailsModalData.marketFees || ''}
                      onChange={(e) => setDetailsModalData(prev => ({ ...prev, marketFees: Number(e.target.value) || 0 }))}
                      className="h-9"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Market Fees</Label>
                    <Input
                      type="number"
                      value={((detailsModalData.marketFees / 100) * currentItem.basicAmount).toFixed(2)}
                      readOnly
                      className="h-9 bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">R.D.F%</Label>
                    <Input
                      type="number"
                      value={detailsModalData.rdf || ''}
                      onChange={(e) => setDetailsModalData(prev => ({ ...prev, rdf: Number(e.target.value) || 0 }))}
                      className="h-9"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">RDF</Label>
                    <Input
                      type="number"
                      value={((detailsModalData.rdf / 100) * currentItem.basicAmount).toFixed(2)}
                      readOnly
                      className="h-9 bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Bar @</Label>
                    <Input
                      type="number"
                      value={detailsModalData.bardana || ''}
                      onChange={(e) => setDetailsModalData(prev => ({ ...prev, bardana: Number(e.target.value) || 0 }))}
                      className="h-9"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Bardana</Label>
                    <Input
                      type="number"
                      value={(detailsModalData.bardana * (currentItem.per === 'nug' ? currentItem.nug : currentItem.kg)).toFixed(2)}
                      readOnly
                      className="h-9 bg-gray-100"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Laga @</Label>
                    <Input
                      type="number"
                      value={detailsModalData.laga || ''}
                      onChange={(e) => setDetailsModalData(prev => ({ ...prev, laga: Number(e.target.value) || 0 }))}
                      className="h-9"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Laga</Label>
                    <Input
                      type="number"
                      value={(detailsModalData.laga * (currentItem.per === 'nug' ? currentItem.nug : currentItem.kg)).toFixed(2)}
                      readOnly
                      className="h-9 bg-gray-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Crate Details - Only if item maintains crates */}
            {showCrateFields && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Crate Marka</Label>
                      <Select
                        value={detailsModalData.crateMarkaId}
                        onValueChange={(value) => {
                          const crate = crateMarkas.find(c => c.id === value)
                          setDetailsModalData(prev => ({
                            ...prev,
                            crateMarkaId: value,
                            crateRate: crate?.cost || 0,
                            crateValue: prev.crateQty * (crate?.cost || 0)
                          }))
                          setCurrentItem(prev => ({
                            ...prev,
                            crateMarkaName: crate?.crateMarkaName || ''
                          }))
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select crate" />
                        </SelectTrigger>
                        <SelectContent>
                          {crateMarkas.map((crate) => (
                            <SelectItem key={crate.id} value={crate.id}>
                              {crate.crateMarkaName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Crate Qty</Label>
                      <Input
                        type="number"
                        value={detailsModalData.crateQty === 0 ? '' : detailsModalData.crateQty}
                        onChange={(e) => {
                          const qty = Number(e.target.value) || 0
                          setDetailsModalData(prev => ({
                            ...prev,
                            crateQty: qty,
                            crateValue: qty * prev.crateRate
                          }))
                        }}
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Cr. Rate</Label>
                      <Input
                        type="number"
                        value={detailsModalData.crateRate === 0 ? '' : detailsModalData.crateRate}
                        onChange={(e) => {
                          const rate = Number(e.target.value) || 0
                          setDetailsModalData(prev => ({
                            ...prev,
                            crateRate: rate,
                            crateValue: prev.crateQty * rate
                          }))
                        }}
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs">Crate Value</Label>
                      <Input
                        type="number"
                        value={detailsModalData.crateValue}
                        readOnly
                        className="h-9 bg-gray-100"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleDetailsModalCancel}>
              Cancel
            </Button>
            <Button onClick={handleDetailsModalSave}>
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Refresh Confirmation Dialog */}
      <AlertDialog open={showRefreshAlert} onOpenChange={setShowRefreshAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Refreshing will discard all current changes.
              Do you want to save your changes before refreshing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowRefreshAlert(false)
                confirmCancel() // Discard changes
                performRefresh() // Then refresh
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard & Refresh
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={async () => {
                await handleSave() // Save first
                await performRefresh() // Then refresh
              }}
            >
              Save & Refresh
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Item Create Dialog */}
      <ItemCreateDialog
        open={showItemCreateDialog}
        onOpenChange={setShowItemCreateDialog}
        onItemCreated={(item) => {
          // Reload items to get the full item object
          loadItems()
          handleItemSelect(item.id)
          setNewItemName('')
        }}
        initialName={newItemName}
        companyId={activeCompany?.id || ''}
      />

      {/* Account Create Dialog */}
      <AccountCreateDialog
        open={showAccountCreateDialog}
        onOpenChange={setShowAccountCreateDialog}
        onAccountCreated={(account) => {
          // Reload accounts to get the full account object
          loadAccounts()
          handleAccountSelect(account.id)
          setNewAccountName('')
        }}
        initialName={newAccountName}
      />
    </div>
  )
}
