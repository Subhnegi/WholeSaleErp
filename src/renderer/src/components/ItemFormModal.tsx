import { useState, useEffect } from 'react'
import { useAppSelector } from '@/store/hooks'
import { SUPPORTED_LANGUAGES } from '@/store/slices/preferencesSlice'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Item } from '@/types/item'

interface ItemFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  item?: Item | null
  companyId: string
  viewOnly?: boolean
}

export function ItemFormModal({ 
  open, 
  onClose, 
  onSuccess,
  item, 
  companyId,
  viewOnly = false
}: ItemFormModalProps) {
  const [activeTab, setActiveTab] = useState('basic')
  const [submitting, setSubmitting] = useState(false)
  const preferences = useAppSelector((state) => state.preferences)
  
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === preferences.language)
  
  const [formData, setFormData] = useState({
    itemName: '',
    code: '',
    printAsLang: '',
    commission: 0,
    commissionAsPer: '',
    marketFees: 0,
    rdf: 0,
    bardanaPerNug: 0,
    laga: 0,
    wtPerNug: 0,
    kaatPerNug: 0,
    maintainCratesInSalePurchase: false,
    disableWeight: false
  })

  useEffect(() => {
    if (item) {
      setFormData({
        itemName: item.itemName,
        code: item.code || '',
        printAsLang: item.printAsLang || '',
        commission: item.commission,
        commissionAsPer: item.commissionAsPer || '',
        marketFees: item.marketFees,
        rdf: item.rdf,
        bardanaPerNug: item.bardanaPerNug,
        laga: item.laga,
        wtPerNug: item.wtPerNug,
        kaatPerNug: item.kaatPerNug,
        maintainCratesInSalePurchase: item.maintainCratesInSalePurchase,
        disableWeight: item.disableWeight
      })
    } else {
      // Reset form for new item
      setFormData({
        itemName: '',
        code: '',
        printAsLang: '',
        commission: 0,
        commissionAsPer: '',
        marketFees: 0,
        rdf: 0,
        bardanaPerNug: 0,
        laga: 0,
        wtPerNug: 0,
        kaatPerNug: 0,
        maintainCratesInSalePurchase: false,
        disableWeight: false
      })
    }
    setActiveTab('basic')
  }, [item, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.itemName.trim()) {
      toast.error('Item name is required')
      return
    }

    setSubmitting(true)
    try {
      // Check uniqueness
      const checkResponse = await window.api.item.listByCompany(companyId)
      if (checkResponse.success && checkResponse.data) {
        const existingItems = checkResponse.data as Item[]
        
        // Check name uniqueness
        const nameExists = existingItems.some(
          i => i.itemName.toLowerCase() === formData.itemName.trim().toLowerCase() && 
               (!item || i.id !== item.id)
        )
        if (nameExists) {
          toast.error('An item with this name already exists')
          setSubmitting(false)
          return
        }

        // Check code uniqueness if code is provided
        if (formData.code && formData.code.trim()) {
          const codeExists = existingItems.some(
            i => i.code && 
                 i.code.toLowerCase() === formData.code.trim().toLowerCase() && 
                 (!item || i.id !== item.id)
          )
          if (codeExists) {
            toast.error('An item with this code already exists')
            setSubmitting(false)
            return
          }
        }
      }

      let response
      if (item) {
        // Update existing item
        response = await window.api.item.update(item.id, formData)
      } else {
        // Create new item
        response = await window.api.item.create(companyId, formData)
      }

      if (response.success) {
        toast.success(item ? 'Item updated successfully' : 'Item created successfully')
        onSuccess()
        onClose()
      } else {
        toast.error(response.message || 'Failed to save item')
      }
    } catch (error) {
      console.error('Save item error:', error)
      toast.error('Failed to save item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {viewOnly ? 'View Item' : item ? 'Edit Item' : 'Create New Item'}
          </DialogTitle>
          <DialogDescription>
            {viewOnly 
              ? 'View item details' 
              : item 
                ? 'Update item information' 
                : 'Fill in the details to create a new item'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="charges">Charges & Fees</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="itemName">
                    Item Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="itemName"
                    value={formData.itemName}
                    onChange={(e) => handleChange('itemName', e.target.value)}
                    disabled={viewOnly}
                    placeholder="Enter item name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => handleChange('code', e.target.value)}
                      disabled={viewOnly}
                      placeholder="Item code"
                      className="flex-1"
                    />
                    {!viewOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Generate 5-digit alphanumeric code from item name
                          const name = formData.itemName.trim()
                          if (!name) {
                            toast.error('Please enter item name first')
                            return
                          }
                          
                          // Take first 2-3 letters from name (uppercase)
                          const namePrefix = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase()
                          
                          // Generate random alphanumeric characters to fill remaining length
                          const remainingLength = 5 - namePrefix.length
                          let suffix = ''
                          const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                          for (let i = 0; i < remainingLength; i++) {
                            suffix += chars.charAt(Math.floor(Math.random() * chars.length))
                          }
                          
                          const generatedCode = namePrefix + suffix
                          handleChange('code', generatedCode)
                        }}
                        title="Generate Code from Item Name"
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="printAsLang">
                    Print As ({currentLanguage?.nativeName || 'Regional'})
                  </Label>
                  <Input
                    id="printAsLang"
                    value={formData.printAsLang}
                    onChange={(e) => handleChange('printAsLang', e.target.value)}
                    disabled={viewOnly}
                    placeholder="Regional print name"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Charges & Fees Tab */}
            <TabsContent value="charges" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commission">Commission</Label>
                  <Input
                    id="commission"
                    type="number"
                    step="0.01"
                    value={formData.commission || ''}
                    onChange={(e) => handleChange('commission', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={viewOnly}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commissionAsPer">Commission As Per</Label>
                  <Select
                    value={formData.commissionAsPer}
                    onValueChange={(value) => handleChange('commissionAsPer', value)}
                    disabled={viewOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select commission type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basic Amt (%)">Basic Amt (%)</SelectItem>
                      <SelectItem value="On Kg">On Kg</SelectItem>
                      <SelectItem value="On Kg (%)">On Kg (%)</SelectItem>
                      <SelectItem value="On Nug">On Nug</SelectItem>
                      <SelectItem value="On Rate">On Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marketFees">Market Fees {"%"}</Label>
                  <Input
                    id="marketFees"
                    type="number"
                    step="0.01"
                    value={formData.marketFees || ''}
                    onChange={(e) => handleChange('marketFees', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={viewOnly}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rdf">RDF {"%"}</Label>
                  <Input
                    id="rdf"
                    type="number"
                    step="0.01"
                    value={formData.rdf || ''}
                    onChange={(e) => handleChange('rdf', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={viewOnly}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bardanaPerNug">Bardana Per Nug</Label>
                  <Input
                    id="bardanaPerNug"
                    type="number"
                    step="0.01"
                    value={formData.bardanaPerNug || ''}
                    onChange={(e) => handleChange('bardanaPerNug', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={viewOnly}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="laga">Laga</Label>
                  <Input
                    id="laga"
                    type="number"
                    step="0.01"
                    value={formData.laga || ''}
                    onChange={(e) => handleChange('laga', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={viewOnly}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wtPerNug">Weight Per Nug</Label>
                  <Input
                    id="wtPerNug"
                    type="number"
                    step="0.01"
                    value={formData.wtPerNug || ''}
                    onChange={(e) => handleChange('wtPerNug', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={viewOnly}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kaatPerNug">Kaat Per Nug</Label>
                  <Input
                    id="kaatPerNug"
                    type="number"
                    step="0.01"
                    value={formData.kaatPerNug || ''}
                    onChange={(e) => handleChange('kaatPerNug', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={viewOnly}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="maintainCratesInSalePurchase"
                    checked={formData.maintainCratesInSalePurchase}
                    onCheckedChange={(checked) => handleChange('maintainCratesInSalePurchase', checked)}
                    disabled={viewOnly}
                  />
                  <Label htmlFor="maintainCratesInSalePurchase" className="cursor-pointer">
                    Maintain Crates in Sale/Purchase
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="disableWeight"
                    checked={formData.disableWeight}
                    onCheckedChange={(checked) => handleChange('disableWeight', checked)}
                    disabled={viewOnly}
                  />
                  <Label htmlFor="disableWeight" className="cursor-pointer">
                    Disable Weight Entry
                  </Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {!viewOnly && (
            <DialogFooter className="mt-6">
              <div className="flex justify-between w-full">
                {/* Left side - Prev button */}
                <div>
                  {activeTab !== 'basic' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (activeTab === 'charges') setActiveTab('basic')
                        else if (activeTab === 'settings') setActiveTab('charges')
                      }}
                    >
                      Previous
                    </Button>
                  )}
                </div>

                {/* Right side - Cancel, Next, or Create/Update */}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  
                  {activeTab !== 'settings' ? (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        if (activeTab === 'basic') setActiveTab('charges')
                        else if (activeTab === 'charges') setActiveTab('settings')
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
