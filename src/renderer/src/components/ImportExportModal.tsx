import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createAccount } from '@/store/slices/accountSlice'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { toast } from 'sonner'
import type { ExportFormat } from '@/types/account'

interface ImportExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'import' | 'export'
}

export function ImportExportModal({ 
  open, 
  onOpenChange, 
  mode
}: ImportExportModalProps) {
  const dispatch = useAppDispatch()
  const { accounts, accountGroups } = useAppSelector((state) => state.account)
  const { activeCompany } = useAppSelector((state) => state.company)
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    
    try {
      // Convert accounts to the mandi.csv format
      const exportData = accounts.map(account => ({
        'AccountName': account.accountName,
        'AccountsGroupName': account.accountGroup?.name || '',
        'OPBal': account.openingBalance || 0,
        'DC': account.drCr === 'Dr' ? 'D' : 'C',
        'Area': account.area || '',
        'Sr. No.': account.srNo || '',
        'Address': account.address || '',
        'Address 2': account.address2 || '',
        'City': account.city || '',
        'State': account.state || '',
        'Mobile 1': account.mobile1 || '',
        'Mobile 2': account.mobile2 || '',
        'Print Name': account.nameLang || '',
        'Credit Limit': account.crLimit || 0,
        'Ledger Folio No.': account.ledgerFolioNo || '',
        'Bank Name 1': account.bankName1 || '',
        'Account No. 1': account.accountNo1 || '',
        'Bank Name 2': account.bankName2 || '',
        'Account No. 2': account.accountNo2 || '',
        'Contact Person': account.contactPerson || '',
        'Bill By Bill (Y/N)': account.maintainBillByBillBalance ? 'Y' : 'N'
      }))

      let blob: Blob
      let filename: string

      switch (format) {
        case 'csv':
          const csv = convertToCSV(exportData)
          blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          filename = `accounts_${Date.now()}.csv`
          break
        case 'excel':
          const wb = XLSX.utils.book_new()
          const ws = XLSX.utils.json_to_sheet(exportData)
          XLSX.utils.book_append_sheet(wb, ws, 'Accounts')
          const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
          blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
          filename = `accounts_${Date.now()}.xlsx`
          break
        default:
          throw new Error('Unsupported format')
      }

      // Create and download file
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Exported ${accounts.length} accounts successfully`)
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to export accounts')
      console.error(error)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    if (!activeCompany) {
      toast.error('No active company selected')
      return
    }

    setImporting(true)
    
    // Create file input
    const input = document.createElement('input')
    input.type = 'file'
    
    // Handle cancel/abort
    const handleCancel = () => {
      setImporting(false)
      input.remove()
    }
    
    input.oncancel = handleCancel
    input.addEventListener('cancel', handleCancel)
    
    switch (format) {
      case 'csv':
        input.accept = '.csv'
        break
      case 'excel':
        input.accept = '.xlsx,.xls'
        break
    }
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        setImporting(false)
        input.remove()
        return
      }

      try {
        let importedData: any[] = []
        
        if (format === 'csv') {
          const text = await file.text()
          importedData = parseCSV(text)
        } else if (format === 'excel') {
          const buffer = await file.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          importedData = XLSX.utils.sheet_to_json(worksheet)
        }

        // Trim all string values in imported data
        importedData = importedData.map(row => {
          const trimmedRow: any = {}
          for (const key in row) {
            const value = row[key]
            trimmedRow[key] = typeof value === 'string' ? value.trim() : value
          }
          return trimmedRow
        })

        // Process and import accounts
        let successCount = 0
        let errorCount = 0

        for (const row of importedData) {
          try {
            // Find account group by name
            const groupName = row['AccountsGroupName'] || row.AccountsGroupName
            const accountGroup = accountGroups.find(g => g.name === groupName)
            
            if (!accountGroup) {
              console.warn(`Account group not found: ${groupName}`)
              errorCount++
              continue
            }

            // Convert DC to Dr/Cr
            const dc = (row['DC'] || row.DC || 'D').toUpperCase()
            const drCr = dc === 'D' ? 'Dr' : 'Cr'

            // Convert Bill By Bill to boolean
            const billByBill = row['Bill By Bill (Y/N)'] || row['Bill By Bill'] || ''
            const maintainBillByBillBalance = billByBill.toUpperCase() === 'Y'

            const accountData = {
              accountName: row['AccountName'] || row.AccountName,
              code: '', // Will be generated if needed
              accountGroupId: accountGroup.id,
              openingBalance: parseFloat(row['OPBal'] || row.OPBal || '0'),
              drCr,
              area: row['Area'] || row.Area || '',
              srNo: row['Sr. No.'] || row['Sr. No'] || row.SrNo || '',
              crLimit: parseFloat(row['Credit Limit'] || row.CreditLimit || '0'),
              nameLang: row['Print Name'] || row.PrintName || row.nameLang || '',
              address: row['Address'] || row.address || '',
              address2: row['Address 2'] || row['Address2'] || row.address2 || '',
              city: row['City'] || row.city || '',
              state: row['State'] || row.state || '',
              panNo: '',
              mobile1: row['Mobile 1'] || row['Mobile1'] || row.mobile1 || '',
              mobile2: row['Mobile 2'] || row['Mobile2'] || row.mobile2 || '',
              bankName1: row['Bank Name 1'] || row['BankName1'] || row.bankName1 || '',
              accountNo1: row['Account No. 1'] || row['AccountNo1'] || row.accountNo1 || '',
              bankName2: row['Bank Name 2'] || row['BankName2'] || row.bankName2 || '',
              accountNo2: row['Account No. 2'] || row['AccountNo2'] || row.accountNo2 || '',
              contactPerson: row['Contact Person'] || row.ContactPerson || row.contactPerson || '',
              ledgerFolioNo: row['Ledger Folio No.'] || row['LedgerFolioNo'] || row.ledgerFolioNo || '',
              auditUpto: '',
              maintainBillByBillBalance,
              photo: '',
              companyId: activeCompany.id
            }

            const result = await dispatch(createAccount(accountData))
            if (createAccount.fulfilled.match(result)) {
              successCount++
            } else {
              errorCount++
            }
          } catch (err) {
            console.error('Error importing account:', err)
            errorCount++
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} accounts${errorCount > 0 ? `, ${errorCount} failed` : ''}`)
        } else {
          toast.error(`Failed to import accounts. ${errorCount} errors occurred.`)
        }
        
        onOpenChange(false)
      } catch (error) {
        toast.error('Failed to import accounts. Please check the file format.')
        console.error(error)
      } finally {
        setImporting(false)
        input.remove()
      }
    }
    
    // Cleanup on component unmount or when dialog closes
    setTimeout(() => {
      if (!input.files || input.files.length === 0) {
        setImporting(false)
        input.remove()
      }
    }, 100)
    
    input.click()
  }

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header] ?? ''
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
    
    return [headers.join(','), ...rows].join('\n')
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []
    
    const headers = lines[0].split(',').map(h => h.trim())
    
    return lines.slice(1).map(line => {
      const values: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())
      
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header] = values[index] || ''
      })
      return obj
    })
  }

  const formatIcons = {
    csv: <FileText className="h-8 w-8" />,
    excel: <FileSpreadsheet className="h-8 w-8" />
  }

  const downloadAccountTemplate = () => {
    // Create a template CSV with sample data
    const templateData = [
      {
        'AccountName': 'Sample Account',
        'AccountsGroupName': 'Sundry Debtors',
        'OPBal': '0',
        'DC': 'D',
        'Area': 'Area 1',
        'Sr. No.': '1',
        'Address': '123 Main Street',
        'Address 2': 'Suite 100',
        'City': 'City Name',
        'State': 'State Name',
        'Mobile 1': '9876543210',
        'Mobile 2': '',
        'Print Name': 'Sample Account Hindi',
        'Credit Limit': '50000',
        'Ledger Folio No.': '',
        'Bank Name 1': 'Bank Name',
        'Account No. 1': '1234567890',
        'Bank Name 2': '',
        'Account No. 2': '',
        'Contact Person': 'John Doe',
        'Bill By Bill (Y/N)': 'N'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts')
    
    const csv = XLSX.utils.sheet_to_csv(worksheet)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'accounts-template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Account template downloaded')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'import' ? (
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Accounts
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Accounts
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'import'
              ? 'Import accounts from a file'
              : `Export ${accounts.length} accounts to a file`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="format">File Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV (Comma Separated Values)
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (XLSX)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg">
            {formatIcons[format]}
          </div>

          {mode === 'export' && (
            <div className="text-sm text-muted-foreground">
              <p>The export will include:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Basic account information</li>
                <li>Address and contact details</li>
                <li>Bank details</li>
                <li>Tax information</li>
                <li>Credit/Debit limits</li>
              </ul>
            </div>
          )}

          {mode === 'import' && (
            <div className="text-sm text-muted-foreground">
              <p>Import requirements:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>File must match the selected format</li>
                <li>Account names must be unique</li>
                <li>Account groups must exist</li>
                <li>All required fields must be present</li>
              </ul>
              
              <div className="mt-4">
                <Label>Download Template</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadAccountTemplate}
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Account Template
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={mode === 'import' ? handleImport : handleExport}
            disabled={importing || exporting}
          >
            {mode === 'import' ? (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {importing ? 'Importing...' : 'Select File'}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
