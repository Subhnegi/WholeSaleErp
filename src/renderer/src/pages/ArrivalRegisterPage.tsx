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

interface ArrivalRegisterItemRow {
  id: string
  arrivalId: string
  date: string
  voucherNo: string
  arrivalTypeId?: string
  arrivalTypeName?: string
  vehicleChallanNo?: string
  partyId?: string
  partyName?: string
  storeId?: string | null
  storeName?: string
  itemId?: string
  itemName?: string
  lotNo?: string | null
  nug: number
  weight: number
  crateMarkaName?: string | null
  crateQty?: number | null
  crateRate?: number | null
  crateValue?: number | null
}

interface ArrivalRegisterCharge {
  id: string
  label: string
  onValue: number
  per: number | null
  atRate: number | null
  count: number | null
  plusMinus: '+' | '-'
  amount: number
}

interface ArrivalRegisterSummary {
  id: string
  date: string
  voucherNo: string
  arrivalTypeIds: string[]
  arrivalTypeNames: string[]
  partyIds: string[]
  partyNames: string[]
  storeIds: string[]
  storeNames: string[]
  vehicleNos: string[]
  itemIds: string[]
  itemNames: string[]
  lotNos: string[]
  totalItemCount: number
  totalCrateQty: number
  totalNug: number
  totalWeight: number
  totalBasic: number
  totalExpenses: number
  totalNet: number
  totalSellerAmount: number
  chargesTotal: number
  items: ArrivalRegisterItemRow[]
  charges: ArrivalRegisterCharge[]
}

interface ArrivalMeta {
  id: string
  date: string
  voucherNo: string
  arrivalTypeId?: string
  arrivalTypeName?: string
  vehicleChallanNo?: string
  partyId?: string
  partyName?: string
  storeId?: string | null
  storeName?: string
  totalNug: number
  totalKg: number
  basicAmt: number
  chargesPlus: number
  chargesMinus: number
  netAmt: number
  totalCrateQty: number
  itemCount: number
  charges: ArrivalRegisterCharge[]
}

interface GroupedRow {
  id: string
  groupName: string
  totalArrivals: number
  totalNug: number
  totalWeight: number
  totalBasic: number
  totalCharges: number
  totalNet: number
  totalCrateQty: number
  totalSellerAmount: number
}

const DETAIL_EXPORT_COLUMNS = [
  'Date',
  'Voucher',
  'Arrival Type',
  'Vehicle/Challan',
  'Party',
  'Store',
  'Item',
  'Lot',
  'Nug',
  'Weight',
  'Marka',
  'Crate Qty',
  'Crate Rate',
  'Crate Value',
  'Total Nug',
  'Total Weight',
  'Basic Amount',
  'Charges (Net)',
  'Net Amount'
] as const

const GROUPED_EXPORT_COLUMNS = [
  'Group',
  'Arrivals',
  'Total Nug',
  'Total Weight',
  'Total Basic',
  'Total Charges',
  'Total Net',
  'Crate Qty'
] as const

type ExportRow = Record<string, string | number>

const SUMMARY_COLUMN_COUNT = 16

const SESSION_FROM_KEY = 'arrivalRegister.fromDate'
const SESSION_TO_KEY = 'arrivalRegister.toDate'

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

export function ArrivalRegisterPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((state) => state.company)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<ArrivalRegisterItemRow[]>([])
  const [arrivalMeta, setArrivalMeta] = useState<Record<string, ArrivalMeta>>({})
  const [loading, setLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [arrivalTypeFilter, setArrivalTypeFilter] = useState('all')
  const [partyFilter, setPartyFilter] = useState('all')
  const [storeFilter, setStoreFilter] = useState('all')
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

  const [arrivalTypes, setArrivalTypes] = useState<any[]>([])
  const [parties, setParties] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
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
      console.error('Failed to read arrival register dates from session storage', error)
    }

    setFromDate(initialFrom)
    setToDate(initialTo)

    try {
      sessionStorage.setItem(SESSION_FROM_KEY, initialFrom)
      sessionStorage.setItem(SESSION_TO_KEY, initialTo)
    } catch (error) {
      console.error('Failed to persist arrival register dates to session storage', error)
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
  }, [activeCompany, fromDate, toDate, arrivalTypeFilter, partyFilter, storeFilter, itemFilter])

  const loadMasterData = async () => {
    if (!activeCompany) return

    try {
      const [arrivalTypeResp, accountsResp, storesResp, itemsResp] = await Promise.all([
        window.api.arrivalType.listByCompany(activeCompany.id),
        window.api.account.listByCompany(activeCompany.id),
        window.api.store.listByCompany(activeCompany.id),
        window.api.item.listByCompany(activeCompany.id)
      ])

      if (Array.isArray(arrivalTypeResp)) {
        setArrivalTypes(arrivalTypeResp)
      } else if (arrivalTypeResp?.success && Array.isArray(arrivalTypeResp.data)) {
        setArrivalTypes(arrivalTypeResp.data)
      }

      if (accountsResp?.success && Array.isArray(accountsResp.data)) {
        const allAccounts = accountsResp.data
        const supplierAccounts = allAccounts.filter((account: any) => {
          const groupName = account.accountGroup?.name?.toLowerCase() || ''
          return (
            groupName.includes('supplier') ||
            groupName.includes('creditor') ||
            groupName.includes('sundry') ||
            account.accountName?.toLowerCase() === 'mall khata purchase a/c'
          )
        })
        setParties(supplierAccounts)
      }

      if (Array.isArray(storesResp)) {
        setStores(storesResp)
      }

      if (itemsResp?.success && Array.isArray(itemsResp.data)) {
        setItems(itemsResp.data)
      }
    } catch (error) {
      console.error('Failed to load arrival master data', error)
    }
  }

  const loadRegisterData = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const filters: any = {
        startDate: fromDate,
        endDate: toDate
      }
      if (arrivalTypeFilter !== 'all') {
        filters.arrivalTypeId = arrivalTypeFilter
      }
      if (partyFilter !== 'all') {
        filters.partyId = partyFilter
      }
      if (storeFilter !== 'all') {
        filters.storeId = storeFilter
      }

      const response = await window.api.arrival.list(activeCompany.id, filters)
      if (response.success && Array.isArray(response.data)) {
        const flattened: ArrivalRegisterItemRow[] = []
        const meta: Record<string, ArrivalMeta> = {}

        response.data.forEach((arrival: any) => {
          const arrivalId = arrival.id
          const arrivalDate = arrival.date || ''
          const voucherNo = arrival.voucherNo || ''
          const arrivalTypeName = arrival.arrivalTypeName || arrival.arrivalType?.name || 'Unknown Type'
          const vehicleNo = arrival.vehicleChallanNo || arrival.challanNo || ''
          const partyName = arrival.partyName || 'Unknown Party'
          const storeName = arrival.storeName || arrival.store?.name || 'No Store'

          const charges: ArrivalRegisterCharge[] = Array.isArray(arrival.arrivalCharges)
            ? arrival.arrivalCharges.map((charge: any, index: number) => {
                const label =
                  charge.chargesHeadName ||
                  charge.otherChargesHead?.headingName ||
                  `Charge ${index + 1}`
                const onValue = Number(charge.onValue) || 0
                const perValue = charge.per ?? null
                const atRate = charge.atRate != null ? Number(charge.atRate) : null
                const count = charge.no != null ? Number(charge.no) : null
                const plusMinus: '+' | '-' = charge.plusMinus === '-' ? '-' : '+'
                const amount = Math.abs(Number(charge.amount) || 0)
                return {
                  id: charge.id || `${arrivalId}-charge-${index}`,
                  label,
                  onValue,
                  per: perValue,
                  atRate,
                  count,
                  plusMinus,
                  amount
                }
              })
            : []

          const chargesPlus = charges
            .filter((charge) => charge.plusMinus === '+')
            .reduce((sum, charge) => sum + charge.amount, 0)
          const chargesMinus = charges
            .filter((charge) => charge.plusMinus === '-')
            .reduce((sum, charge) => sum + charge.amount, 0)

          const arrivalItems = Array.isArray(arrival.items) ? arrival.items : []
          let totalCrateQty = 0

          arrivalItems.forEach((item: any, idx: number) => {
            const crateQty = Number(item.crateQty) || 0
            totalCrateQty += crateQty
            flattened.push({
              id: `${arrivalId}-${item.id || idx}`,
              arrivalId,
              date: arrivalDate,
              voucherNo,
              arrivalTypeId: arrival.arrivalTypeId,
              arrivalTypeName,
              vehicleChallanNo: vehicleNo,
              partyId: arrival.partyId,
              partyName,
              storeId: arrival.storeId ?? null,
              storeName,
              itemId: item.itemId,
              itemName: item.itemName || 'Unknown Item',
              lotNo: item.lotNoVariety || null,
              nug: Number(item.nug) || 0,
              weight: Number(item.kg) || 0,
              crateMarkaName: item.crateMarkaName || null,
              crateQty: crateQty || null,
              crateRate: item.crateRate != null ? Number(item.crateRate) : null,
              crateValue: item.crateValue != null ? Number(item.crateValue) : null
            })
          })

          meta[arrivalId] = {
            id: arrivalId,
            date: arrivalDate,
            voucherNo,
            arrivalTypeId: arrival.arrivalTypeId,
            arrivalTypeName,
            vehicleChallanNo: vehicleNo,
            partyId: arrival.partyId,
            partyName,
            storeId: arrival.storeId ?? null,
            storeName,
            totalNug: Number(arrival.totalNug) || 0,
            totalKg: Number(arrival.totalKg) || 0,
            basicAmt: Number(arrival.basicAmt) || 0,
            chargesPlus,
            chargesMinus,
            netAmt: Number(arrival.netAmt) || 0,
            totalCrateQty,
            itemCount: arrivalItems.length,
            charges
          }
        })

        setRows(flattened)
        setArrivalMeta(meta)
        setCurrentPage(1)
      } else {
        setRows([])
        setArrivalMeta({})
        if (response.error) {
          toast.error(response.error)
        }
      }
    } catch (error: any) {
      console.error('Failed to load arrival register', error)
      toast.error(error?.message || 'Failed to load arrival register')
      setRows([])
      setArrivalMeta({})
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
      console.error('Failed to persist arrival register from date', error)
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
      console.error('Failed to persist arrival register to date', error)
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
    setArrivalTypeFilter('all')
    setPartyFilter('all')
    setStoreFilter('all')
    setItemFilter('all')
    setGroupBy('none')
    setSortBy(null)
    setSortDir('desc')
    setCurrentPage(1)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, arrivalTypeFilter, partyFilter, storeFilter, itemFilter, groupBy])

  const filteredRows = useMemo(() => {
    let data = rows

    if (arrivalTypeFilter !== 'all') {
      data = data.filter((row) => row.arrivalTypeId === arrivalTypeFilter)
    }
    if (partyFilter !== 'all') {
      data = data.filter((row) => row.partyId === partyFilter)
    }
    if (storeFilter !== 'all') {
      data = data.filter((row) => row.storeId === storeFilter)
    }
    if (itemFilter !== 'all') {
      data = data.filter((row) => row.itemId === itemFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      data = data.filter((row) =>
        (row.voucherNo || '').toLowerCase().includes(q) ||
        (row.arrivalTypeName || '').toLowerCase().includes(q) ||
        (row.partyName || '').toLowerCase().includes(q) ||
        (row.storeName || '').toLowerCase().includes(q) ||
        (row.itemName || '').toLowerCase().includes(q) ||
        (row.lotNo || '').toLowerCase().includes(q) ||
        (row.vehicleChallanNo || '').toLowerCase().includes(q) ||
        (row.crateMarkaName || '').toLowerCase().includes(q)
      )
    }
    return [...data]
  }, [rows, searchQuery, arrivalTypeFilter, partyFilter, storeFilter, itemFilter])

  const arrivalSummaries = useMemo(() => {
    const summaryMap = new Map<string, ArrivalRegisterSummary>()

    filteredRows.forEach((row) => {
      const meta = arrivalMeta[row.arrivalId]
      if (!summaryMap.has(row.arrivalId)) {
        const charges = meta?.charges ?? []
        const chargesTotal = charges.reduce((sum, charge) => {
          const signed = charge.plusMinus === '-' ? -charge.amount : charge.amount
          return sum + signed
        }, 0)

        summaryMap.set(row.arrivalId, {
          id: row.arrivalId,
          date: meta?.date || row.date,
          voucherNo: meta?.voucherNo || row.voucherNo || '',
          arrivalTypeIds: meta?.arrivalTypeId ? [meta.arrivalTypeId] : [],
          arrivalTypeNames: meta?.arrivalTypeName ? [meta.arrivalTypeName] : row.arrivalTypeName ? [row.arrivalTypeName] : ['Unknown Type'],
          partyIds: meta?.partyId ? [meta.partyId] : [],
          partyNames: meta?.partyName ? [meta.partyName] : row.partyName ? [row.partyName] : ['Unknown Party'],
          storeIds: meta?.storeId ? [meta.storeId] : [],
          storeNames: meta?.storeName ? [meta.storeName] : row.storeName ? [row.storeName] : ['No Store'],
          vehicleNos: meta?.vehicleChallanNo ? [meta.vehicleChallanNo] : row.vehicleChallanNo ? [row.vehicleChallanNo] : [],
          itemIds: [],
          itemNames: [],
          lotNos: [],
          totalItemCount: meta?.itemCount ?? 0,
          totalCrateQty: meta?.totalCrateQty ?? 0,
          totalNug: meta?.totalNug ?? 0,
          totalWeight: meta?.totalKg ?? 0,
          totalBasic: meta?.basicAmt ?? 0,
          totalExpenses: meta?.chargesPlus ?? 0,
          totalNet: meta?.netAmt ?? 0,
          totalSellerAmount: meta?.netAmt ?? 0,
          chargesTotal,
          items: [],
          charges
        })
      }

      const summary = summaryMap.get(row.arrivalId)!
      summary.items.push(row)
      summary.totalCrateQty += Number(row.crateQty) || 0
      summary.totalItemCount = summary.items.length

      if (row.itemId && !summary.itemIds.includes(row.itemId)) {
        summary.itemIds.push(row.itemId)
      }
      if (row.itemName && !summary.itemNames.includes(row.itemName)) {
        summary.itemNames.push(row.itemName)
      }
      if (row.lotNo && !summary.lotNos.includes(row.lotNo)) {
        summary.lotNos.push(row.lotNo)
      }
    })

    const summaries = Array.from(summaryMap.values())
    const direction = sortDir === 'asc' ? 1 : -1
    const getPrimaryText = (values: string[]) => values[0] || ''

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
        case 'arrivalType':
          return getPrimaryText(a.arrivalTypeNames).localeCompare(getPrimaryText(b.arrivalTypeNames)) * direction
        case 'party':
          return getPrimaryText(a.partyNames).localeCompare(getPrimaryText(b.partyNames)) * direction
        case 'store':
          return getPrimaryText(a.storeNames).localeCompare(getPrimaryText(b.storeNames)) * direction
        case 'itemCount':
          return (a.totalItemCount - b.totalItemCount) * direction
        case 'totalNug':
          return (a.totalNug - b.totalNug) * direction
        case 'totalWeight':
          return (a.totalWeight - b.totalWeight) * direction
        case 'totalBasic':
          return (a.totalBasic - b.totalBasic) * direction
        case 'chargesTotal':
          return (a.chargesTotal - b.chargesTotal) * direction
        case 'totalNet':
          return (a.totalNet - b.totalNet) * direction
        case 'totalCrateQty':
          return (a.totalCrateQty - b.totalCrateQty) * direction
        case 'totalSellerAmount':
          return (a.totalSellerAmount - b.totalSellerAmount) * direction
        default:
          return 0
      }
    })

    return summaries
  }, [filteredRows, arrivalMeta, sortBy, sortDir])

  const groupedData = useMemo(() => {
    if (groupBy === 'none') return null

    const groups = new Map<string, GroupedRow>()

    arrivalSummaries.forEach((summary) => {
      let key = 'group'
      let label = ''
      switch (groupBy) {
        case 'arrivalType':
          key = summary.arrivalTypeIds[0] || 'no-arrival-type'
          label = summary.arrivalTypeNames[0] || 'Unknown Type'
          break
        case 'party':
          key = summary.partyIds[0] || 'no-party'
          label = summary.partyNames[0] || 'Unknown Party'
          break
        case 'store':
          key = summary.storeIds[0] || 'no-store'
          label = summary.storeNames[0] || 'No Store'
          break
        case 'date':
          key = summary.date || 'no-date'
          label = summary.date || 'No Date'
          break
        default:
          key = 'group'
          label = 'Group'
      }

      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          groupName: label,
          totalArrivals: 0,
          totalNug: 0,
          totalWeight: 0,
          totalBasic: 0,
          totalCharges: 0,
          totalNet: 0,
          totalCrateQty: 0,
          totalSellerAmount: 0
        })
      }

      const group = groups.get(key)!
      group.totalArrivals += 1
      group.totalNug += summary.totalNug
      group.totalWeight += summary.totalWeight
      group.totalBasic += summary.totalBasic
      group.totalCharges += summary.chargesTotal
      group.totalNet += summary.totalNet
      group.totalCrateQty += summary.totalCrateQty
      group.totalSellerAmount += summary.totalSellerAmount
    })

    return Array.from(groups.values()).sort((a, b) => a.groupName.localeCompare(b.groupName))
  }, [arrivalSummaries, groupBy])

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
      const allIds = arrivalSummaries.map((summary) => summary.id)
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
      arrivalSummaries.forEach((summary) => {
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
  }, [arrivalSummaries])

  const dataToDisplay = groupBy !== 'none' ? groupedData || [] : arrivalSummaries
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
        Arrivals: Number(group.totalArrivals || 0),
        'Total Nug': Number(group.totalNug || 0),
        'Total Weight': Number(group.totalWeight || 0),
        'Total Basic': Number(group.totalBasic || 0),
        'Total Charges': Number(group.totalCharges || 0),
        'Total Net': Number(group.totalNet || 0),
        'Crate Qty': Number(group.totalCrateQty || 0)
      }))
      return { columns: GROUPED_EXPORT_COLUMNS, rows: groupRows, variant: 'grouped' as const }
    }

    const detailRows: ExportRow[] = filteredRows.map((row) => {
      const meta = arrivalMeta[row.arrivalId]
      return {
        Date: row.date,
        Voucher: row.voucherNo || '',
        'Arrival Type': meta?.arrivalTypeName || row.arrivalTypeName || '',
        'Vehicle/Challan': meta?.vehicleChallanNo || row.vehicleChallanNo || '',
        Party: meta?.partyName || row.partyName || '',
        Store: meta?.storeName || row.storeName || 'No Store',
        Item: row.itemName || '',
        Lot: row.lotNo || '',
        Nug: Number(row.nug || 0),
        Weight: Number(row.weight || 0),
        Marka: row.crateMarkaName || '',
        'Crate Qty': row.crateQty ?? '',
        'Crate Rate': row.crateRate ?? '',
        'Crate Value': row.crateValue ?? '',
        'Total Nug': Number(meta?.totalNug || 0),
        'Total Weight': Number(meta?.totalKg || 0),
        'Basic Amount': Number(meta?.basicAmt || 0),
        'Charges (Net)': Number((meta?.chargesPlus || 0) - (meta?.chargesMinus || 0)),
        'Net Amount': Number(meta?.netAmt || 0)
      }
    })
    return { columns: DETAIL_EXPORT_COLUMNS, rows: detailRows, variant: 'detail' as const }
  }

  const buildFilenameBase = (variant: 'grouped' | 'detail') =>
    [
      'arrival-register',
      fromDate || 'start',
      'to',
      toDate || 'end',
      variant === 'grouped' ? `grouped-by-${groupBy}` : 'detailed'
    ]
      .filter(Boolean)
      .join('_')

  const generatePdfDocument = (dataset: ReturnType<typeof buildExportDataset>) => {
    const doc = new jsPDF({
      orientation: dataset.columns.length > 8 ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4'
    })
    autoTable(doc, {
      head: [[...dataset.columns] as string[]],
      body: dataset.rows.map((row) => dataset.columns.map((column) => String(row[column] ?? ''))),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      theme: 'grid',
      margin: { top: 40 }
    })
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
      console.error('Failed to preview arrival register', error)
      toast.error(error?.message || 'Failed to preview arrival register')
      setIsPreviewOpen(false)
      setPreviewData(null)
    } finally {
      setIsExportModalOpen(false)
      setIsPreviewLoading(false)
    }
  }

  const summaryTotals = useMemo(() => {
    return arrivalSummaries.reduce(
      (acc, summary) => ({
        totalSellerAmount: acc.totalSellerAmount + summary.totalSellerAmount,
        totalCrateQty: acc.totalCrateQty + summary.totalCrateQty,
        totalNug: acc.totalNug + summary.totalNug,
        totalWeight: acc.totalWeight + summary.totalWeight,
        totalBasic: acc.totalBasic + summary.totalBasic,
        totalExpenses: acc.totalExpenses + summary.totalExpenses,
        totalNet: acc.totalNet + summary.totalNet
      }),
      {
        totalSellerAmount: 0,
        totalCrateQty: 0,
        totalNug: 0,
        totalWeight: 0,
        totalBasic: 0,
        totalExpenses: 0,
        totalNet: 0
      }
    )
  }, [arrivalSummaries])

  const handleExport = (type: 'excel' | 'pdf' | 'csv') => {
    const dataset = buildExportDataset()
    if (dataset.rows.length === 0) {
      toast.info('No data available to export for the selected filters')
      setIsExportModalOpen(false)
      return
    }

    const filenameBase = buildFilenameBase(dataset.variant)

    try {
      if (type === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(dataset.rows, { header: [...dataset.columns] as string[] })
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Arrival Register')
        XLSX.writeFile(workbook, `${filenameBase}.xlsx`)
      } else if (type === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(dataset.rows, { header: [...dataset.columns] as string[] })
        const csvData = XLSX.utils.sheet_to_csv(worksheet)
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
        triggerFileDownload(blob, `${filenameBase}.csv`)
      } else {
        const doc = generatePdfDocument(dataset)
        doc.save(`${filenameBase}.pdf`)
      }
      toast.success(`Arrival register exported as ${type.toUpperCase()}`)
    } catch (error: any) {
      console.error('Failed to export arrival register', error)
      toast.error(error?.message || 'Failed to export arrival register')
    } finally {
      setIsExportModalOpen(false)
    }
  }

  const hasActiveSort = !!sortBy
  const hasFilters =
    searchQuery !== '' ||
    arrivalTypeFilter !== 'all' ||
    partyFilter !== 'all' ||
    storeFilter !== 'all' ||
    itemFilter !== 'all' ||
    groupBy !== 'none'

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <ClipboardList className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">No Company Selected</h2>
        <p className="text-muted-foreground">Select a company to view the arrival register</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Arrival Register</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Day-wise arrival breakdown with item, charge, and crate insights
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
                  placeholder="Search voucher, party, item, vehicle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />
                <Select value={arrivalTypeFilter} onValueChange={setArrivalTypeFilter}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Arrival Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Arrival Types</SelectItem>
                    {arrivalTypes.map((type: any) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={partyFilter} onValueChange={setPartyFilter}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Party" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parties</SelectItem>
                    {parties.map((party: any) => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store: any) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name || store.storeName}
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
                    {items.map((item: any) => (
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
                    <SelectItem value="arrivalType">Arrival Type</SelectItem>
                    <SelectItem value="party">Party</SelectItem>
                    <SelectItem value="store">Store</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
                {(hasActiveSort || hasFilters) && (
                  <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-8 text-xs">
                    <FilterX className="h-3 w-3 mr-2" />
                    Clear All
                  </Button>
                )}
                {groupBy === 'none' && arrivalSummaries.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={expandAllSummaries}
                      className="h-8 text-xs"
                    >
                      Expand All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={collapseAllSummaries}
                      className="h-8 text-xs"
                    >
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
                    {arrivalTypeFilter !== 'all' && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">Arrival Type</div>
                    )}
                    {partyFilter !== 'all' && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">Party</div>
                    )}
                    {storeFilter !== 'all' && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">Store</div>
                    )}
                    {itemFilter !== 'all' && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">Item</div>
                    )}
                    {groupBy !== 'none' && (
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        Grouped by: {groupBy}
                      </div>
                    )}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table className="min-w-[1200px]">
                    <TableHeader>
                      {groupBy !== 'none' ? (
                        <TableRow className="bg-gray-100">
                          <TableHead className="w-12 text-center font-bold">S.N</TableHead>
                          <TableHead className="font-bold">Group</TableHead>
                          <TableHead className="text-right font-bold">Arrivals</TableHead>
                          <TableHead className="text-right font-bold">Nug</TableHead>
                          <TableHead className="text-right font-bold">Wt</TableHead>
                          <TableHead className="text-right font-bold">Basic</TableHead>
                          <TableHead className="text-right font-bold">Charges</TableHead>
                          <TableHead className="text-right font-bold">Net</TableHead>
                          <TableHead className="text-right font-bold">Crate Qty</TableHead>
                        </TableRow>
                      ) : (
                        <TableRow className="bg-gray-100">
                          <TableHead className="w-10 text-center font-bold" />
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
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2" onClick={() => handleSort('arrivalType')}>
                              <span>Arrival Type</span>
                              {renderSortIndicators('arrivalType')}
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">Vehicle/Challan</TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2" onClick={() => handleSort('party')}>
                              <span>Party</span>
                              {renderSortIndicators('party')}
                            </button>
                          </TableHead>
                          <TableHead className="font-bold">
                            <button type="button" className="flex items-center gap-2" onClick={() => handleSort('store')}>
                              <span>Store</span>
                              {renderSortIndicators('store')}
                            </button>
                          </TableHead>
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
                              onClick={() => handleSort('totalNet')}
                            >
                              <span>Net</span>
                              {renderSortIndicators('totalNet')}
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
                            colSpan={groupBy !== 'none' ? 8 : SUMMARY_COLUMN_COUNT}
                            className="text-center py-8"
                          >
                            <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : dataToDisplay.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={groupBy !== 'none' ? 8 : SUMMARY_COLUMN_COUNT}
                            className="text-center text-muted-foreground py-8"
                          >
                            {rows.length === 0 ? 'No arrival entries for this period' : 'No rows match the filters'}
                          </TableCell>
                        </TableRow>
                      ) : groupBy !== 'none' ? (
                        (paginatedData as GroupedRow[]).map((group, idx) => (
                          <TableRow key={group.id}>
                            <TableCell className="text-center">{startIndex + idx + 1}</TableCell>
                            <TableCell className="font-medium">{group.groupName}</TableCell>
                            <TableCell className="text-right">{group.totalArrivals}</TableCell>
                            <TableCell className="text-right">{formatNumber(group.totalNug, 0)}</TableCell>
                            <TableCell className="text-right">{formatNumber(group.totalWeight)}</TableCell>
                            <TableCell className="text-right">₹{formatNumber(group.totalBasic)}</TableCell>
                            <TableCell className="text-right">
                              {group.totalCharges === 0
                                ? '₹0.00'
                                : `${group.totalCharges < 0 ? '-' : ''}₹${formatNumber(Math.abs(group.totalCharges))}`}
                            </TableCell>
                            <TableCell className="text-right font-semibold">₹{formatNumber(group.totalNet)}</TableCell>
                            <TableCell className="text-right">{formatNumber(group.totalCrateQty, 0)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        (paginatedData as ArrivalRegisterSummary[]).map((summary, idx) => {
                          const isExpanded = expandedSummaries.has(summary.id)
                          const vehicleDisplay = summary.vehicleNos.length > 0 ? summary.vehicleNos[0] : '-'
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
                                <TableCell className="align-middle">{buildDisplayValue(summary.arrivalTypeNames)}</TableCell>
                                <TableCell className="align-middle">{vehicleDisplay || '-'}</TableCell>
                                <TableCell className="align-middle">{buildDisplayValue(summary.partyNames)}</TableCell>
                                <TableCell className="align-middle">{buildDisplayValue(summary.storeNames)}</TableCell>
                                <TableCell className="text-center align-middle">{summary.totalItemCount}</TableCell>
                                <TableCell className="text-right align-middle">{formatNumber(summary.totalNug, 0)}</TableCell>
                                <TableCell className="text-right align-middle">{formatNumber(summary.totalWeight)}</TableCell>
                                <TableCell className="text-right align-middle">₹{formatNumber(summary.totalBasic)}</TableCell>
                                <TableCell className="text-right align-middle">
                                  {summary.chargesTotal === 0
                                    ? '₹0.00'
                                    : `${summary.chargesTotal < 0 ? '-' : ''}₹${formatNumber(Math.abs(summary.chargesTotal))}`}
                                </TableCell>
                                <TableCell className="text-right align-middle font-semibold">₹{formatNumber(summary.totalNet)}</TableCell>
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
                                          <span className="text-muted-foreground">Charges (+)</span>
                                          <div className="font-semibold">₹{formatNumber(summary.totalExpenses)}</div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Charges (Net)</span>
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
                                          <div className="font-semibold">₹{formatNumber(summary.totalNet)}</div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Items</span>
                                          <div className="font-semibold">{summary.totalItemCount}</div>
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
                                                <TableHead>Lot</TableHead>
                                                <TableHead className="text-right">Nug</TableHead>
                                                <TableHead className="text-right">Wt</TableHead>
                                                <TableHead>Marka</TableHead>
                                                <TableHead className="text-right">Crate Qty</TableHead>
                                                <TableHead className="text-right">Crate Rate</TableHead>
                                                <TableHead className="text-right">Crate Value</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {summary.items.map((item, itemIdx) => (
                                                <TableRow key={item.id}>
                                                  <TableCell>{itemIdx + 1}</TableCell>
                                                  <TableCell>{item.itemName}</TableCell>
                                                  <TableCell>{item.lotNo || '-'}</TableCell>
                                                  <TableCell className="text-right">{formatNumber(item.nug, 0)}</TableCell>
                                                  <TableCell className="text-right">{formatNumber(item.weight)}</TableCell>
                                                  <TableCell>{item.crateMarkaName || '-'}</TableCell>
                                                  <TableCell className="text-right">{item.crateQty ?? '-'}</TableCell>
                                                  <TableCell className="text-right">
                                                    {item.crateRate != null ? `₹${formatNumber(item.crateRate)}` : '—'}
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                    {item.crateValue != null ? `₹${formatNumber(item.crateValue)}` : '—'}
                                                  </TableCell>
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
                                                  <TableHead className="text-right">Count</TableHead>
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
                                                    <TableCell className="text-right">
                                                      {charge.atRate != null ? `₹${formatNumber(charge.atRate)}` : '—'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                      {charge.count != null ? formatNumber(charge.count) : '—'}
                                                    </TableCell>
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
                                          <p className="text-sm text-muted-foreground">No charges recorded for this arrival.</p>
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
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center font-semibold border-r">Arrivals</TableHead>
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
                <TableCell className="text-center font-semibold border-r">{arrivalSummaries.length}</TableCell>
                <TableCell className="text-center font-semibold border-r">₹{formatNumber(summaryTotals.totalSellerAmount)}</TableCell>
                <TableCell className="text-center font-semibold border-r">{formatNumber(summaryTotals.totalCrateQty, 0)}</TableCell>
                <TableCell className="text-center font-semibold border-r">{formatNumber(summaryTotals.totalNug, 0)}</TableCell>
                <TableCell className="text-center font-semibold border-r">{formatNumber(summaryTotals.totalWeight)}</TableCell>
                <TableCell className="text-center font-semibold border-r">₹{formatNumber(summaryTotals.totalBasic)}</TableCell>
                <TableCell className="text-center font-semibold border-r">₹{formatNumber(summaryTotals.totalExpenses)}</TableCell>
                <TableCell className="text-center font-semibold">₹{formatNumber(summaryTotals.totalNet)}</TableCell>
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
        title="Export Arrival Register"
      />
      <ReportPreviewModal
        open={isPreviewOpen}
        title="Arrival Register Preview"
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
