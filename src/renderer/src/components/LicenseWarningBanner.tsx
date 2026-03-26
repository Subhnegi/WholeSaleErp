import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, ShieldAlert, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface LicenseWarningBannerProps {
  daysRemaining?: number
  gracePeriodRemaining?: number
  requiresAction?: 'renew' | 'validate' | 'login'
  reason?: string
  onValidate?: () => void
  onRenew?: () => void
}

export function LicenseWarningBanner({
  daysRemaining,
  gracePeriodRemaining,
  requiresAction,
  reason,
  onValidate,
  onRenew
}: LicenseWarningBannerProps) {
  const [validating, setValidating] = useState(false)

  const handleValidate = async () => {
    setValidating(true)
    try {
      await onValidate?.()
    } finally {
      setValidating(false)
    }
  }

  // Grace period warning (license expired, but still usable)
  if (gracePeriodRemaining !== undefined && gracePeriodRemaining > 0) {
    return (
      <Alert variant="destructive" className="mb-4 bg-red-50 border-red-300">
        <ShieldAlert className="h-4 w-4 text-red-700" />
        <AlertTitle className="text-red-900">License Expired - Grace Period Active</AlertTitle>
        <AlertDescription className="flex items-center justify-between text-red-800">
          <span>
            Your license has expired. You have {gracePeriodRemaining} day{gracePeriodRemaining !== 1 ? 's' : ''} remaining in the grace period.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRenew}
            className="ml-4 border-red-300 text-red-700 hover:bg-red-100"
          >
            Renew License
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Expiring soon warning (< 7 days)
  if (daysRemaining !== undefined && daysRemaining <= 7 && daysRemaining > 0) {
    return (
      <Alert className="mb-4 border-yellow-300 bg-yellow-50">
        <Clock className="h-4 w-4 text-yellow-700" />
        <AlertTitle className="text-yellow-900">
          License Expiring Soon
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between text-yellow-800">
          <span>
            Your license expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}. 
            Please renew to avoid service interruption.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onRenew}
            className="ml-4 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
          >
            Renew Now
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Validation needed
  if (requiresAction === 'validate') {
    return (
      <Alert className="mb-4 border-blue-300 bg-blue-50">
        <RefreshCw className="h-4 w-4 text-blue-700" />
        <AlertTitle className="text-blue-900">
          License Validation Needed
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between text-blue-800">
          <span>{reason || 'Please validate your license to continue.'}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={validating}
            className="ml-4 border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            {validating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              'Validate Now'
            )}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Generic warning
  if (reason) {
    return (
      <Alert variant="destructive" className="mb-4 bg-red-50 border-red-300">
        <AlertTriangle className="h-4 w-4 text-red-700" />
        <AlertTitle className="text-red-900">License Issue</AlertTitle>
        <AlertDescription className="text-red-800">{reason}</AlertDescription>
      </Alert>
    )
  }

  return null
}
