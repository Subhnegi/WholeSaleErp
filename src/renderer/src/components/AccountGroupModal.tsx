import { useState, useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  createAccountGroup,
  updateAccountGroup,
  deleteAccountGroup,
  bulkDeleteAccountGroups
} from '@/store/slices/accountSlice'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Edit, Trash2, Folder, FolderTree, Upload, Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, FilterX } from 'lucide-react'
import { toast } from 'sonner'
import type { AccountGroup, AccountGroupFormData } from '@/types/account'
import * as XLSX from 'xlsx'

interface AccountGroupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AccountGroupModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: AccountGroupModalProps) {
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  const { accountGroups, groupsLoading } = useAppSelector((state) => state.account)
  
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingGroup, setEditingGroup] = useState<AccountGroup | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<AccountGroup | null>(null)
  const [importing, setImporting] = useState(false)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const isInitialMount = useRef(true)
  
  // Search, sort, pagination, filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'level' | 'accounts'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [filterLevel, setFilterLevel] = useState<'all' | '0' | '1' | '2'>('all')
  
  const [formData, setFormData] = useState<AccountGroupFormData>({
    name: '',
    parentGroupId: undefined,
    companyId: ''
  })

  useEffect(() => {
    if (activeCompany) {
      setFormData(prev => ({ ...prev, companyId: activeCompany.id }))
    }
  }, [activeCompany])

  useEffect(() => {
    if (editingGroup) {
      const parentId = editingGroup.parentGroupId ?? undefined
      console.log('Setting edit mode:', {
        groupName: editingGroup.name,
        parentGroupId: editingGroup.parentGroupId,
        parentIdConverted: parentId,
        parentGroupIdOrNone: parentId || 'none'
      })
      isInitialMount.current = true // Mark as initial mount
      setFormData({
        name: editingGroup.name,
        parentGroupId: parentId,
        companyId: editingGroup.companyId
      })
    } else {
      isInitialMount.current = true // Mark as initial mount for create mode
      setFormData({
        name: '',
        parentGroupId: undefined,
        companyId: activeCompany?.id || ''
      })
    }
  }, [editingGroup, activeCompany])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      toast.error('Please enter a group name')
      return
    }

    if (!activeCompany) {
      toast.error('No active company selected')
      return
    }

    try {
      let result
      if (mode === 'edit' && editingGroup) {
        console.log('Updating account group:', { id: editingGroup.id, data: { name: formData.name, parentGroupId: formData.parentGroupId } })
        result = await dispatch(updateAccountGroup({
          id: editingGroup.id,
          data: {
            name: formData.name,
            parentGroupId: formData.parentGroupId
          }
        }))
      } else {
        const createData = {
          name: formData.name,
          parentGroupId: formData.parentGroupId,
          companyId: activeCompany.id
        }
        console.log('Creating account group:', createData)
        result = await dispatch(createAccountGroup(createData))
        console.log('Create result:', result)
      }

      if ((mode === 'edit' && updateAccountGroup.fulfilled.match(result)) ||
          (mode === 'create' && createAccountGroup.fulfilled.match(result))) {
        toast.success(mode === 'edit' ? 'Group updated successfully' : 'Group created successfully')
        setMode('list')
        setEditingGroup(null)
        onSuccess?.()
      } else {
        console.error('Action failed:', result)
        const errorMessage = result.payload || result.error?.message || 'Unknown error'
        toast.error(mode === 'edit' ? `Failed to update group: ${errorMessage}` : `Failed to create group: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Exception in handleSubmit:', error)
      toast.error('An error occurred')
    }
  }

  const handleEdit = (group: AccountGroup) => {
    setEditingGroup(group)
    setMode('edit')
  }

  const handleDelete = (group: AccountGroup) => {
    setGroupToDelete(group)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!groupToDelete) return
    
    const result = await dispatch(deleteAccountGroup(groupToDelete.id))
    if (deleteAccountGroup.fulfilled.match(result)) {
      toast.success('Group deleted successfully')
      setDeleteConfirmOpen(false)
      setGroupToDelete(null)
      onSuccess?.()
    } else {
      toast.error('Failed to delete group. It may have child groups or accounts.')
    }
  }

  const handleToggleSelection = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all groups in the current filtered/sorted view
      setSelectedGroups(getSortedGroups().map(g => g.id))
    } else {
      setSelectedGroups([])
    }
  }

  const handleBulkDelete = async () => {
    const result = await dispatch(bulkDeleteAccountGroups(selectedGroups))
    if (bulkDeleteAccountGroups.fulfilled.match(result) && result.payload) {
      const { deletedCount, failedCount, errors } = result.payload
      
      if (deletedCount > 0) {
        toast.success(`${deletedCount} group(s) deleted successfully`)
      }
      
      if (failedCount > 0 && errors.length > 0) {
        toast.error(`Failed to delete ${failedCount} group(s): ${errors.join(', ')}`)
      }
      
      setShowBulkDeleteConfirm(false)
      setSelectedGroups([])
      onSuccess?.()
    } else {
      toast.error('Failed to delete groups')
    }
  }

  const handleImport = async () => {
    if (!activeCompany) {
      toast.error('No active company selected')
      return
    }

    setImporting(true)
    
    // Create file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.xlsx,.xls'
    
    // Handle cancel/abort
    const handleCancel = () => {
      setImporting(false)
      input.remove()
    }
    
    input.oncancel = handleCancel
    input.addEventListener('cancel', handleCancel)
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        setImporting(false)
        input.remove()
        return
      }

      try {
        let importedData: any[] = []
        
        // Check file type and parse accordingly
        const fileExtension = file.name.split('.').pop()?.toLowerCase()
        
        if (fileExtension === 'csv') {
          const text = await file.text()
          importedData = parseCSV(text)
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          const buffer = await file.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          importedData = XLSX.utils.sheet_to_json(worksheet)
        } else {
          toast.error('Unsupported file format. Please use CSV or XLSX.')
          setImporting(false)
          return
        }

        console.log('Imported data:', importedData)
        console.log('First row:', importedData[0])

        if (importedData.length === 0) {
          toast.error('No data found in file')
          setImporting(false)
          input.remove()
          return
        }

        // Trim all string values in imported data
        importedData = importedData.map(row => {
          const trimmedRow: any = {}
          for (const key in row) {
            const value = row[key]
            trimmedRow[key] = typeof value === 'string' ? value.trim() : value
          }
          return trimmedRow
        })

        // Process and import groups in multiple passes
        // Pass 1: Create all primary groups (groups without parent)
        const createdGroups: Map<string, string> = new Map() // name -> id (stores all created groups)
        const processedGroups: Set<string> = new Set() // Track which groups we've already processed
        let successCount = 0
        let errorCount = 0

        // Pass 1: Create primary groups (Primary = Y)
        console.log('Starting Pass 1 - Primary groups')
        for (const row of importedData) {
          const groupName = row['Group'] || row.Group
          const isPrimary = (row['Primary'] || row.Primary || '').toUpperCase() === 'Y'
          
          console.log('Pass 1 Processing row:', { groupName, isPrimary, row })
          
          if (!groupName) {
            console.log('Skipping row - no group name')
            continue
          }
          
          if (isPrimary) {
            const normalizedName = groupName.trim().toLowerCase()
            if (processedGroups.has(normalizedName)) {
              continue // Already processed
            }
            
            try {
              const groupData: AccountGroupFormData = {
                name: groupName,
                parentGroupId: undefined,
                companyId: activeCompany.id
              }

              const result = await dispatch(createAccountGroup(groupData))
              if (createAccountGroup.fulfilled.match(result)) {
                createdGroups.set(normalizedName, result.payload.id)
                processedGroups.add(normalizedName)
                successCount++
                console.log(`Created primary group: ${groupName} with ID: ${result.payload.id}`)
              } else {
                errorCount++
                console.warn(`Failed to create primary group: ${groupName}`)
              }
            } catch (err) {
              console.error('Error creating primary group:', err)
              errorCount++
            }
          }
        }

        // Pass 2: Create level 1 child groups (children of primary groups)
        console.log('Starting Pass 2 - Level 1 child groups')
        for (const row of importedData) {
          const groupName = row['Group'] || row.Group
          const isPrimary = (row['Primary'] || row.Primary || '').toUpperCase() === 'Y'
          const undergroup = row['Undergroup'] || row.undergroup
          
          console.log('Pass 2 row:', { groupName, isPrimary, undergroup })
          
          if (!groupName || isPrimary || !undergroup) {
            console.log('Skipping - no name, is primary, or no undergroup')
            continue
          }
          
          const normalizedName = groupName.trim().toLowerCase()
          if (processedGroups.has(normalizedName)) {
            continue // Already processed
          }
          
          try {
            // Find parent group ID
            let parentGroupId: string | undefined = undefined
            const normalizedUndergroup = undergroup.trim().toLowerCase()
            
            // Check in created groups
            parentGroupId = createdGroups.get(normalizedUndergroup)
            
            // If not found, search in existing groups (case-insensitive)
            if (!parentGroupId) {
              const existingParent = accountGroups.find(g => 
                g.name.trim().toLowerCase() === normalizedUndergroup
              )
              parentGroupId = existingParent?.id
            }

            if (!parentGroupId) {
              // Parent not found yet - defer to next pass
              console.log(`Parent not found yet, deferring: ${groupName} (parent: ${undergroup})`)
              continue
            }

            const groupData: AccountGroupFormData = {
              name: groupName,
              parentGroupId,
              companyId: activeCompany.id
            }

            const result = await dispatch(createAccountGroup(groupData))
            if (createAccountGroup.fulfilled.match(result)) {
              createdGroups.set(normalizedName, result.payload.id)
              processedGroups.add(normalizedName)
              successCount++
              console.log(`Created level 1 group: ${groupName} with ID: ${result.payload.id}`)
            } else {
              errorCount++
            }
          } catch (err) {
            console.error('Error creating level 1 child group:', err)
            errorCount++
          }
        }

        // Pass 3: Create level 2 child groups (children of level 1 groups)
        console.log('Starting Pass 3 - Level 2 child groups')
        for (const row of importedData) {
          const groupName = row['Group'] || row.Group
          const isPrimary = (row['Primary'] || row.Primary || '').toUpperCase() === 'Y'
          const undergroup = row['Undergroup'] || row.undergroup
          
          console.log('Pass 3 row:', { groupName, isPrimary, undergroup })
          
          if (!groupName || isPrimary || !undergroup) {
            continue
          }
          
          const normalizedName = groupName.trim().toLowerCase()
          if (processedGroups.has(normalizedName)) {
            continue // Already processed in earlier pass
          }
          
          const normalizedUndergroup = undergroup.trim().toLowerCase()
          
          try {
            // Find parent group ID
            let parentGroupId: string | undefined = createdGroups.get(normalizedUndergroup)
            
            // If not found, search in existing groups
            if (!parentGroupId) {
              const existingParent = accountGroups.find(g => 
                g.name.trim().toLowerCase() === normalizedUndergroup
              )
              parentGroupId = existingParent?.id
            }

            if (!parentGroupId) {
              console.warn(`Parent group not found: ${undergroup} for group: ${groupName}`)
              errorCount++
              continue
            }

            const groupData: AccountGroupFormData = {
              name: groupName,
              parentGroupId,
              companyId: activeCompany.id
            }

            const result = await dispatch(createAccountGroup(groupData))
            if (createAccountGroup.fulfilled.match(result)) {
              createdGroups.set(normalizedName, result.payload.id)
              processedGroups.add(normalizedName)
              successCount++
              console.log(`Created level 2 group: ${groupName} with ID: ${result.payload.id}`)
            } else {
              errorCount++
            }
          } catch (err) {
            console.error('Error creating level 2 child group:', err)
            errorCount++
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} groups${errorCount > 0 ? `, ${errorCount} failed` : ''}`)
          onSuccess?.()
        } else {
          toast.error(`Failed to import groups. ${errorCount} errors occurred.`)
        }
      } catch (error) {
        toast.error('Failed to import groups. Please check the file format.')
        console.error(error)
      } finally {
        setImporting(false)
        input.remove()
      }
    }
    
    // Cleanup on component unmount or when dialog closes
    setTimeout(() => {
      if (!input.files || input.files.length === 0) {
        setImporting(false)
        input.remove()
      }
    }, 100)
    
    input.click()
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []
    
    const headers = lines[0].split(',').map(h => h.trim())
    
    return lines.slice(1).map(line => {
      const values: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())
      
      const obj: any = {}
      headers.forEach((header, index) => {
        obj[header] = values[index] || ''
      })
      return obj
    })
  }

  const downloadTemplate = () => {
    // Create a template CSV with sample data
    const templateData = [
      {
        'Group': 'Sample Primary Group',
        'Under': '',
        'Primary': 'Y'
      },
      {
        'Group': 'Sample Sub Group',
        'Under': 'Sample Primary Group',
        'Primary': 'N'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Groups')
    
    const csv = XLSX.utils.sheet_to_csv(worksheet)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'account-groups-template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success('Account group template downloaded')
  }

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (accountGroups.length === 0) {
      toast.error('No groups to export')
      return
    }

    // Prepare export data in the import format
    const exportData = accountGroups.map(group => {
      // Find parent group name if exists
      const parentGroup = group.parentGroupId 
        ? accountGroups.find(g => g.id === group.parentGroupId)
        : null

      return {
        'Group': group.name,
        'Primary': !group.parentGroupId ? 'Y' : 'N',
        'Undergroup': parentGroup ? parentGroup.name : ''
      }
    })

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Group', 'Primary', 'Undergroup']
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row] || ''
            // Escape quotes and wrap in quotes if contains comma
            return value.toString().includes(',') 
              ? `"${value.toString().replace(/"/g, '""')}"` 
              : value
          }).join(',')
        )
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `account_groups_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(`Exported ${exportData.length} groups to CSV`)
    } else if (format === 'xlsx') {
      // Generate XLSX
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Groups')
      
      XLSX.writeFile(workbook, `account_groups_${new Date().toISOString().split('T')[0]}.xlsx`)
      
      toast.success(`Exported ${exportData.length} groups to Excel`)
    }
  }

  const handleCancel = () => {
    setMode('list')
    setEditingGroup(null)
  }

  // Get root groups (no parent)
  const rootGroups = accountGroups.filter(g => !g.parentGroupId)
  
  // Get child groups for a parent
  const getChildGroups = (parentId: string) => {
    return accountGroups.filter(g => g.parentGroupId === parentId)
  }

  // Get group level (0 = root, 1 = child, 2 = grandchild)
  const getGroupLevel = (group: AccountGroup): number => {
    if (!group.parentGroupId) return 0
    const parent = accountGroups.find(g => g.id === group.parentGroupId)
    if (!parent) return 1
    return parent.parentGroupId ? 2 : 1
  }

  // Get available parent groups based on current group being edited
  const getAvailableParentGroups = () => {
    if (!editingGroup) {
      // Creating new group - can select root or level 1 groups
      return accountGroups.filter(g => getGroupLevel(g) <= 1)
    }
    
    // If editing root or level 1, can select root or level 1 as parent
    // But cannot select itself or its children
    const childIds = getChildGroups(editingGroup.id).map(c => c.id)
    return accountGroups.filter(g => 
      getGroupLevel(g) <= 1 && 
      g.id !== editingGroup.id && 
      !childIds.includes(g.id)
    )
  }

  // Clear filters and sort
  const handleClearSort = () => {
    setSortBy('name')
    setSortOrder('asc')
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setFilterLevel('all')
  }

  const handleResetPagination = () => {
    setCurrentPage(1)
  }

  // Flatten all groups for table display with hierarchy info
  const getAllGroupsFlattened = () => {
    const flattened: Array<AccountGroup & { level: number; parentName?: string }> = []
    
    rootGroups.forEach(root => {
      flattened.push({ ...root, level: 0 })
      
      const level1Children = getChildGroups(root.id)
      level1Children.forEach(child => {
        flattened.push({ ...child, level: 1, parentName: root.name })
        
        const level2Children = getChildGroups(child.id)
        level2Children.forEach(grandchild => {
          flattened.push({ ...grandchild, level: 2, parentName: child.name })
        })
      })
    })
    
    return flattened
  }

  // Apply search filter
  const getFilteredGroups = () => {
    let groups = getAllGroupsFlattened()
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      groups = groups.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.parentName?.toLowerCase().includes(query)
      )
    }
    
    // Level filter
    if (filterLevel !== 'all') {
      groups = groups.filter(g => g.level === parseInt(filterLevel))
    }
    
    return groups
  }

  // Apply sorting
  const getSortedGroups = () => {
    const groups = getFilteredGroups()
    
    return [...groups].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'level':
          comparison = a.level - b.level
          break
        case 'accounts':
          comparison = (a._count?.accounts || 0) - (b._count?.accounts || 0)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  // Apply pagination
  const getPaginatedGroups = () => {
    const sorted = getSortedGroups()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return sorted.slice(startIndex, endIndex)
  }

  const totalPages = Math.ceil(getSortedGroups().length / itemsPerPage)
  const paginatedGroups = getPaginatedGroups()

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterLevel, sortBy, sortOrder])

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setMode('list')
          setEditingGroup(null)
        }
        onOpenChange(isOpen)
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 pb-0">
            <DialogHeader>
              <DialogTitle>
                {mode === 'list' ? 'Manage Account Groups' : mode === 'create' ? 'Create Account Group' : 'Edit Account Group'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'list' 
                  ? 'View and manage your account groups. Maximum 2 levels of nesting allowed.'
                  : 'Fill in the group information below'
                }
              </DialogDescription>
            </DialogHeader>
          </div>

          {mode === 'list' ? (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Fixed Header Section */}
              <div className="px-6 space-y-4 shrink-0">
                {/* Action Buttons */}
                <div className="flex justify-between items-center gap-2">
                  <div>
                    {selectedGroups.length > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setShowBulkDeleteConfirm(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedGroups.length})
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={downloadTemplate}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                    <Button 
                      variant="outline-green" 
                      onClick={handleImport}
                      disabled={importing}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {importing ? 'Importing...' : 'Import Groups'}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline-green">
                          <Download className="mr-2 h-4 w-4" />
                          Export Groups
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleExport('csv')}>
                          Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                          Export as Excel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => setMode('create')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Group
                    </Button>
                  </div>
                </div>

                {/* Search and Filter Controls */}
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search groups..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={filterLevel} onValueChange={(v: any) => setFilterLevel(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="0">Root Only</SelectItem>
                      <SelectItem value="1">Level 1 Only</SelectItem>
                      <SelectItem value="2">Level 2 Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="level">Level</SelectItem>
                      <SelectItem value="accounts">Account Count</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Active Filters/Sort Indicators */}
                {(searchQuery || filterLevel !== 'all' || sortBy !== 'name' || sortOrder !== 'asc' || currentPage > 1) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Active:</span>
                    
                    {(sortBy !== 'name' || sortOrder !== 'asc') && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <ArrowUpDown className="h-3 w-3" />
                        <span>Sort: {sortBy} ({sortOrder})</span>
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
                    
                    {filterLevel !== 'all' && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                        <span>Level: {filterLevel === '0' ? 'Root' : `Level ${filterLevel}`}</span>
                      </div>
                    )}
                    
                    {(searchQuery || filterLevel !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-7 text-xs"
                      >
                        <FilterX className="h-3 w-3 mr-1" />
                        Clear Filters
                      </Button>
                    )}
                    
                    {currentPage > 1 && (
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
              </div>

              {/* Scrollable Table Content */}
              <div className="flex-1 overflow-y-auto px-6 pb-4">
                <div className="rounded-md border mt-4">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedGroups.length === getSortedGroups().length && getSortedGroups().length > 0}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead>Group Name</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Accounts</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedGroups.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No groups found
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedGroups.map((group) => (
                          <TableRow key={group.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedGroups.includes(group.id)}
                                onCheckedChange={() => handleToggleSelection(group.id)}
                                aria-label={`Select ${group.name}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2" style={{ paddingLeft: `${group.level * 32}px` }}>
                                {group.level === 0 ? <FolderTree className="h-4 w-4" /> : <Folder className={`h-${group.level === 2 ? '3' : '4'} w-${group.level === 2 ? '3' : '4'}`} />}
                                {group.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {group.level === 0 ? 'Root' : `Level ${group.level}${group.parentName ? ` (under ${group.parentName})` : ''}`}
                            </TableCell>
                            <TableCell>{group._count?.accounts || 0}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(group)}
                                >
                                  <Edit className="h-4 w-4 text-blue-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(group)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Fixed Pagination Footer */}
              <div className="px-6 py-4 border-t shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {paginatedGroups.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, getSortedGroups().length)} of {getSortedGroups().length} groups
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          setItemsPerPage(Number(value))
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger className="h-8 w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {totalPages || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} key={editingGroup?.id || 'new'} className="px-6">
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="groupName">
                    Group Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="groupName"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="parentGroup">Parent Group (Optional)</Label>
                  <Select
                    value={formData.parentGroupId || 'none'}
                    onValueChange={(value) => {
                      console.log('Parent group changed to:', value, 'isInitialMount:', isInitialMount.current)
                      // Skip the first onChange triggered by initial render
                      if (isInitialMount.current) {
                        isInitialMount.current = false
                        return
                      }
                      if (value !== undefined && value !== null) {
                        setFormData(prev => ({ 
                          ...prev, 
                          parentGroupId: value === 'none' ? undefined : value 
                        }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (Root Group)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Root Group)</SelectItem>
                      {getAvailableParentGroups().map((group) => {
                        const level = getGroupLevel(group)
                        const prefix = level === 1 ? '  ↳ ' : ''
                        return (
                          <SelectItem key={group.id} value={group.id}>
                            {prefix}{group.name}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Maximum 2 levels of nesting allowed (Root → Level 1 → Level 2)
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={groupsLoading}>
                  {groupsLoading ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{groupToDelete?.name}"? This action cannot be undone.
              The group must not have any child groups or accounts.
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedGroups.length} Group(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the selected groups? This action cannot be undone.
              Groups with child groups or associated accounts cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
