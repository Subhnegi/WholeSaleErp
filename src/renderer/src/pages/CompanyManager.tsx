import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadCompanies } from '@/store/slices/companySlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CompanyTable } from '@/components/CompanyTable'
import { CompanyFormModal } from '@/components/CompanyFormModal'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function CompanyManager() {
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { loading } = useAppSelector((state) => state.company)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Load companies on mount
  useEffect(() => {
    if (user?.id) {
      dispatch(loadCompanies(user.id))
    }
  }, [user?.id, dispatch])

  const handleRefresh = async () => {
    if (user?.id) {
      const result = await dispatch(loadCompanies(user.id))
      if (loadCompanies.fulfilled.match(result)) {
        toast.success('Companies refreshed')
      } else {
        toast.error('Failed to refresh companies')
      }
    }
  }

  const handleCompanyCreated = () => {
    setIsCreateModalOpen(false)
    if (user?.id) {
      dispatch(loadCompanies(user.id))
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background px-6 py-4">
        <h1 className="text-2xl font-bold">Company Management</h1>
      </header>

      {/* Action Bar */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Input
            type="search"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Company
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-6">
        <CompanyTable searchQuery={searchQuery} />
      </main>

      {/* Modal */}
      <CompanyFormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={handleCompanyCreated}
      />
    </div>
  )
}
