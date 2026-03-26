import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { toast } from 'sonner'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectTabTransactionState,
  startTabTransaction,
  endTabTransaction
} from '@/store/slices/tabSlice'
import { AccountFormModal } from '@/components/AccountFormModal'
import { ItemFormModal } from '@/components/ItemFormModal'
import { cn } from '@/lib/utils'

interface SellerBillEntryFormPageProps {
  tabId: string
  currentRoute: string
}

interface AccountOption {
  id: string
  name: string
}

interface ItemMaster {
  id: string
  itemName: string
}

interface ChargeHead {
  id: string
  headingName: string
  feedAs?: string
  chargeType?: 'plus' | 'minus'
}

interface ItemRow {
  id: string
  itemId: string
  stockSaleItemId?: string | null
  itemName: string
  lotNo: string
  nug: number
  kg: number
  rate: number
  per: 'nug' | 'kg'
  amount: number
}

interface ChargeRow {
  id: string
  otherChargesId: string
  chargesHeadName: string
  arrivalChargeId?: string | null
  onValue: number | null
  per: number | null
  atRate: number | null
  no: number | null
  plusMinus: '+' | '-'
  amount: number
}

interface FormSnapshot {
  voucherNo: string
  billDate: string
  partyId: string
  vehicleNo: string
  billingMode: 'automatic' | 'manual' | ''
  arrivalExpensesInput: string
  roundOffMode: 'none' | 'up' | 'down'
  itemRows: ItemRow[]
  chargeRows: ChargeRow[]
}

export default function SellerBillEntryFormPage({
  tabId,
  currentRoute
}: SellerBillEntryFormPageProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  const tabTransactionState = useAppSelector((state) => selectTabTransactionState(state, tabId))

  const isEditMode = currentRoute.startsWith('/entries/seller-bill/edit/')
  const billId = isEditMode ? (currentRoute.split('/').at(-1) ?? '') : ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const initialStateRef = useRef<string>('')
  const lastVehicleSupplierRef = useRef<string>('')
  const partyIdRef = useRef<string>('')

  const [voucherNo, setVoucherNo] = useState('')
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0])
  const [partyId, setPartyId] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [billingMode, setBillingMode] = useState<'automatic' | 'manual' | ''>('')
  const [arrivalExpensesInput, setArrivalExpensesInput] = useState('0')
  const [roundOffMode, setRoundOffMode] = useState<'none' | 'up' | 'down'>('none')

  const [partyOptions, setPartyOptions] = useState<AccountOption[]>([])
  const [itemOptions, setItemOptions] = useState<ItemMaster[]>([])
  const [chargeHeads, setChargeHeads] = useState<ChargeHead[]>([])
  const [vehicleOptions, setVehicleOptions] = useState<ComboboxOption[]>([])

  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showVehicleDialog, setShowVehicleDialog] = useState(false)
  const [newVehicleValue, setNewVehicleValue] = useState('')

  const [itemRows, setItemRows] = useState<ItemRow[]>([])
  const [chargeRows, setChargeRows] = useState<ChargeRow[]>([])
  const autoPopulateReadyRef = useRef(!isEditMode)

  const [selectedItemId, setSelectedItemId] = useState('')
  const [itemLotNo, setItemLotNo] = useState('')
  const [itemNug, setItemNug] = useState('')
  const [itemKg, setItemKg] = useState('')
  const [itemRate, setItemRate] = useState('')
  const [itemPer, setItemPer] = useState<'nug' | 'kg'>('nug')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const [selectedChargeHeadId, setSelectedChargeHeadId] = useState('')
  const [chargeOnValue, setChargeOnValue] = useState('')
  const [chargePer, setChargePer] = useState('')
  const [chargeAtRate, setChargeAtRate] = useState('')
  const [chargeNo, setChargeNo] = useState('')
  const [chargePlusMinus, setChargePlusMinus] = useState<'+' | '-'>('+')
  const [chargeAmount, setChargeAmount] = useState('')
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null)

  // Charge table state - search, sorting, pagination, bulk selection
  const [chargeSearch, setChargeSearch] = useState('')
  const [chargeSortColumn, setChargeSortColumn] = useState<'chargesHeadName' | 'amount'>('chargesHeadName')
  const [chargeSortDirection, setChargeSortDirection] = useState<'asc' | 'desc'>('asc')
  const [chargeCurrentPage, setChargeCurrentPage] = useState(1)
  const chargesPerPage = 10
  const [selectedChargeRowIds, setSelectedChargeRowIds] = useState<string[]>([])

  const formSnapshotRef = useRef<FormSnapshot>({
    voucherNo,
    billDate,
    partyId,
    vehicleNo,
    billingMode,
    arrivalExpensesInput,
    roundOffMode,
    itemRows,
    chargeRows
  })

  useEffect(() => {
    formSnapshotRef.current = {
      voucherNo,
      billDate,
      partyId,
      vehicleNo,
      billingMode,
      arrivalExpensesInput,
      roundOffMode,
      itemRows,
      chargeRows
    }
  }, [
    voucherNo,
    billDate,
    partyId,
    vehicleNo,
    billingMode,
    arrivalExpensesInput,
    roundOffMode,
    itemRows,
    chargeRows
  ])

  const editDirtyReadyRef = useRef(!isEditMode)

  const markDirty = useCallback(() => {
    if (isEditMode && !editDirtyReadyRef.current) {
      return
    }

    if (!tabTransactionState.isActive) {
      dispatch(startTabTransaction({ tabId, transactionType: 'sellerBill' }))
      initialStateRef.current = JSON.stringify(formSnapshotRef.current)
    }
    setHasChanges(true)
  }, [dispatch, isEditMode, tabId, tabTransactionState.isActive])

  const markDirtyRef = useRef(markDirty)

  useEffect(() => {
    markDirtyRef.current = markDirty
  }, [markDirty])

  const loadMasterData = useCallback(async () => {
    if (!activeCompany) return

    try {
      const [supplierResponse, itemResponse, chargeResponse, voucherResponse] = await Promise.all([
        window.api.sellerBill.listEligibleSuppliers(activeCompany.id),
        window.api.item.listByCompany(activeCompany.id),
        window.api.otherChargesHead.listByCompany(activeCompany.id),
        window.api.sellerBill.getNextVoucherNo(activeCompany.id)
      ])

      if (supplierResponse.success && Array.isArray(supplierResponse.data)) {
        const suppliers = supplierResponse.data
        setPartyOptions((prev) => {
          const mapped = suppliers.map((supplier: any) => ({
            id: supplier.id,
            name: supplier.name
          }))
          const activeSupplierId = partyIdRef.current
          if (activeSupplierId && !mapped.some((option) => option.id === activeSupplierId)) {
            const existing = prev.find((option) => option.id === activeSupplierId)
            if (existing) {
              mapped.push(existing)
            }
          }
          return mapped
        })
      }

      if (itemResponse.success && Array.isArray(itemResponse.data)) {
        setItemOptions(
          itemResponse.data.map((item: any) => ({ id: item.id, itemName: item.itemName }))
        )
      }

      if (chargeResponse.success && Array.isArray(chargeResponse.data)) {
        setChargeHeads(chargeResponse.data)
      }

      if (!isEditMode && voucherResponse.success && voucherResponse.data) {
        setVoucherNo(voucherResponse.data)
      }
    } catch (error) {
      console.error('Failed to load seller bill master data:', error)
      toast.error('Unable to load master data for seller bill entry')
    }
  }, [activeCompany, isEditMode])

  const loadExistingBill = useCallback(async () => {
    if (!isEditMode || !billId) return

    setLoading(true)
    try {
      const response = await window.api.sellerBill.get(billId)
      if (response.success && response.data) {
        const bill = response.data
        if (isEditMode) {
          editDirtyReadyRef.current = false
        }
        setVoucherNo(bill.vchNo)
        lastVehicleSupplierRef.current = ''
        partyIdRef.current = bill.accountId
        setPartyId(bill.accountId)
        setPartyOptions((prev) => {
          if (prev.some((option) => option.id === bill.accountId)) {
            return prev
          }
          return [
            ...prev,
            {
              id: bill.accountId,
              name: bill.accountName || 'Unknown supplier'
            }
          ]
        })
        setVehicleNo(bill.vehicleNo || '')
        if (bill.vehicleNo) {
          const vehicle = bill.vehicleNo
          setVehicleOptions((prev) => {
            const exists = prev.some(
              (option) => option.value.toLowerCase() === vehicle.toLowerCase()
            )
            return exists ? prev : [...prev, { value: vehicle, label: vehicle }]
          })
        }
        const normalizedMode = (bill.mode || '').toString().toLowerCase()
        const resolvedMode =
          normalizedMode === 'automatic' || normalizedMode === 'manual'
            ? (normalizedMode as 'automatic' | 'manual')
            : ''
        setBillingMode(resolvedMode)
        setArrivalExpensesInput(String(bill.arrivalExpenses ?? 0))
        const roundOffValue = Number(bill.roundOff ?? 0)
        setRoundOffMode(roundOffValue > 0 ? 'up' : roundOffValue < 0 ? 'down' : 'none')

        const mappedItems: ItemRow[] = (bill.items || []).map((item: any) => ({
          id: item.id,
          itemId: item.itemId,
          stockSaleItemId: item.stockSaleItemId || null,
          itemName: item.itemName || '',
          lotNo: item.lotNo || '',
          nug: Number(item.nug) || 0,
          kg: Number(item.kg) || 0,
          rate: Number(item.rate) || 0,
          per: (item.per || 'nug').toLowerCase() === 'kg' ? 'kg' : 'nug',
          amount: Number(item.amount) || 0
        }))
        setItemRows(mappedItems)

        const mappedCharges: ChargeRow[] = (bill.chargeLines || []).map((charge: any) => ({
          id: charge.id,
          otherChargesId: charge.otherChargesId,
          chargesHeadName: charge.chargesHeadName || '',
          arrivalChargeId: charge.arrivalChargeId || null,
          onValue:
            charge.onValue !== null && charge.onValue !== undefined ? Number(charge.onValue) : null,
          per: charge.per !== null && charge.per !== undefined ? Number(charge.per) : null,
          atRate:
            charge.atRate !== null && charge.atRate !== undefined ? Number(charge.atRate) : null,
          no: charge.no !== null && charge.no !== undefined ? Number(charge.no) : null,
          plusMinus: charge.plusMinus === '-' ? '-' : '+',
          amount: Number(charge.amount) || 0
        }))
        setChargeRows(mappedCharges)

        if (bill.createdAt) {
          const createdDate = bill.createdAt.split('T')[0]
          setBillDate(createdDate)
        }

        setHasChanges(false)
        dispatch(endTabTransaction({ tabId, saved: true }))
        if (isEditMode) {
          editDirtyReadyRef.current = true
        }
      } else {
        toast.error(response.error || 'Unable to load seller bill details')
        navigate('/entries/seller-bill')
      }
    } catch (error) {
      console.error('Failed to load seller bill:', error)
      toast.error('Unable to load seller bill details')
      navigate('/entries/seller-bill')
    } finally {
      setLoading(false)
    }
  }, [billId, dispatch, isEditMode, navigate, tabId])

  const fetchVehicleOptions = useCallback(
    async (supplierId: string, preservedValue?: string): Promise<ComboboxOption[]> => {
      if (!activeCompany) {
        return preservedValue && preservedValue.trim()
          ? [{ value: preservedValue, label: preservedValue }]
          : []
      }

      try {
        const response = await window.api.sellerBill.listVehiclesBySupplier(
          activeCompany.id,
          supplierId
        )

        if (response.success && Array.isArray(response.data)) {
          const options = response.data
            .filter((value: unknown): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
            .map((value) => ({ value, label: value }))

          if (preservedValue && preservedValue.trim()) {
            const normalizedPreserved = preservedValue.trim().toLowerCase()
            const hasPreserved = options.some(
              (option) => option.value.toLowerCase() === normalizedPreserved
            )
            if (!hasPreserved) {
              options.unshift({ value: preservedValue, label: preservedValue })
            }
          }

          return options
        }

        if (preservedValue && preservedValue.trim()) {
          return [{ value: preservedValue, label: preservedValue }]
        }

        return []
      } catch (error) {
        console.error('Failed to fetch vehicle references:', error)
        if (preservedValue && preservedValue.trim()) {
          return [{ value: preservedValue, label: preservedValue }]
        }
        return []
      }
    },
    [activeCompany?.id]
  )

  useEffect(() => {
    if (!activeCompany) return

    setLoading(true)
    Promise.resolve(loadMasterData()).finally(() => setLoading(false))
  }, [activeCompany, loadMasterData])

  useEffect(() => {
    loadExistingBill()
  }, [loadExistingBill])

  useEffect(() => {
    partyIdRef.current = partyId
  }, [partyId])

  useEffect(() => {
    if (!activeCompany?.id) {
      setVehicleOptions([])
      lastVehicleSupplierRef.current = ''
      return
    }

    if (!partyId) {
      setVehicleOptions([])
      lastVehicleSupplierRef.current = ''
      return
    }

    if (lastVehicleSupplierRef.current === partyId) {
      return
    }

    lastVehicleSupplierRef.current = partyId
    let cancelled = false

    fetchVehicleOptions(partyId, vehicleNo).then((options) => {
      if (!cancelled) {
        setVehicleOptions(options)
      }
    })

    return () => {
      cancelled = true
    }
  }, [activeCompany?.id, fetchVehicleOptions, partyId, vehicleNo])

  useEffect(() => {
    if (billingMode !== 'automatic') {
      return
    }

    if (isEditMode && !autoPopulateReadyRef.current) {
      return
    }

    if (!partyId) {
      toast.error('Select a supplier before using automatic billing')
      return
    }

    if (!vehicleNo) {
      toast.error('Select vehicle/challan before using automatic billing')
      return
    }

    if (!activeCompany?.id) {
      return
    }

    let isCancelled = false
    const loadSoldItems = async () => {
      try {
        const response = await window.api.sellerBill.listSoldItems(activeCompany.id, {
          supplierId: partyId,
          vehicleRef: vehicleNo,
          sellerBillId: isEditMode ? billId : undefined
        })

        if (!response.success) {
          if (!isCancelled) {
            toast.error(response.error || 'Unable to load sold stock')
          }
          return
        }

        if (isCancelled) return

        const payload = response.data as any
        const soldItems = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : []
        const soldCharges =
          !Array.isArray(payload) && Array.isArray(payload?.arrivalCharges)
            ? payload.arrivalCharges
            : []

        const mappedRows: ItemRow[] = soldItems.map((item: any) => ({
          id: item.stockSaleItemId,
          itemId: item.itemId,
          stockSaleItemId: item.stockSaleItemId,
          itemName: item.itemName || '',
          lotNo: item.lotNo || '',
          nug: Number(item.nug) || 0,
          kg: Number(item.kg) || 0,
          rate: Number(item.rate) || 0,
          per: item.per === 'kg' ? 'kg' : 'nug',
          amount: Number(item.amount) || 0
        }))

        const mappedCharges: ChargeRow[] = soldCharges.map((charge: any) => ({
          id: charge.id,
          otherChargesId: charge.otherChargesId,
          chargesHeadName: charge.chargesHeadName || '',
          arrivalChargeId: charge.id,
          onValue:
            charge.onValue !== null && charge.onValue !== undefined ? Number(charge.onValue) : null,
          per: charge.per !== null && charge.per !== undefined ? Number(charge.per) : null,
          atRate:
            charge.atRate !== null && charge.atRate !== undefined ? Number(charge.atRate) : null,
          no: charge.no !== null && charge.no !== undefined ? Number(charge.no) : null,
          plusMinus: charge.plusMinus === '-' ? '-' : '+',
          amount: Number(charge.amount) || 0
        }))

        markDirtyRef.current?.()
        setEditingItemId(null)
        setSelectedItemId('')
        setItemLotNo('')
        setItemNug('')
        setItemKg('')
        setItemRate('')
        setItemRows(mappedRows)
        setChargeRows(mappedCharges)
        setEditingChargeId(null)
        setSelectedChargeHeadId('')
        setChargeOnValue('')
        setChargePer('')
        setChargeAtRate('')
        setChargeNo('')
        setChargePlusMinus('+')
        setChargeAmount('')
        setSelectedChargeRowIds([])
        setChargeCurrentPage(1)

        if (mappedRows.length === 0 && mappedCharges.length === 0) {
          toast.info('No sold stock or arrival charges found for the selected reference')
        } else {
          const parts: string[] = []
          if (mappedRows.length) {
            parts.push(`${mappedRows.length} item(s)`)
          }
          if (mappedCharges.length) {
            parts.push(`${mappedCharges.length} charge(s)`)
          }
          toast.success(`Loaded ${parts.join(' & ')} for automatic billing`)
        }
      } catch (error) {
        console.error('Failed to load sold stock items:', error)
        if (!isCancelled) {
          toast.error('Unable to load sold stock')
        }
      }
    }

    loadSoldItems()

    if (isEditMode) {
      autoPopulateReadyRef.current = false
    }

    return () => {
      isCancelled = true
    }
  }, [activeCompany?.id, billingMode, isEditMode, partyId, vehicleNo])

  const totals = useMemo(() => {
    const totalNug = itemRows.reduce((sum, row) => sum + row.nug, 0)
    const totalKg = itemRows.reduce((sum, row) => sum + row.kg, 0)
    const basicAmount = itemRows.reduce((sum, row) => sum + row.amount, 0)
    const arrivalExpenses = Number(arrivalExpensesInput) || 0
    const chargesTotal = chargeRows.reduce((sum, row) => {
      return row.plusMinus === '-' ? sum - row.amount : sum + row.amount
    }, 0)

    let roundOffAmount = 0
    let netAmount = basicAmount + arrivalExpenses + chargesTotal

    if (roundOffMode === 'up') {
      const rounded = Math.ceil(netAmount)
      roundOffAmount = rounded - netAmount
      netAmount = rounded
    } else if (roundOffMode === 'down') {
      const rounded = Math.floor(netAmount)
      roundOffAmount = rounded - netAmount
      netAmount = rounded
    }

    return {
      totalNug,
      totalKg,
      basicAmount,
      arrivalExpenses,
      chargesTotal,
      roundOffAmount,
      netAmount
    }
  }, [itemRows, arrivalExpensesInput, chargeRows, roundOffMode])

  // Get selected charge head's feedAs value for conditional field display
  const selectedChargeHeadFeedAs = useMemo(() => {
    if (!selectedChargeHeadId) return null
    const chargeHead = chargeHeads.find((ch) => ch.id === selectedChargeHeadId)
    return chargeHead?.feedAs || 'absolute'
  }, [selectedChargeHeadId, chargeHeads])

  // Alias chargeHeads as otherChargesHeads for consistency with ArrivalEntryFormPage
  const otherChargesHeads = chargeHeads

  const handleAddVehicleOption = () => {
    if (!newVehicleValue.trim()) {
      toast.error('Enter vehicle or challan value')
      return
    }
    const value = newVehicleValue.trim()
    setVehicleOptions((prev) => {
      if (prev.some((option) => option.value.toLowerCase() === value.toLowerCase())) {
        return prev
      }
      return [...prev, { value, label: value }]
    })
    setVehicleNo(value)
    setNewVehicleValue('')
    setShowVehicleDialog(false)
    if (isEditMode) {
      autoPopulateReadyRef.current = true
    }
    markDirty()
  }

  const handleAddItem = () => {
    if (!selectedItemId) {
      toast.error('Select an item before adding')
      return
    }

    const itemMaster = itemOptions.find((item) => item.id === selectedItemId)
    if (!itemMaster) {
      toast.error('Selected item is not available')
      return
    }

    const existingEditingRow = editingItemId
      ? itemRows.find((row) => row.id === editingItemId)
      : null
    const preservedStockSaleItemId =
      existingEditingRow?.stockSaleItemId && existingEditingRow.itemId === selectedItemId
        ? existingEditingRow.stockSaleItemId
        : null

    const nugValue = Number(itemNug) || 0
    const kgValue = Number(itemKg) || 0
    const rateValue = Number(itemRate) || 0
    const quantity = itemPer === 'kg' ? kgValue : nugValue
    const amount = rateValue * quantity

    const row: ItemRow = {
      id: editingItemId || crypto.randomUUID(),
      itemId: selectedItemId,
      stockSaleItemId: preservedStockSaleItemId,
      itemName: itemMaster.itemName,
      lotNo: itemLotNo.trim(),
      nug: nugValue,
      kg: kgValue,
      rate: rateValue,
      per: itemPer,
      amount
    }

    setItemRows((prev) => {
      if (editingItemId) {
        return prev.map((existing) => (existing.id === editingItemId ? row : existing))
      }
      return [...prev, row]
    })

    setSelectedItemId('')
    setItemLotNo('')
    setItemNug('')
    setItemKg('')
    setItemRate('')
    setItemPer('nug')
    setEditingItemId(null)
    markDirty()
  }

  const handleEditItem = (row: ItemRow) => {
    setSelectedItemId(row.itemId)
    setItemLotNo(row.lotNo)
    setItemNug(String(row.nug || ''))
    setItemKg(String(row.kg || ''))
    setItemRate(String(row.rate || ''))
    setItemPer(row.per)
    setEditingItemId(row.id)
  }

  const handleDeleteItem = (id: string) => {
    setItemRows((prev) => prev.filter((row) => row.id !== id))
    markDirty()
  }

  const handleAddCharge = () => {
    if (!selectedChargeHeadId) {
      toast.error('Select a charge head')
      return
    }

    const chargeHead = chargeHeads.find((head) => head.id === selectedChargeHeadId)
    if (!chargeHead) {
      toast.error('Selected charge head is not available')
      return
    }

    const existingEditingRow = editingChargeId
      ? chargeRows.find((row) => row.id === editingChargeId)
      : null
    const preservedArrivalChargeId = existingEditingRow?.arrivalChargeId || null

    const row: ChargeRow = {
      id: editingChargeId || crypto.randomUUID(),
      otherChargesId: selectedChargeHeadId,
      chargesHeadName: chargeHead.headingName,
      arrivalChargeId: preservedArrivalChargeId,
      onValue: chargeOnValue ? Number(chargeOnValue) : null,
      per: chargePer ? Number(chargePer) : null,
      atRate: chargeAtRate ? Number(chargeAtRate) : null,
      no: chargeNo ? Number(chargeNo) : null,
      plusMinus: chargePlusMinus,
      amount: Number(chargeAmount) || 0
    }

    setChargeRows((prev) => {
      if (editingChargeId) {
        return prev.map((existing) => (existing.id === editingChargeId ? row : existing))
      }
      return [...prev, row]
    })

    setSelectedChargeHeadId('')
    setChargeOnValue('')
    setChargePer('')
    setChargeAtRate('')
    setChargeNo('')
    setChargePlusMinus('+')
    setChargeAmount('')
    setEditingChargeId(null)
    markDirty()
  }

  const handleEditCharge = (row: ChargeRow) => {
    setSelectedChargeHeadId(row.otherChargesId)
    setChargeOnValue(row.onValue !== null ? String(row.onValue) : '')
    setChargePer(row.per !== null ? String(row.per) : '')
    setChargeAtRate(row.atRate !== null ? String(row.atRate) : '')
    setChargeNo(row.no !== null ? String(row.no) : '')
    setChargePlusMinus(row.plusMinus)
    setChargeAmount(String(row.amount))
    setEditingChargeId(row.id)
  }

  const handleDeleteCharge = (id: string) => {
    setChargeRows((prev) => prev.filter((row) => row.id !== id))
    markDirty()
  }

  const handleBulkDeleteCharges = () => {
    if (selectedChargeRowIds.length === 0) return
    setChargeRows((prev) => prev.filter((row) => !selectedChargeRowIds.includes(row.id)))
    setSelectedChargeRowIds([])
    markDirty()
    toast.success(`${selectedChargeRowIds.length} charge(s) deleted`)
  }

  const toggleChargeSelection = (chargeId: string) => {
    setSelectedChargeRowIds((prev) =>
      prev.includes(chargeId) ? prev.filter((id) => id !== chargeId) : [...prev, chargeId]
    )
  }

  const toggleSelectAllCharges = (filteredCharges: ChargeRow[]) => {
    if (selectedChargeRowIds.length === filteredCharges.length) {
      setSelectedChargeRowIds([])
    } else {
      setSelectedChargeRowIds(filteredCharges.map((charge) => charge.id))
    }
  }

  const handleSave = useCallback(async () => {
    if (!activeCompany) {
      toast.error('Select a company before saving seller bill')
      return
    }

    if (!partyId) {
      toast.error('Select a supplier before saving')
      return
    }

    if (!billingMode) {
      toast.error('Select a billing mode before saving')
      return
    }

    if (itemRows.length === 0) {
      toast.error('Add at least one item')
      return
    }

    setSaving(true)
    try {
      const payload = {
        accountId: partyId,
        voucherNo,
        mode: billingMode || null,
        vehicleNo: vehicleNo || null,
        billDate,
        arrivalExpenses: totals.arrivalExpenses,
        roundOff: totals.roundOffAmount,
        items: itemRows.map((row) => ({
          id: row.id,
          itemId: row.itemId,
          lotNo: row.lotNo || null,
          nug: row.nug,
          kg: row.kg,
          rate: row.rate,
          per: row.per,
          amount: row.amount,
          stockSaleItemId: row.stockSaleItemId || null
        })),
        chargeLines: chargeRows.map((row) => ({
          id: row.id,
          otherChargesId: row.otherChargesId,
          arrivalChargeId: row.arrivalChargeId || null,
          onValue: row.onValue,
          per: row.per,
          atRate: row.atRate,
          no: row.no,
          plusMinus: row.plusMinus,
          amount: row.amount
        }))
      }

      let response
      if (isEditMode && billId) {
        response = await window.api.sellerBill.update(billId, payload)
      } else {
        response = await window.api.sellerBill.create(activeCompany.id, payload)
      }

      if (response.success) {
        toast.success(isEditMode ? 'Seller bill updated' : 'Seller bill created')
        setHasChanges(false)
        dispatch(endTabTransaction({ tabId, saved: true }))
        navigate('/entries/seller-bill')
      } else {
        toast.error(response.error || 'Failed to save seller bill')
      }
    } catch (error) {
      console.error('Failed to save seller bill:', error)
      toast.error('Unable to save seller bill')
    } finally {
      setSaving(false)
    }
  }, [
    activeCompany,
    arrivalExpensesInput,
    billDate,
    billId,
    billingMode,
    chargeRows,
    dispatch,
    isEditMode,
    itemRows,
    navigate,
    partyId,
    tabId,
    totals,
    vehicleNo,
    voucherNo
  ])

  const handleClose = useCallback(() => {
    if (tabTransactionState.isActive && hasChanges) {
      setShowCloseDialog(true)
    } else {
      navigate('/entries/seller-bill')
    }
  }, [hasChanges, navigate, tabTransactionState.isActive])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleSave()
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleSave, handleClose])

  // Set default +/- based on charge head's chargeType when selected
  useEffect(() => {
    if (selectedChargeHeadId) {
      const chargeHead = chargeHeads.find((ch) => ch.id === selectedChargeHeadId)
      if (chargeHead) {
        setChargePlusMinus(chargeHead.chargeType === 'minus' ? '-' : '+')
        // Auto-fill onValue based on feedAs
        if (chargeHead.feedAs === 'onWeight') {
          setChargeOnValue(totals.totalKg.toString())
        } else if (chargeHead.feedAs === 'onNug') {
          setChargeOnValue(totals.totalNug.toString())
        }
      }
    }
  }, [selectedChargeHeadId, chargeHeads, totals.totalKg, totals.totalNug])

  // Auto-calculate charge amount based on feedAs
  useEffect(() => {
    if (!selectedChargeHeadFeedAs || selectedChargeHeadFeedAs === 'absolute') return

    const onValue = parseFloat(chargeOnValue) || 0
    const per = parseFloat(chargePer) || 0
    const atRate = parseFloat(chargeAtRate) || 0
    const no = parseFloat(chargeNo) || 0

    let calculatedAmount = 0

    switch (selectedChargeHeadFeedAs) {
      case 'percentage':
        // percentage of onValue
        calculatedAmount = (onValue * atRate) / 100
        break
      case 'onWeight':
        // per kg rate: onValue (total kg) / per (per kg) * atRate
        if (per > 0) {
          calculatedAmount = (onValue / per) * atRate
        } else {
          calculatedAmount = onValue * atRate
        }
        break
      case 'onNug':
      case 'onPetti':
        // count based: no * atRate
        if (no > 0) {
          calculatedAmount = no * atRate
        } else {
          calculatedAmount = onValue * atRate
        }
        break
    }

    if (calculatedAmount > 0) {
      setChargeAmount(calculatedAmount.toFixed(2))
    }
  }, [selectedChargeHeadFeedAs, chargeOnValue, chargePer, chargeAtRate, chargeNo])

  const handleCancelTransaction = () => {
    if (!tabTransactionState.isActive) return

    if (isEditMode) {
      editDirtyReadyRef.current = false
    }

    if (initialStateRef.current) {
      try {
        const parsed = JSON.parse(initialStateRef.current)
        setVoucherNo(parsed.voucherNo)
        setBillDate(parsed.billDate)
        setPartyId(parsed.partyId)
        lastVehicleSupplierRef.current = ''
        partyIdRef.current = parsed.partyId
        setVehicleNo(parsed.vehicleNo)
        const restoredMode =
          parsed.billingMode === 'automatic' || parsed.billingMode === 'manual'
            ? parsed.billingMode
            : ''
        setBillingMode(restoredMode)
        setArrivalExpensesInput(parsed.arrivalExpensesInput)
        setRoundOffMode(parsed.roundOffMode)
        setItemRows(parsed.itemRows)
        setChargeRows(parsed.chargeRows)
      } catch (error) {
        console.error('Failed to restore seller bill state:', error)
      }
    }

    setHasChanges(false)
    dispatch(endTabTransaction({ tabId, saved: false }))
    toast.success('Changes discarded')

    if (isEditMode) {
      editDirtyReadyRef.current = true
    }
  }

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a company to create seller bills.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading seller bill form…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditMode ? 'Edit Seller Bill' : 'New Seller Bill'}
              </h1>
              <p className="text-sm text-muted-foreground">Company: {activeCompany.companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Bill Date</Label>
              <Input
                type="date"
                value={billDate}
                onChange={(event) => {
                  setBillDate(event.target.value)
                  markDirty()
                }}
                max={new Date().toISOString().split('T')[0]}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Voucher</Label>
              <Input
                value={voucherNo}
                disabled
                title="Auto-generated voucher number"
                className="w-36"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} variant="success">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving…' : isEditMode ? 'Update' : 'Save'}
            </Button>
            {tabTransactionState.isActive && (
              <Button variant="outline" onClick={handleCancelTransaction}>
                Cancel Transaction
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card className="mb-4">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Bill Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Combobox
                  options={partyOptions.map((party) => ({ value: party.id, label: party.name }))}
                  value={partyId}
                  onChange={(value) => {
                    setPartyId(value)
                    partyIdRef.current = value
                    if (value !== partyId) {
                      setVehicleNo('')
                      setVehicleOptions([])
                      lastVehicleSupplierRef.current = ''
                    }
                    if (isEditMode) {
                      autoPopulateReadyRef.current = true
                    }
                    markDirty()
                  }}
                  placeholder="Select supplier"
                  searchPlaceholder="Search suppliers"
                  emptyText="No suppliers found"
                  onCreateNew={() => setShowAccountModal(true)}
                  createNewLabel="Create supplier"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Vehicle / Challan</Label>
                <Combobox
                  options={vehicleOptions}
                  value={vehicleNo}
                  onChange={(value) => {
                    setVehicleNo(value)
                    if (isEditMode) {
                      autoPopulateReadyRef.current = true
                    }
                    markDirty()
                  }}
                  placeholder="Select vehicle or challan"
                  searchPlaceholder="Search references"
                  emptyText="No references found"
                  onCreateNew={() => setShowVehicleDialog(true)}
                  createNewLabel="Add new vehicle/challan"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Billing Mode</Label>
                <Select
                  value={billingMode || undefined}
                  onValueChange={(value: 'automatic' | 'manual') => {
                    setBillingMode(value)
                    if (isEditMode) {
                      autoPopulateReadyRef.current = true
                    }
                    markDirty()
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="items" className="flex-1">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger
              value="items"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Items ({itemRows.length})
            </TabsTrigger>
            <TabsTrigger
              value="charges"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Charges ({chargeRows.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="py-3">
                <CardTitle className="text-lg">
                  {editingItemId ? 'Edit Item' : 'Add Item'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-7">
                  <div className="lg:col-span-1 space-y-1.5">
                    <Label>Item</Label>
                    <Combobox
                      options={itemOptions.map((item) => ({
                        value: item.id,
                        label: item.itemName
                      }))}
                      value={selectedItemId}
                      onChange={setSelectedItemId}
                      placeholder="Select item"
                      searchPlaceholder="Search items"
                      emptyText="No items found"
                      onCreateNew={() => setShowItemModal(true)}
                      createNewLabel="Create item"
                    />
                  </div>
                  <div className="space-y-1.5 ">
                    <Label>Lot No / Variety</Label>
                    <Input
                      value={itemLotNo}
                      onChange={(event) => setItemLotNo(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nug</Label>
                    <Input
                      value={itemNug}
                      onChange={(event) => setItemNug(event.target.value)}
                      type="number"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Weight (Kg)</Label>
                    <Input
                      value={itemKg}
                      onChange={(event) => setItemKg(event.target.value)}
                      type="number"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Rate</Label>
                    <Input
                      value={itemRate}
                      onChange={(event) => setItemRate(event.target.value)}
                      type="number"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Per</Label>
                    <Select
                      value={itemPer}
                      onValueChange={(value: 'nug' | 'kg') => setItemPer(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nug">Nug</SelectItem>
                        <SelectItem value="kg">Kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="lg:col-span-1 flex items-end">
                    <Button onClick={handleAddItem}>
                      {editingItemId ? (
                        <>
                          <Edit2 className="mr-2 h-4 w-4" /> Update
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" /> Add Item
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">Sn.</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Lot No / Variety</TableHead>
                        <TableHead className="text-right">Nug</TableHead>
                        <TableHead className="text-right">Wt</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Per</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-24 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="py-8 text-center text-sm text-muted-foreground"
                          >
                            No items added yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        itemRows.map((row, index) => (
                          <TableRow key={row.id} className="hover:bg-muted/50">
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell className="font-medium">{row.itemName}</TableCell>
                            <TableCell>{row.lotNo || '—'}</TableCell>
                            <TableCell className="text-right">{row.nug.toFixed(0)}</TableCell>
                            <TableCell className="text-right">{row.kg.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{row.rate.toFixed(2)}</TableCell>
                            <TableCell className="text-right uppercase">{row.per}</TableCell>
                            <TableCell className="text-right">₹{row.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditItem(row)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDeleteItem(row.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charges" className="mt-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="py-3">
                <CardTitle className="text-lg">
                  {editingChargeId ? 'Edit Charge' : 'Add Charge'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Charge Entry Form */}
                <div
                  className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCharge()
                    }
                  }}
                >
                  {/* Charges Head */}
                  <div className="space-y-1.5 col-span-2">
                    <Label>Charges Head</Label>
                    <Select value={selectedChargeHeadId} onValueChange={setSelectedChargeHeadId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select charges head" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherChargesHeads.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>
                            {ch.headingName} ({ch.feedAs})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* On Value - Show for onWeight, onNug, onPetti, percentage */}
                  {selectedChargeHeadFeedAs && selectedChargeHeadFeedAs !== 'absolute' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="chargeOnValue">
                        {selectedChargeHeadFeedAs === 'onWeight'
                          ? 'Total Kg'
                          : selectedChargeHeadFeedAs === 'onNug'
                            ? 'Total Nug'
                            : selectedChargeHeadFeedAs === 'onPetti'
                              ? 'Total Petti'
                              : 'On Value'}
                      </Label>
                      <Input
                        id="chargeOnValue"
                        type="number"
                        step="0.01"
                        value={chargeOnValue}
                        onChange={(e) => setChargeOnValue(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {/* Per - Show for onWeight (per kg) */}
                  {selectedChargeHeadFeedAs === 'onWeight' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="chargePer">Per Kg</Label>
                      <Input
                        id="chargePer"
                        type="number"
                        step="0.01"
                        value={chargePer}
                        onChange={(e) => setChargePer(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {/* No - Show for onNug, onPetti (count) */}
                  {(selectedChargeHeadFeedAs === 'onNug' ||
                    selectedChargeHeadFeedAs === 'onPetti') && (
                    <div className="space-y-1.5">
                      <Label htmlFor="chargeNo">No</Label>
                      <Input
                        id="chargeNo"
                        type="number"
                        step="1"
                        value={chargeNo}
                        onChange={(e) => setChargeNo(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  )}

                  {/* At Rate - Show for onWeight, onNug, onPetti, percentage */}
                  {selectedChargeHeadFeedAs && selectedChargeHeadFeedAs !== 'absolute' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="chargeAtRate">
                        {selectedChargeHeadFeedAs === 'percentage'
                          ? 'Percentage'
                          : 'At Rate'}
                      </Label>
                      <Input
                        id="chargeAtRate"
                        type="number"
                        step="0.01"
                        value={chargeAtRate}
                        onChange={(e) => setChargeAtRate(e.target.value)}
                        placeholder={selectedChargeHeadFeedAs === 'percentage' ? '%' : '0.00'}
                      />
                    </div>
                  )}

                  {/* Plus/Minus */}
                  <div className="space-y-1.5">
                    <Label>+/-</Label>
                    <Select
                      value={chargePlusMinus}
                      onValueChange={(v) => setChargePlusMinus(v as '+' | '-')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+">+ Plus</SelectItem>
                        <SelectItem value="-">- Minus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <Label htmlFor="chargeAmount">Amount</Label>
                    <Input
                      id="chargeAmount"
                      type="number"
                      step="0.01"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Add/Update Button */}
                  <div className="flex items-end">
                    <Button onClick={handleAddCharge} className="w-full">
                      {editingChargeId ? (
                        <>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Update
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Charges Table with search, pagination, sorting, bulk selection */}
                {chargeRows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-md">
                    No charges added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Search and Bulk Delete */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 max-w-sm">
                        <Input
                          placeholder="Search by charge name..."
                          value={chargeSearch}
                          onChange={(e) => {
                            setChargeSearch(e.target.value)
                            setChargeCurrentPage(1)
                          }}
                          className="pl-3"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          const filtered = chargeRows.filter((row) =>
                            row.chargesHeadName.toLowerCase().includes(chargeSearch.toLowerCase())
                          )
                          const startIndex = (chargeCurrentPage - 1) * chargesPerPage
                          const endIndex = Math.min(startIndex + chargesPerPage, filtered.length)
                          return `Showing ${filtered.length > 0 ? startIndex + 1 : 0}-${endIndex} of ${filtered.length} charges`
                        })()}
                      </div>
                      {selectedChargeRowIds.length > 0 && (
                        <Button variant="destructive" size="sm" onClick={handleBulkDeleteCharges}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete ({selectedChargeRowIds.length})
                        </Button>
                      )}
                    </div>

                    {/* Table */}
                    <div className="border rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={(() => {
                                  const filtered = chargeRows.filter((row) =>
                                    row.chargesHeadName
                                      .toLowerCase()
                                      .includes(chargeSearch.toLowerCase())
                                  )
                                  return (
                                    selectedChargeRowIds.length === filtered.length &&
                                    filtered.length > 0
                                  )
                                })()}
                                onCheckedChange={() => {
                                  const filtered = chargeRows.filter((row) =>
                                    row.chargesHeadName
                                      .toLowerCase()
                                      .includes(chargeSearch.toLowerCase())
                                  )
                                  toggleSelectAllCharges(filtered)
                                }}
                              />
                            </TableHead>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 font-semibold p-0"
                                onClick={() => {
                                  if (chargeSortColumn === 'chargesHeadName') {
                                    setChargeSortDirection(
                                      chargeSortDirection === 'asc' ? 'desc' : 'asc'
                                    )
                                  } else {
                                    setChargeSortColumn('chargesHeadName')
                                    setChargeSortDirection('asc')
                                  }
                                }}
                              >
                                Charges Head
                                {chargeSortColumn === 'chargesHeadName' && (
                                  <span className="ml-1">
                                    {chargeSortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">
                              On Value
                            </TableHead>
                            <TableHead className="text-right">Per</TableHead>
                            <TableHead className="text-right">At Rate</TableHead>
                            <TableHead className="text-center">
                              +/-
                            </TableHead>
                            <TableHead className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 font-semibold p-0"
                                onClick={() => {
                                  if (chargeSortColumn === 'amount') {
                                    setChargeSortDirection(
                                      chargeSortDirection === 'asc' ? 'desc' : 'asc'
                                    )
                                  } else {
                                    setChargeSortColumn('amount')
                                    setChargeSortDirection('asc')
                                  }
                                }}
                              >
                                Amount
                                {chargeSortColumn === 'amount' && (
                                  <span className="ml-1">
                                    {chargeSortDirection === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="w-20">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            // Filter
                            const filtered = chargeRows.filter((row) =>
                              row.chargesHeadName.toLowerCase().includes(chargeSearch.toLowerCase())
                            )
                            // Sort
                            const sorted = [...filtered].sort((a, b) => {
                              let comparison = 0
                              switch (chargeSortColumn) {
                                case 'chargesHeadName':
                                  comparison = a.chargesHeadName.localeCompare(b.chargesHeadName)
                                  break
                                case 'amount':
                                  comparison = a.amount - b.amount
                                  break
                              }
                              return chargeSortDirection === 'asc' ? comparison : -comparison
                            })
                            // Paginate
                            const startIndex = (chargeCurrentPage - 1) * chargesPerPage
                            const paginated = sorted.slice(startIndex, startIndex + chargesPerPage)

                            return paginated.map((row, index) => (
                              <TableRow
                                key={row.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onDoubleClick={() => handleEditCharge(row)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedChargeRowIds.includes(row.id)}
                                    onCheckedChange={() => toggleChargeSelection(row.id)}
                                  />
                                </TableCell>
                                <TableCell>{startIndex + index + 1}</TableCell>
                                <TableCell className="font-medium">{row.chargesHeadName}</TableCell>
                                <TableCell className="text-right">
                                  {row.onValue?.toFixed(2) || '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {row.per?.toFixed(2) || '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {row.atRate?.toFixed(2) || '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span
                                    className={cn(
                                      'px-2 py-0.5 rounded text-sm font-medium',
                                      row.plusMinus === '+'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    )}
                                  >
                                    {row.plusMinus}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {row.amount.toFixed(2)}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleEditCharge(row)}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => handleDeleteCharge(row.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          })()}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    {(() => {
                      const filtered = chargeRows.filter((row) =>
                        row.chargesHeadName.toLowerCase().includes(chargeSearch.toLowerCase())
                      )
                      const totalPages = Math.max(1, Math.ceil(filtered.length / chargesPerPage))

                      return (
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm text-muted-foreground">
                            Page {chargeCurrentPage} of {totalPages}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setChargeCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={chargeCurrentPage === 1}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setChargeCurrentPage((p) => Math.min(totalPages, p + 1))
                              }
                              disabled={chargeCurrentPage === totalPages}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="border-t bg-white">
        <div className="overflow-x-auto px-4 py-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Total Nug</TableHead>
                <TableHead className="text-center">Total Kg</TableHead>
                <TableHead className="text-center">Basic Amt</TableHead>
                <TableHead className="text-center">Arrival Expenses</TableHead>
                <TableHead className="text-center">Charges</TableHead>
                <TableHead className="text-center">Round Off</TableHead>
                <TableHead className="text-center">Net Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="text-center font-semibold">
                  {totals.totalNug.toFixed(0)}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {totals.totalKg.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  ₹{totals.basicAmount.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  ₹{totals.arrivalExpenses.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  ₹{totals.chargesTotal.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Select
                      value={roundOffMode}
                      onValueChange={(value: 'none' | 'up' | 'down') => {
                        setRoundOffMode(value)
                        markDirty()
                      }}
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="up">Round Up</SelectItem>
                        <SelectItem value="down">Round Down</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="font-semibold">₹{totals.roundOffAmount.toFixed(2)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold text-primary text-lg">
                  ₹{totals.netAmount.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this seller bill. Do you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCloseDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCloseDialog(false)
                setHasChanges(false)
                dispatch(endTabTransaction({ tabId, saved: false }))
                navigate('/entries/seller-bill')
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Vehicle / Challan</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="vehicleNo">Vehicle / Challan</Label>
            <Input
              id="vehicleNo"
              value={newVehicleValue}
              onChange={(event) => setNewVehicleValue(event.target.value)}
              placeholder="Enter vehicle or challan"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVehicleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVehicleOption}>
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle/Challan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AccountFormModal
        open={showAccountModal}
        onOpenChange={(open) => {
          setShowAccountModal(open)
          if (!open) {
            loadMasterData()
          }
        }}
        onSuccess={() => {
          loadMasterData()
        }}
      />

      <ItemFormModal
        open={showItemModal}
        onClose={() => {
          setShowItemModal(false)
          loadMasterData()
        }}
        onSuccess={loadMasterData}
        companyId={activeCompany.id}
      />
    </div>
  )
}
