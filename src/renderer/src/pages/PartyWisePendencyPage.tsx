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
import { ChevronLeft, ChevronRight, RefreshCw, Package, Printer, ChevronUp, ChevronDown, ArrowUpDown, FilterX } from 'lucide-react'

interface PendencyRow {
  id: string
  supplierId: string
  supplierName: string
  itemId: string
  itemName: string
  lotNoVariety: string
  availableNug: number
}

interface GroupedRow {
  id: string
  groupName: string
  availableNug: number
  items: PendencyRow[]
}

interface MasterDataSets {
  suppliers: any[]
  items: any[]
}

export function PartyWisePendencyPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  const [upToDate, setUpToDate] = useState('')
  const [rows, setRows] = useState<PendencyRow[]>([])
  const [loading, setLoading] = useState(false)

  // Master data
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])

  // Header supplier filter
  const [selectedSupplierId, setSelectedSupplierId] = useState('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState<string>('none')
  const [showZeroBalance, setShowZeroBalance] = useState(false)

  // Sorting
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const hasActiveSort = !!sortBy
  const hasFilters = searchQuery !== '' || groupBy !== 'none' || showZeroBalance

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
    setShowZeroBalance(false)
    setSortBy(null)
    setSortDir('asc')
    setCurrentPage(1)
  }

  useEffect(() => {
    const today = new Date()
    setUpToDate(today.toISOString().slice(0, 10))
  }, [])

  useEffect(() => {
    if (!activeCompany) return

    const initialize = async () => {
      const masterData = await loadMasterData()
      await loadPendencyData(masterData)
    }

    initialize()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany])

  useEffect(() => {
    if (!activeCompany || !upToDate) return
    loadPendencyData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upToDate])

  const loadMasterData = async (): Promise<MasterDataSets | null> => {
    if (!activeCompany) return null

    try {
      // Suppliers
      const accountsResp = await window.api.account.listByCompany(activeCompany.id)
      let supplierAccounts: any[] = []
      if (accountsResp.success && accountsResp.data) {
        supplierAccounts = accountsResp.data.filter((account: any) => {
          const groupName = account.accountGroup?.name?.toLowerCase() || ''
          const accountName = account.accountName?.toLowerCase() || ''
          return (
            groupName.includes('sundry creditor') ||
            groupName.includes('supplier') ||
            accountName === 'mall khata purchase a/c'
          )
        })
      }
      setSuppliers(supplierAccounts)

      // Items
      const itemsResp = await window.api.item.listByCompany(activeCompany.id)
      let itemList: any[] = []
      if (itemsResp.success && itemsResp.data) {
        itemList = itemsResp.data
      }
      setItems(itemList)

      return {
        suppliers: supplierAccounts,
        items: itemList
      }
    } catch (error) {
      console.error('Load master data error:', error)
      return null
    }
  }

  const loadPendencyData = async (masterDataOverride?: MasterDataSets | null) => {
    if (!activeCompany) return
    setLoading(true)

    try {
      const resolvedSuppliers = masterDataOverride?.suppliers ?? suppliers
      const resolvedItems = masterDataOverride?.items ?? items

      const supplierMap = new Map(
        (resolvedSuppliers ?? []).map((supplier: any) => [supplier.id, supplier.accountName ?? supplier.name ?? ''])
      )
      const itemMap = new Map(
        (resolvedItems ?? []).map((item: any) => [item.id, item.itemName ?? item.name ?? ''])
      )

      const ledgerResp = await window.api.stockLedger.getAvailable(activeCompany.id, {
        includeZeroAvailable: true,
        ...(upToDate ? { upToDate } : {})
      })

      if (ledgerResp.success && ledgerResp.data) {
        const pendencyRows: PendencyRow[] = ledgerResp.data.map((entry: any, index: number) => ({
          id: entry.id || `pendency-${index}`,
          supplierId: entry.supplierId,
          supplierName: supplierMap.get(entry.supplierId) || entry.supplierName || 'Unknown Supplier',
          itemId: entry.itemId,
          itemName: itemMap.get(entry.itemId) || entry.itemName || 'Unknown Item',
          lotNoVariety: entry.lotNoVariety || 'N/A',
          availableNug: entry.availableNug || 0
        }))

        setRows(pendencyRows)
        setCurrentPage(1)
      }
    } catch (error) {
      console.error('Load pendency data error:', error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const supplierIdsWithStock = useMemo(() => {
    const ids = new Set<string>()
    rows.forEach((row) => {
      if (row.availableNug > 0) {
        ids.add(row.supplierId)
      }
    })
    return ids
  }, [rows])

  const supplierOptions = useMemo(() => {
    const accountSuppliers = suppliers.filter((supplier) => supplierIdsWithStock.has(supplier.id))

    const fallbackSuppliers: any[] = []
    supplierIdsWithStock.forEach((id) => {
      if (!accountSuppliers.some((supplier) => supplier.id === id)) {
        const name = rows.find((row) => row.supplierId === id)?.supplierName || 'Unknown Supplier'
        fallbackSuppliers.push({ id, accountName: name })
      }
    })

    return [...accountSuppliers, ...fallbackSuppliers]
  }, [rows, supplierIdsWithStock, suppliers])

  useEffect(() => {
    if (supplierOptions.length === 0) {
      if (selectedSupplierId) {
        setSelectedSupplierId('')
      }
      return
    }

    const stillValid = supplierOptions.some((supplier) => supplier.id === selectedSupplierId)
    if (!selectedSupplierId || !stillValid) {
      setSelectedSupplierId(supplierOptions[0].id)
    }
  }, [supplierOptions, selectedSupplierId])

  const filteredAndSorted = useMemo(() => {
    if (!selectedSupplierId) return []

    let filtered = rows.filter((row) => row.supplierId === selectedSupplierId)

    if (!showZeroBalance) {
      filtered = filtered.filter((row) => row.availableNug > 0)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((row) =>
        row.itemName.toLowerCase().includes(query) ||
        row.lotNoVariety.toLowerCase().includes(query)
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
  }, [rows, selectedSupplierId, showZeroBalance, searchQuery, sortBy, sortDir])

  const groupedData = useMemo((): GroupedRow[] | null => {
    if (groupBy === 'none') return null

    const groups = new Map<string, GroupedRow>()

    filteredAndSorted.forEach((row) => {
      const key = groupBy === 'item' ? row.itemId : row.lotNoVariety
      const label = groupBy === 'item' ? row.itemName : row.lotNoVariety

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          groupName: label,
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

  const totalNug = useMemo(() => filteredAndSorted.reduce((sum, row) => sum + row.availableNug, 0), [filteredAndSorted])

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Package className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view party wise pendency</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b bg-white px-6 py-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Party Wise Pendency</h1>
          <p className="text-xs text-muted-foreground mt-1">Monitor pending stock by supplier, item, and lot up to the selected date</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Supplier</Label>
            <Select
              value={selectedSupplierId || undefined}
              onValueChange={(value) => {
                setSelectedSupplierId(value)
                setCurrentPage(1)
              }}
              disabled={supplierOptions.length === 0}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder={supplierOptions.length ? 'Select supplier' : 'No pending suppliers'} />
              </SelectTrigger>
              <SelectContent>
                {supplierOptions.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.accountName || supplier.name || 'Supplier'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
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
              className="w-36"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              const masterData = await loadMasterData()
              await loadPendencyData(masterData)
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
        <div className="max-w-[1200px] mx-auto">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Input
                  type="search"
                  placeholder="Search items or lots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />

                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Group By" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    <SelectItem value="item">By Item</SelectItem>
                    <SelectItem value="lot">By Lot No</SelectItem>
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 pb-24">
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1200px] mx-auto space-y-4">
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

                    {groupBy !== 'none' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Grouped by: {groupBy === 'item' ? 'Item' : 'Lot No'}</span>
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
                      {groupBy !== 'none' ? (
                        <>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('groupName')}>
                              <span>{groupBy === 'item' ? 'Item' : 'Lot No'}</span>
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
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('itemName')}>
                              <span>Item</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'itemName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'itemName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('lotNoVariety')}>
                              <span>Lot No</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'lotNoVariety' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'lotNoVariety' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold text-right">
                            <button type="button" className="flex items-center gap-2 cursor-pointer ml-auto" onClick={() => handleSort('availableNug')}>
                              <span>Nug Balance</span>
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
                    {supplierOptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={groupBy !== 'none' ? 3 : 4} className="text-center text-muted-foreground py-8">
                          No suppliers with pending stock
                        </TableCell>
                      </TableRow>
                    ) : !selectedSupplierId ? (
                      <TableRow>
                        <TableCell colSpan={groupBy !== 'none' ? 3 : 4} className="text-center text-muted-foreground py-8">
                          Select a supplier to view pendency
                        </TableCell>
                      </TableRow>
                    ) : paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={groupBy !== 'none' ? 3 : 4} className="text-center text-muted-foreground py-8">
                          No pending lots found for the selected supplier
                        </TableCell>
                      </TableRow>
                    ) : groupBy !== 'none' ? (
                      (paginatedData as GroupedRow[]).map((group, idx) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">{group.groupName}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{group.availableNug}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (paginatedData as PendencyRow[]).map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">{row.itemName}</TableCell>
                          <TableCell>{row.lotNoVariety}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{row.availableNug}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {dataToDisplay.length > 0 && selectedSupplierId && (
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
