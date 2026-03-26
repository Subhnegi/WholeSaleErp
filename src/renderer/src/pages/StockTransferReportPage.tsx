/**
 * Stock Transfer Report Page
 * Phase 17.4 - Lists all stock transfers with filters and summary
 * 
 * Features:
 * - Date range filtering with localStorage persistence
 * - Search and filter by party, vehicle, challan
 * - Table with columns: date, vch no, vehicle no, challan no, party, wattak amount, status
 * - Summary showing total wattak amount
 * - Sorting and pagination
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, RefreshCw, ArrowLeftRight, Printer, ChevronUp, ChevronDown, ArrowUpDown, FilterX } from 'lucide-react'
import { toast } from 'sonner'

interface StockTransferRow {
  id: string
  date: string
  vchNo: string
  vehicleNo: string
  challanNo: string
  accountId: string
  accountName: string
  wattakAmount: number
  status: 'clear' | 'partial' | 'pending'
}

export function StockTransferReportPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rows, setRows] = useState<StockTransferRow[]>([])
  const [loading, setLoading] = useState(false)

  const [accounts, setAccounts] = useState<any[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [accountFilter, setAccountFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const hasActiveSort = !!sortBy
  const hasFilters = searchQuery !== '' || accountFilter !== 'all' || statusFilter !== 'all'

  // Initialize dates from localStorage or default to current month
  useEffect(() => {
    const savedStart = localStorage.getItem('stockTransferReport_startDate')
    const savedEnd = localStorage.getItem('stockTransferReport_endDate')
    
    if (savedStart && savedEnd) {
      setStartDate(savedStart)
      setEndDate(savedEnd)
    } else {
      const today = new Date()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      setStartDate(firstDay.toISOString().slice(0, 10))
      setEndDate(today.toISOString().slice(0, 10))
    }
  }, [])

  // Save dates to localStorage
  useEffect(() => {
    if (startDate) localStorage.setItem('stockTransferReport_startDate', startDate)
    if (endDate) localStorage.setItem('stockTransferReport_endDate', endDate)
  }, [startDate, endDate])

  // Load data when company or dates change
  useEffect(() => {
    if (!activeCompany || !startDate || !endDate) return
    const initialize = async () => {
      await loadMasterData()
      await loadStockTransferData()
    }
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, startDate, endDate])

  const loadMasterData = async () => {
    if (!activeCompany) return
    try {
      const accountsResp = await window.api.account.listByCompany(activeCompany.id)
      let partyAccounts: any[] = []
      if (accountsResp.success && accountsResp.data) {
        // Filter for party accounts (suppliers, sundry creditors)
        partyAccounts = accountsResp.data.filter((account: any) => {
          const groupName = account.accountGroup?.name?.toLowerCase() || ''
          return (
            groupName.includes('sundry creditor') ||
            groupName.includes('supplier')
          )
        })
      }
      setAccounts(partyAccounts)
    } catch (error) {
      console.error('Load master data error:', error)
    }
  }

  const loadStockTransferData = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const response = await window.api.stockTransfer.list(activeCompany.id, {
        startDate,
        endDate
      })

      if (response.success && response.data) {
        // API returns { transfers: [], totals: {} }
        const transfersList = response.data.transfers || []
        const transfers: StockTransferRow[] = transfersList.map((transfer: any) => {
          // Calculate wattak amount (total our cost)
          const wattakAmount = transfer.totalOurCost || 0
          
          // Get status from API (calculated from ledger in backend)
          const status: 'clear' | 'partial' | 'pending' = transfer.wattakStatus || 'pending'

          return {
            id: transfer.id,
            date: transfer.createdAt?.split('T')[0] || '',
            vchNo: transfer.vchNo || '',
            vehicleNo: transfer.vehicleNo || '',
            challanNo: transfer.challanNo || '',
            accountId: transfer.accountId,
            accountName: transfer.accountName || 'Unknown',
            wattakAmount,
            status
          }
        })
        setRows(transfers)
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('Load stock transfer data error:', error)
      toast.error('Failed to load stock transfer data')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  const handleClearAll = () => {
    setSearchQuery('')
    setAccountFilter('all')
    setStatusFilter('all')
    setSortBy(null)
    setSortDir('asc')
    setCurrentPage(1)
  }

  const filteredAndSorted = useMemo(() => {
    let filtered = rows

    if (accountFilter !== 'all') {
      filtered = filtered.filter((row) => row.accountId === accountFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((row) => row.status === statusFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((row) =>
        row.vchNo.toLowerCase().includes(query) ||
        row.vehicleNo.toLowerCase().includes(query) ||
        row.challanNo.toLowerCase().includes(query) ||
        row.accountName.toLowerCase().includes(query)
      )
    }

    if (sortBy) {
      const copy = [...filtered]
      const dirMul = sortDir === 'asc' ? 1 : -1
      copy.sort((a, b) => {
        const aa = (a as any)[sortBy]
        const bb = (b as any)[sortBy]
        if (typeof aa === 'number' && typeof bb === 'number') return (aa - bb) * dirMul
        return String(aa || '').localeCompare(String(bb || '')) * dirMul
      })
      return copy
    }

    return filtered
  }, [rows, accountFilter, statusFilter, searchQuery, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredAndSorted.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const totalWattakAmount = useMemo(
    () => filteredAndSorted.reduce((sum, row) => sum + row.wattakAmount, 0),
    [filteredAndSorted]
  )

  const getSortIcon = (col: string) => {
    if (sortBy !== col) return <ArrowUpDown className="inline w-4 h-4 ml-1 text-gray-400" />
    return sortDir === 'asc' ? (
      <ChevronUp className="inline w-4 h-4 ml-1" />
    ) : (
      <ChevronDown className="inline w-4 h-4 ml-1" />
    )
  }

  const getStatusBadge = (status: 'clear' | 'partial' | 'pending') => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string }> = {
      clear: { variant: 'default', className: 'bg-green-500 hover:bg-green-600 text-white' },
      partial: { variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
      pending: { variant: 'secondary', className: '' }
    }
    const { variant, className } = config[status]
    return (
      <Badge variant={variant} className={className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <ArrowLeftRight className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view stock transfer report</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b bg-white px-6 py-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Stock Transfer Report</h1>
          <p className="text-xs text-muted-foreground mt-1">
            View and analyze all stock transfers with filters and summary
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">From</Label>
            <Input
              type="date"
              value={startDate}
              max={endDate || new Date().toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">To</Label>
            <Input
              type="date"
              value={endDate}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              await loadMasterData()
              await loadStockTransferData()
            }}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="py-4 px-6">
        <div className="max-w-[1400px] mx-auto">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Input
                  type="search"
                  placeholder="Search vch no, vehicle, challan, party..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />

                <Select
                  value={accountFilter}
                  onValueChange={(value) => {
                    setAccountFilter(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Party" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parties</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="clear">Clear</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex-1" />

                {(hasActiveSort || hasFilters) && (
                  <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-7 text-xs">
                    <FilterX className="h-3 w-3 mr-1" />
                    Clear {hasActiveSort && hasFilters ? 'All' : hasActiveSort ? 'Sort' : 'Filters'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 pb-24">
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1400px] mx-auto space-y-4">
            <Card>
              <CardContent className="p-0">
                {(hasActiveSort || hasFilters) && (
                  <div className="flex items-center gap-2 flex-wrap p-4 border-b">
                    <span className="text-sm text-muted-foreground">Active:</span>

                    {hasActiveSort && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <ArrowUpDown className="h-3 w-3" />
                        <span>
                          Sort: {String(sortBy)} ({sortDir})
                        </span>
                        <button
                          onClick={() => {
                            setSortBy(null)
                            setSortDir('asc')
                          }}
                          className="ml-1 hover:text-destructive"
                          title="Clear sort"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {searchQuery && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Search: {searchQuery}</span>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="ml-1 hover:text-destructive"
                          title="Clear search"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {accountFilter !== 'all' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>
                          Party: {accounts.find((a) => a.id === accountFilter)?.accountName || accountFilter}
                        </span>
                        <button
                          onClick={() => setAccountFilter('all')}
                          className="ml-1 hover:text-destructive"
                          title="Clear filter"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {statusFilter !== 'all' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Status: {statusFilter}</span>
                        <button
                          onClick={() => setStatusFilter('all')}
                          className="ml-1 hover:text-destructive"
                          title="Clear filter"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Sn.</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                        Date {getSortIcon('date')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('vchNo')}>
                        Vch No {getSortIcon('vchNo')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('vehicleNo')}>
                        Vehicle No {getSortIcon('vehicleNo')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('challanNo')}>
                        Challan No {getSortIcon('challanNo')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('accountName')}>
                        Party {getSortIcon('accountName')}
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort('wattakAmount')}>
                        Wattak Amount {getSortIcon('wattakAmount')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                        Wattak Status {getSortIcon('status')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <span className="text-muted-foreground">Loading stock transfers...</span>
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <ArrowLeftRight className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">No stock transfers found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((row, index) => (
                        <TableRow key={row.id}>
                          <TableCell>{startIndex + index + 1}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.vchNo || '—'}</TableCell>
                          <TableCell>{row.vehicleNo || '—'}</TableCell>
                          <TableCell>{row.challanNo || '—'}</TableCell>
                          <TableCell>{row.accountName}</TableCell>
                          <TableCell className="text-right">₹{row.wattakAmount.toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(row.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination */}
            {!loading && paginatedData.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Rows per page:</span>
                      <Select
                        value={String(itemsPerPage)}
                        onValueChange={(val) => {
                          setItemsPerPage(Number(val))
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {startIndex + 1} - {Math.min(endIndex, filteredAndSorted.length)} of{' '}
                        {filteredAndSorted.length}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="border-t bg-white shadow-lg fixed bottom-8 right-6 z-50 rounded-lg">
        <div className="w-auto p-4">
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Total Wattak Amount</div>
              <div className="text-xl font-bold text-primary">₹{totalWattakAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
