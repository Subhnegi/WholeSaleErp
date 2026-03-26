import { useState, useMemo, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Loader2, Edit, Trash2, ArrowUpDown } from 'lucide-react'
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
import { StoreFormModal } from './StoreFormModal'
import { toast } from 'sonner'
import type { Store } from '@/types/store'

interface StoreTableProps {
  stores: Store[]
  loading: boolean
  selectedStores: string[]
  onSelectionChange: (storeIds: string[]) => void
  onStoreUpdated: () => void
  bulkEditMode?: boolean
  onBulkEditChange?: (info: { modifiedCount: number; isSaving: boolean }) => void
  onBulkEditCancel?: () => void
  triggerSave?: number
}

export function StoreTable({ 
  stores, 
  loading, 
  selectedStores,
  onSelectionChange,
  onStoreUpdated,
  bulkEditMode = false,
  onBulkEditChange,
  onBulkEditCancel,
  triggerSave = 0
}: StoreTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState<keyof Store>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [storeToEdit, setStoreToEdit] = useState<Store | null>(null)

  // Bulk edit state
  const [editedStores, setEditedStores] = useState<Record<string, Partial<Store>>>({})
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false)

  // Notify parent of bulk edit changes
  useEffect(() => {
    if (bulkEditMode) {
      onBulkEditChange?.({ 
        modifiedCount: Object.keys(editedStores).length, 
        isSaving: isSavingBulkEdit 
      })
    }
  }, [editedStores, isSavingBulkEdit, bulkEditMode, onBulkEditChange])

  // Clear edited items when exiting bulk edit mode
  useEffect(() => {
    if (!bulkEditMode) {
      setEditedStores({})
      setIsSavingBulkEdit(false)
    }
  }, [bulkEditMode])

  // Handle save trigger from parent
  useEffect(() => {
    if (triggerSave > 0 && bulkEditMode && Object.keys(editedStores).length > 0) {
      handleSaveBulkEdit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSave])

  const handleSaveBulkEdit = async () => {
    setIsSavingBulkEdit(true)
    try {
      const updates = Object.entries(editedStores).map(([id, data]) =>
        window.api.store.update(id, data)
      )

      const results = await Promise.allSettled(updates)
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (succeeded > 0) {
        toast.success(`Successfully updated ${succeeded} store${succeeded > 1 ? 's' : ''}`, {
          description: 'Your changes have been saved'
        })
        setEditedStores({})
        onSelectionChange([])
        if (onBulkEditCancel) onBulkEditCancel()
        onStoreUpdated()
      }

      if (failed > 0) {
        toast.error(`Failed to update ${failed} store${failed > 1 ? 's' : ''}`, {
          description: 'Some items could not be updated. Please try again.'
        })
      }
    } catch (error) {
      console.error('Bulk edit save error:', error)
      toast.error('Unable to save changes', {
        description: 'An error occurred while saving. Please try again.'
      })
    } finally {
      setIsSavingBulkEdit(false)
    }
  }

  const handleFieldChange = (storeId: string, field: keyof Store, value: string | null) => {
    setEditedStores(prev => ({
      ...prev,
      [storeId]: {
        ...prev[storeId],
        [field]: value
      }
    }))
  }

  const getDisplayValue = (store: Store, field: keyof Store) => {
    if (editedStores[store.id]?.[field] !== undefined) {
      return editedStores[store.id][field]
    }
    return store[field]
  }

  const handleSort = (column: keyof Store) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleEdit = (store: Store, event: React.MouseEvent) => {
    event.stopPropagation()
    setStoreToEdit(store)
    setEditModalOpen(true)
  }

  const handleDelete = (store: Store, event: React.MouseEvent) => {
    event.stopPropagation()
    setStoreToDelete(store)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!storeToDelete) return

    try {
      await window.api.store.delete(storeToDelete.id)
      toast.success(`"${storeToDelete.name}" deleted successfully`, {
        description: 'The store has been removed'
      })
      onStoreUpdated()
    } catch (error) {
      console.error('Delete store error:', error)
      toast.error('Unable to delete store', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setDeleteConfirmOpen(false)
      setStoreToDelete(null)
    }
  }

  const handleEditSuccess = () => {
    setEditModalOpen(false)
    setStoreToEdit(null)
    onStoreUpdated()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(paginatedStores.map(store => store.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectStore = (storeId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedStores, storeId])
    } else {
      onSelectionChange(selectedStores.filter(id => id !== storeId))
    }
  }

  // Helper to format full address
  const getFullAddress = (store: Store) => {
    const parts = [store.address, store.address2, store.address3].filter(Boolean)
    return parts.join(', ') || '-'
  }

  // Sort stores
  const sortedStores = useMemo(() => {
    return [...stores].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      
      return 0
    })
  }, [stores, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedStores.length / pageSize)
  const paginatedStores = sortedStores.slice((page - 1) * pageSize, page * pageSize)

  const allSelected = paginatedStores.length > 0 && paginatedStores.every(store => selectedStores.includes(store.id))
  const someSelected = paginatedStores.some(store => selectedStores.includes(store.id)) && !allSelected

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Stores Found</h3>
          <p className="text-muted-foreground">Create your first store to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-md border ${bulkEditMode ? 'overflow-x-auto' : ''}`}>
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  className={someSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
              </TableHead>
              <TableHead className="w-16">S.No.</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  Store
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Contact No.</TableHead>
              {!bulkEditMode && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStores.map((store, index) => (
              <TableRow
                key={store.id}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedStores.includes(store.id)}
                    onCheckedChange={(checked) => handleSelectStore(store.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(page - 1) * pageSize + index + 1}
                </TableCell>
                <TableCell className="font-medium">
                  {bulkEditMode ? (
                    <Input
                      value={(getDisplayValue(store, 'name') as string) || ''}
                      onChange={(e) => handleFieldChange(store.id, 'name', e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    store.name
                  )}
                </TableCell>
                <TableCell>
                  {bulkEditMode ? (
                    <Input
                      value={(getDisplayValue(store, 'address') as string) || ''}
                      onChange={(e) => handleFieldChange(store.id, 'address', e.target.value || null)}
                      className="h-8"
                      placeholder="Address"
                    />
                  ) : (
                    getFullAddress(store)
                  )}
                </TableCell>
                <TableCell>
                  {bulkEditMode ? (
                    <Input
                      value={(getDisplayValue(store, 'contactNo') as string) || ''}
                      onChange={(e) => handleFieldChange(store.id, 'contactNo', e.target.value || null)}
                      className="h-8"
                      placeholder="Contact No."
                    />
                  ) : (
                    store.contactNo || '-'
                  )}
                </TableCell>
                {!bulkEditMode && (
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-600">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleEdit(store, e)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive text-red-600"
                        onClick={(e) => handleDelete(store, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {sortedStores.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedStores.length)} of {sortedStores.length} stores
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages || totalPages === 0}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      <StoreFormModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setStoreToEdit(null)
        }}
        onSuccess={handleEditSuccess}
        storeId={storeToEdit?.id}
        companyId={storeToEdit?.companyId || ''}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{storeToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
