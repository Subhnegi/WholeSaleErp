import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setActiveCompany } from '@/store/slices/companySlice'
import { clearAllTabs } from '@/store/slices/tabSlice'
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
import { ChevronLeft, ChevronRight, Loader2, Eye } from 'lucide-react'
import type { Company } from '@/types/company'

interface CompanyTableProps {
  searchQuery: string
}

export function CompanyTable({ searchQuery }: CompanyTableProps) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { companies, loading } = useAppSelector((state) => state.company)
  const [page, setPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<keyof Company>('companyName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const pageSize = 10

  const handleSort = (column: keyof Company) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleRowDoubleClick = (companyId: string) => {
    // Find the company and set it as active
    const company = companies.find((c) => c.id === companyId)
    if (company) {
      // Clear all tabs and set active company (will open Dashboard tab)
      dispatch(clearAllTabs())
      dispatch(setActiveCompany(company))
      // Navigate to company dashboard
      navigate(`/dashboard/${companyId}`)
    }
  }

  const handleViewDashboard = (companyId: string, event: React.MouseEvent) => {
    // Prevent row double-click from firing
    event.stopPropagation()
    
    // Find the company and set it as active
    const company = companies.find((c) => c.id === companyId)
    if (company) {
      // Clear all tabs and set active company (will open Dashboard tab)
      dispatch(clearAllTabs())
      dispatch(setActiveCompany(company))
      // Navigate to company dashboard
      navigate(`/dashboard/${companyId}`)
    }
  }

  // Filter companies by search query
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      return company.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.mobile1?.includes(searchQuery) ||
        company.fyLabel?.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [companies, searchQuery])

  // Sort companies
  const sortedCompanies = useMemo(() => {
    return [...filteredCompanies].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
    
      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1
    
      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredCompanies, sortColumn, sortDirection])

  // Paginate
  const totalPages = Math.ceil(sortedCompanies.length / pageSize)
  const paginatedCompanies = useMemo(() => {
    return sortedCompanies.slice(
      (page - 1) * pageSize,
      page * pageSize
    )
  }, [sortedCompanies, page, pageSize])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">No companies found</p>
        <p className="text-sm text-muted-foreground">Create your first company to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('companyName')}
              >
                Company Name
                {sortColumn === 'companyName' && (
                  <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead>Financial Year</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('createdAt')}
              >
                Created Date
                {sortColumn === 'createdAt' && (
                  <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCompanies.map((company) => (
              <TableRow
                key={company.id}
                className="cursor-pointer"
                onDoubleClick={() => handleRowDoubleClick(company.id)}
              >
                <TableCell className="font-medium">{company.companyName}</TableCell>
                <TableCell>
                  <span className="text-sm">{company.fyLabel}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {company.mobile1 && (
                      <span className="text-sm">{company.mobile1}</span>
                    )}
                    {company.email && (
                      <span className="text-sm text-muted-foreground">{company.email}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="default">
                    Active
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleViewDashboard(company.id, e)}
                    className="h-8 w-8 p-0"
                    title="View Dashboard"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sortedCompanies.length)} of {sortedCompanies.length} companies
          </p>
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
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
