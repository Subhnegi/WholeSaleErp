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
import { ChevronLeft, ChevronRight, RefreshCw, Users, Printer, ChevronUp, ChevronDown, FilterX } from 'lucide-react'

interface UgrahiRow {
  id: string
  accountId: string
  accountName: string
  area: string
  mobile: string
  balance: number
  crateBalance: number
}

export function UgrahiRegisterPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [rows, setRows] = useState<UgrahiRow[]>([])
  const [loading, setLoading] = useState(false)
  const [upToDate, setUpToDate] = useState(todayIso)

  const [searchQuery, setSearchQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [showZeroBalance, setShowZeroBalance] = useState(false)

  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const hasActiveSort = !!sortBy
  const hasFilters = searchQuery !== '' || areaFilter !== 'all' || showZeroBalance

  // Extract unique areas for filter dropdown
  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>()
    rows.forEach(row => {
      if (row.area) areas.add(row.area)
    })
    return Array.from(areas).sort()
  }, [rows])

  useEffect(() => {
    if (!activeCompany) return
    loadUgrahiData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, upToDate])

  const loadUgrahiData = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      // Load all accounts
      const accountsResp = await window.api.account.listByCompany(activeCompany.id)
      let customerAccounts: any[] = []
      
      if (accountsResp.success && accountsResp.data) {
        // Filter to only sundry debtor accounts (customers)
        customerAccounts = accountsResp.data.filter((account: any) => {
          const groupName = account.accountGroup?.name?.toLowerCase() || ''
          return groupName.includes('sundry debtor') || groupName.includes('customer')
        })
      }

      // Load account ledgers to get balance
      const ledgersResp = await window.api.accountLedger.list(activeCompany.id)
      const ledgerCurrentBalanceMap = new Map<string, number>()
      if (ledgersResp.success && Array.isArray(ledgersResp.data)) {
        ledgersResp.data.forEach((ledger: any) => {
          ledgerCurrentBalanceMap.set(ledger.accountId, Number(ledger.balance) || 0)
        })
      }

      const ledgerMap = new Map<string, number>()

      if (upToDate) {
        const accountsToFetch = ledgerCurrentBalanceMap.size > 0
          ? customerAccounts.filter((account) => ledgerCurrentBalanceMap.has(account.id))
          : customerAccounts

        const chunkSize = 10
        for (let i = 0; i < accountsToFetch.length; i += chunkSize) {
          const chunk = accountsToFetch.slice(i, i + chunkSize)
          const chunkResults = await Promise.all(chunk.map(async (account) => {
            try {
              const itemsResp = await window.api.accountLedger.getItems(
                activeCompany.id,
                account.id,
                { endDate: upToDate }
              )

              if (itemsResp.success && Array.isArray(itemsResp.data) && itemsResp.data.length > 0) {
                const latest = itemsResp.data[itemsResp.data.length - 1]
                return { accountId: account.id, balance: Number(latest.balance) || 0 }
              }
            } catch (error) {
              console.error('Get ledger items error:', error)
            }

            const fallbackBalance = ledgerCurrentBalanceMap.get(account.id) || 0
            return { accountId: account.id, balance: fallbackBalance }
          }))

          chunkResults.forEach(({ accountId, balance }) => {
            ledgerMap.set(accountId, balance)
          })
        }
      } else {
        ledgerCurrentBalanceMap.forEach((balance, accountId) => {
          ledgerMap.set(accountId, balance)
        })
      }

      // Load crate issue and receive entries to calculate crate balance
      const crateFilter = upToDate ? { toDate: upToDate } : undefined
      const [crateIssuesResp, crateReceivesResp] = await Promise.all([
        window.api.crateIssue.listByCompany(activeCompany.id, crateFilter ? { ...crateFilter } : undefined),
        window.api.crateReceive.listByCompany(activeCompany.id, crateFilter ? { ...crateFilter } : undefined)
      ])

      // Calculate crate balance per account: issued - received
      const crateBalanceMap = new Map<string, number>()

      if (crateIssuesResp.success && crateIssuesResp.data) {
        crateIssuesResp.data.forEach((entry: any) => {
          entry.items?.forEach((item: any) => {
            if (item.accountId) {
              const current = crateBalanceMap.get(item.accountId) || 0
              crateBalanceMap.set(item.accountId, current + (item.qty || 0))
            }
          })
        })
      }

      if (crateReceivesResp.success && crateReceivesResp.data) {
        crateReceivesResp.data.forEach((entry: any) => {
          entry.items?.forEach((item: any) => {
            if (item.accountId) {
              const current = crateBalanceMap.get(item.accountId) || 0
              crateBalanceMap.set(item.accountId, current - (item.qty || 0))
            }
          })
        })
      }

      // Build ugrahi rows
      const ugrahiRows: UgrahiRow[] = customerAccounts.map((account: any) => ({
        id: account.id,
        accountId: account.id,
        accountName: account.accountName || '',
        area: account.area || '',
        mobile: account.mobile1 || account.mobile2 || '',
        balance: ledgerMap.get(account.id) ?? ledgerCurrentBalanceMap.get(account.id) ?? 0,
        crateBalance: crateBalanceMap.get(account.id) || 0
      }))

      setRows(ugrahiRows)
      setCurrentPage(1)
    } catch (error) {
      console.error('Load ugrahi data error:', error)
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
    setAreaFilter('all')
    setShowZeroBalance(false)
    setSortBy(null)
    setSortDir('asc')
    setCurrentPage(1)
  }

  const filteredAndSorted = useMemo(() => {
    let filtered = rows

    // Filter out zero balance rows unless showZeroBalance is enabled
    if (!showZeroBalance) {
      filtered = filtered.filter((row) => row.balance !== 0 || row.crateBalance !== 0)
    }

    // Filter by area
    if (areaFilter !== 'all') {
      filtered = filtered.filter((row) => row.area === areaFilter)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((row) =>
        row.accountName.toLowerCase().includes(query) ||
        row.area.toLowerCase().includes(query) ||
        row.mobile.toLowerCase().includes(query)
      )
    }

    // Sort
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
  }, [rows, showZeroBalance, areaFilter, searchQuery, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredAndSorted.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages, filteredAndSorted.length])

  // Calculate totals
  const totalBalance = useMemo(() => filteredAndSorted.reduce((sum, row) => sum + row.balance, 0), [filteredAndSorted])
  const totalCrateBalance = useMemo(() => filteredAndSorted.reduce((sum, row) => sum + row.crateBalance, 0), [filteredAndSorted])

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Users className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view ugrahi register</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b bg-white px-6 py-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ugrahi Register</h1>
          <p className="text-xs text-muted-foreground mt-1">Track outstanding amounts and crate balances from customers (ugrahi)</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Up to</Label>
            <Input
              type="date"
              value={upToDate}
              max={todayIso}
              onChange={(e) => {
                const val = e.target.value
                if (!val) {
                  setUpToDate('')
                  return
                }
                if (val > todayIso) return
                setUpToDate(val)
              }}
              className="w-40"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={loadUgrahiData}
            disabled={loading}
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
                  placeholder="Search name, area, or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />

                <Select value={areaFilter} onValueChange={(value) => { setAreaFilter(value); setCurrentPage(1) }}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Area" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    {uniqueAreas.map((area) => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showZeroBalance}
                    onChange={(e) => setShowZeroBalance(e.target.checked)}
                    className="rounded"
                  />
                  Show zero balances
                </label>

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
                        <span>Search: &quot;{searchQuery}&quot;</span>
                      </div>
                    )}

                    {areaFilter !== 'all' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Area: {areaFilter}</span>
                      </div>
                    )}

                    {showZeroBalance && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Showing zero balances</span>
                      </div>
                    )}
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold w-12">S.N</TableHead>
                      <TableHead className="font-bold">
                        <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('accountName')}>
                          <span>Name (Customer)</span>
                          <span className="flex flex-col ml-1">
                            <ChevronUp className={sortBy === 'accountName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'accountName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                      <TableHead className="font-bold">
                        <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('area')}>
                          <span>Area</span>
                          <span className="flex flex-col ml-1">
                            <ChevronUp className={sortBy === 'area' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'area' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                      <TableHead className="font-bold">
                        <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('mobile')}>
                          <span>Mobile</span>
                          <span className="flex flex-col ml-1">
                            <ChevronUp className={sortBy === 'mobile' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'mobile' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                      <TableHead className="font-bold text-right">
                        <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('balance')}>
                          <span>Balance (₹)</span>
                          <span className="flex flex-col ml-1 items-end">
                            <ChevronUp className={sortBy === 'balance' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'balance' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                      <TableHead className="font-bold text-right">
                        <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('crateBalance')}>
                          <span>Crate Balance</span>
                          <span className="flex flex-col ml-1 items-end">
                            <ChevronUp className={sortBy === 'crateBalance' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'crateBalance' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {rows.length === 0 ? 'No ugrahi data available' : 'No rows match the selected filters'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">{row.accountName}</TableCell>
                          <TableCell>{row.area || '-'}</TableCell>
                          <TableCell>{row.mobile || '-'}</TableCell>
                          <TableCell className={`text-right font-bold ${row.balance > 0 ? 'text-green-600' : row.balance < 0 ? 'text-red-600' : ''}`}>
                            {row.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${row.crateBalance > 0 ? 'text-blue-600' : row.crateBalance < 0 ? 'text-orange-600' : ''}`}>
                            {row.crateBalance}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Pagination */}
              {filteredAndSorted.length > 0 && (
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
                      {startIndex + 1}-{Math.min(endIndex, filteredAndSorted.length)} of {filteredAndSorted.length}
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

      {/* Bottom Summary */}
      <div className="border-t bg-white shadow-lg fixed bottom-8 right-6 z-50 rounded-lg">
        <div className="w-auto p-4">
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Total Amount (₹)</div>
              <div className={`text-xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="border-l pl-6">
              <div className="text-sm text-muted-foreground">Total Crate Balance</div>
              <div className={`text-xl font-bold ${totalCrateBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {totalCrateBalance}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
