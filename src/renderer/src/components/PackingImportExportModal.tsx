import { useMemo, useState, useEffect } from 'react'
import { 
  CommonImportExportModal, 
  type ImportExportConfig 
} from '@/components/CommonImportExportModal'

interface PackingImportExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'import' | 'export'
  companyId: string
  onImportSuccess: () => void
}

export function PackingImportExportModal({
  open,
  onOpenChange,
  mode,
  companyId,
  onImportSuccess
}: PackingImportExportModalProps) {
  const [exportData, setExportData] = useState<any[]>([])
  
  // Fetch export data when modal opens in export mode
  useEffect(() => {
    if (open && mode === 'export') {
      window.api.packing.listByCompany(companyId).then(packings => {
        setExportData(packings.map((p: any) => ({
          Name: p.packingName,
          Calculate: p.calculate,
          DivideBy: p.divideBy
        })))
      })
    }
  }, [open, mode, companyId])

  const config: ImportExportConfig = useMemo(() => ({
    entityName: 'packing',
    entityNamePlural: 'packings',
    templateFields: [
      { key: 'Name', label: 'Name', type: 'string', required: true },
      { key: 'Calculate', label: 'Calculate', type: 'string', required: true },
      { key: 'DivideBy', label: 'DivideBy', type: 'number', required: true }
    ],
    sampleData: [
      { Name: 'Box Packing', Calculate: 'nug', DivideBy: 20 },
      { Name: 'Loose', Calculate: 'weight', DivideBy: 1 }
    ],
    exportData: exportData,
    instructions: [
      'Name: Packing name (required)',
      'Calculate: Must be \'nug\' or \'weight\' (required)',
      'DivideBy: Positive number (required)'
    ],
    validateRow: (row: any) => {
      const packingName = row.Name || row.name || row.packingName
      const calculate = (row.Calculate || row.calculate || '').toLowerCase()
      const divideBy = parseFloat(row.DivideBy || row.divideBy || row.divide_by || '1')

      if (!packingName) {
        return { valid: false, error: 'Name is required' }
      }

      if (!['nug', 'weight'].includes(calculate)) {
        return { valid: false, error: 'Calculate must be "nug" or "weight"' }
      }

      if (isNaN(divideBy) || divideBy <= 0) {
        return { valid: false, error: 'DivideBy must be a number greater than 0' }
      }

      return { valid: true }
    },
    mapImportRow: (row: any) => ({
      packingName: (row.Name || row.name || row.packingName).trim(),
      calculate: (row.Calculate || row.calculate || '').toLowerCase() as 'nug' | 'weight',
      divideBy: parseFloat(row.DivideBy || row.divideBy || row.divide_by || '1')
    }),
    onImport: async (packings: any[]) => {
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      for (const packing of packings) {
        try {
          await window.api.packing.create({
            ...packing,
            companyId
          })
          successCount++
        } catch (error) {
          failCount++
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${packing.packingName}: ${errorMsg}`)
        }
      }

      if (successCount > 0) {
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
