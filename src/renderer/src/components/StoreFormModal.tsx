import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface StoreFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  storeId?: string
  companyId: string
}

export function StoreFormModal({ 
  open, 
  onClose, 
  onSuccess, 
  storeId, 
  companyId 
}: StoreFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    contactNo: '',
    address: '',
    address2: '',
    address3: ''
  })

  const isEditMode = !!storeId

  // Load store data if editing
  useEffect(() => {
    if (open && storeId) {
      loadStoreData()
    } else if (open && !storeId) {
      // Reset form for new store
      setFormData({
        name: '',
        contactNo: '',
        address: '',
        address2: '',
        address3: ''
      })
    }
  }, [open, storeId])

  const loadStoreData = async () => {
    if (!storeId) return

    try {
      const store = await window.api.store.get(storeId)
      if (store) {
        setFormData({
          name: store.name,
          contactNo: store.contactNo || '',
          address: store.address || '',
          address2: store.address2 || '',
          address3: store.address3 || ''
        })
      } else {
        toast.error('Unable to load store details. Please try again.')
        onClose()
      }
    } catch (error) {
      console.error('Load store error:', error)
      toast.error('An error occurred while loading store details')
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Store name is required', {
        description: 'Please enter a name for the store'
      })
      return
    }

    setLoading(true)

    try {
      if (isEditMode && storeId) {
        await window.api.store.update(storeId, {
          name: formData.name.trim(),
          contactNo: formData.contactNo.trim() || null,
          address: formData.address.trim() || null,
          address2: formData.address2.trim() || null,
          address3: formData.address3.trim() || null
        })
        toast.success(`Store "${formData.name}" updated successfully`)
      } else {
        await window.api.store.create({
          name: formData.name.trim(),
          companyId,
          contactNo: formData.contactNo.trim() || null,
          address: formData.address.trim() || null,
          address2: formData.address2.trim() || null,
          address3: formData.address3.trim() || null
        })
        toast.success(`Store "${formData.name}" created successfully`)
      }
      onSuccess()
    } catch (error) {
      console.error('Save store error:', error)
      toast.error('An error occurred while saving', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Store' : 'New Store'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the store details below.' 
              : 'Enter the details for the new store.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Store Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter store name"
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNo">Contact No.</Label>
            <Input
              id="contactNo"
              value={formData.contactNo}
              onChange={(e) => handleInputChange('contactNo', e.target.value)}
              placeholder="Enter contact number"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address Line 1</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter address line 1"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address2">Address Line 2</Label>
            <Input
              id="address2"
              value={formData.address2}
              onChange={(e) => handleInputChange('address2', e.target.value)}
              placeholder="Enter address line 2"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address3">Address Line 3</Label>
            <Input
              id="address3"
              value={formData.address3}
              onChange={(e) => handleInputChange('address3', e.target.value)}
              placeholder="Enter address line 3"
              disabled={loading}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
