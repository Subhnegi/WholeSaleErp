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
import { ChevronLeft, ChevronRight, Loader2, Eye, Edit, Trash2, ArrowUpDown } from 'lucide-react'
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
import { ItemFormModal } from './ItemFormModal'
import { toast } from 'sonner'
import type { Item } from '@/types/item'

interface ItemTableProps {
  items: Item[]
  loading: boolean
  selectedItems: string[]
  onSelectionChange: (itemIds: string[]) => void
  onItemUpdated: () => void
  bulkEditMode?: boolean
  onBulkEditChange?: (info: { modifiedCount: number; isSaving: boolean }) => void
  onBulkEditCancel?: () => void
  triggerSave?: number
}

export function ItemTable({ 
  items, 
  loading, 
  selectedItems,
  onSelectionChange,
  onItemUpdated,
  bulkEditMode = false,
  onBulkEditChange,
  onBulkEditCancel,
  triggerSave = 0
}: ItemTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [sortColumn, setSortColumn] = useState<keyof Item>('itemName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [itemToView, setItemToView] = useState<Item | null>(null)

  // Bulk edit state
  const [editedItems, setEditedItems] = useState<Record<string, Partial<Item>>>({})
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false)

  // Notify parent of bulk edit changes
  useEffect(() => {
    if (bulkEditMode) {
      onBulkEditChange?.({ 
        modifiedCount: Object.keys(editedItems).length, 
        isSaving: isSavingBulkEdit 
      })
    }
  }, [editedItems, isSavingBulkEdit, bulkEditMode, onBulkEditChange])

  // Clear edited items when exiting bulk edit mode
  useEffect(() => {
    if (!bulkEditMode) {
      setEditedItems({})
      setIsSavingBulkEdit(false)
    }
  }, [bulkEditMode])

  // Handle save trigger from parent
  useEffect(() => {
    if (triggerSave > 0 && bulkEditMode && Object.keys(editedItems).length > 0) {
      handleSaveBulkEdit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSave])

  const handleSaveBulkEdit = async () => {
    setIsSavingBulkEdit(true)
    try {
      const updatePromises = Object.entries(editedItems).map(([itemId, changes]) => 
        window.api.item.update(itemId, changes)
      )

      const results = await Promise.all(updatePromises)
      const successCount = results.filter(r => r.success).length
      const failedCount = results.length - successCount

      if (failedCount === 0) {
        toast.success(`Successfully updated ${successCount} item(s)`)
      } else {
        toast.warning(`Updated ${successCount} item(s), ${failedCount} failed`)
      }

      setEditedItems({})
      onItemUpdated()
      onBulkEditCancel?.() // Exit bulk edit mode
    } catch (error) {
      toast.error('Failed to save bulk changes')
    } finally {
      setIsSavingBulkEdit(false)
    }
  }

  const handleFieldChange = (itemId: string, field: keyof Item, value: any) => {
    setEditedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }))
  }

  const getDisplayValue = (item: Item, field: keyof Item) => {
    if (editedItems[item.id]?.[field] !== undefined) {
      return editedItems[item.id][field]
    }
    return item[field]
  }

  const handleSort = (column: keyof Item) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleRowDoubleClick = (item: Item) => {
    setItemToView(item)
    setViewModalOpen(true)
  }

  const handleEdit = (item: Item, event: React.MouseEvent) => {
    event.stopPropagation()
    setItemToEdit(item)
    setEditModalOpen(true)
  }

  const handleDelete = (item: Item, event: React.MouseEvent) => {
    event.stopPropagation()
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      const response = await window.api.item.delete(itemToDelete.id)
      if (response.success) {
        toast.success('Item deleted successfully')
        onItemUpdated()
      } else {
        toast.error(response.message || 'Failed to delete item')
      }
    } catch (error) {
      console.error('Delete item error:', error)
      toast.error('Failed to delete item')
    } finally {
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
    }
  }

  const handleEditSuccess = () => {
    setEditModalOpen(false)
    setItemToEdit(null)
    onItemUpdated()
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(paginatedItems.map(item => item.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedItems, itemId])
    } else {
      onSelectionChange(selectedItems.filter(id => id !== itemId))
    }
  }

  // Sort items
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
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
  }, [items, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedItems.length / pageSize)
  const paginatedItems = sortedItems.slice((page - 1) * pageSize, page * pageSize)

  const allSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedItems.includes(item.id))
  const someSelected = paginatedItems.some(item => selectedItems.includes(item.id)) && !allSelected

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
          <p className="text-muted-foreground">Create your first item to get started</p>
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
              <TableHead className="cursor-pointer" onClick={() => handleSort('itemName')}>
                <div className="flex items-center gap-1">
                  Item Name
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('code')}>
                <div className="flex items-center gap-1">
                  Code
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              {bulkEditMode && <TableHead>Print As ({`Regional`})</TableHead>}
              <TableHead className="text-right cursor-pointer" onClick={() => handleSort('commission')}>
                <div className="flex items-center justify-end gap-1">
                  Commission
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              {!bulkEditMode && <TableHead>Print As ({`Regional`})</TableHead>}
              {!bulkEditMode && <TableHead className="text-center">Maintain Crates</TableHead>}
              {bulkEditMode && (
                <>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('marketFees')}>
                    <div className="flex items-center justify-end gap-1">
                      Market Fees {"%"}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('rdf')}>
                    <div className="flex items-center justify-end gap-1">
                      RDF {"%"}
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('bardanaPerNug')}>
                    <div className="flex items-center justify-end gap-1">
                      Bardana/Nug
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('laga')}>
                    <div className="flex items-center justify-end gap-1">
                      Laga
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('wtPerNug')}>
                    <div className="flex items-center justify-end gap-1">
                      Wt/Nug
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort('kaatPerNug')}>
                    <div className="flex items-center justify-end gap-1">
                      Kaat/Nug
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Maintain Crates</TableHead>
                  <TableHead className="text-center">Disable Weight</TableHead>
                </>
              )}
              {!bulkEditMode && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50"
                onDoubleClick={() => !bulkEditMode && handleRowDoubleClick(item)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {bulkEditMode ? (
                    <Input
                      value={getDisplayValue(item, 'itemName') as string}
                      onChange={(e) => handleFieldChange(item.id, 'itemName', e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    item.itemName
                  )}
                </TableCell>
                <TableCell>
                  {bulkEditMode ? (
                    <Input
                      value={(getDisplayValue(item, 'code') as string) || ''}
                      onChange={(e) => handleFieldChange(item.id, 'code', e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    item.code || '-'
                  )}
                </TableCell>
                {bulkEditMode && (
                  <TableCell>
                    <Input
                      value={(getDisplayValue(item, 'printAsLang') as string) || ''}
                      onChange={(e) => handleFieldChange(item.id, 'printAsLang', e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {bulkEditMode ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={(getDisplayValue(item, 'commission') as number) || ''}
                        onChange={(e) => handleFieldChange(item.id, 'commission', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="h-8 w-20"
                      />
                      <Select
                        value={(getDisplayValue(item, 'commissionAsPer') as string) || ''}
                        onValueChange={(value) => handleFieldChange(item.id, 'commissionAsPer', value)}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Basic Amt (%)">Basic Amt (%)</SelectItem>
                          <SelectItem value="On Kg">On Kg</SelectItem>
                          <SelectItem value="On Kg (%)">On Kg (%)</SelectItem>
                          <SelectItem value="On Nug">On Nug</SelectItem>
                          <SelectItem value="On Rate">On Rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    item.commission > 0 ? (
                      <>
                        {item.commissionAsPer?.includes('%') 
                          ? `${item.commission.toFixed(2)}%`
                          : `₹${item.commission.toFixed(2)}`}
                        {item.commissionAsPer && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {item.commissionAsPer.replace('Basic Amt (%)', '').replace(/[()]/g, '').trim()}
                          </span>
                        )}
                      </>
                    ) : '-'
                  )}
                </TableCell>
                {!bulkEditMode && (
                  <>
                    <TableCell>
                      {item.printAsLang || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.maintainCratesInSalePurchase ? '✓' : '-'}
                    </TableCell>
                  </>
                )}
                {bulkEditMode && (
                  <>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={(getDisplayValue(item, 'marketFees') as number) || ''}
                        onChange={(e) => handleFieldChange(item.id, 'marketFees', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={(getDisplayValue(item, 'rdf') as number) || ''}
                        onChange={(e) => handleFieldChange(item.id, 'rdf', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={(getDisplayValue(item, 'bardanaPerNug') as number) || ''}
                        onChange={(e) => handleFieldChange(item.id, 'bardanaPerNug', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={(getDisplayValue(item, 'laga') as number) || ''}
                        onChange={(e) => handleFieldChange(item.id, 'laga', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={(getDisplayValue(item, 'wtPerNug') as number) || ''}
                        onChange={(e) => handleFieldChange(item.id, 'wtPerNug', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={(getDisplayValue(item, 'kaatPerNug') as number) || ''}
                        onChange={(e) => handleFieldChange(item.id, 'kaatPerNug', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getDisplayValue(item, 'maintainCratesInSalePurchase') as boolean}
                        onCheckedChange={(checked) => handleFieldChange(item.id, 'maintainCratesInSalePurchase', checked)}
                        className="mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getDisplayValue(item, 'disableWeight') as boolean}
                        onCheckedChange={(checked) => handleFieldChange(item.id, 'disableWeight', checked)}
                        className="mx-auto"
                      />
                    </TableCell>
                  </>
                )}
                {!bulkEditMode && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRowDoubleClick(item)
                        }}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-orange-600"
                        onClick={(e) => handleEdit(item, e)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive text-red-600"
                        onClick={(e) => handleDelete(item, e)}
                        title="Delete"
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

      {/* Pagination - Always show */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {sortedItems.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedItems.length)} of {sortedItems.length} items
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
      <ItemFormModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setItemToEdit(null)
        }}
        onSuccess={handleEditSuccess}
        item={itemToEdit}
        companyId={itemToEdit?.companyId || ''}
      />

      {/* View Modal */}
      <ItemFormModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false)
          setItemToView(null)
        }}
        onSuccess={() => {}}
        item={itemToView}
        companyId={itemToView?.companyId || ''}
        viewOnly
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.itemName}"? This action cannot be undone.
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
