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
import { ArrivalTypeFormModal } from './ArrivalTypeFormModal'
import { toast } from 'sonner'
import type { ArrivalType } from '@/types/arrivalType'

interface ArrivalTypeTableProps {
  arrivalTypes: ArrivalType[]
  loading: boolean
  selectedArrivalTypes: string[]
  onSelectionChange: (arrivalTypeIds: string[]) => void
  onArrivalTypeUpdated: () => void
  isBulkEditMode?: boolean
  onBulkEditStateChange?: (modifiedCount: number, isSaving: boolean) => void
  onBulkEditCancel?: () => void
  triggerSave?: number
}

export function ArrivalTypeTable({ 
  arrivalTypes, 
  loading, 
  selectedArrivalTypes,
  onSelectionChange,
  onArrivalTypeUpdated,
  isBulkEditMode = false,
  onBulkEditStateChange,
  onBulkEditCancel,
  triggerSave = 0
}: ArrivalTypeTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState<keyof ArrivalType>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [arrivalTypeToDelete, setArrivalTypeToDelete] = useState<ArrivalType | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [arrivalTypeToEdit, setArrivalTypeToEdit] = useState<ArrivalType | null>(null)

  // Bulk edit state
  const [editedArrivalTypes, setEditedArrivalTypes] = useState<Record<string, Partial<ArrivalType>>>({})
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false)

  // Notify parent of bulk edit changes
  useEffect(() => {
    if (isBulkEditMode) {
      onBulkEditStateChange?.(Object.keys(editedArrivalTypes).length, isSavingBulkEdit)
    }
  }, [editedArrivalTypes, isSavingBulkEdit, isBulkEditMode, onBulkEditStateChange])

  // Clear edited items when exiting bulk edit mode
  useEffect(() => {
    if (!isBulkEditMode) {
      setEditedArrivalTypes({})
      setIsSavingBulkEdit(false)
    }
  }, [isBulkEditMode])

  // Handle save trigger from parent
  useEffect(() => {
    if (triggerSave > 0 && isBulkEditMode && Object.keys(editedArrivalTypes).length > 0) {
      handleSaveBulkEdit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSave])

  const handleSaveBulkEdit = async () => {
    setIsSavingBulkEdit(true)
    try {
      const updates = Object.entries(editedArrivalTypes).map(([id, data]) =>
        window.api.arrivalType.update(id, data)
      )

      const results = await Promise.allSettled(updates)
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (succeeded > 0) {
        toast.success(`Successfully updated ${succeeded} arrival type${succeeded > 1 ? 's' : ''}`, {
          description: 'Your changes have been saved'
        })
        setEditedArrivalTypes({})
        onSelectionChange([])
        if (onBulkEditCancel) onBulkEditCancel()
        onArrivalTypeUpdated()
      }

      if (failed > 0) {
        toast.error(`Failed to update ${failed} arrival type${failed > 1 ? 's' : ''}`, {
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

  const handleFieldChange = (arrivalTypeId: string, field: keyof ArrivalType, value: any) => {
    setEditedArrivalTypes(prev => ({
      ...prev,
      [arrivalTypeId]: {
        ...prev[arrivalTypeId],
        [field]: value
      }
    }))
  }

  const getDisplayValue = (arrivalType: ArrivalType, field: keyof ArrivalType) => {
    if (editedArrivalTypes[arrivalType.id]?.[field] !== undefined) {
      return editedArrivalTypes[arrivalType.id][field]
    }
    return arrivalType[field]
  }

  const handleSort = (column: keyof ArrivalType) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleEdit = (arrivalType: ArrivalType, event: React.MouseEvent) => {
    event.stopPropagation()
    setArrivalTypeToEdit(arrivalType)
    setEditModalOpen(true)
  }

  const handleDelete = (arrivalType: ArrivalType, event: React.MouseEvent) => {
    event.stopPropagation()
    setArrivalTypeToDelete(arrivalType)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!arrivalTypeToDelete) return

    try {
      const response = await window.api.arrivalType.delete(arrivalTypeToDelete.id)
      if (response.success) {
        toast.success(`"${arrivalTypeToDelete.name}" deleted successfully`, {
          description: 'The arrival type has been removed'
        })
        onArrivalTypeUpdated()
      } else {
        toast.error(response.error || 'Unable to delete arrival type', {
          description: 'Please try again or contact support'
        })
      }
    } catch (error) {
      console.error('Delete arrival type error:', error)
      toast.error('An error occurred while deleting', {
        description: 'Please try again later'
      })
    } finally {
      setDeleteConfirmOpen(false)
      setArrivalTypeToDelete(null)
    }
  }

  const handleEditSuccess = () => {
    setEditModalOpen(false)
    setArrivalTypeToEdit(null)
    onArrivalTypeUpdated()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(paginatedArrivalTypes.map(at => at.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (arrivalTypeId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedArrivalTypes, arrivalTypeId])
    } else {
      onSelectionChange(selectedArrivalTypes.filter(id => id !== arrivalTypeId))
    }
  }

  // Sorting
  const sortedArrivalTypes = useMemo(() => {
    const sorted = [...arrivalTypes].sort((a, b) => {
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
      
      if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        return sortDirection === 'asc' 
          ? (aVal === bVal ? 0 : aVal ? 1 : -1)
          : (aVal === bVal ? 0 : aVal ? -1 : 1)
      }
      
      return 0
    })
    
    return sorted
  }, [arrivalTypes, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedArrivalTypes.length / pageSize)
  const paginatedArrivalTypes = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedArrivalTypes.slice(start, start + pageSize)
  }, [sortedArrivalTypes, page, pageSize])

  // Reset to page 1 when data changes
  useEffect(() => {
    setPage(1)
  }, [arrivalTypes])

  const allOnPageSelected = paginatedArrivalTypes.length > 0 && 
    paginatedArrivalTypes.every(at => selectedArrivalTypes.includes(at.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (arrivalTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No Arrival Types Yet</p>
          <p className="text-sm text-muted-foreground">
            Click "New Arrival Type" to create your first arrival type
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="hover:bg-transparent"
                >
                  Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Purchase Type</TableHead>
              <TableHead>Vehicle No.</TableHead>
              <TableHead>Auto Roundoff</TableHead>
              <TableHead>Additional Fields</TableHead>
              <TableHead>Forwarding Agent</TableHead>
              <TableHead>Broker</TableHead>
              {!isBulkEditMode && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedArrivalTypes.map((arrivalType) => (
              <TableRow key={arrivalType.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedArrivalTypes.includes(arrivalType.id)}
                    onCheckedChange={(checked) => handleSelectOne(arrivalType.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  {isBulkEditMode ? (
                    <Input
                      value={getDisplayValue(arrivalType, 'name') as string}
                      onChange={(e) => handleFieldChange(arrivalType.id, 'name', e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    <span className="font-medium">{arrivalType.name}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isBulkEditMode ? (
                    <Select
                      value={getDisplayValue(arrivalType, 'purchaseType') as string}
                      onValueChange={(value) => handleFieldChange(arrivalType.id, 'purchaseType', value)}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="partyStock">Party Stock</SelectItem>
                        <SelectItem value="selfPurchase">Self Purchase</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={arrivalType.purchaseType === 'selfPurchase' ? 'default' : 'secondary'}>
                      {arrivalType.purchaseType === 'selfPurchase' ? 'Self Purchase' : 'Party Stock'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isBulkEditMode ? (
                    <Input
                      value={(getDisplayValue(arrivalType, 'vehicleNoByDefault') as string) || ''}
                      onChange={(e) => handleFieldChange(arrivalType.id, 'vehicleNoByDefault', e.target.value || null)}
                      className="h-8 w-32"
                      placeholder="Vehicle No."
                    />
                  ) : (
                    <span className="text-sm">{arrivalType.vehicleNoByDefault || '-'}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isBulkEditMode ? (
                    <Checkbox
                      checked={getDisplayValue(arrivalType, 'autoRoundOffAmount') as boolean}
                      onCheckedChange={(checked) => handleFieldChange(arrivalType.id, 'autoRoundOffAmount', checked)}
                    />
                  ) : (
                    <Badge variant={arrivalType.autoRoundOffAmount ? 'default' : 'secondary'}>
                      {arrivalType.autoRoundOffAmount ? 'Yes' : 'No'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isBulkEditMode ? (
                    <Checkbox
                      checked={getDisplayValue(arrivalType, 'askForAdditionalFields') as boolean}
                      onCheckedChange={(checked) => handleFieldChange(arrivalType.id, 'askForAdditionalFields', checked)}
                    />
                  ) : (
                    <Badge variant={arrivalType.askForAdditionalFields ? 'default' : 'secondary'}>
                      {arrivalType.askForAdditionalFields ? 'Yes' : 'No'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isBulkEditMode ? (
                    <Checkbox
                      checked={getDisplayValue(arrivalType, 'requireForwardingAgent') as boolean}
                      onCheckedChange={(checked) => handleFieldChange(arrivalType.id, 'requireForwardingAgent', checked)}
                    />
                  ) : (
                    <Badge variant={arrivalType.requireForwardingAgent ? 'default' : 'secondary'}>
                      {arrivalType.requireForwardingAgent ? 'Yes' : 'No'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isBulkEditMode ? (
                    <Checkbox
                      checked={getDisplayValue(arrivalType, 'requireBroker') as boolean}
                      onCheckedChange={(checked) => handleFieldChange(arrivalType.id, 'requireBroker', checked)}
                    />
                  ) : (
                    <Badge variant={arrivalType.requireBroker ? 'default' : 'secondary'}>
                      {arrivalType.requireBroker ? 'Yes' : 'No'}
                    </Badge>
                  )}
                </TableCell>
                {!isBulkEditMode && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleEdit(arrivalType, e)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4 text-orange-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(arrivalType, e)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
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
          <span className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, sortedArrivalTypes.length)} of {sortedArrivalTypes.length}
          </span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      {arrivalTypeToEdit && (
        <ArrivalTypeFormModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSuccess={handleEditSuccess}
          companyId={arrivalTypeToEdit.companyId}
          arrivalType={arrivalTypeToEdit}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Arrival Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{arrivalTypeToDelete?.name}"? This action cannot be undone.
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
