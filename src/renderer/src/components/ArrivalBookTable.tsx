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
import { Badge } from '@/components/ui/badge'
import { Eye, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react'
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
import type { Arrival, ArrivalItem } from '@/types/arrival'

interface ArrivalBookTableProps {
  arrivals: Arrival[]
  loading: boolean
  onView: (arrival: Arrival) => void
  onDelete: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
}

export function ArrivalBookTable({
  arrivals,
  loading,
  onView,
  onDelete,
  onBulkDelete,
}: ArrivalBookTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [selectedArrivalId, setSelectedArrivalId] = useState<string | null>(null)
  const [selectedArrivalIds, setSelectedArrivalIds] = useState<string[]>([])
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const [sortColumn, setSortColumn] = useState<'voucherNo' | 'date' | 'party' | 'nug'>('voucherNo')
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
    if (onBulkDelete && selectedArrivalIds.length > 0) {
      onBulkDelete(selectedArrivalIds)
      setSelectedArrivalIds([])
      setBulkDeleteConfirm(false)
    }
  }

  const toggleArrivalSelection = (id: string) => {
    setSelectedArrivalIds(prev => 
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedArrivalIds.length === paginatedArrivals.length) {
      setSelectedArrivalIds([])
    } else {
      setSelectedArrivalIds(paginatedArrivals.map(a => a.id))
    }
  }

  const handleRowClick = (arrivalId: string) => {
    setSelectedArrivalId(selectedArrivalId === arrivalId ? null : arrivalId)
  }

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })
    } catch {
      return dateStr
    }
  }

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sold':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Sold</Badge>
      case 'partial':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Partial</Badge>
      case 'pending':
      default:
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pending</Badge>
    }
  }

  // Filter arrivals based on search
  const filteredArrivals = arrivals.filter((arrival) => {
    const searchLower = searchText.toLowerCase()
    return (
      arrival.voucherNo.toString().toLowerCase().includes(searchLower) ||
      (arrival.partyName || '').toLowerCase().includes(searchLower)
    )
  })

  // Sort arrivals
  const sortedArrivals = [...filteredArrivals].sort((a, b) => {
    let comparison = 0
    switch (sortColumn) {
      case 'voucherNo':
        comparison = a.voucherNo.localeCompare(b.voucherNo)
        break
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        break
      case 'party':
        comparison = (a.partyName || '').localeCompare(b.partyName || '')
        break
      case 'nug':
        comparison = a.totalNug - b.totalNug
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Paginate arrivals
  const totalPages = Math.ceil(sortedArrivals.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedArrivals = sortedArrivals.slice(startIndex, startIndex + itemsPerPage)

  // Ensure highlighted index stays within bounds when paginated list changes
  useEffect(() => {
    setHighlightedIndex((prev) => {
      if (!paginatedArrivals || paginatedArrivals.length === 0) return null
      if (prev === null) return 0
      return Math.min(prev, paginatedArrivals.length - 1)
    })
  }, [startIndex, paginatedArrivals.length])

  // Global key handlers for ArrowUp/ArrowDown/Enter/Delete to navigate highlighted row
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when there are no rows
      if (!paginatedArrivals || paginatedArrivals.length === 0) return

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
          return Math.min(prev + 1, paginatedArrivals.length - 1)
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
          const a = paginatedArrivals[highlightedIndex]
          if (a) onView(a)
        }
      } else if (e.key === 'Delete') {
        if (highlightedIndex !== null) {
          e.preventDefault()
          const a = paginatedArrivals[highlightedIndex]
          if (a) setDeleteConfirmId(a.id)
        }
      }
    }

    // Use capture on document so we still get events if inner elements stop propagation
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [paginatedArrivals.length, startIndex, highlightedIndex, onView])

  // Get selected arrival for detail view
  const selectedArrival = selectedArrivalId
    ? arrivals.find((a) => a.id === selectedArrivalId)
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
          Showing {paginatedArrivals.length} of {filteredArrivals.length} arrivals
        </div>
        {onBulkDelete && selectedArrivalIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedArrivalIds.length})
          </Button>
        )}
      </div>

      {/* Arrivals Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {onBulkDelete && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedArrivalIds.length === paginatedArrivals.length && paginatedArrivals.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 font-semibold"
                  onClick={() => handleSort('date')}
                >
                  Date
                  {sortColumn === 'date' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </Button>
              </TableHead>
              <TableHead className="w-[120px]">
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
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 font-semibold"
                  onClick={() => handleSort('nug')}
                >
                  Nug
                  {sortColumn === 'nug' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </Button>
              </TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedArrivals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onBulkDelete ? 9 : 8} className="h-32 text-center text-muted-foreground">
                  {searchText ? 'No arrivals found matching your search' : 'No arrivals found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedArrivals.map((arrival, idx) => (
                <TableRow
                  key={arrival.id}
                  className={`cursor-pointer ${selectedArrivalId === arrival.id ? 'bg-blue-200' : (highlightedIndex === idx ? 'bg-muted/50' : 'hover:bg-muted/30')}`}
                  onClick={() => { handleRowClick(arrival.id); setHighlightedIndex(idx) }}
                >
                  {onBulkDelete && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedArrivalIds.includes(arrival.id)}
                        onCheckedChange={() => toggleArrivalSelection(arrival.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>{formatDate(arrival.date)}</TableCell>
                  <TableCell className="font-mono font-semibold">#{arrival.voucherNo}</TableCell>
                  <TableCell>{arrival.partyName || 'N/A'}</TableCell>
                  <TableCell className="text-right">{(arrival.totalNug || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{(arrival.soldNug || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{(arrival.balanceNug || arrival.totalNug || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center">{getStatusBadge(arrival.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onView(arrival)
                        }}
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmId(arrival.id)
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
      {filteredArrivals.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-end gap-8 text-sm font-semibold bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Count:</span>
              <span className="text-lg">{filteredArrivals.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Nug:</span>
              <span className="text-lg">
                {filteredArrivals.reduce((sum, a) => sum + (a.totalNug || 0), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Sold Nug:</span>
              <span className="text-lg">
                {filteredArrivals.reduce((sum, a) => sum + (a.soldNug || 0), 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Balance Nug:</span>
              <span className="text-xl font-bold text-primary">
                {filteredArrivals.reduce((sum, a) => sum + (a.balanceNug || a.totalNug || 0), 0).toFixed(2)}
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

      {/* Detail View - Shows when arrival is selected */}
      {selectedArrival && (
        <div className="mt-6 space-y-4">
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Arrival Details - Voucher #{selectedArrival.voucherNo}</h3>
            <div className="grid grid-cols-6 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
              <div>
                <span className="text-muted-foreground">Date:</span>
                <span className="ml-2 font-medium">{formatDate(selectedArrival.date)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Party:</span>
                <span className="ml-2 font-medium">{selectedArrival.partyName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Nug:</span>
                <span className="ml-2 font-medium">{(selectedArrival.totalNug || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Kg:</span>
                <span className="ml-2 font-medium">{(selectedArrival.totalKg || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Basic Amount:</span>
                <span className="ml-2 font-medium">₹{(selectedArrival.basicAmt || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Net Amount:</span>
                <span className="ml-2 font-bold">₹{(selectedArrival.netAmt || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Arrival Items Table */}
          {selectedArrival.items && selectedArrival.items.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Items</h4>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Sr.</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Lot No.</TableHead>
                      <TableHead className="text-right">Nug</TableHead>
                      <TableHead className="text-right">Kg</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Per</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedArrival.items.map((item: ArrivalItem, index: number) => {
                      const rate = item.rate || 0
                      const amount = rate * (rate ? item.nug : 0) // Simplified calculation
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="text-sm">{item.itemName || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{item.lotNoVariety || '-'}</TableCell>
                          <TableCell className="text-right">{(item.nug || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{(item.kg || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{(item.rate || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">Nug</TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{amount.toLocaleString()}
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
            <AlertDialogTitle>Delete Arrival?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the arrival and all its
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
            <AlertDialogTitle>Delete {selectedArrivalIds.length} Arrival(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedArrivalIds.length} arrival(s) and all their
              items and charges.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedArrivalIds.length} Arrival(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
