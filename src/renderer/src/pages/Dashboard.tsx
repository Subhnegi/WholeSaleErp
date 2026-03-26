import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setActiveCompany, loadCompanies } from '@/store/slices/companySlice'
import { clearAllTabs, resetTabs, openTab } from '@/store/slices/tabSlice'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Calendar,
  Users,
  TrendingUp,
  Package,
  ArrowLeft,
  Loader2,
  ShoppingCart,
  Truck,
  Receipt,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3,
  PieChart
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts'

// Types for dashboard data
interface DashboardStats {
  totalSales: number
  totalPurchases: number
  itemCount: number
  customerCount: number
  supplierCount: number
  todaySales: number
  todayPurchases: number
  pendingArrivals: number
  salesTrend: SalesTrendItem[]
  recentActivity: RecentActivity[]
  topItems: TopItem[]
  topCustomers: TopCustomer[]
}

interface SalesTrendItem {
  date: string
  label: string
  quickSales: number
  stockSales: number
  total: number
}

interface RecentActivity {
  id: string
  type: 'quick_sale' | 'stock_sale' | 'arrival' | 'receipt' | 'payment'
  description: string
  amount: number
  date: string
  voucherNo: string
}

interface TopItem {
  id: string
  name: string
  totalKg: number
  totalAmount: number
}

interface TopCustomer {
  id: string
  name: string
  totalAmount: number
  transactionCount: number
}

export function Dashboard() {
  const { companyId } = useParams<{ companyId: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const { activeCompany, companies, loading } = useAppSelector((state) => state.company)
  
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Load companies if not already loaded
  useEffect(() => {
    if (user?.id && companies.length === 0 && !loading) {
      dispatch(loadCompanies(user.id))
    }
  }, [user?.id, companies.length, loading, dispatch])

  // Set active company based on URL parameter
  useEffect(() => {
    if (companyId && companies.length > 0) {
      const company = companies.find((c) => c.id === companyId)
      if (company && company.id !== activeCompany?.id) {
        // Clear all tabs when switching companies (this resets to Dashboard tab)
        dispatch(clearAllTabs())
        dispatch(setActiveCompany(company))
      } else if (!company) {
        // Company not found, redirect to company manager
        navigate('/companies')
      }
    }
  }, [companyId, companies, activeCompany?.id, dispatch, navigate])

  // Load dashboard stats
  const loadStats = useCallback(async () => {
    if (!activeCompany?.id) return
    
    setStatsLoading(true)
    setStatsError(null)
    
    try {
      const result = await window.api.dashboard.getStats(activeCompany.id)
      if (result.success && result.data) {
        setStats(result.data)
      } else {
        setStatsError(result.error || 'Failed to load dashboard stats')
      }
    } catch (error) {
      setStatsError(error instanceof Error ? error.message : 'Failed to load stats')
    } finally {
      setStatsLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Navigation handlers for quick actions
  const handleQuickAction = (route: string, title: string) => {
    dispatch(openTab({
      title,
      route,
      icon: 'file'
    }))
    navigate(route)
  }

  // Show loading only if we're loading and have no companies yet
  if (loading && companies.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading companies...</p>
        </div>
      </div>
    )
  }

  // If no company selected, show selection prompt
  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>
              Please select a company to view the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/companies')} className="w-full">
              <Building2 className="mr-2 h-4 w-4" />
              Go to Company Manager
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleBackToCompanies = () => {
    // Clear active company and reset all tabs
    dispatch(setActiveCompany(null))
    dispatch(resetTabs())
    navigate('/companies')
  }

  // Get activity type icon and color
  const getActivityStyle = (type: string) => {
    switch (type) {
      case 'quick_sale':
        return { icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-100' }
      case 'stock_sale':
        return { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' }
      case 'arrival':
        return { icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100' }
      case 'receipt':
        return { icon: Receipt, color: 'text-purple-600', bg: 'bg-purple-100' }
      case 'payment':
        return { icon: CreditCard, color: 'text-red-600', bg: 'bg-red-100' }
      default:
        return { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' }
    }
  }

  return (
    <div className="flex flex-col h-full bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header - Fixed at top */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToCompanies}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Companies
            </Button>
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{activeCompany.companyName}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {activeCompany.fyLabel}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
            disabled={statsLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {statsError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {statsError}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            title="Today's Sales"
            value={formatCurrency(stats?.todaySales || 0)}
            description="Sales today"
            icon={TrendingUp}
            trend={stats?.todaySales ? '+' + formatCurrency(stats.todaySales) : undefined}
            trendUp={true}
            loading={statsLoading}
            gradient="from-green-500 to-emerald-600"
          />
          <StatsCard
            title="Today's Purchases"
            value={formatCurrency(stats?.todayPurchases || 0)}
            description="Arrivals today"
            icon={Truck}
            loading={statsLoading}
            gradient="from-orange-500 to-amber-600"
          />
          <StatsCard
            title="Inventory Items"
            value={String(stats?.itemCount || 0)}
            description="Active products"
            icon={Package}
            loading={statsLoading}
            gradient="from-blue-500 to-indigo-600"
          />
          <StatsCard
            title="Customers"
            value={String(stats?.customerCount || 0)}
            description={`${stats?.supplierCount || 0} suppliers`}
            icon={Users}
            loading={statsLoading}
            gradient="from-purple-500 to-violet-600"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sales (This Year)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(stats?.totalSales || 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Purchases (This Year)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(stats?.totalPurchases || 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Arrivals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-yellow-600">
                  {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.pendingArrivals || 0}
                </span>
                {(stats?.pendingArrivals || 0) > 0 && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                    Needs attention
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks for this company</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4 flex-col items-center gap-2 hover:bg-green-50 hover:border-green-300"
                onClick={() => handleQuickAction('/entries/quick-sale', 'Quick Sale')}
              >
                <ShoppingCart className="h-5 w-5 text-green-600" />
                <span className="text-sm">Quick Sale</span>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4 flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => handleQuickAction('/entries/stock-sale', 'Stock Sale')}
              >
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Stock Sale</span>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4 flex-col items-center gap-2 hover:bg-orange-50 hover:border-orange-300"
                onClick={() => handleQuickAction('/entries/arrival-book', 'Arrival')}
              >
                <Truck className="h-5 w-5 text-orange-600" />
                <span className="text-sm">New Arrival</span>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4 flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-300"
                onClick={() => handleQuickAction('/entries/quick-receipt', 'Quick Receipt')}
              >
                <Receipt className="h-5 w-5 text-purple-600" />
                <span className="text-sm">Receipt</span>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4 flex-col items-center gap-2 hover:bg-red-50 hover:border-red-300"
                onClick={() => handleQuickAction('/entries/quick-payment', 'Quick Payment')}
              >
                <CreditCard className="h-5 w-5 text-red-600" />
                <span className="text-sm">Payment</span>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-4 flex-col items-center gap-2 hover:bg-gray-50 hover:border-gray-300"
                onClick={() => handleQuickAction('/accounts', 'Accounts')}
              >
                <Users className="h-5 w-5 text-gray-600" />
                <span className="text-sm">Accounts</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2 mb-6">
          {/* Sales Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sales Trend (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stats?.salesTrend && stats.salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={stats.salesTrend}>
                    <defs>
                      <linearGradient id="colorQuickSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorStockSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      className="text-xs"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: '#6b7280' }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value) => value !== undefined ? formatCurrency(Number(value)) : ''}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="quickSales" 
                      name="Quick Sales"
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorQuickSales)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="stockSales" 
                      name="Stock Sales"
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorStockSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No sales data yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Items Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Top Items by Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stats?.topItems && stats.topItems.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.topItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      type="number"
                      className="text-xs"
                      tick={{ fill: '#6b7280' }}
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name" 
                      className="text-xs"
                      tick={{ fill: '#6b7280' }}
                      width={100}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const numValue = Number(value) || 0
                        return [
                          name === 'totalAmount' ? formatCurrency(numValue) : `${numValue.toFixed(2)} kg`,
                          name === 'totalAmount' ? 'Amount' : 'Weight'
                        ]
                      }}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="totalAmount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No item sales data yet</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Activity and Top Customers */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest transactions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {stats.recentActivity.map((activity) => {
                    const style = getActivityStyle(activity.type)
                    const Icon = style.icon
                    return (
                      <div 
                        key={activity.id} 
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${style.bg}`}>
                          <Icon className={`h-4 w-4 ${style.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(activity.amount)}</p>
                          <p className="text-xs text-muted-foreground">{activity.voucherNo}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm mt-1">Start by creating your first transaction</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Customers
              </CardTitle>
              <CardDescription>By sales volume</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.topCustomers && stats.topCustomers.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {stats.topCustomers.map((customer, index) => (
                    <div 
                      key={customer.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-amber-600' :
                        'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer.transactionCount} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(customer.totalAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No customer data yet</p>
                  <p className="text-sm mt-1">Customer rankings will appear after sales</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Company Details Section - Collapsible at bottom */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Details
            </CardTitle>
            <CardDescription>Overview of company information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  {activeCompany.email && (
                    <p><span className="font-medium">Email:</span> {activeCompany.email}</p>
                  )}
                  {activeCompany.mobile1 && (
                    <p><span className="font-medium">Mobile:</span> {activeCompany.mobile1}</p>
                  )}
                  {activeCompany.mobile2 && (
                    <p><span className="font-medium">Alt Mobile:</span> {activeCompany.mobile2}</p>
                  )}
                  {activeCompany.website && (
                    <p><span className="font-medium">Website:</span> {activeCompany.website}</p>
                  )}
                  {activeCompany.contactPerson && (
                    <p><span className="font-medium">Contact Person:</span> {activeCompany.contactPerson}</p>
                  )}
                  {!activeCompany.email && !activeCompany.mobile1 && !activeCompany.website && (
                    <p className="text-muted-foreground italic">No contact info added</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Address</h4>
                <div className="space-y-1 text-sm">
                  {activeCompany.addressLine1 && <p>{activeCompany.addressLine1}</p>}
                  {activeCompany.addressLine2 && <p>{activeCompany.addressLine2}</p>}
                  {(activeCompany.city || activeCompany.state) && (
                    <p>
                      {activeCompany.city}
                      {activeCompany.city && activeCompany.state && ', '}
                      {activeCompany.state}
                    </p>
                  )}
                  {activeCompany.countryCode && <p>{activeCompany.countryCode}</p>}
                  {!activeCompany.addressLine1 && !activeCompany.city && (
                    <p className="text-muted-foreground italic">No address added</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// Stats Card Component with gradient
interface StatsCardProps {
  title: string
  value: string
  description: string
  icon: React.ElementType
  trend?: string
  trendUp?: boolean
  loading?: boolean
  gradient?: string
}

function StatsCard({ title, value, description, icon: Icon, trend, trendUp, loading, gradient }: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full bg-linear-to-br ${gradient || 'from-gray-400 to-gray-500'} opacity-10`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-2 rounded-lg bg-linear-to-br ${gradient || 'from-gray-400 to-gray-500'}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {description}
              {trend && (
                <span className={`flex items-center ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                  {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {trend}
                </span>
              )}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
