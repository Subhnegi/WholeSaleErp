import { useEffect, useState, useMemo } from 'react'
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
import { ChevronLeft, ChevronRight, RefreshCw, PackageOpen, Printer, ChevronUp, ChevronDown, ArrowUpDown, FilterX } from 'lucide-react'

// Balance row represents net balance per account per crate marka
interface BalanceRow {
  id: string
  accountId: string
  accountName: string
  crateMarkaId: string
  crateMarkaName: string
  issued: number      // Total issued to this account
  received: number    // Total received from this account
  balance: number     // received - issued (positive = we need to issue back)
  value: number       // balance * crate cost
}

interface GroupedRow {
  id: string
  groupName: string
  issued: number
  received: number
  balance: number
  value: number
  items: BalanceRow[]
}

export function CrateIssuablePage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  const [upToDate, setUpToDate] = useState('')
  const [rows, setRows] = useState<BalanceRow[]>([])
  const [crateMarkas, setCrateMarkas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [crateMarkaFilter, setCrateMarkaFilter] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<string>('none')
  const [showZeroBalance, setShowZeroBalance] = useState(false)

  // Sorting
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  const hasActiveSort = !!sortBy
  const hasFilters = searchQuery !== '' || crateMarkaFilter !== 'all' || groupBy !== 'none'

  const handleClearAll = () => {
    setSearchQuery('')
    setCrateMarkaFilter('all')
    setGroupBy('none')
    setSortBy(null)
    setSortDir('asc')
    setCurrentPage(1)
  }

  useEffect(() => {
    // set default to today
    const today = new Date()
    const iso = today.toISOString().slice(0, 10)
    setUpToDate(iso)
  }, [])

  useEffect(() => {
    if (!activeCompany) return
    loadCrateMarkas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany])

  // Reload when date or crateMarkas change
  useEffect(() => {
    if (!activeCompany || !upToDate || crateMarkas.length === 0) return
    loadBalances()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upToDate, crateMarkas])

  const loadCrateMarkas = async () => {
    if (!activeCompany) return
    try {
      const resp = await window.api.crate.listByCompany(activeCompany.id)
      if (resp.success && resp.data) {
        setCrateMarkas(resp.data)
      }
    } catch (error) {
      console.error('Load crate markas error:', error)
    }
  }

  const loadBalances = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      // Load both issued and received entries
      const [issueResp, receiveResp] = await Promise.all([
        window.api.crateIssue.listByCompany(activeCompany.id),
        window.api.crateReceive.listByCompany(activeCompany.id)
      ])

      // Map to track balances: key = accountId_crateMarkaId
      const balanceMap = new Map<string, {
        accountId: string
        accountName: string
        crateMarkaId: string
        crateMarkaName: string
        issued: number
        received: number
      }>()

      // Process issued entries (crates we gave out)
      if (issueResp.success && issueResp.data) {
        issueResp.data.forEach((entry: any) => {
          const dateStr = entry.issueDate ? entry.issueDate.split('T')[0] : ''
          if (dateStr <= upToDate) {
            entry.items?.forEach((item: any) => {
              const key = `${item.accountId}_${item.crateMarkaId}`
              if (!balanceMap.has(key)) {
                balanceMap.set(key, {
                  accountId: item.accountId || '',
                  accountName: item.account?.accountName || 'Unknown',
                  crateMarkaId: item.crateMarkaId || '',
                  crateMarkaName: item.crateMarka?.crateMarkaName || 'Unknown',
                  issued: 0,
                  received: 0
                })
              }
              const record = balanceMap.get(key)!
              record.issued += item.qty || 0
            })
          }
        })
      }

      // Process received entries (crates we got from others)
      if (receiveResp.success && receiveResp.data) {
        receiveResp.data.forEach((entry: any) => {
          const dateStr = entry.receiveDate ? entry.receiveDate.split('T')[0] : ''
          if (dateStr <= upToDate) {
            entry.items?.forEach((item: any) => {
              const key = `${item.accountId}_${item.crateMarkaId}`
              if (!balanceMap.has(key)) {
                balanceMap.set(key, {
                  accountId: item.accountId || '',
                  accountName: item.account?.accountName || 'Unknown',
                  crateMarkaId: item.crateMarkaId || '',
                  crateMarkaName: item.crateMarka?.crateMarkaName || 'Unknown',
                  issued: 0,
                  received: 0
                })
              }
              const record = balanceMap.get(key)!
              record.received += item.qty || 0
            })
          }
        })
      }

      // Convert to array and calculate balances
      // For issuable: balance = received - issued (positive = we need to issue/return crates)
      const balanceRows: BalanceRow[] = []
      balanceMap.forEach((record, key) => {
        const balance = record.received - record.issued
        const crate = crateMarkas.find(c => c.id === record.crateMarkaId)
        balanceRows.push({
          id: key,
          accountId: record.accountId,
          accountName: record.accountName,
          crateMarkaId: record.crateMarkaId,
          crateMarkaName: record.crateMarkaName,
          issued: record.issued,
          received: record.received,
          balance: balance,
          value: balance * (crate?.cost || 0)
        })
      })

      setRows(balanceRows)
      setCurrentPage(1)
    } catch (error) {
      console.error('Load balances error:', error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // Apply filters then sorting
  const filteredAndSorted = useMemo(() => {
    let filtered = rows

    // Only show positive balances (issuable - we received more than issued) unless showZeroBalance
    if (!showZeroBalance) {
      filtered = filtered.filter(r => r.balance > 0)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.accountName.toLowerCase().includes(query) || 
        r.crateMarkaName.toLowerCase().includes(query)
      )
    }

    // Crate Marka filter
    if (crateMarkaFilter !== 'all') {
      filtered = filtered.filter(r => r.crateMarkaId === crateMarkaFilter)
    }

    // Sorting
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
  }, [rows, searchQuery, crateMarkaFilter, sortBy, sortDir, showZeroBalance])

  // Grouped data (if grouping is enabled)
  const groupedData = useMemo((): GroupedRow[] | null => {
    if (groupBy === 'none') return null

    const groups = new Map<string, GroupedRow>()

    filteredAndSorted.forEach(row => {
      const key = groupBy === 'account' ? row.accountId : row.crateMarkaId
      const name = groupBy === 'account' ? row.accountName : row.crateMarkaName

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          groupName: name,
          issued: 0,
          received: 0,
          balance: 0,
          value: 0,
          items: []
        })
      }

      const group = groups.get(key)!
      group.issued += row.issued
      group.received += row.received
      group.balance += row.balance
      group.value += row.value
      group.items.push(row)
    })

    return Array.from(groups.values()).sort((a, b) => a.groupName.localeCompare(b.groupName))
  }, [filteredAndSorted, groupBy])

  // Summary calculations
  const totalBalance = filteredAndSorted.reduce((s, r) => s + r.balance, 0)
  const totalValue = filteredAndSorted.reduce((s, r) => s + r.value, 0)

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
  }, [dataToDisplay.length, currentPage, totalPages])

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <PackageOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view crates issuable</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Crate Issuable</h1>
          <p className="text-xs text-muted-foreground mt-1">Showing crates we received and need to issue/return back</p>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Up to</Label>
          <Input 
            type="date" 
            value={upToDate} 
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const val = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (val > today) return
              setUpToDate(val)
            }} 
            className="w-40" 
          />
          <Button variant="ghost" size="icon" onClick={loadBalances} disabled={loading} title="Refresh">
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
                  placeholder="Search account or marka..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="max-w-xs" 
                />
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

                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Group By" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="account">By Account</SelectItem>
                      <SelectItem value="crateMarka">By Crate Marka</SelectItem>
                    </SelectContent>
                  </Select>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showZeroBalance} 
                      onChange={(e) => setShowZeroBalance(e.target.checked)}
                      className="rounded"
                    />
                    Show all balances
                  </label>
                </div>

                <div className="flex-1" />
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
                {/* Active Filters/Sort Indicators */}
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
                    
                    {groupBy !== 'none' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Grouped by: {groupBy === 'account' ? 'Account' : 'Crate Marka'}</span>
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

                {/* Table */}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold w-12">S.N</TableHead>
                      {groupBy !== 'none' ? (
                        <>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('groupName')}>
                              <span>{groupBy === 'account' ? 'Account Name' : 'Crate Marka'}</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'groupName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'groupName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('balance')}>
                              <span>Issuable</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'balance' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'balance' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('value')}>
                              <span>Value</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'value' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'value' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                        </>
                      ) : (
                        <>
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
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('balance')}>
                              <span>Issuable</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'balance' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'balance' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('value')}>
                              <span>Value</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'value' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'value' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={groupBy !== 'none' ? 4 : 5} className="text-center text-muted-foreground py-8">
                          {rows.length === 0 ? 'No data for selected date range' : 'No issuable balances found'}
                        </TableCell>
                      </TableRow>
                    ) : groupBy !== 'none' ? (
                      // Grouped view
                      (paginatedData as GroupedRow[]).map((group, idx) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">{group.groupName}</TableCell>
                          <TableCell className={`text-right font-bold ${group.balance > 0 ? 'text-orange-600' : group.balance < 0 ? 'text-blue-600' : ''}`}>
                            {group.balance}
                          </TableCell>
                          <TableCell className="text-right">₹{group.value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      // Detailed view
                      (paginatedData as BalanceRow[]).map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">{row.accountName}</TableCell>
                          <TableCell>{row.crateMarkaName}</TableCell>
                          <TableCell className={`text-right font-bold ${row.balance > 0 ? 'text-orange-600' : row.balance < 0 ? 'text-blue-600' : ''}`}>
                            {row.balance}
                          </TableCell>
                          <TableCell className="text-right">₹{row.value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Pagination controls */}
              {dataToDisplay.length > 0 && (
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

      {/* Fixed Summary Footer */}
      <div className="border-t bg-white shadow-lg fixed bottom-8 right-6 z-50 rounded-lg">
        <div className="w-auto p-4">
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Issuable</div>
              <div className={`text-xl font-bold ${totalBalance > 0 ? 'text-orange-600' : 'text-blue-600'}`}>{totalBalance}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Value</div>
              <div className="text-xl font-bold text-primary">₹{totalValue.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
