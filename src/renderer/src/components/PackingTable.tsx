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
import { Badge } from '@/components/ui/badge'
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
import { PackingFormModal } from './PackingFormModal'
import { toast } from 'sonner'
import type { Packing } from '@/types/packing'

interface PackingTableProps {
  packings: Packing[]
  loading: boolean
  selectedPackings: string[]
  onSelectionChange: (packingIds: string[]) => void
  onPackingUpdated: () => void
  isBulkEditMode?: boolean
  onBulkEditStateChange?: (modifiedCount: number, isSaving: boolean) => void
  onBulkEditCancel?: () => void
  triggerSave?: number
}

export function PackingTable({ 
  packings, 
  loading, 
  selectedPackings,
  onSelectionChange,
  onPackingUpdated,
  isBulkEditMode = false,
  onBulkEditStateChange,
  onBulkEditCancel,
  triggerSave = 0
}: PackingTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState<keyof Packing>('packingName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [packingToDelete, setPackingToDelete] = useState<Packing | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [packingToEdit, setPackingToEdit] = useState<Packing | null>(null)

  // Bulk edit state
  const [editedPackings, setEditedPackings] = useState<Record<string, Partial<Packing>>>({})
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false)

  // Reset edited packings when exiting bulk edit mode
  useEffect(() => {
    if (!isBulkEditMode) {
      setEditedPackings({})
      setIsSavingBulkEdit(false)
    }
  }, [isBulkEditMode])

  // Handle save trigger from parent
  useEffect(() => {
    if (triggerSave > 0 && isBulkEditMode && Object.keys(editedPackings).length > 0) {
      handleSaveBulkEdit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSave])

  const handleSaveBulkEdit = async () => {
    setIsSavingBulkEdit(true)
    try {
      const updates = Object.entries(editedPackings).map(([id, data]) =>
        window.api.packing.update(id, data)
      )

      const results = await Promise.allSettled(updates)
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (succeeded > 0) {
        toast.success(`Successfully updated ${succeeded} packing${succeeded > 1 ? 's' : ''}`, {
          description: 'Your changes have been saved'
        })
        setEditedPackings({})
        onSelectionChange([])
        if (onBulkEditCancel) onBulkEditCancel()
        onPackingUpdated()
      }

      if (failed > 0) {
        toast.error(`Failed to update ${failed} packing${failed > 1 ? 's' : ''}`, {
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

  const handleFieldChange = (packingId: string, field: keyof Packing, value: any) => {
    setEditedPackings(prev => ({
      ...prev,
      [packingId]: {
        ...prev[packingId],
        [field]: value
      }
    }))
  }

  const getDisplayValue = (packing: Packing, field: keyof Packing) => {
    if (editedPackings[packing.id]?.[field] !== undefined) {
      return editedPackings[packing.id][field]
    }
    return packing[field]
  }

  // Notify parent about bulk edit state changes
  useEffect(() => {
    if (onBulkEditStateChange && isBulkEditMode) {
      const modifiedCount = Object.keys(editedPackings).length
      onBulkEditStateChange(modifiedCount, isSavingBulkEdit)
    }
  }, [editedPackings, isSavingBulkEdit, isBulkEditMode, onBulkEditStateChange])

  const handleSort = (column: keyof Packing) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleEdit = (packing: Packing, event: React.MouseEvent) => {
    event.stopPropagation()
    setPackingToEdit(packing)
    setEditModalOpen(true)
  }

  const handleDelete = (packing: Packing, event: React.MouseEvent) => {
    event.stopPropagation()
    setPackingToDelete(packing)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!packingToDelete) return

    try {
      await window.api.packing.delete(packingToDelete.id)
      toast.success('Packing deleted', {
        description: `${packingToDelete.packingName} has been deleted`
      })
      onPackingUpdated()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete packing', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      })
    } finally {
      setDeleteConfirmOpen(false)
      setPackingToDelete(null)
    }
  }

  const handleSelectAll = () => {
    if (selectedPackings.length === paginatedPackings.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(paginatedPackings.map(p => p.id))
    }
  }

  const handleSelectPacking = (packingId: string) => {
    if (selectedPackings.includes(packingId)) {
      onSelectionChange(selectedPackings.filter(id => id !== packingId))
    } else {
      onSelectionChange([...selectedPackings, packingId])
    }
  }

  const sortedPackings = useMemo(() => {
    return [...packings].sort((a, b) => {
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
  }, [packings, sortColumn, sortDirection])

  const paginatedPackings = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedPackings.slice(start, start + pageSize)
  }, [sortedPackings, page, pageSize])

  const totalPages = Math.ceil(sortedPackings.length / pageSize)

  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (packings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No packings found</p>
          <p className="text-sm text-muted-foreground">
            Create your first packing to get started
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      paginatedPackings.length > 0 &&
                      paginatedPackings.every(p => selectedPackings.includes(p.id))
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('packingName')}
                    className="-ml-4"
                  >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('calculate')}
                    className="-ml-4"
                  >
                    Calculate
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('divideBy')}
                    className="-ml-4"
                  >
                    Divide By
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                {!isBulkEditMode && <TableHead className="w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPackings.map((packing) => (
                <TableRow
                  key={packing.id}
                  className={selectedPackings.includes(packing.id) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedPackings.includes(packing.id)}
                      onCheckedChange={() => handleSelectPacking(packing.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {isBulkEditMode ? (
                      <Input
                        value={getDisplayValue(packing, 'packingName') as string}
                        onChange={(e) => handleFieldChange(packing.id, 'packingName', e.target.value)}
                        className="h-8"
                      />
                    ) : (
                      <span className="font-medium">{packing.packingName}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isBulkEditMode ? (
                      <Select
                        value={getDisplayValue(packing, 'calculate') as string}
                        onValueChange={(value) => handleFieldChange(packing.id, 'calculate', value)}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nug">Nug</SelectItem>
                          <SelectItem value="weight">Weight</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={packing.calculate === 'nug' ? 'default' : 'secondary'}>
                        {packing.calculate}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isBulkEditMode ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={(getDisplayValue(packing, 'divideBy') as number) || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : parseFloat(e.target.value)
                          handleFieldChange(packing.id, 'divideBy', value)
                        }}
                        className="h-8 w-24"
                      />
                    ) : (
                      <span>{packing.divideBy}</span>
                    )}
                  </TableCell>
                  {!isBulkEditMode && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEdit(packing, e)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-orange-600 " />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(packing, e)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages || 1}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <PackingFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={onPackingUpdated}
        companyId={packingToEdit?.companyId || ''}
        packing={packingToEdit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Packing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{packingToDelete?.packingName}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
