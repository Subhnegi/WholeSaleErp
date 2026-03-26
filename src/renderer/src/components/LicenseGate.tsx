import React, { useEffect, useState } from 'react'
import LoadingScreen from './LoadingScreen'
import TrialExpiredScreen from './TrialExpiredScreen'
import LicenseErrorScreen from './LicenseErrorScreen'

interface EnforcementResult {
  allowed: boolean
  reason?: string
  requiresAction?: 'renew' | 'validate' | 'login'
  daysRemaining?: number
  gracePeriodRemaining?: number
}

type LicenseState = 'loading' | 'valid' | 'expired' | 'error'

interface LicenseGateProps {
  children: React.ReactNode
}

const LicenseGate: React.FC<LicenseGateProps> = ({ children }) => {
  const [state, setState] = useState<LicenseState>('loading')
  const [enforcement, setEnforcement] = useState<EnforcementResult | null>(null)
  const [error, setError] = useState<string>('')

  const performStartupCheck = async () => {
    setState('loading')
    setError('')

    try {
      const result = await window.api.enforcer.startupCheck()

      if (!result.success) {
        setState('error')
        setError(result.error || 'Failed to validate license')
        return
      }

      if (result.enforcement) {
        setEnforcement(result.enforcement)
        
        // If license check requires login, allow app to proceed so it can show login screen
        if (result.enforcement.requiresAction === 'login') {
          console.log('[LicenseGate] No active session - allowing app to show login screen')
          setState('valid') // Allow app to proceed to show login
          return
        }
        
        if (result.enforcement.allowed) {
          setState('valid')
        } else {
          setState('expired')
        }
      } else {
        setState('error')
        setError('Invalid response from license validation')
      }
    } catch (err) {
      console.error('License validation error:', err)
      setState('error')
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    }
  }

  useEffect(() => {
    performStartupCheck()
  }, [])

  const handleRenew = () => {
    // Open external URL to renewal page
    window.electron.ipcRenderer.send('open-external-url', 'http://localhost:5174')
  }

  const handleValidate = async () => {
    setState('loading')
    
    try {
      const result = await window.api.enforcer.forceOnlineValidation()
      
      if (result.success && result.enforcement) {
        setEnforcement(result.enforcement)
        
        if (result.enforcement.allowed) {
          setState('valid')
        } else {
          setState('expired')
        }
      } else {
        setState('error')
        setError(result.message || 'Validation failed')
      }
    } catch (err) {
      console.error('Online validation error:', err)
      setState('error')
      setError(err instanceof Error ? err.message : 'Validation failed')
    }
  }

  const handleContactSupport = () => {
    // Open external URL to support page
    window.electron.ipcRenderer.send('open-external-url', 'https://your-support-url.com')
  }

  const handleRetry = () => {
    performStartupCheck()
  }

  const handleCloseApp = () => {
    window.electron.ipcRenderer.send('quit-app')
  }

  if (state === 'loading') {
    return <LoadingScreen message="Validating license..." />
  }

  if (state === 'error') {
    return <LicenseErrorScreen error={error} onRetry={handleRetry} onClose={handleCloseApp} />
  }

  if (state === 'expired' && enforcement) {
    return (
      <TrialExpiredScreen
        enforcement={enforcement}
        onRenew={handleRenew}
        onValidate={handleValidate}
        onContactSupport={handleContactSupport}
      />
    )
  }

  // state === 'valid'
  return <>{children}</>
}

export default LicenseGate
