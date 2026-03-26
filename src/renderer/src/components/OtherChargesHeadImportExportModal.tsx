import { useMemo, useState, useEffect } from 'react'
import { 
  CommonImportExportModal, 
  type ImportExportConfig 
} from '@/components/CommonImportExportModal'

interface OtherChargesHeadImportExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'import' | 'export'
  companyId: string
  onImportSuccess?: () => void
}

export function OtherChargesHeadImportExportModal({
  open,
  onOpenChange,
  mode,
  companyId,
  onImportSuccess
}: OtherChargesHeadImportExportModalProps) {
  const [exportData, setExportData] = useState<any[]>([])
  
  // Fetch export data when modal opens in export mode
  useEffect(() => {
    if (open && mode === 'export') {
      window.api.otherChargesHead.listByCompany(companyId).then(response => {
        if (response.success && response.data) {
          setExportData(response.data.map((ch: any) => ({
            'Charges Heading': ch.headingName,
            'Print As': ch.printAs || '',
            'Type': ch.chargeType === 'plus' ? 'Plus (+)' : 'Minus (-)',
            'Feed As': formatFeedAs(ch.feedAs)
          })))
        }
      })
    }
  }, [open, mode, companyId])

  const formatFeedAs = (feedAs: string) => {
    const labels: Record<string, string> = {
      absolute: 'Absolute Amount',
      percentage: 'Percentage',
      onWeight: 'On Weight',
      onNug: 'On Nug',
      onPetti: 'On Petti/Dabba'
    }
    return labels[feedAs] || feedAs
  }

  const config: ImportExportConfig = useMemo(() => ({
    entityName: 'other charges head',
    entityNamePlural: 'other charges heads',
    templateFields: [
      { key: 'Charges Heading', label: 'Charges Heading', type: 'string', required: true },
      { key: 'Print As', label: 'Print As', type: 'string', required: false },
      { key: 'Type', label: 'Type', type: 'string', required: false },
      { key: 'Feed As', label: 'Feed As', type: 'string', required: false }
    ],
    sampleData: [
      {
        'Charges Heading': 'Commission',
        'Print As': 'Commission Charges',
        'Type': 'Minus (-)',
        'Feed As': 'Percentage'
      },
      {
        'Charges Heading': 'Freight',
        'Print As': 'Freight Charges',
        'Type': 'Plus (+)',
        'Feed As': 'Absolute Amount'
      },
      {
        'Charges Heading': 'Labour',
        'Print As': 'Labour Charges',
        'Type': 'Minus (-)',
        'Feed As': 'On Nug'
      }
    ],
    exportData: exportData,
    instructions: [
      'Charges Heading: Required',
      'Print As: Optional display name',
      'Type: "Plus (+)" or "Minus (-)" (default: Plus)',
      'Feed As: "Absolute Amount", "Percentage", "On Weight", "On Nug", or "On Petti/Dabba" (default: Absolute Amount)'
    ],
    validateRow: (row: any) => {
      const headingName = row['Charges Heading']
      if (!headingName || typeof headingName !== 'string' || !headingName.trim()) {
        return { valid: false, error: 'Charges Heading is required' }
      }
      return { valid: true }
    },
    mapImportRow: (row: any) => {
      const parseChargeType = (value: any): 'plus' | 'minus' => {
        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim()
          if (lower.includes('minus') || lower === '-') {
            return 'minus'
          }
        }
        return 'plus'
      }

      const parseFeedAs = (value: any): 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti' => {
        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim()
          if (lower.includes('percentage') || lower === '%') {
            return 'percentage'
          }
          if (lower.includes('weight')) {
            return 'onWeight'
          }
          if (lower.includes('nug')) {
            return 'onNug'
          }
          if (lower.includes('petti') || lower.includes('dabba')) {
            return 'onPetti'
          }
        }
        return 'absolute'
      }

      return {
        headingName: String(row['Charges Heading']).trim(),
        printAs: row['Print As'] ? String(row['Print As']).trim() : null,
        chargeType: parseChargeType(row['Type']),
        feedAs: parseFeedAs(row['Feed As']),
        accountHeadId: null // Cannot import account from CSV
      }
    },
    onImport: async (chargesHeads: any[]) => {
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      for (const chargesHeadData of chargesHeads) {
        try {
          const response = await window.api.otherChargesHead.create(companyId, chargesHeadData)
          if (response.success) {
            successCount++
          } else {
            failCount++
            errors.push(`${chargesHeadData.headingName}: ${response.error || 'Unknown error'}`)
          }
        } catch (error) {
          failCount++
          errors.push(`${chargesHeadData.headingName}: ${error}`)
        }
      }

      if (successCount > 0 && onImportSuccess) {
        onImportSuccess()
      }

      return {
        success: successCount > 0,
        successCount,
        failCount,
        errors
      }
    }
  }), [companyId, onImportSuccess, exportData])

  return (
    <CommonImportExportModal
      open={open}
      onOpenChange={onOpenChange}
      mode={mode}
      config={config}
    />
  )
}
