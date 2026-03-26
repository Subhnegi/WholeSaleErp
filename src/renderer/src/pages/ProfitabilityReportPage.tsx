import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { Badge } from '@/components/ui/badge'
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
import { openTab } from '@/store/slices/tabSlice'

type SortColumn =
  | 'date'
  | 'voucherNo'
  | 'vehicle'
  | 'supplier'
  | 'store'
  | 'nugReceived'
  | 'nugSold'
  | 'nugTransferred'
  | 'balanceNug'
  | 'kgReceived'
  | 'kgSold'
  | 'kgTransferred'
  | 'actualSale'
  | 'sellerBill'
  | 'profitLoss'
  | 'transferStatus'

type TransferStatus = 'none' | 'partial' | 'full'

interface SupplierOption {
  id: string
  name: string
}

interface ProfitabilityRow {
  arrivalId: string
  date: string
  voucherNo: string
  vehicleNo: string | null
  challanNo: string | null
  supplierId: string
  supplierName: string
  storeId: string | null
  storeName: string | null
  nugReceived: number
  nugSold: number
  nugTransferred: number
  balanceNug: number
  kgReceived: number
  kgSold: number
  kgTransferred: number
  actualSaleAmount: number
  sellerBillAmount: number
  profitLossAmount: number
  transferStatus: TransferStatus
}

interface StoreOption {
  id: string
  name: string
}

interface ProfitabilityGroupRow {
  id: string
  label: string
  totalRecords: number
  nugReceived: number
  nugSold: number
  nugTransferred: number
  balanceNug: number
  kgReceived: number
  kgSold: number
  kgTransferred: number
  actualSaleAmount: number
  sellerBillAmount: number
  profitLossAmount: number
}

interface ProfitabilityTotals {
  totalRecords: number
  totalNugReceived: number
  totalNugSold: number
  totalNugTransferred: number
  totalBalanceNug: number
  totalKgReceived: number
  totalKgSold: number
  totalKgTransferred: number
  totalActualSaleAmount: number
  totalSellerBillAmount: number
  totalProfitLossAmount: number
}

const SESSION_FROM_KEY = 'profitabilityReport.fromDate'
const SESSION_TO_KEY = 'profitabilityReport.toDate'
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
const MALL_KHATA_ACCOUNT_NAME = 'Mall Khata Purchase A/c'
const UNASSIGNED_STORE_KEY = '__unassigned_store__'
const DETAIL_COLUMN_COUNT = 16
const GROUP_COLUMN_COUNT = 9

const EMPTY_TOTALS: ProfitabilityTotals = {
  totalRecords: 0,
  totalNugReceived: 0,
  totalNugSold: 0,
  totalNugTransferred: 0,
  totalBalanceNug: 0,
  totalKgReceived: 0,
  totalKgSold: 0,
  totalKgTransferred: 0,
  totalActualSaleAmount: 0,
  totalSellerBillAmount: 0,
  totalProfitLossAmount: 0
}

const TRANSFER_STATUS_ORDER: Record<TransferStatus, number> = {
  none: 0,
  partial: 1,
  full: 2
}

const TRANSFER_STATUS_META: Record<TransferStatus, { label: string; badgeClassName: string }> = {
  none: {
    label: 'No transfer',
    badgeClassName: 'border-slate-200 text-slate-600'
  },
  partial: {
    label: 'Partially transferred',
    badgeClassName: 'border-amber-300 bg-amber-50 text-amber-700'
  },
  full: {
    label: 'Fully transferred',
    badgeClassName: 'border-emerald-300 bg-emerald-50 text-emerald-700'
  }
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

export function ProfitabilityReportPage() {
  const { activeCompany } = useAppSelector((state) => state.company)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<ProfitabilityRow[]>([])
  const [totals, setTotals] = useState<ProfitabilityTotals>(EMPTY_TOTALS)
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [mallKhataSupplier, setMallKhataSupplier] = useState<SupplierOption | null>(null)
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [stores, setStores] = useState<StoreOption[]>([])
  const [storeFilter, setStoreFilter] = useState('all')
  const [profitTypeFilter, setProfitTypeFilter] = useState<'all' | 'profit' | 'loss' | 'breakeven'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [groupBy, setGroupBy] = useState<'none' | 'supplier' | 'store' | 'profitability'>('none')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const supplierOptions = useMemo(() => {
    const map = new Map<string, string>()
    suppliers.forEach((supplier) => {
      map.set(supplier.id, supplier.name)
    })
    if (mallKhataSupplier) {
      map.set(mallKhataSupplier.id, mallKhataSupplier.name)
    }
    rows.forEach((row) => {
      if (row.supplierId && !map.has(row.supplierId)) {
        map.set(row.supplierId, row.supplierName)
      }
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [suppliers, rows, mallKhataSupplier])

  const getProfitCategory = (amount: number): 'profit' | 'loss' | 'breakeven' => {
    if (amount > 0.001) return 'profit'
    if (amount < -0.001) return 'loss'
    return 'breakeven'
  }

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
      console.error('Failed to read profitability report dates from session storage', error)
    }

    setFromDate(initialFrom)
    setToDate(initialTo)

    try {
      sessionStorage.setItem(SESSION_FROM_KEY, initialFrom)
      sessionStorage.setItem(SESSION_TO_KEY, initialTo)
    } catch (error) {
      console.error('Failed to persist profitability report dates to session storage', error)
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
        console.error('Failed to load suppliers for profitability report', error)
      }
    }
    loadSuppliers()
  }, [activeCompany?.id])

  useEffect(() => {
    if (!activeCompany?.id) return
    const loadMallKhataSupplier = async () => {
      try {
        const response = await window.api.account.listByCompany(activeCompany.id)
        if (response.success && Array.isArray(response.data)) {
          const match = response.data.find((account: any) =>
            (account.accountName || '').trim().toLowerCase() === MALL_KHATA_ACCOUNT_NAME.toLowerCase()
          )
          if (match) {
            setMallKhataSupplier({ id: match.id, name: match.accountName || MALL_KHATA_ACCOUNT_NAME })
          }
        }
      } catch (error) {
        console.error('Failed to load Mall Khata supplier for profitability report', error)
      }
    }
    loadMallKhataSupplier()
  }, [activeCompany?.id])

  useEffect(() => {
    if (!activeCompany?.id) return
    const loadStores = async () => {
      try {
        const storeList = await window.api.store.listByCompany(activeCompany.id)
        const normalized = storeList
          .map((store: any) => ({
            id: store.id,
            name: store.name || store.storeName || 'Store'
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setStores(normalized)
      } catch (error) {
        console.error('Failed to load stores for profitability report', error)
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
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany?.id, fromDate, toDate, debouncedSearch, supplierFilter, storeFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, supplierFilter, storeFilter, profitTypeFilter, groupBy, fromDate, toDate])

  const loadReport = async () => {
    if (!activeCompany?.id || !fromDate || !toDate) return
    setLoading(true)
    try {
      const normalizedStoreId = storeFilter === 'all' ? undefined : storeFilter

      const response = await window.api.reports.profitabilityReport(activeCompany.id, {
        startDate: fromDate,
        endDate: toDate,
        supplierId: supplierFilter !== 'all' ? supplierFilter : undefined,
        storeId: normalizedStoreId,
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
      console.error('Failed to load profitability report', error)
      toast.error(error?.message || 'Unable to load profitability report')
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
      console.error('Failed to persist profitability report from date', error)
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
      console.error('Failed to persist profitability report to date', error)
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
    setProfitTypeFilter('all')
    setGroupBy('none')
    setSearchQuery('')
    setDebouncedSearch('')
    setSortColumn('date')
    setSortDirection('desc')
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    loadReport()
  }

  const handleOpenLaddanReport = () => {
    dispatch(openTab({
      route: '/reports/laddan-profitability',
      title: 'Laddan Profitability Report',
      icon: 'PieChart',
      isTransaction: false
    }))
    navigate('/reports/laddan-profitability')
  }

  const handlePrint = () => {
    toast.info('Profitability report print preview coming soon')
  }

  const filteredRows = useMemo(() => {
    if (profitTypeFilter === 'all') {
      return [...rows]
    }
    return rows.filter((row) => getProfitCategory(row.profitLossAmount) === profitTypeFilter)
  }, [rows, profitTypeFilter])

  const sortedRows = useMemo(() => {
    const data = [...filteredRows]
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
        case 'vehicle': {
          const vehicleA = `${a.vehicleNo || ''} ${a.challanNo || ''}`.trim()
          const vehicleB = `${b.vehicleNo || ''} ${b.challanNo || ''}`.trim()
          result = vehicleA.localeCompare(vehicleB)
          break
        }
        case 'supplier':
          result = (a.supplierName || '').localeCompare(b.supplierName || '')
          break
        case 'store': {
          const storeA = (a.storeName || 'Unassigned store').toLowerCase()
          const storeB = (b.storeName || 'Unassigned store').toLowerCase()
          result = storeA.localeCompare(storeB)
          break
        }
        case 'nugReceived':
          result = a.nugReceived - b.nugReceived
          break
        case 'nugSold':
          result = a.nugSold - b.nugSold
          break
        case 'nugTransferred':
          result = a.nugTransferred - b.nugTransferred
          break
        case 'balanceNug':
          result = a.balanceNug - b.balanceNug
          break
        case 'kgReceived':
          result = a.kgReceived - b.kgReceived
          break
        case 'kgSold':
          result = a.kgSold - b.kgSold
          break
        case 'kgTransferred':
          result = a.kgTransferred - b.kgTransferred
          break
        case 'actualSale':
          result = a.actualSaleAmount - b.actualSaleAmount
          break
        case 'sellerBill':
          result = a.sellerBillAmount - b.sellerBillAmount
          break
        case 'profitLoss':
          result = a.profitLossAmount - b.profitLossAmount
          break
        case 'transferStatus':
          result = TRANSFER_STATUS_ORDER[a.transferStatus] - TRANSFER_STATUS_ORDER[b.transferStatus]
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

    const map = new Map<string, ProfitabilityGroupRow>()

    const getGroupMeta = (row: ProfitabilityRow): { id: string; label: string } => {
      switch (groupBy) {
        case 'supplier':
          return { id: row.supplierId, label: row.supplierName }
        case 'store':
          return {
            id: row.storeId || UNASSIGNED_STORE_KEY,
            label: row.storeName || 'Unassigned Store'
          }
        case 'profitability': {
          const bucket = getProfitCategory(row.profitLossAmount)
          const label =
            bucket === 'profit' ? 'Profit' : bucket === 'loss' ? 'Loss' : 'Break-even'
          return { id: bucket, label }
        }
        default:
          return { id: row.arrivalId, label: row.voucherNo || row.arrivalId }
      }
    }

    sortedRows.forEach((row) => {
      const { id, label } = getGroupMeta(row)
      const existing = map.get(id) || {
        id,
        label,
        totalRecords: 0,
        nugReceived: 0,
        nugSold: 0,
        nugTransferred: 0,
        balanceNug: 0,
        kgReceived: 0,
        kgSold: 0,
        kgTransferred: 0,
        actualSaleAmount: 0,
        sellerBillAmount: 0,
        profitLossAmount: 0
      }
      existing.totalRecords += 1
      existing.nugReceived += row.nugReceived
      existing.nugSold += row.nugSold
      existing.nugTransferred += row.nugTransferred
      existing.balanceNug += row.balanceNug
      existing.kgReceived += row.kgReceived
      existing.kgSold += row.kgSold
      existing.kgTransferred += row.kgTransferred
      existing.actualSaleAmount += row.actualSaleAmount
      existing.sellerBillAmount += row.sellerBillAmount
      existing.profitLossAmount += row.profitLossAmount
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
    profitTypeFilter !== 'all' ||
    groupBy !== 'none'

  const selectedSupplierName = useMemo(() => {
    if (supplierFilter === 'all') return null
    const supplier = supplierOptions.find((item) => item.id === supplierFilter)
    return supplier?.name || 'Supplier'
  }, [supplierFilter, supplierOptions])

  const selectedStoreName = useMemo(() => {
    if (storeFilter === 'all') return null
    const store = stores.find((item) => item.id === storeFilter)
    return store?.name || 'Store'
  }, [storeFilter, stores])

  if (!activeCompany) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to view profitability report.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Profitability Report</h1>
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
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
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
                        {supplierOptions.map((supplier) => (
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
                    <Label className="text-xs text-muted-foreground">Profit Type</Label>
                    <Select value={profitTypeFilter} onValueChange={(value) => setProfitTypeFilter(value as 'all' | 'profit' | 'loss' | 'breakeven')}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="profit">Profit</SelectItem>
                        <SelectItem value="loss">Loss</SelectItem>
                        <SelectItem value="breakeven">Break-even</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Group By</Label>
                    <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'none' | 'supplier' | 'store' | 'profitability')}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="No Grouping" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Grouping</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="store">Store</SelectItem>
                        <SelectItem value="profitability">Profit Type</SelectItem>
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
                    {profitTypeFilter !== 'all' && (
                      <div className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                        Profit Type: {profitTypeFilter === 'breakeven' ? 'Break-even' : profitTypeFilter === 'profit' ? 'Profit' : 'Loss'}
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

          <Card className="flex-1">
            <CardContent className="flex h-full flex-col p-0">
              <div className="flex-1 overflow-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
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
                            Voucher No
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="min-w-[150px]">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('vehicle')}
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
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('nugReceived')}
                          >
                            Nug Received
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('nugSold')}
                          >
                            Nug Sold
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('nugTransferred')}
                          >
                            Nug Transferred
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('balanceNug')}
                          >
                            Balance Nug
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('kgReceived')}
                          >
                            Kg Received
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('kgSold')}
                          >
                            Kg Sold
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('kgTransferred')}
                          >
                            Kg Transferred
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('actualSale')}
                          >
                            Actual Sale
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('sellerBill')}
                          >
                            Seller Bill
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('profitLoss')}
                          >
                            Profit / Loss
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('transferStatus')}
                          >
                            Transfer Status
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                        <TableHead className="text-right">Nug Received</TableHead>
                        <TableHead className="text-right">Nug Sold</TableHead>
                        <TableHead className="text-right">Nug Transferred</TableHead>
                        <TableHead className="text-right">Balance Nug</TableHead>
                        <TableHead className="text-right">Actual Sale</TableHead>
                        <TableHead className="text-right">Seller Bill</TableHead>
                        <TableHead className="text-right">Profit / Loss</TableHead>
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={groupBy === 'none' ? DETAIL_COLUMN_COUNT : GROUP_COLUMN_COUNT}
                          className="py-12 text-center text-sm text-muted-foreground"
                        >
                          Loading profitability report…
                        </TableCell>
                      </TableRow>
                    ) : paginatedRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={groupBy === 'none' ? DETAIL_COLUMN_COUNT : GROUP_COLUMN_COUNT}
                          className="py-12 text-center text-sm text-muted-foreground"
                        >
                          No records found for the selected filters.
                        </TableCell>
                      </TableRow>
                    ) : groupBy === 'none' ? (
                      (paginatedRows as ProfitabilityRow[]).map((row) => {
                        const statusMeta = TRANSFER_STATUS_META[row.transferStatus]
                        return (
                          <TableRow key={`${row.arrivalId}-${row.voucherNo}`} className="text-sm">
                            <TableCell>{formatDate(row.date)}</TableCell>
                            <TableCell>{row.voucherNo || '—'}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{row.vehicleNo || '—'}</span>
                                <span className="text-xs text-muted-foreground">{row.challanNo || '—'}</span>
                              </div>
                            </TableCell>
                            <TableCell>{row.supplierName}</TableCell>
                            <TableCell>{row.storeName || 'Unassigned Store'}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.nugReceived)}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.nugSold)}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.nugTransferred)}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.balanceNug)}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.kgReceived)}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.kgSold)}</TableCell>
                            <TableCell className="text-right">{formatNumber(row.kgTransferred)}</TableCell>
                            <TableCell className="text-right">₹{formatNumber(row.actualSaleAmount)}</TableCell>
                            <TableCell className="text-right">₹{formatNumber(row.sellerBillAmount)}</TableCell>
                            <TableCell
                              className={`text-right ${row.profitLossAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                            >
                              ₹{formatNumber(row.profitLossAmount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  variant="outline"
                                  className={`px-2 py-0.5 text-xs font-medium ${statusMeta.badgeClassName}`}
                                >
                                  {statusMeta.label}
                                </Badge>
                                {row.transferStatus !== 'none' && (
                                  <button
                                    type="button"
                                    className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline"
                                    onClick={handleOpenLaddanReport}
                                  >
                                    View laddan report
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      (paginatedRows as ProfitabilityGroupRow[]).map((group) => (
                        <TableRow key={group.id}>
                          <TableCell>{group.label}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.totalRecords, 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.nugReceived)}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.nugSold)}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.nugTransferred)}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.balanceNug)}</TableCell>
                          <TableCell className="text-right">₹{formatNumber(group.actualSaleAmount)}</TableCell>
                          <TableCell className="text-right">₹{formatNumber(group.sellerBillAmount)}</TableCell>
                          <TableCell className={`text-right ${group.profitLossAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            ₹{formatNumber(group.profitLossAmount)}
                          </TableCell>
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
                    : Math.min(currentPage * itemsPerPage, dataToDisplay.length)}
                  {' '}of {dataToDisplay.length} record(s)
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
        <div className="mx-auto max-w-[1600px] overflow-x-auto px-6 py-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="border-r text-center font-semibold">Total Nug Received</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Nug Sold</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Nug Transferred</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Balance Nug</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Kg Received</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Kg Sold</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Kg Transferred</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Actual Sale</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Seller Bill</TableHead>
                <TableHead className="text-center font-semibold">Total Profit / Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="border-r text-center font-semibold">
                  {formatNumber(totals.totalNugReceived)}
                </TableCell>
                <TableCell className="border-r text-center font-semibold">
                  {formatNumber(totals.totalNugSold)}
                </TableCell>
                <TableCell className="border-r text-center font-semibold">
                  {formatNumber(totals.totalNugTransferred)}
                </TableCell>
                <TableCell className="border-r text-center font-semibold">
                  {formatNumber(totals.totalBalanceNug)}
                </TableCell>
                <TableCell className="border-r text-center font-semibold">
                  {formatNumber(totals.totalKgReceived)}
                </TableCell>
                <TableCell className="border-r text-center font-semibold">
                  {formatNumber(totals.totalKgSold)}
                </TableCell>
                <TableCell className="border-r text-center font-semibold">
                  {formatNumber(totals.totalKgTransferred)}
                </TableCell>
                <TableCell className="border-r text-center font-semibold">
                  ₹{formatNumber(totals.totalActualSaleAmount)}
                </TableCell>
                <TableCell className="border-r text-center font-semibold">
                  ₹{formatNumber(totals.totalSellerBillAmount)}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  ₹{formatNumber(totals.totalProfitLossAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
