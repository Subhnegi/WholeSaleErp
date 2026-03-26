import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  endTabTransaction,
  selectTabTransactionState,
  startTabTransaction
} from '@/store/slices/tabSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { ItemFormModal } from '@/components/ItemFormModal'
import { ArrowLeft, Edit2, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface StockWattakEntryFormPageProps {
  tabId: string
  currentRoute: string
}

interface AccountOption {
  id: string
  name: string
}

interface ItemOption {
  id: string
  itemName: string
}

interface ChargeHead {
  id: string
  headingName: string
  chargeType?: 'plus' | 'minus'
  feedAs?: 'percentage' | 'onWeight' | 'onNug' | 'onPetti' | 'absolute' | string
}

interface ItemRow {
  id: string
  stockTransferId?: string  // Link to source stock transfer
  itemId: string
  itemName: string
  lotNo: string
  nug: number
  wt: number
  rate: number
  per: 'nug' | 'kg'
  amount: number
  issuedNug: number
  balanceNug: number
}

interface ChargeRow {
  id: string
  otherChargesId: string
  chargesHeadName: string
  onValue: number | null
  per: number | null
  atRate: number | null
  no: number | null
  plusMinus: '+' | '-'
  amount: number
}

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11)

const formatNumber = (value: number, fractionDigits = 2) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })

const getTodayISODate = () => new Date().toISOString().split('T')[0]

interface FormSnapshot {
  voucherNo: string
  wattakDate: string
  partyId: string
  vehicleNo: string
  challanNo: string
  roundOffInput: string
  itemRows: ItemRow[]
  chargeRows: ChargeRow[]
}

export default function StockWattakEntryFormPage({
  tabId,
  currentRoute
}: StockWattakEntryFormPageProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  const tabTransactionState = useAppSelector((state) => selectTabTransactionState(state, tabId))

  const isEditMode = currentRoute.startsWith('/entries/stock-wattak/edit/')
  const wattakId = isEditMode ? currentRoute.split('/').at(-1) ?? '' : ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [readyForChanges, setReadyForChanges] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'items' | 'charges'>('items')

  const [voucherNo, setVoucherNo] = useState('')
  const [wattakDate, setWattakDate] = useState(() => getTodayISODate())
  const [partyId, setPartyId] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [challanNo, setChallanNo] = useState('')
  const [roundOffInput, setRoundOffInput] = useState('0')

  const [partyOptions, setPartyOptions] = useState<AccountOption[]>([])
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([])
  const [chargeHeads, setChargeHeads] = useState<ChargeHead[]>([])
  const partyComboboxOptions = useMemo<ComboboxOption[]>(
    () =>
      partyOptions.map((party) => ({
        value: party.id,
        label: party.name
      })),
    [partyOptions]
  )
  const [stockTransfers, setStockTransfers] = useState<any[]>([])
  const [customVehicleOptions, setCustomVehicleOptions] = useState<Record<string, ComboboxOption[]>>({})
  const [customChallanOptions, setCustomChallanOptions] = useState<Record<string, ComboboxOption[]>>({})

  // Use ledger-filtered transfers (only those with remaining quantities)
  const vehicleOptions = useMemo<ComboboxOption[]>(() => {
    if (!partyId) return []
    const options = new Map<string, ComboboxOption>()
    stockTransfers.forEach((transfer: any) => {
      if (transfer.accountId !== partyId) return
      const value = (transfer.vehicleNo || '').trim()
      if (!value) return
      const key = value.toLowerCase()
      if (!options.has(key)) {
        options.set(key, { value, label: value })
      }
    })
    const extras = customVehicleOptions[partyId] ?? []
    extras.forEach((option) => {
      if (!options.has(option.value.toLowerCase())) {
        options.set(option.value.toLowerCase(), option)
      }
    })
    return Array.from(options.values())
  }, [partyId, stockTransfers, customVehicleOptions])

  const challanOptions = useMemo<ComboboxOption[]>(() => {
    if (!partyId) return []
    const options = new Map<string, ComboboxOption>()
    stockTransfers.forEach((transfer: any) => {
      if (transfer.accountId !== partyId) return
      const value = (transfer.challanNo || '').trim()
      if (!value) return
      const key = value.toLowerCase()
      if (!options.has(key)) {
        options.set(key, { value, label: value })
      }
    })
    const extras = customChallanOptions[partyId] ?? []
    extras.forEach((option) => {
      if (!options.has(option.value.toLowerCase())) {
        options.set(option.value.toLowerCase(), option)
      }
    })
    return Array.from(options.values())
  }, [partyId, stockTransfers, customChallanOptions])

  const [itemRows, setItemRows] = useState<ItemRow[]>([])
  const [chargeRows, setChargeRows] = useState<ChargeRow[]>([])

  const [selectedItemId, setSelectedItemId] = useState('')
  const [itemLotNo, setItemLotNo] = useState('')
  const [itemNug, setItemNug] = useState('')
  const [itemWt, setItemWt] = useState('')
  const [itemRate, setItemRate] = useState('')
  const [itemPer, setItemPer] = useState<'nug' | 'kg'>('nug')
  const [itemIssuedNug, setItemIssuedNug] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const [selectedChargeHeadId, setSelectedChargeHeadId] = useState('')
  const [chargeOnValue, setChargeOnValue] = useState('')
  const [chargePer, setChargePer] = useState('')
  const [chargeAtRate, setChargeAtRate] = useState('')
  const [chargeNo, setChargeNo] = useState('')
  const [chargePlusMinus, setChargePlusMinus] = useState<'+' | '-'>('+')
  const [chargeAmount, setChargeAmount] = useState('')
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null)

  const selectedChargeHeadFeedAs = useMemo(() => {
    if (!selectedChargeHeadId) return null
    const chargeHead = chargeHeads.find((head) => head.id === selectedChargeHeadId)
    return chargeHead?.feedAs || 'absolute'
  }, [selectedChargeHeadId, chargeHeads])

  const [showItemModal, setShowItemModal] = useState(false)
  const prefillSignatureRef = useRef('')
  const formSnapshotRef = useRef<string>('')
  const initialLoadCompleteRef = useRef(false)
  const userChangedSelectionRef = useRef(false) // Track if user manually changed party/vehicle/challan

  const captureFormState = useCallback(() => ({
    voucherNo,
    wattakDate,
    partyId,
    vehicleNo,
    challanNo,
    roundOffInput,
    itemRows,
    chargeRows
  }), [voucherNo, wattakDate, partyId, vehicleNo, challanNo, roundOffInput, itemRows, chargeRows])

  const markDirty = useCallback(() => {
    if (!readyForChanges) return
    if (!tabTransactionState.isActive) {
      formSnapshotRef.current = JSON.stringify(captureFormState())
      dispatch(startTabTransaction({ tabId, transactionType: 'stockWattakEntry' }))
    }
    setHasChanges(true)
  }, [captureFormState, dispatch, readyForChanges, tabId, tabTransactionState.isActive])

  const addCustomVehicleOption = useCallback(
    (partyKey: string | null | undefined, value: string | null | undefined) => {
      if (!partyKey || !value?.trim()) return
      const normalized = value.trim()
      setCustomVehicleOptions((prev) => {
        const existing = prev[partyKey] ?? []
        if (existing.some((option) => option.value.toLowerCase() === normalized.toLowerCase())) {
          return prev
        }
        return {
          ...prev,
          [partyKey]: [...existing, { value: normalized, label: normalized }]
        }
      })
    },
    []
  )

  const addCustomChallanOption = useCallback(
    (partyKey: string | null | undefined, value: string | null | undefined) => {
      if (!partyKey || !value?.trim()) return
      const normalized = value.trim()
      setCustomChallanOptions((prev) => {
        const existing = prev[partyKey] ?? []
        if (existing.some((option) => option.value.toLowerCase() === normalized.toLowerCase())) {
          return prev
        }
        return {
          ...prev,
          [partyKey]: [...existing, { value: normalized, label: normalized }]
        }
      })
    },
    []
  )

  const loadMasterData = useCallback(async () => {
    if (!activeCompany) return

    try {
      const [itemsResp, chargesResp, voucherResp] = await Promise.all([
        window.api.item.listByCompany(activeCompany.id),
        window.api.otherChargesHead.listByCompany(activeCompany.id),
        window.api.stockWattak.getNextVoucherNo(activeCompany.id)
      ])

      if (itemsResp.success && Array.isArray(itemsResp.data)) {
        setItemOptions(itemsResp.data.map((item: any) => ({ id: item.id, itemName: item.itemName })))
      }

      if (chargesResp.success && Array.isArray(chargesResp.data)) {
        setChargeHeads(chargesResp.data)
      }

      if (!isEditMode && voucherResp.success && voucherResp.data) {
        setVoucherNo(voucherResp.data)
      }
    } catch (error) {
      console.error('Failed to load stock wattak master data', error)
      toast.error('Unable to load master data for Stock Wattak entry')
    }
  }, [activeCompany, isEditMode])

  const loadExistingWattak = useCallback(async () => {
    if (!isEditMode || !wattakId) return

    try {
      const response = await window.api.stockWattak.get(wattakId)
      if (!response.success || !response.data) {
        toast.error(response.error || 'Unable to load Stock Wattak')
        navigate('/entries/stock-wattak')
        return
      }

      const wattak = response.data as any
      setVoucherNo(wattak.vchNo || '')
      const createdDate = wattak.createdAt ? wattak.createdAt.split('T')[0] : getTodayISODate()
      setWattakDate(createdDate)
      const wattakPartyId = wattak.partyId || ''
      setPartyId(wattakPartyId)
      if (wattak.partyId && wattak.partyName) {
        setPartyOptions((prev) => {
          if (prev.some((option) => option.id === wattak.partyId)) {
            return prev
          }
          return [...prev, { id: wattak.partyId, name: wattak.partyName }]
        })
      }
      if (wattak.vehicleNo) {
        setVehicleNo(wattak.vehicleNo)
        addCustomVehicleOption(wattakPartyId, wattak.vehicleNo)
      }
      if (wattak.challanNo) {
        setChallanNo(wattak.challanNo)
        addCustomChallanOption(wattakPartyId, wattak.challanNo)
      }
      setRoundOffInput(String(wattak.roundOff ?? 0))

      // Try to load available transfers to match stockTransferId for existing items
      let availableTransfers: any[] = []
      try {
        if (activeCompany) {
          const transfersResp = await window.api.stockWattak.getAvailableTransfers(activeCompany.id, {
            partyId: wattakPartyId,
            excludeWattakId: wattakId // Exclude current wattak to get true available quantities
          })
          if (transfersResp.success && transfersResp.data) {
            availableTransfers = transfersResp.data
          }
        }
      } catch (error) {
        console.warn('Could not load transfers for existing wattak', error)
      }

      setItemRows(
        (wattak.items || []).map((item: any) => {
          // Try to find matching transfer for this item
          let stockTransferId = item.stockTransferId // Might exist for newer wattaks
          let issuedNug = Number(item.issuedNug) || 0 // Default to stored value
          
          if (!stockTransferId && wattak.vehicleNo && wattak.challanNo) {
            const normalizedVehicle = (wattak.vehicleNo || '').trim().toLowerCase()
            const normalizedChallan = (wattak.challanNo || '').trim().toLowerCase()
            const normalizedLot = (item.lotNo || '').trim().toLowerCase()
            
            const matchingTransfer = availableTransfers.find((transfer: any) => {
              const transferVehicle = (transfer.vehicleNo || '').trim().toLowerCase()
              const transferChallan = (transfer.challanNo || '').trim().toLowerCase()
              if (transferVehicle !== normalizedVehicle || transferChallan !== normalizedChallan) return false
              
              return (transfer.items || []).some((tItem: any) => 
                tItem.itemId === item.itemId && 
                (tItem.lotNo || '').trim().toLowerCase() === normalizedLot
              )
            })
            
            if (matchingTransfer) {
              stockTransferId = matchingTransfer.id
            }
          }

          // Calculate correct issuedNug for edit mode
          // When excludeWattakId is used, remainingNug already includes this entry's quantities
          // So issuedNug = remainingNug (which is: ledger remaining + this entry's nug)
          if (stockTransferId) {
            const matchingTransfer = availableTransfers.find((t: any) => t.id === stockTransferId)
            if (matchingTransfer) {
              const normalizedLot = (item.lotNo || '').trim().toLowerCase()
              const matchingItem = (matchingTransfer.items || []).find((tItem: any) => 
                tItem.itemId === item.itemId && 
                (tItem.lotNo || '').trim().toLowerCase() === normalizedLot
              )
              if (matchingItem) {
                // remainingNug already includes this entry's quantities due to excludeWattakId
                issuedNug = Number(matchingItem.remainingNug ?? 0)
              }
            }
          }

          return {
            id: item.id || generateId(),
            stockTransferId,
            itemId: item.itemId,
            itemName: item.itemName || 'Item',
            lotNo: item.lotNo || '',
            nug: Number(item.nug) || 0,
            wt: Number(item.wt) || 0,
            rate: Number(item.rate) || 0,
            per: (item.per || 'nug').toLowerCase() === 'kg' ? 'kg' : 'nug',
            amount: Number(item.basicAmount ?? item.amount ?? 0),
            issuedNug: issuedNug,
            balanceNug: issuedNug - (Number(item.nug) || 0)
          }
        })
      )

      setChargeRows(
        (wattak.chargeLines || []).map((charge: any) => ({
          id: charge.id || generateId(),
          otherChargesId: charge.otherChargesId,
          chargesHeadName: charge.chargesHeadName || 'Charge',
          onValue: charge.onValue !== null && charge.onValue !== undefined ? Number(charge.onValue) : null,
          per: charge.per !== null && charge.per !== undefined ? Number(charge.per) : null,
          atRate: charge.atRate !== null && charge.atRate !== undefined ? Number(charge.atRate) : null,
          no: charge.no !== null && charge.no !== undefined ? Number(charge.no) : null,
          plusMinus: charge.plusMinus === '-' ? '-' : '+',
          amount: Number(charge.amount) || 0
        }))
      )
    } catch (error) {
      console.error('Failed to load stock wattak details', error)
      toast.error('Unable to load Stock Wattak details')
      navigate('/entries/stock-wattak')
    }
  }, [activeCompany, addCustomVehicleOption, addCustomChallanOption, isEditMode, navigate, wattakId])

  useEffect(() => {
    let isMounted = true

    const initialize = async () => {
      if (!activeCompany) return
      setLoading(true)
      await loadMasterData()
      await loadExistingWattak()
      if (isMounted) {
        initialLoadCompleteRef.current = true // Mark initial load complete
        setReadyForChanges(true)
        setHasChanges(false)
        dispatch(endTabTransaction({ tabId, saved: true }))
        setLoading(false)
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [activeCompany, dispatch, loadExistingWattak, loadMasterData, tabId])

  useEffect(() => {
    if (!readyForChanges || hasChanges) {
      return
    }
    formSnapshotRef.current = JSON.stringify(captureFormState())
  }, [captureFormState, readyForChanges, hasChanges])

  // Load available transfers from ledger when component loads
  useEffect(() => {
    if (!activeCompany || !readyForChanges) return

    const loadAvailableTransfers = async () => {
      try {
        const filters: any = {}
        if (isEditMode && wattakId) {
          filters.excludeWattakId = wattakId // Exclude current wattak in edit mode
        }
        const resp = await window.api.stockWattak.getAvailableTransfers(activeCompany.id, filters)
        if (resp.success && resp.data) {
          setStockTransfers(resp.data)
          
          // Extract unique parties from available transfers
          const partyMap = new Map<string, AccountOption>()
          resp.data.forEach((transfer: any) => {
            if (!transfer.accountId) return
            const name = transfer.accountName || transfer.account?.accountName || 'Party'
            partyMap.set(transfer.accountId, { id: transfer.accountId, name })
          })
          setPartyOptions(Array.from(partyMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
        }
      } catch (error) {
        console.error('Failed to load available transfers', error)
      }
    }

    loadAvailableTransfers()
  }, [activeCompany, readyForChanges])

  const totals = useMemo(() => {
    const totalNug = itemRows.reduce((sum, row) => sum + Number(row.nug || 0), 0)
    const totalWt = itemRows.reduce((sum, row) => sum + Number(row.wt || 0), 0)
    const basicAmount = itemRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const chargesTotal = chargeRows.reduce((sum, row) => {
      const lineAmount = Number(row.amount || 0)
      return row.plusMinus === '-' ? sum - lineAmount : sum + lineAmount
    }, 0)
    const roundOff = Number(roundOffInput) || 0
    const totalAmount = basicAmount + chargesTotal + roundOff

    return { totalNug, totalWt, basicAmount, chargesTotal, roundOff, totalAmount }
  }, [chargeRows, itemRows, roundOffInput])

  const itemAmountPreview = useMemo(() => {
    const rateValue = Number(itemRate) || 0
    const nugValue = Number(itemNug) || 0
    const wtValue = Number(itemWt) || 0
    const quantity = itemPer === 'kg' ? wtValue : nugValue
    return rateValue * quantity
  }, [itemNug, itemPer, itemRate, itemWt])

  const itemBalancePreview = useMemo(() => {
    const issuedValue = Number(itemIssuedNug) || 0
    const nugValue = Number(itemNug) || 0
    return issuedValue - nugValue
  }, [itemIssuedNug, itemNug])

  useEffect(() => {
    if (!selectedChargeHeadId) return
    const head = chargeHeads.find((entry) => entry.id === selectedChargeHeadId)
    if (!head) return
    setChargePlusMinus(head.chargeType === 'minus' ? '-' : '+')
    if (head.feedAs === 'onWeight') {
      setChargeOnValue(String(totals.totalWt || 0))
    } else if (head.feedAs === 'onNug') {
      setChargeOnValue(String(totals.totalNug || 0))
    }
  }, [selectedChargeHeadId, chargeHeads, totals.totalWt, totals.totalNug])

  useEffect(() => {
    if (!selectedChargeHeadFeedAs || selectedChargeHeadFeedAs === 'absolute') {
      return
    }

    const onValue = parseFloat(chargeOnValue) || 0
    const per = parseFloat(chargePer) || 0
    const atRate = parseFloat(chargeAtRate) || 0
    const no = parseFloat(chargeNo) || 0

    let calculatedAmount = 0

    switch (selectedChargeHeadFeedAs) {
      case 'percentage':
        calculatedAmount = (onValue * atRate) / 100
        break
      case 'onWeight':
        calculatedAmount = per > 0 ? (onValue / per) * atRate : onValue * atRate
        break
      case 'onNug':
      case 'onPetti':
        calculatedAmount = no > 0 ? no * atRate : onValue * atRate
        break
    }

    if (calculatedAmount > 0) {
      setChargeAmount(calculatedAmount.toFixed(2))
    }
  }, [selectedChargeHeadFeedAs, chargeOnValue, chargePer, chargeAtRate, chargeNo])

  const resetItemForm = () => {
    setSelectedItemId('')
    setItemLotNo('')
    setItemNug('')
    setItemWt('')
    setItemRate('')
    setItemPer('nug')
    setItemIssuedNug('')
    setEditingItemId(null)
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

    const nugValue = Number(itemNug) || 0
    const wtValue = Number(itemWt) || 0
    const rateValue = Number(itemRate) || 0
    const issuedValue = Number(itemIssuedNug) || 0
    const balanceValue = issuedValue - nugValue
    const quantity = itemPer === 'kg' ? wtValue : nugValue
    const amount = rateValue * quantity

    // Try to find matching transfer for this item
    let stockTransferId: string | undefined
    if (partyId && vehicleNo && challanNo) {
      const normalizedVehicle = vehicleNo.trim().toLowerCase()
      const normalizedChallan = challanNo.trim().toLowerCase()
      const normalizedLot = itemLotNo.trim().toLowerCase()
      
      const matchingTransfer = stockTransfers.find((transfer: any) => {
        if (transfer.accountId !== partyId) return false
        const transferVehicle = (transfer.vehicleNo || '').trim().toLowerCase()
        const transferChallan = (transfer.challanNo || '').trim().toLowerCase()
        if (transferVehicle !== normalizedVehicle || transferChallan !== normalizedChallan) return false
        
        return (transfer.items || []).some((item: any) => 
          item.itemId === selectedItemId && 
          (item.lotNo || '').trim().toLowerCase() === normalizedLot
        )
      })
      
      if (matchingTransfer) {
        stockTransferId = matchingTransfer.id
      }
    }

    if (!stockTransferId) {
      toast.error('Cannot find matching stock transfer. Please use auto-fill or ensure party/vehicle/challan match an existing transfer.')
      return
    }

    const row: ItemRow = {
      id: editingItemId || generateId(),
      stockTransferId,
      itemId: selectedItemId,
      itemName: itemMaster.itemName,
      lotNo: itemLotNo.trim(),
      nug: nugValue,
      wt: wtValue,
      rate: rateValue,
      per: itemPer,
      amount,
      issuedNug: issuedValue,
      balanceNug: balanceValue
    }

    setItemRows((prev) => {
      if (editingItemId) {
        return prev.map((existing) => (existing.id === editingItemId ? row : existing))
      }
      return [...prev, row]
    })

    resetItemForm()
    markDirty()
  }

  const handleEditItem = (row: ItemRow) => {
    setSelectedItemId(row.itemId)
    setItemLotNo(row.lotNo)
    setItemNug(row.nug ? String(row.nug) : '')
    setItemWt(row.wt ? String(row.wt) : '')
    setItemRate(row.rate ? String(row.rate) : '')
    setItemPer(row.per)
    setItemIssuedNug(row.issuedNug ? String(row.issuedNug) : '')
    setEditingItemId(row.id)
  }

  const handleDeleteItem = (id: string) => {
    setItemRows((prev) => prev.filter((row) => row.id !== id))
    markDirty()
  }

  const resetChargeForm = () => {
    setSelectedChargeHeadId('')
    setChargeOnValue('')
    setChargePer('')
    setChargeAtRate('')
    setChargeNo('')
    setChargePlusMinus('+')
    setChargeAmount('')
    setEditingChargeId(null)
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

    const amountValue = Number(chargeAmount) || 0
    if (amountValue === 0) {
      toast.error('Enter charge amount')
      return
    }

    const row: ChargeRow = {
      id: editingChargeId || generateId(),
      otherChargesId: selectedChargeHeadId,
      chargesHeadName: chargeHead.headingName,
      onValue: chargeOnValue ? Number(chargeOnValue) : null,
      per: chargePer ? Number(chargePer) : null,
      atRate: chargeAtRate ? Number(chargeAtRate) : null,
      no: chargeNo ? Number(chargeNo) : null,
      plusMinus: chargePlusMinus,
      amount: amountValue
    }

    setChargeRows((prev) => {
      if (editingChargeId) {
        return prev.map((existing) => (existing.id === editingChargeId ? row : existing))
      }
      return [...prev, row]
    })

    resetChargeForm()
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
    setActiveTab('charges')
  }

  const handleDeleteCharge = (id: string) => {
    setChargeRows((prev) => prev.filter((row) => row.id !== id))
    markDirty()
  }

  const handleSave = useCallback(async () => {
    if (!activeCompany) {
      toast.error('Select a company to save Stock Wattak')
      return
    }
    if (!partyId) {
      toast.error('Party is required')
      return
    }
    if (itemRows.length === 0) {
      toast.error('Add at least one item before saving')
      return
    }

    setSaving(true)
    try {
      const payload = {
        partyId,
        vchNo: voucherNo,
        vehicleNo: vehicleNo || null,
        challanNo: challanNo || null,
        totalNug: totals.totalNug,
        totalWt: totals.totalWt,
        basicAmount: totals.basicAmount,
        totalCharges: totals.chargesTotal,
        roundOff: totals.roundOff,
        totalAmount: totals.totalAmount,
        items: itemRows.map((row) => ({
          stockTransferId: row.stockTransferId, // Link to source transfer
          itemId: row.itemId,
          lotNo: row.lotNo || null,
          nug: row.nug,
          wt: row.wt,
          rate: row.rate,
          per: row.per,
          basicAmount: row.amount,
          issuedNug: row.issuedNug,
          balanceNug: row.balanceNug
        })),
        chargeLines: chargeRows.map((row) => ({
          otherChargesId: row.otherChargesId,
          onValue: row.onValue,
          per: row.per,
          atRate: row.atRate,
          no: row.no,
          plusMinus: row.plusMinus,
          amount: row.amount
        }))
      }

      const response = isEditMode && wattakId
        ? await window.api.stockWattak.update(wattakId, payload)
        : await window.api.stockWattak.create(activeCompany.id, payload)

      if (response.success) {
        toast.success(isEditMode ? 'Stock Wattak updated successfully' : 'Stock Wattak created successfully')
        setHasChanges(false)
        dispatch(endTabTransaction({ tabId, saved: true }))
        navigate('/entries/stock-wattak')
      } else {
        toast.error(response.error || 'Failed to save Stock Wattak')
      }
    } catch (error: any) {
      console.error('Failed to save stock wattak', error)
      toast.error(error?.message || 'Unable to save Stock Wattak')
    } finally {
      setSaving(false)
    }
  }, [activeCompany, chargeRows, dispatch, isEditMode, itemRows, navigate, partyId, tabId, totals, vehicleNo, voucherNo, wattakId, challanNo])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const handleCancel = () => {
    if (hasChanges) {
      setShowCancelDialog(true)
    } else {
      navigate('/entries/stock-wattak')
    }
  }

  const handleConfirmDiscard = () => {
    setHasChanges(false)
    dispatch(endTabTransaction({ tabId, saved: false }))
    setShowCancelDialog(false)
    navigate('/entries/stock-wattak')
  }

  const handleCancelTransaction = useCallback(() => {
    if (!tabTransactionState.isActive || !formSnapshotRef.current) {
      return
    }
    try {
      const snapshot = JSON.parse(formSnapshotRef.current) as FormSnapshot
      setVoucherNo(snapshot.voucherNo)
      setWattakDate(snapshot.wattakDate)
      setPartyId(snapshot.partyId)
      setVehicleNo(snapshot.vehicleNo)
      setChallanNo(snapshot.challanNo)
      setRoundOffInput(snapshot.roundOffInput)
      setItemRows(snapshot.itemRows)
      setChargeRows(snapshot.chargeRows)
      setHasChanges(false)
      dispatch(endTabTransaction({ tabId, saved: false }))
      toast.success('Changes discarded')
    } catch (error) {
      console.error('Failed to restore wattak snapshot', error)
      toast.error('Unable to discard changes')
    }
  }, [dispatch, tabId, tabTransactionState.isActive])

  const refreshItemsAfterModal = useCallback(async () => {
    if (!activeCompany) return
    const response = await window.api.item.listByCompany(activeCompany.id)
    if (response.success && Array.isArray(response.data)) {
      setItemOptions(response.data.map((item: any) => ({ id: item.id, itemName: item.itemName })))
    }
  }, [activeCompany])

  useEffect(() => {
    if (!partyId || !vehicleNo || !challanNo) {
      prefillSignatureRef.current = ''
      return
    }

    // In edit mode, only auto-fill if user manually changed party/vehicle/challan
    // This prevents overwriting database values when stockTransfers loads after initial load
    if (isEditMode && !userChangedSelectionRef.current) {
      return
    }

    const normalizedVehicle = vehicleNo.trim().toLowerCase()
    const normalizedChallan = challanNo.trim().toLowerCase()
    const matchingTransfers = stockTransfers.filter((transfer: any) => {
      if (transfer.accountId !== partyId) return false
      const transferVehicle = (transfer.vehicleNo || '').trim().toLowerCase()
      const transferChallan = (transfer.challanNo || '').trim().toLowerCase()
      return transferVehicle === normalizedVehicle && transferChallan === normalizedChallan
    })

    if (!matchingTransfers.length) {
      prefillSignatureRef.current = ''
      return
    }

    const signature = matchingTransfers
      .map(
        (transfer: any) =>
          `${transfer.id}:${transfer.updatedAt || transfer.createdAt || ''}:${transfer.items?.length || 0}`
      )
      .join('|')

    if (prefillSignatureRef.current === signature) {
      return
    }

    const populatedItems: ItemRow[] = matchingTransfers.flatMap((transfer: any) =>
      (transfer.items || [])
        .filter((item: any) => item.hasRemaining !== false) // Only items with remaining quantities
        .map((item: any) => {
          // Use ledger data directly
          const remainingNug = Number(item.remainingNug ?? item.nug ?? 0)
          const remainingWt = Number(item.remainingWt ?? item.kg ?? item.wt ?? 0)
          
          // Skip fully billed items
          if (remainingNug === 0 && remainingWt === 0) return null
          
          const perValue: 'nug' | 'kg' = (item.per || 'nug').toLowerCase() === 'kg' ? 'kg' : 'nug'
          const quantity = perValue === 'kg' ? remainingWt : remainingNug
          const rateValue = Number(item.rate) || 0
          const amountValue = Number((rateValue * quantity).toFixed(2))
          
          return {
            id: generateId(),
            stockTransferId: transfer.id, // Link to source transfer
            itemId: item.itemId,
            itemName: item.itemName || item.item?.itemName || 'Item',
            lotNo: item.lotNo || '',
            nug: remainingNug,
            wt: remainingWt,
            rate: rateValue,
            per: perValue,
            amount: amountValue,
            issuedNug: remainingNug, // Show remaining quantity as issued (available to bill)
            balanceNug: 0 // Balance is 0 since we're billing the remaining amount
          }
        })
        .filter(Boolean)
    )

    setItemRows(populatedItems as ItemRow[])
    setEditingItemId(null)
    prefillSignatureRef.current = signature
    markDirty()
  }, [partyId, vehicleNo, challanNo, stockTransfers, markDirty, isEditMode])

  if (!activeCompany) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to manage Stock Wattaks.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading Stock Wattak form…</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Stock Wattak' : 'New Stock Wattak'}</h1>
              <p className="text-sm text-muted-foreground">Company: {activeCompany?.companyName || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Bill Date</Label>
              <Input
                type="date"
                value={wattakDate}
                onChange={(event) => {
                  setWattakDate(event.target.value)
                  markDirty()
                }}
                max={getTodayISODate()}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Voucher</Label>
              <Input value={voucherNo} disabled title="Auto-generated voucher number" className="w-36" />
            </div>
            <Button onClick={handleSave} disabled={saving || loading} variant="success">
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

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Bill Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>
                    Party <span className="text-destructive">*</span>
                  </Label>
                  <Combobox
                    options={partyComboboxOptions}
                    value={partyId || undefined}
                    onChange={(value) => {
                      const nextValue = value || ''
                      if (nextValue !== partyId) {
                        setVehicleNo('')
                        setChallanNo('')
                        setItemRows([])
                        setEditingItemId(null)
                        prefillSignatureRef.current = ''
                        userChangedSelectionRef.current = true // User manually changed selection
                      }
                      setPartyId(nextValue)
                      markDirty()
                    }}
                    placeholder="Search party"
                    searchPlaceholder="Search party"
                    emptyText="No party found"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vehicle No.</Label>
                  <Combobox
                    options={vehicleOptions}
                    value={vehicleNo || undefined}
                    onChange={(value) => {
                      const nextValue = value || ''
                      if (nextValue !== vehicleNo) {
                        prefillSignatureRef.current = ''
                        userChangedSelectionRef.current = true // User manually changed selection
                        if (!nextValue) {
                          setItemRows([])
                        }
                      }
                      setVehicleNo(nextValue)
                      markDirty()
                    }}
                    placeholder={partyId ? 'Select vehicle' : 'Select party first'}
                    disabled={!partyId}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Challan No.</Label>
                  <Combobox
                    options={challanOptions}
                    value={challanNo || undefined}
                    onChange={(value) => {
                      const nextValue = value || ''
                      if (nextValue !== challanNo) {
                        prefillSignatureRef.current = ''
                        userChangedSelectionRef.current = true // User manually changed selection
                        if (!nextValue) {
                          setItemRows([])
                        }
                      }
                      setChallanNo(nextValue)
                      markDirty()
                    }}
                    placeholder={partyId ? 'Select challan' : 'Select party first'}
                    disabled={!partyId}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'items' | 'charges')}>
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
                  <CardTitle className="text-lg">{editingItemId ? 'Edit Item' : 'Add Item'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-10">
                    <div className="space-y-1.5 lg:col-span-3">
                      <Label>Item</Label>
                      <Input
                        value={selectedItemId ? (itemOptions.find(i => i.id === selectedItemId)?.itemName || '') : ''}
                        disabled
                        placeholder="Use auto-fill or edit items"
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-3">
                      <Label>Lot No / Variety</Label>
                      <Input
                        value={itemLotNo}
                        onChange={(event) => setItemLotNo(event.target.value)}
                        placeholder="Lot or variety"
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label>Rate</Label>
                      <Input 
                        value={itemRate} 
                        onChange={(event) => setItemRate(event.target.value)} 
                        type="number" 
                        disabled={!editingItemId}
                        className={!editingItemId ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-1">
                      <Label>Per</Label>
                      <Select value={itemPer} onValueChange={(value: 'nug' | 'kg') => setItemPer(value)} disabled={!editingItemId}>
                        <SelectTrigger className={!editingItemId ? "bg-muted" : ""}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nug">Nug</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 lg:col-span-1">
                      <Label>Amount</Label>
                      <Input value={formatNumber(itemAmountPreview)} readOnly className="bg-muted" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-10">
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label>Nug</Label>
                      <Input 
                        value={itemNug} 
                        onChange={(event) => setItemNug(event.target.value)} 
                        type="number" 
                        disabled={!editingItemId}
                        className={!editingItemId ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label>Weight (Kg)</Label>
                      <Input 
                        value={itemWt} 
                        onChange={(event) => setItemWt(event.target.value)} 
                        type="number" 
                        disabled={!editingItemId}
                        className={!editingItemId ? "bg-muted" : ""}
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label>Issued Nug</Label>
                      <Input
                        value={itemIssuedNug}
                        type="number"
                        readOnly
                        className="bg-muted"
                        title="Calculated from ledger: remaining quantity + current entry quantity"
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label>Balance Nug</Label>
                      <Input value={formatNumber(itemBalancePreview, 0)} readOnly className="bg-muted" />
                    </div>
                    <div className="flex items-end gap-2 lg:col-span-2">
                      {editingItemId ? (
                        <>
                          <Button onClick={handleAddItem} className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Update Item
                          </Button>
                          <Button variant="ghost" onClick={resetItemForm} className="w-full">
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <div className="w-full text-sm text-muted-foreground text-center py-2">
                          Edit items from the table below
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">Sn.</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Lot / Variety</TableHead>
                          <TableHead className="text-right">Nug</TableHead>
                          <TableHead className="text-right">Wt</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Per</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Issued</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead className="w-24 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                              No items added yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          itemRows.map((row, index) => (
                            <TableRow key={row.id} className="hover:bg-muted/50">
                              <TableCell className="text-center">{index + 1}</TableCell>
                              <TableCell className="font-medium">{row.itemName}</TableCell>
                              <TableCell>{row.lotNo || '—'}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.nug, 0)}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.wt)}</TableCell>
                              <TableCell className="text-right">₹{formatNumber(row.rate)}</TableCell>
                              <TableCell className="text-right uppercase">{row.per}</TableCell>
                              <TableCell className="text-right">₹{formatNumber(row.amount)}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.issuedNug, 0)}</TableCell>
                              <TableCell className="text-right">{formatNumber(row.balanceNug, 0)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditItem(row)}>
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
                  <CardTitle className="text-lg">{editingChargeId ? 'Edit Charge' : 'Add Charge'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8 mb-4"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddCharge()
                      }
                    }}
                  >
                    <div className="space-y-1.5 col-span-2">
                      <Label>Charges Head</Label>
                      <Select value={selectedChargeHeadId} onValueChange={(value) => setSelectedChargeHeadId(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select charges head" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {chargeHeads.map((head) => (
                            <SelectItem key={head.id} value={head.id}>
                              {head.headingName}
                              {head.feedAs ? ` (${head.feedAs})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedChargeHeadFeedAs && selectedChargeHeadFeedAs !== 'absolute' && (
                      <div className="space-y-1.5">
                        <Label>
                          {selectedChargeHeadFeedAs === 'onWeight'
                            ? 'Total Kg'
                            : selectedChargeHeadFeedAs === 'onNug'
                              ? 'Total Nug'
                              : selectedChargeHeadFeedAs === 'onPetti'
                                ? 'Total Petti'
                                : 'On Value'}
                        </Label>
                        <Input
                          value={chargeOnValue}
                          onChange={(event) => setChargeOnValue(event.target.value)}
                          type="number"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {selectedChargeHeadFeedAs === 'onWeight' && (
                      <div className="space-y-1.5">
                        <Label>Per</Label>
                        <Input
                          value={chargePer}
                          onChange={(event) => setChargePer(event.target.value)}
                          type="number"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {(selectedChargeHeadFeedAs === 'onNug' || selectedChargeHeadFeedAs === 'onPetti') && (
                      <div className="space-y-1.5">
                        <Label>No.</Label>
                        <Input
                          value={chargeNo}
                          onChange={(event) => setChargeNo(event.target.value)}
                          type="number"
                          placeholder="0"
                        />
                      </div>
                    )}

                    {selectedChargeHeadFeedAs && selectedChargeHeadFeedAs !== 'absolute' && (
                      <div className="space-y-1.5">
                        <Label>
                          {selectedChargeHeadFeedAs === 'percentage' ? 'Percentage' : 'At Rate'}
                        </Label>
                        <Input
                          value={chargeAtRate}
                          onChange={(event) => setChargeAtRate(event.target.value)}
                          type="number"
                          placeholder={selectedChargeHeadFeedAs === 'percentage' ? '%' : '0.00'}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label>Type</Label>
                      <Select value={chargePlusMinus} onValueChange={(value: '+' | '-') => setChargePlusMinus(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+">+ Plus</SelectItem>
                          <SelectItem value="-">- Minus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Amount</Label>
                      <Input
                        value={chargeAmount}
                        onChange={(event) => setChargeAmount(event.target.value)}
                        type="number"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-end gap-2 lg:col-span-2">
                      <Button onClick={handleAddCharge} className="w-full">
                        {editingChargeId ? (
                          <>
                            <Edit2 className="mr-2 h-4 w-4" /> Update
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" /> Add
                          </>
                        )}
                      </Button>
                      {editingChargeId && (
                        <Button variant="ghost" onClick={resetChargeForm} className="w-full">
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Charges Head</TableHead>
                          <TableHead className="text-center">Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chargeRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                              No charges added yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          chargeRows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-muted/50">
                              <TableCell>{row.chargesHeadName}</TableCell>
                              <TableCell className="text-center">{row.plusMinus}</TableCell>
                              <TableCell className="text-right">₹{formatNumber(row.amount)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditCharge(row)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => handleDeleteCharge(row.id)}
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
          </Tabs>
        </div>
      </div>

      <div className="border-t bg-white">
        <div className="overflow-x-auto px-4 py-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Total Nug</TableHead>
                <TableHead className="text-center">Total Kg</TableHead>
                <TableHead className="text-center">Basic Amt</TableHead>
                <TableHead className="text-center">Charges</TableHead>
                <TableHead className="text-center">Round Off</TableHead>
                <TableHead className="text-center">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="text-center font-semibold">{formatNumber(totals.totalNug, 0)}</TableCell>
                <TableCell className="text-center font-semibold">{formatNumber(totals.totalWt)}</TableCell>
                <TableCell className="text-center font-semibold">₹{formatNumber(totals.basicAmount)}</TableCell>
                <TableCell className="text-center font-semibold">₹{formatNumber(totals.chargesTotal)}</TableCell>
                <TableCell className="text-center">
                  <Input
                    value={roundOffInput}
                    onChange={(event) => {
                      setRoundOffInput(event.target.value)
                      markDirty()
                    }}
                    type="number"
                    className="mx-auto w-28 text-center"
                  />
                </TableCell>
                <TableCell className="text-center font-bold text-emerald-600">
                  ₹{formatNumber(totals.totalAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you really want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard} className="bg-red-600 hover:bg-red-700">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ItemFormModal
        open={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSuccess={refreshItemsAfterModal}
        companyId={activeCompany.id}
      />
    </div>
  )
}
