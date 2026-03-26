import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Packing } from '@/types/packing'

interface PackingFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  companyId: string
  packing?: Packing | null
}

export function PackingFormModal({
  open,
  onOpenChange,
  onSuccess,
  companyId,
  packing
}: PackingFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    packingName: '',
    calculate: 'nug' as 'nug' | 'weight',
    divideBy: 1
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (packing) {
      setFormData({
        packingName: packing.packingName,
        calculate: packing.calculate,
        divideBy: packing.divideBy
      })
    } else {
      setFormData({
        packingName: '',
        calculate: 'nug',
        divideBy: 1
      })
    }
    setErrors({})
  }, [packing, open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.packingName.trim()) {
      newErrors.packingName = 'Packing name is required'
    }

    if (formData.divideBy <= 0) {
      newErrors.divideBy = 'Divide by must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      if (packing) {
        // Update existing packing
        await window.api.packing.update(packing.id, {
          packingName: formData.packingName.trim(),
          calculate: formData.calculate,
          divideBy: formData.divideBy
        })
        toast.success('Packing updated successfully', {
          description: `${formData.packingName} has been updated`
        })
      } else {
        // Create new packing
        await window.api.packing.create({
          packingName: formData.packingName.trim(),
          calculate: formData.calculate,
          divideBy: formData.divideBy,
          companyId
        })
        toast.success('Packing created successfully', {
          description: `${formData.packingName} has been added`
        })
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving packing:', error)
      toast.error('Failed to save packing', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    if (packing) {
      setFormData({
        packingName: packing.packingName,
        calculate: packing.calculate,
        divideBy: packing.divideBy
      })
    } else {
      setFormData({
        packingName: '',
        calculate: 'nug',
        divideBy: 1
      })
    }
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{packing ? 'Edit Packing' : 'Create New Packing'}</DialogTitle>
          <DialogDescription>
            {packing
              ? 'Update the packing information below'
              : 'Enter the details for the new packing'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="packingName">
              Packing Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="packingName"
              placeholder="Enter packing name"
              value={formData.packingName}
              onChange={(e) => {
                setFormData({ ...formData, packingName: e.target.value })
                if (errors.packingName) {
                  setErrors({ ...errors, packingName: '' })
                }
              }}
              className={errors.packingName ? 'border-destructive' : ''}
            />
            {errors.packingName && (
              <p className="text-sm text-destructive">{errors.packingName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="calculate">
              Calculate By <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.calculate}
              onValueChange={(value: 'nug' | 'weight') =>
                setFormData({ ...formData, calculate: value })
              }
            >
              <SelectTrigger id="calculate">
                <SelectValue placeholder="Select calculation method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nug">Nug</SelectItem>
                <SelectItem value="weight">Weight</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="divideBy">
              Divide By <span className="text-destructive">*</span>
            </Label>
            <Input
              id="divideBy"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Enter divide by value"
              value={formData.divideBy || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : parseFloat(e.target.value)
                setFormData({ ...formData, divideBy: value as number })
                if (errors.divideBy) {
                  setErrors({ ...errors, divideBy: '' })
                }
              }}
              className={errors.divideBy ? 'border-destructive' : ''}
            />
            {errors.divideBy && (
              <p className="text-sm text-destructive">{errors.divideBy}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleReset} disabled={loading}>
              Reset
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : packing ? 'Update Packing' : 'Create Packing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
