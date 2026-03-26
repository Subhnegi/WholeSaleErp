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
import { ChevronLeft, ChevronRight, RefreshCw, BookOpen, Printer, ChevronUp, ChevronDown, ArrowUpDown, FilterX } from 'lucide-react'

// Ledger row represents a single transaction
interface LedgerRow {
  id: string
  date: string
  vchNo: string
  type: 'Issue' | 'Receive'
  crateMarkaId: string
  crateMarkaName: string
  issued: number
  received: number
  balance: number      // Running balance
  rate: number         // Crate cost
  costDr: number       // Cost when issued (Dr)
  costCr: number       // Cost when received (Cr)
}

interface GroupedRow {
  id: string
  groupName: string
  issued: number
  received: number
  costDr: number
  costCr: number
  items: LedgerRow[]
}

export function CrateLedgerPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [crateMarkas, setCrateMarkas] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filter state
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [crateMarkaFilter, setCrateMarkaFilter] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<string>('none')

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
  const hasFilters = crateMarkaFilter !== 'all' || groupBy !== 'none'

  const handleClearAll = () => {
    setCrateMarkaFilter('all')
    setGroupBy('none')
    setSortBy(null)
    setSortDir('asc')
    setCurrentPage(1)
  }

  useEffect(() => {
    // set defaults to today
    const today = new Date()
    const iso = today.toISOString().slice(0, 10)
    setFromDate(iso)
    setToDate(iso)
  }, [])

  useEffect(() => {
    if (!activeCompany) return
    loadCrateMarkas()
    loadAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany])

  // Reload when dates, crateMarkas, or selected account changes
  useEffect(() => {
    if (!activeCompany || !fromDate || !toDate || crateMarkas.length === 0) return
    loadLedger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, crateMarkas, selectedAccount])

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

  const loadAccounts = async () => {
    if (!activeCompany) return
    try {
      const accountResp = await window.api.account.listByCompany(activeCompany.id)

      if (accountResp.success && accountResp.data) {
        // Filter accounts to only show those in Customer or Supplier groups
        const filteredAccounts = accountResp.data.filter((acc: any) => {
          const groupName = acc.accountGroup?.name?.toLowerCase() || ''
          return groupName === 'customer' || groupName === 'supplier'
        })
        setAccounts(filteredAccounts)
      }
    } catch (error) {
      console.error('Load accounts error:', error)
    }
  }

  const loadLedger = async () => {
    if (!activeCompany || crateMarkas.length === 0) return
    setLoading(true)
    try {
      // Load both issued and received entries
      const [issueResp, receiveResp] = await Promise.all([
        window.api.crateIssue.listByCompany(activeCompany.id),
        window.api.crateReceive.listByCompany(activeCompany.id)
      ])

      const transactions: LedgerRow[] = []
      let openingBalance = 0 // Balance from transactions before fromDate

      // Process issued entries
      if (issueResp.success && issueResp.data) {
        issueResp.data.forEach((entry: any) => {
          const dateStr = entry.issueDate ? entry.issueDate.split('T')[0] : ''
          entry.items?.forEach((item: any) => {
            // Filter by selected account if not 'all'
            if (selectedAccount !== 'all' && item.accountId !== selectedAccount) return

            const crate = crateMarkas.find(c => c.id === item.crateMarkaId)
            const rate = crate?.cost || 0

            if (dateStr < fromDate) {
              // Before date range - affects opening balance
              // Issued decreases our balance (crates went out)
              openingBalance -= item.qty || 0
            } else if (dateStr >= fromDate && dateStr <= toDate) {
              // Within date range
              transactions.push({
                id: `issue-${entry.id}-${item.id}`,
                date: dateStr,
                vchNo: item.vchNo || '',
                type: 'Issue',
                crateMarkaId: item.crateMarkaId || '',
                crateMarkaName: item.crateMarka?.crateMarkaName || 'Unknown',
                issued: item.qty || 0,
                received: 0,
                balance: 0, // Will be calculated later
                rate: rate,
                costDr: (item.qty || 0) * rate,
                costCr: 0
              })
            }
          })
        })
      }

      // Process received entries
      if (receiveResp.success && receiveResp.data) {
        receiveResp.data.forEach((entry: any) => {
          const dateStr = entry.receiveDate ? entry.receiveDate.split('T')[0] : ''
          entry.items?.forEach((item: any) => {
            // Filter by selected account if not 'all'
            if (selectedAccount !== 'all' && item.accountId !== selectedAccount) return

            const crate = crateMarkas.find(c => c.id === item.crateMarkaId)
            const rate = crate?.cost || 0

            if (dateStr < fromDate) {
              // Before date range - affects opening balance
              // Received increases our balance (crates came in)
              openingBalance += item.qty || 0
            } else if (dateStr >= fromDate && dateStr <= toDate) {
              // Within date range
              transactions.push({
                id: `receive-${entry.id}-${item.id}`,
                date: dateStr,
                vchNo: item.vchNo || '',
                type: 'Receive',
                crateMarkaId: item.crateMarkaId || '',
                crateMarkaName: item.crateMarka?.crateMarkaName || 'Unknown',
                issued: 0,
                received: item.qty || 0,
                balance: 0, // Will be calculated later
                rate: rate,
                costDr: 0,
                costCr: (item.qty || 0) * rate
              })
            }
          })
        })
      }

      // Sort by date for running balance calculation
      transactions.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        // If same date, sort by vchNo
        return a.vchNo.localeCompare(b.vchNo)
      })

      // Calculate running balance starting from opening balance
      // Received increases balance, Issued decreases balance
      let balance = openingBalance
      transactions.forEach(t => {
        balance += t.received - t.issued
        t.balance = balance
      })

      setRows(transactions)
      setCurrentPage(1)
    } catch (error) {
      console.error('Load ledger error:', error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // Apply filters then sorting
  const filteredAndSorted = useMemo(() => {
    let filtered = rows

    // Crate Marka filter
    if (crateMarkaFilter !== 'all') {
      filtered = filtered.filter(r => r.crateMarkaId === crateMarkaFilter)
      
      // Recalculate running balance after filtering
      let balance = 0
      filtered = filtered.map(t => {
        balance += t.issued - t.received
        return { ...t, balance }
      })
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
  }, [rows, crateMarkaFilter, sortBy, sortDir])

  // Grouped data (if grouping is enabled)
  const groupedData = useMemo((): GroupedRow[] | null => {
    if (groupBy === 'none') return null

    const groups = new Map<string, GroupedRow>()

    filteredAndSorted.forEach(row => {
      const key = row.type
      const name = row.type === 'Issue' ? 'Crate Issued' : 'Crate Received'

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          groupName: name,
          issued: 0,
          received: 0,
          costDr: 0,
          costCr: 0,
          items: []
        })
      }

      const group = groups.get(key)!
      group.issued += row.issued
      group.received += row.received
      group.costDr += row.costDr
      group.costCr += row.costCr
      group.items.push(row)
    })

    // Sort: Issue first, then Receive
    return Array.from(groups.values()).sort((a) => 
      a.groupName === 'Crate Issued' ? -1 : 1
    )
  }, [filteredAndSorted, groupBy])

  // Summary calculations
  const totalIssued = filteredAndSorted.reduce((s, r) => s + r.issued, 0)
  const totalReceived = filteredAndSorted.reduce((s, r) => s + r.received, 0)
  const totalBalance = totalReceived - totalIssued
  const totalCostDr = filteredAndSorted.reduce((s, r) => s + r.costDr, 0)
  const totalCostCr = filteredAndSorted.reduce((s, r) => s + r.costCr, 0)
  const costBalance = totalCostDr - totalCostCr

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

  // Get selected account name for display
  const selectedAccountName = selectedAccount === 'all' 
    ? 'All Accounts' 
    : accounts.find(a => a.id === selectedAccount)?.accountName || 'Unknown'

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <BookOpen className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view crate ledger</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Crate Ledger</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {selectedAccount !== 'all' ? `Ledger for: ${selectedAccountName}` : 'Date wise crate transactions ledger'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.accountName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={crateMarkaFilter} onValueChange={setCrateMarkaFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Crate Marka" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markas</SelectItem>
              {crateMarkas.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.crateMarkaName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="text-sm font-medium">From</Label>
          <Input 
            type="date" 
            value={fromDate} 
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const val = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (val > today) return
              setFromDate(val)
              if (toDate && val > toDate) {
                setToDate(val)
              }
            }} 
            className="w-40" 
          />
          <Label className="text-sm font-medium">To</Label>
          <Input 
            type="date" 
            value={toDate} 
            min={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const val = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (val > today || (fromDate && val < fromDate)) return
              setToDate(val)
            }} 
            className="w-40" 
          />
          <Button variant="ghost" size="icon" onClick={loadLedger} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.print()}>
            <Printer />
          </Button>
        </div>
      </div>

      {/* Sort Options */}
      <div className="py-4 px-6">
        <div className="max-w-[1400px] mx-auto">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm font-medium">Sort by:</span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant={sortBy === 'date' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('date')}
                  >
                    Date {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button 
                    variant={sortBy === 'vchNo' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('vchNo')}
                  >
                    Vch No {sortBy === 'vchNo' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button 
                    variant={sortBy === 'crateMarkaName' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('crateMarkaName')}
                  >
                    Marka {sortBy === 'crateMarkaName' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button 
                    variant={sortBy === 'issued' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('issued')}
                  >
                    Issued {sortBy === 'issued' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button 
                    variant={sortBy === 'received' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('received')}
                  >
                    Received {sortBy === 'received' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                </div>

                <div className="border-l pl-4 ml-2">
                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Group By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="type">By Issue/Receive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(hasActiveSort || hasFilters) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-7 text-xs"
                  >
                    <FilterX className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}

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
                    
                    {crateMarkaFilter !== 'all' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Marka Filter</span>
                      </div>
                    )}
                    
                    {groupBy !== 'none' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Grouped by: Issue/Receive</span>
                      </div>
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
                          <TableHead className="font-bold">Type</TableHead>
                          <TableHead className="font-bold text-right">Issued</TableHead>
                          <TableHead className="font-bold text-right">Received</TableHead>
                          <TableHead className="font-bold text-right">Cost Dr.</TableHead>
                          <TableHead className="font-bold text-right">Cost Cr.</TableHead>
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
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('vchNo')}>
                              <span>Vch No</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'vchNo' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'vchNo' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('crateMarkaName')}>
                              <span>Marka</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'crateMarkaName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'crateMarkaName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('issued')}>
                              <span>Issued</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'issued' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'issued' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('received')}>
                              <span>Received</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'received' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'received' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">Balance</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={groupBy !== 'none' ? 6 : 7} className="text-center text-muted-foreground py-8">
                          {rows.length === 0 ? 'No transactions found for selected date range' : 'No entries match the current filters'}
                        </TableCell>
                      </TableRow>
                    ) : groupBy !== 'none' ? (
                      // Grouped view
                      (paginatedData as GroupedRow[]).map((group, idx) => (
                        <TableRow key={group.id} className={group.groupName === 'Crate Issued' ? 'bg-red-50' : 'bg-green-50'}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              group.groupName === 'Crate Issued' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {group.groupName}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">{group.issued || '-'}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{group.received || '-'}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">₹{group.costDr.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">₹{group.costCr.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      // Detailed view
                      (paginatedData as LedgerRow[]).map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.vchNo || '-'}</TableCell>
                          <TableCell>{row.crateMarkaName}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">{row.issued || '-'}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{row.received || '-'}</TableCell>
                          <TableCell className={`text-right font-bold ${row.balance < 0 ? 'text-green-600' : row.balance > 0 ? 'text-red-600' : ''}`}>
                            {row.balance}
                          </TableCell>
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
              <div className="text-sm text-muted-foreground">Issued</div>
              <div className="text-lg font-bold text-red-600">{totalIssued}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Received</div>
              <div className="text-lg font-bold text-green-600">{totalReceived}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Balance</div>
              <div className={`text-lg font-bold ${totalBalance < 0 ? 'text-red-600' : totalBalance > 0 ? 'text-green-600' : ''}`}>
                {totalBalance}
              </div>
            </div>
            <div className="border-l pl-6">
              <div className="text-sm text-muted-foreground">Cost Dr.</div>
              <div className="text-lg font-bold text-red-600">₹{totalCostDr.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Cost Cr.</div>
              <div className="text-lg font-bold text-green-600">₹{totalCostCr.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Cost Bal.</div>
              <div className={`text-xl font-bold ${costBalance > 0 ? 'text-red-600' : costBalance < 0 ? 'text-green-600' : 'text-primary'}`}>
                ₹{Math.abs(costBalance).toFixed(2)} {costBalance > 0 ? 'Dr' : costBalance < 0 ? 'Cr' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
