import { useState, useEffect, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CrateTable } from '@/components/CrateTable'
import { CrateFormModal } from '@/components/CrateFormModal'
import { CrateImportExportModal } from '@/components/CrateImportExportModal'
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  Filter,
  ArrowLeft,
  Edit3,
  X,
  Save,
  Upload,
  Download
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
import type { CrateMarka } from '@/types/crate'

export function CrateManagement() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((state) => state.company)
  
  const [crates, setCrates] = useState<CrateMarka[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCrates, setSelectedCrates] = useState<string[]>([])
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false)
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('export')
  
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkEditMode, setIsBulkEditMode] = useState(false)
  const [bulkEditInfo, setBulkEditInfo] = useState({ modifiedCount: 0, isSaving: false })
  const [triggerSave, setTriggerSave] = useState(0)

  // Load crates on mount or company change
  useEffect(() => {
    if (activeCompany?.id) {
      loadCrates()
    }
  }, [activeCompany?.id])

  const loadCrates = async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await window.api.crate.listByCompany(activeCompany.id)
      if (response.success && response.data) {
        setCrates(response.data)
      } else {
        toast.error(response.message || 'Unable to load crate markas', {
          description: 'Please try refreshing the page'
        })
      }
    } catch (error) {
      console.error('Load crates error:', error)
      toast.error('An error occurred while loading crate markas', {
        description: 'Please check your connection and try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadCrates()
    toast.success('Crate markas refreshed', {
      description: 'Your data has been updated'
    })
  }

  const handleCreateCrate = () => {
    setIsCreateModalOpen(true)
  }

  const handleCrateCreated = async () => {
    setIsCreateModalOpen(false)
    await loadCrates()
    // Toast shown in modal
  }

  const handleCrateUpdated = async () => {
    await loadCrates()
    // Toast shown in modal or table
  }

  const handleBulkDelete = async () => {
    if (selectedCrates.length === 0) return
    
    try {
      const response = await window.api.crate.bulkDelete(selectedCrates)
      if (response.success) {
        toast.success(`Successfully deleted ${selectedCrates.length} crate marka${selectedCrates.length > 1 ? 's' : ''}`, {
          description: 'The selected items have been removed'
        })
        setSelectedCrates([])
        await loadCrates()
      } else {
        toast.error(response.message || 'Unable to delete selected crate markas', {
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

  const handleSelectionChange = (crateIds: string[]) => {
    setSelectedCrates(crateIds)
  }

  const handleBulkEditToggle = () => {
    if (isBulkEditMode) {
      // Exiting bulk edit mode
      setSelectedCrates([])
      setBulkEditInfo({ modifiedCount: 0, isSaving: false })
    }
    setIsBulkEditMode(!isBulkEditMode)
  }

  const handleBulkEditSave = async () => {
    setTriggerSave(prev => prev + 1)
  }

  const handleBulkEditCancel = useCallback(() => {
    setIsBulkEditMode(false)
    setSelectedCrates([])
    setBulkEditInfo({ modifiedCount: 0, isSaving: false })
  }, [])

  const handleImportExport = (mode: 'import' | 'export') => {
    setImportExportMode(mode)
    setIsImportExportModalOpen(true)
  }

  const filteredCrates = crates.filter((crate) => {
    const matchesSearch = 
      crate.crateMarkaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crate.printAs?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  if (!activeCompany) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">No Company Selected</h2>
          <p className="text-muted-foreground mb-4">
            Please select a company to manage crate markas
          </p>
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
            <h1 className="text-2xl font-bold">Crate Marka Management</h1>
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
              onClick={() => handleImportExport('import')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          )}
          
          {!isBulkEditMode && (
            <Button
              variant="outline-green"
              size="sm"
              onClick={() => handleImportExport('export')}
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
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Bulk Edit
            </Button>
          )}
          
          {!isBulkEditMode && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateCrate}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Crate Marka
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
                <Edit3 className="h-4 w-4 text-orange-600 " />
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
              placeholder="Search crate markas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}
        
        {!isBulkEditMode && selectedCrates.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCrates.length} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        )}

        {isBulkEditMode && (
          <div className="flex-1 flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search crate markas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            {selectedCrates.length > 0 && (
              <span className="text-sm font-medium text-orange-600">
                {selectedCrates.length} crate marka(s) selected for editing
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <CrateTable
          crates={filteredCrates}
          loading={loading}
          selectedCrates={selectedCrates}
          onSelectionChange={handleSelectionChange}
          onCrateUpdated={handleCrateUpdated}
          bulkEditMode={isBulkEditMode}
          onBulkEditChange={setBulkEditInfo}
          onBulkEditCancel={handleBulkEditCancel}
          triggerSave={triggerSave}
        />
      </div>

      {/* Modals */}
      <CrateFormModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCrateCreated}
        companyId={activeCompany?.id || ''}
      />

      <CrateImportExportModal
        open={isImportExportModalOpen}
        onOpenChange={setIsImportExportModalOpen}
        mode={importExportMode}
        companyId={activeCompany?.id || ''}
        onImportSuccess={loadCrates}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Crate Markas</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCrates.length} crate marka(s)? This action cannot be undone.
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
