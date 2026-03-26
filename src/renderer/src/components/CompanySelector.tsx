import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadCompanies, setActiveCompany } from '@/store/slices/companySlice'
import { clearAllTabs } from '@/store/slices/tabSlice'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Loader2 } from 'lucide-react'

export function CompanySelector() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { activeCompany, companies, loading } = useAppSelector((state) => state.company)
  const [initialized, setInitialized] = useState(false)

  // Load companies on mount
  useEffect(() => {
    if (user?.id && !initialized) {
      dispatch(loadCompanies(user.id))
      setInitialized(true)
    }
  }, [user?.id, initialized, dispatch])

  const handleCompanyChange = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId)
    if (company) {
      // Clear all tabs when switching companies
      dispatch(clearAllTabs())
      dispatch(setActiveCompany(company))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading companies...</span>
      </div>
    )
  }

  if (companies.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>No companies found</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={activeCompany?.id || ''}
        onValueChange={handleCompanyChange}
      >
        <SelectTrigger className="w-[250px] border-0 shadow-none focus:ring-0">
          <SelectValue placeholder="Select company" />
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              <div className="flex flex-col">
                <span className="font-medium">{company.companyName}</span>
                <span className="text-xs text-muted-foreground">{company.fyLabel}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
