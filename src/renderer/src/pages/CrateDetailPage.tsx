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
import { ChevronLeft, ChevronRight, RefreshCw, Info, Printer, ChevronUp, ChevronDown, ArrowUpDown, FilterX } from 'lucide-react'

// Transaction row represents a single issue or receive transaction
interface TransactionRow {
  id: string
  date: string
  type: 'Issue' | 'Receive'
  accountId: string
  accountName: string
  qty: number
  remarks: string
  runningBalance: number  // Running balance after this transaction
}

export function CrateDetailPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<TransactionRow[]>([])
  const [crateMarkas, setCrateMarkas] = useState<any[]>([])
  const [selectedCrateMarka, setSelectedCrateMarka] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [openingBalance, setOpeningBalance] = useState(0)

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

  const handleClearSort = () => {
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

  // Reload when dates or selected crate marka changes
  useEffect(() => {
    if (!activeCompany || !fromDate || !toDate || !selectedCrateMarka) return
    loadTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, selectedCrateMarka])

  const loadCrateMarkas = async () => {
    if (!activeCompany) return
    try {
      const resp = await window.api.crate.listByCompany(activeCompany.id)
      if (resp.success && resp.data) {
        setCrateMarkas(resp.data)
        // Auto-select first crate marka if available
        if (resp.data.length > 0 && !selectedCrateMarka) {
          setSelectedCrateMarka(resp.data[0].id)
        }
      }
    } catch (error) {
      console.error('Load crate markas error:', error)
    }
  }

  const loadTransactions = async () => {
    if (!activeCompany || !selectedCrateMarka) return
    setLoading(true)
    try {
      // Get selected crate marka details for initial opening balance
      const selectedCrate = crateMarkas.find(c => c.id === selectedCrateMarka)
      const initialOpQty = selectedCrate?.opQty || 0

      // Load both issued and received entries
      const [issueResp, receiveResp] = await Promise.all([
        window.api.crateIssue.listByCompany(activeCompany.id),
        window.api.crateReceive.listByCompany(activeCompany.id)
      ])

      const transactions: TransactionRow[] = []
      let issuedBefore = 0
      let receivedBefore = 0

      // Process issued entries
      if (issueResp.success && issueResp.data) {
        issueResp.data.forEach((entry: any) => {
          const dateStr = entry.issueDate ? entry.issueDate.split('T')[0] : ''
          entry.items?.forEach((item: any) => {
            if (item.crateMarkaId === selectedCrateMarka) {
              if (dateStr < fromDate) {
                // Before the date range - affects opening balance
                issuedBefore += item.qty || 0
              } else if (dateStr >= fromDate && dateStr <= toDate) {
                // Within date range
                transactions.push({
                  id: `issue-${entry.id}-${item.id}`,
                  date: dateStr,
                  type: 'Issue',
                  accountId: item.accountId || '',
                  accountName: item.account?.accountName || 'Unknown',
                  qty: item.qty || 0,
                  remarks: item.remarks || '',
                  runningBalance: 0 // Will be calculated later
                })
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
            if (item.crateMarkaId === selectedCrateMarka) {
              if (dateStr < fromDate) {
                // Before the date range - affects opening balance
                receivedBefore += item.qty || 0
              } else if (dateStr >= fromDate && dateStr <= toDate) {
                // Within date range
                transactions.push({
                  id: `receive-${entry.id}-${item.id}`,
                  date: dateStr,
                  type: 'Receive',
                  accountId: item.accountId || '',
                  accountName: item.account?.accountName || 'Unknown',
                  qty: item.qty || 0,
                  remarks: item.remarks || '',
                  runningBalance: 0 // Will be calculated later
                })
              }
            }
          })
        })
      }

      // Calculate opening balance: initial + received before - issued before
      const calculatedOpeningBalance = initialOpQty + receivedBefore - issuedBefore
      setOpeningBalance(calculatedOpeningBalance)

      // Sort by date for running balance calculation
      transactions.sort((a, b) => a.date.localeCompare(b.date))

      // Calculate running balance starting from opening balance
      let balance = calculatedOpeningBalance
      transactions.forEach(t => {
        if (t.type === 'Receive') {
          balance += t.qty
        } else {
          balance -= t.qty
        }
        t.runningBalance = balance
      })

      setRows(transactions)
      setCurrentPage(1)
    } catch (error) {
      console.error('Load transactions error:', error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // Apply sorting (running balance is recalculated only when not sorting or sorting by date)
  const sortedData = useMemo(() => {
    if (!sortBy) return rows

    const copy = [...rows]
    const dirMul = sortDir === 'asc' ? 1 : -1
    copy.sort((a, b) => {
      const aa = (a as any)[sortBy]
      const bb = (b as any)[sortBy]
      if (typeof aa === 'number' && typeof bb === 'number') return (aa - bb) * dirMul
      return String(aa || '').localeCompare(String(bb || '')) * dirMul
    })
    return copy
  }, [rows, sortBy, sortDir])

  // Summary calculations
  const totalIssued = rows.filter(r => r.type === 'Issue').reduce((s, r) => s + r.qty, 0)
  const totalReceived = rows.filter(r => r.type === 'Receive').reduce((s, r) => s + r.qty, 0)
  const closingBalance = openingBalance + totalReceived - totalIssued

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = sortedData.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [sortedData.length, currentPage, totalPages])

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Info className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view crate details</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Crate Details</h1>
          <p className="text-xs text-muted-foreground mt-1">All transactions for selected crate marka</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedCrateMarka} onValueChange={setSelectedCrateMarka}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Crate Marka" />
            </SelectTrigger>
            <SelectContent>
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
          <Button variant="ghost" size="icon" onClick={loadTransactions} disabled={loading} title="Refresh">
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
                    variant={sortBy === 'type' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('type')}
                  >
                    Type {sortBy === 'type' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button 
                    variant={sortBy === 'accountName' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('accountName')}
                  >
                    Account {sortBy === 'accountName' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button 
                    variant={sortBy === 'qty' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('qty')}
                  >
                    Qty {sortBy === 'qty' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                </div>

                {hasActiveSort && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSort}
                    className="h-7 text-xs"
                  >
                    <FilterX className="h-3 w-3 mr-1" />
                    Clear Sort
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
                {/* Active Sort Indicator */}
                {hasActiveSort && (
                  <div className="flex items-center gap-2 flex-wrap p-4 border-b">
                    <span className="text-sm text-muted-foreground">Active:</span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                      <ArrowUpDown className="h-3 w-3" />
                      <span>Sort: {String(sortBy)} ({sortDir})</span>
                      <button
                        onClick={handleClearSort}
                        className="ml-1 hover:text-destructive"
                        title="Clear sort"
                      >
                        <FilterX className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Table */}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="font-bold w-12">S.N</TableHead>
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
                        <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('accountName')}>
                          <span>Account Name</span>
                          <span className="flex flex-col ml-1">
                            <ChevronUp className={sortBy === 'accountName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'accountName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                      <TableHead className="font-bold">Remarks</TableHead>
                      <TableHead className="font-bold text-right">
                        <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('qty')}>
                          <span>Qty</span>
                          <span className="flex flex-col ml-1 items-end">
                            <ChevronUp className={sortBy === 'qty' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'qty' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                      <TableHead className="font-bold text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!selectedCrateMarka ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Please select a crate marka to view transactions
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No transactions found for selected date range
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              row.type === 'Issue' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {row.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{row.accountName}</TableCell>
                          <TableCell className="text-muted-foreground">{row.remarks || '-'}</TableCell>
                          <TableCell className={`text-right font-medium ${
                            row.type === 'Issue' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {row.type === 'Issue' ? '-' : '+'}{row.qty}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${row.runningBalance < 0 ? 'text-red-600' : ''}`}>
                            {row.runningBalance}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {/* Pagination controls */}
              {sortedData.length > 0 && (
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
                      {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of {sortedData.length}
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
              <div className="text-lg font-bold">{openingBalance}</div>
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
              <div className={`text-xl font-bold ${closingBalance < 0 ? 'text-red-600' : 'text-primary'}`}>{closingBalance}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
