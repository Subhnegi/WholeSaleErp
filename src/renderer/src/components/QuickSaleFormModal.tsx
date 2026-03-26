import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Trash2, Save } from 'lucide-react'
import type { QuickSale, CreateQuickSaleItemInput } from '@/types/quickSale'
import type { Item } from '@/types/item'
import type { Account } from '@/types/account'
import type { CrateMarka } from '@/types/crate'

interface QuickSaleFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  quickSale?: QuickSale | null
  companyId: string
}

interface ItemRow extends CreateQuickSaleItemInput {
  tempId: string
}

export function QuickSaleFormModal({ 
  open, 
  onClose, 
  onSuccess,
  quickSale, 
  companyId
}: QuickSaleFormModalProps) {
  const [submitting, setSubmitting] = useState(false)
  
  // Data lists
  const [items, setItems] = useState<Item[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [crateMArkas, setCrateMarkas] = useState<CrateMarka[]>([])
  
  // Form data
  const [saleDate, setSaleDate] = useState('')
  const [voucherNo, setVoucherNo] = useState('')
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [itemRows, setItemRows] = useState<ItemRow[]>([])
  const [nextTempId, setNextTempId] = useState(1)
  
  // Load data on mount
  useEffect(() => {
    if (open && companyId) {
      loadItems()
      loadAccounts()
      loadCrateMarkas()
    }
  }, [open, companyId])

  // Initialize form when quick sale changes
  useEffect(() => {
    if (quickSale) {
      setSaleDate(quickSale.saleDate)
      setVoucherNo(quickSale.voucherNo || '')
      if (quickSale.items) {
        setItemRows(quickSale.items.map((item, index) => ({
          tempId: `existing-${index}`,
          itemId: item.itemId,
          itemName: item.itemName,
          accountId: item.accountId,
          accountName: item.accountName,
          nug: item.nug,
          kg: item.kg,
          rate: item.rate,
          per: item.per,
          basicAmount: item.basicAmount,
          totalAmount: item.totalAmount,
          crateMarkaId: item.crateMarkaId || undefined,
          crateMarkaName: item.crateMarkaName || undefined,
          crateQty: item.crateQty || undefined,
          crateRate: item.crateRate || undefined,
          crateValue: item.crateValue || undefined
        })))
      }
    } else {
      // Reset for new quick sale
      const today = new Date()
      const year = today.getFullYear()
      const month = (today.getMonth() + 1).toString().padStart(2, '0')
      const day = today.getDate().toString().padStart(2, '0')
      setSaleDate(`${year}-${month}-${day}`)
      setVoucherNo('')
      setItemRows([])
      setNextTempId(1)
    }
  }, [quickSale])

  const loadItems = async () => {
    try {
      const response = await window.api.item.listByCompany(companyId)
      if (response.success && response.data) {
        setItems(response.data)
      }
    } catch (error) {
      console.error('Load items error:', error)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await window.api.account.listByCompany(companyId)
      if (response.success && response.data) {
        setAccounts(response.data)
      }
    } catch (error) {
      console.error('Load accounts error:', error)
    }
  }

  const loadCrateMarkas = async () => {
    try {
      const response = await window.api.crate.listByCompany(companyId)
      if (response.success && response.data) {
        setCrateMarkas(response.data)
      }
    } catch (error) {
      console.error('Load crate markas error:', error)
    }
  }

  const fetchVoucherNo = useCallback(async (targetDate: string) => {
    if (!companyId || !targetDate || quickSale || !open) return
    try {
      setVoucherLoading(true)
      const response = await window.api.quickSale.getNextVoucherNo(companyId, targetDate)
      if (response.success && response.data) {
        setVoucherNo(response.data)
      } else if (response.error) {
        toast.error(response.error)
      }
    } catch (error) {
      console.error('Fetch voucher number error:', error)
      toast.error('Failed to fetch voucher number. Please try again.')
    } finally {
      setVoucherLoading(false)
    }
  }, [companyId, quickSale, open])

  useEffect(() => {
    if (!quickSale && open && saleDate) {
      fetchVoucherNo(saleDate)
    }
  }, [quickSale, open, saleDate, fetchVoucherNo])

  const addItemRow = () => {
    setItemRows([...itemRows, {
      tempId: `new-${nextTempId}`,
      itemId: '',
      itemName: '',
      accountId: '',
      accountName: '',
      nug: 0,
      kg: 0,
      rate: 0,
      per: 'nug',
      basicAmount: 0,
      totalAmount: 0
    }])
    setNextTempId(nextTempId + 1)
  }

  const removeItemRow = (tempId: string) => {
    setItemRows(itemRows.filter(row => row.tempId !== tempId))
  }

  const updateItemRow = (tempId: string, field: keyof ItemRow, value: any) => {
    setItemRows(itemRows.map(row => {
      if (row.tempId !== tempId) return row
      
      const updated = { ...row, [field]: value }
      
      // Auto-calculate basic amount when nug/kg/rate/per changes
      if (['nug', 'kg', 'rate', 'per'].includes(field)) {
        const quantity = updated.per === 'nug' ? updated.nug : updated.kg
        updated.basicAmount = quantity * updated.rate
      }
      
      // Auto-calculate crate value when crate qty/rate changes
      if (['crateQty', 'crateRate'].includes(field)) {
        if (updated.crateQty && updated.crateRate) {
          updated.crateValue = updated.crateQty * updated.crateRate
        } else {
          updated.crateValue = undefined
        }
      }
      
      return updated
    }))
  }

  const handleItemSelect = (tempId: string, itemId: string) => {
    const selectedItem = items.find(i => i.id === itemId)
    if (selectedItem) {
      updateItemRow(tempId, 'itemId', itemId)
      updateItemRow(tempId, 'itemName', selectedItem.itemName)
    }
  }

  const handleAccountSelect = (tempId: string, accountId: string) => {
    const selectedAccount = accounts.find(a => a.id === accountId)
    if (selectedAccount) {
      updateItemRow(tempId, 'accountId', accountId)
      updateItemRow(tempId, 'accountName', selectedAccount.accountName)
    }
  }

  const handleCrateMarkaSelect = (tempId: string, crateMarkaId: string) => {
    const selectedCrate = crateMArkas.find(c => c.id === crateMarkaId)
    if (selectedCrate) {
      updateItemRow(tempId, 'crateMarkaId', crateMarkaId)
      updateItemRow(tempId, 'crateMarkaName', selectedCrate.crateMarkaName)
    }
  }

  const getItemMaintainsCrates = (itemId: string): boolean => {
    const item = items.find(i => i.id === itemId)
    return item?.maintainCratesInSalePurchase || false
  }

  const handleSubmit = async () => {
    // Validation
    if (!saleDate) {
      toast.error('Please select sale date')
      return
    }

    if (itemRows.length === 0) {
      toast.error('Please add at least one item')
      return
    }

    // Validate all rows
    for (const row of itemRows) {
      if (!row.itemId || !row.accountId) {
        toast.error('Please fill all required fields')
        return
      }
      if (row.nug === 0 && row.kg === 0) {
        toast.error('Please enter nug or kg for all items')
        return
      }
      if (row.rate === 0) {
        toast.error('Please enter rate for all items')
        return
      }
      if (row.totalAmount === 0) {
        toast.error('Please enter total amount for all items')
        return
      }
    }

    setSubmitting(true)
    
    try {
      // Prepare items (remove tempId and undefined crate fields)
      const preparedItems = itemRows.map(row => {
        const item: CreateQuickSaleItemInput = {
          itemId: row.itemId,
          itemName: row.itemName,
          accountId: row.accountId,
          accountName: row.accountName,
          nug: row.nug,
          kg: row.kg,
          rate: row.rate,
          per: row.per,
          basicAmount: row.basicAmount,
          totalAmount: row.totalAmount
        }
        
        // Only include crate fields if they exist
        if (row.crateMarkaId) item.crateMarkaId = row.crateMarkaId
        if (row.crateMarkaName) item.crateMarkaName = row.crateMarkaName
        if (row.crateQty) item.crateQty = row.crateQty
        if (row.crateRate) item.crateRate = row.crateRate
        if (row.crateValue) item.crateValue = row.crateValue
        
        return item
      })

      let response
      
      let voucherToUse = quickSale?.voucherNo || voucherNo

      if (!quickSale && !voucherToUse) {
        const response = await window.api.quickSale.getNextVoucherNo(companyId, saleDate)
        if (response.success && response.data) {
          voucherToUse = response.data
          setVoucherNo(response.data)
        }
      }

      if (quickSale) {
        // Update existing
        response = await window.api.quickSale.update(quickSale.id, {
          saleDate,
          voucherNo: voucherToUse,
          items: preparedItems
        })
      } else {
        // Create new
        response = await window.api.quickSale.create({
          companyId,
          saleDate,
          voucherNo: voucherToUse,
          items: preparedItems
        })
      }

      if (response.success) {
        toast.success(quickSale ? 'Quick sale updated successfully' : 'Quick sale created successfully')
        onSuccess()
      } else {
        toast.error(response.message || 'Failed to save quick sale')
      }
    } catch (error) {
      console.error('Save quick sale error:', error)
      toast.error('Failed to save quick sale')
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate summary
  const summary = itemRows.reduce((acc, row) => ({
    totalItems: acc.totalItems + 1,
    totalNug: acc.totalNug + row.nug,
    totalWeight: acc.totalWeight + row.kg,
    totalBasicAmount: acc.totalBasicAmount + row.basicAmount,
    totalSaleAmount: acc.totalSaleAmount + row.totalAmount,
    totalCrates: acc.totalCrates + (row.crateQty || 0)
  }), {
    totalItems: 0,
    totalNug: 0,
    totalWeight: 0,
    totalBasicAmount: 0,
    totalSaleAmount: 0,
    totalCrates: 0
  })

  const commissionExpenses = summary.totalSaleAmount - summary.totalBasicAmount

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {quickSale ? 'Edit Quick Sale' : 'New Quick Sale'}
          </DialogTitle>
          <DialogDescription>
            {quickSale ? 'Update quick sale details and items' : 'Create a new quick sale transaction'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Sale Date & Voucher */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="saleDate">Sale Date *</Label>
              <Input
                id="saleDate"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="voucherNo">Voucher No</Label>
              <Input
                id="voucherNo"
                value={voucherNo}
                readOnly
                placeholder={voucherLoading ? 'Generating...' : 'Auto-generated'}
                className="bg-muted"
              />
              {!quickSale && (
                <p className="text-xs text-muted-foreground">
                  {voucherLoading ? 'Generating next voucher number...' : 'Voucher number is auto-generated for each sale.'}
                </p>
              )}
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items *</Label>
              <Button
                type="button"
                size="sm"
                onClick={addItemRow}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {itemRows.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No items added. Click "Add Item" to start.
                </CardContent>
              </Card>
            ) : (
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[150px]">Item *</TableHead>
                      <TableHead className="w-[150px]">Account *</TableHead>
                      <TableHead className="w-20">Nug</TableHead>
                      <TableHead className="w-20">Kg</TableHead>
                      <TableHead className="w-20">Rate *</TableHead>
                      <TableHead className="w-[70px]">Per</TableHead>
                      <TableHead className="w-[100px]">Basic Amt</TableHead>
                      <TableHead className="w-[100px]">Total Amt *</TableHead>
                      <TableHead className="w-[120px]">Crate</TableHead>
                      <TableHead className="w-[70px]">Qty</TableHead>
                      <TableHead className="w-[70px]">Rate</TableHead>
                      <TableHead className="w-[90px]">Value</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemRows.map((row) => {
                      const showCrates = getItemMaintainsCrates(row.itemId)
                      
                      return (
                        <TableRow key={row.tempId}>
                          {/* Item Select */}
                          <TableCell>
                            <Select
                              value={row.itemId}
                              onValueChange={(value) => handleItemSelect(row.tempId, value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {items.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.itemName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Account Select */}
                          <TableCell>
                            <Select
                              value={row.accountId}
                              onValueChange={(value) => handleAccountSelect(row.tempId, value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.accountName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Nug */}
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8"
                              value={row.nug || ''}
                              onChange={(e) => updateItemRow(row.tempId, 'nug', Number(e.target.value))}
                              min="0"
                              step="1"
                            />
                          </TableCell>

                          {/* Kg */}
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8"
                              value={row.kg || ''}
                              onChange={(e) => updateItemRow(row.tempId, 'kg', Number(e.target.value))}
                              min="0"
                              step="0.01"
                            />
                          </TableCell>

                          {/* Rate */}
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8"
                              value={row.rate || ''}
                              onChange={(e) => updateItemRow(row.tempId, 'rate', Number(e.target.value))}
                              min="0"
                              step="0.01"
                            />
                          </TableCell>

                          {/* Per */}
                          <TableCell>
                            <Select
                              value={row.per}
                              onValueChange={(value) => updateItemRow(row.tempId, 'per', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="nug">Nug</SelectItem>
                                <SelectItem value="kg">Kg</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Basic Amount (calculated) */}
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8 bg-muted"
                              value={row.basicAmount || ''}
                              readOnly
                            />
                          </TableCell>

                          {/* Total Amount */}
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8"
                              value={row.totalAmount || ''}
                              onChange={(e) => updateItemRow(row.tempId, 'totalAmount', Number(e.target.value))}
                              min="0"
                              step="0.01"
                            />
                          </TableCell>

                          {/* Crate Marka (conditional) */}
                          <TableCell>
                            {showCrates ? (
                              <Select
                                value={row.crateMarkaId || ''}
                                onValueChange={(value) => handleCrateMarkaSelect(row.tempId, value)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select crate" />
                                </SelectTrigger>
                                <SelectContent>
                                  {crateMArkas.map((crate) => (
                                    <SelectItem key={crate.id} value={crate.id}>
                                      {crate.crateMarkaName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>

                          {/* Crate Qty */}
                          <TableCell>
                            {showCrates ? (
                              <Input
                                type="number"
                                className="h-8"
                                value={row.crateQty || ''}
                                onChange={(e) => updateItemRow(row.tempId, 'crateQty', Number(e.target.value))}
                                min="0"
                                step="1"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          {/* Crate Rate */}
                          <TableCell>
                            {showCrates ? (
                              <Input
                                type="number"
                                className="h-8"
                                value={row.crateRate || ''}
                                onChange={(e) => updateItemRow(row.tempId, 'crateRate', Number(e.target.value))}
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          {/* Crate Value (calculated) */}
                          <TableCell>
                            {showCrates ? (
                              <Input
                                type="number"
                                className="h-8 bg-muted"
                                value={row.crateValue || ''}
                                readOnly
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>

                          {/* Delete */}
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => removeItemRow(row.tempId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Summary */}
          {itemRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Items</p>
                    <p className="text-xl font-semibold">{summary.totalItems}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Nug / Kg</p>
                    <p className="text-xl font-semibold">
                      {summary.totalNug.toFixed(2)} / {summary.totalWeight.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Crates</p>
                    <p className="text-xl font-semibold">{summary.totalCrates}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Basic Amount</p>
                    <p className="text-xl font-semibold">₹{summary.totalBasicAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Commission / Expenses</p>
                    <p className="text-xl font-semibold">₹{commissionExpenses.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sale Amount</p>
                    <p className="text-xl font-bold text-primary">₹{summary.totalSaleAmount.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {quickSale ? 'Update' : 'Create'} Quick Sale
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
