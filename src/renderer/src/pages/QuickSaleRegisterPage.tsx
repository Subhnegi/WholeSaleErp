import { Fragment, useEffect, useMemo, useState } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReportExportModal } from '@/components/ReportExportModal'
import { ReportPreviewModal } from '@/components/ReportPreviewModal'
import {
  ClipboardList,
  RefreshCw,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  FilterX
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface RegisterItemRow {
  id: string
  saleId: string
  date: string
  voucherNo: string
  sellerId?: string
  sellerName?: string
  customerId?: string
  customerName?: string
  itemId?: string
  itemName?: string
  nug: number
  weight: number
  price: number
  per: string
  basicAmount: number
  expenses: number
  amount: number
  supplierRate?: number
  sellerAmount: number
  crateMarkaName?: string | null
  crateQty?: number | null
  cratePartyName?: string
}

interface RegisterCharge {
  id: string
  label: string
  onValue: number
  per?: number | null
  atRate: number
  plusMinus: string
  amount: number
}

interface RegisterSummary {
  id: string
  date: string
  voucherNo: string
  sellerIds: string[]
  sellerNames: string[]
  customerIds: string[]
  customerNames: string[]
  itemIds: string[]
  itemNames: string[]
  totalSellerAmount: number
  totalCrateQty: number
  totalNug: number
  totalWeight: number
  totalBasic: number
  totalExpenses: number
  totalAmount: number
  chargesTotal: number
  items: RegisterItemRow[]
  charges: RegisterCharge[]
}

interface SaleMeta {
  id: string
  date: string
  voucherNo: string
  charges: RegisterCharge[]
}

interface GroupedRow {
  id: string
  groupName: string
  totalNug: number
  totalWeight: number
  totalBasic: number
  totalExpenses: number
  totalAmount: number
}

const DETAIL_EXPORT_COLUMNS = [
  'Date',
  'Voucher',
  'Seller',
  'Item',
  'Customer',
  'Nug',
  'Weight',
  'Price',
  'Per',
  'Basic Amount',
  'Expenses',
  'Amount',
  'Crate Marka',
  'Crate Qty',
  'Crate Party'
] as const

const GROUPED_EXPORT_COLUMNS = [
  'Group',
  'Total Nug',
  'Total Weight',
  'Total Basic',
  'Total Expenses',
  'Total Amount'
] as const

type ExportRow = Record<string, string | number>

const SUMMARY_COLUMN_COUNT = 15

const SESSION_FROM_KEY = 'quickSaleRegister.fromDate'
const SESSION_TO_KEY = 'quickSaleRegister.toDate'

const triggerFileDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const formatNumber = (value: number, fraction = 2) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction
  })

export function QuickSaleRegisterPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((state) => state.company)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<RegisterItemRow[]>([])
  const [saleMeta, setSaleMeta] = useState<Record<string, SaleMeta>>({})
  const [loading, setLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [sellerFilter, setSellerFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [itemFilter, setItemFilter] = useState('all')
  const [groupBy, setGroupBy] = useState('none')
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState('')
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const [sellers, setSellers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set())

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
      console.error('Failed to read quick sale register dates from session storage', error)
    }

    setFromDate(initialFrom)
    setToDate(initialTo)

    try {
      sessionStorage.setItem(SESSION_FROM_KEY, initialFrom)
      sessionStorage.setItem(SESSION_TO_KEY, initialTo)
    } catch (error) {
      console.error('Failed to persist quick sale register dates to session storage', error)
    }
  }, [])

  useEffect(() => {
    if (!activeCompany) return
    loadMasterData()
  }, [activeCompany])

  useEffect(() => {
    if (!activeCompany || !fromDate || !toDate) return
    loadRegisterData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, fromDate, toDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sellerFilter, customerFilter, itemFilter, groupBy])

  const loadMasterData = async () => {
    if (!activeCompany) return
    try {
      const accountsResp = await window.api.account.listByCompany(activeCompany.id)
      if (accountsResp.success && accountsResp.data) {
        const sortedAccounts = accountsResp.data.sort((a: any, b: any) =>
          (a.accountName || '').localeCompare(b.accountName || '')
        )
        setSellers(sortedAccounts)
        setCustomers(sortedAccounts)
      }

      const itemsResp = await window.api.item.listByCompany(activeCompany.id)
      if (itemsResp.success && itemsResp.data) {
        setItems(itemsResp.data)
      }
    } catch (error) {
      console.error('Failed to load master data', error)
    }
  }

  const loadRegisterData = async () => {
    if (!activeCompany || !fromDate || !toDate) return
    setLoading(true)
    try {
      const response = await window.api.quickSale.listByDateRange(activeCompany.id, fromDate, toDate)
      if (response.success && Array.isArray(response.data)) {
        const flattened: RegisterItemRow[] = []
        const meta: Record<string, SaleMeta> = {}

        response.data.forEach((sale: any, saleIndex: number) => {
          const saleId = sale.id
          const saleDate = sale.saleDate ? String(sale.saleDate).split('T')[0] : ''
          const voucherNo = sale.voucherNo || '-'

          const charges: RegisterCharge[] = Array.isArray(sale.charges)
            ? sale.charges.map((charge: any, chargeIndex: number) => {
                const label = charge.chargeName || charge.label || `Charge ${chargeIndex + 1}`
                const onValue = Number(charge.onValue) || 0
                const perValue = charge.per ?? charge.percentage ?? null
                const atRate = Number(charge.atRate) || 0
                const symbol = charge.plusMinus === '-' ? '-' : '+'
                const amount = Math.abs(Number(charge.amount) || Number(charge.appliedAmount) || 0)

                return {
                  id: charge.id || `${saleId}-charge-${chargeIndex}`,
                  label,
                  onValue,
                  per: perValue,
                  atRate,
                  plusMinus: symbol,
                  amount
                }
              })
            : []

          meta[saleId] = {
            id: saleId,
            date: saleDate,
            voucherNo,
            charges
          }

          sale.items?.forEach((item: any, itemIndex: number) => {
            const nug = Number(item.nug) || 0
            const weight = Number(item.kg) || 0
            const price = Number(item.rate) || 0
            const per = (item.per || 'nug').toLowerCase()
            const basicAmount = Number(item.basicAmount) || 0
            const amount = Number(item.totalAmount) || 0
            const expenses = amount - basicAmount
            const crateQty = typeof item.crateQty === 'number' ? item.crateQty : null
            const customerName = item.accountName || 'Direct Customer'
            const supplierRate = Number(item.supplierRate ?? item.purchaseRate ?? 0) || 0
            const quantityForSupplier = per === 'kg' ? weight : nug
            const sellerAmount = supplierRate > 0 ? supplierRate * quantityForSupplier : basicAmount

            flattened.push({
              id: `${saleId}-${item.id || `${saleIndex}-${itemIndex}`}`,
              saleId,
              date: saleDate,
              voucherNo,
              sellerId: item.accountId,
              sellerName: item.accountName || 'Unknown Account',
              customerId: item.accountId,
              customerName,
              itemId: item.itemId,
              itemName: item.itemName || 'Unknown Item',
              nug,
              weight,
              price,
              per,
              basicAmount,
              expenses,
              amount,
              supplierRate,
              sellerAmount,
              crateMarkaName: item.crateMarkaName || null,
              crateQty,
              cratePartyName: customerName
            })
          })
        })

        setRows(flattened)
        setSaleMeta(meta)
        setCurrentPage(1)
      } else {
        setRows([])
        setSaleMeta({})
        if (response.error) {
          toast.error(response.error)
        }
      }
    } catch (error: any) {
      console.error('Failed to load quick sale register', error)
      toast.error(error?.message || 'Failed to load quick sale register')
      setRows([])
      setSaleMeta({})
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
      console.error('Failed to persist quick sale register from date', error)
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
      console.error('Failed to persist quick sale register to date', error)
    }
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
  }

  const renderSortIndicators = (column: string) => {
    const isAsc = sortBy === column && sortDir === 'asc'
    const isDesc = sortBy === column && sortDir === 'desc'

    return (
      <span className="ml-1 flex flex-col">
        <ChevronUp className={`h-3 w-3 ${isAsc ? 'text-primary' : 'text-muted-foreground'}`} />
        <ChevronDown className={`h-3 w-3 ${isDesc ? 'text-primary' : 'text-muted-foreground'}`} />
      </span>
    )
  }

  const buildDisplayValue = (values: string[]) => {
    if (!values || values.length === 0) return '-'
    if (values.length === 1) return values[0]
    if (values.length === 2) return `${values[0]}, ${values[1]}`
    return `${values[0]}, ${values[1]} +${values.length - 2} more`
  }

  const handleClearAll = () => {
    setSearchQuery('')
    setSellerFilter('all')
    setCustomerFilter('all')
    setItemFilter('all')
    setGroupBy('none')
    setSortBy(null)
    setSortDir('desc')
    setCurrentPage(1)
    setExpandedSummaries(new Set())
  }

  const filteredRows = useMemo(() => {
    let data = rows

    if (sellerFilter !== 'all') {
      data = data.filter((row) => row.sellerId === sellerFilter)
    }
    if (customerFilter !== 'all') {
      data = data.filter((row) => row.customerId === customerFilter)
    }
    if (itemFilter !== 'all') {
      data = data.filter((row) => row.itemId === itemFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      data = data.filter((row) =>
        (row.voucherNo || '').toLowerCase().includes(q) ||
        (row.sellerName || '').toLowerCase().includes(q) ||
        (row.customerName || '').toLowerCase().includes(q) ||
        (row.itemName || '').toLowerCase().includes(q) ||
        (row.crateMarkaName || '').toLowerCase().includes(q) ||
        (row.cratePartyName || '').toLowerCase().includes(q)
      )
    }

    return [...data]
  }, [rows, searchQuery, sellerFilter, customerFilter, itemFilter])

  const groupedData = useMemo(() => {
    if (groupBy === 'none') return null
    const groups = new Map<string, GroupedRow>()

    filteredRows.forEach((row) => {
      let key = 'group'
      let label = ''
      switch (groupBy) {
        case 'seller':
          key = row.sellerId || 'no-seller'
          label = row.sellerName || 'Unknown Seller'
          break
        case 'customer':
          key = row.customerId || 'no-customer'
          label = row.customerName || 'Unknown Customer'
          break
        case 'item':
          key = row.itemId || 'no-item'
          label = row.itemName || 'Unknown Item'
          break
        case 'date':
          key = row.date || 'no-date'
          label = row.date || 'Unknown Date'
          break
        default:
          key = 'group'
      }

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          groupName: label,
          totalNug: 0,
          totalWeight: 0,
          totalBasic: 0,
          totalExpenses: 0,
          totalAmount: 0
        })
      }

      const group = groups.get(key)!
      group.totalNug += row.nug
      group.totalWeight += row.weight
      group.totalBasic += row.basicAmount
      group.totalExpenses += row.expenses
      group.totalAmount += row.amount
    })

    return Array.from(groups.values()).sort((a, b) => a.groupName.localeCompare(b.groupName))
  }, [filteredRows, groupBy])

  const saleSummaries = useMemo(() => {
    const summaryMap = new Map<string, RegisterSummary>()

    filteredRows.forEach((row) => {
      const meta = saleMeta[row.saleId]
      if (!summaryMap.has(row.saleId)) {
        const charges = meta?.charges ?? []
        const chargesTotal = charges.reduce((sum, charge) => {
          const signed = charge.plusMinus === '-' ? -charge.amount : charge.amount
          return sum + signed
        }, 0)

        summaryMap.set(row.saleId, {
          id: row.saleId,
          date: meta?.date || row.date,
          voucherNo: meta?.voucherNo || row.voucherNo || '-',
          sellerIds: [],
          sellerNames: [],
          customerIds: [],
          customerNames: [],
          itemIds: [],
          itemNames: [],
          totalSellerAmount: 0,
          totalCrateQty: 0,
          totalNug: 0,
          totalWeight: 0,
          totalBasic: 0,
          totalExpenses: 0,
          totalAmount: 0,
          chargesTotal,
          items: [],
          charges
        })
      }

      const summary = summaryMap.get(row.saleId)!
      summary.items.push(row)
      summary.totalNug += row.nug
      summary.totalWeight += row.weight
      summary.totalBasic += row.basicAmount
      summary.totalExpenses += row.expenses
      summary.totalAmount += row.amount
      summary.totalSellerAmount += row.sellerAmount
      summary.totalCrateQty += Number(row.crateQty) || 0

      if (row.sellerId && !summary.sellerIds.includes(row.sellerId)) {
        summary.sellerIds.push(row.sellerId)
      }
      if (row.sellerName && !summary.sellerNames.includes(row.sellerName)) {
        summary.sellerNames.push(row.sellerName)
      }
      if (row.customerId && !summary.customerIds.includes(row.customerId)) {
        summary.customerIds.push(row.customerId)
      }
      if (row.customerName && !summary.customerNames.includes(row.customerName)) {
        summary.customerNames.push(row.customerName)
      }
      if (row.itemId && !summary.itemIds.includes(row.itemId)) {
        summary.itemIds.push(row.itemId)
      }
      if (row.itemName && !summary.itemNames.includes(row.itemName)) {
        summary.itemNames.push(row.itemName)
      }
    })

    const summaries = Array.from(summaryMap.values())
    const direction = sortDir === 'asc' ? 1 : -1

    const getPrimary = (values: string[]) => values[0] || ''

    summaries.sort((a, b) => {
      if (!sortBy) {
        const dateCompare = (b.date || '').localeCompare(a.date || '')
        if (dateCompare !== 0) return dateCompare
        return (b.voucherNo || '').localeCompare(a.voucherNo || '')
      }

      switch (sortBy) {
        case 'date':
          return (a.date || '').localeCompare(b.date || '') * direction
        case 'voucherNo':
          return (a.voucherNo || '').localeCompare(b.voucherNo || '') * direction
        case 'seller':
          return getPrimary(a.sellerNames).localeCompare(getPrimary(b.sellerNames)) * direction
        case 'customer':
          return getPrimary(a.customerNames).localeCompare(getPrimary(b.customerNames)) * direction
        case 'itemCount':
          return (a.items.length - b.items.length) * direction
        case 'totalNug':
          return (a.totalNug - b.totalNug) * direction
        case 'totalWeight':
          return (a.totalWeight - b.totalWeight) * direction
        case 'totalBasic':
          return (a.totalBasic - b.totalBasic) * direction
        case 'totalExpenses':
          return (a.totalExpenses - b.totalExpenses) * direction
        case 'chargesTotal':
          return (a.chargesTotal - b.chargesTotal) * direction
        case 'totalAmount':
          return (a.totalAmount - b.totalAmount) * direction
        case 'totalSellerAmount':
          return (a.totalSellerAmount - b.totalSellerAmount) * direction
        case 'totalCrateQty':
          return (a.totalCrateQty - b.totalCrateQty) * direction
        default:
          return 0
      }
    })

    return summaries
  }, [filteredRows, saleMeta, sortBy, sortDir])

  const toggleSummary = (summaryId: string) => {
    setExpandedSummaries((prev) => {
      const next = new Set(prev)
      if (next.has(summaryId)) {
        next.delete(summaryId)
      } else {
        next.add(summaryId)
      }
      return next
    })
  }

  const expandAllSummaries = () => {
    setExpandedSummaries((prev) => {
      const allIds = saleSummaries.map((summary) => summary.id)
      if (allIds.length === prev.size && allIds.every((id) => prev.has(id))) {
        return prev
      }
      return new Set(allIds)
    })
  }

  const collapseAllSummaries = () => {
    setExpandedSummaries((prev) => {
      if (prev.size === 0) {
        return prev
      }
      return new Set()
    })
  }

  useEffect(() => {
    setExpandedSummaries((prev) => {
      const retained = new Set<string>()
      saleSummaries.forEach((summary) => {
        if (prev.has(summary.id)) {
          retained.add(summary.id)
        }
      })

      let hasDifference = retained.size !== prev.size
      if (!hasDifference) {
        prev.forEach((id) => {
          if (!retained.has(id)) {
            hasDifference = true
          }
        })
      }

      return hasDifference ? retained : prev
    })
  }, [saleSummaries])

  const dataToDisplay = groupBy !== 'none' ? groupedData || [] : saleSummaries
  const totalPages = Math.max(1, Math.ceil(dataToDisplay.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = dataToDisplay.slice(startIndex, endIndex)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const buildExportDataset = () => {
    if (groupBy !== 'none') {
      const groupRows: ExportRow[] = (groupedData ?? []).map((group) => ({
        Group: group.groupName,
        'Total Nug': Number(group.totalNug || 0),
        'Total Weight': Number(group.totalWeight || 0),
        'Total Basic': Number(group.totalBasic || 0),
        'Total Expenses': Number(group.totalExpenses || 0),
        'Total Amount': Number(group.totalAmount || 0)
      }))
      return { columns: GROUPED_EXPORT_COLUMNS, rows: groupRows, variant: 'grouped' as const }
    }

    type SaleSection = {
      header: {
        date: string
        voucherNo: string
        sellers: string
        customers: string
      }
      items: ExportRow[]
      charges: Array<{ label: string; amount: number; plusMinus: string }>
      totals: {
        nug: number
        weight: number
        basic: number
        expenses: number
        amount: number
        crateQty: number
        sellerAmount: number
        chargesTotal: number
      }
    }

    const saleSections: SaleSection[] = saleSummaries.map((summary) => ({
      header: {
        date: summary.date,
        voucherNo: summary.voucherNo || 'N/A',
        sellers: summary.sellerNames.join(', ') || '-',
        customers: summary.customerNames.join(', ') || '-'
      },
      items: summary.items.map((row) => ({
        Date: row.date,
        Voucher: row.voucherNo || '',
        Seller: row.sellerName || '',
        Item: row.itemName || '',
        Customer: row.customerName || '',
        Nug: Number(row.nug || 0),
        Weight: Number(row.weight || 0),
        Price: Number(row.price || 0),
        Per: (row.per || '').toUpperCase(),
        'Basic Amount': Number(row.basicAmount || 0),
        Expenses: Number(row.expenses || 0),
        Amount: Number(row.amount || 0),
        'Crate Marka': row.crateMarkaName || '',
        'Crate Qty': row.crateQty ?? '',
        'Crate Party': row.cratePartyName || ''
      })),
      charges: summary.charges.map((charge) => ({
        label: charge.label,
        amount: charge.plusMinus === '-' ? -charge.amount : charge.amount,
        plusMinus: charge.plusMinus
      })),
      totals: {
        nug: summary.totalNug,
        weight: summary.totalWeight,
        basic: summary.totalBasic,
        expenses: summary.totalExpenses,
        amount: summary.totalAmount,
        crateQty: summary.totalCrateQty,
        sellerAmount: summary.totalSellerAmount,
        chargesTotal: summary.chargesTotal
      }
    }))

    return {
      columns: DETAIL_EXPORT_COLUMNS,
      rows: saleSections.flatMap((section) => section.items),
      variant: 'detail' as const,
      sections: saleSections
    }
  }

  const buildFilenameBase = (variant: 'grouped' | 'detail') =>
    [
      'quick-sale-register',
      fromDate || 'start',
      'to',
      toDate || 'end',
      variant === 'grouped' ? `grouped-by-${groupBy}` : 'detailed'
    ]
      .filter(Boolean)
      .join('_')

  const generatePdfDocument = (dataset: ReturnType<typeof buildExportDataset>) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 30

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Quick Sale Register', pageWidth / 2, yPos, { align: 'center' })
    yPos += 20

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Period: ${fromDate || 'Start'} to ${toDate || 'End'}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 20

    if ('sections' in dataset && dataset.sections) {
      const sections = dataset.sections as Array<{
        header: { date: string; voucherNo: string; sellers: string; customers: string }
        items: ExportRow[]
        charges: Array<{ label: string; amount: number; plusMinus: string }>
        totals: {
          nug: number
          weight: number
          basic: number
          expenses: number
          amount: number
          crateQty: number
          sellerAmount: number
          chargesTotal: number
        }
      }>

      sections.forEach((section, index) => {
        if (yPos > doc.internal.pageSize.getHeight() - 120) {
          doc.addPage()
          yPos = 30
        }

        doc.setFillColor(240, 240, 245)
        doc.rect(40, yPos - 12, pageWidth - 80, 32, 'F')
        doc.setDrawColor(200, 200, 200)
        doc.rect(40, yPos - 12, pageWidth - 80, 32, 'S')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(`Sale #${index + 1}`, 50, yPos)
        doc.text(`Date: ${section.header.date}`, 120, yPos)
        doc.text(`Voucher: ${section.header.voucherNo}`, 250, yPos)

        yPos += 12
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(`Sellers: ${section.header.sellers}`, 50, yPos)
        doc.text(`Customers: ${section.header.customers}`, 320, yPos)

        yPos += 18

        const itemColumns = ['Item', 'Lot', 'Nug', 'Weight', 'Price', 'Per', 'Basic Amount', 'Expenses', 'Amount', 'Crate Marka', 'Crate Qty']
        autoTable(doc, {
          startY: yPos,
          head: [itemColumns],
          body: section.items.map((item) => [
            String(item['Item'] || ''),
            String(item['Lot'] || ''),
            String(item['Nug'] || ''),
            String(item['Weight'] || ''),
            String(item['Price'] || ''),
            String(item['Per'] || ''),
            String(item['Basic Amount'] || ''),
            String(item['Expenses'] || ''),
            String(item['Amount'] || ''),
            String(item['Crate Marka'] || ''),
            String(item['Crate Qty'] || '')
          ]),
          foot: [[
            `Subtotal (${section.items.length} items)`,
            '',
            String(section.totals.nug),
            String(section.totals.weight.toFixed(2)),
            '',
            '',
            String(section.totals.basic.toFixed(2)),
            String(section.totals.expenses.toFixed(2)),
            String(section.totals.amount.toFixed(2)),
            '',
            String(section.totals.crateQty)
          ]],
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
          footStyles: { fillColor: [230, 230, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
          theme: 'grid',
          margin: { left: 40, right: 40 }
        })

        yPos = (doc as any).lastAutoTable.finalY + 10

        if (section.charges.length > 0) {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.text('Charges', 40, yPos)
          yPos += 12

          autoTable(doc, {
            startY: yPos,
            head: [['Charge Name', 'Type', 'Amount']],
            body: section.charges.map((charge) => [
              charge.label,
              charge.plusMinus === '-' ? 'Deduct (-)' : 'Add (+)',
              String(charge.amount.toFixed(2))
            ]),
            foot: [['Total Charges', '', String(section.totals.chargesTotal.toFixed(2))]],
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [60, 60, 80], textColor: [255, 255, 255] },
            footStyles: { fillColor: [230, 230, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
            theme: 'grid',
            margin: { left: 40, right: 40 },
            tableWidth: 320
          })

          yPos = (doc as any).lastAutoTable.finalY + 18
        } else {
          yPos += 12
        }
      })
    } else {
      autoTable(doc, {
        startY: yPos,
        head: [[...dataset.columns] as string[]],
        body: dataset.rows.map((row) => dataset.columns.map((column) => String(row[column] ?? ''))),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        theme: 'grid',
        margin: { left: 40, right: 40 }
      })
    }

    return doc
  }

  const handlePreview = () => {
    const dataset = buildExportDataset()
    if (dataset.rows.length === 0) {
      toast.info('No data available to preview for the selected filters')
      setIsExportModalOpen(false)
      return
    }

    const filenameBase = buildFilenameBase(dataset.variant)

    try {
      setIsPreviewLoading(true)
      setIsPreviewOpen(true)
      const doc = generatePdfDocument(dataset)
      const dataUri = doc.output('datauristring')
      setPreviewData(dataUri)
      setPreviewFilename(`${filenameBase}.pdf`)
      toast.success('Preview ready')
    } catch (error: any) {
      console.error('Failed to preview quick sale register', error)
      toast.error(error?.message || 'Failed to preview quick sale register')
      setIsPreviewOpen(false)
      setPreviewData(null)
    } finally {
      setIsExportModalOpen(false)
      setIsPreviewLoading(false)
    }
  }

  const summaryTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        const crateQty = Number(row.crateQty) || 0
        return {
          totalSellerAmount: acc.totalSellerAmount + row.sellerAmount,
          totalCrateQty: acc.totalCrateQty + crateQty,
          totalNug: acc.totalNug + row.nug,
          totalWeight: acc.totalWeight + row.weight,
          totalBasic: acc.totalBasic + row.basicAmount,
          totalExpenses: acc.totalExpenses + row.expenses,
          totalAmount: acc.totalAmount + row.amount
        }
      },
      {
        totalSellerAmount: 0,
        totalCrateQty: 0,
        totalNug: 0,
        totalWeight: 0,
        totalBasic: 0,
        totalExpenses: 0,
        totalAmount: 0
      }
    )
  }, [filteredRows])

  const handleExport = (type: 'excel' | 'pdf' | 'csv') => {
    const dataset = buildExportDataset()
    if (dataset.rows.length === 0) {
      toast.info('No data available to export for the selected filters')
      setIsExportModalOpen(false)
      return
    }

    const filenameBase = buildFilenameBase(dataset.variant)

    try {
      if (type === 'excel' || type === 'csv') {
        const exportRows: Record<string, string | number>[] = []

        if ('sections' in dataset && dataset.sections) {
          const sections = dataset.sections as Array<{
            header: { date: string; voucherNo: string; sellers: string; customers: string }
            items: ExportRow[]
            charges: Array<{ label: string; amount: number; plusMinus: string }>
            totals: {
              nug: number
              weight: number
              basic: number
              expenses: number
              amount: number
              crateQty: number
              sellerAmount: number
              chargesTotal: number
            }
          }>

          sections.forEach((section, index) => {
            exportRows.push({
              'Row Type': 'SALE HEADER',
              'Sale #': index + 1,
              Date: section.header.date,
              Voucher: section.header.voucherNo,
              Sellers: section.header.sellers,
              Customers: section.header.customers,
              Item: '',
              Lot: '',
              Nug: '',
              Weight: '',
              Price: '',
              Per: '',
              'Basic Amount': '',
              Expenses: '',
              Amount: '',
              'Crate Marka': '',
              'Crate Qty': '',
              'Crate Party': ''
            })

            section.items.forEach((item) => {
              exportRows.push({
                'Row Type': 'ITEM',
                'Sale #': index + 1,
                Date: String(item['Date'] || ''),
                Voucher: String(item['Voucher'] || ''),
                Sellers: String(item['Seller'] || ''),
                Customers: String(item['Customer'] || ''),
                Item: String(item['Item'] || ''),
                Lot: String(item['Lot'] || ''),
                Nug: Number(item['Nug'] || 0),
                Weight: Number(item['Weight'] || 0),
                Price: Number(item['Price'] || 0),
                Per: String(item['Per'] || ''),
                'Basic Amount': Number(item['Basic Amount'] || 0),
                Expenses: Number(item['Expenses'] || 0),
                Amount: Number(item['Amount'] || 0),
                'Crate Marka': String(item['Crate Marka'] || ''),
                'Crate Qty': typeof item['Crate Qty'] === 'number' ? item['Crate Qty'] : Number(item['Crate Qty'] || 0),
                'Crate Party': String(item['Crate Party'] || '')
              })
            })

            exportRows.push({
              'Row Type': 'ITEMS SUBTOTAL',
              'Sale #': index + 1,
              Date: '',
              Voucher: '',
              Sellers: '',
              Customers: '',
              Item: `Subtotal (${section.items.length} items)`,
              Lot: '',
              Nug: section.totals.nug,
              Weight: section.totals.weight,
              Price: '',
              Per: '',
              'Basic Amount': section.totals.basic,
              Expenses: section.totals.expenses,
              Amount: section.totals.amount,
              'Crate Marka': '',
              'Crate Qty': section.totals.crateQty,
              'Crate Party': ''
            })

            section.charges.forEach((charge) => {
              exportRows.push({
                'Row Type': 'CHARGE',
                'Sale #': index + 1,
                Date: '',
                Voucher: '',
                Sellers: '',
                Customers: '',
                Item: charge.label,
                Lot: charge.plusMinus === '-' ? 'Deduct (-)' : 'Add (+)',
                Nug: '',
                Weight: '',
                Price: '',
                Per: '',
                'Basic Amount': '',
                Expenses: '',
                Amount: charge.amount,
                'Crate Marka': '',
                'Crate Qty': '',
                'Crate Party': ''
              })
            })

            if (section.charges.length > 0) {
              exportRows.push({
                'Row Type': 'CHARGES TOTAL',
                'Sale #': index + 1,
                Date: '',
                Voucher: '',
                Sellers: '',
                Customers: '',
                Item: 'Total Charges',
                Lot: '',
                Nug: '',
                Weight: '',
                Price: '',
                Per: '',
                'Basic Amount': '',
                Expenses: '',
                Amount: section.totals.chargesTotal,
                'Crate Marka': '',
                'Crate Qty': '',
                'Crate Party': ''
              })
            }

            exportRows.push({
              'Row Type': '',
              'Sale #': '',
              Date: '',
              Voucher: '',
              Sellers: '',
              Customers: '',
              Item: '',
              Lot: '',
              Nug: '',
              Weight: '',
              Price: '',
              Per: '',
              'Basic Amount': '',
              Expenses: '',
              Amount: '',
              'Crate Marka': '',
              'Crate Qty': '',
              'Crate Party': ''
            })
          })
        } else {
          dataset.rows.forEach((row) => {
            exportRows.push(row as Record<string, string | number>)
          })
        }

        const columns = [
          'Row Type',
          'Sale #',
          'Date',
          'Voucher',
          'Sellers',
          'Customers',
          'Item',
          'Lot',
          'Nug',
          'Weight',
          'Price',
          'Per',
          'Basic Amount',
          'Expenses',
          'Amount',
          'Crate Marka',
          'Crate Qty',
          'Crate Party'
        ]

        if (type === 'excel') {
          const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: columns })
          const workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Quick Sale Register')
          XLSX.writeFile(workbook, `${filenameBase}.xlsx`)
        } else {
          const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: columns })
          const csvData = XLSX.utils.sheet_to_csv(worksheet)
          const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
          triggerFileDownload(blob, `${filenameBase}.csv`)
        }
      } else {
        const doc = generatePdfDocument(dataset)
        doc.save(`${filenameBase}.pdf`)
      }
      toast.success(`Quick Sale register exported as ${type.toUpperCase()}`)
    } catch (error: any) {
      console.error('Failed to export quick sale register', error)
      toast.error(error?.message || 'Failed to export quick sale register')
    } finally {
      setIsExportModalOpen(false)
    }
  }

  const hasActiveSort = !!sortBy
  const hasFilters =
    searchQuery !== '' ||
    sellerFilter !== 'all' ||
    customerFilter !== 'all' ||
    itemFilter !== 'all' ||
    groupBy !== 'none'

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <ClipboardList className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Select a company to view the quick sale register</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Quick Sale Register</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Day-wise breakdown of quick sales with crate and expense visibility
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">From</Label>
          <Input
            type="date"
            value={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => handleFromDateChange(e.target.value)}
            className="w-40"
          />
          <Label className="text-sm font-medium">To</Label>
          <Input
            type="date"
            value={toDate}
            min={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => handleToDateChange(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" onClick={() => setIsExportModalOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="ghost" size="icon" onClick={loadRegisterData} disabled={loading} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.print()} title="Print">
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
                  placeholder="Search voucher, seller, customer, item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />
                <Select value={sellerFilter} onValueChange={setSellerFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Seller" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sellers</SelectItem>
                    {sellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={itemFilter} onValueChange={setItemFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.itemName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Group By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="item">Item</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
                {(hasActiveSort || hasFilters) && (
                  <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 text-xs">
                    <FilterX className="h-3 w-3 mr-2" />
                    Clear All
                  </Button>
                )}
                {groupBy === 'none' && saleSummaries.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={expandAllSummaries} className="h-8 text-xs">
                      Expand All
                    </Button>
                    <Button variant="outline" size="sm" onClick={collapseAllSummaries} className="h-8 text-xs">
                      Collapse All
                    </Button>
                  </>
                )}
                <div className="flex-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col px-6">
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1400px] mx-auto space-y-4">
            <Card>
              <CardContent className="p-0">
                {(hasActiveSort || hasFilters) && (
                  <div className="flex items-center gap-2 flex-wrap p-4 border-b">
                    <span className="text-sm text-muted-foreground">Active:</span>
                    {hasActiveSort && sortBy && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <ArrowUpDown className="h-3 w-3" />
                        <span>
                          Sort: {String(sortBy)} ({sortDir})
                        </span>
                      </div>
                    )}
                    {searchQuery && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        Search: "{searchQuery}"
                      </div>
                    )}
                    {sellerFilter !== 'all' && <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">Seller</div>}
                    {customerFilter !== 'all' && <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">Customer</div>}
                    {itemFilter !== 'all' && <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">Item</div>}
                    {groupBy !== 'none' && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        Grouped by: {groupBy}
                      </div>
                    )}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table className={groupBy !== 'none' ? '' : 'min-w-[1100px]'}>
                    <TableHeader>
                      {groupBy !== 'none' ? (
                        <TableRow className="bg-gray-100">
                          <TableHead className="w-12 text-center font-bold">S.N</TableHead>
                          <TableHead className="font-bold">Group</TableHead>
                          <TableHead className="text-right font-bold">Nug</TableHead>
                          <TableHead className="text-right font-bold">Weight</TableHead>
                          <TableHead className="text-right font-bold">Basic</TableHead>
                          <TableHead className="text-right font-bold">Expenses</TableHead>
                          <TableHead className="text-right font-bold">Amount</TableHead>
                        </TableRow>
                      ) : (
                        <TableRow className="bg-gray-100">
                          <TableHead className="w-10 text-center font-bold"></TableHead>
                          <TableHead className="w-12 text-center font-bold">S.N</TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2" onClick={() => handleSort('date')}>
                              <span>Date</span>
                              {renderSortIndicators('date')}
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2" onClick={() => handleSort('voucherNo')}>
                              <span>Voucher</span>
                              {renderSortIndicators('voucherNo')}
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">Sellers</TableHead>
                          <TableHead className="font-bold">Customers</TableHead>
                          <TableHead className="text-center font-bold">
                            <button
                              type="button"
                              className="flex w-full items-center justify-center gap-2"
                              onClick={() => handleSort('itemCount')}
                            >
                              <span>Items</span>
                              {renderSortIndicators('itemCount')}
                            </button>
                          </TableHead>
                          <TableHead className="text-right font-bold">
                            <button
                              type="button"
                              className="flex w-full items-center justify-end gap-2"
                              onClick={() => handleSort('totalNug')}
                            >
                              <span>Nug</span>
                              {renderSortIndicators('totalNug')}
                            </button>
                          </TableHead>
                          <TableHead className="text-right font-bold">
                            <button
                              type="button"
                              className="flex w-full items-center justify-end gap-2"
                              onClick={() => handleSort('totalWeight')}
                            >
                              <span>Wt</span>
                              {renderSortIndicators('totalWeight')}
                            </button>
                          </TableHead>
                          <TableHead className="text-right font-bold">
                            <button
                              type="button"
                              className="flex w-full items-center justify-end gap-2"
                              onClick={() => handleSort('totalBasic')}
                            >
                              <span>Basic Amt</span>
                              {renderSortIndicators('totalBasic')}
                            </button>
                          </TableHead>
                          <TableHead className="text-right font-bold">
                            <button
                              type="button"
                              className="flex w-full items-center justify-end gap-2"
                              onClick={() => handleSort('totalExpenses')}
                            >
                              <span>Expenses</span>
                              {renderSortIndicators('totalExpenses')}
                            </button>
                          </TableHead>
                          <TableHead className="text-right font-bold">
                            <button
                              type="button"
                              className="flex w-full items-center justify-end gap-2"
                              onClick={() => handleSort('chargesTotal')}
                            >
                              <span>Charges</span>
                              {renderSortIndicators('chargesTotal')}
                            </button>
                          </TableHead>
                          <TableHead className="text-right font-bold">
                            <button
                              type="button"
                              className="flex w-full items-center justify-end gap-2"
                              onClick={() => handleSort('totalAmount')}
                            >
                              <span>Amount</span>
                              {renderSortIndicators('totalAmount')}
                            </button>
                          </TableHead>
                          <TableHead className="text-right font-bold">
                            <button
                              type="button"
                              className="flex w-full items-center justify-end gap-2"
                              onClick={() => handleSort('totalSellerAmount')}
                            >
                              <span>Seller Amt</span>
                              {renderSortIndicators('totalSellerAmount')}
                            </button>
                          </TableHead>
                          <TableHead className="text-right font-bold">
                            <button
                              type="button"
                              className="flex w-full items-center justify-end gap-2"
                              onClick={() => handleSort('totalCrateQty')}
                            >
                              <span>Crate Qty</span>
                              {renderSortIndicators('totalCrateQty')}
                            </button>
                          </TableHead>
                        </TableRow>
                      )}
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell
                            colSpan={groupBy !== 'none' ? 7 : SUMMARY_COLUMN_COUNT}
                            className="text-center py-8"
                          >
                            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : dataToDisplay.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={groupBy !== 'none' ? 7 : SUMMARY_COLUMN_COUNT}
                            className="text-center text-muted-foreground py-8"
                          >
                            {rows.length === 0 ? 'No quick sale entries for this period' : 'No rows match the filters'}
                          </TableCell>
                        </TableRow>
                      ) : groupBy !== 'none' ? (
                        (paginatedData as GroupedRow[]).map((group, idx) => (
                          <TableRow key={group.id}>
                            <TableCell className="text-center">{startIndex + idx + 1}</TableCell>
                            <TableCell className="font-medium">{group.groupName}</TableCell>
                            <TableCell className="text-right">{formatNumber(group.totalNug, 0)}</TableCell>
                            <TableCell className="text-right">{formatNumber(group.totalWeight)}</TableCell>
                            <TableCell className="text-right">₹{formatNumber(group.totalBasic)}</TableCell>
                            <TableCell className="text-right">₹{formatNumber(group.totalExpenses)}</TableCell>
                            <TableCell className="text-right font-semibold">₹{formatNumber(group.totalAmount)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        (paginatedData as RegisterSummary[]).map((summary, idx) => {
                          const isExpanded = expandedSummaries.has(summary.id)
                          return (
                            <Fragment key={summary.id}>
                              <TableRow
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleSummary(summary.id)}
                              >
                                <TableCell className="text-center align-middle">
                                  <button
                                    type="button"
                                    className="mx-auto flex h-6 w-6 items-center justify-center rounded-full border"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      toggleSummary(summary.id)
                                    }}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                </TableCell>
                                <TableCell className="text-center align-middle">{startIndex + idx + 1}</TableCell>
                                <TableCell className="align-middle">{summary.date || '-'}</TableCell>
                                <TableCell className="font-mono font-semibold align-middle">{summary.voucherNo || '-'}</TableCell>
                                <TableCell className="align-middle">{buildDisplayValue(summary.sellerNames)}</TableCell>
                                <TableCell className="align-middle">{buildDisplayValue(summary.customerNames)}</TableCell>
                                <TableCell className="text-center align-middle">{summary.items.length}</TableCell>
                                <TableCell className="text-right align-middle">{formatNumber(summary.totalNug, 0)}</TableCell>
                                <TableCell className="text-right align-middle">{formatNumber(summary.totalWeight)}</TableCell>
                                <TableCell className="text-right align-middle">₹{formatNumber(summary.totalBasic)}</TableCell>
                                <TableCell className="text-right align-middle">₹{formatNumber(summary.totalExpenses)}</TableCell>
                                <TableCell className="text-right align-middle">
                                  {summary.chargesTotal === 0
                                    ? '₹0.00'
                                    : `${summary.chargesTotal < 0 ? '-' : ''}₹${formatNumber(
                                        Math.abs(summary.chargesTotal)
                                      )}`}
                                </TableCell>
                                <TableCell className="text-right align-middle font-semibold">₹{formatNumber(summary.totalAmount)}</TableCell>
                                <TableCell className="text-right align-middle">₹{formatNumber(summary.totalSellerAmount)}</TableCell>
                                <TableCell className="text-right align-middle">{formatNumber(summary.totalCrateQty, 0)}</TableCell>
                              </TableRow>
                              {isExpanded && (
                                <TableRow className="bg-muted/40">
                                  <TableCell colSpan={SUMMARY_COLUMN_COUNT}>
                                    <div className="space-y-4 p-4">
                                      <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                        <div>
                                          <span className="text-muted-foreground">Basic Amount</span>
                                          <div className="font-semibold">₹{formatNumber(summary.totalBasic)}</div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Expenses</span>
                                          <div className="font-semibold">₹{formatNumber(summary.totalExpenses)}</div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Charges</span>
                                          <div className="font-semibold">
                                            {summary.chargesTotal === 0
                                              ? '₹0.00'
                                              : `${summary.chargesTotal < 0 ? '-' : ''}₹${formatNumber(
                                                  Math.abs(summary.chargesTotal)
                                                )}`}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Net Amount</span>
                                          <div className="font-semibold">₹{formatNumber(summary.totalAmount)}</div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Seller Amount</span>
                                          <div className="font-semibold">₹{formatNumber(summary.totalSellerAmount)}</div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Crate Quantity</span>
                                          <div className="font-semibold">{formatNumber(summary.totalCrateQty, 0)}</div>
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-sm mb-2">Items</h4>
                                        <div className="overflow-x-auto rounded-md border bg-background">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>Item</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead className="text-right">Nug</TableHead>
                                                <TableHead className="text-right">Wt</TableHead>
                                                <TableHead className="text-right">Rate</TableHead>
                                                <TableHead className="text-center">Per</TableHead>
                                                <TableHead className="text-right">Basic</TableHead>
                                                <TableHead className="text-right">Expenses</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead>Marka</TableHead>
                                                <TableHead className="text-right">Crate Qty</TableHead>
                                                <TableHead>Crate Party</TableHead>
                                                <TableHead className="text-right">Supplier Rate</TableHead>
                                                <TableHead className="text-right">Supplier Amt</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {summary.items.map((item, itemIdx) => (
                                                <TableRow key={item.id}>
                                                  <TableCell>{itemIdx + 1}</TableCell>
                                                  <TableCell>{item.itemName}</TableCell>
                                                  <TableCell>{item.customerName}</TableCell>
                                                  <TableCell className="text-right">{formatNumber(item.nug, 0)}</TableCell>
                                                  <TableCell className="text-right">{formatNumber(item.weight)}</TableCell>
                                                  <TableCell className="text-right">₹{formatNumber(item.price)}</TableCell>
                                                  <TableCell className="text-center uppercase">{(item.per || 'nug').toString().toUpperCase()}</TableCell>
                                                  <TableCell className="text-right">₹{formatNumber(item.basicAmount)}</TableCell>
                                                  <TableCell className="text-right">₹{formatNumber(item.expenses)}</TableCell>
                                                  <TableCell className="text-right font-semibold">₹{formatNumber(item.amount)}</TableCell>
                                                  <TableCell>{item.crateMarkaName || '-'}</TableCell>
                                                  <TableCell className="text-right">{item.crateQty ?? '-'}</TableCell>
                                                  <TableCell>{item.cratePartyName || '-'}</TableCell>
                                                  <TableCell className="text-right">₹{formatNumber(item.supplierRate || 0)}</TableCell>
                                                  <TableCell className="text-right">₹{formatNumber(item.sellerAmount || 0)}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-sm mb-2">Charges</h4>
                                        {summary.charges.length > 0 ? (
                                          <div className="overflow-x-auto rounded-md border bg-background">
                                            <Table>
                                              <TableHeader>
                                                <TableRow>
                                                  <TableHead>Charge</TableHead>
                                                  <TableHead className="text-right">On Value</TableHead>
                                                  <TableHead className="text-right">Per</TableHead>
                                                  <TableHead className="text-right">At Rate</TableHead>
                                                  <TableHead className="text-center">+/−</TableHead>
                                                  <TableHead className="text-right">Amount</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {summary.charges.map((charge) => (
                                                  <TableRow key={charge.id}>
                                                    <TableCell>{charge.label}</TableCell>
                                                    <TableCell className="text-right">₹{formatNumber(charge.onValue)}</TableCell>
                                                    <TableCell className="text-right">
                                                      {charge.per != null ? formatNumber(charge.per) : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right">₹{formatNumber(charge.atRate)}</TableCell>
                                                    <TableCell className="text-center">{charge.plusMinus}</TableCell>
                                                    <TableCell className="text-right">
                                                      {`${charge.plusMinus === '-' ? '-' : '+'}₹${formatNumber(charge.amount)}`}
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground">No charges recorded for this sale.</p>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
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

      <div className="shrink-0 border-t bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-3 overflow-x-auto">
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
                <TableCell className="text-center font-semibold border-r">₹{formatNumber(summaryTotals.totalSellerAmount)}</TableCell>
                <TableCell className="text-center font-semibold border-r">{formatNumber(summaryTotals.totalCrateQty, 0)}</TableCell>
                <TableCell className="text-center font-semibold border-r">{formatNumber(summaryTotals.totalNug, 0)}</TableCell>
                <TableCell className="text-center font-semibold border-r">{formatNumber(summaryTotals.totalWeight)}</TableCell>
                <TableCell className="text-center font-semibold border-r">₹{formatNumber(summaryTotals.totalBasic)}</TableCell>
                <TableCell className="text-center font-semibold border-r">₹{formatNumber(summaryTotals.totalExpenses)}</TableCell>
                <TableCell className="text-center font-semibold">₹{formatNumber(summaryTotals.totalAmount)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <ReportExportModal
        open={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        onPreview={handlePreview}
        previewLabel="Preview PDF"
        isPreviewProcessing={isPreviewLoading}
        title="Export Quick Sale Register"
      />
      <ReportPreviewModal
        open={isPreviewOpen}
        title="Quick Sale Register Preview"
        pdfData={previewData}
        filename={previewFilename}
        isLoading={isPreviewLoading}
        onDownload={() => handleExport('pdf')}
        onClose={() => {
          setIsPreviewOpen(false)
          setPreviewData(null)
        }}
      />
    </div>
  )
}
