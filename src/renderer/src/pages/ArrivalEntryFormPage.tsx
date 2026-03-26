/**
 * Arrival Entry Form Page
 * Phase 14.7 - Form for creating/editing arrivals
 * 
 * Features:
 * - Header with date, voucher number, arrival type, party selection
 * - Items tab for adding arrival items with lot/variety
 * - Charges tab for additional charges
 * - Summary footer with totals
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, Edit2, RefreshCw, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Combobox, ComboboxOption } from '@/components/ui/combobox'
import { toast } from 'sonner'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { loadAccountGroups } from '@/store/slices/accountSlice'
import { startTabTransaction, endTabTransaction, selectTabTransactionState } from '@/store/slices/tabSlice'
import { cn } from '@/lib/utils'
import { AccountFormModal } from '@/components/AccountFormModal'
import { ArrivalTypeFormModal } from '@/components/ArrivalTypeFormModal'
import { StoreFormModal } from '@/components/StoreFormModal'
import { ItemFormModal } from '@/components/ItemFormModal'
import type { ArrivalType } from '@/types/arrivalType'

// Types for form data
interface ItemRow {
  id: string
  itemId: string
  itemName: string
  lotNoVariety: string
  nug: number
  kg: number
  rate: number | null  // Only for selfPurchase
  crateMarkaId: string | null
  crateMarkaName: string | null
  crateQty: number | null
  crateRate: number | null
  crateValue: number | null
  amount: number  // rate * kg (only for selfPurchase)
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

interface Account {
  id: string
  accountName: string
  accountGroupId: string
  accountGroup?: {
    id: string
    name: string
  }
}

interface Item {
  id: string
  itemName: string
  commission: number
  marketFees: number
  rdf: number
  bardanaPerNug: number
  laga: number
  maintainCratesInSalePurchase: boolean
}

interface CrateMarka {
  id: string
  crateMarkaName: string
  cost: number
}

interface Store {
  id: string
  name: string
}

interface OtherChargesHead {
  id: string
  headingName: string
  chargeType: 'plus' | 'minus'
  feedAs: 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti'
}

interface ArrivalEntryFormPageProps {
  tabId: string
  currentRoute?: string  // Tab's stored route (to extract ID correctly with multiple tabs)
}

export default function ArrivalEntryFormPage({ tabId, currentRoute }: ArrivalEntryFormPageProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  const { accountGroups } = useAppSelector((state) => state.account)
  const tabTransactionState = useAppSelector((state) => selectTabTransactionState(state, tabId))

  // Main scroll container ref for keyboard scrolling
  const mainScrollRef = useRef<HTMLDivElement | null>(null)

  // Cancel transaction dialog state
  const [showCancelAlert, setShowCancelAlert] = useState(false)

  // Extract id from currentRoute (tab's stored route) instead of location.pathname
  // This prevents issues when multiple tabs are open and browser URL differs from tab route
  const pathParts = (currentRoute || location.pathname).split('/')
  const isEditPath = pathParts.includes('edit')
  const id = isEditPath ? pathParts[pathParts.length - 1] : undefined

  const isEditMode = !!id
  
  // Track if we've already loaded arrival data to prevent re-loading on tab switch
  const hasLoadedArrival = useRef(false)

  // Interface for storing initial form state (for cancel restore)
  interface InitialFormState {
    date: string
    voucherNo: string
    arrivalTypeId: string
    vehicleChallanNo: string
    partyId: string
    storeId: string
    forwardingAgentId: string
    transport: string
    challanNo: string
    remarks: string
    itemRows: ItemRow[]
    chargeRows: ChargeRow[]
  }

  // Store initial state for cancel restore
  const initialFormStateRef = useRef<InitialFormState | null>(null)

  // Form state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)

  // Header fields
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [voucherNo, setVoucherNo] = useState('')
  const [arrivalTypeId, setArrivalTypeId] = useState('')
  const [vehicleChallanNo, setVehicleChallanNo] = useState('')
  const [partyId, setPartyId] = useState('')
  const [storeId, setStoreId] = useState('')
  const [forwardingAgentId, setForwardingAgentId] = useState('')
  const [transport, setTransport] = useState('')
  const [challanNo, setChallanNo] = useState('')
  const [remarks, setRemarks] = useState('')

  // Items and charges
  const [itemRows, setItemRows] = useState<ItemRow[]>([])
  const [chargeRows, setChargeRows] = useState<ChargeRow[]>([])
  const [activeTab, setActiveTab] = useState('items')

  // Item entry form state
  const [selectedItemId, setSelectedItemId] = useState('')
  const [lotNoVariety, setLotNoVariety] = useState('')
  const [nug, setNug] = useState('')
  const [kg, setKg] = useState('')
  const [rate, setRate] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Charge entry form state
  const [selectedChargeHeadId, setSelectedChargeHeadId] = useState('')
  const [chargeOnValue, setChargeOnValue] = useState('')
  const [chargePer, setChargePer] = useState('')
  const [chargeAtRate, setChargeAtRate] = useState('')
  const [chargeNo, setChargeNo] = useState('')
  const [chargePlusMinus, setChargePlusMinus] = useState<'+' | '-'>('+')
  const [chargeAmount, setChargeAmount] = useState('')
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null)

  // Crate modal state
  const [showCrateModal, setShowCrateModal] = useState(false)
  const [crateMarkaId, setCrateMarkaId] = useState('')
  const [crateReceivedQty, setCrateReceivedQty] = useState('')
  const [pendingItemData, setPendingItemData] = useState<{
    itemId: string
    itemName: string
    lotNoVariety: string
    nug: number
    kg: number
    rate: number | null
  } | null>(null)

  // Account modal state
  const [showAccountModal, setShowAccountModal] = useState(false)

  // Arrival type modal state
  const [showArrivalTypeModal, setShowArrivalTypeModal] = useState(false)

  // Store modal state
  const [showStoreModal, setShowStoreModal] = useState(false)

  // Item modal state
  const [showItemModal, setShowItemModal] = useState(false)

  // Additional fields modal state (for arrival types with askForAdditionalFields)
  const [showAdditionalFieldsModal, setShowAdditionalFieldsModal] = useState(false)
  const [additionalFieldsConfirmed, setAdditionalFieldsConfirmed] = useState(false)

  // Item table state - pagination, sorting, bulk selection
  const [itemSearch, setItemSearch] = useState('')
  const [itemSortColumn, setItemSortColumn] = useState<'itemName' | 'nug' | 'kg' | 'amount'>('itemName')
  const [itemSortDirection, setItemSortDirection] = useState<'asc' | 'desc'>('asc')
  const [itemCurrentPage, setItemCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [selectedItemRowIds, setSelectedItemRowIds] = useState<string[]>([])

  // Charge table state - pagination, sorting, bulk selection
  const [chargeSearch, setChargeSearch] = useState('')
  const [chargeSortColumn, setChargeSortColumn] = useState<'chargesHeadName' | 'amount'>('chargesHeadName')
  const [chargeSortDirection, setChargeSortDirection] = useState<'asc' | 'desc'>('asc')
  const [chargeCurrentPage, setChargeCurrentPage] = useState(1)
  const chargesPerPage = 10
  const [selectedChargeRowIds, setSelectedChargeRowIds] = useState<string[]>([])

  // Master data
  const [arrivalTypes, setArrivalTypes] = useState<ArrivalType[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [crateMarkas, setCrateMarkas] = useState<CrateMarka[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [otherChargesHeads, setOtherChargesHeads] = useState<OtherChargesHead[]>([])

  // Get selected arrival type
  const selectedArrivalType = useMemo(() => {
    return arrivalTypes.find(at => at.id === arrivalTypeId)
  }, [arrivalTypes, arrivalTypeId])

  // Is this a self purchase type?
  const isSelfPurchase = selectedArrivalType?.purchaseType === 'selfPurchase'

  // Helper to save initial state before first change (for new arrivals)
  // This must be defined early so it can be used by transaction-starting functions
  const saveInitialStateIfNeeded = useCallback(() => {
    if (!initialFormStateRef.current) {
      initialFormStateRef.current = {
        date,
        voucherNo,
        arrivalTypeId,
        vehicleChallanNo,
        partyId,
        storeId,
        forwardingAgentId,
        transport,
        challanNo,
        remarks,
        itemRows: [...itemRows],
        chargeRows: [...chargeRows]
      }
    }
  }, [date, voucherNo, arrivalTypeId, vehicleChallanNo, partyId, storeId, forwardingAgentId, transport, challanNo, remarks, itemRows, chargeRows])

  // Get selected item for checking maintainCratesInSalePurchase
  const selectedItem = useMemo(() => {
    return items.find(i => i.id === selectedItemId)
  }, [items, selectedItemId])

  // Load master data
  const loadMasterData = useCallback(async () => {
    if (!activeCompany?.id) return

    try {
      // Load arrival types
      const atResponse = await window.api.arrivalType.listByCompany(activeCompany.id)
      if (atResponse.success && atResponse.data) {
        setArrivalTypes(atResponse.data)
      }

      // Load accounts (suppliers/parties)
      const accResponse = await window.api.account.listByCompany(activeCompany.id)
      if (accResponse.success && accResponse.data) {
        setAccounts(accResponse.data)
      }

      // Load items
      const itemResponse = await window.api.item.listByCompany(activeCompany.id)
      if (itemResponse.success && itemResponse.data) {
        setItems(itemResponse.data)
      }

      // Load crate markas
      const crateResponse = await window.api.crate.listByCompany(activeCompany.id)
      if (crateResponse.success && crateResponse.data) {
        setCrateMarkas(crateResponse.data)
      }

      // Load stores
      const storeResponse = await window.api.store.listByCompany(activeCompany.id)
      if (Array.isArray(storeResponse)) {
        setStores(storeResponse)
      }

      // Load other charges heads
      const chargesResponse = await window.api.otherChargesHead.listByCompany(activeCompany.id)
      if (chargesResponse.success && chargesResponse.data) {
        setOtherChargesHeads(chargesResponse.data)
      }
    } catch (error) {
      console.error('Error loading master data:', error)
      toast.error(t('arrivalEntry.loadError'))
    }
  }, [activeCompany?.id, t])

  // Generate voucher number
  const generateVoucherNo = useCallback(async () => {
    if (!activeCompany?.id) return

    try {
      const response = await window.api.arrival.getNextVoucherNo(activeCompany.id)
      if (response.success && response.data) {
        setVoucherNo(response.data)
      }
    } catch (error) {
      console.error('Error generating voucher number:', error)
    }
  }, [activeCompany?.id])

  // Load arrival data for edit mode
  const loadArrivalData = useCallback(async () => {
    // Skip if we already loaded the data or no id
    if (!id || hasLoadedArrival.current) return

    setLoading(true)
    try {
      const response = await window.api.arrival.get(id)
      if (response.success && response.data) {
        const arrival = response.data
        hasLoadedArrival.current = true
        
        const loadedDate = arrival.date
        const loadedVoucherNo = arrival.voucherNo
        const loadedArrivalTypeId = arrival.arrivalTypeId
        const loadedVehicleChallanNo = arrival.vehicleChallanNo || ''
        const loadedPartyId = arrival.partyId
        const loadedStoreId = arrival.storeId || ''
        const loadedForwardingAgentId = arrival.forwardingAgentId || ''
        const loadedTransport = arrival.transport || ''
        const loadedChallanNo = arrival.challanNo || ''
        const loadedRemarks = arrival.remarks || ''
        
        setDate(loadedDate)
        setVoucherNo(loadedVoucherNo)
        setArrivalTypeId(loadedArrivalTypeId)
        setVehicleChallanNo(loadedVehicleChallanNo)
        setPartyId(loadedPartyId)
        setStoreId(loadedStoreId)
        setForwardingAgentId(loadedForwardingAgentId)
        setTransport(loadedTransport)
        setChallanNo(loadedChallanNo)
        setRemarks(loadedRemarks)
        
        // Mark additional fields as confirmed for edit mode to prevent modal from opening
        setAdditionalFieldsConfirmed(true)

        // Load items
        let loadedItemRows: ItemRow[] = []
        if (arrival.items) {
          loadedItemRows = arrival.items.map((item: any) => ({
            id: item.id,
            itemId: item.itemId,
            itemName: item.itemName || '',
            lotNoVariety: item.lotNoVariety || '',
            nug: item.nug,
            kg: item.kg,
            rate: item.rate,
            crateMarkaId: item.crateMarkaId,
            crateMarkaName: item.crateMarkaName,
            crateQty: item.crateQty,
            crateRate: item.crateRate,
            crateValue: item.crateValue,
            amount: (item.rate || 0) * item.kg
          }))
          setItemRows(loadedItemRows)
        }

        // Load charges
        let loadedChargeRows: ChargeRow[] = []
        if (arrival.arrivalCharges) {
          loadedChargeRows = arrival.arrivalCharges.map((charge: any) => ({
            id: charge.id,
            otherChargesId: charge.otherChargesId,
            chargesHeadName: charge.chargesHeadName || '',
            onValue: charge.onValue,
            per: charge.per,
            atRate: charge.atRate,
            no: charge.no,
            plusMinus: charge.plusMinus,
            amount: charge.amount
          }))
          setChargeRows(loadedChargeRows)
        }

        // Save initial state for cancel restore
        initialFormStateRef.current = {
          date: loadedDate,
          voucherNo: loadedVoucherNo,
          arrivalTypeId: loadedArrivalTypeId,
          vehicleChallanNo: loadedVehicleChallanNo,
          partyId: loadedPartyId,
          storeId: loadedStoreId,
          forwardingAgentId: loadedForwardingAgentId,
          transport: loadedTransport,
          challanNo: loadedChallanNo,
          remarks: loadedRemarks,
          itemRows: loadedItemRows,
          chargeRows: loadedChargeRows
        }
      } else {
        toast.error(response.error || t('arrivalEntry.loadError'))
        navigate(-1)
      }
    } catch (error) {
      console.error('Error loading arrival:', error)
      toast.error(t('arrivalEntry.loadError'))
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }, [id, t, navigate])

  // Initial load
  useEffect(() => {
    loadMasterData()
    // Load account groups for supplier selection in AccountFormModal
    if (activeCompany?.id) {
      dispatch(loadAccountGroups(activeCompany.id))
    }
    if (isEditMode) {
      loadArrivalData()
    } else {
      generateVoucherNo()
    }
  }, [loadMasterData, isEditMode, loadArrivalData, generateVoucherNo, activeCompany?.id, dispatch])

  // Show additional fields modal when store is selected and arrival type requires it
  useEffect(() => {
    if (
      storeId && 
      selectedArrivalType?.askForAdditionalFields && 
      !additionalFieldsConfirmed &&
      !isEditMode
    ) {
      setShowAdditionalFieldsModal(true)
    }
  }, [storeId, selectedArrivalType?.askForAdditionalFields, additionalFieldsConfirmed, isEditMode])

  // Track changes
  useEffect(() => {
    if (itemRows.length > 0 || chargeRows.length > 0 || partyId || arrivalTypeId) {
      setHasChanges(true)
    }
  }, [itemRows, chargeRows, partyId, arrivalTypeId])

  // Calculate totals
  const totals = useMemo(() => {
    const totalNug = itemRows.reduce((sum, row) => sum + row.nug, 0)
    const totalKg = itemRows.reduce((sum, row) => sum + row.kg, 0)
    const basicAmt = isSelfPurchase
      ? itemRows.reduce((sum, row) => sum + (row.rate || 0) * row.nug, 0)
      : 0
    
    const chargesPlus = chargeRows
      .filter(c => c.plusMinus === '+')
      .reduce((sum, c) => sum + c.amount, 0)
    const chargesMinus = chargeRows
      .filter(c => c.plusMinus === '-')
      .reduce((sum, c) => sum + c.amount, 0)
    const chargesTotal = chargesPlus - chargesMinus
    const netAmt = basicAmt + chargesTotal

    return {
      count: itemRows.length,
      totalNug,
      totalKg,
      basicAmt,
      chargesPlus,
      chargesMinus,
      chargesTotal,
      netAmt
    }
  }, [itemRows, chargeRows, isSelfPurchase])

  // Handle Add Item - checks if crate modal should open
  const handleAddItemClick = useCallback(() => {
    if (!selectedItemId) {
      toast.error('Please select an item')
      return
    }

    const item = items.find(i => i.id === selectedItemId)
    if (!item) return

    const nugVal = parseFloat(nug) || 0
    const kgVal = parseFloat(kg) || 0
    const rateVal = isSelfPurchase ? (parseFloat(rate) || 0) : null

    // Store pending item data
    const itemData = {
      itemId: selectedItemId,
      itemName: item.itemName,
      lotNoVariety,
      nug: nugVal,
      kg: kgVal,
      rate: rateVal
    }

    // If item maintains crates, open crate modal
    if (item.maintainCratesInSalePurchase) {
      setPendingItemData(itemData)
      // If editing, pre-fill crate data
      if (editingItemId) {
        const editingRow = itemRows.find(r => r.id === editingItemId)
        if (editingRow) {
          setCrateMarkaId(editingRow.crateMarkaId || '')
          setCrateReceivedQty(editingRow.crateQty?.toString() || '')
        }
      } else {
        setCrateMarkaId('')
        setCrateReceivedQty('')
      }
      setShowCrateModal(true)
    } else {
      // Directly add item without crate
      addItemToList(itemData, null, null, null, null)
    }
  }, [selectedItemId, items, lotNoVariety, nug, kg, rate, isSelfPurchase, editingItemId, itemRows])

  // Add item to list (called after crate modal or directly)
  const addItemToList = useCallback((
    itemData: { itemId: string; itemName: string; lotNoVariety: string; nug: number; kg: number; rate: number | null },
    crateMarkaIdVal: string | null,
    crateMarkaNameVal: string | null,
    crateQtyVal: number | null,
    crateRateVal: number | null
  ) => {
    const crateValueVal = crateQtyVal && crateRateVal ? crateQtyVal * crateRateVal : null

    const newItem: ItemRow = {
      id: editingItemId || crypto.randomUUID(),
      itemId: itemData.itemId,
      itemName: itemData.itemName,
      lotNoVariety: itemData.lotNoVariety,
      nug: itemData.nug,
      kg: itemData.kg,
      rate: itemData.rate,
      crateMarkaId: crateMarkaIdVal,
      crateMarkaName: crateMarkaNameVal,
      crateQty: crateQtyVal,
      crateRate: crateRateVal,
      crateValue: crateValueVal,
      amount: itemData.rate ? itemData.rate * itemData.kg : 0
    }

    if (editingItemId) {
      setItemRows(prev => prev.map(row => row.id === editingItemId ? newItem : row))
      setEditingItemId(null)
      toast.success('Item updated')
    } else {
      setItemRows(prev => [...prev, newItem])
      toast.success('Item added')
    }

    // Save initial state before first change, then start transaction
    if (!tabTransactionState.isActive) {
      saveInitialStateIfNeeded()
      dispatch(startTabTransaction({ tabId, transactionType: 'arrival' }))
    }
    setHasChanges(true)

    // Reset form
    setSelectedItemId('')
    setLotNoVariety('')
    setNug('')
    setKg('')
    setRate('')
    setPendingItemData(null)
  }, [editingItemId, tabTransactionState.isActive, dispatch, tabId, saveInitialStateIfNeeded])

  // Save item with crate from modal
  const handleSaveCrateModal = useCallback(() => {
    if (!pendingItemData) return

    const crateMarka = crateMarkas.find(cm => cm.id === crateMarkaId)
    const crateQtyVal = parseFloat(crateReceivedQty) || null
    const crateRateVal = crateMarka?.cost || null

    addItemToList(
      pendingItemData,
      crateMarkaId || null,
      crateMarka?.crateMarkaName || null,
      crateQtyVal,
      crateRateVal
    )

    setShowCrateModal(false)
    setCrateMarkaId('')
    setCrateReceivedQty('')
  }, [pendingItemData, crateMarkaId, crateReceivedQty, crateMarkas, addItemToList])

  // Close crate modal without saving crate
  const handleCloseCrateModal = useCallback(() => {
    // Add item without crate data
    if (pendingItemData) {
      addItemToList(pendingItemData, null, null, null, null)
    }
    setShowCrateModal(false)
    setCrateMarkaId('')
    setCrateReceivedQty('')
    setPendingItemData(null)
  }, [pendingItemData, addItemToList])

  // Edit item
  const handleEditItem = useCallback((row: ItemRow) => {
    setSelectedItemId(row.itemId)
    setLotNoVariety(row.lotNoVariety)
    setNug(row.nug.toString())
    setKg(row.kg.toString())
    setRate(row.rate?.toString() || '')
    setEditingItemId(row.id)
  }, [])

  // Delete item
  const handleDeleteItem = useCallback((itemId: string) => {
    // Save initial state and start transaction if not already active
    if (!tabTransactionState.isActive) {
      saveInitialStateIfNeeded()
      dispatch(startTabTransaction({ tabId, transactionType: 'arrival' }))
    }
    setItemRows(prev => prev.filter(row => row.id !== itemId))
    setHasChanges(true)
  }, [tabTransactionState.isActive, dispatch, tabId, saveInitialStateIfNeeded])

  // Add charge
  const handleAddCharge = useCallback(() => {
    if (!selectedChargeHeadId) {
      toast.error(t('arrivalEntry.selectChargeHead'))
      return
    }

    const chargeHead = otherChargesHeads.find(ch => ch.id === selectedChargeHeadId)
    if (!chargeHead) return

    const amountVal = parseFloat(chargeAmount) || 0

    const newCharge: ChargeRow = {
      id: editingChargeId || crypto.randomUUID(),
      otherChargesId: selectedChargeHeadId,
      chargesHeadName: chargeHead.headingName,
      onValue: parseFloat(chargeOnValue) || null,
      per: parseFloat(chargePer) || null,
      atRate: parseFloat(chargeAtRate) || null,
      no: parseFloat(chargeNo) || null,
      plusMinus: chargePlusMinus,
      amount: amountVal
    }

    if (editingChargeId) {
      setChargeRows(prev => prev.map(row => row.id === editingChargeId ? newCharge : row))
      setEditingChargeId(null)
    } else {
      setChargeRows(prev => [...prev, newCharge])
    }

    // Save initial state and start transaction if not already active
    if (!tabTransactionState.isActive) {
      saveInitialStateIfNeeded()
      dispatch(startTabTransaction({ tabId, transactionType: 'arrival' }))
    }
    setHasChanges(true)

    // Reset form
    setSelectedChargeHeadId('')
    setChargeOnValue('')
    setChargePer('')
    setChargeAtRate('')
    setChargeNo('')
    setChargePlusMinus('+')
    setChargeAmount('')
  }, [
    selectedChargeHeadId, otherChargesHeads, chargeOnValue, chargePer,
    chargeAtRate, chargeNo, chargePlusMinus, chargeAmount, editingChargeId, t,
    tabTransactionState.isActive, dispatch, tabId, saveInitialStateIfNeeded
  ])

  // Edit charge
  const handleEditCharge = useCallback((row: ChargeRow) => {
    setSelectedChargeHeadId(row.otherChargesId)
    setChargeOnValue(row.onValue?.toString() || '')
    setChargePer(row.per?.toString() || '')
    setChargeAtRate(row.atRate?.toString() || '')
    setChargeNo(row.no?.toString() || '')
    setChargePlusMinus(row.plusMinus)
    setChargeAmount(row.amount.toString())
    setEditingChargeId(row.id)
  }, [])

  // Delete charge
  const handleDeleteCharge = useCallback((chargeId: string) => {
    // Save initial state and start transaction if not already active
    if (!tabTransactionState.isActive) {
      saveInitialStateIfNeeded()
      dispatch(startTabTransaction({ tabId, transactionType: 'arrival' }))
    }
    setChargeRows(prev => prev.filter(row => row.id !== chargeId))
    setHasChanges(true)
  }, [tabTransactionState.isActive, dispatch, tabId, saveInitialStateIfNeeded])

  // Save arrival
  const handleSave = useCallback(async () => {
    // Validation
    if (!arrivalTypeId) {
      toast.error(t('arrivalEntry.validation.arrivalTypeRequired'))
      return
    }

    if (!partyId) {
      toast.error(t('arrivalEntry.validation.partyRequired'))
      return
    }

    if (itemRows.length === 0) {
      toast.error(t('arrivalEntry.validation.itemsRequired'))
      return
    }

    setSaving(true)
    try {
      const data = {
        date,
        voucherNo,
        arrivalTypeId,
        vehicleChallanNo,
        partyId,
        storeId: storeId || null,
        forwardingAgentId: forwardingAgentId || null,
        transport: transport || null,
        challanNo: challanNo || null,
        remarks: remarks || null,
        items: itemRows.map(row => ({
          itemId: row.itemId,
          lotNoVariety: row.lotNoVariety || null,
          nug: row.nug,
          kg: row.kg,
          rate: row.rate,
          crateMarkaId: row.crateMarkaId,
          crateMarkaName: row.crateMarkaName,
          crateQty: row.crateQty,
          crateRate: row.crateRate,
          crateValue: row.crateValue
        })),
        arrivalCharges: chargeRows.map(row => ({
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
      if (isEditMode && id) {
        response = await window.api.arrival.update(id, data as any)
      } else {
        response = await window.api.arrival.create(activeCompany!.id, data as any)
      }

      if (response.success) {
        // Crate receive entries are now automatically synced by the arrival service
        // No need to manually create them here
        
        toast.success(isEditMode ? t('arrivalEntry.updateSuccess') : t('arrivalEntry.createSuccess'))
        setHasChanges(false)
        // End transaction after successful save
        dispatch(endTabTransaction({ tabId, saved: true }))
        navigate('/entries/arrival-book')
      } else {
        toast.error(response.error || t('arrivalEntry.saveError'))
      }
    } catch (error) {
      console.error('Error saving arrival:', error)
      toast.error(t('arrivalEntry.saveError'))
    } finally {
      setSaving(false)
    }
  }, [
    arrivalTypeId, partyId, itemRows, chargeRows, date, voucherNo, vehicleChallanNo,
    storeId, forwardingAgentId, transport, challanNo, remarks, isEditMode, id,
    activeCompany, t, navigate, tabId, dispatch
  ])

  // Handle close with confirmation - only show dialog if transaction is active
  const handleClose = useCallback(() => {
    if (tabTransactionState.isActive) {
      setShowCloseDialog(true)
    } else {
      navigate('/entries/arrival-book')
    }
  }, [tabTransactionState.isActive, navigate])

  // Handle refresh - reset form (no confirm dialog)
  const handleRefresh = useCallback(() => {
    // Reset form state directly without confirmation
    setDate(() => {
      const today = new Date()
      return today.toISOString().split('T')[0]
    })
    setArrivalTypeId('')
    setVehicleChallanNo('')
    setPartyId('')
    setStoreId('')
    setForwardingAgentId('')
    setTransport('')
    setChallanNo('')
    setRemarks('')
    setItemRows([])
    setChargeRows([])
    setHasChanges(false)
    // End transaction state
    dispatch(endTabTransaction({ tabId, saved: false }))
    // Generate new voucher number
    if (!isEditMode) {
      generateVoucherNo()
    }
    toast.success('Form refreshed')
  }, [isEditMode, generateVoucherNo, dispatch, tabId])

  // Handle print
  const handlePrint = useCallback(() => {
    toast.info('Print functionality coming soon')
  }, [])

  // Reload accounts after creating new one
  const handleAccountCreated = useCallback(() => {
    loadMasterData()
  }, [loadMasterData])

  // Arrival type combobox options
  const arrivalTypeOptions: ComboboxOption[] = useMemo(() => {
    return arrivalTypes.map(at => ({
      value: at.id,
      label: at.name
    }))
  }, [arrivalTypes])

  // Party combobox options - filter to only show supplier accounts
  const partyOptions: ComboboxOption[] = useMemo(() => {
    return accounts
      .filter(acc => 
        acc.accountGroup?.name?.toLowerCase().includes('sundry creditor') ||
        acc.accountGroup?.name?.toLowerCase().includes('supplier')
      )
      .map(acc => ({
        value: acc.id,
        label: acc.accountName
      }))
  }, [accounts])

  // Item combobox options
  const itemOptions: ComboboxOption[] = useMemo(() => {
    return items.map(item => ({
      value: item.id,
      label: item.itemName
    }))
  }, [items])

  // Crate marka options
  const crateMarkaOptions: ComboboxOption[] = useMemo(() => {
    return crateMarkas.map(cm => ({
      value: cm.id,
      label: cm.crateMarkaName
    }))
  }, [crateMarkas])

  // Forwarding agent options (using accounts)
  const forwardingAgentOptions: ComboboxOption[] = useMemo(() => {
    return accounts.map(acc => ({
      value: acc.id,
      label: acc.accountName
    }))
  }, [accounts])

  // Store combobox options
  const storeOptions: ComboboxOption[] = useMemo(() => {
    return stores.map(store => ({
      value: store.id,
      label: store.name
    }))
  }, [stores])

  // Find supplier account group ID for auto-selecting in AccountFormModal
  const supplierAccountGroupId = useMemo(() => {
    // First try to find "supplier" group (preferred)
    let supplierGroup = accountGroups.find(group => 
      group.name?.toLowerCase() === 'supplier' ||
      group.name?.toLowerCase().includes('supplier')
    )
    // Fallback to sundry creditor if supplier not found
    if (!supplierGroup) {
      supplierGroup = accountGroups.find(group => 
        group.name?.toLowerCase().includes('sundry creditor')
      )
    }
    if (supplierGroup) {
      return supplierGroup.id
    }
    // Last resort: try to find from loaded accounts
    const accountWithSupplierGroup = accounts.find(acc => 
      acc.accountGroup?.name?.toLowerCase().includes('supplier')
    ) || accounts.find(acc => 
      acc.accountGroup?.name?.toLowerCase().includes('sundry creditor')
    )
    return accountWithSupplierGroup?.accountGroupId || ''
  }, [accountGroups, accounts])

  // Get selected charge head's feedAs value for conditional field display
  const selectedChargeHeadFeedAs = useMemo(() => {
    if (!selectedChargeHeadId) return null
    const chargeHead = otherChargesHeads.find(ch => ch.id === selectedChargeHeadId)
    return chargeHead?.feedAs || 'absolute'
  }, [selectedChargeHeadId, otherChargesHeads])

  // Handle cancel transaction
  const handleCancelTransaction = useCallback(() => {
    if (hasChanges) {
      setShowCancelAlert(true)
    }
  }, [hasChanges])

  const confirmCancelTransaction = useCallback(() => {
    // Restore to initial state if we have it, otherwise reset to empty
    if (initialFormStateRef.current) {
      const initial = initialFormStateRef.current
      setDate(initial.date)
      setVoucherNo(initial.voucherNo)
      setArrivalTypeId(initial.arrivalTypeId)
      setVehicleChallanNo(initial.vehicleChallanNo)
      setPartyId(initial.partyId)
      setStoreId(initial.storeId)
      setForwardingAgentId(initial.forwardingAgentId)
      setTransport(initial.transport)
      setChallanNo(initial.challanNo)
      setRemarks(initial.remarks)
      setItemRows([...initial.itemRows])
      setChargeRows([...initial.chargeRows])
    } else {
      // No initial state saved (new form that was never touched), reset to empty
      setDate(() => {
        const today = new Date()
        return today.toISOString().split('T')[0]
      })
      setArrivalTypeId('')
      setVehicleChallanNo('')
      setPartyId('')
      setStoreId('')
      setForwardingAgentId('')
      setTransport('')
      setChallanNo('')
      setRemarks('')
      setItemRows([])
      setChargeRows([])
    }
    setHasChanges(false)
    setShowCancelAlert(false)
    // End transaction
    dispatch(endTabTransaction({ tabId, saved: false }))
    toast.success('Changes cancelled - restored to initial state')
  }, [dispatch, tabId])

  // Bulk delete items
  const handleBulkDeleteItems = useCallback(() => {
    if (selectedItemRowIds.length === 0) return
    // Save initial state and start transaction if not already active
    if (!tabTransactionState.isActive) {
      saveInitialStateIfNeeded()
      dispatch(startTabTransaction({ tabId, transactionType: 'arrival' }))
    }
    setItemRows(prev => prev.filter(row => !selectedItemRowIds.includes(row.id)))
    setSelectedItemRowIds([])
    setHasChanges(true)
    toast.success(`${selectedItemRowIds.length} item(s) deleted`)
  }, [selectedItemRowIds, tabTransactionState.isActive, dispatch, tabId, saveInitialStateIfNeeded])

  // Toggle item selection
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemRowIds(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }, [])

  // Toggle select all items
  const toggleSelectAllItems = useCallback((filteredItems: ItemRow[]) => {
    if (selectedItemRowIds.length === filteredItems.length) {
      setSelectedItemRowIds([])
    } else {
      setSelectedItemRowIds(filteredItems.map(item => item.id))
    }
  }, [selectedItemRowIds])

  // Bulk delete charges
  const handleBulkDeleteCharges = useCallback(() => {
    if (selectedChargeRowIds.length === 0) return
    // Save initial state and start transaction if not already active
    if (!tabTransactionState.isActive) {
      saveInitialStateIfNeeded()
      dispatch(startTabTransaction({ tabId, transactionType: 'arrival' }))
    }
    setChargeRows(prev => prev.filter(row => !selectedChargeRowIds.includes(row.id)))
    setSelectedChargeRowIds([])
    setHasChanges(true)
    toast.success(`${selectedChargeRowIds.length} charge(s) deleted`)
  }, [selectedChargeRowIds, tabTransactionState.isActive, dispatch, tabId, saveInitialStateIfNeeded])

  // Toggle charge selection
  const toggleChargeSelection = useCallback((chargeId: string) => {
    setSelectedChargeRowIds(prev => 
      prev.includes(chargeId) ? prev.filter(id => id !== chargeId) : [...prev, chargeId]
    )
  }, [])

  // Toggle select all charges
  const toggleSelectAllCharges = useCallback((filteredCharges: ChargeRow[]) => {
    if (selectedChargeRowIds.length === filteredCharges.length) {
      setSelectedChargeRowIds([])
    } else {
      setSelectedChargeRowIds(filteredCharges.map(charge => charge.id))
    }
  }, [selectedChargeRowIds])

  // Keyboard handler: Ctrl+S save, ArrowUp/ArrowDown scroll, ArrowLeft/ArrowRight switch tabs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+S to save - works even in input fields
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        handleSave()
        return
      }

      // Ignore other shortcuts if inside inputs/select/textarea or dialogs
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.closest('[role="dialog"]')) {
          return
        }
      }

      const scrollEl = mainScrollRef.current
      const scrollStep = 120

      if (e.key === 'ArrowDown') {
        if (scrollEl) {
          e.preventDefault()
          scrollEl.scrollBy({ top: scrollStep, behavior: 'smooth' })
        }
      } else if (e.key === 'ArrowUp') {
        if (scrollEl) {
          e.preventDefault()
          scrollEl.scrollBy({ top: -scrollStep, behavior: 'smooth' })
        }
      } else if (e.key === 'ArrowLeft') {
        // switch to previous tab
        if (activeTab === 'charges') {
          e.preventDefault()
          setActiveTab('items')
        }
      } else if (e.key === 'ArrowRight') {
        // switch to next tab
        if (activeTab === 'items') {
          e.preventDefault()
          setActiveTab('charges')
        }
      }
    }

    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [activeTab, handleSave])

  // Set default +/- based on charge head's chargeType when selected
  useEffect(() => {
    if (selectedChargeHeadId) {
      const chargeHead = otherChargesHeads.find(ch => ch.id === selectedChargeHeadId)
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
  }, [selectedChargeHeadId, otherChargesHeads, totals.totalKg, totals.totalNug])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-hidden bg-gray-50">
      {/* Header - Fixed at top */}
      <div className="shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditMode ? t('arrivalEntry.editTitle') : t('arrivalEntry.newTitle')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="date" className="text-sm font-medium whitespace-nowrap">
                {t('arrivalEntry.date')}:
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-40"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="voucherNo" className="text-sm font-medium whitespace-nowrap">
                {t('arrivalEntry.voucherNo')}:
              </Label>
              <Input
                id="voucherNo"
                value={voucherNo}
                disabled
                className="w-32"
              />
            </div>

            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="icon"
              disabled={loading}
              title={t('common.refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleSave} disabled={saving || !tabTransactionState.isActive} variant="success">
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('common.saving') : isEditMode ? t('common.update') : t('common.save')}
            </Button>
            {tabTransactionState.isActive && (
              <Button onClick={handleCancelTransaction} variant="outline">
                Cancel Transaction
              </Button>
            )}
            <Button onClick={handlePrint} variant="outline-blue">
              <Printer className="h-4 w-4 mr-2 text-blue-600" />
              {t('common.print')}
            </Button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div ref={mainScrollRef} className="flex-1 overflow-auto p-4">
        {/* Header Fields */}
        <Card className="mb-4">
          <CardHeader className="py-3">
            <CardTitle className="text-base">{t('arrivalEntry.headerInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Arrival Type - Changed to Combobox with create option */}
              <div className="space-y-1.5">
                <Label>Arrival Type</Label>
                <Combobox
                  options={arrivalTypeOptions}
                  value={arrivalTypeId}
                  onChange={setArrivalTypeId}
                  placeholder="Select arrival type"
                  searchPlaceholder="Search..."
                  emptyText="No arrival types found"
                  onCreateNew={() => setShowArrivalTypeModal(true)}
                  createNewLabel="Create new arrival type"
                />
              </div>

              {/* Vehicle Challan No */}
              <div className="space-y-1.5">
                <Label htmlFor="vehicleChallanNo">Vehicle/Challan No</Label>
                <Input
                  id="vehicleChallanNo"
                  value={vehicleChallanNo}
                  onChange={(e) => setVehicleChallanNo(e.target.value)}
                  placeholder="Enter vehicle or challan no"
                />
              </div>

              {/* Party - with create option */}
              <div className="space-y-1.5 col-span-2">
                <Label>Party (Supplier)</Label>
                <Combobox
                  options={partyOptions}
                  value={partyId}
                  onChange={setPartyId}
                  placeholder="Select party"
                  searchPlaceholder="Search parties..."
                  emptyText="No parties found"
                  onCreateNew={() => setShowAccountModal(true)}
                  createNewLabel="Create new party"
                />
              </div>

              {/* Store - Changed to Combobox with create option */}
              <div className="space-y-1.5">
                <Label>Store</Label>
                <Combobox
                  options={storeOptions}
                  value={storeId}
                  onChange={setStoreId}
                  placeholder="Select store"
                  searchPlaceholder="Search stores..."
                  emptyText="No stores found"
                  onCreateNew={() => setShowStoreModal(true)}
                  createNewLabel="Create new store"
                />
              </div>

              {/* Show additional fields info if entered via modal */}
              {additionalFieldsConfirmed && (transport || challanNo || remarks || forwardingAgentId) && (
                <div className="col-span-2 lg:col-span-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <div className="flex items-center gap-4 flex-wrap">
                    {transport && <span><strong>Transport:</strong> {transport}</span>}
                    {challanNo && <span><strong>Challan:</strong> {challanNo}</span>}
                    {forwardingAgentId && <span><strong>Fwd Agent:</strong> {forwardingAgentOptions.find(o => o.value === forwardingAgentId)?.label}</span>}
                    {remarks && <span><strong>Remarks:</strong> {remarks}</span>}
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-blue-600"
                      onClick={() => setShowAdditionalFieldsModal(true)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Items and Charges */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-2 rounded-none bg-gray-100">
            <TabsTrigger 
              value="items"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              {t('arrivalEntry.itemsTab')} ({itemRows.length})
            </TabsTrigger>
            <TabsTrigger 
              value="charges"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              {t('arrivalEntry.chargesTab')} ({chargeRows.length})
            </TabsTrigger>
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items" className="mt-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="py-3">
                <CardTitle className="text-lg">
                  {editingItemId ? 'Edit Item' : 'Add Item'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Item Entry Form - No crate fields here, crate modal opens for items with maintainCratesInSalePurchase */}
                <div 
                  className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddItemClick()
                    }
                  }}
                >
                  {/* Item */}
                  <div className="space-y-1.5 col-span-2">
                    <Label>Item</Label>
                    <Combobox
                      options={itemOptions}
                      value={selectedItemId}
                      onChange={setSelectedItemId}
                      placeholder="Select item"
                      searchPlaceholder="Search items..."
                      emptyText="No items found"
                      onCreateNew={() => setShowItemModal(true)}
                      createNewLabel="Create new item"
                    />
                  </div>

                  {/* Lot No / Variety */}
                  <div className="space-y-1.5">
                    <Label htmlFor="lotNoVariety">Lot No / Variety</Label>
                    <Input
                      id="lotNoVariety"
                      value={lotNoVariety}
                      onChange={(e) => setLotNoVariety(e.target.value)}
                      placeholder="Enter lot/variety"
                    />
                  </div>

                  {/* Nug */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nug">Nug</Label>
                    <Input
                      id="nug"
                      type="number"
                      value={nug}
                      onChange={(e) => setNug(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  {/* Kg */}
                  <div className="space-y-1.5">
                    <Label htmlFor="kg">Weight (Kg)</Label>
                    <Input
                      id="kg"
                      type="number"
                      step="0.01"
                      value={kg}
                      onChange={(e) => setKg(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Rate (only for self purchase) */}
                  {isSelfPurchase && (
                    <div className="space-y-1.5">
                      <Label htmlFor="rate">Rate</Label>
                      <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {/* Add/Update Button */}
                  <div className="flex items-end">
                    <Button onClick={handleAddItemClick} className="w-full">
                      {editingItemId ? (
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

                {/* Show indicator if selected item maintains crates */}
                {selectedItem?.maintainCratesInSalePurchase && (
                  <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                    This item maintains crates. A crate entry modal will open when you add this item.
                  </div>
                )}

                {/* Items Table with search, pagination, sorting, bulk selection */}
                {itemRows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-md">
                    {t('arrivalEntry.noItems')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Search and Bulk Delete */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 max-w-sm">
                        <Input
                          placeholder="Search by item name..."
                          value={itemSearch}
                          onChange={(e) => {
                            setItemSearch(e.target.value)
                            setItemCurrentPage(1)
                          }}
                          className="pl-3"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          const filtered = itemRows.filter((row) => 
                            row.itemName.toLowerCase().includes(itemSearch.toLowerCase())
                          )
                          const startIndex = (itemCurrentPage - 1) * itemsPerPage
                          const endIndex = Math.min(startIndex + itemsPerPage, filtered.length)
                          return `Showing ${filtered.length > 0 ? startIndex + 1 : 0}-${endIndex} of ${filtered.length} items`
                        })()}
                      </div>
                      {selectedItemRowIds.length > 0 && (
                        <Button variant="destructive" size="sm" onClick={handleBulkDeleteItems}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete ({selectedItemRowIds.length})
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
                                  const filtered = itemRows.filter((row) => 
                                    row.itemName.toLowerCase().includes(itemSearch.toLowerCase())
                                  )
                                  return selectedItemRowIds.length === filtered.length && filtered.length > 0
                                })()}
                                onCheckedChange={() => {
                                  const filtered = itemRows.filter((row) => 
                                    row.itemName.toLowerCase().includes(itemSearch.toLowerCase())
                                  )
                                  toggleSelectAllItems(filtered)
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
                                  if (itemSortColumn === 'itemName') {
                                    setItemSortDirection(itemSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setItemSortColumn('itemName')
                                    setItemSortDirection('asc')
                                  }
                                }}
                              >
                                {t('arrivalEntry.item')}
                                {itemSortColumn === 'itemName' && (
                                  <span className="ml-1">{itemSortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </Button>
                            </TableHead>
                            <TableHead>{t('arrivalEntry.lotNoVariety')}</TableHead>
                            <TableHead className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 font-semibold p-0"
                                onClick={() => {
                                  if (itemSortColumn === 'nug') {
                                    setItemSortDirection(itemSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setItemSortColumn('nug')
                                    setItemSortDirection('asc')
                                  }
                                }}
                              >
                                {t('arrivalEntry.nug')}
                                {itemSortColumn === 'nug' && (
                                  <span className="ml-1">{itemSortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 font-semibold p-0"
                                onClick={() => {
                                  if (itemSortColumn === 'kg') {
                                    setItemSortDirection(itemSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setItemSortColumn('kg')
                                    setItemSortDirection('asc')
                                  }
                                }}
                              >
                                {t('arrivalEntry.kg')}
                                {itemSortColumn === 'kg' && (
                                  <span className="ml-1">{itemSortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </Button>
                            </TableHead>
                            {isSelfPurchase && (
                              <>
                                <TableHead className="text-right">{t('arrivalEntry.rate')}</TableHead>
                                <TableHead className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 font-semibold p-0"
                                    onClick={() => {
                                      if (itemSortColumn === 'amount') {
                                        setItemSortDirection(itemSortDirection === 'asc' ? 'desc' : 'asc')
                                      } else {
                                        setItemSortColumn('amount')
                                        setItemSortDirection('asc')
                                      }
                                    }}
                                  >
                                    {t('arrivalEntry.amount')}
                                    {itemSortColumn === 'amount' && (
                                      <span className="ml-1">{itemSortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </Button>
                                </TableHead>
                              </>
                            )}
                            <TableHead>{t('arrivalEntry.crateMarka')}</TableHead>
                            <TableHead className="text-right">{t('arrivalEntry.crateReceived')}</TableHead>
                            <TableHead className="w-20">{t('common.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            // Filter
                            const filtered = itemRows.filter((row) => 
                              row.itemName.toLowerCase().includes(itemSearch.toLowerCase())
                            )
                            // Sort
                            const sorted = [...filtered].sort((a, b) => {
                              let comparison = 0
                              switch (itemSortColumn) {
                                case 'itemName':
                                  comparison = a.itemName.localeCompare(b.itemName)
                                  break
                                case 'nug':
                                  comparison = a.nug - b.nug
                                  break
                                case 'kg':
                                  comparison = a.kg - b.kg
                                  break
                                case 'amount':
                                  comparison = a.amount - b.amount
                                  break
                              }
                              return itemSortDirection === 'asc' ? comparison : -comparison
                            })
                            // Paginate
                            const startIndex = (itemCurrentPage - 1) * itemsPerPage
                            const paginated = sorted.slice(startIndex, startIndex + itemsPerPage)

                            return paginated.map((row, index) => (
                              <TableRow 
                                key={row.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onDoubleClick={() => handleEditItem(row)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedItemRowIds.includes(row.id)}
                                    onCheckedChange={() => toggleItemSelection(row.id)}
                                  />
                                </TableCell>
                                <TableCell>{startIndex + index + 1}</TableCell>
                                <TableCell className="font-medium">{row.itemName}</TableCell>
                                <TableCell>{row.lotNoVariety || '-'}</TableCell>
                                <TableCell className="text-right">{row.nug}</TableCell>
                                <TableCell className="text-right">{row.kg.toFixed(2)}</TableCell>
                                {isSelfPurchase && (
                                  <>
                                    <TableCell className="text-right">
                                      {row.rate?.toFixed(2) || '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {row.amount.toFixed(2)}
                                    </TableCell>
                                  </>
                                )}
                                <TableCell>{row.crateMarkaName || '-'}</TableCell>
                                <TableCell className="text-right">{row.crateQty || '-'}</TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleEditItem(row)}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => handleDeleteItem(row.id)}
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
                      const filtered = itemRows.filter((row) => 
                        row.itemName.toLowerCase().includes(itemSearch.toLowerCase())
                      )
                      const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))

                      return (
                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm text-muted-foreground">
                            Page {itemCurrentPage} of {totalPages}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setItemCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={itemCurrentPage === 1}
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setItemCurrentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={itemCurrentPage === totalPages}
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

          {/* Charges Tab */}
          <TabsContent value="charges" className="mt-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="py-3">
                <CardTitle className="text-lg">
                  {editingChargeId ? t('arrivalEntry.editCharge') : t('arrivalEntry.addCharge')}
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
                    <Label>{t('arrivalEntry.chargesHead')}</Label>
                    <Select value={selectedChargeHeadId} onValueChange={setSelectedChargeHeadId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('arrivalEntry.selectChargesHead')} />
                      </SelectTrigger>
                      <SelectContent>
                        {otherChargesHeads.map(ch => (
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
                        {selectedChargeHeadFeedAs === 'onWeight' ? t('arrivalEntry.totalKg') :
                         selectedChargeHeadFeedAs === 'onNug' ? t('arrivalEntry.totalNug') :
                         selectedChargeHeadFeedAs === 'onPetti' ? t('arrivalEntry.totalPetti') :
                         t('arrivalEntry.onValue')}
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
                      <Label htmlFor="chargePer">{t('arrivalEntry.perKg')}</Label>
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
                  {(selectedChargeHeadFeedAs === 'onNug' || selectedChargeHeadFeedAs === 'onPetti') && (
                    <div className="space-y-1.5">
                      <Label htmlFor="chargeNo">{t('arrivalEntry.no')}</Label>
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
                        {selectedChargeHeadFeedAs === 'percentage' ? t('arrivalEntry.percentage') : t('arrivalEntry.atRate')}
                      </Label>
                      <Input
                        id="chargeAtRate"
                        type="number"
                        step="0.01"
                        value={chargeAtRate}
                        onChange={(e) => setChargeAtRate(e.target.value)}
                        placeholder={selectedChargeHeadFeedAs === 'percentage' ? "%" : "0.00"}
                      />
                    </div>
                  )}

                  {/* Plus/Minus */}
                  <div className="space-y-1.5">
                    <Label>{t('arrivalEntry.plusMinus')}</Label>
                    <Select value={chargePlusMinus} onValueChange={(v) => setChargePlusMinus(v as '+' | '-')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+">+ {t('arrivalEntry.plus')}</SelectItem>
                        <SelectItem value="-">- {t('arrivalEntry.minus')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <Label htmlFor="chargeAmount">{t('arrivalEntry.chargeAmount')}</Label>
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
                          {t('common.update')}
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          {t('common.add')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Charges Table with search, pagination, sorting, bulk selection */}
                {chargeRows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-md">
                    {t('arrivalEntry.noCharges')}
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
                                    row.chargesHeadName.toLowerCase().includes(chargeSearch.toLowerCase())
                                  )
                                  return selectedChargeRowIds.length === filtered.length && filtered.length > 0
                                })()}
                                onCheckedChange={() => {
                                  const filtered = chargeRows.filter((row) => 
                                    row.chargesHeadName.toLowerCase().includes(chargeSearch.toLowerCase())
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
                                    setChargeSortDirection(chargeSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setChargeSortColumn('chargesHeadName')
                                    setChargeSortDirection('asc')
                                  }
                                }}
                              >
                                {t('arrivalEntry.chargesHead')}
                                {chargeSortColumn === 'chargesHeadName' && (
                                  <span className="ml-1">{chargeSortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="text-right">{t('arrivalEntry.onValue')}</TableHead>
                            <TableHead className="text-right">{t('arrivalEntry.per')}</TableHead>
                            <TableHead className="text-right">{t('arrivalEntry.atRate')}</TableHead>
                            <TableHead className="text-center">{t('arrivalEntry.plusMinus')}</TableHead>
                            <TableHead className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 font-semibold p-0"
                                onClick={() => {
                                  if (chargeSortColumn === 'amount') {
                                    setChargeSortDirection(chargeSortDirection === 'asc' ? 'desc' : 'asc')
                                  } else {
                                    setChargeSortColumn('amount')
                                    setChargeSortDirection('asc')
                                  }
                                }}
                              >
                                {t('arrivalEntry.chargeAmount')}
                                {chargeSortColumn === 'amount' && (
                                  <span className="ml-1">{chargeSortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </Button>
                            </TableHead>
                            <TableHead className="w-20">{t('common.actions')}</TableHead>
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
                                <TableCell className="text-right">{row.onValue?.toFixed(2) || '-'}</TableCell>
                                <TableCell className="text-right">{row.per?.toFixed(2) || '-'}</TableCell>
                                <TableCell className="text-right">{row.atRate?.toFixed(2) || '-'}</TableCell>
                                <TableCell className="text-center">
                                  <span className={cn(
                                    'px-2 py-0.5 rounded text-sm font-medium',
                                    row.plusMinus === '+' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  )}>
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
                              onClick={() => setChargeCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Shared Summary Footer - Fixed at bottom (matching DailySaleFormPage) */}
      <div className="shrink-0 border-t bg-white">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-black font-semibold text-center border-r">
                  {t('arrivalEntry.count')}
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  {t('arrivalEntry.totalNug')}
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  {t('arrivalEntry.totalKg')}
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  {t('arrivalEntry.basicAmt')}
                </TableHead>
                <TableHead className="text-black font-semibold text-center border-r">
                  {t('arrivalEntry.charges')}
                </TableHead>
                <TableHead className="text-black font-semibold text-center">
                  {t('arrivalEntry.netAmt')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="text-center font-semibold border-r">
                  {totals.count}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  {totals.totalNug}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  {totals.totalKg.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-semibold border-r">
                  ₹{totals.basicAmt.toFixed(2)}
                </TableCell>
                <TableCell className={cn(
                  "text-center font-semibold border-r",
                  totals.chargesTotal >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {totals.chargesTotal >= 0 ? '+' : ''}₹{totals.chargesTotal.toFixed(2)}
                </TableCell>
                <TableCell className="text-center font-bold text-primary text-base">
                  ₹{totals.netAmt.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Close Confirmation Dialog - matching DailySaleFormPage */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in this arrival. Do you want to save your changes before
              closing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCloseDialog(false)
              setHasChanges(false)
              dispatch(endTabTransaction({ tabId, saved: false }))
              navigate('/entries/arrival-book')
            }}>Discard Changes</AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowCloseDialog(false)}>Continue Editing</AlertDialogAction>
            <AlertDialogAction onClick={handleSave}>
              Save & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Transaction Alert Dialog */}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard all unsaved changes and reset the form. Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelTransaction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Cancel Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Crate Modal - for items with maintainCratesInSalePurchase */}
      <Dialog open={showCrateModal} onOpenChange={(open) => !open && handleCloseCrateModal()}>
        <DialogContent 
          className="max-w-md"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSaveCrateModal()
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Crate Received Entry</DialogTitle>
            <DialogDescription>
              Enter crate details for {pendingItemData?.itemName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Item Info */}
            <div className="p-3 bg-gray-50 rounded-md text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Item:</span> <span className="font-medium">{pendingItemData?.itemName}</span></div>
                <div><span className="text-muted-foreground">Nug:</span> <span className="font-medium">{pendingItemData?.nug}</span></div>
                <div><span className="text-muted-foreground">Kg:</span> <span className="font-medium">{pendingItemData?.kg.toFixed(2)}</span></div>
              </div>
            </div>

            {/* Crate Marka */}
            <div className="space-y-1.5">
              <Label>Crate Marka</Label>
              <Combobox
                options={crateMarkaOptions}
                value={crateMarkaId}
                onChange={setCrateMarkaId}
                placeholder="Select crate marka"
                searchPlaceholder="Search..."
                emptyText="No crate markas found"
              />
            </div>

            {/* Crate Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="crateReceivedQtyModal">Crate Received (Qty)</Label>
              <Input
                id="crateReceivedQtyModal"
                type="number"
                value={crateReceivedQty}
                onChange={(e) => setCrateReceivedQty(e.target.value)}
                placeholder="0"
                disabled={!crateMarkaId}
              />
            </div>

            {/* Crate Cost & Total */}
            {crateMarkaId && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cost per Crate</Label>
                  <Input
                    value={`₹${(crateMarkas.find(cm => cm.id === crateMarkaId)?.cost || 0).toFixed(2)}`}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Crate Value</Label>
                  <Input
                    value={(() => {
                      const qty = parseFloat(crateReceivedQty) || 0
                      const cost = crateMarkas.find(cm => cm.id === crateMarkaId)?.cost || 0
                      return `₹${(qty * cost).toFixed(2)}`
                    })()}
                    disabled
                    className="bg-gray-50 font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCrateModal}>
              Skip Crate
            </Button>
            <Button onClick={handleSaveCrateModal}>
              <Save className="h-4 w-4 mr-2" />
              Save with Crate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Form Modal for creating new party - with supplier group pre-selected */}
      <AccountFormModal
        open={showAccountModal}
        onOpenChange={setShowAccountModal}
        onSuccess={handleAccountCreated}
        defaultAccountGroupId={supplierAccountGroupId}
      />

      {/* Arrival Type Form Modal for creating new arrival type */}
      {activeCompany?.id && (
        <ArrivalTypeFormModal
          open={showArrivalTypeModal}
          onOpenChange={setShowArrivalTypeModal}
          onSuccess={loadMasterData}
          companyId={activeCompany.id}
        />
      )}

      {/* Store Form Modal for creating new store */}
      {activeCompany?.id && (
        <StoreFormModal
          open={showStoreModal}
          onClose={() => setShowStoreModal(false)}
          onSuccess={loadMasterData}
          companyId={activeCompany.id}
        />
      )}

      {/* Item Form Modal for creating new item */}
      {activeCompany?.id && (
        <ItemFormModal
          open={showItemModal}
          onClose={() => setShowItemModal(false)}
          onSuccess={loadMasterData}
          companyId={activeCompany.id}
        />
      )}

      {/* Additional Fields Modal - opens when arrival type has askForAdditionalFields */}
      <Dialog open={showAdditionalFieldsModal} onOpenChange={(open) => {
        if (!open && !additionalFieldsConfirmed) {
          // Allow closing without confirming
          setShowAdditionalFieldsModal(false)
        } else {
          setShowAdditionalFieldsModal(open)
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Additional Information</DialogTitle>
            <DialogDescription>
              Please enter the additional details for this arrival entry
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Transport */}
            <div className="space-y-1.5">
              <Label htmlFor="modalTransport">Transport</Label>
              <Input
                id="modalTransport"
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                placeholder="Enter transport details"
              />
            </div>

            {/* Challan No */}
            <div className="space-y-1.5">
              <Label htmlFor="modalChallanNo">Challan No</Label>
              <Input
                id="modalChallanNo"
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                placeholder="Enter challan number"
              />
            </div>

            {/* Forwarding Agent */}
            <div className="space-y-1.5">
              <Label>Forwarding Agent</Label>
              <Combobox
                options={forwardingAgentOptions}
                value={forwardingAgentId}
                onChange={setForwardingAgentId}
                placeholder="Select forwarding agent"
                searchPlaceholder="Search agents..."
                emptyText="No agents found"
                onCreateNew={() => setShowAccountModal(true)}
                createNewLabel="Create new agent"
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <Label htmlFor="modalRemarks">Remarks</Label>
              <Input
                id="modalRemarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter remarks"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAdditionalFieldsModal(false)
            }}>
              Skip
            </Button>
            <Button onClick={() => {
              setAdditionalFieldsConfirmed(true)
              setShowAdditionalFieldsModal(false)
            }}>
              <Save className="h-4 w-4 mr-2" />
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
