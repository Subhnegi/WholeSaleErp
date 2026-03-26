import { useMemo, useState, useEffect } from 'react'
import { 
  CommonImportExportModal, 
  type ImportExportConfig 
} from '@/components/CommonImportExportModal'

interface ArrivalTypeImportExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'import' | 'export'
  companyId: string
  onImportSuccess?: () => void
}

export function ArrivalTypeImportExportModal({
  open,
  onOpenChange,
  mode,
  companyId,
  onImportSuccess
}: ArrivalTypeImportExportModalProps) {
  const [exportData, setExportData] = useState<any[]>([])
  
  // Fetch export data when modal opens in export mode
  useEffect(() => {
    if (open && mode === 'export') {
      window.api.arrivalType.listByCompany(companyId).then(response => {
        if (response.success && response.data) {
          setExportData(response.data.map((at: any) => ({
            'Name': at.name,
            'Purchase Type': at.purchaseType === 'selfPurchase' ? 'Self Purchase' : 'Party Stock',
            'Vehicle No. By Default': at.vehicleNoByDefault || '',
            'Auto Round Off Amount': at.autoRoundOffAmount ? 'Yes' : 'No',
            'Ask for Additional Fields': at.askForAdditionalFields ? 'Yes' : 'No',
            'Require Forwarding Agent': at.requireForwardingAgent ? 'Yes' : 'No',
            'Require Broker': at.requireBroker ? 'Yes' : 'No'
          })))
        }
      })
    }
  }, [open, mode, companyId])

  const config: ImportExportConfig = useMemo(() => ({
    entityName: 'arrival type',
    entityNamePlural: 'arrival types',
    templateFields: [
      { key: 'Name', label: 'Name', type: 'string', required: true },
      { key: 'Purchase Type', label: 'Purchase Type', type: 'string', required: false },
      { key: 'Vehicle No. By Default', label: 'Vehicle No. By Default', type: 'string', required: false },
      { key: 'Auto Round Off Amount', label: 'Auto Round Off Amount', type: 'boolean', required: false },
      { key: 'Ask for Additional Fields', label: 'Ask for Additional Fields', type: 'boolean', required: false },
      { key: 'Require Forwarding Agent', label: 'Require Forwarding Agent', type: 'boolean', required: false },
      { key: 'Require Broker', label: 'Require Broker', type: 'boolean', required: false }
    ],
    sampleData: [
      {
        'Name': 'Direct Purchase',
        'Purchase Type': 'Self Purchase',
        'Vehicle No. By Default': 'MH-12-AB-1234',
        'Auto Round Off Amount': 'Yes',
        'Ask for Additional Fields': 'No',
        'Require Forwarding Agent': 'Yes',
        'Require Broker': 'No'
      },
      {
        'Name': 'Consignment',
        'Purchase Type': 'Party Stock',
        'Vehicle No. By Default': '',
        'Auto Round Off Amount': 'No',
        'Ask for Additional Fields': 'Yes',
        'Require Forwarding Agent': 'No',
        'Require Broker': 'Yes'
      }
    ],
    exportData: exportData,
    instructions: [
      'Name: Required',
      'Purchase Type: "Party Stock" or "Self Purchase" (default: Party Stock)',
      'Vehicle No. By Default: Default vehicle number to use (optional)',
      'Boolean fields: Use "Yes" or "No"'
    ],
    validateRow: (row: any) => {
      const name = row['Name']
      if (!name || typeof name !== 'string' || !name.trim()) {
        return { valid: false, error: 'Name is required' }
      }
      return { valid: true }
    },
    mapImportRow: (row: any) => {
      const parseBoolean = (value: any): boolean => {
        if (typeof value === 'boolean') return value
        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim()
          return lower === 'yes' || lower === 'true' || lower === '1'
        }
        return false
      }

      const parsePurchaseType = (value: any): 'partyStock' | 'selfPurchase' => {
        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim()
          if (lower === 'self purchase' || lower === 'selfpurchase' || lower === 'self') {
            return 'selfPurchase'
          }
        }
        return 'partyStock'
      }

      const parseString = (value: any): string | null => {
        if (value === undefined || value === null || value === '') return null
        return String(value).trim()
      }

      return {
        name: String(row['Name']).trim(),
        purchaseType: parsePurchaseType(row['Purchase Type']),
        vehicleNoByDefault: parseString(row['Vehicle No. By Default']),
        autoRoundOffAmount: parseBoolean(row['Auto Round Off Amount']),
        askForAdditionalFields: parseBoolean(row['Ask for Additional Fields']),
        requireForwardingAgent: parseBoolean(row['Require Forwarding Agent']),
        requireBroker: parseBoolean(row['Require Broker'])
      }
    },
    onImport: async (arrivalTypes: any[]) => {
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      for (const arrivalTypeData of arrivalTypes) {
        try {
          const response = await window.api.arrivalType.create(companyId, arrivalTypeData)
          if (response.success) {
            successCount++
          } else {
            failCount++
            errors.push(`${arrivalTypeData.name}: ${response.error || 'Unknown error'}`)
          }
        } catch (error) {
          failCount++
          errors.push(`${arrivalTypeData.name}: ${error}`)
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
