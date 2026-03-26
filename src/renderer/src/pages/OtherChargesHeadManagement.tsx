import { useState, useEffect, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OtherChargesHeadTable } from '@/components/OtherChargesHeadTable'
import { OtherChargesHeadFormModal } from '@/components/OtherChargesHeadFormModal'
import { OtherChargesHeadImportExportModal } from '@/components/OtherChargesHeadImportExportModal'
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
import type { OtherChargesHead } from '@/types/otherChargesHead'

interface Account {
  id: string
  accountName: string
}

export function OtherChargesHeadManagement() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((state) => state.company)
  
  const [chargesHeads, setChargesHeads] = useState<OtherChargesHead[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChargesHeads, setSelectedChargesHeads] = useState<string[]>([])
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [importExportModal, setImportExportModal] = useState<{ open: boolean; mode: 'import' | 'export' }>({
    open: false,
    mode: 'export'
  })
  
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkEditMode, setIsBulkEditMode] = useState(false)
  const [bulkEditInfo, setBulkEditInfo] = useState({ modifiedCount: 0, isSaving: false })
  const [triggerSave, setTriggerSave] = useState(0)

  // Load charges heads on mount or company change
  useEffect(() => {
    if (activeCompany?.id) {
      loadChargesHeads()
      loadAccounts()
    }
  }, [activeCompany?.id])

  const loadChargesHeads = async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await window.api.otherChargesHead.listByCompany(activeCompany.id)
      if (response.success && response.data) {
        setChargesHeads(response.data)
      } else {
        toast.error(response.error || 'Unable to load other charges heads', {
          description: 'Please try refreshing the page'
        })
      }
    } catch (error) {
      console.error('Load charges heads error:', error)
      toast.error('An error occurred while loading other charges heads', {
        description: 'Please check your connection and try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    if (!activeCompany?.id) return
    try {
      const response = await window.api.account.listByCompany(activeCompany.id)
      if (response.success && response.data) {
        setAccounts(response.data)
      }
    } catch (error) {
      console.error('Load accounts error:', error)
    }
  }

  const handleRefresh = async () => {
    await loadChargesHeads()
    toast.success('Other charges heads refreshed', {
      description: 'Your data has been updated'
    })
  }

  const handleCreateChargesHead = () => {
    setIsCreateModalOpen(true)
  }

  const handleChargesHeadCreated = async () => {
    setIsCreateModalOpen(false)
    await loadChargesHeads()
  }

  const handleChargesHeadUpdated = async () => {
    await loadChargesHeads()
  }

  const handleBulkDelete = async () => {
    if (selectedChargesHeads.length === 0) return
    
    try {
      const response = await window.api.otherChargesHead.bulkDelete(selectedChargesHeads)
      if (response.success) {
        toast.success(`Successfully deleted ${selectedChargesHeads.length} other charges head${selectedChargesHeads.length > 1 ? 's' : ''}`, {
          description: 'The selected items have been removed'
        })
        setSelectedChargesHeads([])
        await loadChargesHeads()
      } else {
        toast.error(response.error || 'Unable to delete selected other charges heads', {
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

  const handleSelectionChange = (chargesHeadIds: string[]) => {
    setSelectedChargesHeads(chargesHeadIds)
  }

  const handleBulkEditToggle = () => {
    if (isBulkEditMode) {
      // Exiting bulk edit mode
      setSelectedChargesHeads([])
      setBulkEditInfo({ modifiedCount: 0, isSaving: false })
    }
    setIsBulkEditMode(!isBulkEditMode)
  }

  const handleBulkEditSave = async () => {
    setTriggerSave(prev => prev + 1)
  }

  const handleBulkEditCancel = useCallback(() => {
    setIsBulkEditMode(false)
    setSelectedChargesHeads([])
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
    await loadChargesHeads()
  }

  const filteredChargesHeads = chargesHeads.filter((chargesHead) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      chargesHead.headingName.toLowerCase().includes(query) ||
      chargesHead.printAs?.toLowerCase().includes(query) ||
      chargesHead.chargeType.toLowerCase().includes(query) ||
      chargesHead.feedAs.toLowerCase().includes(query)
    )
  })

  // Show loading or empty state if no company
  if (!activeCompany) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Other Charges Head Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage other charges heads for your company
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">No Company Selected</p>
            <p className="text-sm text-muted-foreground">
              Please select a company to manage other charges heads
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
            <h1 className="text-2xl font-bold">Other Charges Head Management</h1>
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
              disabled={chargesHeads.length === 0}
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
              disabled={chargesHeads.length === 0}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Bulk Edit
            </Button>
          )}
          
          {!isBulkEditMode && (
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateChargesHead}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Other Charges Head
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
              placeholder="Search by heading, type or feed as..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}

        {!isBulkEditMode && selectedChargesHeads.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedChargesHeads.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        <OtherChargesHeadTable
          chargesHeads={filteredChargesHeads}
          accounts={accounts}
          loading={loading}
          selectedChargesHeads={selectedChargesHeads}
          onSelectionChange={handleSelectionChange}
          onChargesHeadUpdated={handleChargesHeadUpdated}
          isBulkEditMode={isBulkEditMode}
          triggerSave={triggerSave}
          onBulkEditStateChange={handleBulkEditStateChange}
          onBulkEditCancel={handleBulkEditCancel}
        />
      </div>

      {/* Create Modal */}
      <OtherChargesHeadFormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleChargesHeadCreated}
        companyId={activeCompany.id}
      />

      {/* Import/Export Modal */}
      <OtherChargesHeadImportExportModal
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
            <AlertDialogTitle>Delete Other Charges Heads</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedChargesHeads.length} other charges head
              {selectedChargesHeads.length > 1 ? 's' : ''}? This action cannot be undone.
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
