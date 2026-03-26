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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft, ChevronRight, RefreshCw, ClipboardList, Printer, ChevronUp, ChevronDown, ArrowUpDown, FilterX } from 'lucide-react'

// Register row represents a single transaction entry
interface RegisterRow {
  id: string
  date: string
  vchNo: string
  accountId: string
  accountName: string
  crateMarkaId: string
  crateMarkaName: string
  qty: number
  rate: number
  value: number
}

export function CrateRegisterPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [issueRows, setIssueRows] = useState<RegisterRow[]>([])
  const [receiveRows, setReceiveRows] = useState<RegisterRow[]>([])
  const [crateMarkas, setCrateMarkas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'issue' | 'receive'>('issue')

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

  // Reload register when crateMarkas or dates change
  useEffect(() => {
    if (!activeCompany || !fromDate || !toDate || crateMarkas.length === 0) return
    loadRegister()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, crateMarkas])

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

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

  const loadRegister = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      // Load both issued and received entries
      const [issueResp, receiveResp] = await Promise.all([
        window.api.crateIssue.listByCompany(activeCompany.id),
        window.api.crateReceive.listByCompany(activeCompany.id)
      ])

      // Process issued entries
      const issueData: RegisterRow[] = []
      if (issueResp.success && issueResp.data) {
        issueResp.data.forEach((entry: any, entryIdx: number) => {
          const dateStr = entry.issueDate ? entry.issueDate.split('T')[0] : ''
          if (dateStr >= fromDate && dateStr <= toDate) {
            entry.items?.forEach((item: any, itemIdx: number) => {
              const crate = crateMarkas.find(c => c.id === item.crateMarkaId)
              const rate = crate?.cost || 0
              issueData.push({
                id: `issue-${entry.id}-${item.id || itemIdx}`,
                date: dateStr,
                vchNo: item.vchNo || `ISS-${entryIdx + 1}`,
                accountId: item.accountId || '',
                accountName: item.account?.accountName || 'Unknown',
                crateMarkaId: item.crateMarkaId || '',
                crateMarkaName: item.crateMarka?.crateMarkaName || 'Unknown',
                qty: item.qty || 0,
                rate: rate,
                value: (item.qty || 0) * rate
              })
            })
          }
        })
      }

      // Process received entries
      const receiveData: RegisterRow[] = []
      if (receiveResp.success && receiveResp.data) {
        receiveResp.data.forEach((entry: any, entryIdx: number) => {
          const dateStr = entry.receiveDate ? entry.receiveDate.split('T')[0] : ''
          if (dateStr >= fromDate && dateStr <= toDate) {
            entry.items?.forEach((item: any, itemIdx: number) => {
              const crate = crateMarkas.find(c => c.id === item.crateMarkaId)
              const rate = crate?.cost || 0
              receiveData.push({
                id: `receive-${entry.id}-${item.id || itemIdx}`,
                date: dateStr,
                vchNo: item.vchNo || `RCV-${entryIdx + 1}`,
                accountId: item.accountId || '',
                accountName: item.account?.accountName || 'Unknown',
                crateMarkaId: item.crateMarkaId || '',
                crateMarkaName: item.crateMarka?.crateMarkaName || 'Unknown',
                qty: item.qty || 0,
                rate: rate,
                value: (item.qty || 0) * rate
              })
            })
          }
        })
      }

      // Sort by date
      issueData.sort((a, b) => a.date.localeCompare(b.date))
      receiveData.sort((a, b) => a.date.localeCompare(b.date))

      setIssueRows(issueData)
      setReceiveRows(receiveData)
      setCurrentPage(1)
    } catch (error) {
      console.error('Load register error:', error)
      setIssueRows([])
      setReceiveRows([])
    } finally {
      setLoading(false)
    }
  }

  // Get current rows based on active tab
  const currentRows = activeTab === 'issue' ? issueRows : receiveRows

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortBy) return currentRows

    const copy = [...currentRows]
    const dirMul = sortDir === 'asc' ? 1 : -1
    copy.sort((a, b) => {
      const aa = (a as any)[sortBy]
      const bb = (b as any)[sortBy]
      if (typeof aa === 'number' && typeof bb === 'number') return (aa - bb) * dirMul
      return String(aa || '').localeCompare(String(bb || '')) * dirMul
    })
    return copy
  }, [currentRows, sortBy, sortDir])

  // Summary calculations for current tab
  const totalQty = currentRows.reduce((s, r) => s + r.qty, 0)
  const totalValue = currentRows.reduce((s, r) => s + r.value, 0)

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
        <ClipboardList className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view crate register</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Crate Register</h1>
          <p className="text-xs text-muted-foreground mt-1">Date wise crate issue and receive register</p>
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
          <Button variant="ghost" size="icon" onClick={loadRegister} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.print()}>
            <Printer />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'issue' | 'receive')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="issue" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
              Crate Issue Register ({issueRows.length})
            </TabsTrigger>
            <TabsTrigger value="receive" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
              Crate Receive Register ({receiveRows.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
                    variant={sortBy === 'accountName' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('accountName')}
                  >
                    Party {sortBy === 'accountName' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button 
                    variant={sortBy === 'crateMarkaName' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('crateMarkaName')}
                  >
                    Marka {sortBy === 'crateMarkaName' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button 
                    variant={sortBy === 'qty' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('qty')}
                  >
                    Qty {sortBy === 'qty' && (sortDir === 'asc' ? '↑' : '↓')}
                  </Button>
                  <Button 
                    variant={sortBy === 'value' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => handleSort('value')}
                  >
                    Value {sortBy === 'value' && (sortDir === 'asc' ? '↑' : '↓')}
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
                        <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('vchNo')}>
                          <span>Vch No</span>
                          <span className="flex flex-col ml-1">
                            <ChevronUp className={sortBy === 'vchNo' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'vchNo' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                      <TableHead className="font-bold">
                        <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('accountName')}>
                          <span>Party (Account)</span>
                          <span className="flex flex-col ml-1">
                            <ChevronUp className={sortBy === 'accountName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'accountName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
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
                        <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('qty')}>
                          <span>Qty</span>
                          <span className="flex flex-col ml-1 items-end">
                            <ChevronUp className={sortBy === 'qty' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'qty' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                          </span>
                        </button>
                      </TableHead>
                      <TableHead className="font-bold text-right">
                        <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('rate')}>
                          <span>Rate</span>
                          <span className="flex flex-col ml-1 items-end">
                            <ChevronUp className={sortBy === 'rate' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                            <ChevronDown className={sortBy === 'rate' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No {activeTab === 'issue' ? 'issue' : 'receive'} transactions found for selected date range
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.vchNo}</TableCell>
                          <TableCell className="font-medium">{row.accountName}</TableCell>
                          <TableCell>{row.crateMarkaName}</TableCell>
                          <TableCell className={`text-right font-medium ${activeTab === 'issue' ? 'text-red-600' : 'text-green-600'}`}>
                            {row.qty}
                          </TableCell>
                          <TableCell className="text-right">₹{row.rate.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-bold ${activeTab === 'issue' ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{row.value.toFixed(2)}
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
              <div className="text-sm text-muted-foreground">Total Qty</div>
              <div className={`text-xl font-bold ${activeTab === 'issue' ? 'text-red-600' : 'text-green-600'}`}>
                {totalQty}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className={`text-xl font-bold ${activeTab === 'issue' ? 'text-red-600' : 'text-green-600'}`}>
                ₹{totalValue.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
