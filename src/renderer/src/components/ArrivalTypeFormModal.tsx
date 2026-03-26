import { useState, useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ArrivalType } from '@/types/arrivalType'

interface ArrivalTypeFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  companyId: string
  arrivalType?: ArrivalType | null
}

export function ArrivalTypeFormModal({
  open,
  onOpenChange,
  onSuccess,
  companyId,
  arrivalType
}: ArrivalTypeFormModalProps) {
  const isEditMode = !!arrivalType

  const [formData, setFormData] = useState({
    name: '',
    purchaseType: 'partyStock' as 'partyStock' | 'selfPurchase',
    vehicleNoByDefault: '',
    autoRoundOffAmount: false,
    askForAdditionalFields: false,
    requireForwardingAgent: false,
    requireBroker: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens/closes or arrival type changes
  useEffect(() => {
    if (open && arrivalType) {
      setFormData({
        name: arrivalType.name,
        purchaseType: arrivalType.purchaseType,
        vehicleNoByDefault: arrivalType.vehicleNoByDefault || '',
        autoRoundOffAmount: arrivalType.autoRoundOffAmount,
        askForAdditionalFields: arrivalType.askForAdditionalFields,
        requireForwardingAgent: arrivalType.requireForwardingAgent,
        requireBroker: arrivalType.requireBroker,
      })
    } else if (!open) {
      setFormData({
        name: '',
        purchaseType: 'partyStock',
        vehicleNoByDefault: '',
        autoRoundOffAmount: false,
        askForAdditionalFields: false,
        requireForwardingAgent: false,
        requireBroker: false,
      })
    }
  }, [open, arrivalType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Name is required', {
        description: 'Please enter an arrival type name'
      })
      return
    }

    setIsSubmitting(true)

    try {
      let response

      if (isEditMode && arrivalType) {
        response = await window.api.arrivalType.update(arrivalType.id, {
          name: formData.name.trim(),
          purchaseType: formData.purchaseType,
          vehicleNoByDefault: formData.vehicleNoByDefault.trim() || null,
          autoRoundOffAmount: formData.autoRoundOffAmount,
          askForAdditionalFields: formData.askForAdditionalFields,
          requireForwardingAgent: formData.requireForwardingAgent,
          requireBroker: formData.requireBroker,
        })
      } else {
        response = await window.api.arrivalType.create(companyId, {
          name: formData.name.trim(),
          purchaseType: formData.purchaseType,
          vehicleNoByDefault: formData.vehicleNoByDefault.trim() || null,
          autoRoundOffAmount: formData.autoRoundOffAmount,
          askForAdditionalFields: formData.askForAdditionalFields,
          requireForwardingAgent: formData.requireForwardingAgent,
          requireBroker: formData.requireBroker,
        })
      }

      if (response.success) {
        toast.success(
          isEditMode ? 'Arrival type updated successfully' : 'Arrival type created successfully',
          {
            description: `"${formData.name}" has been ${isEditMode ? 'updated' : 'added'}`
          }
        )
        onSuccess()
      } else {
        toast.error(response.error || 'Unable to save arrival type', {
          description: 'Please try again or contact support'
        })
      }
    } catch (error) {
      console.error('Submit arrival type error:', error)
      toast.error('An error occurred while saving', {
        description: 'Please try again later'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Arrival Type' : 'New Arrival Type'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the arrival type details below'
              : 'Enter the details for the new arrival type'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Arrival Type Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Direct Purchase, Consignment"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Purchase Type */}
            <div className="space-y-2">
              <Label htmlFor="purchaseType">Purchase Type</Label>
              <Select
                value={formData.purchaseType}
                onValueChange={(value: 'partyStock' | 'selfPurchase') => 
                  setFormData({ ...formData, purchaseType: value })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="purchaseType">
                  <SelectValue placeholder="Select purchase type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partyStock">Party Stock</SelectItem>
                  <SelectItem value="selfPurchase">Self Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle No. By Default */}
            <div className="space-y-2">
              <Label htmlFor="vehicleNoByDefault">Vehicle No. (By Default)</Label>
              <Input
                id="vehicleNoByDefault"
                value={formData.vehicleNoByDefault}
                onChange={(e) => setFormData({ ...formData, vehicleNoByDefault: e.target.value })}
                placeholder="e.g., GJ-01-AB-1234"
                disabled={isSubmitting}
              />
            </div>

            {/* Boolean Fields Grid */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-sm">Configuration Options</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Auto Round Off Amount */}
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="autoRoundOffAmount" className="cursor-pointer">
                    Auto Round Off Amount
                  </Label>
                  <Switch
                    id="autoRoundOffAmount"
                    checked={formData.autoRoundOffAmount}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoRoundOffAmount: checked })}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Ask for Additional Fields */}
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="askForAdditionalFields" className="cursor-pointer">
                    Ask for Additional Fields
                  </Label>
                  <Switch
                    id="askForAdditionalFields"
                    checked={formData.askForAdditionalFields}
                    onCheckedChange={(checked) => setFormData({ ...formData, askForAdditionalFields: checked })}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Require Forwarding Agent */}
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="requireForwardingAgent" className="cursor-pointer">
                    Require Forwarding Agent
                  </Label>
                  <Switch
                    id="requireForwardingAgent"
                    checked={formData.requireForwardingAgent}
                    onCheckedChange={(checked) => setFormData({ ...formData, requireForwardingAgent: checked })}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Require Broker */}
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="requireBroker" className="cursor-pointer">
                    Require Broker
                  </Label>
                  <Switch
                    id="requireBroker"
                    checked={formData.requireBroker}
                    onCheckedChange={(checked) => setFormData({ ...formData, requireBroker: checked })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
