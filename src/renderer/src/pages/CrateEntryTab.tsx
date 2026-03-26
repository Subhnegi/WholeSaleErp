import { useEffect, useState, useImperativeHandle, forwardRef, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Checkbox } from '@/components/ui/checkbox'
import { AccountFormModal } from '@/components/AccountFormModal'
import { CrateFormModal } from '@/components/CrateFormModal'
import { Pencil, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ArrowUpDown, FilterX, Plus } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui/table'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { startTabTransaction, endTabTransaction, selectTabTransactionState } from '@/store/slices/tabSlice'

interface Props {
  tabId: string
  mode: 'issue' | 'receive'
  entryDate: string
  onTransactionStateChange?: (isActive: boolean, submitting: boolean) => void
}

export interface CrateEntryTabRef {
  handleSave: () => Promise<void>
  handleCancel: () => void
  handleRefresh: () => Promise<void>
}

const CrateEntryTab = forwardRef<CrateEntryTabRef, Props>(({ tabId, mode, entryDate, onTransactionStateChange }, ref) => {
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((s) => s.company)
  const tabTransactionState = useAppSelector((state) => selectTabTransactionState(state, tabId))
  const isTransactionActive = tabTransactionState.isActive

  const [accounts, setAccounts] = useState<any[]>([])
  const [crateMarkas, setCrateMarkas] = useState<any[]>([])

  // Items state managed internally
  const [items, setItems] = useState<any[]>([])
  const [savedItems, setSavedItems] = useState<any[]>([])
  
  // Form row state
  const [slipCounter, setSlipCounter] = useState(1)
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined)
  const [selectedCrateId, setSelectedCrateId] = useState<string | undefined>(undefined)
  const [qty, setQty] = useState<number | ''>('')
  const [remarks, setRemarks] = useState<string>('')
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showCrateModal, setShowCrateModal] = useState(false)
  const [editingItemTempId, setEditingItemTempId] = useState<string | null>(null)
  const [nextTempId, setNextTempId] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  
  // Multi-select state for bulk delete
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  
  // Row selection for keyboard navigation
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

  // Check if any input fields have values (for showing Clear Input button)
  const hasInputValues = selectedAccountId !== undefined || selectedCrateId !== undefined || 
    qty !== '' || remarks !== ''

  // Cross-tab synchronization for Crate Entry data using BroadcastChannel
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  
  const broadcastCrateEntrySave = () => {
    console.log('[CrateEntry] Broadcasting save event to other tabs')
    const event = {
      type: 'CRATE_ENTRY_SAVED',
      timestamp: Date.now(),
      tabId: tabId,
      mode: mode,
      entryDate: entryDate
    }
    
    // Use BroadcastChannel for reliable cross-tab communication
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage(event)
    }
    
    // Also use localStorage as fallback
    localStorage.setItem('crateEntrySync', JSON.stringify(event))
    setTimeout(() => {
      localStorage.removeItem('crateEntrySync')
    }, 100)
  }

  // Listen for cross-tab save events using BroadcastChannel
  useEffect(() => {
    // Initialize BroadcastChannel
    const channel = new BroadcastChannel('crateentry-sync')
    broadcastChannelRef.current = channel
    
    const handleMessage = (event: MessageEvent) => {
      console.log('[CrateEntry] BroadcastChannel message received:', event.data)
      if (event.data.type === 'CRATE_ENTRY_SAVED' && event.data.tabId !== tabId) {
        console.log('[CrateEntry] Cross-tab sync event received, refreshing data...')
        // Another tab saved data, refresh our entries
        loadEntriesForDate()
      }
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'crateEntrySync' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue)
          if (event.type === 'CRATE_ENTRY_SAVED' && event.tabId !== tabId) {
            console.log('[CrateEntry] localStorage sync event received (fallback), refreshing data...')
            // Another tab saved data, refresh our entries
            loadEntriesForDate()
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

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    handleSave,
    handleCancel,
    handleRefresh
  }))

  const handleRefresh = async () => {
    // Reload accounts and crate markas
    if (activeCompany) {
      try {
        const [aResp, cResp] = await Promise.all([
          window.api.account.listByCompany(activeCompany.id),
          window.api.crate.listByCompany(activeCompany.id)
        ])
        if (aResp.success && aResp.data) {
          // Filter to show only customer (sundry debtor) or supplier (sundry creditor) accounts
          const customerAccounts = aResp.data.filter((acc: any) => {
            const groupName = acc.accountGroup?.name?.toLowerCase() || ''
            return groupName.includes('sundry debtor') || 
                   groupName.includes('sundry creditor') ||
                   groupName.includes('customer') ||
                   groupName.includes('supplier')
          })
          setAccounts(customerAccounts)
        }
        if (cResp.success && cResp.data) {
          setCrateMarkas(cResp.data)
        }
      } catch (e) {
        console.error('Refresh error:', e)
      }
    }
    // Reload entries for current date
    await loadEntriesForDate()
  }

  // Notify parent of transaction state changes
  useEffect(() => {
    onTransactionStateChange?.(isTransactionActive, submitting)
  }, [isTransactionActive, submitting, onTransactionStateChange])
  
  // Load entries when date or company changes
  useEffect(() => {
    if (!activeCompany || !entryDate) return
    loadEntriesForDate()
  }, [entryDate, activeCompany, mode])
  
  const loadEntriesForDate = async () => {
    if (!activeCompany) return
    
    try {
      const resp = mode === 'issue'
        ? await window.api.crateIssue.listByCompany(activeCompany.id)
        : await window.api.crateReceive.listByCompany(activeCompany.id)
      
      if (resp.success && resp.data) {
        const entriesForDate = resp.data.filter(entry => {
          const dateOnly = mode === 'issue' 
            ? ('issueDate' in entry ? entry.issueDate.split('T')[0] : '')
            : ('receiveDate' in entry ? entry.receiveDate.split('T')[0] : '')
          return dateOnly === entryDate
        })
        
        if (entriesForDate.length > 0) {
          // Combine all items from all entries for this date
          const allItems: any[] = []
          let itemCounter = 0
          
          entriesForDate.forEach(entry => {
            if (entry.items && entry.items.length > 0) {
              entry.items.forEach((item: any) => {
                allItems.push({
                  tempId: `existing-${item.id}-${itemCounter++}`,
                  slipNo: item.slipNo || (itemCounter),
                  accountId: item.accountId,
                  accountName: item.account?.accountName || 'Unknown',
                  crateMarkaId: item.crateMarkaId,
                  crateMarkaName: item.crateMarka?.crateMarkaName || 'Unknown',
                  qty: item.qty,
                  remarks: item.remarks || '',
                  entryId: entry.id
                })
              })
            }
          })
          
          setItems(allItems)
          setSavedItems(allItems)
          setSlipCounter(allItems.length + 1)
        } else {
          setItems([])
          setSavedItems([])
          setSlipCounter(1)
        }
      }
    } catch (error) {
      console.error('Load entries error:', error)
    }
  }
  
  const handleSave = async () => {
    if (!isTransactionActive) {
      toast('No active transaction to save', { icon: 'ℹ️' })
      return
    }

    if (!activeCompany) {
      toast.error('No active company selected')
      return
    }

    setSubmitting(true)
    try {
      // Get all entry IDs from SAVED items (original data) to ensure we delete all original entries
      // This handles the case where items are deleted locally - we still need to delete the original DB entries
      const allEntryIds = new Set(savedItems.map(item => item.entryId).filter(Boolean))
      
      // If no items, delete all entries for this date
      if (items.length === 0) {
        if (allEntryIds.size > 0) {
          const deletePromises = Array.from(allEntryIds).map(entryId =>
            mode === 'issue'
              ? window.api.crateIssue.delete(entryId as string)
              : window.api.crateReceive.delete(entryId as string)
          )
          
          await Promise.all(deletePromises)
          toast.success(`All entries deleted - ${allEntryIds.size} entries removed`)
        } else {
          toast.success('Transaction cleared - no items to save')
        }
        setSavedItems([]) // Update saved state after successful delete
        dispatch(endTabTransaction({ tabId, saved: true }))
        
        // Broadcast to other tabs that data was saved
        broadcastCrateEntrySave()
        return
      }
      
      // Prepare items for API
      const preparedItems = items.map(item => ({
        slipNo: String(item.slipNo),
        accountId: item.accountId,
        crateMarkaId: item.crateMarkaId,
        qty: item.qty,
        remarks: item.remarks || ''
      }))

      // Delete all old entries for this date (from original saved data)
      if (allEntryIds.size > 0) {
        const deletePromises = Array.from(allEntryIds).map(entryId =>
          mode === 'issue'
            ? window.api.crateIssue.delete(entryId as string)
            : window.api.crateReceive.delete(entryId as string)
        )
        await Promise.all(deletePromises)
      }
      
      // Create one new consolidated entry
      const result = mode === 'issue' 
        ? await window.api.crateIssue.create({
            companyId: activeCompany.id,
            issueDate: entryDate,
            items: preparedItems
          })
        : await window.api.crateReceive.create({
            companyId: activeCompany.id,
            receiveDate: entryDate,
            items: preparedItems
          })

      if (result.success) {
        toast.success(`Crate ${mode === 'issue' ? 'Issue' : 'Receive'} saved successfully`)
        dispatch(endTabTransaction({ tabId, saved: true }))
        
        // Reload entries for current date
        await loadEntriesForDate()
        
        // Broadcast to other tabs that data was saved
        broadcastCrateEntrySave()
      } else {
        toast.error(result.message || 'Failed to save')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save crate entry')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (!isTransactionActive) return
    
    // Restore from saved state
    setItems([...savedItems])
    dispatch(endTabTransaction({ tabId, saved: false }))
    toast.success('Transaction cancelled - restored to last saved state')
  }
  
  // Sorting
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Filters (search / group / dr-cr) to show active filters and clear button like AccountManagement
  const [searchQuery, setSearchQuery] = useState('')
  const [crateMarkaFilter, setCrateMarkaFilter] = useState<string>('all')
  const [drCrFilter, setDrCrFilter] = useState<string>('all')

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }
  const hasActiveSort = !!sortBy && sortBy !== ''
  const hasFilters = searchQuery !== '' || crateMarkaFilter !== 'all' || drCrFilter !== 'all'

  const handleClearAll = () => {
    setSearchQuery('')
    setCrateMarkaFilter('all')
    setDrCrFilter('all')
    setSortBy(null)
    setSortDir('asc')
    setCurrentPage(1)
  }
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  useEffect(() => {
    if (!activeCompany) return
    const load = async () => {
      try {
        const aResp = await window.api.account.listByCompany(activeCompany.id)
        if (aResp.success && aResp.data) {
          // Filter to show only customer (sundry debtor) or supplier (sundry creditor) accounts
          const customerAccounts = aResp.data.filter((acc: any) => {
            const groupName = acc.accountGroup?.name?.toLowerCase() || ''
            return groupName.includes('sundry debtor') || 
                   groupName.includes('sundry creditor') ||
                   groupName.includes('customer') ||
                   groupName.includes('supplier')
          })
          setAccounts(customerAccounts)
        }
      } catch (e) {
        console.error('Load accounts error:', e)
      }

      try {
        const cResp = await window.api.crate.listByCompany(activeCompany.id)
        if (cResp.success && cResp.data) {
          setCrateMarkas(cResp.data)
        }
      } catch (e) {
        console.error('Load crate markas error:', e)
      }
    }

    load()
  }, [activeCompany])

  const resetFormRow = () => {
    setSelectedAccountId(undefined)
    setSelectedCrateId(undefined)
    setQty('')
    setRemarks('')
    setEditingItemTempId(null)
  }

  const handleAddRow = () => {
    if (!selectedAccountId) {
      toast.error('Please select an account')
      return
    }
    if (!selectedCrateId) {
      toast.error('Please select a crate marka')
      return
    }
    const numericQty = typeof qty === 'string' && qty !== '' ? parseFloat(qty) : qty
    if (!numericQty || numericQty <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    const account = accounts.find((a) => a.id === selectedAccountId)
    const crate = crateMarkas.find((c) => c.id === selectedCrateId)

    // Start transaction if not already active (QuickSale pattern)
    if (!isTransactionActive) {
      dispatch(
        startTabTransaction({
          tabId,
          transactionType: mode === 'issue' ? 'crate-issue' : 'crate-receive'
        })
      )
    }
    
    if (editingItemTempId) {
      // Update existing item (keep in list, just update values)
      setItems(items.map(item => 
        item.tempId === editingItemTempId
          ? {
              ...item,
              accountId: selectedAccountId,
              accountName: account?.accountName || 'Unknown',
              crateMarkaId: selectedCrateId,
              crateMarkaName: crate?.crateMarkaName || 'Unknown',
              qty: numericQty,
              remarks
            }
          : item
      ))
      setEditingItemTempId(null)
      toast.success('Item updated successfully')
    } else {
      // Add new item
      const newItem = {
        tempId: `new-${nextTempId}`,
        slipNo: slipCounter,
        accountId: selectedAccountId,
        accountName: account?.accountName || 'Unknown',
        crateMarkaId: selectedCrateId,
        crateMarkaName: crate?.crateMarkaName || 'Unknown',
        qty: numericQty,
        remarks
      }

      setItems([...items, newItem])
      setNextTempId(prev => prev + 1)
      setSlipCounter((prev) => prev + 1)
      toast.success('Item added to list')
    }
    
    resetFormRow()

    // Start tab transaction if not already
    if (!isTransactionActive) {
      dispatch(
        startTabTransaction({
          tabId,
          transactionType: mode === 'issue' ? 'crate-issue' : 'crate-receive'
        })
      )
    }
  }

  const handleRemoveRow = (tempId: string) => {
    // Start tab transaction if not already active (QuickSale pattern)
    if (!isTransactionActive) {
      dispatch(
        startTabTransaction({
          tabId,
          transactionType: mode === 'issue' ? 'crate-issue' : 'crate-receive'
        })
      )
    }
    
    // Find item before removal for toast message
    const itemToRemove = items.find((i) => i.tempId === tempId)
    
    // Use functional update to avoid stale closure issues
    setItems(prev => prev.filter((i) => i.tempId !== tempId))
    toast.success(`Item removed (${itemToRemove?.crateMarkaName || 'Unknown'})`)
  }

  const handleEditRow = (tempId: string) => {
    const it = items.find((i) => i.tempId === tempId)
    if (!it) return
    
    // Set editing mode
    setEditingItemTempId(tempId)
    
    // Populate form with item values (keep in list - QuickSale pattern)
    setSelectedAccountId(it.accountId)
    setSelectedCrateId(it.crateMarkaId)
    setQty(it.qty)
    setRemarks(it.remarks || '')
    setSlipCounter(it.slipNo)
    
    toast.info('Item loaded for editing')
  }

  // Clear all input fields
  const clearInputs = () => {
    setSelectedAccountId(undefined)
    setSelectedCrateId(undefined)
    setQty('')
    setRemarks('')
    setEditingItemTempId(null)
    toast.success('Inputs cleared')
  }

  // Toggle select all rows
  const toggleSelectAll = () => {
    if (selectedRows.length === items.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(items.map(row => row.tempId))
    }
  }

  // Toggle row selection
  const toggleRowSelection = (tempId: string) => {
    setSelectedRows(prev => 
      prev.includes(tempId) 
        ? prev.filter(id => id !== tempId)
        : [...prev, tempId]
    )
  }

  // Delete selected rows (bulk delete)
  const deleteSelectedRows = () => {
    if (selectedRows.length === 0) return
    
    // Start transaction if not already active
    if (!isTransactionActive) {
      dispatch(startTabTransaction({ 
        tabId: tabId, 
        transactionType: mode === 'issue' ? 'crate-issue' : 'crate-receive' 
      }))
    }
    
    setItems(prev => prev.filter(row => !selectedRows.includes(row.tempId)))
    const deletedCount = selectedRows.length
    setSelectedRows([])
    setSelectedRowIndex(null)
    toast.success(`${deletedCount} item(s) deleted successfully`)
  }

  // Apply filters then sorting before pagination
  const sortedItems = useMemo(() => {
    let filtered = items
    if (searchQuery) {
      filtered = filtered.filter(i => (i.accountName || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.crateMarkaName || '').toLowerCase().includes(searchQuery.toLowerCase()))
    }
    if (crateMarkaFilter !== 'all') {
      filtered = filtered.filter(i => String(i.crateMarkaId) === String(crateMarkaFilter))
    }
    // drCrFilter placeholder - entries do not have Dr/Cr currently
    const copy = [...filtered]
    if (!sortBy) return copy
    const dirMul = sortDir === 'asc' ? 1 : -1
    copy.sort((a, b) => {
      const aa = (a as any)[sortBy]
      const bb = (b as any)[sortBy]
      // numeric compare when possible
      if (typeof aa === 'number' && typeof bb === 'number') return (aa - bb) * dirMul
      return String(aa || '').localeCompare(String(bb || '')) * dirMul
    })
    return copy
  }, [items, sortBy, sortDir, searchQuery, crateMarkaFilter])

  // Pagination calculations
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = sortedItems.slice(startIndex, endIndex)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [sortedItems.length, currentPage, totalPages])

  // Keyboard shortcuts: Enter to add item, Ctrl+S to save, arrows to navigate table, Delete to delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInModal = target.closest('[role="dialog"]')
      
      // Enter key to add item or toggle checkbox on highlighted row
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (isInModal) {
          return // Let modal handle Enter
        }
        
        // If a row is highlighted, toggle its checkbox
        if (selectedRowIndex !== null && paginatedItems.length > 0) {
          e.preventDefault()
          const row = paginatedItems[selectedRowIndex]
          if (row) {
            toggleRowSelection(row.tempId)
          }
        } else if (selectedAccountId && selectedCrateId && qty) {
          // Add to list if form has values (skip for textareas and combobox elements)
          if (target.tagName === 'TEXTAREA' || target.hasAttribute('role')) {
            return
          }
          e.preventDefault()
          handleAddRow()
        }
      }
      
      // Arrow Down: Navigate to next row
      if (e.key === 'ArrowDown' && !isInModal && paginatedItems.length > 0) {
        e.preventDefault()
        setSelectedRowIndex(prev => {
          const totalPageRows = paginatedItems.length
          if (prev === null) return 0
          return Math.min(prev + 1, totalPageRows - 1)
        })
      }
      
      // Arrow Up: Navigate to previous row
      if (e.key === 'ArrowUp' && !isInModal && paginatedItems.length > 0) {
        e.preventDefault()
        setSelectedRowIndex(prev => {
          if (prev === null) return 0
          return Math.max(prev - 1, 0)
        })
      }
      
      // Delete key: Remove all checked rows (bulk delete) or highlighted row if no checkboxes selected
      if (e.key === 'Delete' && !isInModal) {
        e.preventDefault()
        if (selectedRows.length > 0) {
          deleteSelectedRows()
        } else if (selectedRowIndex !== null && paginatedItems.length > 0) {
          // Delete highlighted row
          const row = paginatedItems[selectedRowIndex]
          if (row) {
            handleRemoveRow(row.tempId)
            // Adjust selectedRowIndex after deletion
            const totalPageRows = paginatedItems.length - 1
            if (totalPageRows === 0) {
              setSelectedRowIndex(null)
            } else if (selectedRowIndex >= totalPageRows) {
              setSelectedRowIndex(Math.max(0, totalPageRows - 1))
            }
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
  }, [paginatedItems, selectedRowIndex, selectedRows, selectedAccountId, selectedCrateId, qty])

  // Summary calculations
  const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0)
  const totalAmount = items.reduce((s, i) => {
    const crate = crateMarkas.find((c) => c.id === i.crateMarkaId)
    const rate = crate?.cost || 0
    return s + (i.qty || 0) * rate
  }, 0)

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Main content */}
      <div className="w-full space-y-4">
      <Card className="border-l-4 border-l-primary ">
        <CardContent className="p-4">
          <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-1">
          <Label className="text-sm">Slip</Label>
          <Input value={slipCounter} readOnly />
        </div>

        <div className="col-span-3">
          <Label className="text-sm">Account</Label>
          <Combobox
            options={accounts.map((a) => ({ value: a.id, label: a.accountName }))}
            value={selectedAccountId}
            onChange={(v) => setSelectedAccountId(v)}
            placeholder="Select account"
            onCreateNew={() => setShowAccountModal(true)}
            createNewLabel="Create account"
          />
        </div>

        <div className="col-span-3">
          <Label className="text-sm">Crate Marka</Label>
          <Combobox
            options={crateMarkas.map((c) => ({ value: c.id, label: c.crateMarkaName }))}
            value={selectedCrateId}
            onChange={(v) => setSelectedCrateId(v)}
            placeholder="Select crate marka"
            onCreateNew={() => setShowCrateModal(true)}
            createNewLabel="Create crate marka"
          />
        </div>

        <div className="col-span-1">
          <Label className="text-sm">Qty</Label>
          <Input
            type="number"
            value={qty === '' ? '' : String(qty)}
            onChange={(e) => setQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
          />
        </div>

        <div className="col-span-2">
          <Label className="text-sm">Remarks</Label>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>

        <div className="col-span-2">
          <Label className="text-sm">&nbsp;</Label>
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
            <Button onClick={handleAddRow} className="w-full h-10">
              <Plus className="h-4 w-4 mr-1" />
              {editingItemTempId ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </div>
        </CardContent>
      </Card>

      {/* Filters / Active indicators (AccountManagement parity) */}
      <div className="py-4">
        <div className="max-w-[1400px] mx-auto">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Input type="search" placeholder="Search account or marka..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-xs" />
                <div className="flex items-center gap-2">
                  <Select value={crateMarkaFilter} onValueChange={setCrateMarkaFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Crate Marka" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Markas</SelectItem>
                      {crateMarkas.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.crateMarkaName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={drCrFilter} onValueChange={setDrCrFilter}>
                    <SelectTrigger className="w-[120px]"><SelectValue placeholder="Dr/Cr" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Dr">Debit</SelectItem>
                      <SelectItem value="Cr">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        {/* Selected rows indicator - bulk delete */}
        {selectedRows.length > 0 && (
          <div className="flex items-center justify-between p-4 border-b bg-blue-50">
            <span className="text-sm font-medium text-blue-700">
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
          {/* Active Filters/Sort Indicators - matching AccountManagement pattern exactly */}
          {(hasActiveSort || hasFilters) && (
            <div className="flex items-center gap-2 flex-wrap p-4 border-b">
              <span className="text-sm text-muted-foreground">Active:</span>
              
              {hasActiveSort && (
                <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                  <ArrowUpDown className="h-3 w-3" />
                  <span>Sort: {String(sortBy)} ({sortDir})</span>
                  <button
                    onClick={() => { setSortBy(null); setSortDir('asc') }}
                    className="ml-1 hover:text-destructive"
                    title="Clear sort"
                  >
                    <FilterX className="h-3 w-3" />
                  </button>
                </div>
              )}
              
              {searchQuery && (
                <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                  <span>Search: "{searchQuery}"</span>
                </div>
              )}
              
              {crateMarkaFilter !== 'all' && (
                <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                  <span>Marka Filter</span>
                </div>
              )}
              
              {drCrFilter !== 'all' && (
                <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                  <span>Type: {drCrFilter}</span>
                </div>
              )}
              
              {(hasActiveSort || hasFilters) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 text-xs"
                >
                  <FilterX className="h-3 w-3 mr-1" />
                  Clear {hasActiveSort && hasFilters ? 'All' : hasActiveSort ? 'Sort' : 'Filters'}
                </Button>
              )}
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-bold w-12">
                  <Checkbox 
                    checked={items.length > 0 && selectedRows.length === items.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="font-bold w-12">S.N</TableHead>
                <TableHead className="font-bold">Slip No</TableHead>
                <TableHead className="font-bold">
                  <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('accountName')}>
                    <span>Account Name</span>
                    <span className="flex flex-col ml-1">
                      <ChevronUp className={sortBy === 'accountName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                      <ChevronDown className={sortBy === 'accountName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                    </span>
                  </button>
                </TableHead>
                <TableHead className="font-bold">
                  <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('crateMarkaName')}>
                    <span>Crate Marka</span>
                    <span className="flex flex-col ml-1">
                      <ChevronUp className={sortBy === 'crateMarkaName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                      <ChevronDown className={sortBy === 'crateMarkaName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                    </span>
                  </button>
                </TableHead>
                <TableHead className="font-bold text-right">
                  <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('qty')}>
                    <span>Qty</span>
                    <span className="flex flex-col ml-1 items-end">
                      <ChevronUp className={sortBy === 'qty' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                      <ChevronDown className={sortBy === 'qty' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                    </span>
                  </button>
                </TableHead>
                <TableHead className="font-bold">Remarks</TableHead>
                <TableHead className="font-bold text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {items.length === 0 ? 'No entries added' : 'No entries match the current filters'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((it, idx) => {
                  const isHighlighted = selectedRowIndex === idx
                  return (
                    <TableRow 
                      key={it.tempId}
                      className={`cursor-pointer ${isHighlighted ? 'bg-blue-100' : 'hover:bg-gray-50'}`}
                      onClick={() => setSelectedRowIndex(idx)}
                      onDoubleClick={() => handleEditRow(it.tempId)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedRows.includes(it.tempId)}
                          onCheckedChange={() => toggleRowSelection(it.tempId)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                      <TableCell>{it.slipNo}</TableCell>
                      <TableCell>{it.accountName}</TableCell>
                      <TableCell>{it.crateMarkaName}</TableCell>
                      <TableCell className="text-right">{it.qty}</TableCell>
                      <TableCell>{it.remarks}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditRow(it.tempId)
                            }}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveRow(it.tempId)
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
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
        </CardContent>

        {/* Pagination controls (Quick Sale style) inside Card footer */}
        {items.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="flex items-center">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(v) => {
                  setItemsPerPage(Number(v))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="w-[90px] h-8">
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
                {startIndex + 1}-{Math.min(endIndex, items.length)} of {items.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPage((prev) => Math.max(1, prev - 1))
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
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AccountFormModal
        open={showAccountModal}
        onOpenChange={setShowAccountModal}
        onSuccess={() => {
          setShowAccountModal(false)
          // reload accounts with filter for customer/supplier accounts
          if (activeCompany)
            window.api.account.listByCompany(activeCompany.id).then((r: any) => {
              if (r.success && r.data) {
                const filteredAccounts = r.data.filter((acc: any) => {
                  const groupName = acc.accountGroup?.name?.toLowerCase() || ''
                  return groupName.includes('sundry debtor') || 
                         groupName.includes('sundry creditor') ||
                         groupName.includes('customer') ||
                         groupName.includes('supplier')
                })
                setAccounts(filteredAccounts)
              }
            })
        }}
      />

      <CrateFormModal
        open={showCrateModal}
        onClose={() => setShowCrateModal(false)}
        onSuccess={() => {
          setShowCrateModal(false)
          if (activeCompany)
            window.api.crate.listByCompany(activeCompany.id).then((r: any) => {
              if (r.success) setCrateMarkas(r.data)
            })
        }}
        companyId={activeCompany?.id || ''}
      />

      </div>

      {/* Fixed Summary Footer - Bottom Right like CrateReceivable */}
      <div className="border-t bg-white shadow-lg fixed bottom-8 right-6 z-50 rounded-lg">
        <div className="w-72 p-4">
          <div className="flex justify-between text-center">
            <div>
              <div className="text-sm text-muted-foreground">Total Qty</div>
              <div className="text-xl font-bold">{totalQty}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-xl font-bold text-primary">₹{totalAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

CrateEntryTab.displayName = 'CrateEntryTab'

export default CrateEntryTab
