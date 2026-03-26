import { useState, useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { startTabTransaction, endTabTransaction } from '@/store/slices/tabSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {  RefreshCw, Plus, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { ArrivalBookTable } from '@/components/ArrivalBookTable'
import type { Arrival } from '@/types/arrival'

// Simple date formatting helper
const formatDateToISO = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface ArrivalBookManagementProps {
  tabId: string
}

export function ArrivalBookManagement({ tabId }: ArrivalBookManagementProps) {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((state) => state.company)
  const dispatch = useAppDispatch()

  // State
  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Handle from date change with validation
  const handleFromDateChange = (newFromDate: string) => {
    const today = new Date().toISOString().split('T')[0]
    if (newFromDate > today) {
      toast.error('Date cannot be in the future')
      return
    }
    if (toDate && new Date(newFromDate) > new Date(toDate)) {
      toast.error('From date cannot be greater than to date')
      return
    }
    setFromDate(newFromDate)
  }

  // Handle to date change with validation
  const handleToDateChange = (newToDate: string) => {
    const today = new Date().toISOString().split('T')[0]
    if (newToDate > today) {
      toast.error('Date cannot be in the future')
      return
    }
    if (fromDate && new Date(newToDate) < new Date(fromDate)) {
      toast.error('To date cannot be less than from date')
      return
    }
    setToDate(newToDate)
  }

  // Initialize dates from localStorage or use today as default
  useEffect(() => {
    const today = new Date()
    const todayStr = formatDateToISO(today)
    const savedFromDate = localStorage.getItem('arrivalBookFromDate')
    const savedToDate = localStorage.getItem('arrivalBookToDate')
    
    // Use saved dates if available, otherwise default to today
    // This ensures the user's selected date range persists during the session
    if (savedFromDate && savedToDate) {
      setFromDate(savedFromDate)
      setToDate(savedToDate)
    } else {
      setFromDate(todayStr)
      setToDate(todayStr)
    }
  }, [])

  // Save dates to localStorage when they change
  useEffect(() => {
    if (fromDate) {
      localStorage.setItem('arrivalBookFromDate', fromDate)
    }
  }, [fromDate])

  useEffect(() => {
    if (toDate) {
      localStorage.setItem('arrivalBookToDate', toDate)
    }
  }, [toDate])

  // Redirect if no company selected
  useEffect(() => {
    if (!activeCompany) {
      toast.error('Please select a company first')
      navigate('/dashboard')
    }
  }, [activeCompany, navigate])

  // Auto-load arrivals when dates are set and company is active
  useEffect(() => {
    if (activeCompany && fromDate && toDate) {
      loadArrivals()
    }
  }, [activeCompany, fromDate, toDate])

  // Keyboard shortcut: Ctrl+N to create new arrival
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        handleCreate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadArrivals = async () => {
    if (!activeCompany) return

    setLoading(true)
    try {
      const response = await window.api.arrival.list(activeCompany.id, {
        startDate: fromDate || undefined,
        endDate: toDate || undefined,
      })
      if (response.success && response.data) {
        setArrivals(response.data)
      } else {
        toast.error(response.error || 'Failed to load arrivals')
      }
    } catch (error: any) {
      console.error('Load arrivals error:', error)
      toast.error(error.message || 'An error occurred while loading arrivals')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadArrivals()
  }

  const handleCreate = () => {
    navigate('/entries/arrival-book/new')
  }

  const handleView = (arrival: Arrival) => {
    navigate(`/entries/arrival-book/edit/${arrival.id}`)
  }

  const handleDelete = async (id: string) => {
    try {
      // Indicate transaction started on this tab
      dispatch(startTabTransaction({ tabId, transactionType: 'arrival' }))
      const response = await window.api.arrival.delete(id)
      if (response.success) {
        toast.success('Arrival deleted successfully')
        dispatch(endTabTransaction({ tabId, saved: true }))
        loadArrivals()
      } else {
        dispatch(endTabTransaction({ tabId, saved: false }))
        toast.error(response.error || 'Failed to delete arrival')
      }
    } catch (error: any) {
      dispatch(endTabTransaction({ tabId, saved: false }))
      console.error('Delete error:', error)
      toast.error(error.message || 'An error occurred while deleting')
    }
  }

  const handleBulkDelete = async (ids: string[]) => {
    try {
      dispatch(startTabTransaction({ tabId, transactionType: 'arrival' }))
      const response = await window.api.arrival.bulkDelete(ids)
      
      if (response.success) {
        const data = response.data
        if (data && (data.deletedCount ?? 0) > 0) {
          toast.success(`${data.deletedCount} arrival(s) deleted successfully`)
        }
        if (data && (data.failedCount ?? 0) > 0) {
          toast.error(`Failed to delete ${data.failedCount} arrival(s)`)
        }
        loadArrivals()
        dispatch(endTabTransaction({ tabId, saved: (data?.deletedCount ?? 0) > 0 }))
      } else {
        dispatch(endTabTransaction({ tabId, saved: false }))
        toast.error(response.error || 'Failed to delete arrivals')
      }
    } catch (error: any) {
      dispatch(endTabTransaction({ tabId, saved: false }))
      console.error('Bulk delete error:', error)
      toast.error(error.message || 'An error occurred while deleting')
    }
  }

  const handlePrint = () => {
    toast.info('Print functionality coming soon')
  }

  if (!activeCompany) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header - Similar to Daily Sale */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Arrival Book</h1>
            <p className="text-sm text-muted-foreground">Company: {activeCompany.companyName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">From Date</Label>
          <Input
            type="date"
            value={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => handleFromDateChange(e.target.value)}
            className="w-40"
          />
          <Label className="text-sm font-medium">To Date</Label>
          <Input
            type="date"
            value={toDate}
            min={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => handleToDateChange(e.target.value)}
            className="w-40"
          />
          
          <Button onClick={handleCreate} disabled={loading} size="lg" variant="cta">
            <Plus className="h-4 w-4" />
            <span className="flex flex-col items-center text-sm">
              New
              <span className="text-[10px] text-muted-foreground">(Ctrl+N)</span>
            </span>
          </Button>
          
          <Button variant="outline-blue" onClick={handlePrint} title="Print">
            <Printer className="h-4 w-4 mr-2 text-blue-600" />
            Print
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-full">
          <ArrivalBookTable
            arrivals={arrivals}
            loading={loading}
            onView={handleView}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
          />
        </div>
      </div>
    </div>
  )
}
