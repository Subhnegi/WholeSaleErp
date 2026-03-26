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
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { ChevronLeft, ChevronRight, RefreshCw, BookOpen, Printer, ChevronUp, ChevronDown, ArrowUpDown, FilterX } from 'lucide-react'

interface LedgerItemRow {
  id: string
  date: string
  type: string
  vchNo: string
  name: string
  particulars: string
  debit: number
  credit: number
  balance: number
}

interface GroupedRow {
  id: string
  groupName: string
  totalDebit: number
  totalCredit: number
  items: LedgerItemRow[]
}

interface Account {
  id: string
  accountName: string
  accountGroup?: {
    name: string
  }
}

export function LedgerPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  // Date filters
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Data
  const [rows, setRows] = useState<LedgerItemRow[]>([])
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])

  // Selected account
  const [selectedAccountId, setSelectedAccountId] = useState('')

  // Ledger summary (from API - used for overall account balance display)
  const [, setLedgerSummary] = useState<{
    totalDr: number
    totalCr: number
    balance: number
  } | null>(null)

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState<string>('none')
  const [filterType, setFilterType] = useState<string>('all')

  // Sorting
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const hasActiveSort = !!sortBy
  const hasFilters = searchQuery !== '' || groupBy !== 'none' || filterType !== 'all'

  // Transaction type options for filtering
  const typeOptions = useMemo(() => {
    const types = new Set(rows.map(row => row.type))
    return ['all', ...Array.from(types)]
  }, [rows])

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  const handleClearAll = () => {
    setSearchQuery('')
    setGroupBy('none')
    setFilterType('all')
    setSortBy(null)
    setSortDir('asc')
    setCurrentPage(1)
  }

  // Initialize dates
  useEffect(() => {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    setFromDate(firstDayOfMonth.toISOString().slice(0, 10))
    setToDate(today.toISOString().slice(0, 10))
  }, [])

  // Load accounts on company change
  useEffect(() => {
    if (!activeCompany) return

    const loadAccounts = async () => {
      try {
        const response = await window.api.account.listByCompany(activeCompany.id)
        if (response.success && response.data) {
          setAccounts(response.data)
        }
      } catch (error) {
        console.error('Load accounts error:', error)
      }
    }

    loadAccounts()
  }, [activeCompany])

  // Load ledger data when account or dates change
  useEffect(() => {
    if (!activeCompany || !selectedAccountId) {
      setRows([])
      setLedgerSummary(null)
      return
    }

    loadLedgerData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, selectedAccountId, fromDate, toDate])

  const loadLedgerData = async () => {
    if (!activeCompany || !selectedAccountId) return
    setLoading(true)

    try {
      // Get ledger summary
      const ledgerResponse = await window.api.accountLedger.get(activeCompany.id, selectedAccountId)
      if (ledgerResponse.success && ledgerResponse.data) {
        setLedgerSummary({
          totalDr: ledgerResponse.data.totalDr || 0,
          totalCr: ledgerResponse.data.totalCr || 0,
          balance: ledgerResponse.data.balance || 0
        })
      } else {
        setLedgerSummary(null)
      }

      // Get ledger items with date filter
      const itemsResponse = await window.api.accountLedger.getItems(
        activeCompany.id,
        selectedAccountId,
        {
          startDate: fromDate || undefined,
          endDate: toDate || undefined
        }
      )

      if (itemsResponse.success && itemsResponse.data) {
        const ledgerRows: LedgerItemRow[] = itemsResponse.data.map((item: any) => ({
          id: item.id,
          date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '',
          type: item.type || '',
          vchNo: item.vchNo || '',
          name: item.name || '',
          particulars: item.particulars || '',
          debit: item.debit || 0,
          credit: item.credit || 0,
          balance: item.balance || 0
        }))
        setRows(ledgerRows)
        setCurrentPage(1)
      } else {
        setRows([])
      }
    } catch (error) {
      console.error('Load ledger data error:', error)
      setRows([])
      setLedgerSummary(null)
    } finally {
      setLoading(false)
    }
  }

  // Format type for display
  const formatType = (type: string): string => {
    const typeLabels: Record<string, string> = {
      'quick_sale': 'Quick Sale',
      'daily_sale': 'Daily Sale',
      'stock_sale': 'Stock Sale',
      'arrival': 'Arrival',
      'stock_transfer': 'Stock Transfer',
      'stock_wattak': 'Stock Wattak',
      'quick_receipt': 'Quick Receipt',
      'quick_payment': 'Quick Payment',
      'crate_issue': 'Crate Issue',
      'crate_receive': 'Crate Receive',
      'seller_bill': 'Seller Bill',
      'opening_balance': 'Opening Balance',
      'adjustment': 'Adjustment'
    }
    return typeLabels[type] || type
  }

  // Account options for combobox
  const accountOptions = useMemo(() => {
    return accounts.map(account => ({
      value: account.id,
      label: `${account.accountName}${account.accountGroup?.name ? ` (${account.accountGroup.name})` : ''}`
    }))
  }, [accounts])

  // Filtered and sorted data
  const filteredAndSorted = useMemo(() => {
    let filtered = [...rows]

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(row => row.type === filterType)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(row =>
        row.vchNo.toLowerCase().includes(query) ||
        row.name.toLowerCase().includes(query) ||
        row.particulars.toLowerCase().includes(query) ||
        formatType(row.type).toLowerCase().includes(query)
      )
    }

    // Sorting
    if (sortBy) {
      const dirMul = sortDir === 'asc' ? 1 : -1
      filtered.sort((a, b) => {
        const aa = (a as any)[sortBy]
        const bb = (b as any)[sortBy]
        if (typeof aa === 'number' && typeof bb === 'number') return (aa - bb) * dirMul
        return String(aa || '').localeCompare(String(bb || '')) * dirMul
      })
    }

    return filtered
  }, [rows, filterType, searchQuery, sortBy, sortDir])

  // Grouped data
  const groupedData = useMemo((): GroupedRow[] | null => {
    if (groupBy === 'none') return null

    const groups = new Map<string, GroupedRow>()

    filteredAndSorted.forEach((row) => {
      let key: string
      let label: string

      if (groupBy === 'type') {
        key = row.type
        label = formatType(row.type)
      } else if (groupBy === 'name') {
        key = row.name
        label = row.name
      } else {
        key = row.date
        label = row.date
      }

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          groupName: label,
          totalDebit: 0,
          totalCredit: 0,
          items: []
        })
      }

      const group = groups.get(key)!
      group.totalDebit += row.debit
      group.totalCredit += row.credit
      group.items.push(row)
    })

    return Array.from(groups.values()).sort((a, b) => a.groupName.localeCompare(b.groupName))
  }, [filteredAndSorted, groupBy])

  // Pagination
  const dataToDisplay = groupedData || filteredAndSorted
  const totalPages = Math.max(1, Math.ceil(dataToDisplay.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = dataToDisplay.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages, dataToDisplay.length])

  // Calculate totals for filtered data
  const totals = useMemo(() => {
    return filteredAndSorted.reduce(
      (acc, row) => ({
        debit: acc.debit + row.debit,
        credit: acc.credit + row.credit
      }),
      { debit: 0, credit: 0 }
    )
  }, [filteredAndSorted])

  const filteredBalance = totals.debit - totals.credit

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view ledger</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b bg-white px-6 py-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Account Ledger</h1>
          <p className="text-xs text-muted-foreground mt-1">View detailed transaction history for any account</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Account</Label>
            <Combobox
              options={accountOptions}
              value={selectedAccountId}
              onChange={(value) => {
                setSelectedAccountId(value)
                setCurrentPage(1)
              }}
              placeholder="Select account..."
              searchPlaceholder="Search accounts..."
              emptyText="No accounts found"
              className="w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">From</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-36"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">To</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-36"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={loadLedgerData}
            disabled={loading || !selectedAccountId}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.print()}>
            <Printer />
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
                  placeholder="Search voucher, name, particulars..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {typeOptions.filter(t => t !== 'all').map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Group By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    <SelectItem value="type">By Type</SelectItem>
                    <SelectItem value="name">By Name</SelectItem>
                    <SelectItem value="date">By Date</SelectItem>
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

      {/* Main Content */}
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

                    {filterType !== 'all' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Type: {formatType(filterType)}</span>
                      </div>
                    )}

                    {groupBy !== 'none' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Grouped by: {groupBy === 'type' ? 'Type' : groupBy === 'name' ? 'Name' : 'Date'}</span>
                      </div>
                    )}
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold w-12">S.N</TableHead>
                      {groupBy !== 'none' ? (
                        <>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('groupName')}>
                              <span>{groupBy === 'type' ? 'Type' : groupBy === 'name' ? 'Name' : 'Date'}</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'groupName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'groupName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">Total Debit</TableHead>
                          <TableHead className="font-bold text-right">Total Credit</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('date')}>
                              <span>Date</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'date' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'date' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('type')}>
                              <span>Type</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'type' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'type' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('vchNo')}>
                              <span>Vch No</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'vchNo' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'vchNo' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('name')}>
                              <span>Name</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'name' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'name' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold max-w-[200px]">Particulars</TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('debit')}>
                              <span>Debit</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'debit' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'debit' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('credit')}>
                              <span>Credit</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'credit' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'credit' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('balance')}>
                              <span>Balance</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'balance' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'balance' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!selectedAccountId ? (
                      <TableRow>
                        <TableCell colSpan={groupBy !== 'none' ? 4 : 9} className="text-center text-muted-foreground py-8">
                          Select an account to view ledger entries
                        </TableCell>
                      </TableRow>
                    ) : loading ? (
                      <TableRow>
                        <TableCell colSpan={groupBy !== 'none' ? 4 : 9} className="text-center text-muted-foreground py-8">
                          Loading ledger data...
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={groupBy !== 'none' ? 4 : 9} className="text-center text-muted-foreground py-8">
                          No ledger entries found for the selected account and date range
                        </TableCell>
                      </TableRow>
                    ) : groupBy !== 'none' ? (
                      (paginatedData as GroupedRow[]).map((group, idx) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">{group.groupName}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">{group.totalDebit.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">{group.totalCredit.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (paginatedData as LedgerItemRow[]).map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                              {formatType(row.type)}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{row.vchNo}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.particulars}>
                            {row.particulars}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {row.debit > 0 ? row.debit.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {row.credit > 0 ? row.credit.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${row.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {row.balance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {dataToDisplay.length > 0 && selectedAccountId && (
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
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground ml-4">
                      {startIndex + 1}-{Math.min(endIndex, dataToDisplay.length)} of {dataToDisplay.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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

      {/* Summary Footer */}
      <div className="border-t bg-white shadow-lg fixed bottom-8 right-6 z-50 rounded-lg">
        <div className="w-auto p-4">
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Total Debit</div>
              <div className="text-xl font-bold text-green-600">{totals.debit.toFixed(2)}</div>
            </div>
            <div className="border-l pl-6">
              <div className="text-sm text-muted-foreground">Total Credit</div>
              <div className="text-xl font-bold text-red-600">{totals.credit.toFixed(2)}</div>
            </div>
            <div className="border-l pl-6">
              <div className="text-sm text-muted-foreground">Balance</div>
              <div className={`text-xl font-bold ${filteredBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {filteredBalance.toFixed(2)} {filteredBalance >= 0 ? 'Dr' : 'Cr'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
