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
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Printer,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  FilterX,
  Store as StoreIcon
} from 'lucide-react'

interface LedgerRow {
  id: string
  date: string
  storeId: string | null
  storeName: string
  supplierId: string
  supplierName: string
  itemId: string
  itemName: string
  lotNo: string
  type: 'Arrival' | 'Sale'
  arrivedNug: number
  soldNug: number
  balanceNug: number
  status: 'Arrival' | 'Sale'
}

interface GroupedRow {
  id: string
  groupName: string
  arrivedNug: number
  soldNug: number
  balanceNug: number
  items: LedgerRow[]
}

const formatNumber = (value: number) => Number(value || 0).toFixed(2)

const getPreviousDate = (dateStr: string) => {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

export function StoreLedgerPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedStore, setSelectedStore] = useState('all')
  const [stores, setStores] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [rows, setRows] = useState<LedgerRow[]>([])
  const [loading, setLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('all')
  const [itemFilter, setItemFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'arrival' | 'sale'>('all')
  const [groupBy, setGroupBy] = useState<'none' | 'supplier' | 'item' | 'status'>('none')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setFromDate(today)
    setToDate(today)
  }, [])

  useEffect(() => {
    if (!activeCompany) return
    loadMasterData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany])

  useEffect(() => {
    if (!activeCompany || !fromDate || !toDate) return
    loadLedger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, fromDate, toDate, selectedStore])

  const storeNameMap = useMemo(() => {
    const map = new Map<string, string>()
    stores.forEach((store) => {
      map.set(store.id, store.name ?? store.storeName ?? 'Store')
    })
    return map
  }, [stores])

  const supplierNameMap = useMemo(() => {
    const map = new Map<string, string>()
    suppliers.forEach((supplier) => {
      map.set(supplier.id, supplier.accountName ?? supplier.name ?? 'Account')
    })
    return map
  }, [suppliers])

  const mallAccount = useMemo(() => {
    const target = 'mall khata purchase a/c'
    return (
      suppliers.find(
        (supplier) => (supplier.accountName ?? supplier.name ?? '').toLowerCase() === target
      ) || null
    )
  }, [suppliers])

  const itemNameMap = useMemo(() => {
    const map = new Map<string, string>()
    items.forEach((item) => {
      map.set(item.id, item.itemName ?? item.name ?? 'Item')
    })
    return map
  }, [items])

  const matchesSelectedStore = (storeId: string | null | undefined) => {
    if (selectedStore === 'all') return true
    if (selectedStore === 'no-store') return !storeId
    return storeId === selectedStore
  }

  const loadMasterData = async () => {
    if (!activeCompany) return
    try {
      const [storeResp, accountResp, itemResp] = await Promise.all([
        window.api.store.listByCompany(activeCompany.id),
        window.api.account.listByCompany(activeCompany.id),
        window.api.item.listByCompany(activeCompany.id)
      ])

      if (Array.isArray(storeResp)) {
        setStores(storeResp)
      }

      if (accountResp.success && Array.isArray(accountResp.data)) {
        const supplierAccounts = accountResp.data.filter((acc: any) => {
          const groupName = acc.accountGroup?.name?.toLowerCase() || ''
          const accountName = acc.accountName?.toLowerCase() || ''
          return (
              groupName.includes('sundry creditor') ||
              groupName.includes('supplier') ||
              accountName === 'mall khata purchase a/c'
          )
        })
        setSuppliers(supplierAccounts)
      }

      if (itemResp.success && Array.isArray(itemResp.data)) {
        setItems(itemResp.data)
      }
    } catch (error) {
      console.error('Load master data error:', error)
    }
  }

  const loadLedger = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const storeFilterId = selectedStore !== 'all' && selectedStore !== 'no-store'
        ? selectedStore
        : undefined

      const arrivalFilters: any = {
        startDate: fromDate,
        endDate: toDate,
        ...(storeFilterId ? { storeId: storeFilterId } : {})
      }

      const saleFilters: any = {
        startDate: fromDate,
        endDate: toDate,
        ...(storeFilterId ? { storeId: storeFilterId } : {})
      }

      const prevDate = getPreviousDate(fromDate)

      const arrivalBeforeFilters: any = prevDate
        ? {
            endDate: prevDate,
            ...(storeFilterId ? { storeId: storeFilterId } : {})
          }
        : null

      const saleBeforeFilters: any = prevDate
        ? {
            endDate: prevDate,
            ...(storeFilterId ? { storeId: storeFilterId } : {})
          }
        : null

      const [arrivalResp, saleResp, arrivalBeforeResp, saleBeforeResp] = await Promise.all([
        window.api.arrival.list(activeCompany.id, arrivalFilters),
        window.api.stockSale.list(activeCompany.id, saleFilters),
        arrivalBeforeFilters
          ? window.api.arrival.list(activeCompany.id, arrivalBeforeFilters)
          : Promise.resolve({ success: true, data: [] }),
        saleBeforeFilters
          ? window.api.stockSale.list(activeCompany.id, saleBeforeFilters)
          : Promise.resolve({ success: true, data: [] })
      ])

      if (!arrivalResp.success) throw new Error(arrivalResp.error || 'Failed to load arrivals')
      if (!saleResp.success) throw new Error(saleResp.error || 'Failed to load stock sales')
      if (!arrivalBeforeResp.success) {
        const message = 'error' in arrivalBeforeResp && arrivalBeforeResp.error
          ? arrivalBeforeResp.error
          : 'Failed to load opening arrivals'
        throw new Error(message)
      }
      if (!saleBeforeResp.success) {
        const message = 'error' in saleBeforeResp && saleBeforeResp.error
          ? saleBeforeResp.error
          : 'Failed to load opening sales'
        throw new Error(message)
      }

      const arrivalData = Array.isArray(arrivalResp.data) ? arrivalResp.data : []
      const saleData = Array.isArray(saleResp.data) ? saleResp.data : []
      const arrivalBeforeData = Array.isArray(arrivalBeforeResp.data) ? arrivalBeforeResp.data : []
      const saleBeforeData = Array.isArray(saleBeforeResp.data) ? saleBeforeResp.data : []

      const openingArrived = arrivalBeforeData.reduce((sum: number, arrival: any) => {
        if (!matchesSelectedStore(arrival.storeId ?? null)) return sum
        const arrivalTotal = (arrival.items || []).reduce(
          (inner: number, item: any) => inner + Number(item.nug || 0),
          0
        )
        return sum + arrivalTotal
      }, 0)

      const openingSold = saleBeforeData.reduce((sum: number, sale: any) => {
        const saleItems = sale.items || []
        const saleTotal = saleItems.reduce((inner: number, item: any) => {
          if (!matchesSelectedStore(item.storeId ?? null)) return inner
          return inner + Number(item.nug || 0)
        }, 0)
        return sum + saleTotal
      }, 0)

      const arrivalRows: LedgerRow[] = arrivalData.flatMap((arrival: any) => {
        if (!matchesSelectedStore(arrival.storeId ?? null)) return []
        const purchaseType = (arrival.arrivalType?.purchaseType || '').toLowerCase()
        const isSelfPurchase = purchaseType === 'selfpurchase'
        const derivedSupplierId = isSelfPurchase && mallAccount?.id ? mallAccount.id : arrival.partyId
        const derivedSupplierName = isSelfPurchase
          ? mallAccount?.accountName || 'Mall Khata Purchase A/c'
          : supplierNameMap.get(arrival.partyId) || arrival.partyName || 'Unknown Supplier'
        const storeName = arrival.storeId
          ? storeNameMap.get(arrival.storeId) || arrival.storeName || 'Store'
          : 'No Store Assigned'
        return (arrival.items || []).map((item: any) => ({
          id: `arrival-${arrival.id}-${item.id}`,
          date: arrival.date || '',
          storeId: arrival.storeId || null,
          storeName,
          supplierId: derivedSupplierId,
          supplierName: derivedSupplierName,
          itemId: item.itemId,
          itemName: itemNameMap.get(item.itemId) || item.itemName || 'Unknown Item',
          lotNo: item.lotNoVariety || 'N/A',
          type: 'Arrival',
          arrivedNug: Number(item.nug || 0),
          soldNug: 0,
          balanceNug: 0,
          status: 'Arrival'
        }))
      })

      const saleRows: LedgerRow[] = saleData.flatMap((sale: any) => {
        const saleItems = sale.items || []
        return saleItems
          .filter((item: any) => matchesSelectedStore(item.storeId ?? null))
          .map((item: any) => ({
            id: `sale-${sale.id}-${item.id}`,
            date: sale.date || sale.saleDate || '',
            storeId: item.storeId || null,
            storeName: item.storeId
              ? storeNameMap.get(item.storeId) || item.storeName || 'Store'
              : 'No Store Assigned',
            supplierId: item.supplierId,
            supplierName: supplierNameMap.get(item.supplierId) || item.supplierName || 'Unknown Supplier',
            itemId: item.itemId,
            itemName: itemNameMap.get(item.itemId) || item.itemName || 'Unknown Item',
            lotNo: item.lotNoVariety || 'N/A',
            type: 'Sale',
            arrivedNug: 0,
            soldNug: Number(item.nug || 0),
            balanceNug: 0,
            status: 'Sale'
          }))
      })

      const merged = [...arrivalRows, ...saleRows]
      merged.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        if (a.type === b.type) return a.itemName.localeCompare(b.itemName)
        return a.type === 'Arrival' ? -1 : 1
      })

      let running = openingArrived - openingSold
      const computed = merged.map((row) => {
        running += row.arrivedNug - row.soldNug
        return { ...row, balanceNug: running }
      })

      setRows(computed)
      setCurrentPage(1)
    } catch (error) {
      console.error('Load store ledger error:', error)
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

  const hasActiveSort = !!sortBy
  const hasFilters =
    searchQuery !== '' ||
    supplierFilter !== 'all' ||
    itemFilter !== 'all' ||
    statusFilter !== 'all' ||
    groupBy !== 'none'

  const handleClearAll = () => {
    setSearchQuery('')
    setSupplierFilter('all')
    setItemFilter('all')
    setStatusFilter('all')
    setGroupBy('none')
    setSortBy(null)
    setSortDir('asc')
    setCurrentPage(1)
  }

  const filteredAndSorted = useMemo(() => {
    let filtered = rows

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((row) =>
        row.itemName.toLowerCase().includes(query) ||
        row.supplierName.toLowerCase().includes(query) ||
        row.lotNo.toLowerCase().includes(query)
      )
    }

    if (supplierFilter !== 'all') {
      filtered = filtered.filter((row) => row.supplierId === supplierFilter)
    }

    if (itemFilter !== 'all') {
      filtered = filtered.filter((row) => row.itemId === itemFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((row) =>
        statusFilter === 'arrival' ? row.type === 'Arrival' : row.type === 'Sale'
      )
    }

    if (sortBy) {
      const copy = [...filtered]
      const multiplier = sortDir === 'asc' ? 1 : -1
      copy.sort((a, b) => {
        const aValue = (a as any)[sortBy]
        const bValue = (b as any)[sortBy]
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * multiplier
        }
        return String(aValue || '').localeCompare(String(bValue || '')) * multiplier
      })
      return copy
    }

    return filtered
  }, [rows, searchQuery, supplierFilter, itemFilter, statusFilter, sortBy, sortDir])

  const groupedData = useMemo((): GroupedRow[] | null => {
    if (groupBy === 'none') return null

    const groups = new Map<string, GroupedRow>()

    filteredAndSorted.forEach((row) => {
      let key = row.supplierId
      let label = row.supplierName

      if (groupBy === 'item') {
        key = row.itemId
        label = row.itemName
      } else if (groupBy === 'status') {
        key = row.type
        label = row.type === 'Arrival' ? 'Arrivals' : 'Sales'
      }

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          groupName: label,
          arrivedNug: 0,
          soldNug: 0,
          balanceNug: 0,
          items: []
        })
      }

      const group = groups.get(key)!
      group.arrivedNug += row.arrivedNug
      group.soldNug += row.soldNug
      group.balanceNug = group.arrivedNug - group.soldNug
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

  const totalArrived = filteredAndSorted.reduce((sum, row) => sum + row.arrivedNug, 0)
  const totalSold = filteredAndSorted.reduce((sum, row) => sum + row.soldNug, 0)
  const totalBalance = totalArrived - totalSold

  const selectedStoreName = useMemo(() => {
    if (selectedStore === 'all') return 'All Stores'
    if (selectedStore === 'no-store') return 'No Store Assigned'
    return storeNameMap.get(selectedStore) || 'Selected Store'
  }, [selectedStore, storeNameMap])

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <StoreIcon className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view the store ledger</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex flex-wrap items-center justify-between border-b bg-white px-6 py-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Store Ledger</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Ledger for {selectedStoreName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedStore} onValueChange={(value) => { setSelectedStore(value); setCurrentPage(1) }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>{store.name ?? store.storeName}</SelectItem>
              ))}
              <SelectItem value="no-store">No Store Assigned</SelectItem>
            </SelectContent>
          </Select>

          <Label className="text-sm font-medium">From</Label>
          <Input
            type="date"
            value={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const value = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (value > today) return
              setFromDate(value)
            }}
            className="w-36"
          />
          <Label className="text-sm font-medium">To</Label>
          <Input
            type="date"
            value={toDate}
            min={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const value = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (value > today) return
              setToDate(value)
            }}
            className="w-36"
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={loadLedger}
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

      <div className="py-4 px-6">
        <div className="max-w-[1400px] mx-auto">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Input
                  type="search"
                  placeholder="Search item, lot, or supplier..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="max-w-xs"
                />

                <Select value={supplierFilter} onValueChange={(value) => { setSupplierFilter(value); setCurrentPage(1) }}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.accountName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={itemFilter} onValueChange={(value) => { setItemFilter(value); setCurrentPage(1) }}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Item" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.itemName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(value: 'all' | 'arrival' | 'sale') => { setStatusFilter(value); setCurrentPage(1) }}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="arrival">Arrivals</SelectItem>
                    <SelectItem value="sale">Sales</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={groupBy} onValueChange={(value: 'none' | 'supplier' | 'item' | 'status') => { setGroupBy(value); setCurrentPage(1) }}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Group By" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    <SelectItem value="supplier">By Supplier</SelectItem>
                    <SelectItem value="item">By Item</SelectItem>
                    <SelectItem value="status">By Status</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex-1" />

                {(hasActiveSort || hasFilters) && (
                  <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 text-xs">
                    <FilterX className="h-3 w-3 mr-1" />
                    Clear {hasActiveSort && hasFilters ? 'All' : hasActiveSort ? 'Sort' : 'Filters'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        Search: "{searchQuery}"
                      </div>
                    )}

                    {supplierFilter !== 'all' && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        Supplier Filter
                      </div>
                    )}

                    {itemFilter !== 'all' && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        Item Filter
                      </div>
                    )}

                    {statusFilter !== 'all' && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        Status Filter
                      </div>
                    )}

                    {groupBy !== 'none' && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        Grouped by: {groupBy}
                      </div>
                    )}
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100">
                      <TableHead className="w-12 text-center font-bold">S.N</TableHead>
                      {groupBy !== 'none' ? (
                        <>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2" onClick={() => handleSort('groupName')}>
                              <span>Group</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'groupName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'groupName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="text-right font-bold">Arrived</TableHead>
                          <TableHead className="text-right font-bold">Sold</TableHead>
                          <TableHead className="text-right font-bold">Balance</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2" onClick={() => handleSort('date')}>
                              <span>Date</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'date' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'date' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2" onClick={() => handleSort('itemName')}>
                              <span>Item</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'itemName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'itemName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">Lot No</TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2" onClick={() => handleSort('supplierName')}>
                              <span>Supplier</span>
                              <span className="flex flex-col ml-1">
                                <ChevronUp className={sortBy === 'supplierName' && sortDir === 'asc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                                <ChevronDown className={sortBy === 'supplierName' && sortDir === 'desc' ? 'h-3 w-3 text-primary' : 'h-3 w-3 text-muted-foreground'} />
                              </span>
                            </button>
                          </TableHead>
                          <TableHead className="text-right font-bold">Arrived</TableHead>
                          <TableHead className="text-right font-bold">Sold</TableHead>
                          <TableHead className="text-right font-bold">Balance</TableHead>
                          <TableHead className="text-center font-bold">Status</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={groupBy === 'none' ? 9 : 5} className="text-center text-muted-foreground py-8">
                          {rows.length === 0 ? 'No transactions found for the selected period' : 'No rows match the filters'}
                        </TableCell>
                      </TableRow>
                    ) : groupBy !== 'none' ? (
                      (paginatedData as GroupedRow[]).map((group, idx) => (
                        <TableRow key={group.id}>
                          <TableCell className="text-center">{startIndex + idx + 1}</TableCell>
                          <TableCell className="font-medium">{group.groupName}</TableCell>
                          <TableCell className="text-right text-emerald-700 font-semibold">{formatNumber(group.arrivedNug)}</TableCell>
                          <TableCell className="text-right text-rose-700 font-semibold">{formatNumber(group.soldNug)}</TableCell>
                          <TableCell className="text-right font-bold">{formatNumber(group.balanceNug)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      (paginatedData as LedgerRow[]).map((row, idx) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-center">{startIndex + idx + 1}</TableCell>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.itemName}</TableCell>
                          <TableCell>{row.lotNo}</TableCell>
                          <TableCell>{row.supplierName}</TableCell>
                          <TableCell className="text-right text-emerald-700 font-semibold">{formatNumber(row.arrivedNug)}</TableCell>
                          <TableCell className="text-right text-rose-700 font-semibold">{formatNumber(row.soldNug)}</TableCell>
                          <TableCell className="text-right font-bold">{formatNumber(row.balanceNug)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={row.type === 'Arrival' ? 'secondary' : 'destructive'}>
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>

              {dataToDisplay.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="flex items-center">
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value))
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
        <div className="flex gap-8 px-6 py-3">
          <div>
            <div className="text-sm text-muted-foreground">Arrived Nug</div>
            <div className="text-xl font-bold text-emerald-700">{formatNumber(totalArrived)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Sold Nug</div>
            <div className="text-xl font-bold text-rose-700">{formatNumber(totalSold)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Balance Nug</div>
            <div className="text-xl font-bold">{formatNumber(totalBalance)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
