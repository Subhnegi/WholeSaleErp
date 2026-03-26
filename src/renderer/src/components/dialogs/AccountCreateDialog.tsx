import { AccountFormModal } from '@/components/AccountFormModal'

interface AccountCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccountCreated: (account: { id: string; accountName: string }) => void
  initialName?: string
}

export function AccountCreateDialog({
  open,
  onOpenChange,
  onAccountCreated
}: AccountCreateDialogProps) {
  return (
    <AccountFormModal
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={() => {
        // Trigger reload and callback
        onAccountCreated({ id: '', accountName: '' })
      }}
    />
  )
}
