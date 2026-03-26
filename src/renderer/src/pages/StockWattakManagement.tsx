import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { startTabTransaction, endTabTransaction } from '@/store/slices/tabSlice'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  RefreshCw,
  Printer,
  FilterX,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'

const FROM_DATE_KEY = 'stockWattakManagement.fromDate'
const TO_DATE_KEY = 'stockWattakManagement.toDate'
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

type SortableColumn = 'date' | 'voucher' | 'party' | 'vehicle' | 'nug' | 'amount'

type PartyOption = { id: string; name: string }

interface StockWattakItem {
  id: string
  itemName?: string
  lotNo?: string | null
  nug: number
  wt: number
  rate: number
  per: string
  basicAmount: number
  issuedNug: number
  balanceNug: number
}

interface StockWattakCharge {
  id: string
  chargesHeadName?: string
  plusMinus: '+' | '-'
  amount: number
}

interface StockWattak {
  id: string
  partyName?: string
  partyId: string
  vchNo: string
  createdAt?: string
  vehicleNo?: string | null
  challanNo?: string | null
  totalNug: number
  totalWt: number
  basicAmount: number
  totalCharges: number
  roundOff: number
  totalAmount: number
  items?: StockWattakItem[]
  chargeLines?: StockWattakCharge[]
}

interface StockWattakTotals {
  totalWattaks: number
  totalNug: number
  totalWt: number
  totalBasicAmount: number
  totalCharges: number
  totalRoundOff: number
  totalAmount: number
}

const formatNumber = (value: number, fractionDigits = 2) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })

const formatDate = (value?: string) => {
  if (!value) return '—'
  return value.includes('T') ? value.split('T')[0] : value
}

const EMPTY_TOTALS: StockWattakTotals = {
  totalWattaks: 0,
  totalNug: 0,
  totalWt: 0,
  totalBasicAmount: 0,
  totalCharges: 0,
  totalRoundOff: 0,
  totalAmount: 0
}

interface StockWattakManagementProps {
  tabId: string
}

export function StockWattakManagement({ tabId }: StockWattakManagementProps) {
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  const navigate = useNavigate()

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [wattaks, setWattaks] = useState<StockWattak[]>([])
  const [totals, setTotals] = useState<StockWattakTotals>(EMPTY_TOTALS)
  const [loading, setLoading] = useState(false)
  const [parties, setParties] = useState<PartyOption[]>([])
  const [partyFilter, setPartyFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortableColumn>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [selectedWattakId, setSelectedWattakId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StockWattak | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    let initialFrom = today
    let initialTo = today

    try {
      const storedFrom = sessionStorage.getItem(FROM_DATE_KEY)
      const storedTo = sessionStorage.getItem(TO_DATE_KEY)
      if (storedFrom) initialFrom = storedFrom
      if (storedTo) initialTo = storedTo
    } catch (error) {
      console.error('Failed to read stock wattak dates from storage', error)
    }

    setFromDate(initialFrom)
    setToDate(initialTo)

    try {
      sessionStorage.setItem(FROM_DATE_KEY, initialFrom)
      sessionStorage.setItem(TO_DATE_KEY, initialTo)
    } catch (error) {
      console.error('Failed to persist stock wattak dates', error)
    }
  }, [])

  useEffect(() => {
    if (!activeCompany) return
    const loadParties = async () => {
      try {
        const response = await window.api.account.listByCompany(activeCompany.id)
        if (response.success && response.data) {
          const filtered = response.data.filter((account: any) => {
            const name = account.accountGroup?.name?.toLowerCase() || ''
            return (
              name.includes('supplier') ||
              name.includes('seller') ||
              name.includes('creditor') ||
              name.includes('party')
            )
          })
          setParties(
            filtered.map((account: any) => ({
              id: account.id,
              name: account.accountName
            }))
          )
        }
      } catch (error) {
        console.error('Failed to load parties for stock wattak', error)
      }
    }
    loadParties()
  }, [activeCompany])

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => window.clearTimeout(handler)
  }, [searchQuery])

  const loadWattaks = useCallback(async () => {
    if (!activeCompany || !fromDate || !toDate) return
    setLoading(true)
    try {
      const response = await window.api.stockWattak.list(activeCompany.id, {
        startDate: fromDate,
        endDate: toDate,
        partyId: partyFilter !== 'all' ? partyFilter : undefined,
        search: debouncedSearch || undefined
      })

      if (response.success && response.data) {
        const { wattaks: rows, totals: aggregate } = response.data
        setWattaks(rows || [])
        setTotals(aggregate || EMPTY_TOTALS)
        if (rows?.length) {
          const stillExists = rows.some((entry: StockWattak) => entry.id === selectedWattakId)
          if (!stillExists) {
            setSelectedWattakId(null)
          }
        } else {
          setSelectedWattakId(null)
        }
      } else {
        setWattaks([])
        setTotals(EMPTY_TOTALS)
        if (response.error) {
          toast.error(response.error)
        }
      }
    } catch (error: any) {
      console.error('Failed to load stock wattaks', error)
      toast.error(error?.message || 'Unable to load stock wattaks')
      setWattaks([])
      setTotals(EMPTY_TOTALS)
    } finally {
      setLoading(false)
    }
  }, [activeCompany, debouncedSearch, fromDate, partyFilter, selectedWattakId, toDate])

  useEffect(() => {
    if (!activeCompany || !fromDate || !toDate) return
    loadWattaks()
  }, [activeCompany, fromDate, toDate, debouncedSearch, partyFilter, loadWattaks])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, partyFilter])

  const sortedWattaks = useMemo(() => {
    const data = [...wattaks]
    const direction = sortDirection === 'asc' ? 1 : -1

    data.sort((a, b) => {
      let result = 0
      switch (sortColumn) {
        case 'date':
          result = (a.createdAt || '').localeCompare(b.createdAt || '')
          break
        case 'voucher':
          result = (a.vchNo || '').localeCompare(b.vchNo || '')
          break
        case 'party':
          result = (a.partyName || '').localeCompare(b.partyName || '')
          break
        case 'vehicle':
          result = (a.vehicleNo || '').localeCompare(b.vehicleNo || '')
          break
        case 'nug':
          result = (a.totalNug || 0) - (b.totalNug || 0)
          break
        case 'amount':
          result = (a.totalAmount || 0) - (b.totalAmount || 0)
          break
        default:
          result = 0
      }
      return result * direction
    })

    return data
  }, [wattaks, sortColumn, sortDirection])

  const totalPages = useMemo(() => {
    if (sortedWattaks.length === 0) return 1
    return Math.max(1, Math.ceil(sortedWattaks.length / itemsPerPage))
  }, [sortedWattaks.length, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedWattaks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return sortedWattaks.slice(start, end)
  }, [sortedWattaks, currentPage, itemsPerPage])

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection(column === 'date' ? 'desc' : 'asc')
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const handleFromDateChange = (value: string) => {
    if (value > today) {
      toast.error('From date cannot be in the future')
      return
    }
    if (toDate && value > toDate) {
      toast.error('From date cannot be after To date')
      return
    }
    setFromDate(value)
    try {
      sessionStorage.setItem(FROM_DATE_KEY, value)
    } catch (error) {
      console.error('Failed to persist stock wattak from date', error)
    }
  }

  const handleToDateChange = (value: string) => {
    if (value > today) {
      toast.error('To date cannot be in the future')
      return
    }
    if (fromDate && value < fromDate) {
      toast.error('To date cannot be before From date')
      return
    }
    setToDate(value)
    try {
      sessionStorage.setItem(TO_DATE_KEY, value)
    } catch (error) {
      console.error('Failed to persist stock wattak to date', error)
    }
  }

  const handleClearFilters = () => {
    setPartyFilter('all')
    setSearchQuery('')
    setDebouncedSearch('')
  }

  const handleRefresh = () => {
    loadWattaks()
  }

  const handlePrint = () => {
    toast.info('Stock Wattak print preview will be available soon')
  }

  const handleCreate = useCallback(() => {
    setSelectedWattakId(null)
    navigate('/entries/stock-wattak/new')
  }, [navigate])

  const handleEdit = useCallback(
    (wattak: StockWattak) => {
      navigate(`/entries/stock-wattak/edit/${wattak.id}`)
    },
    [navigate]
  )

  const handleDelete = useCallback((wattak: StockWattak) => {
    setDeleteTarget(wattak)
    setConfirmDeleteOpen(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      dispatch(startTabTransaction({ tabId, transactionType: 'stockWattak' }))
      const response = await window.api.stockWattak.delete(deleteTarget.id)
      if (response.success) {
        toast.success('Stock Wattak deleted successfully')
        if (selectedWattakId === deleteTarget.id) {
          setSelectedWattakId(null)
        }
        await loadWattaks()
        dispatch(endTabTransaction({ tabId, saved: true }))
      } else {
        dispatch(endTabTransaction({ tabId, saved: false }))
        toast.error(response.error || 'Failed to delete Stock Wattak')
      }
    } catch (error: any) {
      dispatch(endTabTransaction({ tabId, saved: false }))
      console.error('Failed to delete stock wattak', error)
      toast.error(error?.message || 'Unable to delete Stock Wattak')
    } finally {
      setConfirmDeleteOpen(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, dispatch, loadWattaks, selectedWattakId, tabId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault()
        handleCreate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCreate])

  const hasActiveFilters = debouncedSearch !== '' || partyFilter !== 'all'

  const selectedWattak = useMemo(
    () => wattaks.find((entry) => entry.id === selectedWattakId) || null,
    [wattaks, selectedWattakId]
  )

  const startIndex = sortedWattaks.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endIndex =
    sortedWattaks.length === 0 ? 0 : Math.min(startIndex + itemsPerPage - 1, sortedWattaks.length)

  if (!activeCompany) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to manage Stock Wattaks.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-muted/20">
      <div className="border-b border-border bg-white px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Stock Wattak Management</h1>
            <p className="text-sm text-muted-foreground">
              Stock wattak management 
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-sm font-medium">From Date</Label>
            <Input
              type="date"
              value={fromDate}
              max={today}
              onChange={(event) => handleFromDateChange(event.target.value)}
              className="w-40"
            />
            <Label className="text-sm font-medium">To Date</Label>
            <Input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              max={today}
              onChange={(event) => handleToDateChange(event.target.value)}
              className="w-40"
            />
            <Button onClick={handleCreate} disabled={loading} size="lg" variant="cta">
              <Plus className="h-4 w-4" />
              <span className="flex flex-col items-center text-sm">
                New
                <span className="text-[10px] text-muted-foreground">(Ctrl+N)</span>
              </span>
            </Button>
            <Button variant="outline-blue" onClick={handlePrint} title="Print">
              <Printer className="mr-2 h-4 w-4 text-blue-600" />
              Print
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search vouchers, parties, or vehicle/challan no."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-64 pl-10"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Party</Label>
                  <Select value={partyFilter} onValueChange={setPartyFilter}>
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="All Parties" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="all">All Parties</SelectItem>
                      {parties.map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 p-2">
                  <span className="text-sm text-muted-foreground">Active:</span>
                  {debouncedSearch && (
                    <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm text-secondary-foreground">
                      <span>Search: "{debouncedSearch}"</span>
                    </div>
                  )}
                  {partyFilter !== 'all' && (
                    <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm text-secondary-foreground">
                      <span>Party filter applied</span>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 text-xs">
                    <FilterX className="mr-1 h-3 w-3" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[110px]">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('date')}>
                          Date
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[110px]">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('voucher')}>
                          Voucher
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[180px]">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('party')}>
                          Party
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[140px]">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('vehicle')}>
                          Vehicle No.
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="min-w-[140px]">Challan No.</TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('nug')}>
                          Total Nug
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('amount')}>
                          Total Amount
                          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          Loading Stock Wattaks…
                        </TableCell>
                      </TableRow>
                    ) : paginatedWattaks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          No Stock Wattaks found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedWattaks.map((wattak) => (
                        <TableRow
                          key={wattak.id}
                          onClick={() => setSelectedWattakId(wattak.id)}
                          className={selectedWattakId === wattak.id ? 'cursor-pointer bg-indigo-50/70' : 'cursor-pointer'}
                        >
                          <TableCell>{formatDate(wattak.createdAt)}</TableCell>
                          <TableCell>{wattak.vchNo || '—'}</TableCell>
                          <TableCell>{wattak.partyName || '—'}</TableCell>
                          <TableCell>{wattak.vehicleNo || <span className="text-xs text-muted-foreground">Not set</span>}</TableCell>
                          <TableCell>{wattak.challanNo || <span className="text-xs text-muted-foreground">Not set</span>}</TableCell>
                          <TableCell className="text-right">{formatNumber(wattak.totalNug, 0)}</TableCell>
                          <TableCell className="text-right">₹{formatNumber(wattak.totalAmount)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleEdit(wattak)
                                }}
                                title="Edit Stock Wattak"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleDelete(wattak)
                                }}
                                title="Delete Stock Wattak"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-muted-foreground">
                  Showing {startIndex}-{endIndex} of {sortedWattaks.length} record(s)
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Rows per page</span>
                    <Select
                      value={String(itemsPerPage)}
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="w-16 text-center text-sm">
                      Page {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedWattak && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Wattak Details</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(selectedWattak)}>
                        <Edit2 className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedWattak)}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedWattakId(null)}>
                        Close
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Voucher No.</p>
                      <p className="font-medium">{selectedWattak.vchNo}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Date</p>
                      <p className="font-medium">{formatDate(selectedWattak.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Party</p>
                      <p className="font-medium">{selectedWattak.partyName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Vehicle / Challan</p>
                      <p className="font-medium">{selectedWattak.vehicleNo || selectedWattak.challanNo || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Total Nug</p>
                      <p className="font-mono">{formatNumber(selectedWattak.totalNug, 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Total Kg</p>
                      <p className="font-mono">{formatNumber(selectedWattak.totalWt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Basic Amount</p>
                      <p className="font-mono">₹{formatNumber(selectedWattak.basicAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Charges</p>
                      <p className="font-mono">₹{formatNumber(selectedWattak.totalCharges)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Round Off</p>
                      <p className="font-mono">₹{formatNumber(selectedWattak.roundOff)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Total Amount</p>
                      <p className="text-lg font-bold text-emerald-600">₹{formatNumber(selectedWattak.totalAmount)}</p>
                    </div>
                  </div>

                  {selectedWattak.items && selectedWattak.items.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs uppercase text-muted-foreground">Items</p>
                      <div className="space-y-2">
                        {selectedWattak.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                            <div>
                              <p className="font-medium">{item.itemName || 'Item'}</p>
                              <p className="text-xs text-muted-foreground">
                                Lot {item.lotNo || '—'} | {formatNumber(item.nug, 0)} nug | {formatNumber(item.wt)} kg
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Issued {formatNumber(item.issuedNug, 0)} | Balance {formatNumber(item.balanceNug, 0)}
                              </p>
                            </div>
                            <div className="text-right font-mono">
                              <p>₹{formatNumber(item.basicAmount)}</p>
                              <p className="text-xs text-muted-foreground">
                                @ ₹{formatNumber(item.rate)}/{item.per}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedWattak.chargeLines && selectedWattak.chargeLines.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs uppercase text-muted-foreground">Charges</p>
                      <div className="space-y-1 text-sm">
                        {selectedWattak.chargeLines.map((charge) => (
                          <div key={charge.id} className="flex items-center justify-between">
                            <span>{charge.chargesHeadName || 'Charge'}</span>
                            <span className={charge.plusMinus === '-' ? 'text-red-600' : 'text-emerald-600'}>
                              {charge.plusMinus}₹{formatNumber(charge.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">Summary</h3>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Wattaks:</span>
                    <span className="text-lg font-semibold">{totals.totalWattaks}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Nug:</span>
                    <span className="text-lg font-semibold">{formatNumber(totals.totalNug, 0)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Kg:</span>
                    <span className="text-lg font-semibold">{formatNumber(totals.totalWt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Basic Amount:</span>
                    <span className="text-lg font-semibold">₹{formatNumber(totals.totalBasicAmount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Charges:</span>
                    <span className="text-lg font-semibold">₹{formatNumber(totals.totalCharges)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Round Off:</span>
                    <span className="text-lg font-semibold">₹{formatNumber(totals.totalRoundOff)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="text-xl font-bold text-emerald-600">₹{formatNumber(totals.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open)
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stock Wattak?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Wattak voucher {deleteTarget?.vchNo || ''} will be removed permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
