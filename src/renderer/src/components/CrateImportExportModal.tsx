import { useMemo, useState, useEffect } from 'react'
import { 
  CommonImportExportModal, 
  type ImportExportConfig 
} from '@/components/CommonImportExportModal'

interface CrateImportExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'import' | 'export'
  companyId: string
  onImportSuccess?: () => void
}

export function CrateImportExportModal({
  open,
  onOpenChange,
  mode,
  companyId,
  onImportSuccess
}: CrateImportExportModalProps) {
  const [exportData, setExportData] = useState<any[]>([])
  
  // Fetch export data when modal opens in export mode
  useEffect(() => {
    if (open && mode === 'export') {
      window.api.crate.listByCompany(companyId).then(response => {
        if (response.success && response.data) {
          setExportData(response.data.map((crate: any) => ({
            'Crate Marka Name': crate.crateMarkaName,
            'Print As': crate.printAs || '',
            'Opening Qty': crate.opQty || 0,
            'Cost': crate.cost || 0
          })))
        }
      })
    }
  }, [open, mode, companyId])

  const config: ImportExportConfig = useMemo(() => ({
    entityName: 'crate marka',
    entityNamePlural: 'crate markas',
    templateFields: [
      { key: 'Crate Marka Name', label: 'Crate Marka Name', type: 'string', required: true },
      { key: 'Print As', label: 'Print As', type: 'string', required: false },
      { key: 'Opening Qty', label: 'Opening Qty', type: 'number', required: false },
      { key: 'Cost', label: 'Cost', type: 'number', required: false }
    ],
    sampleData: [
      {
        'Crate Marka Name': 'Plastic Crate',
        'Print As': 'P. Crate',
        'Opening Qty': 100,
        'Cost': 50
      }
    ],
    exportData: exportData,
    instructions: [
      'Crate Marka Name: Required',
      'Print As: Optional display name',
      'Opening Qty: Optional number (default: 0)',
      'Cost: Optional number (default: 0)'
    ],
    validateRow: (row: any) => {
      const crateMarkaName = row['Crate Marka Name']?.toString().trim()
      if (!crateMarkaName) {
        return { valid: false, error: 'Crate Marka Name is required' }
      }
      return { valid: true }
    },
    mapImportRow: (row: any) => ({
      crateMarkaName: String(row['Crate Marka Name']).trim(),
      printAs: row['Print As']?.toString().trim() || null,
      opQty: parseFloat(row['Opening Qty']) || 0,
      cost: parseFloat(row['Cost']) || 0
    }),
    onImport: async (crates: any[]) => {
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      for (const crateData of crates) {
        try {
          const response = await window.api.crate.create(companyId, crateData)
          if (response.success) {
            successCount++
          } else {
            failCount++
            errors.push(`${crateData.crateMarkaName}: ${response.message}`)
          }
        } catch (error) {
          failCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${crateData.crateMarkaName}: ${errorMessage}`)
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
