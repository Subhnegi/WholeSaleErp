import { useEffect, useMemo, useState } from 'react'
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
import { ReportPreviewModal } from '@/components/ReportPreviewModal'
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Printer,
  RefreshCw,
  Search
} from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReportRow {
  id: string
  source: SaleType
  sourceLabel: string
  referenceId: string
  date: string
  voucherNo: string
  customerId: string | null
  customerName: string
  itemId: string | null
  itemName: string
  nug: number
  kg: number
  rate: number
  per: string
  basicAmount: number
  expenses: number
  amount: number
  supplierName?: string | null
  storeName?: string | null
}

interface ReportTotals {
  totalRows: number
  totalNug: number
  totalKg: number
  totalBasic: number
  totalExpenses: number
  totalAmount: number
}

type SaleType = 'quickSale' | 'dailySale' | 'stockSale'

type SortableColumn =
  | 'date'
  | 'voucherNo'
  | 'source'
  | 'customerName'
  | 'itemName'
  | 'nug'
  | 'kg'
  | 'rate'
  | 'basicAmount'
  | 'expenses'
  | 'amount'

type GroupByOption = 'none' | 'date' | 'customer' | 'item' | 'saleType'

interface GroupedRow {
  id: string
  label: string
  count: number
  totalNug: number
  totalKg: number
  totalBasic: number
  totalExpenses: number
  totalAmount: number
}

const SESSION_FROM_KEY = 'saleSummaryReport.fromDate'
const SESSION_TO_KEY = 'saleSummaryReport.toDate'

const SALE_TYPE_LABEL: Record<SaleType, string> = {
  quickSale: 'Quick Sale',
  dailySale: 'Daily Sale',
  stockSale: 'Stock Sale'
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

const formatNumber = (value: number, fractionDigits = 2) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })

const normalizeDate = (value: string) => {
  if (!value) return ''
  if (value.includes('T')) {
    return value.split('T')[0] ?? ''
  }
  return value
}

export function SaleSummaryCustomerBillsPage() {
  const { activeCompany } = useAppSelector((state) => state.company)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<ReportRow[]>([])
  const [baseTotals, setBaseTotals] = useState<ReportTotals>({
    totalRows: 0,
    totalNug: 0,
    totalKg: 0,
    totalBasic: 0,
    totalExpenses: 0,
    totalAmount: 0
  })
  const [loading, setLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [customerFilter, setCustomerFilter] = useState<string>('all')
  const [itemFilter, setItemFilter] = useState<string>('all')
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<GroupByOption>('none')
  const [sortColumn, setSortColumn] = useState<SortableColumn>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const [customers, setCustomers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    let initialFrom = today
    let initialTo = today

    try {
      const storedFrom = sessionStorage.getItem(SESSION_FROM_KEY)
      const storedTo = sessionStorage.getItem(SESSION_TO_KEY)
      if (storedFrom) {
        initialFrom = storedFrom
      }
      if (storedTo) {
        initialTo = storedTo
      }
    } catch (error) {
      console.error('Failed to read sale summary dates from session storage', error)
    }

    setFromDate(initialFrom)
    setToDate(initialTo)

    try {
      sessionStorage.setItem(SESSION_FROM_KEY, initialFrom)
      sessionStorage.setItem(SESSION_TO_KEY, initialTo)
    } catch (error) {
      console.error('Failed to persist sale summary dates into session storage', error)
    }
  }, [])

  useEffect(() => {
    if (!activeCompany) return
    loadMasterData()
  }, [activeCompany])

  useEffect(() => {
    if (!activeCompany || !fromDate || !toDate) return
    loadReportData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, fromDate, toDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, customerFilter, itemFilter, saleTypeFilter, groupBy])

  const loadMasterData = async () => {
    if (!activeCompany) return

    try {
      const accountsResp = await window.api.account.listByCompany(activeCompany.id)
      if (accountsResp.success && accountsResp.data) {
        const allAccounts = accountsResp.data
        const customerAccounts = allAccounts.filter((account: any) => {
          const groupName = account.accountGroup?.name?.toLowerCase() || ''
          return (
            groupName.includes('customer') ||
            groupName.includes('debtor') ||
            groupName.includes('buyer')
          )
        })
        setCustomers(customerAccounts)
      }

      const itemsResp = await window.api.item.listByCompany(activeCompany.id)
      if (itemsResp.success && itemsResp.data) {
        setItems(itemsResp.data)
      }
    } catch (error) {
      console.error('Failed to load master data for sale summary report', error)
    }
  }

  const loadReportData = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const response = await window.api.reports.saleSummaryCustomerBills(activeCompany.id, {
        startDate: fromDate,
        endDate: toDate
      })

      if (response.success && response.data) {
        const normalizedRows = response.data.rows.map((row) => ({
          ...row,
          date: normalizeDate(row.date),
          nug: Number(row.nug) || 0,
          kg: Number(row.kg) || 0,
          rate: Number(row.rate) || 0,
          basicAmount: Number(row.basicAmount) || 0,
          expenses: Number(row.expenses) || 0,
          amount: Number(row.amount) || 0
        })) as ReportRow[]

        setRows(normalizedRows)
        setBaseTotals({
          totalRows: response.data.totals.totalRows,
          totalNug: response.data.totals.totalNug,
          totalKg: response.data.totals.totalKg,
          totalBasic: response.data.totals.totalBasicAmount,
          totalExpenses: response.data.totals.totalExpenses,
          totalAmount: response.data.totals.totalAmount
        })
        setCurrentPage(1)
      } else {
        setRows([])
        setBaseTotals({
          totalRows: 0,
          totalNug: 0,
          totalKg: 0,
          totalBasic: 0,
          totalExpenses: 0,
          totalAmount: 0
        })
        if (response.error) {
          toast.error(response.error)
        }
      }
    } catch (error: any) {
      console.error('Failed to load sale summary customer bills report', error)
      toast.error(error?.message || 'Failed to load sale summary report')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const handleFromDateChange = (value: string) => {
    const today = new Date().toISOString().split('T')[0]
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
      sessionStorage.setItem(SESSION_FROM_KEY, value)
    } catch (error) {
      console.error('Failed to persist sale summary from date', error)
    }
  }

  const handleToDateChange = (value: string) => {
    const today = new Date().toISOString().split('T')[0]
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
      sessionStorage.setItem(SESSION_TO_KEY, value)
    } catch (error) {
      console.error('Failed to persist sale summary to date', error)
    }
  }

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection(column === 'date' ? 'desc' : 'asc')
    }
  }

  

  const filteredRows = useMemo(() => {
    let data = [...rows]

    if (customerFilter !== 'all') {
      data = data.filter((row) => row.customerId === customerFilter)
    }

    if (itemFilter !== 'all') {
      data = data.filter((row) => row.itemId === itemFilter)
    }

    if (saleTypeFilter !== 'all') {
      data = data.filter((row) => row.source === saleTypeFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      data = data.filter((row) => {
        return (
          row.voucherNo.toLowerCase().includes(query) ||
          row.customerName.toLowerCase().includes(query) ||
          row.itemName.toLowerCase().includes(query) ||
          row.sourceLabel.toLowerCase().includes(query) ||
          (row.supplierName || '').toLowerCase().includes(query) ||
          (row.storeName || '').toLowerCase().includes(query)
        )
      })
    }

    return data
  }, [rows, customerFilter, itemFilter, saleTypeFilter, searchQuery])

  const sortedRows = useMemo(() => {
    const data = [...filteredRows]
    const direction = sortDirection === 'asc' ? 1 : -1

    data.sort((a, b) => {
      let result = 0
      switch (sortColumn) {
        case 'date':
          result = a.date.localeCompare(b.date)
          break
        case 'voucherNo':
          result = (a.voucherNo || '').localeCompare(b.voucherNo || '')
          break
        case 'source':
          result = a.sourceLabel.localeCompare(b.sourceLabel)
          break
        case 'customerName':
          result = a.customerName.localeCompare(b.customerName)
          break
        case 'itemName':
          result = a.itemName.localeCompare(b.itemName)
          break
        case 'nug':
          result = a.nug - b.nug
          break
        case 'kg':
          result = a.kg - b.kg
          break
        case 'rate':
          result = a.rate - b.rate
          break
        case 'basicAmount':
          result = a.basicAmount - b.basicAmount
          break
        case 'expenses':
          result = a.expenses - b.expenses
          break
        case 'amount':
          result = a.amount - b.amount
          break
        default:
          result = 0
      }
      return result * direction
    })

    return data
  }, [filteredRows, sortColumn, sortDirection])

  const groupedData = useMemo(() => {
    if (groupBy === 'none') return null
    const groups = new Map<string, GroupedRow>()

    sortedRows.forEach((row) => {
      let key = 'group'
      let label = ''

      if (groupBy === 'date') {
        key = row.date || 'unknown-date'
        label = row.date || 'Unknown Date'
      } else if (groupBy === 'customer') {
        key = row.customerId || 'unknown-customer'
        label = row.customerName || 'Unknown Customer'
      } else if (groupBy === 'item') {
        key = row.itemId || 'unknown-item'
        label = row.itemName || 'Unknown Item'
      } else if (groupBy === 'saleType') {
        key = row.source
        label = SALE_TYPE_LABEL[row.source]
      }

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          label,
          count: 0,
          totalNug: 0,
          totalKg: 0,
          totalBasic: 0,
          totalExpenses: 0,
          totalAmount: 0
        })
      }

      const group = groups.get(key)!
      group.count += 1
      group.totalNug += row.nug
      group.totalKg += row.kg
      group.totalBasic += row.basicAmount
      group.totalExpenses += row.expenses
      group.totalAmount += row.amount
    })

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [sortedRows, groupBy])

  const dataToDisplay = groupBy === 'none' ? sortedRows : groupedData || []

  const filteredTotals = useMemo(() => {
    if (groupBy === 'none') {
      return sortedRows.reduce(
        (
          acc,
          row
        ) => ({
          totalRows: acc.totalRows + 1,
          totalNug: acc.totalNug + row.nug,
          totalKg: acc.totalKg + row.kg,
          totalBasic: acc.totalBasic + row.basicAmount,
          totalExpenses: acc.totalExpenses + row.expenses,
          totalAmount: acc.totalAmount + row.amount
        }),
        {
          totalRows: 0,
          totalNug: 0,
          totalKg: 0,
          totalBasic: 0,
          totalExpenses: 0,
          totalAmount: 0
        }
      )
    }

    const grouped = groupedData || []
    return grouped.reduce(
      (
        acc,
        row
      ) => ({
        totalRows: acc.totalRows + row.count,
        totalNug: acc.totalNug + row.totalNug,
        totalKg: acc.totalKg + row.totalKg,
        totalBasic: acc.totalBasic + row.totalBasic,
        totalExpenses: acc.totalExpenses + row.totalExpenses,
        totalAmount: acc.totalAmount + row.totalAmount
      }),
      {
        totalRows: 0,
        totalNug: 0,
        totalKg: 0,
        totalBasic: 0,
        totalExpenses: 0,
        totalAmount: 0
      }
    )
  }, [groupBy, groupedData, sortedRows])

  const totalPages = useMemo(() => {
    if (dataToDisplay.length === 0) return 1
    return Math.max(1, Math.ceil(dataToDisplay.length / itemsPerPage))
  }, [dataToDisplay.length, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return dataToDisplay.slice(start, end)
  }, [dataToDisplay, currentPage, itemsPerPage])

  const handlePrint = async () => {
    if (filteredRows.length === 0 && (groupedData?.length ?? 0) === 0) {
      toast.info('No data available to print for the selected filters')
      return
    }

    try {
      setIsPreviewLoading(true)
      const doc = new jsPDF('landscape')
      doc.setFontSize(14)
      doc.text('Sale Summary & Customer Bills', 14, 16)
      doc.setFontSize(10)
      doc.text(`Period: ${fromDate} to ${toDate}`, 14, 24)
      doc.text(
        `Total Records: ${filteredTotals.totalRows} (Overall: ${baseTotals.totalRows})`,
        14,
        31
      )

      const startY = 36

      if (groupBy === 'none') {
        autoTable(doc, {
          startY,
          head: [
            [
              'Date',
              'Voucher',
              'Sale Type',
              'Customer',
              'Item',
              'Nug',
              'Kg',
              'Price',
              'Basic Amount',
              'Expenses',
              'Amount'
            ]
          ],
          body: sortedRows.map((row) => [
            row.date,
            row.voucherNo || '-',
            row.sourceLabel,
            row.customerName,
            row.itemName,
            formatNumber(row.nug, 0),
            formatNumber(row.kg),
            formatNumber(row.rate),
            formatNumber(row.basicAmount),
            formatNumber(row.expenses),
            formatNumber(row.amount)
          ]),
          styles: {
            fontSize: 9
          },
          headStyles: {
            fillColor: [40, 53, 147]
          }
        })
      } else {
        autoTable(doc, {
          startY,
          head: [['Group', 'Entries', 'Total Nug', 'Total Kg', 'Basic Amount', 'Expenses', 'Amount']],
          body: (groupedData || []).map((group) => [
            group.label,
            formatNumber(group.count, 0),
            formatNumber(group.totalNug, 0),
            formatNumber(group.totalKg),
            formatNumber(group.totalBasic),
            formatNumber(group.totalExpenses),
            formatNumber(group.totalAmount)
          ]),
          styles: {
            fontSize: 9
          },
          headStyles: {
            fillColor: [40, 53, 147]
          }
        })
      }

      const finalY = (doc as any).lastAutoTable?.finalY ?? startY

      doc.setFontSize(10)
      doc.text(
        `Filtered Totals: Nug ${formatNumber(filteredTotals.totalNug, 0)} | Kg ${formatNumber(
          filteredTotals.totalKg
        )} | Basic ${formatNumber(filteredTotals.totalBasic)} | Expenses ${formatNumber(
          filteredTotals.totalExpenses
        )} | Amount ${formatNumber(filteredTotals.totalAmount)}`,
        14,
        finalY + 10
      )

      const pdfData = doc.output('datauristring')
      setPreviewData(pdfData)
      setPreviewFilename(
        `sale-summary-${fromDate || 'start'}-${toDate || 'end'}-${groupBy === 'none' ? 'detail' : 'grouped'}.pdf`
      )
      setIsPreviewOpen(true)
    } catch (error) {
      console.error('Failed to generate sale summary preview', error)
      toast.error('Failed to prepare preview')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleDownloadPreview = () => {
    if (!previewData) return
    const link = document.createElement('a')
    link.href = previewData
    link.download = previewFilename || 'sale-summary.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const startIndex = dataToDisplay.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endIndex = dataToDisplay.length === 0
    ? 0
    : Math.min(startIndex + itemsPerPage - 1, dataToDisplay.length)
  const canPrint = !loading && (groupBy === 'none'
    ? sortedRows.length > 0
    : (groupedData?.length ?? 0) > 0)

  return (
    <div className="h-screen">
      <div className="flex h-full flex-col bg-gray-50">
        <div className="border-b bg-white px-6 py-4 sticky top-0 z-20">
          <div className="flex items-center justify-between  bg-white px-6 py-4">
            <div>
              <h1 className="text-2xl font-bold">Sale Summary & Customer Bills</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Consolidated quick, daily, and stock sale bills across the selected period
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">From</Label>
                <Input
                  type="date"
                  value={fromDate}
                  max={toDate ? toDate : today}
                  onChange={(event) => handleFromDateChange(event.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">To</Label>
                <Input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  max={today}
                  onChange={(event) => handleToDateChange(event.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadReportData}
                disabled={loading}
                title="Refresh"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrint}
                disabled={!canPrint}
                title="Print Slip"
                aria-label="Print Slip"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search vouchers, customers, items, sale type"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="w-64 pl-10"
                      />
                    </div>

                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Sale Type</Label>
                        <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
                          <SelectTrigger className="w-44">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="quickSale">Quick Sale</SelectItem>
                            <SelectItem value="dailySale">Daily Sale</SelectItem>
                            <SelectItem value="stockSale">Stock Sale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Customer</Label>
                        <Select value={customerFilter} onValueChange={setCustomerFilter}>
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder="All Customers" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="all">All Customers</SelectItem>
                            {customers.map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.accountName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Item</Label>
                        <Select value={itemFilter} onValueChange={setItemFilter}>
                          <SelectTrigger className="w-56">
                            <SelectValue placeholder="All Items" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="all">All Items</SelectItem>
                            {items.map((item: any) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.itemName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Group By</Label>
                        <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByOption)}>
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="No Grouping" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Grouping</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="item">Item</SelectItem>
                            <SelectItem value="saleType">Sale Type</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Active filters / clear helper (matches CrateReceivablePage behavior) */}
                    {( (sortColumn !== 'date' || sortDirection !== 'desc') ||
                      searchQuery !== '' || customerFilter !== 'all' || itemFilter !== 'all' || saleTypeFilter !== 'all' || groupBy !== 'none') && (
                      <div className="flex items-center gap-2 flex-wrap p-2">
                        <span className="text-sm text-muted-foreground">Active:</span>

                        {/* Sort indicator */}
                        {(sortColumn !== 'date' || sortDirection !== 'desc') && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                            <ArrowUpDown className="h-3 w-3" />
                            <span>Sort: {String(sortColumn)} ({sortDirection})</span>
                            <button
                              onClick={() => { setSortColumn('date'); setSortDirection('desc') }}
                              className="ml-1 hover:text-destructive"
                              title="Clear sort"
                            >
                              <FilterX className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {/* Search chip */}
                        {searchQuery && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                            <span>Search: "{searchQuery}"</span>
                          </div>
                        )}

                        {customerFilter !== 'all' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                            <span>Customer</span>
                          </div>
                        )}

                        {itemFilter !== 'all' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                            <span>Item</span>
                          </div>
                        )}

                        {saleTypeFilter !== 'all' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                            <span>Sale Type: {saleTypeFilter}</span>
                          </div>
                        )}

                        {groupBy !== 'none' && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                            <span>Grouped by: {groupBy}</span>
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Clear all filters and reset sort to default
                            setSearchQuery('')
                            setCustomerFilter('all')
                            setItemFilter('all')
                            setSaleTypeFilter('all')
                            setGroupBy('none')
                            setSortColumn('date')
                            setSortDirection('desc')
                            setCurrentPage(1)
                          }}
                          className="h-7 text-xs"
                        >
                          <FilterX className="h-3 w-3 mr-1" />
                          Clear {((sortColumn !== 'date' || sortDirection !== 'desc') && (searchQuery !== '' || customerFilter !== 'all' || itemFilter !== 'all' || saleTypeFilter !== 'all' || groupBy !== 'none')) ? 'All' : (sortColumn !== 'date' || sortDirection !== 'desc') ? 'Sort' : 'Filters'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        {groupBy === 'none' ? (
                          <TableRow>
                            <TableHead className="min-w-[110px]">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('date')}>
                                Date
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                            <TableHead className="min-w-[110px]">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('voucherNo')}>
                                Voucher
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                            <TableHead className="min-w-[120px]">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('source')}>
                                Sale Type
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                            <TableHead className="min-w-[180px]">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('customerName')}>
                                Customer
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                            <TableHead className="min-w-[180px]">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('itemName')}>
                                Item
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('nug')}>
                                Nug
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('kg')}>
                                Kg
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('rate')}>
                                Price
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('basicAmount')}>
                                Basic Amount
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('expenses')}>
                                Comm./Exp.
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">
                              <Button variant="ghost" className="-ml-3 h-auto p-0" onClick={() => handleSort('amount')}>
                                Amount
                                <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            </TableHead>
                          </TableRow>
                        ) : (
                          <TableRow>
                            <TableHead>Group</TableHead>
                            <TableHead className="text-right">Entries</TableHead>
                            <TableHead className="text-right">Total Nug</TableHead>
                            <TableHead className="text-right">Total Kg</TableHead>
                            <TableHead className="text-right">Basic Amount</TableHead>
                            <TableHead className="text-right">Expenses</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        )}
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell
                              colSpan={groupBy === 'none' ? 11 : 7}
                              className="py-10 text-center text-muted-foreground"
                            >
                              Loading report…
                            </TableCell>
                          </TableRow>
                        ) : paginatedData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={groupBy === 'none' ? 11 : 7}
                              className="py-10 text-center text-muted-foreground"
                            >
                              No records found for the selected filters
                            </TableCell>
                          </TableRow>
                        ) : groupBy === 'none' ? (
                          (paginatedData as ReportRow[]).map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>{row.date}</TableCell>
                              <TableCell>{row.voucherNo || '-'}</TableCell>
                              <TableCell>{row.sourceLabel}</TableCell>
                              <TableCell>{row.customerName}</TableCell>
                              <TableCell>{row.itemName}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.nug, 0)}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.kg)}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.rate)}</TableCell>
                              <TableCell className="text-right">₹{formatNumber(row.basicAmount)}</TableCell>
                              <TableCell className="text-right">₹{formatNumber(row.expenses)}</TableCell>
                              <TableCell className="text-right">₹{formatNumber(row.amount)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          (paginatedData as GroupedRow[]).map((group) => (
                            <TableRow key={group.id}>
                              <TableCell>{group.label}</TableCell>
                              <TableCell className="text-right">{formatNumber(group.count, 0)}</TableCell>
                              <TableCell className="text-right">{formatNumber(group.totalNug, 0)}</TableCell>
                              <TableCell className="text-right">{formatNumber(group.totalKg)}</TableCell>
                              <TableCell className="text-right">₹{formatNumber(group.totalBasic)}</TableCell>
                              <TableCell className="text-right">₹{formatNumber(group.totalExpenses)}</TableCell>
                              <TableCell className="text-right">₹{formatNumber(group.totalAmount)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-muted-foreground">
                      Showing {startIndex}-{endIndex} of {dataToDisplay.length} record(s)
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
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t bg-white sticky bottom-0 z-10 py-3">
        <div className="max-w-[1400px] mx-auto px-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center font-semibold border-r">Entries</TableHead>
                <TableHead className="text-center font-semibold border-r">Total Seller Amt</TableHead>
                <TableHead className="text-center font-semibold border-r">Crate Issued</TableHead>
                <TableHead className="text-center font-semibold border-r">Total Nug</TableHead>
                <TableHead className="text-center font-semibold border-r">Total Weight</TableHead>
                <TableHead className="text-center font-semibold border-r">Total Basic Amt</TableHead>
                <TableHead className="text-center font-semibold border-r">Total Expenses</TableHead>
                <TableHead className="text-center font-semibold">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="text-center font-semibold border-r">{filteredRows.length}</TableCell>
                <TableCell className="text-center font-semibold border-r">₹{formatNumber(0)}</TableCell>
                <TableCell className="text-center font-semibold border-r">{formatNumber(0, 0)}</TableCell>
                <TableCell className="text-center font-semibold border-r">{formatNumber(filteredTotals.totalNug, 0)}</TableCell>
                <TableCell className="text-center font-semibold border-r">{formatNumber(filteredTotals.totalKg)}</TableCell>
                <TableCell className="text-center font-semibold border-r">₹{formatNumber(filteredTotals.totalBasic)}</TableCell>
                <TableCell className="text-center font-semibold border-r">₹{formatNumber(filteredTotals.totalExpenses)}</TableCell>
                <TableCell className="text-center font-semibold">₹{formatNumber(filteredTotals.totalAmount)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <ReportPreviewModal
        open={isPreviewOpen}
        pdfData={previewData}
        filename={previewFilename}
        title="Sale Summary & Customer Bills"
        onClose={() => setIsPreviewOpen(false)}
        onDownload={previewData ? handleDownloadPreview : undefined}
        isLoading={isPreviewLoading}
      />
    </div>
  )
}
