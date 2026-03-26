import { useMemo, useState, useEffect } from 'react'
import { 
  CommonImportExportModal, 
  type ImportExportConfig 
} from '@/components/CommonImportExportModal'

interface ItemImportExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'import' | 'export'
  companyId: string
  onImportSuccess?: () => void
}

export function ItemImportExportModal({
  open,
  onOpenChange,
  mode,
  companyId,
  onImportSuccess
}: ItemImportExportModalProps) {
  const [exportData, setExportData] = useState<any[]>([])
  
  // Fetch export data when modal opens in export mode
  useEffect(() => {
    if (open && mode === 'export') {
      window.api.item.listByCompany(companyId).then(response => {
        if (response.success && response.data) {
          setExportData(response.data.map((item: any) => ({
            'Name': item.itemName,
            'Code': item.code || '',
            'Print As': item.printAs || '',
            'Commision': item.commission || 0,
            'Commision As Per': item.commissionAsPer || '',
            'Market Fees': item.marketFees || 0,
            'RDF': item.rdf || 0,
            'Bardana Per Nug': item.bardanaPerNug || 0,
            'Laga': item.laga || 0,
            'Wt Per Nug': item.wtPerNug || 0,
            'Kaat Per Nug': item.kaatPerNug || 0,
            'Maintain Crates In Sale & Purchase': item.maintainCratesInSalePurchase ? 'T' : 'F',
            'Disable Weight': item.disableWeight ? 'T' : 'F'
          })))
        }
      })
    }
  }, [open, mode, companyId])

  const config: ImportExportConfig = useMemo(() => ({
    entityName: 'item',
    entityNamePlural: 'items',
    templateFields: [
      { key: 'Name', label: 'Name', type: 'string', required: true },
      { key: 'Code', label: 'Code', type: 'string', required: false },
      { key: 'Print As', label: 'Print As', type: 'string', required: false },
      { key: 'Commision', label: 'Commision', type: 'number', required: false },
      { key: 'Commision As Per', label: 'Commision As Per', type: 'string', required: false },
      { key: 'Market Fees', label: 'Market Fees', type: 'number', required: false },
      { key: 'RDF', label: 'RDF', type: 'number', required: false },
      { key: 'Bardana Per Nug', label: 'Bardana Per Nug', type: 'number', required: false },
      { key: 'Laga', label: 'Laga', type: 'number', required: false },
      { key: 'Wt Per Nug', label: 'Wt Per Nug', type: 'number', required: false },
      { key: 'Kaat Per Nug', label: 'Kaat Per Nug', type: 'number', required: false },
      { key: 'Maintain Crates In Sale & Purchase', label: 'Maintain Crates In Sale & Purchase', type: 'boolean', required: false },
      { key: 'Disable Weight', label: 'Disable Weight', type: 'boolean', required: false }
    ],
    sampleData: [
      {
        'Name': 'Apple',
        'Code': 'A101',
        'Print As': 'Apple',
        'Commision': 7,
        'Commision As Per': 'Basic Amt (%)',
        'Market Fees': 2,
        'RDF': 2,
        'Bardana Per Nug': 1,
        'Laga': 2,
        'Wt Per Nug': 10,
        'Kaat Per Nug': 1,
        'Maintain Crates In Sale & Purchase': 'T',
        'Disable Weight': 'T'
      }
    ],
    exportData: exportData,
    instructions: [
      'Name: Item name (required)',
      'Boolean fields: Use "T" for True or "F" for False',
      'Numeric fields: Optional, default to 0'
    ],
    validateRow: (row: any) => {
      const itemName = row['Name']?.toString().trim()
      if (!itemName) {
        return { valid: false, error: 'Name is required' }
      }
      return { valid: true }
    },
    mapImportRow: (row: any) => ({
      itemName: String(row['Name']).trim(),
      code: row['Code']?.toString().trim() || null,
      printAs: row['Print As']?.toString().trim() || null,
      commission: parseFloat(row['Commision']) || 0,
      commissionAsPer: row['Commision As Per']?.toString().trim() || null,
      marketFees: parseFloat(row['Market Fees']) || 0,
      rdf: parseFloat(row['RDF']) || 0,
      bardanaPerNug: parseFloat(row['Bardana Per Nug']) || 0,
      laga: parseFloat(row['Laga']) || 0,
      wtPerNug: parseFloat(row['Wt Per Nug']) || 0,
      kaatPerNug: parseFloat(row['Kaat Per Nug']) || 0,
      maintainCratesInSalePurchase: row['Maintain Crates In Sale & Purchase']?.toString().toUpperCase() === 'T',
      disableWeight: row['Disable Weight']?.toString().toUpperCase() === 'T'
    }),
    onImport: async (items: any[]) => {
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      for (const itemData of items) {
        try {
          const response = await window.api.item.create(companyId, itemData)
          if (response.success) {
            successCount++
          } else {
            failCount++
            errors.push(`${itemData.itemName}: ${response.message}`)
          }
        } catch (error) {
          failCount++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${itemData.itemName}: ${errorMessage}`)
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
