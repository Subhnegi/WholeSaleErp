import React from 'react'
import { AlertCircle, Clock, ExternalLink } from 'lucide-react'

interface EnforcementResult {
  allowed: boolean
  reason?: string
  requiresAction?: 'renew' | 'validate' | 'login'
  daysRemaining?: number
  gracePeriodRemaining?: number
}

interface TrialExpiredScreenProps {
  enforcement: EnforcementResult
  onRenew: () => void
  onValidate: () => void
  onContactSupport: () => void
}

const TrialExpiredScreen: React.FC<TrialExpiredScreenProps> = ({
  enforcement,
  onRenew,
  onValidate,
  onContactSupport
}) => {
  const isInGracePeriod = enforcement.gracePeriodRemaining !== undefined && enforcement.gracePeriodRemaining > 0
  
  return (
    <div className="fixed inset-0 bg-linear-to-br from-gray-900 via-red-950 to-gray-900 flex items-center justify-center z-10000">
      <div className="max-w-2xl w-full mx-4 p-10 text-center bg-white/5 rounded-xl border border-white/10 shadow-2xl backdrop-blur-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          {isInGracePeriod ? (
            <Clock className="w-16 h-16 text-yellow-400" />
          ) : (
            <AlertCircle className="w-16 h-16 text-red-500" />
          )}
        </div>
        
        {/* Title */}
        <h1 className="text-3xl font-semibold mb-4 text-red-400">
          {isInGracePeriod ? 'License Validation Required' : 'License Expired'}
        </h1>
        
        {/* Message */}
        <p className="text-base leading-relaxed mb-6 text-white/90">
          {enforcement.reason || 'Your license has expired and needs to be renewed.'}
        </p>
        
        {/* Grace Period Notice */}
        {isInGracePeriod && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 text-base mb-2">
              Grace Period: <strong className="font-bold">{enforcement.gracePeriodRemaining} day(s) remaining</strong>
            </p>
            <p className="text-white/80 text-sm">
              The application will be blocked after the grace period expires.
            </p>
          </div>
        )}
        
        {/* Blocked Notice */}
        {!isInGracePeriod && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-base font-medium">
              The application is now blocked. Please renew your license to continue.
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mb-5">
          <button
            className="px-7 py-3.5 text-base font-semibold rounded-lg bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-indigo-600 hover:to-blue-700 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            onClick={onRenew}
          >
            <ExternalLink className="w-5 h-5" />
            Renew License
          </button>
          <button
            className="px-7 py-3.5 text-base font-semibold rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/15 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            onClick={onValidate}
          >
            I Already Renewed
          </button>
          <button
            className="px-7 py-3.5 text-base font-semibold rounded-lg bg-transparent text-white/70 border border-white/10 hover:text-white hover:bg-white/5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            onClick={onContactSupport}
          >
            Contact Support
          </button>
        </div>
        
        {/* Action Required */}
        {enforcement.requiresAction && (
          <div className="mt-4 p-3 bg-blue-600/10 rounded-md">
            <p className="text-blue-400 text-sm">
              Action Required: <strong className="capitalize">{enforcement.requiresAction}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrialExpiredScreen
