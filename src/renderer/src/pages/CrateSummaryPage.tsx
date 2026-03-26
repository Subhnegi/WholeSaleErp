import { useEffect, useState, useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Printer, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type CrateMarka = {
  id: string
  crateMarkaName: string
  opQty: number
  cost: number
}

type Account = {
  id: string
  accountName: string
}

type CrateDetail = {
  crateMarkaId: string
  crateMarkaName: string
  issued: number
  received: number
  balance: number
}

type PartySummary = {
  accountId: string
  accountName: string
  totalIssued: number
  totalReceived: number
  totalBalance: number
  crateDetails: CrateDetail[]
}

export function CrateSummaryPage() {
  const navigate = useNavigate()
  const { activeCompany } = useAppSelector((s) => s.company)

  // Date range state
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])

  // Data state
  const [crateIssueEntries, setCrateIssueEntries] = useState<any[]>([])
  const [crateReceiveEntries, setCrateReceiveEntries] = useState<any[]>([])
  const [crateMarkas, setCrateMarkas] = useState<CrateMarka[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')

  // Expansion state for collapsible rows
  const [expandedParties, setExpandedParties] = useState<Set<string>>(new Set())

  // Load master data
  useEffect(() => {
    if (!activeCompany) return
    const loadMasters = async () => {
      const [markasResp, accsResp] = await Promise.all([
        window.api.crate.listByCompany(activeCompany.id),
        window.api.account.listByCompany(activeCompany.id)
      ])
      if (markasResp.success && markasResp.data) {
        setCrateMarkas(markasResp.data)
      }
      if (accsResp.success && accsResp.data) {
        setAccounts(accsResp.data)
      }
    }
    loadMasters()
  }, [activeCompany])

  // Load transactions
  const loadTransactions = async () => {
    if (!activeCompany) return
    setLoading(true)
    try {
      const [issuesResp, receivesResp] = await Promise.all([
        window.api.crateIssue.listByCompany(activeCompany.id),
        window.api.crateReceive.listByCompany(activeCompany.id)
      ])
      if (issuesResp.success && issuesResp.data) {
        setCrateIssueEntries(issuesResp.data)
      }
      if (receivesResp.success && receivesResp.data) {
        setCrateReceiveEntries(receivesResp.data)
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (crateMarkas.length > 0) {
      loadTransactions()
    }
  }, [activeCompany, crateMarkas])

  // Calculate party-wise summary
  const partySummaries = useMemo(() => {
    if (crateIssueEntries.length === 0 && crateReceiveEntries.length === 0) return []

    // Build account -> crate marka -> { issued, received } map
    const accountCrateMap: Record<string, Record<string, { issued: number; received: number }>> = {}

    // Process issue entries
    crateIssueEntries.forEach((entry) => {
      const dateStr = entry.issueDate ? entry.issueDate.split('T')[0] : ''
      if (dateStr < fromDate || dateStr > toDate) return

      entry.items?.forEach((item) => {
        if (!item.accountId || !item.crateMarkaId) return
        
        if (!accountCrateMap[item.accountId]) {
          accountCrateMap[item.accountId] = {}
        }
        if (!accountCrateMap[item.accountId][item.crateMarkaId]) {
          accountCrateMap[item.accountId][item.crateMarkaId] = { issued: 0, received: 0 }
        }
        accountCrateMap[item.accountId][item.crateMarkaId].issued += item.qty || 0
      })
    })

    // Process receive entries
    crateReceiveEntries.forEach((entry) => {
      const dateStr = entry.receiveDate ? entry.receiveDate.split('T')[0] : ''
      if (dateStr < fromDate || dateStr > toDate) return

      entry.items?.forEach((item) => {
        if (!item.accountId || !item.crateMarkaId) return
        
        if (!accountCrateMap[item.accountId]) {
          accountCrateMap[item.accountId] = {}
        }
        if (!accountCrateMap[item.accountId][item.crateMarkaId]) {
          accountCrateMap[item.accountId][item.crateMarkaId] = { issued: 0, received: 0 }
        }
        accountCrateMap[item.accountId][item.crateMarkaId].received += item.qty || 0
      })
    })

    // Build party summaries
    const summaries: PartySummary[] = []

    for (const accountId of Object.keys(accountCrateMap)) {
      const account = accounts.find((a) => a.id === accountId)
      if (!account) continue

      const crateDetails: CrateDetail[] = []
      let totalIssued = 0
      let totalReceived = 0

      for (const crateMarkaId of Object.keys(accountCrateMap[accountId])) {
        const { issued, received } = accountCrateMap[accountId][crateMarkaId]
        const marka = crateMarkas.find((m) => m.id === crateMarkaId)
        if (!marka) continue

        const balance = issued - received

        crateDetails.push({
          crateMarkaId,
          crateMarkaName: marka.crateMarkaName,
          issued,
          received,
          balance
        })

        totalIssued += issued
        totalReceived += received
      }

      const totalBalance = totalIssued - totalReceived

      // Sort crate details by name
      crateDetails.sort((a, b) => a.crateMarkaName.localeCompare(b.crateMarkaName))

      summaries.push({
        accountId,
        accountName: account.accountName,
        totalIssued,
        totalReceived,
        totalBalance,
        crateDetails
      })
    }

    // Sort by account name
    summaries.sort((a, b) => a.accountName.localeCompare(b.accountName))

    return summaries
  }, [crateIssueEntries, crateReceiveEntries, crateMarkas, accounts, fromDate, toDate])

  // Filter by search query
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return partySummaries

    const q = searchQuery.toLowerCase()
    return partySummaries.filter((ps) => {
      // Match account name
      if (ps.accountName.toLowerCase().includes(q)) return true
      // Match any crate marka name
      return ps.crateDetails.some((cd) => cd.crateMarkaName.toLowerCase().includes(q))
    })
  }, [partySummaries, searchQuery])

  // Grand totals
  const grandTotals = useMemo(() => {
    return filteredSummaries.reduce(
      (acc, ps) => {
        acc.issued += ps.totalIssued
        acc.received += ps.totalReceived
        acc.balance += ps.totalBalance
        return acc
      },
      { issued: 0, received: 0, balance: 0 }
    )
  }, [filteredSummaries])

  // Toggle expansion
  const toggleExpand = (accountId: string) => {
    setExpandedParties((prev) => {
      const next = new Set(prev)
      if (next.has(accountId)) {
        next.delete(accountId)
      } else {
        next.add(accountId)
      }
      return next
    })
  }

  // Expand/Collapse all
  const expandAll = () => {
    setExpandedParties(new Set(filteredSummaries.map((ps) => ps.accountId)))
  }

  const collapseAll = () => {
    setExpandedParties(new Set())
  }

  if (!activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Please select a company to view crate summary</p>
        <Button onClick={() => navigate('/companies')}>Go to Company Manager</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Crate Summary (Party Wise)</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Party-wise crate summary with expandable rows
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">From</Label>
          <Input
            type="date"
            value={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const val = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (val > today) return
              setFromDate(val)
              if (toDate && val > toDate) {
                setToDate(val)
              }
            }}
            className="w-40"
          />
          <Label className="text-sm font-medium">To</Label>
          <Input
            type="date"
            value={toDate}
            min={fromDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const val = e.target.value
              const today = new Date().toISOString().split('T')[0]
              if (val > today || (fromDate && val < fromDate)) return
              setToDate(val)
            }}
            className="w-40"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={loadTransactions}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.print()}>
            <Printer />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="py-4 px-6">
        <div className="max-w-[1400px] mx-auto">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Input
                  type="search"
                  placeholder="Search party or crate marka..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs"
                />
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="max-w-[1400px] mx-auto">
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">
                Party Summary ({filteredSummaries.length} parties)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="min-w-[200px]">Party / Crate</TableHead>
                    <TableHead className="text-right w-32">Issued</TableHead>
                    <TableHead className="text-right w-32">Received</TableHead>
                    <TableHead className="text-right w-32">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {loading ? 'Loading...' : 'No data found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSummaries.map((party) => {
                      const isExpanded = expandedParties.has(party.accountId)
                      return (
                        <>
                          <TableRow
                            key={party.accountId}
                            className="cursor-pointer hover:bg-muted/50 font-medium"
                            onClick={() => toggleExpand(party.accountId)}
                          >
                            <TableCell className="w-10">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">{party.accountName}</TableCell>
                            <TableCell className="text-right">{party.totalIssued}</TableCell>
                            <TableCell className="text-right">{party.totalReceived}</TableCell>
                            <TableCell
                              className={cn(
                                'text-right font-medium',
                                party.totalBalance > 0
                                  ? 'text-red-600'
                                  : party.totalBalance < 0
                                    ? 'text-green-600'
                                    : ''
                              )}
                            >
                              {party.totalBalance}
                            </TableCell>
                          </TableRow>
                          {isExpanded &&
                            party.crateDetails.map((cd) => (
                              <TableRow key={`${party.accountId}-${cd.crateMarkaId}`} className="bg-muted/30">
                                <TableCell className="w-10"></TableCell>
                                <TableCell className="pl-10 text-muted-foreground">
                                  {cd.crateMarkaName}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {cd.issued}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {cd.received}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    'text-right',
                                    cd.balance > 0
                                      ? 'text-red-500'
                                      : cd.balance < 0
                                        ? 'text-green-500'
                                        : 'text-muted-foreground'
                                  )}
                                >
                                  {cd.balance}
                                </TableCell>
                              </TableRow>
                            ))}
                        </>
                      )
                    })
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold bg-muted">
                    <TableCell colSpan={2}>Grand Total</TableCell>
                    <TableCell className="text-right">{grandTotals.issued}</TableCell>
                    <TableCell className="text-right">{grandTotals.received}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        grandTotals.balance > 0
                          ? 'text-red-600'
                          : grandTotals.balance < 0
                            ? 'text-green-600'
                            : ''
                      )}
                    >
                      {grandTotals.balance}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CrateSummaryPage
