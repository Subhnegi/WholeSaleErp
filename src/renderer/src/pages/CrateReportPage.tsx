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
import { ChevronLeft, ChevronRight, RefreshCw, Package, Printer, ChevronUp, ChevronDown, ArrowUpDown, FilterX } from 'lucide-react'

// Report row represents crate marka wise summary
interface ReportRow {
  id: string
  crateMarkaId: string
  crateMarkaName: string
  openingBalance: number  // From crate_marka.opQty
  issued: number          // Total issued in date range
  received: number        // Total received in date range
  closingBalance: number  // opening + received - issued
}

export function CrateReportPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<ReportRow[]>([])
  const [crateMarkas, setCrateMarkas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [crateMarkaFilter, setCrateMarkaFilter] = useState<string>('all')

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
  const hasFilters = searchQuery !== '' || crateMarkaFilter !== 'all'

  const handleClearAll = () => {
    setSearchQuery('')
    setCrateMarkaFilter('all')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany])

  // Reload when dates or crateMarkas change
  useEffect(() => {
    if (!activeCompany || !fromDate || !toDate || crateMarkas.length === 0) return
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, crateMarkas])

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

  const loadReport = async () => {
    if (!activeCompany || crateMarkas.length === 0) return
    setLoading(true)
    try {
      // Load both issued and received entries
      const [issueResp, receiveResp] = await Promise.all([
        window.api.crateIssue.listByCompany(activeCompany.id),
        window.api.crateReceive.listByCompany(activeCompany.id)
      ])

      // Map to track totals per crate marka
      // Track both: transactions before fromDate (for opening) and within date range
      const crateMap = new Map<string, {
        issuedBefore: number    // Issued before fromDate
        receivedBefore: number  // Received before fromDate
        issued: number          // Issued within date range
        received: number        // Received within date range
      }>()

      // Initialize with all crate markas
      crateMarkas.forEach((crate: any) => {
        crateMap.set(crate.id, { issuedBefore: 0, receivedBefore: 0, issued: 0, received: 0 })
      })

      // Process issued entries
      if (issueResp.success && issueResp.data) {
        issueResp.data.forEach((entry: any) => {
          const dateStr = entry.issueDate ? entry.issueDate.split('T')[0] : ''
          entry.items?.forEach((item: any) => {
            if (crateMap.has(item.crateMarkaId)) {
              const record = crateMap.get(item.crateMarkaId)!
              if (dateStr < fromDate) {
                // Before the date range - affects opening balance
                record.issuedBefore += item.qty || 0
              } else if (dateStr >= fromDate && dateStr <= toDate) {
                // Within date range
                record.issued += item.qty || 0
              }
            }
          })
        })
      }

      // Process received entries
      if (receiveResp.success && receiveResp.data) {
        receiveResp.data.forEach((entry: any) => {
          const dateStr = entry.receiveDate ? entry.receiveDate.split('T')[0] : ''
          entry.items?.forEach((item: any) => {
            if (crateMap.has(item.crateMarkaId)) {
              const record = crateMap.get(item.crateMarkaId)!
              if (dateStr < fromDate) {
                // Before the date range - affects opening balance
                record.receivedBefore += item.qty || 0
              } else if (dateStr >= fromDate && dateStr <= toDate) {
                // Within date range
                record.received += item.qty || 0
              }
            }
          })
        })
      }

      // Convert to report rows
      const reportRows: ReportRow[] = crateMarkas.map((crate: any) => {
        const data = crateMap.get(crate.id) || { issuedBefore: 0, receivedBefore: 0, issued: 0, received: 0 }
        // Opening = Initial opQty + all received before fromDate - all issued before fromDate
        const openingBalance = (crate.opQty || 0) + data.receivedBefore - data.issuedBefore
        // Closing = Opening + Received (in range) - Issued (in range)
        const closingBalance = openingBalance + data.received - data.issued
        
        return {
          id: crate.id,
          crateMarkaId: crate.id,
          crateMarkaName: crate.crateMarkaName,
          openingBalance: openingBalance,
          issued: data.issued,
          received: data.received,
          closingBalance: closingBalance
        }
      })

      setRows(reportRows)
      setCurrentPage(1)
    } catch (error) {
      console.error('Load report error:', error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // Apply filters then sorting
  const filteredAndSorted = useMemo(() => {
    let filtered = rows

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
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
  }, [rows, searchQuery, crateMarkaFilter, sortBy, sortDir])

  // Summary calculations
  const totalOpening = filteredAndSorted.reduce((s, r) => s + r.openingBalance, 0)
  const totalIssued = filteredAndSorted.reduce((s, r) => s + r.issued, 0)
  const totalReceived = filteredAndSorted.reduce((s, r) => s + r.received, 0)
  const totalClosing = filteredAndSorted.reduce((s, r) => s + r.closingBalance, 0)

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredAndSorted.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [filteredAndSorted.length, currentPage, totalPages])

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Package className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view crate report</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Crate Report</h1>
          <p className="text-xs text-muted-foreground mt-1">Crate marka wise opening, issued, received and closing balance</p>
        </div>

        <div className="flex items-center gap-3">
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
          <Button variant="ghost" size="icon" onClick={loadReport} disabled={loading} title="Refresh">
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
                  placeholder="Search crate marka..." 
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
                      <TableHead className="font-bold">
                        <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('crateMarkaName')}>
                          <span>Crate Marka Name</span>
                          <span className="flex flex-col ml-1">
                            <ChevronUp className={sortBy === 'crateMarkaName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'crateMarkaName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                      <TableHead className="font-bold text-right">
                        <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('openingBalance')}>
                          <span>Opening Bal.</span>
                          <span className="flex flex-col ml-1 items-end">
                            <ChevronUp className={sortBy === 'openingBalance' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'openingBalance' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
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
                      <TableHead className="font-bold text-right">
                        <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('closingBalance')}>
                          <span>Closing Bal.</span>
                          <span className="flex flex-col ml-1 items-end">
                            <ChevronUp className={sortBy === 'closingBalance' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'closingBalance' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {rows.length === 0 ? 'No crate markas found' : 'No entries match the current filters'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">{row.crateMarkaName}</TableCell>
                          <TableCell className="text-right">{row.openingBalance}</TableCell>
                          <TableCell className="text-right text-red-600">{row.issued}</TableCell>
                          <TableCell className="text-right text-green-600">{row.received}</TableCell>
                          <TableCell className={`text-right font-bold ${row.closingBalance < 0 ? 'text-red-600' : ''}`}>
                            {row.closingBalance}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Pagination controls */}
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

      {/* Fixed Summary Footer */}
      <div className="border-t bg-white shadow-lg fixed bottom-8 right-6 z-50 rounded-lg">
        <div className="w-auto p-4">
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-sm text-muted-foreground">Opening</div>
              <div className="text-lg font-bold">{totalOpening}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Issued</div>
              <div className="text-lg font-bold text-red-600">{totalIssued}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Received</div>
              <div className="text-lg font-bold text-green-600">{totalReceived}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Closing</div>
              <div className={`text-xl font-bold ${totalClosing < 0 ? 'text-red-600' : 'text-primary'}`}>{totalClosing}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
