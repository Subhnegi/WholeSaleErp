import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PackingTable } from '@/components/PackingTable'
import { PackingFormModal } from '@/components/PackingFormModal'
import { PackingImportExportModal } from '@/components/PackingImportExportModal'
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
import type { Packing } from '@/types/packing'

export function PackingManagement() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((state) => state.company)

  const [packings, setPackings] = useState<Packing[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPackings, setSelectedPackings] = useState<string[]>([])

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [importExportModal, setImportExportModal] = useState({
    open: false,
    mode: 'export' as 'import' | 'export'
  })

  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkEditMode, setIsBulkEditMode] = useState(false)
  const [bulkEditInfo, setBulkEditInfo] = useState({ modifiedCount: 0, isSaving: false })
  const [triggerSave, setTriggerSave] = useState(0)

  useEffect(() => {
    if (activeCompany) {
      loadPackings()
    }
  }, [activeCompany])

  const loadPackings = async () => {
    if (!activeCompany?.id) return

    setLoading(true)
    try {
      const data = await window.api.packing.listByCompany(activeCompany.id)
      setPackings(data)
    } catch (error) {
      console.error('Load packings error:', error)
      toast.error('Unable to load packings', {
        description: 'Please try refreshing the page'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadPackings()
    toast.success('Packings refreshed', {
      description: 'Your data has been updated'
    })
  }

  const handleCreatePacking = () => {
    setIsCreateModalOpen(true)
  }

  const handlePackingCreated = async () => {
    setIsCreateModalOpen(false)
    await loadPackings()
  }

  const handlePackingUpdated = async () => {
    await loadPackings()
  }

  const handleBulkDelete = async () => {
    if (selectedPackings.length === 0) return

    try {
      await window.api.packing.bulkDelete(selectedPackings)
      toast.success(`Deleted ${selectedPackings.length} packing${selectedPackings.length > 1 ? 's' : ''}`)
      setSelectedPackings([])
      await loadPackings()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete packings', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    } finally {
      setShowBulkDeleteConfirm(false)
    }
  }

  const handleSelectionChange = (packingIds: string[]) => {
    setSelectedPackings(packingIds)
  }

  const handleBulkEditToggle = () => {
    if (isBulkEditMode) {
      // Exiting bulk edit mode
      setSelectedPackings([])
      setBulkEditInfo({ modifiedCount: 0, isSaving: false })
    }
    setIsBulkEditMode(!isBulkEditMode)
  }

  const handleBulkEditSave = async () => {
    setTriggerSave(prev => prev + 1)
  }

  const handleBulkEditCancel = useCallback(() => {
    setIsBulkEditMode(false)
    setSelectedPackings([])
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
    await loadPackings()
  }

  const filteredPackings = packings.filter((packing) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      packing.packingName.toLowerCase().includes(query) ||
      packing.calculate.toLowerCase().includes(query)
    )
  })

  // Show loading or empty state if no company
  if (!activeCompany) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Packing Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage packings for your company
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">No Company Selected</p>
            <p className="text-sm text-muted-foreground">
              Please select a company to manage packings
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
            <h1 className="text-2xl font-bold">Packing Management</h1>
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
              disabled={packings.length === 0}
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
              disabled={packings.length === 0}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Bulk Edit
            </Button>
          )}

          {!isBulkEditMode && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCreatePacking}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Packing
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
                {bulkEditInfo.isSaving ? 'Saving...' : 'Save All Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 border-b">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <Input
            placeholder="Search by name or calculate type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        {!isBulkEditMode && selectedPackings.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedPackings.length})
          </Button>
        )}
        <div className="text-sm text-muted-foreground">
          {filteredPackings.length} {filteredPackings.length === 1 ? 'packing' : 'packings'}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <PackingTable
          packings={filteredPackings}
          loading={loading}
          selectedPackings={selectedPackings}
          onSelectionChange={handleSelectionChange}
          onPackingUpdated={handlePackingUpdated}
          isBulkEditMode={isBulkEditMode}
          triggerSave={triggerSave}
          onBulkEditStateChange={handleBulkEditStateChange}
          onBulkEditCancel={handleBulkEditCancel}
        />
      </div>

      {/* Create Modal */}
      <PackingFormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handlePackingCreated}
        companyId={activeCompany.id}
      />

      {/* Import/Export Modal */}
      <PackingImportExportModal
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
            <AlertDialogTitle>Delete Packings</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPackings.length} packing
              {selectedPackings.length > 1 ? 's' : ''}? This action cannot be undone.
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
