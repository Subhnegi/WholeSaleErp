import { useState, useEffect, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrivalTypeTable } from '@/components/ArrivalTypeTable'
import { ArrivalTypeFormModal } from '@/components/ArrivalTypeFormModal'
import { ArrivalTypeImportExportModal } from '@/components/ArrivalTypeImportExportModal'
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  ArrowLeft,
  Edit3,
  X,
  Save,
  Download,
  Upload,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useNavigate } from 'react-router-dom'
import type { ArrivalType } from '@/types/arrivalType'

export function ArrivalTypeManagement() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((state) => state.company)
  
  const [arrivalTypes, setArrivalTypes] = useState<ArrivalType[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArrivalTypes, setSelectedArrivalTypes] = useState<string[]>([])
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [importExportModal, setImportExportModal] = useState<{ open: boolean; mode: 'import' | 'export' }>({
    open: false,
    mode: 'export'
  })
  
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkEditMode, setIsBulkEditMode] = useState(false)
  const [bulkEditInfo, setBulkEditInfo] = useState({ modifiedCount: 0, isSaving: false })
  const [triggerSave, setTriggerSave] = useState(0)

  // Load arrival types on mount or company change
  useEffect(() => {
    if (activeCompany?.id) {
      loadArrivalTypes()
    }
  }, [activeCompany?.id])

  const loadArrivalTypes = async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await window.api.arrivalType.listByCompany(activeCompany.id)
      if (response.success && response.data) {
        setArrivalTypes(response.data)
      } else {
        toast.error(response.error || 'Unable to load arrival types', {
          description: 'Please try refreshing the page'
        })
      }
    } catch (error) {
      console.error('Load arrival types error:', error)
      toast.error('An error occurred while loading arrival types', {
        description: 'Please check your connection and try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadArrivalTypes()
    toast.success('Arrival types refreshed', {
      description: 'Your data has been updated'
    })
  }

  const handleCreateArrivalType = () => {
    setIsCreateModalOpen(true)
  }

  const handleArrivalTypeCreated = async () => {
    setIsCreateModalOpen(false)
    await loadArrivalTypes()
  }

  const handleArrivalTypeUpdated = async () => {
    await loadArrivalTypes()
  }

  const handleBulkDelete = async () => {
    if (selectedArrivalTypes.length === 0) return
    
    try {
      const response = await window.api.arrivalType.bulkDelete(selectedArrivalTypes)
      if (response.success) {
        toast.success(`Successfully deleted ${selectedArrivalTypes.length} arrival type${selectedArrivalTypes.length > 1 ? 's' : ''}`, {
          description: 'The selected items have been removed'
        })
        setSelectedArrivalTypes([])
        await loadArrivalTypes()
      } else {
        toast.error(response.error || 'Unable to delete selected arrival types', {
          description: 'Please try again or contact support'
        })
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('An error occurred while deleting', {
        description: 'Please try again later'
      })
    } finally {
      setShowBulkDeleteConfirm(false)
    }
  }

  const handleSelectionChange = (arrivalTypeIds: string[]) => {
    setSelectedArrivalTypes(arrivalTypeIds)
  }

  const handleBulkEditToggle = () => {
    if (isBulkEditMode) {
      // Exiting bulk edit mode
      setSelectedArrivalTypes([])
      setBulkEditInfo({ modifiedCount: 0, isSaving: false })
    }
    setIsBulkEditMode(!isBulkEditMode)
  }

  const handleBulkEditSave = async () => {
    setTriggerSave(prev => prev + 1)
  }

  const handleBulkEditCancel = useCallback(() => {
    setIsBulkEditMode(false)
    setSelectedArrivalTypes([])
    setBulkEditInfo({ modifiedCount: 0, isSaving: false })
  }, [])

  const handleBulkEditStateChange = useCallback((modifiedCount: number, isSaving: boolean) => {
    setBulkEditInfo({ modifiedCount, isSaving })
  }, [])

  const handleOpenImport = () => {
    setImportExportModal({ open: true, mode: 'import' })
  }

  const handleOpenExport = () => {
    setImportExportModal({ open: true, mode: 'export' })
  }

  const handleImportSuccess = async () => {
    await loadArrivalTypes()
  }

  const filteredArrivalTypes = arrivalTypes.filter((arrivalType) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      arrivalType.name.toLowerCase().includes(query) ||
      arrivalType.purchaseType.toLowerCase().includes(query)
    )
  })

  // Show loading or empty state if no company
  if (!activeCompany) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Arrival Type Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage arrival types for your company
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">No Company Selected</p>
            <p className="text-sm text-muted-foreground">
              Please select a company to manage arrival types
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Arrival Type Management</h1>
            {activeCompany && (
              <p className="text-sm text-muted-foreground">
                {activeCompany.companyName}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isBulkEditMode && (
            <Button
              variant="outline-green"
              size="sm"
              onClick={handleOpenImport}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          )}
          
          {!isBulkEditMode && (
            <Button
              variant="outline-green"
              size="sm"
              onClick={handleOpenExport}
              disabled={arrivalTypes.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          
          {!isBulkEditMode && (
            <Button
              variant="cta"
              size="sm"
              onClick={handleBulkEditToggle}
              disabled={arrivalTypes.length === 0}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Bulk Edit
            </Button>
          )}
          
          {!isBulkEditMode && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateArrivalType}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Arrival Type
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Bulk Edit Banner */}
      {isBulkEditMode && (
        <div className=" bg-orange-50 rounded-md border border-orange-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4  text-orange-600 " />
                <span className="font-medium text-orange-900">
                  Bulk Edit Mode Active
                </span>
              </div>
              {bulkEditInfo.modifiedCount > 0 && (
                <span className="text-sm text-orange-800 dark:text-orange-300">
                  ({bulkEditInfo.modifiedCount} modified)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline-red"
                size="sm"
                onClick={handleBulkEditCancel}
                disabled={bulkEditInfo.isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={handleBulkEditSave}
                disabled={bulkEditInfo.modifiedCount === 0 || bulkEditInfo.isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {bulkEditInfo.isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
        {!isBulkEditMode && (
          <div className="flex-1 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search arrival types by name or purchase type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}

        {!isBulkEditMode && selectedArrivalTypes.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedArrivalTypes.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <ArrivalTypeTable
          arrivalTypes={filteredArrivalTypes}
          loading={loading}
          selectedArrivalTypes={selectedArrivalTypes}
          onSelectionChange={handleSelectionChange}
          onArrivalTypeUpdated={handleArrivalTypeUpdated}
          isBulkEditMode={isBulkEditMode}
          triggerSave={triggerSave}
          onBulkEditStateChange={handleBulkEditStateChange}
          onBulkEditCancel={handleBulkEditCancel}
        />
      </div>

      {/* Create Modal */}
      <ArrivalTypeFormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleArrivalTypeCreated}
        companyId={activeCompany.id}
      />

      {/* Import/Export Modal */}
      <ArrivalTypeImportExportModal
        open={importExportModal.open}
        onOpenChange={(open) => setImportExportModal({ ...importExportModal, open })}
        mode={importExportModal.mode}
        companyId={activeCompany.id}
        onImportSuccess={handleImportSuccess}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Arrival Types</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedArrivalTypes.length} arrival type
              {selectedArrivalTypes.length > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
