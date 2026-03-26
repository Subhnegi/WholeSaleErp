import { useEffect, useMemo, useState } from 'react'
import { useAppSelector } from '@/store/hooks'
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
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Printer,
  RefreshCw,
  Search
} from 'lucide-react'
import { toast } from 'sonner'

interface PendingSellerBillRow {
  arrivalId: string
  date: string
  voucherNo: string
  vehicleNo: string | null
  challanNo: string | null
  supplierId: string
  supplierName: string
  storeId: string | null
  storeName: string | null
  status: 'sold' | 'unsold'
  nug: number
  kg: number
  wattakAmount: number
}

interface PendingSellerBillTotals {
  totalRecords: number
  totalSoldNug: number
  totalSoldKg: number
  totalUnsoldNug: number
  totalUnsoldKg: number
  totalWattakAmount: number
}

interface SupplierOption {
  id: string
  name: string
}

interface StoreOption {
  id: string
  name: string
}

interface PendingGroupRow {
  id: string
  label: string
  totalRecords: number
  soldNug: number
  unsoldNug: number
  wattakAmount: number
}

const SESSION_FROM_KEY = 'pendingSellerBills.fromDate'
const SESSION_TO_KEY = 'pendingSellerBills.toDate'
const UNASSIGNED_STORE_KEY = '__unassigned_store__'
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
const DETAIL_COLUMN_COUNT = 8
const GROUP_COLUMN_COUNT = 5

type SortColumn =
  | 'date'
  | 'voucherNo'
  | 'vehicleNo'
  | 'supplier'
  | 'store'
  | 'status'
  | 'nug'
  | 'wattakAmount'

type GroupByOption = 'none' | 'supplier' | 'status' | 'store' | 'date'

const EMPTY_TOTALS: PendingSellerBillTotals = {
  totalRecords: 0,
  totalSoldNug: 0,
  totalSoldKg: 0,
  totalUnsoldNug: 0,
  totalUnsoldKg: 0,
  totalWattakAmount: 0
}

const formatDate = (value?: string | null) => {
  if (!value) return '—'
  return value.includes('T') ? value.split('T')[0] : value
}

const formatNumber = (value: number, fractionDigits = 2) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })

export function PendingSellerBillsPage() {
  const { activeCompany } = useAppSelector((state) => state.company)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<PendingSellerBillRow[]>([])
  const [totals, setTotals] = useState<PendingSellerBillTotals>(EMPTY_TOTALS)
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [stores, setStores] = useState<StoreOption[]>([])
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [storeFilter, setStoreFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'sold' | 'unsold'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [groupBy, setGroupBy] = useState<GroupByOption>('none')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    let initialFrom = today
    let initialTo = today

    try {
      const storedFrom = sessionStorage.getItem(SESSION_FROM_KEY)
      const storedTo = sessionStorage.getItem(SESSION_TO_KEY)
      if (storedFrom) initialFrom = storedFrom
      if (storedTo) initialTo = storedTo
    } catch (error) {
      console.error('Failed to read pending seller bill dates from session storage', error)
    }

    setFromDate(initialFrom)
    setToDate(initialTo)

    try {
      sessionStorage.setItem(SESSION_FROM_KEY, initialFrom)
      sessionStorage.setItem(SESSION_TO_KEY, initialTo)
    } catch (error) {
      console.error('Failed to persist pending seller bill dates to session storage', error)
    }
  }, [])

  useEffect(() => {
    if (!activeCompany?.id) return
    const loadSuppliers = async () => {
      try {
        const response = await window.api.sellerBill.listEligibleSuppliers(activeCompany.id)
        if (response.success && Array.isArray(response.data)) {
          const sorted = [...response.data].sort((a, b) => a.name.localeCompare(b.name))
          setSuppliers(sorted)
        }
      } catch (error) {
        console.error('Failed to load suppliers for pending seller bills', error)
      }
    }
    loadSuppliers()
  }, [activeCompany?.id])

  useEffect(() => {
    if (!activeCompany?.id) return
    const loadStores = async () => {
      try {
        const storesResponse = await window.api.store.listByCompany(activeCompany.id)
        const sorted = [...storesResponse].sort((a: any, b: any) => {
          const nameA = (a.name || a.storeName || '').toLowerCase()
          const nameB = (b.name || b.storeName || '').toLowerCase()
          return nameA.localeCompare(nameB)
        })
        const normalized = sorted.map((store: any) => ({
          id: store.id,
          name: store.name || store.storeName || 'Store'
        }))
        setStores(normalized)
      } catch (error) {
        console.error('Failed to load stores for pending seller bills', error)
      }
    }
    loadStores()
  }, [activeCompany?.id])

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)

    return () => window.clearTimeout(handler)
  }, [searchQuery])

  useEffect(() => {
    if (!activeCompany?.id || !fromDate || !toDate) return
    loadPendingBills()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeCompany?.id,
    fromDate,
    toDate,
    debouncedSearch,
    supplierFilter,
    storeFilter,
    statusFilter
  ])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, supplierFilter, storeFilter, statusFilter, fromDate, toDate, groupBy])

  const loadPendingBills = async () => {
    if (!activeCompany?.id || !fromDate || !toDate) return
    setLoading(true)
    try {
      const normalizedStoreId = storeFilter === 'all' ? undefined : storeFilter

      const response = await window.api.reports.pendingSellerBills(activeCompany.id, {
        startDate: fromDate,
        endDate: toDate,
        supplierId: supplierFilter !== 'all' ? supplierFilter : undefined,
        storeId: normalizedStoreId,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: debouncedSearch || undefined
      })

      if (response.success && response.data) {
        setRows(response.data.rows || [])
        setTotals(response.data.totals || EMPTY_TOTALS)
      } else {
        setRows([])
        setTotals(EMPTY_TOTALS)
        if (response.error) {
          toast.error(response.error)
        }
      }
    } catch (error: any) {
      console.error('Failed to load pending seller bills', error)
      toast.error(error?.message || 'Unable to load pending seller bills')
      setRows([])
      setTotals(EMPTY_TOTALS)
    } finally {
      setLoading(false)
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
      sessionStorage.setItem(SESSION_FROM_KEY, value)
    } catch (error) {
      console.error('Failed to persist pending seller bill from date', error)
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
      sessionStorage.setItem(SESSION_TO_KEY, value)
    } catch (error) {
      console.error('Failed to persist pending seller bill to date', error)
    }
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection(column === 'date' ? 'desc' : 'asc')
    }
  }

  const handleClearFilters = () => {
    setSupplierFilter('all')
    setStoreFilter('all')
    setStatusFilter('all')
    setSearchQuery('')
    setDebouncedSearch('')
    setGroupBy('none')
    setSortColumn('date')
    setSortDirection('desc')
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    loadPendingBills()
  }

  const handlePrint = () => {
    toast.info('Pending seller bill print preview coming soon')
  }

  const sortedRows = useMemo(() => {
    const data = [...rows]
    const direction = sortDirection === 'asc' ? 1 : -1

    data.sort((a, b) => {
      let result = 0
      switch (sortColumn) {
        case 'date':
          result = formatDate(a.date).localeCompare(formatDate(b.date))
          break
        case 'voucherNo':
          result = (a.voucherNo || '').localeCompare(b.voucherNo || '')
          break
        case 'vehicleNo':
          result = (a.vehicleNo || '').localeCompare(b.vehicleNo || '')
          break
        case 'supplier':
          result = (a.supplierName || '').localeCompare(b.supplierName || '')
          break
        case 'store': {
          const storeA = (a.storeName || 'Unassigned store').toLowerCase()
          const storeB = (b.storeName || 'Unassigned store').toLowerCase()
          result = storeA.localeCompare(storeB)
          break
        }
        case 'status':
          result = a.status.localeCompare(b.status)
          break
        case 'nug':
          result = a.nug - b.nug
          break
        case 'wattakAmount':
          result = a.wattakAmount - b.wattakAmount
          break
        default:
          result = 0
      }
      return result * direction
    })

    return data
  }, [rows, sortColumn, sortDirection])

  const groupedRows = useMemo(() => {
    if (groupBy === 'none') {
      return []
    }

    const map = new Map<string, PendingGroupRow>()

    const getGroupMeta = (row: PendingSellerBillRow): { id: string; label: string } => {
      switch (groupBy) {
        case 'supplier':
          return { id: row.supplierId, label: row.supplierName }
        case 'status':
          return {
            id: row.status,
            label: row.status === 'sold' ? 'Sold' : 'Unsold'
          }
        case 'store':
          return {
            id: row.storeId || UNASSIGNED_STORE_KEY,
            label: row.storeName || 'Unassigned Store'
          }
        case 'date':
          return { id: row.date, label: formatDate(row.date) }
        default:
          return { id: row.arrivalId, label: row.voucherNo || 'Voucher' }
      }
    }

    sortedRows.forEach((row) => {
      const { id, label } = getGroupMeta(row)
      const existing = map.get(id) || {
        id,
        label,
        totalRecords: 0,
        soldNug: 0,
        unsoldNug: 0,
        wattakAmount: 0
      }
      existing.totalRecords += 1
      if (row.status === 'sold') {
        existing.soldNug += row.nug
        existing.wattakAmount += row.wattakAmount
      } else {
        existing.unsoldNug += row.nug
      }
      map.set(id, existing)
    })

    return Array.from(map.values())
  }, [groupBy, sortedRows])

  const dataToDisplay = groupBy === 'none' ? sortedRows : groupedRows

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return dataToDisplay.slice(start, end)
  }, [dataToDisplay, currentPage, itemsPerPage])

  const totalPages = useMemo(() => {
    if (dataToDisplay.length === 0) return 1
    return Math.max(1, Math.ceil(dataToDisplay.length / itemsPerPage))
  }, [dataToDisplay.length, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const isDefaultSort = sortColumn === 'date' && sortDirection === 'desc'
  const hasActiveFilters =
    !isDefaultSort ||
    Boolean(debouncedSearch) ||
    supplierFilter !== 'all' ||
    storeFilter !== 'all' ||
    statusFilter !== 'all' ||
    groupBy !== 'none'

  const selectedSupplierName = useMemo(() => {
    if (supplierFilter === 'all') return null
    const supplier = suppliers.find((item) => item.id === supplierFilter)
    return supplier?.name || 'Supplier'
  }, [supplierFilter, suppliers])

  const selectedStoreName = useMemo(() => {
    if (storeFilter === 'all') return null
    const store = stores.find((item) => item.id === storeFilter)
    return store?.name || 'Store'
  }, [storeFilter, stores])

  if (!activeCompany) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to view pending seller bills.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Pending Seller Bills</h1>
          <p className="text-sm text-muted-foreground">Company: {activeCompany.companyName}</p>
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
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search voucher, supplier, vehicle, challan or store"
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

                  <div>
                    <Label className="text-xs text-muted-foreground">Store</Label>
                    <Select value={storeFilter} onValueChange={setStoreFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Stores" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all">All Stores</SelectItem>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'sold' | 'unsold')}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="unsold">Unsold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Group By</Label>
                    <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByOption)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="No Grouping" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Grouping</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="store">Store</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Active:</span>
                    {!isDefaultSort && (
                      <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                        <ArrowUpDown className="h-3 w-3" />
                        <span>
                          Sort: {sortColumn} ({sortDirection})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSortColumn('date')
                            setSortDirection('desc')
                          }}
                          className="text-muted-foreground transition hover:text-destructive"
                          title="Reset sort"
                        >
                          <FilterX className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {debouncedSearch && (
                      <div className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                        Search: “{debouncedSearch}”
                      </div>
                    )}
                    {supplierFilter !== 'all' && selectedSupplierName && (
                      <div className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                        Supplier: {selectedSupplierName}
                      </div>
                    )}
                    {storeFilter !== 'all' && selectedStoreName && (
                      <div className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                        Store: {selectedStoreName}
                      </div>
                    )}
                    {statusFilter !== 'all' && (
                      <div className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                        Status: {statusFilter === 'sold' ? 'Sold' : 'Unsold'}
                      </div>
                    )}
                    {groupBy !== 'none' && (
                      <div className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                        Grouped by: {groupBy}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-7 text-xs"
                    >
                      <FilterX className="mr-1 h-3 w-3" />
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {groupBy === 'none' ? (
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
                        <TableHead className="min-w-[150px]">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('vehicleNo')}
                          >
                            Vehicle / Challan
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
                        <TableHead className="min-w-40">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('store')}
                          >
                            Store
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="min-w-[100px]">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('status')}
                          >
                            Status
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
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
                            onClick={() => handleSort('wattakAmount')}
                          >
                            Wattak Amount
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                        <TableHead className="text-right">Sold Nug</TableHead>
                        <TableHead className="text-right">Unsold Nug</TableHead>
                        <TableHead className="text-right">Wattak Amount</TableHead>
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={groupBy === 'none' ? DETAIL_COLUMN_COUNT : GROUP_COLUMN_COUNT}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Loading pending seller bills…
                        </TableCell>
                      </TableRow>
                    ) : paginatedRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={groupBy === 'none' ? DETAIL_COLUMN_COUNT : GROUP_COLUMN_COUNT}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No pending seller bills found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : groupBy === 'none' ? (
                      (paginatedRows as PendingSellerBillRow[]).map((row) => (
                        <TableRow key={`${row.arrivalId}-${row.status}`}>
                          <TableCell>{formatDate(row.date)}</TableCell>
                          <TableCell>{row.voucherNo || '—'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{row.vehicleNo || 'Not set'}</span>
                              <span className="text-xs text-muted-foreground">
                                {row.challanNo || '—'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{row.supplierName || 'Unknown supplier'}</TableCell>
                          <TableCell>{row.storeName || 'Unassigned Store'}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                row.status === 'sold'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {row.status === 'sold' ? 'Sold' : 'Unsold'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(row.nug)}</TableCell>
                          <TableCell className="text-right">
                            {row.status === 'sold' ? `₹${formatNumber(row.wattakAmount)}` : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (paginatedRows as PendingGroupRow[]).map((group) => (
                        <TableRow key={group.id}>
                          <TableCell>{group.label}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.totalRecords, 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.soldNug)}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.unsoldNug)}</TableCell>
                          <TableCell className="text-right">₹{formatNumber(group.wattakAmount)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-muted-foreground">
                  Showing {dataToDisplay.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                  {dataToDisplay.length === 0
                    ? 0
                    : Math.min(currentPage * itemsPerPage, dataToDisplay.length)}{' '}
                  of {dataToDisplay.length} record(s)
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

        </div>
      </div>
      <div className="shrink-0 border-t bg-white">
        <div className="max-w-[1000px] mx-auto px-6 py-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center font-semibold border-r">Total Sold Nug</TableHead>
                <TableHead className="text-center font-semibold border-r">Total Unsold Nug</TableHead>
                <TableHead className="text-center font-semibold">Total Wattak Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="text-center font-semibold border-r">
                  {formatNumber(totals.totalSoldNug)}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  {formatNumber(totals.totalUnsoldNug)}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  ₹{formatNumber(totals.totalWattakAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
