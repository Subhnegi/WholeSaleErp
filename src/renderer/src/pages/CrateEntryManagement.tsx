import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppSelector } from '@/store/hooks'
import { RefreshCw, Printer, Save } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import CrateEntryTab, { type CrateEntryTabRef } from '@/pages/CrateEntryTab'
import { toast } from 'sonner'

interface CrateEntryManagementProps {
  tabId: string
}

export function CrateEntryManagement({ tabId }: CrateEntryManagementProps) {
  const { activeCompany } = useAppSelector(state => state.company)

  const [active, setActive] = useState<'issue' | 'receive'>('issue')
  const [entryDate, setEntryDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [isTransactionActive, setIsTransactionActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Refs for both tabs
  const issueTabRef = useRef<CrateEntryTabRef>(null)
  const receiveTabRef = useRef<CrateEntryTabRef>(null)

  const handleSave = () => {
    if (active === 'issue') {
      issueTabRef.current?.handleSave()
    } else {
      receiveTabRef.current?.handleSave()
    }
  }

  const handleCancel = () => {
    if (active === 'issue') {
      issueTabRef.current?.handleCancel()
    } else {
      receiveTabRef.current?.handleCancel()
    }
  }

  const handleTransactionStateChange = (isActive: boolean, isSubmitting: boolean) => {
    setIsTransactionActive(isActive)
    setSubmitting(isSubmitting)
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      if (active === 'issue') {
        await issueTabRef.current?.handleRefresh()
      } else {
        await receiveTabRef.current?.handleRefresh()
      }
      toast.success('Refreshed')
    } catch (error) {
      console.error('Refresh error:', error)
      toast.error('Failed to refresh')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    toast('Print not implemented', { icon: '🖨️' })
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Crate Entry</h1>
            <p className="text-sm text-muted-foreground">Company: {activeCompany?.companyName || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Date</Label>
          <Input
            type="date"
            value={entryDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const val = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (val > today) return
              setEntryDate(val)
            }}
            className="w-40"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrint}
            title="Print"
          >
            <Printer className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting || !isTransactionActive}
            variant="default"
          >
            <Save className="h-4 w-4 mr-2" />
            {submitting ? 'Saving...' : 'Save'}
          </Button>
          {isTransactionActive && (
            <Button
              onClick={handleCancel}
              variant="outline"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-6 pb-24">
          <div className="max-w-[1400px] mx-auto">
            <Tabs defaultValue={active} onValueChange={(v) => setActive(v as 'issue' | 'receive')}>
              <TabsList className="grid w-full grid-cols-2 rounded-none bg-gray-100">
                <TabsTrigger value="issue" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Crate Issue</TabsTrigger>
                <TabsTrigger value="receive" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Crate Receive</TabsTrigger>
              </TabsList>

              <TabsContent value="issue" className="mt-0">
                <CrateEntryTab 
                  ref={issueTabRef}
                  tabId={tabId} 
                  mode="issue" 
                  entryDate={entryDate}
                  onTransactionStateChange={handleTransactionStateChange}
                />
              </TabsContent>

              <TabsContent value="receive" className="mt-0">
                <CrateEntryTab 
                  ref={receiveTabRef}
                  tabId={tabId} 
                  mode="receive" 
                  entryDate={entryDate}
                  onTransactionStateChange={handleTransactionStateChange}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CrateEntryManagement
