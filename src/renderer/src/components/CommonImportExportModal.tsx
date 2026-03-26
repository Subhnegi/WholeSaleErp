import { useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Upload, FileText, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

type ExportFormat = 'csv' | 'excel' | 'json'

export interface TemplateField {
  key: string
  label: string
  type?: 'string' | 'number' | 'boolean'
  required?: boolean
  defaultValue?: any
}

export interface ImportExportConfig<T = any> {
  entityName: string // e.g., "packing", "arrival type"
  entityNamePlural: string // e.g., "packings", "arrival types"
  templateFields: TemplateField[]
  sampleData: any[] // Sample rows for template
  exportData?: T[] // Data to export (for export mode)
  onImport: (data: T[]) => Promise<{ success: boolean; successCount: number; failCount: number; errors?: string[] }>
  validateRow?: (row: any) => { valid: boolean; error?: string }
  mapImportRow?: (row: any) => T
  mapExportRow?: (item: T) => any
  instructions?: string[]
}

interface CommonImportExportModalProps<T = any> {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'import' | 'export'
  config: ImportExportConfig<T>
}

export function CommonImportExportModal<T = any>({ 
  open, 
  onOpenChange, 
  mode,
  config
}: CommonImportExportModalProps<T>) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState<ExportFormat>('csv')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const downloadTemplate = (format: ExportFormat) => {
    try {
      const templateData = config.sampleData

      if (format === 'json') {
        const json = JSON.stringify(templateData, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${config.entityName}_template.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, config.entityNamePlural)

        if (format === 'csv') {
          XLSX.writeFile(wb, `${config.entityName}_template.csv`)
        } else {
          XLSX.writeFile(wb, `${config.entityName}_template.xlsx`)
        }
      }

      toast.success('Template downloaded', {
        description: `Downloaded ${format.toUpperCase()} template with sample data`
      })
    } catch (error) {
      console.error('Download template error:', error)
      toast.error('Failed to download template', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const parseImportFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target?.result
          let parsedData: any[] = []

          if (file.name.endsWith('.json')) {
            parsedData = JSON.parse(data as string)
          } else {
            const workbook = XLSX.read(data, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            parsedData = XLSX.utils.sheet_to_json(worksheet)
          }

          resolve(parsedData)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))

      if (file.name.endsWith('.json')) {
        reader.readAsText(file)
      } else {
        reader.readAsBinaryString(file)
      }
    })
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('No file selected', {
        description: 'Please select a file to import'
      })
      return
    }

    setImporting(true)

    try {
      const rawData = await parseImportFile(selectedFile)

      if (!Array.isArray(rawData) || rawData.length === 0) {
        throw new Error('No data found in file')
      }

      // Map and validate rows
      const mappedData: T[] = []
      const errors: string[] = []

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i]
        
        // Custom validation if provided
        if (config.validateRow) {
          const validation = config.validateRow(row)
          if (!validation.valid) {
            errors.push(`Row ${i + 1}: ${validation.error}`)
            continue
          }
        }

        // Map row if custom mapper provided
        try {
          const mappedRow = config.mapImportRow ? config.mapImportRow(row) : row
          mappedData.push(mappedRow)
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`)
        }
      }

      if (mappedData.length === 0) {
        throw new Error('No valid data to import. Please check your file format.')
      }

      // Call the import function
      const result = await config.onImport(mappedData)

      if (result.success) {
        toast.success(`Import completed`, {
          description: `Successfully imported ${result.successCount} ${config.entityName}${result.successCount > 1 ? 's' : ''}${result.failCount > 0 ? `. ${result.failCount} failed.` : ''}`
        })

        if (result.errors && result.errors.length > 0) {
          console.error('Import errors:', result.errors)
        }

        onOpenChange(false)
      } else {
        toast.error('Import failed', {
          description: 'Failed to import data. Please check the file and try again.'
        })
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setImporting(false)
      setSelectedFile(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)

    try {
      const exportData = config.exportData || []

      if (exportData.length === 0) {
        toast.error(`No ${config.entityNamePlural} to export`, {
          description: `Create some ${config.entityNamePlural} first before exporting`
        })
        return
      }

      // Map export data if custom mapper provided
      const mappedData = config.mapExportRow
        ? exportData.map(config.mapExportRow)
        : exportData

      if (activeTab === 'json') {
        const json = JSON.stringify(mappedData, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${config.entityNamePlural}-export-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const ws = XLSX.utils.json_to_sheet(mappedData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, config.entityNamePlural)

        if (activeTab === 'csv') {
          XLSX.writeFile(wb, `${config.entityNamePlural}-export-${new Date().toISOString().split('T')[0]}.csv`)
        } else {
          XLSX.writeFile(wb, `${config.entityNamePlural}-export-${new Date().toISOString().split('T')[0]}.xlsx`)
        }
      }

      toast.success(`Successfully exported ${exportData.length} ${config.entityName}${exportData.length > 1 ? 's' : ''}`, {
        description: `${activeTab.toUpperCase()} file has been downloaded`
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'import' ? 'Import' : 'Export'} {config.entityNamePlural}
          </DialogTitle>
          <DialogDescription>
            {mode === 'import' 
              ? `Import ${config.entityNamePlural} from CSV, Excel, or JSON file` 
              : `Export your ${config.entityNamePlural} to CSV, Excel, or JSON format`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExportFormat)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="csv">
              <FileText className="h-4 w-4 mr-2" />
              CSV
            </TabsTrigger>
            <TabsTrigger value="excel">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </TabsTrigger>
            <TabsTrigger value="json">
              <FileText className="h-4 w-4 mr-2" />
              JSON
            </TabsTrigger>
          </TabsList>

          {mode === 'import' ? (
            <>
              <TabsContent value="csv" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Step 1: Download Template (Optional)</Label>
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate('csv')}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>

                {config.instructions && config.instructions.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {config.instructions.map((instruction, i) => (
                          <li key={i} className="text-sm">{instruction}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Step 2: Select CSV File</Label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? 'Importing...' : 'Import CSV'}
                </Button>
              </TabsContent>

              <TabsContent value="excel" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Step 1: Download Template (Optional)</Label>
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate('excel')}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel Template
                  </Button>
                </div>

                {config.instructions && config.instructions.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {config.instructions.map((instruction, i) => (
                          <li key={i} className="text-sm">{instruction}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Step 2: Select Excel File</Label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? 'Importing...' : 'Import Excel'}
                </Button>
              </TabsContent>

              <TabsContent value="json" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Step 1: Download Template (Optional)</Label>
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate('json')}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON Template
                  </Button>
                </div>

                {config.instructions && config.instructions.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {config.instructions.map((instruction, i) => (
                          <li key={i} className="text-sm">{instruction}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Step 2: Select JSON File</Label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? 'Importing...' : 'Import JSON'}
                </Button>
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="csv" className="space-y-4 mt-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Export all {config.entityNamePlural} to CSV format. This file can be opened in Excel or any spreadsheet application.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting...' : 'Export as CSV'}
                </Button>
              </TabsContent>

              <TabsContent value="excel" className="space-y-4 mt-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Export all {config.entityNamePlural} to Excel (.xlsx) format with proper formatting.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting...' : 'Export as Excel'}
                </Button>
              </TabsContent>

              <TabsContent value="json" className="space-y-4 mt-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Export all {config.entityNamePlural} to JSON format. This is useful for programmatic access or backup purposes.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting...' : 'Export as JSON'}
                </Button>
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
