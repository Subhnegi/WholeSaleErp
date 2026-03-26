import { useState, useEffect } from 'react'
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
import { Edit3, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react'
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
import type { Voucher } from '@/types/voucher'

interface DailySaleTableProps {
  vouchers: Voucher[]
  loading: boolean
  onEdit: (voucher: Voucher) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
}

export function DailySaleTable({
  vouchers,
  loading,
  onEdit,
  onDelete,
  onBulkDelete,
}: DailySaleTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null)
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<string[]>([])
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const [sortColumn, setSortColumn] = useState<'voucherNo' | 'date' | 'party' | 'total'>('voucherNo')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const handleDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedVoucherIds.length > 0) {
      onBulkDelete(selectedVoucherIds)
      setSelectedVoucherIds([])
      setBulkDeleteConfirm(false)
    }
  }

  const toggleVoucherSelection = (id: string) => {
    setSelectedVoucherIds(prev => 
      prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedVoucherIds.length === paginatedVouchers.length) {
      setSelectedVoucherIds([])
    } else {
      setSelectedVoucherIds(paginatedVouchers.map(v => v.id))
    }
  }

  const handleRowClick = (voucherId: string) => {
    setSelectedVoucherId(selectedVoucherId === voucherId ? null : voucherId)
  }

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Filter vouchers based on search
  const filteredVouchers = vouchers.filter((voucher) => {
    const searchLower = searchText.toLowerCase()
    return (
      voucher.voucherNo.toString().includes(searchLower) ||
      (voucher.supplierName || voucher.accountName || '').toLowerCase().includes(searchLower)
    )
  })

  // Sort vouchers
  const sortedVouchers = [...filteredVouchers].sort((a, b) => {
    let comparison = 0
    switch (sortColumn) {
      case 'voucherNo':
        comparison = a.voucherNo.localeCompare(b.voucherNo)
        break
      case 'date':
        comparison = new Date(a.voucherDate).getTime() - new Date(b.voucherDate).getTime()
        break
      case 'party':
        comparison = (a.supplierName || a.accountName || '').localeCompare(b.supplierName || b.accountName || '')
        break
      case 'total':
        comparison = ((a.sellersItemValue || 0) + (a.totalOtherCharges || 0)) - ((b.sellersItemValue || 0) + (b.totalOtherCharges || 0))
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Paginate vouchers
  const totalPages = Math.ceil(sortedVouchers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedVouchers = sortedVouchers.slice(startIndex, startIndex + itemsPerPage)

  // Ensure highlighted index stays within bounds when paginated list changes
  useEffect(() => {
    setHighlightedIndex((prev) => {
      if (!paginatedVouchers || paginatedVouchers.length === 0) return null
      if (prev === null) return 0
      return Math.min(prev, paginatedVouchers.length - 1)
    })
  }, [startIndex, paginatedVouchers.length])

  // Global key handlers for ArrowUp/ArrowDown/Enter/Delete to navigate highlighted row
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when there are no rows
      if (!paginatedVouchers || paginatedVouchers.length === 0) return

      // If focus is inside an input/select/textarea or a dialog, don't interfere
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.closest('[role="dialog"]')) {
          return
        }
      }

      // Handle ArrowUp/ArrowDown for row navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          if (prev === null) return 0
          return Math.min(prev + 1, paginatedVouchers.length - 1)
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          if (prev === null) return 0
          return Math.max(prev - 1, 0)
        })
      } else if (e.key === 'Enter') {
        if (highlightedIndex !== null) {
          e.preventDefault()
          const v = paginatedVouchers[highlightedIndex]
          if (v) onEdit(v)
        }
      } else if (e.key === 'Delete') {
        if (highlightedIndex !== null) {
          e.preventDefault()
          const v = paginatedVouchers[highlightedIndex]
          if (v) setDeleteConfirmId(v.id)
        }
      }
    }

    // Use capture on document so we still get events if inner elements stop propagation
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [paginatedVouchers.length, startIndex, highlightedIndex, onEdit])

  // Get selected voucher for summary
  const selectedVoucher = selectedVoucherId
    ? vouchers.find((v) => v.id === selectedVoucherId)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      {/* Search and Filter */}
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by voucher no, party name..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {paginatedVouchers.length} of {filteredVouchers.length} vouchers
        </div>
        {onBulkDelete && selectedVoucherIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedVoucherIds.length})
          </Button>
        )}
      </div>

      {/* Vouchers Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {onBulkDelete && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedVoucherIds.length === paginatedVouchers.length && paginatedVouchers.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 font-semibold"
                  onClick={() => handleSort('voucherNo')}
                >
                  Voucher No
                  {sortColumn === 'voucherNo' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 font-semibold"
                  onClick={() => handleSort('party')}
                >
                  Party Name
                  {sortColumn === 'party' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </Button>
              </TableHead>
              <TableHead className="text-right">Nug</TableHead>
              <TableHead className="text-right">Kg</TableHead>
              <TableHead className="text-right">Basic</TableHead>
              <TableHead className="text-right">Charges</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 font-semibold"
                  onClick={() => handleSort('total')}
                >
                  Total
                  {sortColumn === 'total' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </Button>
              </TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVouchers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onBulkDelete ? 9 : 8} className="h-32 text-center text-muted-foreground">
                  {searchText ? 'No vouchers found matching your search' : 'No vouchers found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedVouchers.map((voucher, idx) => (
                  <TableRow
                    key={voucher.id}
                    className={`cursor-pointer ${selectedVoucherId === voucher.id ? 'bg-blue-200' : (highlightedIndex === idx ? 'bg-muted/50' : 'hover:bg-muted/30')}`}
                    onClick={() => { handleRowClick(voucher.id); setHighlightedIndex(idx) }}
                  >
                  {onBulkDelete && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedVoucherIds.includes(voucher.id)}
                        onCheckedChange={() => toggleVoucherSelection(voucher.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono font-semibold">#{voucher.voucherNo}</TableCell>
                  <TableCell>{voucher.supplierName || voucher.accountName || 'N/A'}</TableCell>
                  <TableCell className="text-right">{(voucher.totalNug || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{(voucher.totalWeight || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{(voucher.sellersItemValue || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{(voucher.totalOtherCharges || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{((voucher.sellersItemValue || 0) + (voucher.totalOtherCharges || 0)).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit(voucher)
                        }}
                      >
                        <Edit3 className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmId(voucher.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Totals Below Table */}
      {filteredVouchers.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-end gap-8 text-sm font-semibold bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Nug:</span>
              <span className="text-lg">
                {filteredVouchers.reduce((sum, v) => sum + (v.totalNug || v.totalQuantity || 0), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Kg:</span>
              <span className="text-lg">
                {filteredVouchers.reduce((sum, v) => sum + (v.totalWeight || 0), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Basic Amount:</span>
              <span className="text-lg">
                ₹{filteredVouchers.reduce((sum, v) => sum + (v.sellersItemValue || 0), 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Charges:</span>
              <span className="text-lg">
                ₹{filteredVouchers.reduce((sum, v) => sum + (v.totalOtherCharges || 0), 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-xl font-bold text-primary">
                ₹{filteredVouchers.reduce((sum, v) => sum + ((v.sellersItemValue || 0) + (v.totalOtherCharges || 0)), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Summary Section - Shows when voucher is selected */}
      {selectedVoucher && (
        <div className="mt-6 space-y-4">
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Summary - Voucher #{selectedVoucher.voucherNo}</h3>
            <div className="grid grid-cols-5 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
              <div>
                <span className="text-muted-foreground">Nug:</span>
                <span className="ml-2 font-medium">{(selectedVoucher.totalNug || selectedVoucher.totalQuantity || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Kg:</span>
                <span className="ml-2 font-medium">{(selectedVoucher.totalWeight || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Basic Amount:</span>
                <span className="ml-2 font-medium">₹{(selectedVoucher.sellersItemValue || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Charges:</span>
                <span className="ml-2 font-medium">
                  ₹{(selectedVoucher.totalOtherCharges || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-2 font-bold">₹{((selectedVoucher.sellersItemValue || 0) + (selectedVoucher.totalOtherCharges || 0)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Voucher Items Table */}
          {selectedVoucher.items && selectedVoucher.items.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Items</h4>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Sr.</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Nug</TableHead>
                      <TableHead className="text-right">Wt</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Basic Amt</TableHead>
                      <TableHead className="text-right">Exp.</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedVoucher.items.map((item, index) => {
                      const totalExpenses = (item.commission || 0) + (item.marketFees || 0) + (item.rdf || 0) + (item.bardana || 0) + (item.laga || 0)
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="text-sm">{item.itemName || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{item.customerName || 'N/A'}</TableCell>
                          <TableCell className="text-right">{(item.nug || item.quantity || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{(item.weight || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{(item.customerPrice || item.customerRate || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            ₹{(item.basicAmount || item.customerAmount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            ₹{(item.totalExpenses || totalExpenses).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{(item.netAmount || item.customerRetail || ((item.basicAmount || item.customerAmount || 0) + (item.totalExpenses || totalExpenses))).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Daily Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the voucher and all its
              items and charges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={bulkDeleteConfirm}
        onOpenChange={setBulkDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedVoucherIds.length} Voucher(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedVoucherIds.length} voucher(s) and all their
              items and charges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedVoucherIds.length} Voucher(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
