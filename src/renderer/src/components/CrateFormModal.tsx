import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { CrateMarkaFormData } from '@/types/crate'

interface CrateFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  crateId?: string
  companyId: string
}

export function CrateFormModal({ 
  open, 
  onClose, 
  onSuccess, 
  crateId, 
  companyId 
}: CrateFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CrateMarkaFormData>({
    crateMarkaName: '',
    printAs: '',
    opQty: 0,
    cost: 0
  })

  const isEditMode = !!crateId

  // Load crate data if editing
  useEffect(() => {
    if (open && crateId) {
      loadCrateData()
    } else if (open && !crateId) {
      // Reset form for new crate
      setFormData({
        crateMarkaName: '',
        printAs: '',
        opQty: 0,
        cost: 0
      })
    }
  }, [open, crateId])

  const loadCrateData = async () => {
    if (!crateId) return

    try {
      const response = await window.api.crate.get(crateId)
      if (response.success && response.data) {
        const crate = response.data
        setFormData({
          crateMarkaName: crate.crateMarkaName,
          printAs: crate.printAs || '',
          opQty: crate.opQty,
          cost: crate.cost
        })
      } else {
        toast.error('Unable to load crate marka details. Please try again.')
        onClose()
      }
    } catch (error) {
      console.error('Load crate error:', error)
      toast.error('An error occurred while loading crate marka details')
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.crateMarkaName.trim()) {
      toast.error('Crate marka name is required', {
        description: 'Please enter a name for the crate marka'
      })
      return
    }

    setLoading(true)

    try {
      const dataToSubmit = {
        ...formData,
        printAs: formData.printAs?.trim() || undefined
      }

      let response
      if (isEditMode && crateId) {
        response = await window.api.crate.update(crateId, dataToSubmit)
      } else {
        response = await window.api.crate.create(companyId, dataToSubmit)
      }

      if (response.success) {
        toast.success(
          isEditMode
            ? `Crate marka "${formData.crateMarkaName}" updated successfully`
            : `Crate marka "${formData.crateMarkaName}" created successfully`
        )
        onSuccess()
      } else {
        toast.error(response.message || 'Failed to save crate marka', {
          description: response.error || 'Please check your input and try again'
        })
      }
    } catch (error) {
      console.error('Save crate error:', error)
      toast.error('An error occurred while saving', {
        description: 'Please try again or contact support if the problem persists'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field: keyof CrateMarkaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Crate Marka' : 'New Crate Marka'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the crate marka details below.' 
              : 'Enter the details for the new crate marka.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="crateMarkaName">
              Crate Marka Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="crateMarkaName"
              value={formData.crateMarkaName}
              onChange={(e) => handleFieldChange('crateMarkaName', e.target.value)}
              placeholder="Enter crate marka name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="printAs">Print As</Label>
            <Input
              id="printAs"
              value={formData.printAs}
              onChange={(e) => handleFieldChange('printAs', e.target.value)}
              placeholder="Enter print name (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="opQty">Opening Quantity</Label>
              <Input
                id="opQty"
                type="number"
                value={formData.opQty === 0 ? '' : formData.opQty}
                onChange={(e) => handleFieldChange('opQty', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                placeholder="0"
                min="0"
                step="any"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost (₹)</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost === 0 ? '' : formData.cost}
                onChange={(e) => handleFieldChange('cost', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
