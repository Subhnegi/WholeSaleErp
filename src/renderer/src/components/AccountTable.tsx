import { useState, useMemo, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { 
  toggleAccountSelection,
  selectAllAccounts,
  clearAccountSelection,
  deleteAccount,
  updateAccount
} from '@/store/slices/accountSlice'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Loader2, Eye, Edit, Trash2, FilterX, ArrowUpDown } from 'lucide-react'
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
import { AccountFormModal } from './AccountFormModal'
import { toast } from 'sonner'
import type { Account } from '@/types/account'

interface AccountTableProps {
  searchQuery: string
  accountGroupFilter: string
  drCrFilter: string
  isBulkEditMode?: boolean
  onBulkEditChange?: (info: { modifiedCount: number; isSaving: boolean }) => void
  onBulkEditCancel?: () => void
  triggerSave?: number
  onClearFilters?: () => void
}

export function AccountTable({ 
  searchQuery, 
  accountGroupFilter, 
  drCrFilter,
  isBulkEditMode: externalBulkEditMode = false,
  onBulkEditChange,
  onBulkEditCancel,
  triggerSave = 0,
  onClearFilters
}: AccountTableProps) {
  const dispatch = useAppDispatch()
  const { accounts, loading, selectedAccounts } = useAppSelector((state) => state.account)
  
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [sortColumn, setSortColumn] = useState<keyof Account>('accountName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [accountToView, setAccountToView] = useState<Account | null>(null)
  
  // Bulk edit state
  const isBulkEditMode = externalBulkEditMode
  const [editedAccounts, setEditedAccounts] = useState<Record<string, Partial<Account>>>({})
  const [isSavingBulkEdit, setIsSavingBulkEdit] = useState(false)

  const handleSort = (column: keyof Account) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleRowDoubleClick = (account: Account) => {
    setAccountToView(account)
    setViewModalOpen(true)
  }

  const handleEdit = (account: Account, event: React.MouseEvent) => {
    event.stopPropagation()
    setAccountToEdit(account)
    setEditModalOpen(true)
  }

  const handleDelete = (account: Account, event: React.MouseEvent) => {
    event.stopPropagation()
    setAccountToDelete(account)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!accountToDelete) return
    
    const result = await dispatch(deleteAccount(accountToDelete.id))
    if (deleteAccount.fulfilled.match(result)) {
      toast.success('Account deleted successfully')
      setDeleteConfirmOpen(false)
      setAccountToDelete(null)
    } else {
      toast.error('Failed to delete account')
    }
  }

  const handleToggleSelection = (accountId: string) => {
    dispatch(toggleAccountSelection(accountId))
  }

  const handleSelectAll = () => {
    if (selectedAccounts.length === filteredAccounts.length) {
      dispatch(clearAccountSelection())
    } else {
      dispatch(selectAllAccounts())
    }
  }

  // Notify parent of bulk edit changes
  useEffect(() => {
    if (isBulkEditMode) {
      onBulkEditChange?.({ 
        modifiedCount: Object.keys(editedAccounts).length, 
        isSaving: isSavingBulkEdit 
      })
    }
  }, [editedAccounts, isSavingBulkEdit, isBulkEditMode, onBulkEditChange])

  // Clear edited accounts when exiting bulk edit mode
  useEffect(() => {
    if (!isBulkEditMode) {
      setEditedAccounts({})
      setIsSavingBulkEdit(false)
    }
  }, [isBulkEditMode])

  // Handle save trigger from parent
  useEffect(() => {
    if (triggerSave > 0 && isBulkEditMode && Object.keys(editedAccounts).length > 0) {
      handleSaveBulkEdit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSave])

  const handleSaveBulkEdit = async () => {
    setIsSavingBulkEdit(true)
    try {
      const updatePromises = Object.entries(editedAccounts).map(([accountId, changes]) => {
        const account = accounts.find(a => a.id === accountId)
        if (!account) return Promise.resolve()
        
        // Only send the changed fields, excluding nested relations
        const cleanedChanges = { ...changes }
        // Remove nested objects that shouldn't be in update payload
        delete (cleanedChanges as any).accountGroup
        
        return dispatch(updateAccount({ id: accountId, data: cleanedChanges }))
      })

      const results = await Promise.all(updatePromises)
      const successCount = results.filter(r => r && updateAccount.fulfilled.match(r)).length
      const failedCount = results.length - successCount

      if (failedCount === 0) {
        toast.success(`Successfully updated ${successCount} account(s)`)
      } else {
        toast.warning(`Updated ${successCount} account(s), ${failedCount} failed`)
      }

      setEditedAccounts({})
      onBulkEditCancel?.() // Exit bulk edit mode
    } catch (error) {
      toast.error('Failed to save bulk changes')
    } finally {
      setIsSavingBulkEdit(false)
    }
  }

  const handleFieldChange = (accountId: string, field: keyof Account, value: any) => {
    setEditedAccounts(prev => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] || {}),
        [field]: value
      }
    }))
  }

  const handleClearSort = () => {
    setSortColumn('accountName')
    setSortDirection('asc')
  }

  const handleResetPagination = () => {
    setPage(1)
  }

  const getFieldValue = (account: Account, field: keyof Account) => {
    if (editedAccounts[account.id]?.[field] !== undefined) {
      return editedAccounts[account.id][field]
    }
    return account[field]
  }

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      // Search filter
      const matchesSearch = 
        account.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.mobile1?.includes(searchQuery) ||
        account.mobile2?.includes(searchQuery) ||
        account.accountGroup?.name.toLowerCase().includes(searchQuery.toLowerCase())

      // Account group filter
      const matchesGroup = 
        accountGroupFilter === 'all' || 
        account.accountGroupId === accountGroupFilter

      // Dr/Cr filter
      const matchesDrCr = 
        drCrFilter === 'all' || 
        account.drCr === drCrFilter

      return matchesSearch && matchesGroup && matchesDrCr
    })
  }, [accounts, searchQuery, accountGroupFilter, drCrFilter])

  // Sort accounts
  const sortedAccounts = useMemo(() => {
    return [...filteredAccounts].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
    
      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1
    
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredAccounts, sortColumn, sortDirection])

  // Paginate
  const totalPages = Math.ceil(sortedAccounts.length / pageSize)
  const paginatedAccounts = useMemo(() => {
    return sortedAccounts.slice(
      (page - 1) * pageSize,
      page * pageSize
    )
  }, [sortedAccounts, page, pageSize])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">No accounts found</p>
        <p className="text-sm text-muted-foreground">Create your first account to get started</p>
      </div>
    )
  }

  const isAllSelected = selectedAccounts.length === filteredAccounts.length && filteredAccounts.length > 0
  
  const hasActiveSort = sortColumn !== 'accountName' || sortDirection !== 'asc'
  const hasFilters = searchQuery !== '' || accountGroupFilter !== 'all' || drCrFilter !== 'all'

  return (
    <div className="flex flex-col gap-4">
      {/* Active Filters/Sort Indicators */}
      {(hasActiveSort || hasFilters || page > 1) && !isBulkEditMode && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active:</span>
          
          {hasActiveSort && (
            <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
              <ArrowUpDown className="h-3 w-3" />
              <span>Sort: {sortColumn} ({sortDirection})</span>
              <button
                onClick={handleClearSort}
                className="ml-1 hover:text-destructive"
                title="Clear sort"
              >
                <FilterX className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {searchQuery && (
            <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
              <span>Search: "{searchQuery}"</span>
            </div>
          )}
          
          {accountGroupFilter !== 'all' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
              <span>Group Filter</span>
            </div>
          )}
          
          {drCrFilter !== 'all' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
              <span>Type: {drCrFilter}</span>
            </div>
          )}
          
          {(hasActiveSort || hasFilters) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleClearSort()
                if (hasFilters && onClearFilters) {
                  onClearFilters()
                }
              }}
              className="h-7 text-xs"
            >
              <FilterX className="h-3 w-3 mr-1" />
              Clear {hasActiveSort && hasFilters ? 'All' : hasActiveSort ? 'Sort' : 'Filters'}
            </Button>
          )}
          
          {page > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetPagination}
              className="h-7 text-xs"
            >
              Reset to Page 1
            </Button>
          )}
        </div>
      )}

      <div className={`rounded-md border ${isBulkEditMode ? 'overflow-x-auto' : ''}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {!isBulkEditMode && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead
                className={!isBulkEditMode ? "cursor-pointer hover:bg-muted/50" : ""}
                onClick={!isBulkEditMode ? () => handleSort('accountName') : undefined}
              >
                Account Name
                {!isBulkEditMode && sortColumn === 'accountName' && (
                  <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              {isBulkEditMode && <TableHead>Code</TableHead>}
              <TableHead>Account Group</TableHead>
              <TableHead
                className={!isBulkEditMode ? "cursor-pointer hover:bg-muted/50" : ""}
                onClick={!isBulkEditMode ? () => handleSort('openingBalance') : undefined}
              >
                Opening Balance
                {!isBulkEditMode && sortColumn === 'openingBalance' && (
                  <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead>Dr/Cr</TableHead>
              {isBulkEditMode && (
                <>
                  <TableHead>Area</TableHead>
                  <TableHead>Sr No</TableHead>
                  <TableHead>CR Limit</TableHead>
                  <TableHead>Name (Lang)</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Address 2</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>PAN No</TableHead>
                  <TableHead>Mobile 1</TableHead>
                  <TableHead>Mobile 2</TableHead>
                  <TableHead>Bank Name 1</TableHead>
                  <TableHead>Account No 1</TableHead>
                  <TableHead>Bank Name 2</TableHead>
                  <TableHead>Account No 2</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Ledger Folio No</TableHead>
                  <TableHead>Audit Upto</TableHead>
                  <TableHead>Bill by Bill</TableHead>
                </>
              )}
              {!isBulkEditMode && <TableHead>Contact</TableHead>}
              {!isBulkEditMode && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAccounts.map((account) => (
              <TableRow
                key={account.id}
                className={!isBulkEditMode ? "cursor-pointer" : ""}
                onDoubleClick={!isBulkEditMode ? () => handleRowDoubleClick(account) : undefined}
              >
                {!isBulkEditMode && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={() => handleToggleSelection(account.id)}
                      aria-label={`Select ${account.accountName}`}
                    />
                  </TableCell>
                )}
                
                {/* Account Name */}
                <TableCell className="font-medium">
                  {isBulkEditMode ? (
                    <Input
                      value={getFieldValue(account, 'accountName') as string}
                      onChange={(e) => handleFieldChange(account.id, 'accountName', e.target.value)}
                      className="h-8 min-w-[200px]"
                    />
                  ) : (
                    account.accountName
                  )}
                </TableCell>

                {/* Code (bulk edit only) */}
                {isBulkEditMode && (
                  <TableCell>
                    <Input
                      value={(getFieldValue(account, 'code') as string) || ''}
                      onChange={(e) => handleFieldChange(account.id, 'code', e.target.value)}
                      className="h-8 min-w-[100px]"
                    />
                  </TableCell>
                )}

                {/* Account Group */}
                <TableCell>
                  {isBulkEditMode ? (
                    <span className="text-sm">{account.accountGroup?.name || '-'}</span>
                  ) : (
                    <span className="text-sm">{account.accountGroup?.name || '-'}</span>
                  )}
                </TableCell>

                {/* Opening Balance */}
                <TableCell>
                  {isBulkEditMode ? (
                    <Input
                      type="number"
                      value={getFieldValue(account, 'openingBalance') as number}
                      onChange={(e) => handleFieldChange(account.id, 'openingBalance', parseFloat(e.target.value) || 0)}
                      className="h-8 min-w-[120px]"
                    />
                  ) : (
                    <span className="font-mono text-sm">
                      ₹{account.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </TableCell>

                {/* Dr/Cr */}
                <TableCell>
                  {isBulkEditMode ? (
                    <Select
                      value={getFieldValue(account, 'drCr') as string}
                      onValueChange={(value) => handleFieldChange(account.id, 'drCr', value)}
                    >
                      <SelectTrigger className="h-8 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dr">Dr</SelectItem>
                        <SelectItem value="Cr">Cr</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={account.drCr === 'Dr' ? 'destructive' : 'default'} className="text-xs">
                      {account.drCr}
                    </Badge>
                  )}
                </TableCell>

                {/* Additional fields in bulk edit mode */}
                {isBulkEditMode && (
                  <>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'area') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'area', e.target.value)}
                        className="h-8 min-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'srNo') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'srNo', e.target.value)}
                        className="h-8 min-w-[100px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={(getFieldValue(account, 'crLimit') as number) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'crLimit', parseFloat(e.target.value) || null)}
                        className="h-8 min-w-[100px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'nameLang') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'nameLang', e.target.value)}
                        className="h-8 min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'address') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'address', e.target.value)}
                        className="h-8 min-w-[200px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'address2') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'address2', e.target.value)}
                        className="h-8 min-w-[200px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'city') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'city', e.target.value)}
                        className="h-8 min-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'state') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'state', e.target.value)}
                        className="h-8 min-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'panNo') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'panNo', e.target.value)}
                        className="h-8 min-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'mobile1') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'mobile1', e.target.value)}
                        className="h-8 min-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'mobile2') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'mobile2', e.target.value)}
                        className="h-8 min-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'bankName1') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'bankName1', e.target.value)}
                        className="h-8 min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'accountNo1') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'accountNo1', e.target.value)}
                        className="h-8 min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'bankName2') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'bankName2', e.target.value)}
                        className="h-8 min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'accountNo2') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'accountNo2', e.target.value)}
                        className="h-8 min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'contactPerson') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'contactPerson', e.target.value)}
                        className="h-8 min-w-[150px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'ledgerFolioNo') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'ledgerFolioNo', e.target.value)}
                        className="h-8 min-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={(getFieldValue(account, 'auditUpto') as string) || ''}
                        onChange={(e) => handleFieldChange(account.id, 'auditUpto', e.target.value)}
                        className="h-8 min-w-[120px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={getFieldValue(account, 'maintainBillByBillBalance') as boolean}
                        onCheckedChange={(checked) => handleFieldChange(account.id, 'maintainBillByBillBalance', checked)}
                      />
                    </TableCell>
                  </>
                )}

                {/* Contact (normal mode only) */}
                {!isBulkEditMode && (
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {account.mobile1 && (
                        <span className="text-sm">{account.mobile1}</span>
                      )}
                      {account.mobile2 && (
                        <span className="text-sm text-muted-foreground">{account.mobile2}</span>
                      )}
                    </div>
                  </TableCell>
                )}

                {/* Actions (normal mode only) */}
                {!isBulkEditMode && (
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-blue-600"
                        onClick={(e) => { e.stopPropagation(); handleRowDoubleClick(account) }}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-orange-600"
                        onClick={(e) => handleEdit(account, e)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive text-red-600"
                        onClick={(e) => handleDelete(account, e)}
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {sortedAccounts.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedAccounts.length)} of {sortedAccounts.length} accounts
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{accountToDelete?.accountName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Modal */}
      <AccountFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        account={accountToEdit}
        onSuccess={() => {
          setEditModalOpen(false)
          setAccountToEdit(null)
        }}
      />

      {/* View Modal - Same as edit but read-only */}
      <AccountFormModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        account={accountToView}
        viewMode
        onSuccess={() => {
          setViewModalOpen(false)
          setAccountToView(null)
        }}
      />
    </div>
  )
}
