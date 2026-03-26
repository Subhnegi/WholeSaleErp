import { useState, useEffect, useMemo } from 'react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Combobox } from '@/components/ui/combobox'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { OtherChargesHead } from '@/types/otherChargesHead'
import { AccountFormModal } from '@/components/AccountFormModal'

interface Account {
  id: string
  accountName: string
  accountGroupId: string
}

interface AccountGroup {
  id: string
  name: string
}

interface OtherChargesHeadFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  companyId: string
  chargesHead?: OtherChargesHead | null
}

export function OtherChargesHeadFormModal({
  open,
  onOpenChange,
  onSuccess,
  companyId,
  chargesHead
}: OtherChargesHeadFormModalProps) {
  const isEditMode = !!chargesHead

  const [formData, setFormData] = useState({
    headingName: '',
    printAs: '',
    accountHeadId: '' as string | null,
    chargeType: 'plus' as 'plus' | 'minus',
    feedAs: 'absolute' as 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountGroups, setAccountGroups] = useState<AccountGroup[]>([])
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  // Load accounts and account groups on mount
  useEffect(() => {
    if (open && companyId) {
      loadAccounts()
      loadAccountGroups()
    }
  }, [open, companyId])

  const loadAccounts = async () => {
    try {
      const response = await window.api.account.listByCompany(companyId)
      if (response.success && response.data) {
        setAccounts(response.data)
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }
  }

  const loadAccountGroups = async () => {
    try {
      const response = await window.api.accountGroup.list(companyId)
      if (response.success && response.data) {
        setAccountGroups(response.data)
      }
    } catch (error) {
      console.error('Failed to load account groups:', error)
    }
  }

  // Filter accounts: only show accounts where accountGroup is "Forwarding Agent"
  const filteredAccounts = useMemo(() => {
    const forwardingAgentGroup = accountGroups.find(
      (group) => group.name.toLowerCase() === 'forwarding agent'
    )
    if (!forwardingAgentGroup) return accounts // Show all if no Forwarding Agent group
    return accounts.filter((account) => account.accountGroupId === forwardingAgentGroup.id)
  }, [accounts, accountGroups])

  // Convert filtered accounts to combobox options
  const accountOptions = useMemo(() => {
    return filteredAccounts.map((account) => ({
      value: account.id,
      label: account.accountName
    }))
  }, [filteredAccounts])

  // Reset form when modal opens/closes or charges head changes
  useEffect(() => {
    if (open && chargesHead) {
      setFormData({
        headingName: chargesHead.headingName,
        printAs: chargesHead.printAs || '',
        accountHeadId: chargesHead.accountHeadId,
        chargeType: chargesHead.chargeType,
        feedAs: chargesHead.feedAs,
      })
    } else if (!open) {
      setFormData({
        headingName: '',
        printAs: '',
        accountHeadId: null,
        chargeType: 'plus',
        feedAs: 'absolute',
      })
    }
  }, [open, chargesHead])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.headingName.trim()) {
      toast.error('Charges Heading is required', {
        description: 'Please enter a heading name'
      })
      return
    }

    setIsSubmitting(true)

    try {
      let response

      if (isEditMode && chargesHead) {
        response = await window.api.otherChargesHead.update(chargesHead.id, {
          headingName: formData.headingName.trim(),
          printAs: formData.printAs.trim() || null,
          accountHeadId: formData.accountHeadId || null,
          chargeType: formData.chargeType,
          feedAs: formData.feedAs,
        })
      } else {
        response = await window.api.otherChargesHead.create(companyId, {
          headingName: formData.headingName.trim(),
          printAs: formData.printAs.trim() || null,
          accountHeadId: formData.accountHeadId || null,
          chargeType: formData.chargeType,
          feedAs: formData.feedAs,
        })
      }

      if (response.success) {
        toast.success(
          isEditMode ? 'Other charges head updated successfully' : 'Other charges head created successfully',
          {
            description: `"${formData.headingName}" has been ${isEditMode ? 'updated' : 'added'}`
          }
        )
        onSuccess()
      } else {
        toast.error(response.error || 'Unable to save other charges head', {
          description: 'Please try again or contact support'
        })
      }
    } catch (error) {
      console.error('Submit other charges head error:', error)
      toast.error('An error occurred while saving', {
        description: 'Please try again later'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAccountCreated = () => {
    setIsCreatingAccount(false)
    loadAccounts()
    toast.success('Account created successfully', {
      description: 'You can now select it from the dropdown'
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Other Charges Head' : 'New Other Charges Head'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? 'Update the charges head details below'
                : 'Enter the details for the new charges head'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Charges Heading */}
              <div className="space-y-2">
                <Label htmlFor="headingName">
                  Charges Heading <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="headingName"
                  value={formData.headingName}
                  onChange={(e) => setFormData({ ...formData, headingName: e.target.value })}
                  placeholder="e.g., Commission, Freight, Labour"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Print As */}
              <div className="space-y-2">
                <Label htmlFor="printAs">Print As</Label>
                <Input
                  id="printAs"
                  value={formData.printAs}
                  onChange={(e) => setFormData({ ...formData, printAs: e.target.value })}
                  placeholder="e.g., Commission Charges, Freight Charges"
                  disabled={isSubmitting}
                />
              </div>

              {/* Account Head to Post */}
              <div className="space-y-2">
                <Label htmlFor="accountHeadId">Account Head to Post</Label>
                <Combobox
                  options={accountOptions}
                  value={formData.accountHeadId || ''}
                  onChange={(value) => setFormData({ ...formData, accountHeadId: value || null })}
                  placeholder="Select account..."
                  searchPlaceholder="Search accounts..."
                  emptyText="No account found."
                  disabled={isSubmitting}
                  onCreateNew={() => setIsCreatingAccount(true)}
                  createNewLabel="Create New Account"
                />
                {formData.accountHeadId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setFormData({ ...formData, accountHeadId: null })}
                  >
                    Clear selection
                  </Button>
                )}
              </div>

              {/* Type (Plus/Minus) */}
              <div className="space-y-2">
                <Label>Type</Label>
                <RadioGroup
                  value={formData.chargeType}
                  onValueChange={(value: 'plus' | 'minus') => setFormData({ ...formData, chargeType: value })}
                  className="flex gap-4"
                  disabled={isSubmitting}
                >
                  <div className="flex items-center space-x-2 text-blue-950 border-blue-600">
                    <RadioGroupItem value="plus" id="type-plus" />
                    <Label htmlFor="type-plus" className="cursor-pointer">Plus (+)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="minus" id="type-minus" />
                    <Label htmlFor="type-minus" className="cursor-pointer">Minus (-)</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Amount of Charges to be feed as */}
              <div className="space-y-2">
                <Label>Amount of Charges to be feed as</Label>
                <RadioGroup
                  value={formData.feedAs}
                  onValueChange={(value: 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti') => 
                    setFormData({ ...formData, feedAs: value })
                  }
                  className="grid grid-cols-2 md:grid-cols-3 gap-2"
                  disabled={isSubmitting}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="absolute" id="feed-absolute" />
                    <Label htmlFor="feed-absolute" className="cursor-pointer">Absolute Amount</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="feed-percentage" />
                    <Label htmlFor="feed-percentage" className="cursor-pointer">Percentage</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="onWeight" id="feed-weight" />
                    <Label htmlFor="feed-weight" className="cursor-pointer">On Weight</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="onNug" id="feed-nug" />
                    <Label htmlFor="feed-nug" className="cursor-pointer">On Nug</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="onPetti" id="feed-petti" />
                    <Label htmlFor="feed-petti" className="cursor-pointer">On Petti/Dabba</Label>
                  </div>
                </RadioGroup>
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
                {isEditMode ? 'Save' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Account Modal */}
      {isCreatingAccount && (
        <AccountFormModal
          open={isCreatingAccount}
          onOpenChange={setIsCreatingAccount}
          onSuccess={handleAccountCreated}
        />
      )}
    </>
  )
}
