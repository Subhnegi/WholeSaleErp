import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Edit3, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
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
import type { QuickSale } from '@/types/quickSale'

// Simple date formatting helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

interface QuickSaleTableProps {
  quickSales: QuickSale[]
  loading: boolean
  selectedQuickSales: string[]
  onSelectionChange: (selected: string[]) => void
  onEdit: (quickSale: QuickSale) => void
  onDelete: (id: string) => void
}

export function QuickSaleTable({
  quickSales,
  loading,
  selectedQuickSales,
  onSelectionChange,
  onEdit,
  onDelete
}: QuickSaleTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(quickSales.map(qs => qs.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedQuickSales, id])
    } else {
      onSelectionChange(selectedQuickSales.filter(selectedId => selectedId !== id))
    }
  }

  const handleDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (quickSales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg">No quick sales found</p>
        <p className="text-sm">Create your first quick sale to get started</p>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={quickSales.length > 0 && selectedQuickSales.length === quickSales.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Voucher</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Nug</TableHead>
              <TableHead className="text-right">Weight (Kg)</TableHead>
              <TableHead className="text-right">Basic Amount</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quickSales.map((quickSale) => (
              <>
                <TableRow key={quickSale.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedQuickSales.includes(quickSale.id)}
                      onCheckedChange={(checked) => handleSelectOne(quickSale.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleRowExpand(quickSale.id)}
                    >
                      {expandedRows.has(quickSale.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {formatDate(quickSale.saleDate)}
                  </TableCell>
                  <TableCell>
                    {quickSale.voucherNo || '—'}
                  </TableCell>
                  <TableCell className="text-right">{quickSale.totalItems}</TableCell>
                  <TableCell className="text-right">{quickSale.totalNug.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{quickSale.totalWeight.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{quickSale.basicAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{quickSale.commissionExpenses.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">₹{quickSale.totalSaleAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(quickSale)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(quickSale.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                
                {/* Expanded row showing items */}
                {expandedRows.has(quickSale.id) && quickSale.items && (
                  <TableRow key={`${quickSale.id}-items`}>
                    <TableCell colSpan={11} className="bg-muted/30 p-0">
                      <div className="p-4">
                        <h4 className="font-semibold mb-2 text-sm">Items:</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Nug</TableHead>
                              <TableHead className="text-right">Kg</TableHead>
                              <TableHead className="text-right">Rate</TableHead>
                              <TableHead>Per</TableHead>
                              <TableHead className="text-right">Basic Amt</TableHead>
                              <TableHead className="text-right">Total Amt</TableHead>
                              <TableHead>Crate</TableHead>
                              <TableHead className="text-right">Crate Qty</TableHead>
                              <TableHead className="text-right">Crate Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quickSale.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.itemName}</TableCell>
                                <TableCell>{item.accountName}</TableCell>
                                <TableCell className="text-right">{item.nug}</TableCell>
                                <TableCell className="text-right">{item.kg.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{item.rate}</TableCell>
                                <TableCell className="uppercase">{item.per}</TableCell>
                                <TableCell className="text-right">₹{item.basicAmount.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-semibold">₹{item.totalAmount.toLocaleString()}</TableCell>
                                <TableCell>{item.crateMarkaName || '-'}</TableCell>
                                <TableCell className="text-right">{item.crateQty || '-'}</TableCell>
                                <TableCell className="text-right">
                                  {item.crateValue ? `₹${item.crateValue.toLocaleString()}` : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quick Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quick sale
              and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
