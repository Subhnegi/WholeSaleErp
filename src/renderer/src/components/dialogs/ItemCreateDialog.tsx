import { ItemFormModal } from '@/components/ItemFormModal'

interface ItemCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onItemCreated: (item: { id: string; itemName: string }) => void
  initialName?: string
  companyId: string
}

export function ItemCreateDialog({
  open,
  onOpenChange,
  onItemCreated,
  companyId
}: ItemCreateDialogProps) {
  return (
    <ItemFormModal
      open={open}
      onClose={() => onOpenChange(false)}
      onSuccess={() => {
        // Trigger reload and callback
        onItemCreated({ id: '', itemName: '' })
      }}
      companyId={companyId}
    />
  )
}
