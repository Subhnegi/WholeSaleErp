/**
 * Stock Sale Management Page
 * Phase 15.3 - Stock Sale list page with date filters and table
 * 
 * Features:
 * - Date range filter
 * - Stock sale table with list of entries
 * - New, Edit, Delete, Print actions
 */

import { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { startTabTransaction, endTabTransaction } from '@/store/slices/tabSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Plus, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
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
import { Trash2, Edit2 } from 'lucide-react'

// Simple date formatting helper
const formatDateToISO = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface StockSale {
  id: string
  date: string
  supplierId: string
  supplierName?: string
  storeId: string
  storeName?: string
  totalNug: number
  totalKg: number
  basicAmount: number
  supplierAmount: number
  customerAmount: number
  items?: any[]
}

interface StockSaleManagementProps {
  tabId: string
}

export function StockSaleManagement({ tabId }: StockSaleManagementProps) {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((state) => state.company)
  const dispatch = useAppDispatch()

  // State
  const [stockSales, setStockSales] = useState<StockSale[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)

  // Filters
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Handle from date change with validation
  const handleFromDateChange = (newFromDate: string) => {
    const today = new Date().toISOString().split('T')[0]
    if (newFromDate > today) {
      toast.error('Date cannot be in the future')
      return
    }
    if (toDate && new Date(newFromDate) > new Date(toDate)) {
      toast.error('From date cannot be greater than to date')
      return
    }
    setFromDate(newFromDate)
  }

  // Handle to date change with validation
  const handleToDateChange = (newToDate: string) => {
    const today = new Date().toISOString().split('T')[0]
    if (newToDate > today) {
      toast.error('Date cannot be in the future')
      return
    }
    if (fromDate && new Date(newToDate) < new Date(fromDate)) {
      toast.error('To date cannot be less than from date')
      return
    }
    setToDate(newToDate)
  }

  // Initialize dates to current date or from localStorage
  useEffect(() => {
    const savedFromDate = localStorage.getItem('stockSaleFromDate')
    const savedToDate = localStorage.getItem('stockSaleToDate')
    
    if (savedFromDate && savedToDate) {
      setFromDate(savedFromDate)
      setToDate(savedToDate)
    } else {
      const today = new Date()
      const todayStr = formatDateToISO(today)
      setFromDate(todayStr)
      setToDate(todayStr)
    }
  }, [])

  // Save dates to localStorage when they change
  useEffect(() => {
    if (fromDate) {
      localStorage.setItem('stockSaleFromDate', fromDate)
    }
  }, [fromDate])

  useEffect(() => {
    if (toDate) {
      localStorage.setItem('stockSaleToDate', toDate)
    }
  }, [toDate])

  // Redirect if no company selected
  useEffect(() => {
    if (!activeCompany) {
      toast.error('Please select a company first')
      navigate('/dashboard')
    }
  }, [activeCompany, navigate])

  // Auto-load stock sales when dates are set and company is active
  useEffect(() => {
    if (activeCompany && fromDate && toDate) {
      loadStockSales()
    }
  }, [activeCompany, fromDate, toDate])

  // Keyboard shortcut: Ctrl+N to create new stock sale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when there are no rows
      if (!stockSales || stockSales.length === 0) {
        if (e.ctrlKey && e.key === 'n') {
          e.preventDefault()
          handleCreate()
        }
        return
      }

      // If focus is inside an input/select/textarea or a dialog, don't interfere
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.closest('[role="dialog"]')) {
          if (e.ctrlKey && e.key === 'n') {
            e.preventDefault()
            handleCreate()
          }
          return
        }
      }

      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        handleCreate()
        return
      }

      // Handle ArrowUp/ArrowDown for row navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const newIndex = prev === null ? 0 : Math.min(prev + 1, stockSales.length - 1)
          // Also select the row for summary
          setSelectedSaleId(stockSales[newIndex]?.id || null)
          return newIndex
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          const newIndex = prev === null ? 0 : Math.max(prev - 1, 0)
          // Also select the row for summary
          setSelectedSaleId(stockSales[newIndex]?.id || null)
          return newIndex
        })
      } else if (e.key === 'Enter') {
        if (highlightedIndex !== null) {
          e.preventDefault()
          const sale = stockSales[highlightedIndex]
          if (sale) handleEdit(sale)
        }
      } else if (e.key === 'Delete') {
        if (highlightedIndex !== null) {
          e.preventDefault()
          const sale = stockSales[highlightedIndex]
          if (sale) handleDelete(sale.id)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [stockSales, highlightedIndex])

  // Reset highlighted index when stock sales change
  useEffect(() => {
    setHighlightedIndex((prev) => {
      if (!stockSales || stockSales.length === 0) return null
      if (prev === null) return null
      return Math.min(prev, stockSales.length - 1)
    })
  }, [stockSales.length])

  const loadStockSales = async () => {
    if (!activeCompany) return

    setLoading(true)
    try {
      const response = await window.api.stockSale.list(activeCompany.id, {
        startDate: fromDate || undefined,
        endDate: toDate || undefined,
      })
      if (response.success && response.data) {
        setStockSales(response.data)
      } else {
        toast.error(response.error || 'Failed to load stock sales')
      }
    } catch (error: any) {
      console.error('Load stock sales error:', error)
      toast.error(error.message || 'An error occurred while loading stock sales')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadStockSales()
  }

  const handleCreate = () => {
    navigate('/entries/stock-sale/new')
  }

  const handleEdit = (stockSale: StockSale) => {
    navigate(`/entries/stock-sale/edit/${stockSale.id}`, { state: { stockSale } })
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    
    try {
      dispatch(startTabTransaction({ tabId, transactionType: 'stock-sale' }))
      const response = await window.api.stockSale.delete(deleteId)
      if (response.success) {
        toast.success('Stock sale deleted successfully')
        dispatch(endTabTransaction({ tabId, saved: true }))
        loadStockSales()
      } else {
        dispatch(endTabTransaction({ tabId, saved: false }))
        toast.error(response.error || 'Failed to delete stock sale')
      }
    } catch (error: any) {
      dispatch(endTabTransaction({ tabId, saved: false }))
      console.error('Delete error:', error)
      toast.error(error.message || 'An error occurred while deleting')
    } finally {
      setShowDeleteConfirm(false)
      setDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    
    try {
      dispatch(startTabTransaction({ tabId, transactionType: 'stock-sale' }))
      const response = await window.api.stockSale.bulkDelete(selectedIds)
      if (response.success) {
        const data = response.data
        if (data && (data.deletedCount ?? 0) > 0) {
          toast.success(`${data.deletedCount} stock sale(s) deleted successfully`)
        }
        if (data && (data.failedCount ?? 0) > 0) {
          toast.error(`Failed to delete ${data.failedCount} stock sale(s)`)
        }
        dispatch(endTabTransaction({ tabId, saved: (data?.deletedCount ?? 0) > 0 }))
        loadStockSales()
      } else {
        dispatch(endTabTransaction({ tabId, saved: false }))
        toast.error(response.error || 'Failed to delete stock sales')
      }
      setSelectedIds([])
    } catch (error: any) {
      dispatch(endTabTransaction({ tabId, saved: false }))
      console.error('Bulk delete error:', error)
      toast.error(error.message || 'An error occurred while deleting')
    }
  }

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === stockSales.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(stockSales.map((s) => s.id))
    }
  }

  const handleRowClick = (stockSale: StockSale, index: number) => {
    setSelectedSaleId(selectedSaleId === stockSale.id ? null : stockSale.id)
    setHighlightedIndex(index)
  }

  // Get selected stock sale for summary
  const selectedSale = selectedSaleId
    ? stockSales.find((s) => s.id === selectedSaleId)
    : null

  const handlePrint = () => {
    toast.info('Print functionality coming soon')
  }

  if (!activeCompany) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header - Similar to Daily Sale */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Stock Sale</h1>
            <p className="text-sm text-muted-foreground">Company: {activeCompany.companyName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">From Date</Label>
          <Input
            type="date"
            value={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => handleFromDateChange(e.target.value)}
            className="w-40"
          />
          <Label className="text-sm font-medium">To Date</Label>
          <Input
            type="date"
            value={toDate}
            min={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => handleToDateChange(e.target.value)}
            className="w-40"
          />
          
          <Button onClick={handleCreate} disabled={loading} size="lg" variant="cta">
            <Plus className="h-4 w-4" />
            <span className="flex flex-col items-center text-sm">
              New
              <span className="text-[10px] text-muted-foreground">(Ctrl+N)</span>
            </span>
          </Button>
          
          <Button variant="outline-blue" onClick={handlePrint} title="Print">
            <Printer className="h-4 w-4 mr-2 text-blue-600" />
            Print
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-full bg-white rounded-lg shadow">
          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="p-4 border-b bg-blue-50 flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === stockSales.length && stockSales.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Nug</TableHead>
                <TableHead className="text-right">Total Kg</TableHead>
                <TableHead className="text-right">Basic Amount</TableHead>
                <TableHead className="text-right">Supplier Amount</TableHead>
                <TableHead className="text-right">Customer Amount</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : stockSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No stock sales found. Click "New" to create one.
                  </TableCell>
                </TableRow>
              ) : (
              stockSales.map((stockSale, idx) => (
                  <TableRow
                    key={stockSale.id}
                    className={`cursor-pointer ${
                      selectedSaleId === stockSale.id 
                        ? 'bg-blue-200' 
                        : highlightedIndex === idx 
                          ? 'bg-muted/50' 
                          : selectedIds.includes(stockSale.id) 
                            ? 'bg-blue-50' 
                            : 'hover:bg-muted/30'
                    }`}
                    onClick={() => handleRowClick(stockSale, idx)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(stockSale.id)}
                        onCheckedChange={() => toggleRowSelection(stockSale.id)}
                      />
                    </TableCell>
                    <TableCell>{stockSale.date}</TableCell>
                    <TableCell className="text-right">{stockSale.totalNug}</TableCell>
                    <TableCell className="text-right">{stockSale.totalKg.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{stockSale.basicAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{stockSale.supplierAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{stockSale.customerAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(stockSale)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(stockSale.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Summary Totals Below Table */}
          {stockSales.length > 0 && (
            <div className="border-t p-4">
              <div className="flex items-center justify-end gap-6 text-sm font-semibold bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Total Nug:</span>
                  <span className="text-lg">
                    {stockSales.reduce((sum, s) => sum + s.totalNug, 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Total Kg:</span>
                  <span className="text-lg">
                    {stockSales.reduce((sum, s) => sum + s.totalKg, 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Basic Amt:</span>
                  <span className="text-lg">
                    ₹{stockSales.reduce((sum, s) => sum + s.basicAmount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Supplier Amt:</span>
                  <span className="text-lg">
                    ₹{stockSales.reduce((sum, s) => sum + s.supplierAmount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Customer Amt:</span>
                  <span className="text-xl font-bold text-primary">
                    ₹{stockSales.reduce((sum, s) => sum + s.customerAmount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Section - Shows when a stock sale is selected */}
        {selectedSale && (
          <div className="mt-6 space-y-4 bg-white rounded-lg shadow p-4">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">
                Summary - {selectedSale.date}
              </h3>
              <div className="grid grid-cols-6 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                <div>
                  <span className="text-muted-foreground">Total Nug:</span>
                  <span className="ml-2 font-medium">{selectedSale.totalNug}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Kg:</span>
                  <span className="ml-2 font-medium">{selectedSale.totalKg.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Basic Amount:</span>
                  <span className="ml-2 font-medium">₹{selectedSale.basicAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Supplier Amt:</span>
                  <span className="ml-2 font-medium">₹{selectedSale.supplierAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer Amt:</span>
                  <span className="ml-2 font-medium">₹{selectedSale.customerAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Store:</span>
                  <span className="ml-2 font-medium">{selectedSale.storeName || '-'}</span>
                </div>
              </div>
            </div>

            {/* Stock Sale Items Table */}
            {selectedSale.items && selectedSale.items.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Items ({selectedSale.items.length})</h4>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Sr.</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Lot No.</TableHead>
                        <TableHead className="text-right">Nug</TableHead>
                        <TableHead className="text-right">Kg</TableHead>
                        <TableHead className="text-right">Cust Rate</TableHead>
                        <TableHead className="text-right">Supp Rate</TableHead>
                        <TableHead className="text-right">Basic Amt</TableHead>
                        <TableHead className="text-right">Net Amt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.items.map((item: any, index: number) => (
                        <TableRow key={item.id || index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="text-sm">{item.itemName || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{item.customerName || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{item.lotNoVariety || '-'}</TableCell>
                          <TableCell className="text-right">{item.nug || 0}</TableCell>
                          <TableCell className="text-right">{(item.kg || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{(item.customerRate || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{(item.supplierRate || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{(item.basicAmount || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">₹{(item.netAmount || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this stock sale? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
