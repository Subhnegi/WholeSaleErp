import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Combobox } from '@/components/ui/combobox'
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
import { ItemFormModal } from '@/components/ItemFormModal'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  endTabTransaction,
  selectTabTransactionState,
  startTabTransaction
} from '@/store/slices/tabSlice'
import { toast } from 'sonner'

interface AccountOption {
  id: string
  name: string
  accountGroupId?: string
  accountGroup?: {
    id: string
    name: string
  }
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
  itemId: string
  itemName: string
  lotNo: string
  nug: number
  kg: number
  rate: number
  per: 'nug' | 'kg'
  amount: number
  ourRate: number
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

interface TransportDetailsForm {
  driverName: string
  fromLocation: string
  toLocation: string
  freightAmount: string
  advanceAmount: string
}

interface FormSnapshot {
  voucherNo: string
  transferDate: string
  partyId: string
  vehicleNo: string
  challanNo: string
  remarks: string
  driverName: string
  fromLocation: string
  toLocation: string
  freightAmount: string
  advanceAmount: string
  totalOurCostInput: string
  itemRows: ItemRow[]
  chargeRows: ChargeRow[]
}

interface StockTransferEntryFormPageProps {
  tabId: string
  currentRoute: string
}

const formatNumber = (value: number, fractionDigits = 2) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })

const getTodayISODate = () => new Date().toISOString().split('T')[0]

export default function StockTransferEntryFormPage({
  tabId,
  currentRoute
}: StockTransferEntryFormPageProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  const companyId = activeCompany?.id
  const tabTransactionState = useAppSelector((state) => selectTabTransactionState(state, tabId))

  const isEditMode = currentRoute.startsWith('/entries/stock-transfer/edit/')
  const transferId = isEditMode ? currentRoute.split('/').at(-1) ?? '' : ''

  const [initialized, setInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showTransportDialog, setShowTransportDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'items' | 'charges'>('items')

  const [voucherNo, setVoucherNo] = useState('')
  const [transferDate, setTransferDate] = useState(() => getTodayISODate())
  const [partyId, setPartyId] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [challanNo, setChallanNo] = useState('')
  const [remarks, setRemarks] = useState('')
  const [driverName, setDriverName] = useState('')
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [freightAmount, setFreightAmount] = useState('0')
  const [advanceAmount, setAdvanceAmount] = useState('0')
  const [totalOurCostInput, setTotalOurCostInput] = useState('0')

  const [partyOptions, setPartyOptions] = useState<AccountOption[]>([])
  const [allAccounts, setAllAccounts] = useState<AccountOption[]>([])
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([])
  const [chargeHeads, setChargeHeads] = useState<ChargeHead[]>([])
  const [stockLedger, setStockLedger] = useState<any[]>([])
  const [arrivalItemRates, setArrivalItemRates] = useState<Map<string, number>>(new Map())

  const [itemRows, setItemRows] = useState<ItemRow[]>([])
  const [chargeRows, setChargeRows] = useState<ChargeRow[]>([])

  const [transportDraft, setTransportDraft] = useState<TransportDetailsForm>({
    driverName,
    fromLocation,
    toLocation,
    freightAmount,
    advanceAmount
  })

  const formSnapshotRef = useRef<FormSnapshot>({
    voucherNo,
    transferDate,
    partyId,
    vehicleNo,
    challanNo,
    remarks,
    driverName,
    fromLocation,
    toLocation,
    freightAmount,
    advanceAmount,
    totalOurCostInput,
    itemRows,
    chargeRows
  })
  const initialStateRef = useRef<string>('')

  const [showItemModal, setShowItemModal] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [itemLotNo, setItemLotNo] = useState('')
  const [itemNug, setItemNug] = useState('')
  const [itemKg, setItemKg] = useState('')
  const [itemRate, setItemRate] = useState('')
  const [itemPer, setItemPer] = useState<'nug' | 'kg'>('nug')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const itemBasicAmount = useMemo(() => {
    const nugValue = Number(itemNug) || 0
    const kgValue = Number(itemKg) || 0
    const rateValue = Number(itemRate) || 0
    const quantity = itemPer === 'kg' ? kgValue : nugValue
    return quantity * rateValue
  }, [itemNug, itemKg, itemRate, itemPer])

  const [chargeForm, setChargeForm] = useState({
    headId: '',
    onValue: '',
    per: '',
    atRate: '',
    no: '',
    plusMinus: '+' as '+' | '-',
    amount: ''
  })
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null)

  const selectedChargeHeadFeedAs = useMemo(() => {
    if (!chargeForm.headId) return null
    const chargeHead = chargeHeads.find((ch) => ch.id === chargeForm.headId)
    return chargeHead?.feedAs || 'absolute'
  }, [chargeForm.headId, chargeHeads])

  // Calculate lot stock from stock ledger for filtering items and lots
  const lotStock = useMemo(() => {
    const result = stockLedger.map((ledger: any) => ({
      supplierId: ledger.supplierId,
      itemId: ledger.itemId,
      lotNoVariety: ledger.lotNoVariety,
      storeId: ledger.storeId,
      totalNug: ledger.totalNug,
      totalKg: ledger.totalKg,
      soldNug: ledger.soldNug,
      soldKg: ledger.soldKg,
      availableNug: ledger.availableNug,
      availableKg: ledger.availableKg
    }))

    const findOrCreateEntry = (row: ItemRow) => {
      const entryMatchesRow = (l: any) =>
        l.itemId === row.itemId &&
        l.lotNoVariety === row.lotNo

      let ledgerEntry = result.find(entryMatchesRow)
      if (!ledgerEntry) {
        ledgerEntry = {
          supplierId: '',
          itemId: row.itemId,
          lotNoVariety: row.lotNo,
          storeId: '',
          totalNug: 0,
          totalKg: 0,
          soldNug: 0,
          soldKg: 0,
          availableNug: 0,
          availableKg: 0
        }
        result.push(ledgerEntry)
      }
      return ledgerEntry
    }

    // In edit mode, add back the original items (they're already subtracted in the ledger)
    if (isEditMode && initialStateRef.current) {
      try {
        const initialState = JSON.parse(initialStateRef.current) as FormSnapshot
        if (initialState.itemRows) {
          initialState.itemRows.forEach((row) => {
            if (!row.lotNo) return
            const ledgerEntry = findOrCreateEntry(row)
            ledgerEntry.availableNug += row.nug || 0
            ledgerEntry.availableKg += row.kg || 0
          })
        }
      } catch (e) {
        console.error('Failed to parse initial state:', e)
      }
    }

    // Subtract items in current session (itemRows) that haven't been saved yet
    itemRows.forEach((row) => {
      if (!row.lotNo) return

      const ledgerEntry = result.find(
        (l: any) =>
          l.itemId === row.itemId &&
          l.lotNoVariety === row.lotNo
      )

      if (ledgerEntry) {
        // If editing this item, add its quantity back to available (restore it)
        if (editingItemId && row.id === editingItemId) {
          ledgerEntry.availableNug += row.nug || 0
          ledgerEntry.availableKg += row.kg || 0
        } else {
          // Otherwise subtract from available
          ledgerEntry.availableNug -= row.nug || 0
          ledgerEntry.availableKg -= row.kg || 0
        }
      }
    })

    // Filter out entries with no available stock
    return result.filter((lot: any) => lot.availableNug > 0 || lot.availableKg > 0)
  }, [stockLedger, itemRows, isEditMode, editingItemId])

  // Get available lots for selected item from stock ledger (filter by item and Mall Khata supplier only)
  const availableLots = useMemo(() => {
    if (!selectedItemId) return []

    // Find "Mall Khata Purchase A/c" account from all accounts
    const mallKhataAccount = allAccounts.find(
      (account) => account.name.toLowerCase().trim() === 'mall khata purchase a/c'
    )
    
    if (!mallKhataAccount) {
      // If Mall Khata account not found, show all lots for selected item (fallback)
      console.warn('[StockTransfer] Mall Khata Purchase A/c not found, showing all lots')
      const filtered = lotStock.filter((ls) => ls.itemId === selectedItemId)
      
      const lots = filtered.map((ls) => ({
        lotNo: ls.lotNoVariety,
        availableNug: ls.availableNug,
        availableKg: ls.availableKg
      }))

      // Ensure current editing lot is available even if stock is zero
      if (editingItemId) {
        const editingItem = itemRows.find((row) => row.id === editingItemId)
        if (editingItem && editingItem.lotNo) {
          let lot = lots.find((l) => l.lotNo === editingItem.lotNo)
          if (!lot) {
            lots.push({
              lotNo: editingItem.lotNo,
              availableNug: editingItem.nug,
              availableKg: editingItem.kg
            })
          } else {
            lot.availableNug = Math.max(lot.availableNug, editingItem.nug)
            lot.availableKg = Math.max(lot.availableKg, editingItem.kg)
          }
        }
      }

      return lots.filter((lot) => lot.availableNug > 0 || lot.availableKg > 0)
    }

    // Filter lot stock by item and Mall Khata supplier
    const filtered = lotStock.filter(
      (ls) => ls.itemId === selectedItemId && ls.supplierId === mallKhataAccount.id
    )

    // Map to expected format
    const lots = filtered.map((ls) => ({
      lotNo: ls.lotNoVariety,
      availableNug: ls.availableNug,
      availableKg: ls.availableKg
    }))

    // Ensure current editing lot is available even if stock is zero
    if (editingItemId) {
      const editingItem = itemRows.find((row) => row.id === editingItemId)
      if (editingItem && editingItem.lotNo) {
        let lot = lots.find((l) => l.lotNo === editingItem.lotNo)
        if (!lot) {
          lots.push({
            lotNo: editingItem.lotNo,
            availableNug: editingItem.nug,
            availableKg: editingItem.kg
          })
        } else {
          lot.availableNug = Math.max(lot.availableNug, editingItem.nug)
          lot.availableKg = Math.max(lot.availableKg, editingItem.kg)
        }
      }
    }

    // Filter out lots with 0 or negative available
    return lots.filter((lot) => lot.availableNug > 0 || lot.availableKg > 0)
  }, [selectedItemId, lotStock, editingItemId, itemRows, allAccounts])

  // Lot options for dropdown
  const lotOptions = useMemo(() => {
    return availableLots.map((lot) => ({
      value: lot.lotNo,
      label: `${lot.lotNo} (${lot.availableNug} nug, ${lot.availableKg.toFixed(2)} kg available)`
    }))
  }, [availableLots])

  // Get available nug for selected item (total across all lots)
  const availableNugForItem = useMemo(() => {
    return availableLots.reduce((sum, lot) => sum + lot.availableNug, 0)
  }, [availableLots])

  // Get available kg for selected item (total across all lots)
  const availableKgForItem = useMemo(() => {
    return availableLots.reduce((sum, lot) => sum + lot.availableKg, 0)
  }, [availableLots])

  // Filtered item options - show only items with available stock from "Mall Khata Purchase A/c" supplier
  const filteredItemOptions = useMemo(() => {
    // Find "Mall Khata Purchase A/c" account from all accounts
    const mallKhataAccount = allAccounts.find(
      (account) => account.name.toLowerCase().trim() === 'mall khata purchase a/c'
    )
    
    if (!mallKhataAccount) {
      // If Mall Khata account not found, show all items with stock (fallback)
      console.warn('[StockTransfer] Mall Khata Purchase A/c not found in accounts')
      const itemIdsWithStock = new Set<string>()
      lotStock.forEach((ls) => {
        if (ls.availableNug > 0 || ls.availableKg > 0) {
          itemIdsWithStock.add(ls.itemId)
        }
      })
      return itemOptions.filter((item) => itemIdsWithStock.has(item.id))
    }

    // Get unique item IDs that have available stock from Mall Khata supplier
    const itemIdsWithStock = new Set<string>()
    lotStock.forEach((ls) => {
      if (
        ls.supplierId === mallKhataAccount.id &&
        (ls.availableNug > 0 || ls.availableKg > 0)
      ) {
        itemIdsWithStock.add(ls.itemId)
      }
    })

    // Filter items to only those with stock from Mall Khata
    return itemOptions.filter((item) => itemIdsWithStock.has(item.id))
  }, [itemOptions, lotStock, allAccounts])

  const hasTransportInfo = useMemo(() => {
    return Boolean(
      driverName.trim() ||
        fromLocation.trim() ||
        toLocation.trim() ||
        Number(freightAmount || 0) !== 0 ||
        Number(advanceAmount || 0) !== 0
    )
  }, [advanceAmount, driverName, freightAmount, fromLocation, toLocation])

  const totals = useMemo(() => {
    const totalNug = itemRows.reduce((sum, row) => sum + row.nug, 0)
    const totalKg = itemRows.reduce((sum, row) => sum + row.kg, 0)
    const basicAmount = itemRows.reduce((sum, row) => sum + row.amount, 0)
    const totalOurRate = itemRows.reduce((sum, row) => sum + row.ourRate, 0)
    const chargesNet = chargeRows.reduce((sum, row) => {
      return row.plusMinus === '-' ? sum - row.amount : sum + row.amount
    }, 0)
    const chargesAbsolute = chargeRows.reduce((sum, row) => sum + row.amount, 0)
    const ourCost = totalOurRate // Total Our Cost = sum(our rate)
    const freight = Number(freightAmount) || 0
    const advance = Number(advanceAmount) || 0
    const totalAmount = basicAmount + chargesNet + freight - advance

    return {
      totalNug,
      totalKg,
      basicAmount,
      totalOurRate,
      chargesNet,
      chargesAbsolute,
      ourCost,
      freight,
      advance,
      totalAmount
    }
  }, [itemRows, chargeRows, freightAmount, advanceAmount])

  useEffect(() => {
    formSnapshotRef.current = {
      voucherNo,
      transferDate,
      partyId,
      vehicleNo,
      challanNo,
      remarks,
      driverName,
      fromLocation,
      toLocation,
      freightAmount,
      advanceAmount,
      totalOurCostInput,
      itemRows,
      chargeRows
    }
  }, [
    advanceAmount,
    chargeRows,
    driverName,
    freightAmount,
    fromLocation,
    itemRows,
    partyId,
    remarks,
    toLocation,
    totalOurCostInput,
    transferDate,
    vehicleNo,
    voucherNo,
    challanNo
  ])

  const markDirty = useCallback(() => {
    if (!initialized) return
    if (!tabTransactionState.isActive) {
      initialStateRef.current = JSON.stringify(formSnapshotRef.current)
      dispatch(startTabTransaction({ tabId, transactionType: 'stockTransfer' }))
    }
    setHasChanges(true)
  }, [dispatch, initialized, tabId, tabTransactionState.isActive])

  const handleOpenTransportDialog = useCallback(() => {
    setTransportDraft({
      driverName,
      fromLocation,
      toLocation,
      freightAmount,
      advanceAmount
    })
    setShowTransportDialog(true)
  }, [advanceAmount, driverName, freightAmount, fromLocation, toLocation])

  const handleTransportDraftChange = (field: keyof TransportDetailsForm, value: string) => {
    setTransportDraft((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveTransportInfo = () => {
    setDriverName(transportDraft.driverName || '')
    setFromLocation(transportDraft.fromLocation || '')
    setToLocation(transportDraft.toLocation || '')
    setFreightAmount(transportDraft.freightAmount || '0')
    setAdvanceAmount(transportDraft.advanceAmount || '0')
    setShowTransportDialog(false)
    markDirty()
  }

  const loadMasterData = useCallback(async () => {
    if (!activeCompany?.id) return
    const companyId = activeCompany.id

    try {
      const [accountResponse, itemResponse, chargeResponse, voucherResponse] = await Promise.all([
        window.api.account.listByCompany(companyId),
        window.api.item.listByCompany(companyId),
        window.api.otherChargesHead.listByCompany(companyId),
        window.api.stockTransfer.getNextVoucherNo(companyId)
      ])

      if (accountResponse.success && Array.isArray(accountResponse.data)) {
        // Store all accounts for Mall Khata lookup
        const allAccountsMapped = accountResponse.data
          .filter((account: any) => Boolean(account.accountName))
          .map((account: any) => ({
            id: account.id,
            name: account.accountName,
            accountGroupId: account.accountGroupId,
            accountGroup: account.accountGroup
          }))
        setAllAccounts(allAccountsMapped)

        // Filter party options to show only supplier accounts
        const mapped = accountResponse.data
          .filter((account: any) => {
            if (!Boolean(account.accountName)) return false
            // Filter to show only supplier accounts (sundry creditor accountGroup)
            const groupName = account.accountGroup?.name?.toLowerCase() || ''
            return groupName.includes('supplier') || groupName.includes('sundry creditor')
          })
          .map((account: any) => ({
            id: account.id,
            name: account.accountName,
            accountGroupId: account.accountGroupId,
            accountGroup: account.accountGroup
          }))
          .sort((a: AccountOption, b: AccountOption) => a.name.localeCompare(b.name))
        setPartyOptions(mapped)

        // Load arrival items to get rates for all item/lot combinations
        try {
          console.log('[StockTransfer] Fetching all arrivals for company:', companyId)
          const arrivalResponse = await window.api.arrival.list(companyId, {})
          
          console.log('[StockTransfer] Arrival response:', arrivalResponse)
          console.log('[StockTransfer] Arrivals count:', arrivalResponse.data?.length || 0)
          
          if (arrivalResponse.success && arrivalResponse.data) {
            const ratesMap = new Map<string, number>()
            
            // Build lookup map: itemId::lotNo -> rate
            arrivalResponse.data.forEach((arrival: any) => {
              console.log('[StockTransfer] Processing arrival:', arrival.id, 'items:', arrival.items?.length || 0)
              if (arrival.items && Array.isArray(arrival.items)) {
                arrival.items.forEach((item: any) => {
                  const key = `${item.itemId}::${(item.lotNoVariety || '').toLowerCase().trim()}`
                  const rate = Number(item.rate) || 0
                  console.log('[StockTransfer] Item:', item.itemId, 'Lot:', item.lotNoVariety, 'Rate:', item.rate, 'Key:', key)
                  // Store the most recent rate (last entry wins)
                  if (rate > 0) {
                    ratesMap.set(key, rate)
                    console.log('[StockTransfer] Set rate for key:', key, '=', rate)
                  } else {
                    console.log('[StockTransfer] Skipped item with 0 or null rate')
                  }
                })
              }
            })
            
            setArrivalItemRates(ratesMap)
            console.log('[StockTransfer] Loaded arrival item rates:', ratesMap.size, 'entries')
            console.log('[StockTransfer] Rates map:', Array.from(ratesMap.entries()))
          }
        } catch (err) {
          console.error('Error loading arrival item rates:', err)
        }
      } else {
        toast.error(accountResponse.error || 'Unable to load suppliers')
        setAllAccounts([])
        setPartyOptions([])
      }

      if (itemResponse.success && Array.isArray(itemResponse.data)) {
        const mappedItems = itemResponse.data.map((item: any) => ({
          id: item.id,
          itemName: item.itemName || 'Item'
        }))
        setItemOptions(mappedItems)
      } else {
        toast.error(itemResponse.error || 'Unable to load items')
        setItemOptions([])
      }

      if (chargeResponse.success && Array.isArray(chargeResponse.data)) {
        setChargeHeads(chargeResponse.data)
      } else {
        toast.error(chargeResponse.error || 'Unable to load charges')
        setChargeHeads([])
      }

      if (!isEditMode && voucherResponse.success && voucherResponse.data) {
        setVoucherNo(voucherResponse.data)
      }

      // Load stock ledger for available stock filtering
      try {
        const ledgerResponse = await window.api.stockLedger.getAvailable(companyId, {
          includeZeroAvailable: true
        })
        if (ledgerResponse.success && ledgerResponse.data) {
          setStockLedger(ledgerResponse.data)

          // If ledger is empty, initialize it from existing data
          if (ledgerResponse.data.length === 0) {
            console.log('[StockTransfer] Stock ledger is empty, initializing from existing data...')
            const initResponse = await window.api.stockLedger.initialize(companyId)
            if (initResponse.success) {
              console.log('[StockTransfer] Stock ledger initialized successfully')
              // Reload the ledger
              const reloadResponse = await window.api.stockLedger.getAvailable(companyId, {
                includeZeroAvailable: true
              })
              if (reloadResponse.success && reloadResponse.data) {
                setStockLedger(reloadResponse.data)
                console.log(
                  '[StockTransfer] Stock ledger loaded:',
                  reloadResponse.data.length,
                  'entries'
                )
              }
            } else {
              console.error('[StockTransfer] Failed to initialize stock ledger:', initResponse.error)
            }
          } else {
            console.log('[StockTransfer] Stock ledger loaded:', ledgerResponse.data.length, 'entries')
          }
        }
      } catch (err) {
        console.error('Error loading stock ledger:', err)
      }
    } catch (error) {
      console.error('Failed to load stock transfer references', error)
      toast.error('Unable to load reference data for stock transfers')
    }
  }, [activeCompany?.id, isEditMode])

  const loadExistingTransfer = useCallback(async () => {
    if (!isEditMode || !transferId) return

    try {
      const response = await window.api.stockTransfer.get(transferId)
      if (!response.success || !response.data) {
        toast.error(response.error || 'Unable to load stock transfer')
        navigate('/entries/stock-transfer')
        return
      }

      const transfer = response.data as any
      setVoucherNo(transfer.vchNo || '')
      const createdDate = transfer.createdAt ? transfer.createdAt.split('T')[0] : getTodayISODate()
      setTransferDate(createdDate)
      setPartyId(transfer.accountId)
      setVehicleNo(transfer.vehicleNo || '')
      setChallanNo(transfer.challanNo || '')
      setRemarks(transfer.remarks || '')
      setDriverName(transfer.driverName || '')
      setFromLocation(transfer.fromLocation || '')
      setToLocation(transfer.toLocation || '')
      setFreightAmount(String(transfer.freightAmount ?? 0))
      setAdvanceAmount(String(transfer.advanceAmount ?? 0))
      setTotalOurCostInput(String(transfer.totalOurCost ?? 0))

      const mappedItems: ItemRow[] = (transfer.items || []).map((item: any) => {
        // Get arrival rate and calculate our rate = arrival rate * quantity
        const rateKey = `${item.itemId}::${(item.lotNo || '').toLowerCase().trim()}`
        const arrivalRate = arrivalItemRates.get(rateKey) || 0
        const per = (item.per || 'nug').toLowerCase() === 'kg' ? 'kg' : 'nug'
        const quantity = per === 'kg' ? Number(item.kg) || 0 : Number(item.nug) || 0
        const ourRate = Number(item.ourRate) || Number((arrivalRate * quantity).toFixed(2))

        return {
          id: item.id,
          itemId: item.itemId,
          itemName: item.itemName || item.item?.itemName || 'Item',
          lotNo: item.lotNo || '',
          nug: Number(item.nug) || 0,
          kg: Number(item.kg) || 0,
          rate: Number(item.rate) || 0,
          per,
          amount: Number(item.basicAmount ?? item.amount ?? 0),
          ourRate
        }
      })
      setItemRows(mappedItems)

      const mappedCharges: ChargeRow[] = (transfer.chargeLines || []).map((charge: any) => ({
        id: charge.id,
        otherChargesId: charge.otherChargesId,
        chargesHeadName: charge.chargesHeadName || '',
        onValue: charge.onValue ?? null,
        per: charge.per ?? null,
        atRate: charge.atRate ?? null,
        no: charge.no ?? null,
        plusMinus: charge.plusMinus === '-' ? '-' : '+',
        amount: Number(charge.amount) || 0
      }))
      setChargeRows(mappedCharges)

      setPartyOptions((prev) => {
        if (!transfer.accountId) return prev
        if (prev.some((option) => option.id === transfer.accountId)) {
          return prev
        }
        return [
          ...prev,
          {
            id: transfer.accountId,
            name: transfer.accountName || 'Supplier'
          }
        ]
      })
    } catch (error) {
      console.error('Failed to load stock transfer', error)
      toast.error('Unable to fetch stock transfer details')
      navigate('/entries/stock-transfer')
    }
  }, [isEditMode, navigate, transferId])

  useEffect(() => {
    if (!companyId) return
    let cancelled = false

    const initialize = async () => {
      setLoading(true)
      try {
        await loadMasterData()
        if (isEditMode) {
          await loadExistingTransfer()
        } else {
          setItemRows([])
          setChargeRows([])
          setTransferDate(getTodayISODate())
        }
        if (!cancelled) {
          setHasChanges(false)
          dispatch(endTabTransaction({ tabId, saved: true }))
          setInitialized(true)
        }
      } catch (error) {
        console.error('Failed to initialize stock transfer entry', error)
        if (!cancelled) {
          toast.error('Unable to initialize stock transfer entry form')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [companyId, dispatch, isEditMode, loadExistingTransfer, loadMasterData, tabId])

  const handleAddItem = () => {
    if (!partyId) {
      toast.error('Select a supplier before adding')
      return
    }

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
    const kgValue = Number(itemKg) || 0
    if (nugValue <= 0 && kgValue <= 0) {
      toast.error('Enter nug or weight before adding')
      return
    }

    // Validate nug against available stock
    let nugCapacity: number | null = null
    let kgCapacity: number | null = null
    
    if (itemLotNo) {
      const selectedLot = availableLots.find((lot) => lot.lotNo === itemLotNo)
      if (selectedLot) {
        nugCapacity = selectedLot.availableNug
        kgCapacity = selectedLot.availableKg
      }
    } else if (selectedItemId) {
      nugCapacity = availableNugForItem
      kgCapacity = availableKgForItem
    }

    if (nugCapacity !== null && nugValue > nugCapacity) {
      toast.error(`Only ${nugCapacity} nug available for this selection`)
      return
    }

    if (kgCapacity !== null && kgValue > kgCapacity) {
      toast.error(`Only ${kgCapacity.toFixed(2)} kg available for this selection`)
      return
    }

    const rateValue = Number(itemRate) || 0
    const quantity = itemPer === 'kg' ? kgValue : nugValue
    const amount = Number((quantity * rateValue).toFixed(2))

    // Get arrival rate and calculate our rate = arrival rate * quantity (nug or kg)
    const rateKey = `${selectedItemId}::${itemLotNo.toLowerCase().trim()}`
    const arrivalRate = arrivalItemRates.get(rateKey) || 0
    const ourRateQuantity = itemPer === 'kg' ? kgValue : nugValue
    const ourRate = Number((arrivalRate * ourRateQuantity).toFixed(2))
    

    const row: ItemRow = {
      id: editingItemId || crypto.randomUUID(),
      itemId: selectedItemId,
      itemName: itemMaster.itemName,
      lotNo: itemLotNo.trim(),
      nug: nugValue,
      kg: kgValue,
      rate: rateValue,
      per: itemPer,
      amount,
      ourRate
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
    setItemNug(row.nug ? String(row.nug) : '')
    setItemKg(row.kg ? String(row.kg) : '')
    setItemRate(row.rate ? String(row.rate) : '')
    setItemPer(row.per)
    setEditingItemId(row.id)
    setActiveTab('items')
  }

  const handleDeleteItem = (id: string) => {
    setItemRows((prev) => prev.filter((row) => row.id !== id))
    markDirty()
  }

  const handleAddCharge = () => {
    if (!chargeForm.headId) {
      toast.error('Select a charge head before adding')
      return
    }

    const head = chargeHeads.find((ch) => ch.id === chargeForm.headId)
    if (!head) {
      toast.error('Selected charge head is not available')
      return
    }

    const amount = Number(chargeForm.amount) || 0
    if (amount === 0) {
      toast.error('Enter charge amount')
      return
    }

    const row: ChargeRow = {
      id: editingChargeId || crypto.randomUUID(),
      otherChargesId: chargeForm.headId,
      chargesHeadName: head.headingName,
      onValue: chargeForm.onValue ? Number(chargeForm.onValue) : null,
      per: chargeForm.per ? Number(chargeForm.per) : null,
      atRate: chargeForm.atRate ? Number(chargeForm.atRate) : null,
      no: chargeForm.no ? Number(chargeForm.no) : null,
      plusMinus: chargeForm.plusMinus,
      amount: amount
    }

    setChargeRows((prev) => {
      if (editingChargeId) {
        return prev.map((existing) => (existing.id === editingChargeId ? row : existing))
      }
      return [...prev, row]
    })

    setChargeForm({ headId: '', onValue: '', per: '', atRate: '', no: '', plusMinus: '+', amount: '' })
    setEditingChargeId(null)
    markDirty()
  }

  const handleEditCharge = (row: ChargeRow) => {
    setChargeForm({
      headId: row.otherChargesId,
      onValue: row.onValue !== null ? String(row.onValue) : '',
      per: row.per !== null ? String(row.per) : '',
      atRate: row.atRate !== null ? String(row.atRate) : '',
      no: row.no !== null ? String(row.no) : '',
      plusMinus: row.plusMinus,
      amount: row.amount ? String(row.amount) : ''
    })
    setEditingChargeId(row.id)
    setActiveTab('charges')
  }

  const handleDeleteCharge = (id: string) => {
    setChargeRows((prev) => prev.filter((row) => row.id !== id))
    markDirty()
  }

  const handleSave = useCallback(async () => {
    if (!activeCompany) {
      toast.error('Select a company before saving')
      return
    }

    if (!partyId) {
      toast.error('Select a party before saving')
      return
    }

    if (!voucherNo.trim()) {
      toast.error('Voucher number is required')
      return
    }

    if (itemRows.length === 0) {
      toast.error('Add at least one item before saving')
      return
    }

    setSaving(true)
    try {
      const payload = {
        accountId: partyId,
        vchNo: voucherNo,
        vehicleNo: vehicleNo || null,
        challanNo: challanNo || null,
        remarks: remarks || null,
        driverName: driverName || null,
        fromLocation: fromLocation || null,
        toLocation: toLocation || null,
        freightAmount: Number(freightAmount) || 0,
        advanceAmount: Number(advanceAmount) || 0,
        totalOurCost: totals.ourCost,
        totalNug: totals.totalNug,
        totalWt: totals.totalKg,
        basicAmount: totals.basicAmount,
        totalCharges: totals.chargesAbsolute,
        totalAmount: totals.totalAmount,
        items: itemRows.map((row) => ({
          id: row.id,
          itemId: row.itemId,
          lotNo: row.lotNo || null,
          nug: row.nug,
          kg: row.kg,
          rate: row.rate,
          per: row.per,
          basicAmount: row.amount,
          ourRate: row.ourRate
        })),
        chargeLines: chargeRows.map((row) => ({
          id: row.id,
          otherChargesId: row.otherChargesId,
          onValue: row.onValue,
          per: row.per,
          atRate: row.atRate,
          no: row.no,
          plusMinus: row.plusMinus,
          amount: row.amount
        }))
      }

      let response
      if (isEditMode && transferId) {
        response = await window.api.stockTransfer.update(transferId, payload)
      } else {
        response = await window.api.stockTransfer.create(activeCompany.id, payload)
      }

      if (response.success) {
        toast.success(isEditMode ? 'Stock transfer updated' : 'Stock transfer created')
        setHasChanges(false)
        dispatch(endTabTransaction({ tabId, saved: true }))
        navigate('/entries/stock-transfer')
      } else {
        toast.error(response.error || 'Failed to save stock transfer')
      }
    } catch (error) {
      console.error('Failed to save stock transfer', error)
      toast.error('Unable to save stock transfer')
    } finally {
      setSaving(false)
    }
  }, [
    activeCompany,
    advanceAmount,
    chargeRows,
    dispatch,
    freightAmount,
    isEditMode,
    itemRows,
    navigate,
    partyId,
    remarks,
    tabId,
    toLocation,
    fromLocation,
    totals.basicAmount,
    totals.chargesAbsolute,
    totals.totalAmount,
    totals.totalKg,
    totals.totalNug,
    totalOurCostInput,
    transferId,
    vehicleNo,
    challanNo,
    driverName,
    voucherNo
  ])

  const handleCancel = useCallback(() => {
    if (tabTransactionState.isActive && hasChanges) {
      setShowCancelDialog(true)
    } else {
      navigate('/entries/stock-transfer')
    }
  }, [hasChanges, navigate, tabTransactionState.isActive])

  const handleCancelTransaction = useCallback(() => {
    if (!tabTransactionState.isActive || !initialStateRef.current) {
      return
    }

    try {
      const snapshot = JSON.parse(initialStateRef.current) as FormSnapshot
      setVoucherNo(snapshot.voucherNo || '')
      setTransferDate(snapshot.transferDate || getTodayISODate())
      setPartyId(snapshot.partyId || '')
      setVehicleNo(snapshot.vehicleNo || '')
      setChallanNo(snapshot.challanNo || '')
      setRemarks(snapshot.remarks || '')
      setDriverName(snapshot.driverName || '')
      setFromLocation(snapshot.fromLocation || '')
      setToLocation(snapshot.toLocation || '')
      setFreightAmount(snapshot.freightAmount || '0')
      setAdvanceAmount(snapshot.advanceAmount || '0')
      setTotalOurCostInput(snapshot.totalOurCostInput || '0')
      setItemRows(snapshot.itemRows || [])
      setChargeRows(snapshot.chargeRows || [])
      setHasChanges(false)
      dispatch(endTabTransaction({ tabId, saved: false }))
      toast.success('Changes discarded')
    } catch (error) {
      console.error('Failed to restore stock transfer state:', error)
      toast.error('Unable to discard changes')
    }
  }, [dispatch, tabId, tabTransactionState.isActive])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleSave()
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        handleCancel()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleCancel, handleSave])

  useEffect(() => {
    if (!chargeForm.headId) return
    const head = chargeHeads.find((ch) => ch.id === chargeForm.headId)
    if (!head) return
    setChargeForm((prev) => {
      const updates: any = {
        plusMinus: head.chargeType === 'minus' ? '-' : '+'
      }
      if (head.feedAs === 'onWeight') {
        updates.onValue = totals.totalKg.toString()
      } else if (head.feedAs === 'onNug') {
        updates.onValue = totals.totalNug.toString()
      }
      return { ...prev, ...updates }
    })
  }, [chargeForm.headId, chargeHeads, totals.totalKg, totals.totalNug])

  useEffect(() => {
    if (!selectedChargeHeadFeedAs || selectedChargeHeadFeedAs === 'absolute') return

    const onValue = parseFloat(chargeForm.onValue) || 0
    const per = parseFloat(chargeForm.per) || 0
    const atRate = parseFloat(chargeForm.atRate) || 0
    const no = parseFloat(chargeForm.no) || 0

    let calculatedAmount = 0

    switch (selectedChargeHeadFeedAs) {
      case 'percentage':
        calculatedAmount = (onValue * atRate) / 100
        break
      case 'onWeight':
        if (per > 0) {
          calculatedAmount = (onValue / per) * atRate
        } else {
          calculatedAmount = onValue * atRate
        }
        break
      case 'onNug':
      case 'onPetti':
        if (no > 0) {
          calculatedAmount = no * atRate
        } else {
          calculatedAmount = onValue * atRate
        }
        break
    }

    if (calculatedAmount > 0) {
      setChargeForm((prev) => ({ ...prev, amount: calculatedAmount.toFixed(2) }))
    }
  }, [selectedChargeHeadFeedAs, chargeForm.onValue, chargeForm.per, chargeForm.atRate, chargeForm.no])

  if (!activeCompany) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to create stock transfers.</p>
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
              <h1 className="text-2xl font-bold">
                {isEditMode ? 'Edit Stock Transfer' : 'New Stock Transfer'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Company: {activeCompany?.companyName || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Bill Date</Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(event) => {
                  setTransferDate(event.target.value)
                  markDirty()
                }}
                max={getTodayISODate()}
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
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Bill Information</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {hasTransportInfo ? 'Transport info saved' : 'Add transport info if needed'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleOpenTransportDialog}>
                Transport Info (Optional)
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label>Party</Label>
                  <Combobox
                    value={partyId}
                    onChange={(value) => {
                      setPartyId(value)
                      markDirty()
                    }}
                    options={partyOptions.map((opt) => ({ value: opt.id, label: opt.name }))}
                    placeholder="Search Party..."
                    emptyText="No party found"
                    searchPlaceholder="Search Party..."
                  />
                </div>
                <div>
                  <Label>Vehicle No.</Label>
                  <Input
                    value={vehicleNo}
                    onChange={(event) => {
                      setVehicleNo(event.target.value)
                      markDirty()
                    }}
                    placeholder="GJ 01 XX 1234"
                  />
                </div>
                <div>
                  <Label>Challan No.</Label>
                  <Input
                    value={challanNo}
                    onChange={(event) => {
                      setChallanNo(event.target.value)
                      markDirty()
                    }}
                    placeholder="CH-001"
                  />
                </div>
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea
                  value={remarks}
                  onChange={(event) => {
                    setRemarks(event.target.value)
                    markDirty()
                  }}
                  placeholder="Remarks"
                />
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
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-8">
                    <div className="space-y-1.5">
                      <Label>Item</Label>
                      <Combobox
                        options={filteredItemOptions.map((item) => ({ value: item.id, label: item.itemName }))}
                        value={selectedItemId}
                        onChange={setSelectedItemId}
                        placeholder="Select item"
                        searchPlaceholder="Search items"
                        emptyText="No items with available stock"
                        onCreateNew={() => setShowItemModal(true)}
                        createNewLabel="Create item"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Lot No / Variety</Label>
                      <Combobox
                        options={lotOptions}
                        value={itemLotNo}
                        onChange={setItemLotNo}
                        placeholder="Select lot"
                        searchPlaceholder="Search lots"
                        emptyText={selectedItemId ? "No lots available" : "Select item first"}
                        disabled={!selectedItemId}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nug</Label>
                      <Input value={itemNug} onChange={(event) => setItemNug(event.target.value)} type="number" />
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
                      <Select value={itemPer} onValueChange={(value: 'nug' | 'kg') => setItemPer(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nug">Nug</SelectItem>
                          <SelectItem value="kg">Kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Basic Amt</Label>
                      <Input
                        value={itemBasicAmount.toFixed(2)}
                        disabled
                        type="number"
                        className="bg-muted"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddItem} className="w-full">
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
                          <TableHead>Lot / Variety</TableHead>
                          <TableHead className="text-right">Nug</TableHead>
                          <TableHead className="text-right">Wt</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Per</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Our Rate</TableHead>
                          <TableHead className="w-24 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itemRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
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
                              <TableCell className="text-right">₹{row.ourRate.toFixed(2)}</TableCell>
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
                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCharge()
                      }
                    }}
                  >
                    <div className="space-y-1.5 col-span-2">
                      <Label>Charges Head</Label>
                      <Select
                        value={chargeForm.headId}
                        onValueChange={(value) => setChargeForm((prev) => ({ ...prev, headId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select charges head" />
                        </SelectTrigger>
                        <SelectContent>
                          {chargeHeads.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>
                              {ch.headingName} ({ch.feedAs})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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
                          value={chargeForm.onValue}
                          onChange={(e) => setChargeForm((prev) => ({ ...prev, onValue: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {selectedChargeHeadFeedAs === 'onWeight' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="chargePer">Per Kg</Label>
                        <Input
                          id="chargePer"
                          type="number"
                          step="0.01"
                          value={chargeForm.per}
                          onChange={(e) => setChargeForm((prev) => ({ ...prev, per: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {(selectedChargeHeadFeedAs === 'onNug' || selectedChargeHeadFeedAs === 'onPetti') && (
                      <div className="space-y-1.5">
                        <Label htmlFor="chargeNo">No</Label>
                        <Input
                          id="chargeNo"
                          type="number"
                          step="1"
                          value={chargeForm.no}
                          onChange={(e) => setChargeForm((prev) => ({ ...prev, no: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    )}

                    {selectedChargeHeadFeedAs && selectedChargeHeadFeedAs !== 'absolute' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="chargeAtRate">
                          {selectedChargeHeadFeedAs === 'percentage' ? 'Percentage' : 'At Rate'}
                        </Label>
                        <Input
                          id="chargeAtRate"
                          type="number"
                          step="0.01"
                          value={chargeForm.atRate}
                          onChange={(e) => setChargeForm((prev) => ({ ...prev, atRate: e.target.value }))}
                          placeholder={selectedChargeHeadFeedAs === 'percentage' ? '%' : '0.00'}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label>+/-</Label>
                      <Select
                        value={chargeForm.plusMinus}
                        onValueChange={(v) => setChargeForm((prev) => ({ ...prev, plusMinus: v as '+' | '-' }))}
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

                    <div className="space-y-1.5">
                      <Label htmlFor="chargeAmount">Amount</Label>
                      <Input
                        id="chargeAmount"
                        type="number"
                        step="0.01"
                        value={chargeForm.amount}
                        onChange={(e) => setChargeForm((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>

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

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Charge</TableHead>
                          <TableHead>+/-</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chargeRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                              No charges added.
                            </TableCell>
                          </TableRow>
                        ) : (
                          chargeRows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>{row.chargesHeadName}</TableCell>
                              <TableCell>{row.plusMinus}</TableCell>
                              <TableCell className="text-right">₹{formatNumber(row.amount)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditCharge(row)}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteCharge(row.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
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
                <TableHead className="text-center">Total Our Cost</TableHead>
                <TableHead className="text-center">Total Nug</TableHead>
                <TableHead className="text-center">Total Kg</TableHead>
                <TableHead className="text-center">Basic Amt</TableHead>
                <TableHead className="text-center">Charges</TableHead>
                <TableHead className="text-center">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-semibold">₹{totals.ourCost.toFixed(2)}</span>
                  </div>
                </TableCell>
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
                  ₹{totals.chargesNet.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-bold text-primary text-lg">
                  ₹{totals.totalAmount.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showTransportDialog} onOpenChange={setShowTransportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transport Information</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Driver Name</Label>
              <Input
                value={transportDraft.driverName}
                onChange={(event) => handleTransportDraftChange('driverName', event.target.value)}
                placeholder="Driver"
              />
            </div>
            <div>
              <Label>From Location</Label>
              <Input
                value={transportDraft.fromLocation}
                onChange={(event) => handleTransportDraftChange('fromLocation', event.target.value)}
                placeholder="From"
              />
            </div>
            <div>
              <Label>To Location</Label>
              <Input
                value={transportDraft.toLocation}
                onChange={(event) => handleTransportDraftChange('toLocation', event.target.value)}
                placeholder="To"
              />
            </div>
            <div>
              <Label>Freight Amount</Label>
              <Input
                type="number"
                min="0"
                value={transportDraft.freightAmount}
                onChange={(event) => handleTransportDraftChange('freightAmount', event.target.value)}
              />
            </div>
            <div>
              <Label>Advance Amount</Label>
              <Input
                type="number"
                min="0"
                value={transportDraft.advanceAmount}
                onChange={(event) => handleTransportDraftChange('advanceAmount', event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTransportInfo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Leaving this page will discard them permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCancelDialog(false)
                setHasChanges(false)
                dispatch(endTabTransaction({ tabId, saved: false }))
                navigate('/entries/stock-transfer')
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
