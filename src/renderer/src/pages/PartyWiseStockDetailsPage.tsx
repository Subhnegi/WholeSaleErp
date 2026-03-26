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

// Balance row represents stock balance per supplier per store per item
interface StockRow {
  id: string
  supplierId: string
  supplierName: string
  storeId: string | null
  storeName: string
  itemId: string
  itemName: string
  availableNug: number
  availableKg: number
}

interface GroupedRow {
  id: string
  groupName: string
  availableNug: number
  items: StockRow[]
}

interface MasterDataSets {
  suppliers: any[]
  stores: any[]
  items: any[]
}

export function PartyWiseStockDetailsPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  const [upToDate, setUpToDate] = useState('')
  const [rows, setRows] = useState<StockRow[]>([])
  const [loading, setLoading] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [storeFilter, setStoreFilter] = useState<string>('all')
  const [itemFilter, setItemFilter] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<string>('none')
  const [showZeroBalance, setShowZeroBalance] = useState(false)

  // Sorting
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Master data for filters
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  const hasActiveSort = !!sortBy
  const hasFilters = searchQuery !== '' || supplierFilter !== 'all' || storeFilter !== 'all' || itemFilter !== 'all' || groupBy !== 'none'

  const handleClearAll = () => {
    setSearchQuery('')
    setSupplierFilter('all')
    setStoreFilter('all')
    setItemFilter('all')
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
    const initialize = async () => {
      const masterData = await loadMasterData()
      await loadStockData(masterData)
    }
    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany])

  // Reload when date changes
  useEffect(() => {
    if (!activeCompany || !upToDate) return
    loadStockData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upToDate])

  const loadMasterData = async (): Promise<MasterDataSets | null> => {
    if (!activeCompany) return null

    try {
      // Load suppliers (accounts with sundry creditor group)
      let supplierAccounts: any[] = []
      const accountsResp = await window.api.account.listByCompany(activeCompany.id)
      if (accountsResp.success && accountsResp.data) {
        supplierAccounts = accountsResp.data.filter((account: any) =>
          account.accountGroup?.name?.toLowerCase().includes('sundry creditor') ||
          account.accountGroup?.name?.toLowerCase().includes('supplier') ||
          account.accountName?.toLowerCase()==='mall khata purchase a/c'
        )
      }
      setSuppliers(supplierAccounts)

      // Load stores
      let storeList: any[] = []
      const storesResp = await window.api.store.listByCompany(activeCompany.id)
      if (Array.isArray(storesResp)) {
        storeList = storesResp
      }
      setStores(storeList)

      // Load items
      let itemList: any[] = []
      const itemsResp = await window.api.item.listByCompany(activeCompany.id)
      if (itemsResp.success && itemsResp.data) {
        itemList = itemsResp.data
      }
      setItems(itemList)

      return {
        suppliers: supplierAccounts,
        stores: storeList,
        items: itemList
      }
    } catch (error) {
      console.error('Load master data error:', error)
      return null
    }
  }

  const loadStockData = async (masterDataOverride?: MasterDataSets | null) => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const resolvedSuppliers = masterDataOverride?.suppliers ?? suppliers
      const resolvedStores = masterDataOverride?.stores ?? stores
      const resolvedItems = masterDataOverride?.items ?? items

      const supplierMap = new Map(
        (resolvedSuppliers ?? []).map((supplier: any) => [supplier.id, supplier.accountName ?? supplier.name ?? ''])
      )
      const storeMap = new Map(
        (resolvedStores ?? []).map((store: any) => [store.id, store.name ?? store.storeName ?? ''])
      )
      const itemMap = new Map(
        (resolvedItems ?? []).map((item: any) => [item.id, item.itemName ?? item.name ?? ''])
      )

      // Get stock ledger data
      const ledgerResp = await window.api.stockLedger.getAvailable(activeCompany.id, {
        includeZeroAvailable: true,
        ...(upToDate ? { upToDate } : {})
      })
      if (ledgerResp.success && ledgerResp.data) {
        // Filter by upToDate if specified
        let filteredData = ledgerResp.data
        if (upToDate) {
          filteredData = ledgerResp.data.filter((entry: any) => {
            if (!entry.updatedAt) return true
            const parsed = new Date(entry.updatedAt)
            if (Number.isNaN(parsed.getTime())) return true
            const entryDate = parsed.toISOString().split('T')[0]
            return entryDate <= upToDate
          })
        }

        // Convert to our format with friendly names
        const stockRows: StockRow[] = filteredData.map((entry: any, index: number) => {
          const supplierName = supplierMap.get(entry.supplierId) || entry.supplierName || 'Unknown Supplier'
          const storeName = entry.storeId
            ? storeMap.get(entry.storeId) || entry.storeName || 'Unknown Store'
            : 'Unknown Store'
          const itemName = itemMap.get(entry.itemId) || entry.itemName || 'Unknown Item'

          return {
            id: `stock-${index}`,
            supplierId: entry.supplierId,
            supplierName,
            storeId: entry.storeId ?? null,
            storeName,
            itemId: entry.itemId,
            itemName,
            availableNug: entry.availableNug || 0,
            availableKg: entry.availableKg || 0
          }
        })

        setRows(stockRows)
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('Load stock data error:', error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  // Apply filters then sorting
  const filteredAndSorted = useMemo(() => {
    let filtered = rows

    // Only show positive balances unless showZeroBalance
    if (!showZeroBalance) {
      filtered = filtered.filter(r => r.availableNug > 0)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        r.supplierName.toLowerCase().includes(query) ||
        r.storeName.toLowerCase().includes(query) ||
        r.itemName.toLowerCase().includes(query)
      )
    }

    // Supplier filter
    if (supplierFilter !== 'all') {
      filtered = filtered.filter(r => r.supplierId === supplierFilter)
    }

    // Store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter(r => r.storeId === storeFilter)
    }

    // Item filter
    if (itemFilter !== 'all') {
      filtered = filtered.filter(r => r.itemId === itemFilter)
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
  }, [rows, searchQuery, supplierFilter, storeFilter, itemFilter, sortBy, sortDir, showZeroBalance])

  // Grouped data (if grouping is enabled)
  const groupedData = useMemo((): GroupedRow[] | null => {
    if (groupBy === 'none') return null

    const groups = new Map<string, GroupedRow>()

    filteredAndSorted.forEach(row => {
      const key =
        groupBy === 'supplier'
          ? row.supplierId
          : groupBy === 'store'
            ? row.storeId ?? 'no-store'
            : row.itemId
      const name = groupBy === 'supplier' ? row.supplierName : groupBy === 'store' ? row.storeName : row.itemName

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          groupName: name,
          availableNug: 0,
          items: []
        })
      }

      const group = groups.get(key)!
      group.availableNug += row.availableNug
      group.items.push(row)
    })

    return Array.from(groups.values()).sort((a, b) => a.groupName.localeCompare(b.groupName))
  }, [filteredAndSorted, groupBy])

  // Summary calculations
  const totalNug = filteredAndSorted.reduce((s, r) => s + r.availableNug, 0)

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
        <Package className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view party wise stock details</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Party Wise Stock Details</h1>
          <p className="text-xs text-muted-foreground mt-1">Showing stock balance by supplier, store, and item up to selected date</p>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              const masterData = await loadMasterData()
              await loadStockData(masterData)
            }}
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
                  placeholder="Search supplier, store, or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />
                <div className="flex items-center gap-2">
                  <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Supplier" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.accountName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={storeFilter} onValueChange={setStoreFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Store" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={itemFilter} onValueChange={setItemFilter}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Item" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.itemName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={groupBy} onValueChange={setGroupBy}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Group By" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="supplier">By Supplier</SelectItem>
                      <SelectItem value="store">By Store</SelectItem>
                      <SelectItem value="item">By Item</SelectItem>
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

                    {supplierFilter !== 'all' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Supplier Filter</span>
                      </div>
                    )}

                    {storeFilter !== 'all' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Store Filter</span>
                      </div>
                    )}

                    {itemFilter !== 'all' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Item Filter</span>
                      </div>
                    )}

                    {groupBy !== 'none' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Grouped by: {groupBy === 'supplier' ? 'Supplier' : groupBy === 'store' ? 'Store' : 'Item'}</span>
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
                              <span>{groupBy === 'supplier' ? 'Supplier Name' : groupBy === 'store' ? 'Store Name' : 'Item Name'}</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'groupName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'groupName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('availableNug')}>
                              <span>Available Nug</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'availableNug' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'availableNug' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('supplierName')}>
                              <span>Supplier Name</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'supplierName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'supplierName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('storeName')}>
                              <span>Store</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'storeName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'storeName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('itemName')}>
                              <span>Item</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'itemName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'itemName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('availableNug')}>
                              <span>Balance</span>
                              <span className="flex flex-col ml-1 items-end">
                                <ChevronUp className={sortBy === 'availableNug' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'availableNug' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
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
                        <TableCell colSpan={groupBy !== 'none' ? 3 : 5} className="text-center text-muted-foreground py-8">
                          {rows.length === 0 ? 'No stock data available' : 'No stock balances found'}
                        </TableCell>
                      </TableRow>
                    ) : groupBy !== 'none' ? (
                      // Grouped view
                      (paginatedData as GroupedRow[]).map((group, idx) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">{group.groupName}</TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {group.availableNug}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      // Detailed view
                      (paginatedData as StockRow[]).map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">{row.supplierName}</TableCell>
                          <TableCell>{row.storeName}</TableCell>
                          <TableCell>{row.itemName}</TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {row.availableNug}
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
              <div className="text-sm text-muted-foreground">Total Nug</div>
              <div className="text-xl font-bold text-primary">{totalNug}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}