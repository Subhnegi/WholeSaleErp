import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { startTabTransaction, endTabTransaction } from '@/store/slices/tabSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { RefreshCw, Printer, FilterX, Search, ArrowUpDown, ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
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

const FROM_DATE_KEY = 'sellerBillManagement.fromDate'
const TO_DATE_KEY = 'sellerBillManagement.toDate'
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

type SortableColumn = 'date' | 'voucherNo' | 'supplier' | 'nug' | 'kg' | 'basic' | 'arrivalExpenses' | 'charges' | 'net'

interface SellerBillItem {
  id: string
  itemName?: string
  lotNo?: string | null
  nug: number
  kg: number
  rate: number
  per: string
  amount: number
}

interface SellerBillCharge {
  id: string
  chargesHeadName?: string
  plusMinus: string
  amount: number
}

interface SellerBillTotals {
  totalBills: number
  totalNug: number
  totalKg: number
  totalBasicAmount: number
  totalArrivalExpenses: number
  totalCharges: number
  totalNetAmount: number
}

interface SellerBill {
  id: string
  supplierName?: string
  accountName?: string
  accountId: string
  saleDate?: string
  vchNo: string
  stockSaleVoucherNo?: string | null
  vehicleNo?: string | null
  mode?: string | null
  totalNug: number
  totalKg: number
  basicAmount: number
  arrivalExpenses: number
  charges: number
  netAmount: number
  createdAt: string
  items?: SellerBillItem[]
  chargeLines?: SellerBillCharge[]
}

interface SellerBillManagementProps {
  tabId: string
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

export function SellerBillManagement({ tabId }: SellerBillManagementProps) {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((state) => state.company)
  const dispatch = useAppDispatch()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sellerBills, setSellerBills] = useState<SellerBill[]>([])
  const [totals, setTotals] = useState<SellerBillTotals>({
    totalBills: 0,
    totalNug: 0,
    totalKg: 0,
    totalBasicAmount: 0,
    totalArrivalExpenses: 0,
    totalCharges: 0,
    totalNetAmount: 0
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
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SellerBill | null>(null)

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
      console.error('Failed to read seller bill dates from session storage', error)
    }

    setFromDate(initialFrom)
    setToDate(initialTo)

    try {
      sessionStorage.setItem(FROM_DATE_KEY, initialFrom)
      sessionStorage.setItem(TO_DATE_KEY, initialTo)
    } catch (error) {
      console.error('Failed to persist seller bill dates into session storage', error)
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
        console.error('Failed to load suppliers for seller bill management', error)
      }
    }
    loadSuppliers()
  }, [activeCompany])

  useEffect(() => {
    if (!activeCompany || !fromDate || !toDate) return
    loadSellerBills()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, fromDate, toDate, debouncedSearch, supplierFilter])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => window.clearTimeout(handler)
  }, [searchQuery])

  const loadSellerBills = useCallback(async () => {
    if (!activeCompany || !fromDate || !toDate) return
    setLoading(true)
    try {
      const response = await window.api.sellerBill.list(activeCompany.id, {
        startDate: fromDate,
        endDate: toDate,
        supplierId: supplierFilter !== 'all' ? supplierFilter : undefined,
        search: debouncedSearch || undefined
      })

      if (response.success && response.data) {
        const normalizedBills = (response.data.bills || []).map((bill: any) => {
          const resolveDate = (value: any): string => {
            if (!value) return ''
            if (value instanceof Date) return value.toISOString()
            if (typeof value === 'string') return value
            return ''
          }

          const saleDate = resolveDate(bill.saleDate || bill.createdAt)
          const createdAt = resolveDate(bill.createdAt) || saleDate
          const supplierName = bill.supplierName || bill.accountName || bill.account?.accountName || ''

          return {
            ...bill,
            saleDate,
            createdAt,
            supplierName,
            accountName: bill.accountName || supplierName
          } as SellerBill
        })

        setSellerBills(normalizedBills)
        setTotals(response.data.totals)
      } else {
        setSellerBills([])
        setTotals({
          totalBills: 0,
          totalNug: 0,
          totalKg: 0,
          totalBasicAmount: 0,
          totalArrivalExpenses: 0,
          totalCharges: 0,
          totalNetAmount: 0
        })
        if (response?.error) {
          toast.error(response.error)
        }
      }
    } catch (error: any) {
      console.error('Failed to load seller bills', error)
      toast.error(error?.message || 'Unable to load seller bills')
      setSellerBills([])
    } finally {
      setLoading(false)
    }
  }, [activeCompany, fromDate, toDate, debouncedSearch, supplierFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, supplierFilter])

  // Keyboard shortcut: Ctrl+N to create new seller bill
  const sortedBills = useMemo(() => {
    const data = [...sellerBills]
    const direction = sortDirection === 'asc' ? 1 : -1

    data.sort((a, b) => {
      let result = 0
      switch (sortColumn) {
        case 'date':
          result = (a.saleDate || '').localeCompare(b.saleDate || '')
          break
        case 'voucherNo':
          result = (a.vchNo || '').localeCompare(b.vchNo || '')
          break
        case 'supplier':
          result = (a.accountName || '').localeCompare(b.accountName || '')
          break
        case 'nug':
          result = a.totalNug - b.totalNug
          break
        case 'kg':
          result = a.totalKg - b.totalKg
          break
        case 'basic':
          result = a.basicAmount - b.basicAmount
          break
        case 'arrivalExpenses':
          result = a.arrivalExpenses - b.arrivalExpenses
          break
        case 'charges':
          result = a.charges - b.charges
          break
        case 'net':
          result = a.netAmount - b.netAmount
          break
        default:
          result = 0
      }
      return result * direction
    })

    return data
  }, [sellerBills, sortColumn, sortDirection])

  const totalPages = useMemo(() => {
    if (sortedBills.length === 0) return 1
    return Math.max(1, Math.ceil(sortedBills.length / itemsPerPage))
  }, [sortedBills.length, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return sortedBills.slice(start, end)
  }, [sortedBills, currentPage, itemsPerPage])

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection(column === 'date' ? 'desc' : 'asc')
    }
  }

  const handleFromDateChange = (value: string) => {
    const today = new Date().toISOString().split('T')[0]
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
      console.error('Failed to persist seller bill from date', error)
    }
  }

  const handleToDateChange = (value: string) => {
    const today = new Date().toISOString().split('T')[0]
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
      console.error('Failed to persist seller bill to date', error)
    }
  }

  const handleClearFilters = () => {
    setSupplierFilter('all')
    setSearchQuery('')
    setDebouncedSearch('')
  }

  const handleRefresh = () => {
    loadSellerBills()
  }

  const handlePrint = () => {
    toast.info('Seller bill print preview coming soon')
  }

  const handleCreate = useCallback(() => {
    setSelectedBillId(null)
    navigate('/entries/seller-bill/new')
  }, [navigate])

  const handleEdit = useCallback(
    (bill: SellerBill) => {
      navigate(`/entries/seller-bill/edit/${bill.id}`, { state: { bill } })
    },
    [navigate]
  )

  const handleDelete = useCallback((bill: SellerBill) => {
    setDeleteTarget(bill)
    setConfirmDeleteOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      dispatch(startTabTransaction({ tabId, transactionType: 'sellerBill' }))
      const response = await window.api.sellerBill.delete(deleteTarget.id)
      if (response.success) {
        toast.success('Seller bill deleted successfully')
        if (selectedBillId === deleteTarget.id) {
          setSelectedBillId(null)
        }
        await loadSellerBills()
        dispatch(endTabTransaction({ tabId, saved: true }))
      } else {
        dispatch(endTabTransaction({ tabId, saved: false }))
        toast.error(response.error || 'Failed to delete seller bill')
      }
    } catch (error: any) {
      dispatch(endTabTransaction({ tabId, saved: false }))
      console.error('Failed to delete seller bill', error)
      toast.error(error?.message || 'Unable to delete seller bill')
    } finally {
      setConfirmDeleteOpen(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, dispatch, loadSellerBills, selectedBillId, tabId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault()
        handleCreate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCreate])

  const hasActiveFilters = debouncedSearch !== '' || supplierFilter !== 'all'

  const selectedBill = useMemo(
    () => sellerBills.find((bill) => bill.id === selectedBillId) || null,
    [sellerBills, selectedBillId]
  )

  const startIndex = sortedBills.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endIndex =
    sortedBills.length === 0 ? 0 : Math.min(startIndex + itemsPerPage - 1, sortedBills.length)

  if (!activeCompany) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to manage seller bills.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Seller Bill Management</h1>
            <p className="text-sm text-muted-foreground">Company: {activeCompany.companyName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">From Date</Label>
          <Input
            type="date"
            value={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(event) => handleFromDateChange(event.target.value)}
            className="w-40"
          />
          <Label className="text-sm font-medium">To Date</Label>
          <Input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            max={new Date().toISOString().split('T')[0]}
            onChange={(event) => handleToDateChange(event.target.value)}
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
        <div className="max-w-full">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search vouchers, suppliers, or vehicle/challan no."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-64 pl-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Supplier</Label>
                      <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="All Suppliers" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="all">All Suppliers</SelectItem>
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
                    <div className="flex items-center gap-2 flex-wrap p-2">
                      <span className="text-sm text-muted-foreground">Active:</span>
                      {debouncedSearch && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                          <span>Search: "{debouncedSearch}"</span>
                        </div>
                      )}
                      {supplierFilter !== 'all' && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                          <span>Supplier</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-7 text-xs"
                      >
                        <FilterX className="h-3 w-3 mr-1" />
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
                            <Button
                              variant="ghost"
                              className="-ml-3 h-auto p-0"
                              onClick={() => handleSort('date')}
                            >
                              Date
                              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </TableHead>
                          <TableHead className="min-w-[110px]">
                            <Button
                              variant="ghost"
                              className="-ml-3 h-auto p-0"
                              onClick={() => handleSort('voucherNo')}
                            >
                              Voucher
                              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </TableHead>
                          <TableHead className="min-w-[180px]">
                            <Button
                              variant="ghost"
                              className="-ml-3 h-auto p-0"
                              onClick={() => handleSort('supplier')}
                            >
                              Supplier
                              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </TableHead>
                          <TableHead className="min-w-[140px]">Vehicle/Challan</TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              className="-ml-3 h-auto p-0"
                              onClick={() => handleSort('nug')}
                            >
                              Nug
                              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              className="-ml-3 h-auto p-0"
                              onClick={() => handleSort('kg')}
                            >
                              Kg
                              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              className="-ml-3 h-auto p-0"
                              onClick={() => handleSort('basic')}
                            >
                              Basic Amt
                              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              className="-ml-3 h-auto p-0"
                              onClick={() => handleSort('arrivalExpenses')}
                            >
                              Arrival Exp.
                              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              className="-ml-3 h-auto p-0"
                              onClick={() => handleSort('charges')}
                            >
                              Charges
                              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              className="-ml-3 h-auto p-0"
                              onClick={() => handleSort('net')}
                            >
                              Net Amount
                              <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell
                              colSpan={11}
                              className="py-10 text-center text-muted-foreground"
                            >
                              Loading seller bills…
                            </TableCell>
                          </TableRow>
                        ) : paginatedBills.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={11}
                              className="py-10 text-center text-muted-foreground"
                            >
                              No seller bills found for the selected filters
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedBills.map((bill) => (
                            <TableRow 
                              key={bill.id}
                              onClick={() => setSelectedBillId(bill.id)}
                              className={selectedBillId === bill.id ? 'bg-indigo-50/70 cursor-pointer' : 'cursor-pointer'}
                            >
                              <TableCell>{formatDate(bill.saleDate)}</TableCell>
                              <TableCell>{bill.vchNo || '-'}</TableCell>
                              <TableCell>{bill.accountName || '—'}</TableCell>
                              <TableCell>
                                {bill.vehicleNo ? (
                                  <span className="text-sm">{bill.vehicleNo}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Not set</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(bill.totalNug, 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(bill.totalKg)}
                              </TableCell>
                              <TableCell className="text-right">
                                ₹{formatNumber(bill.basicAmount)}
                              </TableCell>
                              <TableCell className="text-right">
                                ₹{formatNumber(bill.arrivalExpenses)}
                              </TableCell>
                              <TableCell className="text-right">
                                ₹{formatNumber(bill.charges)}
                              </TableCell>
                              <TableCell className="text-right">
                                ₹{formatNumber(bill.netAmount)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleEdit(bill)
                                    }}
                                    title="Edit seller bill"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleDelete(bill)
                                    }}
                                    title="Delete seller bill"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
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
                      Showing {startIndex}-{endIndex} of {sortedBills.length} record(s)
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

              {/* Bill Details Panel - shown when a bill is selected */}
              {selectedBill && (
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Bill Details</h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(selectedBill)}
                          >
                            <Edit2 className="mr-1 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(selectedBill)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBillId(null)}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Voucher No.</p>
                          <p className="font-medium">{selectedBill.vchNo}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Date</p>
                          <p className="font-medium">{formatDate(selectedBill.saleDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Supplier</p>
                          <p className="font-medium">{selectedBill.accountName || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Vehicle / Challan</p>
                          <p className="font-medium">{selectedBill.vehicleNo || 'Not set'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Total Nug</p>
                          <p className="font-mono">{formatNumber(selectedBill.totalNug, 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Total Kg</p>
                          <p className="font-mono">{formatNumber(selectedBill.totalKg)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Basic Amount</p>
                          <p className="font-mono">₹{formatNumber(selectedBill.basicAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Arrival Expenses</p>
                          <p className="font-mono">₹{formatNumber(selectedBill.arrivalExpenses)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Charges</p>
                          <p className="font-mono">₹{formatNumber(selectedBill.charges)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Net Amount</p>
                          <p className="text-lg font-bold text-emerald-600">
                            ₹{formatNumber(selectedBill.netAmount)}
                          </p>
                        </div>
                      </div>

                      {/* Items Section */}
                      {selectedBill.items && selectedBill.items.length > 0 && (
                        <div>
                          <p className="text-xs uppercase text-muted-foreground mb-2">Items</p>
                          <div className="space-y-2">
                            {selectedBill.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-md border p-2 text-sm"
                              >
                                <div>
                                  <p className="font-medium">{item.itemName || 'Item'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Lot {item.lotNo || '—'} | {formatNumber(item.nug, 0)} nug | {formatNumber(item.kg)} kg
                                  </p>
                                </div>
                                <div className="text-right font-mono">
                                  <p>₹{formatNumber(item.amount)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    @ ₹{formatNumber(item.rate)}/{item.per}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Charges Section */}
                      {selectedBill.chargeLines && selectedBill.chargeLines.length > 0 && (
                        <div>
                          <p className="text-xs uppercase text-muted-foreground mb-2">Charges</p>
                          <div className="space-y-1">
                            {selectedBill.chargeLines.map((charge) => (
                              <div
                                key={charge.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span>{charge.chargesHeadName || 'Charge'}</span>
                                <span
                                  className={charge.plusMinus === '-' ? 'text-red-600' : 'text-emerald-600'}
                                >
                                  {charge.plusMinus}₹{formatNumber(charge.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Section - styled like ArrivalBookManagement */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold">Summary</h3>
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Total Bills:</span>
                        <span className="font-semibold text-lg">{sortedBills.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Total Nug:</span>
                        <span className="font-semibold text-lg">{formatNumber(totals.totalNug, 0)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Total Kg:</span>
                        <span className="font-semibold text-lg">{formatNumber(totals.totalKg)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Basic Amount:</span>
                        <span className="font-semibold text-lg">₹{formatNumber(totals.totalBasicAmount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Arrival Expenses:</span>
                        <span className="font-semibold text-lg">₹{formatNumber(totals.totalArrivalExpenses)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Charges:</span>
                        <span className="font-semibold text-lg">₹{formatNumber(totals.totalCharges)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Net Amount:</span>
                        <span className="font-bold text-xl text-emerald-600">₹{formatNumber(totals.totalNetAmount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
      </div>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open)
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete seller bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The bill voucher {deleteTarget?.vchNo || ''} will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  </div>
  )
}
