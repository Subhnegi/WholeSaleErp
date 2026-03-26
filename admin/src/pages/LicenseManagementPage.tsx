import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { 
  KeyRound, 
  Calendar, 
  Clock, 
  CreditCard, 
  LogOut, 
  RefreshCw,
  Shield,
  AlertTriangle,
  CheckCircle,
  User
} from 'lucide-react'
import { LICENSE_PLANS } from '@/config/api'

export function LicenseManagementPage() {
  const navigate = useNavigate()
  const { user, license, isLoading, logout, refreshLicense } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <Spinner size="lg" className="text-primary" />
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getDaysRemaining = () => {
    if (!license) return 0
    // Use endDate (server) or expiryDate (alias) 
    const expiryDateStr = license.endDate || license.expiryDate
    if (!expiryDateStr) return 0
    const expiry = new Date(expiryDateStr)
    const now = new Date()
    const diff = expiry.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const daysRemaining = getDaysRemaining()
  const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0
  const isExpired = daysRemaining === 0

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>
    }
    if (license?.isTrial) {
      return <Badge variant="warning">Trial</Badge>
    }
    if (isExpiringSoon) {
      return <Badge variant="warning">Expiring Soon</Badge>
    }
    if (license?.status === 'active') {
      return <Badge variant="success">Active</Badge>
    }
    return <Badge variant="secondary">{license?.status}</Badge>
  }

  const getCurrentPlanName = () => {
    if (!license) return 'Unknown'
    if (license.isTrial) return 'Trial (7 days)'
    const plan = LICENSE_PLANS.find(p => p.id === license.plan)
    return plan?.name || license.plan || 'Standard'
  }

  const handleRenew = () => {
    navigate('/payment')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">License Management</h1>
              <p className="text-slate-400 text-sm">Manage your Mandi ERP license</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshLicense}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* User Info Card */}
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-slate-700">
                <User className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <p className="font-medium text-white">{user?.name || 'User'}</p>
                <p className="text-sm text-slate-400">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* License Status Alert */}
        {(isExpired || isExpiringSoon) && (
          <Card className={`border mb-6 ${isExpired ? 'border-red-500/50 bg-red-500/10' : 'border-yellow-500/50 bg-yellow-500/10'}`}>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${isExpired ? 'text-red-400' : 'text-yellow-400'}`} />
                <div>
                  <p className={`font-medium ${isExpired ? 'text-red-400' : 'text-yellow-400'}`}>
                    {isExpired ? 'Your license has expired!' : `Your license expires in ${daysRemaining} days`}
                  </p>
                  <p className="text-sm text-slate-400">
                    {isExpired 
                      ? 'Please renew your license to continue using the application.'
                      : 'Renew now to avoid any service interruption.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* License Details Card */}
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5" />
                  License Details
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Your current license information
                </CardDescription>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* License Key */}
              <div className="space-y-1">
                <p className="text-sm text-slate-400">License Key</p>
                <p className="font-mono text-white bg-slate-700/50 px-3 py-2 rounded-lg">
                  {license?.licenseKey || '—'}
                </p>
              </div>

              {/* Plan */}
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Current Plan</p>
                <p className="text-white font-medium">{getCurrentPlanName()}</p>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Start Date
                </p>
                <p className="text-white">{license ? formatDate(license.startDate) : '—'}</p>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Expiry Date
                </p>
                <p className={`font-medium ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-white'}`}>
                  {license ? formatDate(license.endDate || license.expiryDate || '') : '—'}
                </p>
              </div>

              {/* Days Remaining */}
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Days Remaining</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${isExpired ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-green-400'}`}>
                    {daysRemaining}
                  </p>
                  {!isExpired && <CheckCircle className="w-5 h-5 text-green-400" />}
                </div>
              </div>

              {/* Last Validated */}
              <div className="space-y-1">
                <p className="text-sm text-slate-400">Last Validated</p>
                <p className="text-white">
                  {license?.lastValidated ? formatDate(license.lastValidated) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Renew License Card */}
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Renew License
            </CardTitle>
            <CardDescription className="text-slate-400">
              Extend your license to continue enjoying all features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {LICENSE_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="p-4 rounded-lg border border-slate-600 bg-slate-700/30 text-center hover:border-primary/50 transition-colors"
                >
                  <p className="font-medium text-white">{plan.name}</p>
                  <p className="text-2xl font-bold text-primary mt-1">₹{plan.price}</p>
                  {plan.savings && (
                    <Badge variant="success" className="mt-2 text-xs">
                      {plan.savings}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <Button
              onClick={handleRenew}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Need help? Contact support at support@mandiApp.com
        </p>
      </div>
    </div>
  )
}
