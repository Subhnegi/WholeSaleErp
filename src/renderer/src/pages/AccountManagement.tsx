import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { 
  loadAccounts, 
  loadAccountGroups,
  clearAccountSelection,
  bulkDeleteAccounts,
  bulkUpdateAccountGroup
} from '@/store/slices/accountSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccountTable } from '@/components/AccountTable'
import { AccountFormModal } from '@/components/AccountFormModal'
import { AccountGroupModal } from '@/components/AccountGroupModal'
import { ImportExportModal } from '@/components/ImportExportModal'
import {
  Plus,
  RefreshCw, 
  FolderTree, 
  Trash2, 
  Upload, 
  Download,
  Filter,
  Edit2,
  Save,
  X,
  ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useNavigate } from 'react-router-dom';
export function AccountManagement() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  const { loading, selectedAccounts, accountGroups } = useAppSelector((state) => state.account)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [accountGroupFilter, setAccountGroupFilter] = useState<string>('all')
  const [drCrFilter, setDrCrFilter] = useState<string>('all')
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false)
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('export')
  
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [showBulkGroupDialog, setShowBulkGroupDialog] = useState(false)
  const [selectedGroupForBulk, setSelectedGroupForBulk] = useState<string>('')
  
  // Bulk edit state
  const [isBulkEditMode, setIsBulkEditMode] = useState(false)
  const [bulkEditInfo, setBulkEditInfo] = useState({ modifiedCount: 0, isSaving: false })
  const [triggerSave, setTriggerSave] = useState(0)

  // Load data on mount or company change
  useEffect(() => {
    if (activeCompany?.id) {
      dispatch(loadAccounts(activeCompany.id))
      dispatch(loadAccountGroups(activeCompany.id))
    }
  }, [activeCompany?.id, dispatch])

  const handleRefresh = async () => {
    if (activeCompany?.id) {
      const [accountsResult, groupsResult] = await Promise.all([
        dispatch(loadAccounts(activeCompany.id)),
        dispatch(loadAccountGroups(activeCompany.id))
      ])
      
      if (loadAccounts.fulfilled.match(accountsResult) && 
          loadAccountGroups.fulfilled.match(groupsResult)) {
        toast.success('Data refreshed successfully')
      } else {
        toast.error('Failed to refresh data')
      }
    }
  }

  const handleAccountCreated = () => {
    setIsCreateModalOpen(false)
    if (activeCompany?.id) {
      dispatch(loadAccounts(activeCompany.id))
    }
  }

  const handleGroupManaged = () => {
    setIsGroupModalOpen(false)
    if (activeCompany?.id) {
      dispatch(loadAccountGroups(activeCompany.id))
      dispatch(loadAccounts(activeCompany.id)) // Refresh accounts to update group relations
    }
  }

  const handleBulkDelete = async () => {
    if (selectedAccounts.length === 0) return
    
    const result = await dispatch(bulkDeleteAccounts(selectedAccounts))
    if (bulkDeleteAccounts.fulfilled.match(result)) {
      toast.success(`${selectedAccounts.length} account(s) deleted successfully`)
      setShowBulkDeleteConfirm(false)
      dispatch(clearAccountSelection())
    } else {
      toast.error('Failed to delete accounts')
    }
  }

  const handleBulkGroupUpdate = async () => {
    if (selectedAccounts.length === 0 || !selectedGroupForBulk) return
    
    const result = await dispatch(bulkUpdateAccountGroup({ 
      ids: selectedAccounts, 
      accountGroupId: selectedGroupForBulk 
    }))
    
    if (bulkUpdateAccountGroup.fulfilled.match(result)) {
      toast.success(`${selectedAccounts.length} account(s) updated successfully`)
      setShowBulkGroupDialog(false)
      setSelectedGroupForBulk('')
      dispatch(clearAccountSelection())
    } else {
      toast.error('Failed to update accounts')
    }
  }

  const handleImport = () => {
    setImportExportMode('import')
    setIsImportExportModalOpen(true)
  }

  const handleExport = () => {
    setImportExportMode('export')
    setIsImportExportModalOpen(true)
  }

  const handleBulkEditToggle = () => {
    setIsBulkEditMode(!isBulkEditMode)
  }

  const handleBulkEditSave = async () => {
    setTriggerSave(prev => prev + 1)
  }

  const handleBulkEditCancel = () => {
    setIsBulkEditMode(false)
    setBulkEditInfo({ modifiedCount: 0, isSaving: false })
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setAccountGroupFilter('all')
    setDrCrFilter('all')
  }

  const hasSelection = selectedAccounts.length > 0

  if (!activeCompany) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Company Selected</h2>
          <p className="text-muted-foreground">
            Please select a company from the company management screen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header - Fixed */}
      <header className="shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Account Management</h1>
              <p className="text-sm text-muted-foreground">{activeCompany.companyName}</p>
            </div>
          </div>
          
          {/* Right side action buttons */}
          <div className="flex items-center gap-2">
            {/* Bulk Edit Button (when not in bulk edit mode) */}
            {!isBulkEditMode && (
              <Button
                variant="cta"
                size="sm"
                onClick={handleBulkEditToggle}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Bulk Edit
              </Button>
            )}

            {/* Import/Export */}
            {!isBulkEditMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline-green" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Import/Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleImport}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Manage Groups */}
            {!isBulkEditMode && (
              <Button
                variant="premium"
                size="sm"
                onClick={() => setIsGroupModalOpen(true)}
              >
                <FolderTree className="mr-2 h-4 w-4" />
                Manage Groups
              </Button>
            )}

            {/* Create Account */}
            {!isBulkEditMode && (
              <Button variant="default" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            )}

            {/* Refresh Button - Ghost variant, always visible */}
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
      </header>

      {/* Action Bar - For Bulk Edit Controls and Filters */}
      <div className="shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Bulk Edit Controls Bar (when active) */}
          {isBulkEditMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 rounded-md border border-orange-200 w-full">
              <Edit2 className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Bulk Edit Mode</span>
              {bulkEditInfo.modifiedCount > 0 && (
                <span className="text-xs text-orange-700">
                  ({bulkEditInfo.modifiedCount} modified)
                </span>
              )}
              <div className="flex-1" />
              <Button
                variant="outline-red"
                size="sm"
                onClick={handleBulkEditCancel}
                disabled={bulkEditInfo.isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={handleBulkEditSave}
                disabled={bulkEditInfo.isSaving || bulkEditInfo.modifiedCount === 0}
              >
                {bulkEditInfo.isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Search and Filters */}
          {!isBulkEditMode && (
            <>
              {/* Search */}
              <Input
                type="search"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />

                <Select value={accountGroupFilter} onValueChange={setAccountGroupFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Account Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {accountGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={drCrFilter} onValueChange={setDrCrFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Dr/Cr" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Dr">Debit</SelectItem>
                    <SelectItem value="Cr">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Bulk Actions (when accounts are selected) */}
              {hasSelection && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-md border border-blue-200">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedAccounts.length} selected
                  </span>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => setShowBulkGroupDialog(true)}
                  >
                    Assign Group
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content - Scrollable with proper spacing */}
      <main className="flex-1 overflow-y-auto p-6">
        <AccountTable
          searchQuery={searchQuery}
          accountGroupFilter={accountGroupFilter}
          drCrFilter={drCrFilter}
          isBulkEditMode={isBulkEditMode}
          onBulkEditChange={setBulkEditInfo}
          onBulkEditCancel={handleBulkEditCancel}
          triggerSave={triggerSave}
          onClearFilters={handleClearFilters}
        />
      </main>

      {/* Modals */}
      <AccountFormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleAccountCreated}
      />

      <AccountGroupModal
        open={isGroupModalOpen}
        onOpenChange={setIsGroupModalOpen}
        onSuccess={handleGroupManaged}
      />

      <ImportExportModal
        open={isImportExportModalOpen}
        onOpenChange={setIsImportExportModalOpen}
        mode={importExportMode}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedAccounts.length} Account(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected accounts
              and all their transaction history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={handleBulkDelete}>
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Group Assignment Dialog */}
      <AlertDialog open={showBulkGroupDialog} onOpenChange={setShowBulkGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Group to {selectedAccounts.length} Account(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Select an account group to assign to all selected accounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedGroupForBulk} onValueChange={setSelectedGroupForBulk}>
              <SelectTrigger>
                <SelectValue placeholder="Select account group" />
              </SelectTrigger>
              <SelectContent>
                {accountGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="warning"
                onClick={handleBulkGroupUpdate}
                disabled={!selectedGroupForBulk}
              >
                Assign Group
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
