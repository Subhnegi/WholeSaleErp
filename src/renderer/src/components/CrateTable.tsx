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
import { CrateFormModal } from './CrateFormModal'
import { toast } from 'sonner'
import type { CrateMarka } from '@/types/crate'

interface CrateTableProps {
  crates: CrateMarka[]
  loading: boolean
  selectedCrates: string[]
  onSelectionChange: (crateIds: string[]) => void
  onCrateUpdated: () => void
  bulkEditMode?: boolean
  onBulkEditChange?: (info: { modifiedCount: number; isSaving: boolean }) => void
  onBulkEditCancel?: () => void
  triggerSave?: number
}

export function CrateTable({ 
  crates, 
  loading, 
  selectedCrates,
  onSelectionChange,
  onCrateUpdated,
  bulkEditMode = false,
  onBulkEditChange,
  onBulkEditCancel,
  triggerSave = 0
}: CrateTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState<keyof CrateMarka>('crateMarkaName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [crateToDelete, setCrateToDelete] = useState<CrateMarka | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [crateToEdit, setCrateToEdit] = useState<CrateMarka | null>(null)

  // Bulk edit state
  const [editedCrates, setEditedCrates] = useState<Record<string, Partial<CrateMarka>>>({})
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false)

  // Notify parent of bulk edit changes
  useEffect(() => {
    if (bulkEditMode) {
      onBulkEditChange?.({ 
        modifiedCount: Object.keys(editedCrates).length, 
        isSaving: isSavingBulkEdit 
      })
    }
  }, [editedCrates, isSavingBulkEdit, bulkEditMode, onBulkEditChange])

  // Clear edited items when exiting bulk edit mode
  useEffect(() => {
    if (!bulkEditMode) {
      setEditedCrates({})
      setIsSavingBulkEdit(false)
    }
  }, [bulkEditMode])

  // Handle save trigger from parent
  useEffect(() => {
    if (triggerSave > 0 && bulkEditMode && Object.keys(editedCrates).length > 0) {
      handleSaveBulkEdit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSave])

  const handleSaveBulkEdit = async () => {
    setIsSavingBulkEdit(true)
    try {
      const updates = Object.entries(editedCrates).map(([id, data]) =>
        window.api.crate.update(id, data)
      )

      const results = await Promise.allSettled(updates)
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (succeeded > 0) {
        toast.success(`Successfully updated ${succeeded} crate marka${succeeded > 1 ? 's' : ''}`, {
          description: 'Your changes have been saved'
        })
        setEditedCrates({})
        onSelectionChange([])
        if (onBulkEditCancel) onBulkEditCancel()
        onCrateUpdated()
      }

      if (failed > 0) {
        toast.error(`Failed to update ${failed} crate marka${failed > 1 ? 's' : ''}`, {
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

  const handleFieldChange = (crateId: string, field: keyof CrateMarka, value: any) => {
    setEditedCrates(prev => ({
      ...prev,
      [crateId]: {
        ...prev[crateId],
        [field]: value
      }
    }))
  }

  const getDisplayValue = (crate: CrateMarka, field: keyof CrateMarka) => {
    if (editedCrates[crate.id]?.[field] !== undefined) {
      return editedCrates[crate.id][field]
    }
    return crate[field]
  }

  const handleSort = (column: keyof CrateMarka) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleEdit = (crate: CrateMarka, event: React.MouseEvent) => {
    event.stopPropagation()
    setCrateToEdit(crate)
    setEditModalOpen(true)
  }

  const handleDelete = (crate: CrateMarka, event: React.MouseEvent) => {
    event.stopPropagation()
    setCrateToDelete(crate)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!crateToDelete) return

    try {
      const response = await window.api.crate.delete(crateToDelete.id)
      if (response.success) {
        toast.success(`"${crateToDelete.crateMarkaName}" deleted successfully`, {
          description: 'The crate marka has been removed'
        })
        onCrateUpdated()
      } else {
        toast.error(response.message || 'Unable to delete crate marka', {
          description: 'Please try again or contact support'
        })
      }
    } catch (error) {
      console.error('Delete crate error:', error)
      toast.error('An error occurred while deleting', {
        description: 'Please try again later'
      })
    } finally {
      setDeleteConfirmOpen(false)
      setCrateToDelete(null)
    }
  }

  const handleEditSuccess = () => {
    setEditModalOpen(false)
    setCrateToEdit(null)
    onCrateUpdated()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(paginatedCrates.map(crate => crate.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectCrate = (crateId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedCrates, crateId])
    } else {
      onSelectionChange(selectedCrates.filter(id => id !== crateId))
    }
  }

  // Sort crates
  const sortedCrates = useMemo(() => {
    return [...crates].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      return 0
    })
  }, [crates, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedCrates.length / pageSize)
  const paginatedCrates = sortedCrates.slice((page - 1) * pageSize, page * pageSize)

  const allSelected = paginatedCrates.length > 0 && paginatedCrates.every(crate => selectedCrates.includes(crate.id))
  const someSelected = paginatedCrates.some(crate => selectedCrates.includes(crate.id)) && !allSelected

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (crates.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Crate Markas Found</h3>
          <p className="text-muted-foreground">Create your first crate marka to get started</p>
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
              <TableHead className="cursor-pointer" onClick={() => handleSort('crateMarkaName')}>
                <div className="flex items-center gap-1">
                  Crate Marka Name
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('printAs')}>
                <div className="flex items-center gap-1">
                  Print As
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort('opQty')}>
                <div className="flex items-center justify-end gap-1">
                  Opening Qty
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort('cost')}>
                <div className="flex items-center justify-end gap-1">
                  Cost (₹)
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              {!bulkEditMode && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCrates.map((crate) => (
              <TableRow
                key={crate.id}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedCrates.includes(crate.id)}
                    onCheckedChange={(checked) => handleSelectCrate(crate.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {bulkEditMode ? (
                    <Input
                      value={getDisplayValue(crate, 'crateMarkaName') as string}
                      onChange={(e) => handleFieldChange(crate.id, 'crateMarkaName', e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    crate.crateMarkaName
                  )}
                </TableCell>
                <TableCell>
                  {bulkEditMode ? (
                    <Input
                      value={(getDisplayValue(crate, 'printAs') as string) || ''}
                      onChange={(e) => handleFieldChange(crate.id, 'printAs', e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    crate.printAs || '-'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {bulkEditMode ? (
                    <Input
                      type="number"
                      step="any"
                      value={getDisplayValue(crate, 'opQty') as number}
                      onChange={(e) => handleFieldChange(crate.id, 'opQty', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-8 text-right"
                    />
                  ) : (
                    crate.opQty
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {bulkEditMode ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={getDisplayValue(crate, 'cost') as number}
                      onChange={(e) => handleFieldChange(crate.id, 'cost', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="h-8 text-right"
                    />
                  ) : (
                    `₹${crate.cost.toFixed(2)}`
                  )}
                </TableCell>
                {!bulkEditMode && (
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-600">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleEdit(crate, e)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive text-red-600"
                        onClick={(e) => handleDelete(crate, e)}
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
            Showing {sortedCrates.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedCrates.length)} of {sortedCrates.length} crate markas
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
      <CrateFormModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setCrateToEdit(null)
        }}
        onSuccess={handleEditSuccess}
        crateId={crateToEdit?.id}
        companyId={crateToEdit?.companyId || ''}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Crate Marka</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{crateToDelete?.crateMarkaName}"? This action cannot be undone.
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
