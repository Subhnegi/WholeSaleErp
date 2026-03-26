import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ReactNode } from 'react'

export type ExportFormat = 'excel' | 'pdf' | 'csv'

interface ExportOption {
  format: ExportFormat
  label: string
  icon?: ReactNode
}

interface ReportExportModalProps {
  open: boolean
  onClose: () => void
  onExport: (format: ExportFormat) => void
  onPreview?: () => void
  title?: string
  description?: string
  isProcessing?: boolean
  options?: ExportOption[]
  previewLabel?: string
  isPreviewProcessing?: boolean
}

const DEFAULT_OPTIONS: ExportOption[] = [
  { format: 'excel', label: 'Export as Excel' },
  { format: 'pdf', label: 'Export as PDF' },
  { format: 'csv', label: 'Export as CSV' }
]

export function ReportExportModal({
  open,
  onClose,
  onExport,
  onPreview,
  title = 'Export Report',
  description = 'Select the format you want to export',
  isProcessing = false,
  options = DEFAULT_OPTIONS,
  previewLabel = 'Preview Report',
  isPreviewProcessing = false
}: ReportExportModalProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {onPreview && (
            <Button disabled={isProcessing || isPreviewProcessing} onClick={onPreview}>
              {previewLabel}
            </Button>
          )}
          {options.map((option) => (
            <Button
              key={option.format}
              variant="outline"
              disabled={isProcessing}
              onClick={() => onExport(option.format)}
            >
              <span className="flex items-center gap-2">
                {option.icon}
                {option.label}
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
