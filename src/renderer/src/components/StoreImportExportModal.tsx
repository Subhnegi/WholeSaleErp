import { useMemo, useState, useEffect } from 'react'
import { CommonImportExportModal, ImportExportConfig } from './CommonImportExportModal'

interface StoreImportExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'import' | 'export'
  companyId: string
  onImportSuccess?: () => void
}

export function StoreImportExportModal({
  open,
  onOpenChange,
  mode,
  companyId,
  onImportSuccess
}: StoreImportExportModalProps) {
  const [exportData, setExportData] = useState<any[]>([])
  
  // Fetch export data when modal opens in export mode
  useEffect(() => {
    if (open && mode === 'export') {
      window.api.store.listByCompany(companyId).then(stores => {
        setExportData(stores.map((s: any) => ({
          'Store Name': s.name,
          'Contact No': s.contactNo || '',
          'Address 1': s.address || '',
          'Address 2': s.address2 || '',
          'Address 3': s.address3 || ''
        })))
      })
    }
  }, [open, mode, companyId])

  const config: ImportExportConfig = useMemo(() => ({
    entityName: 'store',
    entityNamePlural: 'stores',
    
    templateFields: [
      { key: 'Store Name', label: 'Store Name', type: 'string', required: true },
      { key: 'Contact No', label: 'Contact No', type: 'string', required: false },
      { key: 'Address 1', label: 'Address 1', type: 'string', required: false },
      { key: 'Address 2', label: 'Address 2', type: 'string', required: false },
      { key: 'Address 3', label: 'Address 3', type: 'string', required: false }
    ],
    
    sampleData: [
      { 'Store Name': 'Main Store', 'Contact No': '9876543210', 'Address 1': '123 Main St', 'Address 2': 'Near Market', 'Address 3': 'City Center' },
      { 'Store Name': 'Warehouse', 'Contact No': '9876543211', 'Address 1': 'Industrial Area', 'Address 2': '', 'Address 3': '' },
      { 'Store Name': 'Branch Store', 'Contact No': '', 'Address 1': '456 Second St', 'Address 2': '', 'Address 3': '' }
    ],
    
    exportData: exportData,
    
    instructions: [
      'Store Name: Name of the store (required)',
      'Contact No: Contact number (optional)',
      'Address 1-3: Address lines (optional)'
    ],
    
    validateRow: (row: any) => {
      const storeName = row['Store Name'] || row['store name'] || row.storeName || row.name
      
      if (!storeName || storeName.toString().trim() === '') {
        return { valid: false, error: 'Store Name is required' }
      }
      
      return { valid: true }
    },
    
    mapImportRow: (row: any) => ({
      name: (row['Store Name'] || row['store name'] || row.storeName || row.name).toString().trim(),
      contactNo: (row['Contact No'] || row['contact no'] || row.contactNo || '').toString().trim() || null,
      address: (row['Address 1'] || row['address 1'] || row.address || '').toString().trim() || null,
      address2: (row['Address 2'] || row['address 2'] || row.address2 || '').toString().trim() || null,
      address3: (row['Address 3'] || row['address 3'] || row.address3 || '').toString().trim() || null
    }),
    
    onImport: async (stores: any[]) => {
      let successCount = 0
      let failCount = 0
      const errors: string[] = []
      
      for (let i = 0; i < stores.length; i++) {
        const storeData = stores[i]
        try {
          await window.api.store.create({
            name: storeData.name,
            companyId,
            contactNo: storeData.contactNo,
            address: storeData.address,
            address2: storeData.address2,
            address3: storeData.address3
          })
          successCount++
        } catch (error) {
          failCount++
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      if (successCount > 0 && onImportSuccess) {
        onImportSuccess()
      }
      
      return { success: successCount > 0, successCount, failCount, errors }
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
