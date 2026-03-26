import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createAccountGroup } from '@/store/slices/accountSlice'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { toast } from 'sonner'

interface AccountGroupFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (groupId: string) => void
}

export default function AccountGroupFormModal({
  open,
  onOpenChange,
  onSuccess
}: AccountGroupFormModalProps) {
  const dispatch = useAppDispatch()
  const { accountGroups, loading } = useAppSelector((state) => state.account)
  const activeCompany = useAppSelector((state) => state.company.activeCompany)

  const [formData, setFormData] = useState({
    name: '',
    parentGroupId: '',
    level: 0
  })

  // Get only primary groups (level 0) for parent selection
  const primaryGroups = accountGroups.filter((g) => g.level === 0)

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setFormData({
        name: '',
        parentGroupId: '',
        level: 0
      })
    }
  }, [open])

  // Auto-set level based on parent selection
  useEffect(() => {
    if (formData.parentGroupId) {
      setFormData((prev) => ({ ...prev, level: 1 }))
    } else {
      setFormData((prev) => ({ ...prev, level: 0 }))
    }
  }, [formData.parentGroupId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Please enter a group name')
      return
    }

    if (!activeCompany?.id) {
      toast.error('No company selected')
      return
    }

    try {
      const result = await dispatch(
        createAccountGroup({
          name: formData.name.trim(),
          parentGroupId: formData.parentGroupId || undefined,
          companyId: activeCompany.id
        })
      ).unwrap()

      toast.success('Account group created successfully')
      onOpenChange(false)
      
      // Call onSuccess with the new group ID
      if (onSuccess && result.id) {
        onSuccess(result.id)
      }
    } catch (error) {
      console.error('Failed to create account group:', error)
      toast.error('Failed to create account group')
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Account Group</DialogTitle>
          <DialogDescription>
            Add a new account group to organize your accounts
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter group name"
              required
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="parentGroup">Parent Group (Optional)</Label>
            <Select
              value={formData.parentGroupId}
              onValueChange={(value) => handleInputChange('parentGroupId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (Primary Group)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Primary Group)</SelectItem>
                {primaryGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {formData.parentGroupId
                ? 'This will be a sub-group'
                : 'This will be a primary group'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
