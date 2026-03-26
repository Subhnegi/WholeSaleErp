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
import { OtherChargesHeadFormModal } from './OtherChargesHeadFormModal'
import { toast } from 'sonner'
import type { OtherChargesHead } from '@/types/otherChargesHead'

interface Account {
  id: string
  accountName: string
}

interface OtherChargesHeadTableProps {
  chargesHeads: OtherChargesHead[]
  accounts: Account[]
  loading: boolean
  selectedChargesHeads: string[]
  onSelectionChange: (chargesHeadIds: string[]) => void
  onChargesHeadUpdated: () => void
  isBulkEditMode?: boolean
  onBulkEditStateChange?: (modifiedCount: number, isSaving: boolean) => void
  onBulkEditCancel?: () => void
  triggerSave?: number
}

export function OtherChargesHeadTable({ 
  chargesHeads, 
  accounts,
  loading, 
  selectedChargesHeads,
  onSelectionChange,
  onChargesHeadUpdated,
  isBulkEditMode = false,
  onBulkEditStateChange,
  onBulkEditCancel,
  triggerSave = 0
}: OtherChargesHeadTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortColumn, setSortColumn] = useState<keyof OtherChargesHead>('headingName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [chargesHeadToDelete, setChargesHeadToDelete] = useState<OtherChargesHead | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [chargesHeadToEdit, setChargesHeadToEdit] = useState<OtherChargesHead | null>(null)

  // Bulk edit state
  const [editedChargesHeads, setEditedChargesHeads] = useState<Record<string, Partial<OtherChargesHead>>>({})
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false)

  // Get account name by ID
  const getAccountName = (accountId: string | null) => {
    if (!accountId) return '-'
    const account = accounts.find((a) => a.id === accountId)
    return account?.accountName || '-'
  }

  // Notify parent of bulk edit changes
  useEffect(() => {
    if (isBulkEditMode) {
      onBulkEditStateChange?.(Object.keys(editedChargesHeads).length, isSavingBulkEdit)
    }
  }, [editedChargesHeads, isSavingBulkEdit, isBulkEditMode, onBulkEditStateChange])

  // Clear edited items when exiting bulk edit mode
  useEffect(() => {
    if (!isBulkEditMode) {
      setEditedChargesHeads({})
      setIsSavingBulkEdit(false)
    }
  }, [isBulkEditMode])

  // Handle save trigger from parent
  useEffect(() => {
    if (triggerSave > 0 && isBulkEditMode && Object.keys(editedChargesHeads).length > 0) {
      handleSaveBulkEdit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSave])

  const handleSaveBulkEdit = async () => {
    setIsSavingBulkEdit(true)
    try {
      const updates = Object.entries(editedChargesHeads).map(([id, data]) =>
        window.api.otherChargesHead.update(id, data)
      )

      const results = await Promise.allSettled(updates)
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (succeeded > 0) {
        toast.success(`Successfully updated ${succeeded} charges head${succeeded > 1 ? 's' : ''}`, {
          description: 'Your changes have been saved'
        })
        setEditedChargesHeads({})
        onSelectionChange([])
        if (onBulkEditCancel) onBulkEditCancel()
        onChargesHeadUpdated()
      }

      if (failed > 0) {
        toast.error(`Failed to update ${failed} charges head${failed > 1 ? 's' : ''}`, {
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

  const handleFieldChange = (chargesHeadId: string, field: keyof OtherChargesHead, value: any) => {
    setEditedChargesHeads(prev => ({
      ...prev,
      [chargesHeadId]: {
        ...prev[chargesHeadId],
        [field]: value
      }
    }))
  }

  const getDisplayValue = (chargesHead: OtherChargesHead, field: keyof OtherChargesHead) => {
    if (editedChargesHeads[chargesHead.id]?.[field] !== undefined) {
      return editedChargesHeads[chargesHead.id][field]
    }
    return chargesHead[field]
  }

  const handleSort = (column: keyof OtherChargesHead) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleEdit = (chargesHead: OtherChargesHead, event: React.MouseEvent) => {
    event.stopPropagation()
    setChargesHeadToEdit(chargesHead)
    setEditModalOpen(true)
  }

  const handleDelete = (chargesHead: OtherChargesHead, event: React.MouseEvent) => {
    event.stopPropagation()
    setChargesHeadToDelete(chargesHead)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!chargesHeadToDelete) return

    try {
      const response = await window.api.otherChargesHead.delete(chargesHeadToDelete.id)
      if (response.success) {
        toast.success(`"${chargesHeadToDelete.headingName}" deleted successfully`, {
          description: 'The charges head has been removed'
        })
        onChargesHeadUpdated()
      } else {
        toast.error(response.error || 'Unable to delete charges head', {
          description: 'Please try again or contact support'
        })
      }
    } catch (error) {
      console.error('Delete charges head error:', error)
      toast.error('An error occurred while deleting', {
        description: 'Please try again later'
      })
    } finally {
      setDeleteConfirmOpen(false)
      setChargesHeadToDelete(null)
    }
  }

  const handleEditSuccess = () => {
    setEditModalOpen(false)
    setChargesHeadToEdit(null)
    onChargesHeadUpdated()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(paginatedChargesHeads.map(ch => ch.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (chargesHeadId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedChargesHeads, chargesHeadId])
    } else {
      onSelectionChange(selectedChargesHeads.filter(id => id !== chargesHeadId))
    }
  }

  // Sorting
  const sortedChargesHeads = useMemo(() => {
    const sorted = [...chargesHeads].sort((a, b) => {
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
    
    return sorted
  }, [chargesHeads, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedChargesHeads.length / pageSize)
  const paginatedChargesHeads = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedChargesHeads.slice(start, start + pageSize)
  }, [sortedChargesHeads, page, pageSize])

  // Reset to page 1 when data changes
  useEffect(() => {
    setPage(1)
  }, [chargesHeads])

  const allOnPageSelected = paginatedChargesHeads.length > 0 && 
    paginatedChargesHeads.every(ch => selectedChargesHeads.includes(ch.id))

  // Helper to format feedAs
  const formatFeedAs = (feedAs: string) => {
    const labels: Record<string, string> = {
      absolute: 'Absolute',
      percentage: 'Percentage',
      onWeight: 'On Weight',
      onNug: 'On Nug',
      onPetti: 'On Petti/Dabba'
    }
    return labels[feedAs] || feedAs
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (chargesHeads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No Other Charges Heads Yet</p>
          <p className="text-sm text-muted-foreground">
            Click "New Other Charges Head" to create your first charges head
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
                  onClick={() => handleSort('headingName')}
                  className="hover:bg-transparent"
                >
                  Charge Head
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Feed As</TableHead>
              {!isBulkEditMode && <TableHead className="w-24">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedChargesHeads.map((chargesHead) => (
              <TableRow key={chargesHead.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedChargesHeads.includes(chargesHead.id)}
                    onCheckedChange={(checked) => handleSelectOne(chargesHead.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  {isBulkEditMode ? (
                    <Input
                      value={getDisplayValue(chargesHead, 'headingName') as string}
                      onChange={(e) => handleFieldChange(chargesHead.id, 'headingName', e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    <span className="font-medium">{chargesHead.headingName}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{getAccountName(chargesHead.accountHeadId)}</span>
                </TableCell>
                <TableCell>
                  {isBulkEditMode ? (
                    <Select
                      value={getDisplayValue(chargesHead, 'chargeType') as string}
                      onValueChange={(value) => handleFieldChange(chargesHead.id, 'chargeType', value)}
                    >
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="plus">Plus (+)</SelectItem>
                        <SelectItem value="minus">Minus (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={chargesHead.chargeType === 'plus' ? 'default' : 'destructive'}>
                      {chargesHead.chargeType === 'plus' ? '+' : '-'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isBulkEditMode ? (
                    <Select
                      value={getDisplayValue(chargesHead, 'feedAs') as string}
                      onValueChange={(value) => handleFieldChange(chargesHead.id, 'feedAs', value)}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="absolute">Absolute</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="onWeight">On Weight</SelectItem>
                        <SelectItem value="onNug">On Nug</SelectItem>
                        <SelectItem value="onPetti">On Petti</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary">
                      {formatFeedAs(chargesHead.feedAs)}
                    </Badge>
                  )}
                </TableCell>
                {!isBulkEditMode && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleEdit(chargesHead, e)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4 text-orange-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(chargesHead, e)}
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
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, sortedChargesHeads.length)} of {sortedChargesHeads.length}
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
      {chargesHeadToEdit && (
        <OtherChargesHeadFormModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSuccess={handleEditSuccess}
          companyId={chargesHeadToEdit.companyId}
          chargesHead={chargesHeadToEdit}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Charges Head</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{chargesHeadToDelete?.headingName}"? This action cannot be undone.
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
