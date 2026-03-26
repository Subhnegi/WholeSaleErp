import { useState, useEffect, useCallback } from 'react'
import { useAppSelector } from '@/store/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ItemTable } from '@/components/ItemTable'
import { ItemFormModal } from '@/components/ItemFormModal'
import { ItemImportExportModal } from '@/components/ItemImportExportModal'
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  Upload, 
  Download,
  Filter,
  ArrowLeft,
  Edit3,
  X,
  Save
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
import type { Item } from '@/types/item'

export function ItemManagement() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((state) => state.company)
  
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false)
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('export')
  
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkEditMode, setIsBulkEditMode] = useState(false)
  const [bulkEditInfo, setBulkEditInfo] = useState({ modifiedCount: 0, isSaving: false })
  const [triggerSave, setTriggerSave] = useState(0)

  // Load items on mount or company change
  useEffect(() => {
    if (activeCompany?.id) {
      loadItems()
    }
  }, [activeCompany?.id])

  const loadItems = async () => {
    if (!activeCompany?.id) return
    
    setLoading(true)
    try {
      const response = await window.api.item.listByCompany(activeCompany.id)
      if (response.success && response.data) {
        setItems(response.data)
      } else {
        toast.error(response.message || 'Failed to load items')
      }
    } catch (error) {
      console.error('Load items error:', error)
      toast.error('Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await loadItems()
    toast.success('Items refreshed successfully')
  }

  const handleCreateItem = () => {
    setIsCreateModalOpen(true)
  }

  const handleItemCreated = async () => {
    setIsCreateModalOpen(false)
    await loadItems()
    // Toast shown in modal
  }

  const handleItemUpdated = async () => {
    await loadItems()
    // Toast shown in modal or table
  }

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return
    
    try {
      const response = await window.api.item.bulkDelete(selectedItems)
      if (response.success) {
        toast.success(`${selectedItems.length} item(s) deleted successfully`)
        setSelectedItems([])
        await loadItems()
      } else {
        toast.error(response.message || 'Failed to delete items')
      }
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete items')
    } finally {
      setShowBulkDeleteConfirm(false)
    }
  }

  const handleSelectionChange = (itemIds: string[]) => {
    setSelectedItems(itemIds)
  }

  const handleImportExport = (mode: 'import' | 'export') => {
    setImportExportMode(mode)
    setIsImportExportModalOpen(true)
  }

  const handleBulkEditToggle = () => {
    if (isBulkEditMode) {
      // Exiting bulk edit mode
      setSelectedItems([])
      setBulkEditInfo({ modifiedCount: 0, isSaving: false })
    }
    setIsBulkEditMode(!isBulkEditMode)
  }

  const handleBulkEditSave = async () => {
    setTriggerSave(prev => prev + 1)
  }

  const handleBulkEditCancel = useCallback(() => {
    setIsBulkEditMode(false)
    setSelectedItems([])
    setBulkEditInfo({ modifiedCount: 0, isSaving: false })
  }, [])

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  if (!activeCompany) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">No Company Selected</h2>
          <p className="text-muted-foreground mb-4">
            Please select a company to manage items
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
            <h1 className="text-2xl font-bold">Item Management</h1>
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
              variant="default"
              size="sm"
              onClick={handleCreateItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Item
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
                <span className="font-medium text-orange-900 ">
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
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>
        )}
        
        {!isBulkEditMode && selectedItems.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedItems.length} selected
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
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            {selectedItems.length > 0 && (
              <span className="text-sm font-medium text-orange-600">
                {selectedItems.length} item(s) selected for editing
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <ItemTable
          items={filteredItems}
          loading={loading}
          selectedItems={selectedItems}
          onSelectionChange={handleSelectionChange}
          onItemUpdated={handleItemUpdated}
          bulkEditMode={isBulkEditMode}
          onBulkEditChange={setBulkEditInfo}
          onBulkEditCancel={handleBulkEditCancel}
          triggerSave={triggerSave}
        />
      </div>

      {/* Modals */}
      <ItemFormModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleItemCreated}
        companyId={activeCompany?.id || ''}
      />

      <ItemImportExportModal
        open={isImportExportModalOpen}
        onOpenChange={setIsImportExportModalOpen}
        mode={importExportMode}
        companyId={activeCompany?.id || ''}
        onImportSuccess={handleItemCreated}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItems.length} item(s)? This action cannot be undone.
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
