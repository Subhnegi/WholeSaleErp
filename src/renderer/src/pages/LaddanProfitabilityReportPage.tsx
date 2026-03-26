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

const SESSION_FROM_KEY = 'laddanProfitabilityReport.fromDate'
const SESSION_TO_KEY = 'laddanProfitabilityReport.toDate'
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]
const DETAIL_COLUMN_COUNT = 12
const GROUP_COLUMN_COUNT = 8

type SortColumn =
  | 'date'
  | 'voucherNo'
  | 'vehicle'
  | 'party'
  | 'nugReceived'
  | 'nugSold'
  | 'balanceNug'
  | 'kgReceived'
  | 'kgSold'
  | 'actualSale'
  | 'sellerBill'
  | 'profitLoss'

type ProfitCategory = 'all' | 'profit' | 'loss' | 'breakeven'
type GroupBy = 'none' | 'party' | 'profitability'

interface PartyOption {
  id: string
  name: string
}

interface LaddanProfitabilityRow {
  transferId: string
  date: string
  voucherNo: string
  vehicleNo: string | null
  challanNo: string | null
  partyId: string
  partyName: string
  nugReceived: number
  nugSold: number
  balanceNug: number
  kgReceived: number
  kgSold: number
  actualSaleAmount: number
  sellerBillAmount: number
  profitLossAmount: number
}

interface LaddanProfitabilityTotals {
  totalRecords: number
  totalNugReceived: number
  totalNugSold: number
  totalBalanceNug: number
  totalKgReceived: number
  totalKgSold: number
  totalActualSaleAmount: number
  totalSellerBillAmount: number
  totalProfitLossAmount: number
}

interface ProfitabilityGroupRow {
  id: string
  label: string
  totalRecords: number
  nugReceived: number
  nugSold: number
  balanceNug: number
  kgReceived: number
  kgSold: number
  actualSaleAmount: number
  sellerBillAmount: number
  profitLossAmount: number
}

const EMPTY_TOTALS: LaddanProfitabilityTotals = {
  totalRecords: 0,
  totalNugReceived: 0,
  totalNugSold: 0,
  totalBalanceNug: 0,
  totalKgReceived: 0,
  totalKgSold: 0,
  totalActualSaleAmount: 0,
  totalSellerBillAmount: 0,
  totalProfitLossAmount: 0
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

const getProfitCategory = (amount: number): Exclude<ProfitCategory, 'all'> => {
  if (amount > 0.001) return 'profit'
  if (amount < -0.001) return 'loss'
  return 'breakeven'
}

export function LaddanProfitabilityReportPage() {
  const { activeCompany } = useAppSelector((state) => state.company)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<LaddanProfitabilityRow[]>([])
  const [totals, setTotals] = useState<LaddanProfitabilityTotals>(EMPTY_TOTALS)
  const [loading, setLoading] = useState(false)
  const [parties, setParties] = useState<PartyOption[]>([])
  const [partyFilter, setPartyFilter] = useState('all')
  const [profitTypeFilter, setProfitTypeFilter] = useState<ProfitCategory>('all')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const partyOptions = useMemo(() => {
    const map = new Map<string, string>()
    parties.forEach((party) => map.set(party.id, party.name))
    rows.forEach((row) => {
      if (row.partyId && !map.has(row.partyId)) {
        map.set(row.partyId, row.partyName)
      }
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [parties, rows])

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
      console.error('Failed to read laddan profitability report dates from session storage', error)
    }

    setFromDate(initialFrom)
    setToDate(initialTo)

    try {
      sessionStorage.setItem(SESSION_FROM_KEY, initialFrom)
      sessionStorage.setItem(SESSION_TO_KEY, initialTo)
    } catch (error) {
      console.error('Failed to persist laddan profitability report dates to session storage', error)
    }
  }, [])

  useEffect(() => {
    if (!activeCompany?.id) return
    const loadParties = async () => {
      try {
        const response = await window.api.account.listByCompany(activeCompany.id)
        if (Array.isArray(response)) {
          const sorted = response
            .map((party: any) => ({ id: party.id, name: party.accountName || party.name || 'Party' }))
            .sort((a, b) => a.name.localeCompare(b.name))
          setParties(sorted)
        }
      } catch (error) {
        console.error('Failed to load parties for laddan profitability report', error)
      }
    }
    loadParties()
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
  }, [activeCompany?.id, fromDate, toDate, debouncedSearch, partyFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, partyFilter, profitTypeFilter, groupBy, fromDate, toDate])

  const loadReport = async () => {
    if (!activeCompany?.id || !fromDate || !toDate) return
    setLoading(true)
    try {
      const response = await window.api.reports.laddanProfitabilityReport(activeCompany.id, {
        startDate: fromDate,
        endDate: toDate,
        accountId: partyFilter !== 'all' ? partyFilter : undefined,
        search: debouncedSearch || undefined
      })

      if (response.success && response.data) {
        const normalizedRows = (response.data.rows || []).map((row) => ({
          transferId: row.transferId,
          date: row.date,
          voucherNo: row.voucherNo,
          vehicleNo: row.vehicleNo,
          challanNo: row.challanNo,
          partyId: row.accountId,
          partyName: row.accountName,
          nugReceived: row.nugReceived,
          nugSold: row.nugSold,
          balanceNug: row.balanceNug,
          kgReceived: row.kgReceived,
          kgSold: row.kgSold,
          actualSaleAmount: row.actualSaleAmount,
          sellerBillAmount: row.sellerBillAmount,
          profitLossAmount: row.profitLossAmount
        })) as LaddanProfitabilityRow[]
        setRows(normalizedRows)
        setTotals(response.data.totals || EMPTY_TOTALS)
      } else {
        setRows([])
        setTotals(EMPTY_TOTALS)
        if (response.error) {
          toast.error(response.error)
        }
      }
    } catch (error: any) {
      console.error('Failed to load laddan profitability report', error)
      toast.error(error?.message || 'Unable to load laddan profitability report')
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
      console.error('Failed to persist laddan profitability report from date', error)
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
      console.error('Failed to persist laddan profitability report to date', error)
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
    setPartyFilter('all')
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

  const handlePrint = () => {
    toast.info('Laddan profitability report print preview coming soon')
  }

  const filteredRows = useMemo(() => {
    let data = [...rows]

    if (partyFilter !== 'all') {
      data = data.filter((row) => row.partyId === partyFilter)
    }

    if (profitTypeFilter !== 'all') {
      data = data.filter((row) => getProfitCategory(row.profitLossAmount) === profitTypeFilter)
    }

    return data
  }, [rows, partyFilter, profitTypeFilter])

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
        case 'party':
          result = (a.partyName || '').localeCompare(b.partyName || '')
          break
        case 'nugReceived':
          result = a.nugReceived - b.nugReceived
          break
        case 'nugSold':
          result = a.nugSold - b.nugSold
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
        case 'actualSale':
          result = a.actualSaleAmount - b.actualSaleAmount
          break
        case 'sellerBill':
          result = a.sellerBillAmount - b.sellerBillAmount
          break
        case 'profitLoss':
          result = a.profitLossAmount - b.profitLossAmount
          break
        default:
          result = 0
      }
      return result * direction
    })

    return data
  }, [filteredRows, sortColumn, sortDirection])

  const groupedRows = useMemo(() => {
    if (groupBy === 'none') {
      return []
    }

    const map = new Map<string, ProfitabilityGroupRow>()

    sortedRows.forEach((row) => {
      let id = row.transferId
      let label = row.partyName

      if (groupBy === 'party') {
        id = row.partyId || 'unknown'
        label = row.partyName || 'Unknown Party'
      }

      if (groupBy === 'profitability') {
        const bucket = getProfitCategory(row.profitLossAmount)
        id = bucket
        label = bucket === 'profit' ? 'Profit' : bucket === 'loss' ? 'Loss' : 'Break-even'
      }

      const current = map.get(id) || {
        id,
        label,
        totalRecords: 0,
        nugReceived: 0,
        nugSold: 0,
        balanceNug: 0,
        kgReceived: 0,
        kgSold: 0,
        actualSaleAmount: 0,
        sellerBillAmount: 0,
        profitLossAmount: 0
      }

      current.totalRecords += 1
      current.nugReceived += row.nugReceived
      current.nugSold += row.nugSold
      current.balanceNug += row.balanceNug
      current.kgReceived += row.kgReceived
      current.kgSold += row.kgSold
      current.actualSaleAmount += row.actualSaleAmount
      current.sellerBillAmount += row.sellerBillAmount
      current.profitLossAmount += row.profitLossAmount
      map.set(id, current)
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
    partyFilter !== 'all' ||
    profitTypeFilter !== 'all' ||
    groupBy !== 'none'

  const selectedPartyName = useMemo(() => {
    if (partyFilter === 'all') return null
    const party = partyOptions.find((item) => item.id === partyFilter)
    return party?.name || 'Party'
  }, [partyFilter, partyOptions])

  if (!activeCompany) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to view laddan profitability report.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Laddan Profitability Report</h1>
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
                      placeholder="Search voucher, party, vehicle or challan"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="w-64 pl-10"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Party</Label>
                    <Select value={partyFilter} onValueChange={setPartyFilter}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="All Parties" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="all">All Parties</SelectItem>
                        {partyOptions.map((party) => (
                          <SelectItem key={party.id} value={party.id}>
                            {party.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Profit Type</Label>
                    <Select value={profitTypeFilter} onValueChange={(value) => setProfitTypeFilter(value as ProfitCategory)}>
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
                    <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="No Grouping" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Grouping</SelectItem>
                        <SelectItem value="party">Party</SelectItem>
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
                    {partyFilter !== 'all' && selectedPartyName && (
                      <div className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                        Party: {selectedPartyName}
                      </div>
                    )}
                    {profitTypeFilter !== 'all' && (
                      <div className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                        Profit Type: {profitTypeFilter === 'breakeven' ? 'Break-even' : profitTypeFilter === 'profit' ? 'Profit' : 'Loss'}
                      </div>
                    )}
                    {groupBy !== 'none' && (
                      <div className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                        Grouped by: {groupBy === 'party' ? 'Party' : 'Profit Type'}
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
                            onClick={() => handleSort('party')}
                          >
                            Party
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('nugReceived')}
                          >
                            Nug Transferred
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('nugSold')}
                          >
                            Nug Billed
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
                            Kg Transferred
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('kgSold')}
                          >
                            Kg Billed
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('actualSale')}
                          >
                            Wattak Amount
                            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            className="-ml-3 h-auto p-0"
                            onClick={() => handleSort('sellerBill')}
                          >
                            Transfer Cost
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
                      </TableRow>
                    ) : (
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                        <TableHead className="text-right">Nug Transferred</TableHead>
                        <TableHead className="text-right">Nug Billed</TableHead>
                        <TableHead className="text-right">Balance Nug</TableHead>
                        <TableHead className="text-right">Wattak Amount</TableHead>
                        <TableHead className="text-right">Transfer Cost</TableHead>
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
                          Loading laddan profitability report…
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
                      (paginatedRows as LaddanProfitabilityRow[]).map((row) => (
                        <TableRow key={`${row.transferId}-${row.voucherNo}`} className="text-sm">
                          <TableCell>{formatDate(row.date)}</TableCell>
                          <TableCell>{row.voucherNo || '—'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{row.vehicleNo || '—'}</span>
                              <span className="text-xs text-muted-foreground">{row.challanNo || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{row.partyName}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.nugReceived)}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.nugSold)}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.balanceNug)}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.kgReceived)}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.kgSold)}</TableCell>
                          <TableCell className="text-right">₹{formatNumber(row.actualSaleAmount)}</TableCell>
                          <TableCell className="text-right">₹{formatNumber(row.sellerBillAmount)}</TableCell>
                          <TableCell
                            className={`text-right ${row.profitLossAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                          >
                            ₹{formatNumber(row.profitLossAmount)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (paginatedRows as ProfitabilityGroupRow[]).map((group) => (
                        <TableRow key={group.id}>
                          <TableCell>{group.label}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.totalRecords, 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.nugReceived)}</TableCell>
                          <TableCell className="text-right">{formatNumber(group.nugSold)}</TableCell>
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
        <div className="mx-auto max-w-[1600px] overflow-x-auto px-6 py-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="border-r text-center font-semibold">Total Nug Transferred</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Nug Billed</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Balance Nug</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Kg Transferred</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Kg Billed</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Wattak Amount</TableHead>
                <TableHead className="border-r text-center font-semibold">Total Transfer Cost</TableHead>
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
                  {formatNumber(totals.totalBalanceNug)}
                </TableCell>
                <TableCell className="border-r text-center font-semibold">
                  {formatNumber(totals.totalKgReceived)}
                </TableCell>
                <TableCell className="border-r text-center font-semibold">
                  {formatNumber(totals.totalKgSold)}
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
