import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { startTabTransaction, endTabTransaction } from '@/store/slices/tabSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
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
  RefreshCw,
  Printer,
  FilterX,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'

const FROM_DATE_KEY = 'stockTransferManagement.fromDate'
const TO_DATE_KEY = 'stockTransferManagement.toDate'
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

type SortableColumn = 'date' | 'voucher' | 'supplier' | 'ourCost' | 'nug' | 'amount'

interface StockTransferItem {
  id: string
  itemName?: string
  lotNo?: string | null
  nug: number
  kg: number
  rate: number
  per: string
  basicAmount: number
}

interface StockTransferCharge {
  id: string
  chargesHeadName?: string
  plusMinus: '+' | '-'
  amount: number
}

interface StockTransfer {
  id: string
  vchNo: string
  accountId: string
  accountName?: string
  supplierName?: string
  vehicleNo?: string | null
  challanNo?: string | null
  createdAt?: string
  remarks?: string | null
  driverName?: string | null
  fromLocation?: string | null
  toLocation?: string | null
  freightAmount: number
  advanceAmount: number
  totalOurCost: number
  totalOurRate: number
  totalNug: number
  totalWt: number
  basicAmount: number
  totalCharges: number
  totalAmount: number
  items?: StockTransferItem[]
  chargeLines?: StockTransferCharge[]
}

interface StockTransferTotals {
  totalTransfers: number
  totalNug: number
  totalWt: number
  totalBasicAmount: number
  totalCharges: number
  totalAmount: number
  totalFreightAmount: number
  totalAdvanceAmount: number
  totalOurCost: number
  totalOurRate: number
}

interface StockTransferListResponse {
  transfers: StockTransfer[]
  totals: StockTransferTotals
}

type SupplierOption = { id: string; name: string }

const formatNumber = (value: number, fractionDigits = 2) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })

const formatDate = (value?: string) => {
  if (!value) return '—'
  return value.includes('T') ? value.split('T')[0] : value
}

interface StockTransferManagementProps {
  tabId: string
}

export function StockTransferManagement({ tabId }: StockTransferManagementProps) {
  void tabId // reserved for future tab-scoped interactions
  const { activeCompany } = useAppSelector((state) => state.company)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [totals, setTotals] = useState<StockTransferTotals>({
    totalTransfers: 0,
    totalNug: 0,
    totalWt: 0,
    totalBasicAmount: 0,
    totalCharges: 0,
    totalAmount: 0,
    totalFreightAmount: 0,
    totalAdvanceAmount: 0,
    totalOurCost: 0,
    totalOurRate: 0
  })
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortableColumn>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    let initialFrom = today
    let initialTo = today

    try {
      const storedFrom = sessionStorage.getItem(FROM_DATE_KEY)
      const storedTo = sessionStorage.getItem(TO_DATE_KEY)
      if (storedFrom) initialFrom = storedFrom
      if (storedTo) initialTo = storedTo
    } catch (error) {
      console.error('Failed to read stock transfer dates from storage', error)
    }

    setFromDate(initialFrom)
    setToDate(initialTo)

    try {
      sessionStorage.setItem(FROM_DATE_KEY, initialFrom)
      sessionStorage.setItem(TO_DATE_KEY, initialTo)
    } catch (error) {
      console.error('Failed to persist stock transfer dates', error)
    }
  }, [])

  useEffect(() => {
    if (!activeCompany) return
    const loadSuppliers = async () => {
      try {
        const response = await window.api.account.listByCompany(activeCompany.id)
        if (response.success && response.data) {
          const supplierAccounts = response.data.filter((account: any) => {
            const groupName = account.accountGroup?.name?.toLowerCase() || ''
            return (
              groupName.includes('supplier') ||
              groupName.includes('seller') ||
              groupName.includes('creditor')
            )
          })
          setSuppliers(
            supplierAccounts.map((account: any) => ({
              id: account.id,
              name: account.accountName
            }))
          )
        }
      } catch (error) {
        console.error('Failed to load suppliers for stock transfers', error)
      }
    }
    loadSuppliers()
  }, [activeCompany])

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => window.clearTimeout(handler)
  }, [searchQuery])

  const loadTransfers = useCallback(async () => {
    if (!activeCompany || !fromDate || !toDate) return
    setLoading(true)
    try {
      const response = await window.api.stockTransfer.list(activeCompany.id, {
        startDate: fromDate,
        endDate: toDate,
        accountId: supplierFilter !== 'all' ? supplierFilter : undefined,
        search: debouncedSearch || undefined
      })

      if (response.success && response.data) {
        const { transfers: rows, totals: aggregate } = response.data as StockTransferListResponse
        const normalizedTransfers = (rows || []).map((transfer) => {
          const createdAt = transfer.createdAt || ''
          return {
            ...transfer,
            createdAt
          }
        })

        setTransfers(normalizedTransfers)
        setTotals(aggregate || {
          totalTransfers: 0,
          totalNug: 0,
          totalWt: 0,
          totalBasicAmount: 0,
          totalCharges: 0,
          totalAmount: 0,
          totalFreightAmount: 0,
          totalAdvanceAmount: 0,
          totalOurCost: 0,
          totalOurRate: 0
        })
      } else {
        setTransfers([])
        setTotals({
          totalTransfers: 0,
          totalNug: 0,
          totalWt: 0,
          totalBasicAmount: 0,
          totalCharges: 0,
          totalAmount: 0,
          totalFreightAmount: 0,
          totalAdvanceAmount: 0,
          totalOurCost: 0,
          totalOurRate: 0
        })
        if (response.error) {
          toast.error(response.error)
        }
      }
    } catch (error: any) {
      console.error('Failed to load stock transfers', error)
      toast.error(error?.message || 'Unable to load stock transfers')
      setTransfers([])
    } finally {
      setLoading(false)
    }
  }, [activeCompany, fromDate, toDate, supplierFilter, debouncedSearch])

  useEffect(() => {
    if (!activeCompany || !fromDate || !toDate) return
    loadTransfers()
  }, [activeCompany, fromDate, toDate, debouncedSearch, supplierFilter, loadTransfers])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, supplierFilter])

  const sortedTransfers = useMemo(() => {
    const data = [...transfers]
    const direction = sortDirection === 'asc' ? 1 : -1

    data.sort((a, b) => {
      let result = 0
      switch (sortColumn) {
        case 'date':
          result = (a.createdAt || '').localeCompare(b.createdAt || '')
          break
        case 'voucher':
          result = (a.vchNo || '').localeCompare(b.vchNo || '')
          break
        case 'supplier':
          result = (a.accountName || '').localeCompare(b.accountName || '')
          break
        case 'ourCost':
          result = (a.totalOurCost || 0) - (b.totalOurCost || 0)
          break
        case 'nug':
          result = (a.totalNug || 0) - (b.totalNug || 0)
          break
        case 'amount':
          result = (a.totalAmount || 0) - (b.totalAmount || 0)
          break
        default:
          result = 0
      }
      return result * direction
    })

    return data
  }, [transfers, sortColumn, sortDirection])

  const totalPages = useMemo(() => {
    if (sortedTransfers.length === 0) return 1
    return Math.max(1, Math.ceil(sortedTransfers.length / itemsPerPage))
  }, [sortedTransfers.length, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return sortedTransfers.slice(start, end)
  }, [sortedTransfers, currentPage, itemsPerPage])

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection(column === 'date' ? 'desc' : 'asc')
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const handleFromDateChange = (value: string) => {
    if (value > today) {
      toast.error('From date cannot be in the future')
      return
    }
    if (toDate && value > toDate) {
      toast.error('From date cannot be after To date')
      return
    }
    setFromDate(value)
    try {
      sessionStorage.setItem(FROM_DATE_KEY, value)
    } catch (error) {
      console.error('Failed to persist from date', error)
    }
  }

  const handleToDateChange = (value: string) => {
    if (value > today) {
      toast.error('To date cannot be in the future')
      return
    }
    if (fromDate && value < fromDate) {
      toast.error('To date cannot be before From date')
      return
    }
    setToDate(value)
    try {
      sessionStorage.setItem(TO_DATE_KEY, value)
    } catch (error) {
      console.error('Failed to persist to date', error)
    }
  }

  const handleClearFilters = () => {
    setSupplierFilter('all')
    setSearchQuery('')
    setDebouncedSearch('')
  }

  const handleRefresh = () => {
    loadTransfers()
  }

  const handlePrint = () => {
    toast.info('Stock transfer print preview coming soon')
  }

  const handleCreate = useCallback(() => {
    setSelectedTransferId(null)
    navigate('/entries/stock-transfer/new')
  }, [navigate])

  const handleEdit = useCallback((transfer: StockTransfer) => {
    navigate(`/entries/stock-transfer/edit/${transfer.id}`)
  }, [navigate])

  const handleDelete = (id: string) => {
    setDeleteId(id)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteId) return

    try {
      dispatch(startTabTransaction({ tabId, transactionType: 'stockTransfer' }))
      const response = await window.api.stockTransfer.delete(deleteId)
      if (response.success) {
        toast.success('Stock transfer deleted successfully')
        dispatch(endTabTransaction({ tabId, saved: true }))
        loadTransfers()
      } else {
        dispatch(endTabTransaction({ tabId, saved: false }))
        toast.error(response.error || 'Failed to delete stock transfer')
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        handleCreate()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleCreate])

  const hasActiveFilters = debouncedSearch !== '' || supplierFilter !== 'all'
  const selectedTransfer = useMemo(
    () => transfers.find((transfer) => transfer.id === selectedTransferId) || null,
    [transfers, selectedTransferId]
  )

  const startIndex = sortedTransfers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endIndex =
    sortedTransfers.length === 0 ? 0 : Math.min(startIndex + itemsPerPage - 1, sortedTransfers.length)

  if (!activeCompany) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to manage stock transfers.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Stock Transfer Management</h1>
          <p className="text-sm text-muted-foreground">Company: {activeCompany.companyName}</p>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">From Date</Label>
          <Input
            type="date"
            value={fromDate}
            max={today}
            onChange={(event) => handleFromDateChange(event.target.value)}
            className="w-40"
          />
          <Label className="text-sm font-medium">To Date</Label>
          <Input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            max={today}
            onChange={(event) => handleToDateChange(event.target.value)}
            className="w-40"
          />
          <Button onClick={handleCreate} disabled={loading} size="lg" variant="cta">
            <Plus className="mr-2 h-4 w-4" />
            <span className="flex flex-col items-center text-sm">
              New
              <span className="text-[10px] text-muted-foreground">(Ctrl+N)</span>
            </span>
          </Button>
          <Button variant="outline-blue" onClick={handlePrint} title="Print">
            <Printer className="mr-2 h-4 w-4 text-blue-600" />
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

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search voucher, party, or vehicle"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-64 pl-10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Party</Label>
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="All Parties" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All Parties</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 p-2">
                  <span className="text-sm text-muted-foreground">Active:</span>
                  {debouncedSearch && (
                    <span className="rounded-md bg-secondary px-2 py-1 text-sm">
                      Search: "{debouncedSearch}"
                    </span>
                  )}
                  {supplierFilter !== 'all' && (
                    <span className="rounded-md bg-secondary px-2 py-1 text-sm">Party</span>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClearFilters}>
                    <FilterX className="mr-1 h-3 w-3" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[110px]">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('date')}>
                          Date
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[110px]">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('voucher')}>
                          Voucher
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[110px]">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('supplier')}>
                          Party
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[110px]">Supplier</TableHead>
                      <TableHead className="min-w-[110px]">Vehicle</TableHead>
                      <TableHead className="min-w-[110px]">
                        <Button variant="ghost" className="h-auto p-0" onClick={() => handleSort('ourCost')}>
                          Total Our Cost
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[110px]">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('nug')}>
                          Total Nug
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[110px]">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('amount')}>
                          Total Amount
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                          Loading stock transfers…
                        </TableCell>
                      </TableRow>
                    ) : paginatedTransfers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                          No stock transfers found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTransfers.map((transfer) => (
                        <TableRow
                          key={transfer.id}
                          onClick={() => setSelectedTransferId(transfer.id)}
                          className={
                            selectedTransferId === transfer.id
                              ? 'cursor-pointer bg-indigo-50/70'
                              : 'cursor-pointer'
                          }
                        >
                          <TableCell>{formatDate(transfer.createdAt)}</TableCell>
                          <TableCell>{transfer.vchNo || '—'}</TableCell>
                          <TableCell>{transfer.accountName || '—'}</TableCell>
                          <TableCell>{transfer.supplierName || <span className="text-xs text-muted-foreground">Not set</span>}</TableCell>
                          <TableCell>{transfer.vehicleNo || <span className="text-xs text-muted-foreground">Not set</span>}</TableCell>
                          <TableCell className="text-right">₹{formatNumber(transfer.totalOurCost)}</TableCell>
                          <TableCell className="text-right">{formatNumber(transfer.totalNug, 0)}</TableCell>
                          <TableCell className="text-right">₹{formatNumber(transfer.totalAmount)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(transfer)
                                }}
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(transfer.id)
                                }}
                                title="Delete"
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
              </div>

              <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-muted-foreground">
                  Showing {startIndex}-{endIndex} of {sortedTransfers.length} record(s)
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Rows per page</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="w-16 text-center text-sm">
                      Page {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedTransfer && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Transfer Details</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTransferId(null)}>
                    Close
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Voucher No.</p>
                    <p className="font-medium">{selectedTransfer.vchNo || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(selectedTransfer.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Party</p>
                    <p className="font-medium">{selectedTransfer.accountName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Vehicle</p>
                    <p className="font-medium">{selectedTransfer.vehicleNo || 'Not set'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Total Nug</p>
                    <p className="font-mono">{formatNumber(selectedTransfer.totalNug, 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Total Kg</p>
                    <p className="font-mono">{formatNumber(selectedTransfer.totalWt)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Basic Amount</p>
                    <p className="font-mono">₹{formatNumber(selectedTransfer.basicAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Charges</p>
                    <p className="font-mono">₹{formatNumber(selectedTransfer.totalCharges)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Total Our Cost</p>
                    <p className="font-mono">₹{formatNumber(selectedTransfer.totalOurCost)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Freight</p>
                    <p className="font-mono">₹{formatNumber(selectedTransfer.freightAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Advance</p>
                    <p className="font-mono text-red-500">₹{formatNumber(selectedTransfer.advanceAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Total Amount</p>
                    <p className="text-lg font-bold text-emerald-600">₹{formatNumber(selectedTransfer.totalAmount)}</p>
                  </div>
                </div>

                {selectedTransfer.items && selectedTransfer.items.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-2">Items ({selectedTransfer.items.length})</p>
                    <div className="space-y-2">
                      {selectedTransfer.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                          <div>
                            <p className="font-medium">{item.itemName || 'Item'}</p>
                            <p className="text-xs text-muted-foreground">
                              Lot {item.lotNo || '—'} | {formatNumber(item.nug, 0)} nug | {formatNumber(item.kg)} kg
                            </p>
                          </div>
                          <div className="text-right font-mono">
                            <p>₹{formatNumber(item.basicAmount)}</p>
                            <p className="text-xs text-muted-foreground">
                              @ ₹{formatNumber(item.rate)}/{item.per}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTransfer.chargeLines && selectedTransfer.chargeLines.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground mb-2">Charges</p>
                    <div className="space-y-1 text-sm">
                      {selectedTransfer.chargeLines.map((charge) => (
                        <div key={charge.id} className="flex items-center justify-between">
                          <span>{charge.chargesHeadName || 'Charge'}</span>
                          <span className={charge.plusMinus === '-' ? 'text-red-600' : 'text-emerald-600'}>
                            {charge.plusMinus}₹{formatNumber(charge.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">Summary</h3>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Transfers:</span>
                    <span className="text-lg font-semibold">{totals.totalTransfers}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Nug:</span>
                    <span className="text-lg font-semibold">{formatNumber(totals.totalNug, 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Kg:</span>
                    <span className="text-lg font-semibold">{formatNumber(totals.totalWt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Our Cost:</span>
                    <span className="text-lg font-semibold">₹{formatNumber(totals.totalOurCost)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Charges:</span>
                    <span className="text-lg font-semibold">₹{formatNumber(totals.totalCharges)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="text-xl font-bold text-emerald-600">₹{formatNumber(totals.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this stock transfer? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
