import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Database, Zap, Loader2, Shield, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { checkEnforcement, forceValidation } from '@/store/slices/licenseSlice'
import { LicenseWarningBanner } from './LicenseWarningBanner'
import { LicenseBlockDialog } from './LicenseBlockDialog'

interface VersionInfo {
  appVersion: string
  dbVersion: string
  setupStatus: string
}

export function StarterScreen() {
  const dispatch = useAppDispatch()
  const { enforcement } = useAppSelector((state) => state.license)
  
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check authentication and license on mount
  useEffect(() => {
    const initializeApp = async () => {
      // Delay to ensure preload is ready, then check enforcement
      setTimeout(async () => {
        if (window.api?.enforcer) {
          await dispatch(checkEnforcement())
        }
      }, 100)
    }

    initializeApp()
  }, [dispatch])

  useEffect(() => {
    async function fetchVersionInfo() {
      try {
        const info = await window.api.db.getVersionInfo()
        setVersionInfo(info)
      } catch (err) {
        setError('Failed to connect to database')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchVersionInfo()
  }, [])

  const handleValidateLicense = async () => {
    const result = await dispatch(forceValidation())
    if (result.meta.requestStatus === 'fulfilled') {
      await dispatch(checkEnforcement())
    }
  }

  const handleRenewLicense = () => {
    // TODO: Implement renewal flow (Phase 3)
    console.log('Renewal flow not yet implemented')
  }

  const handleLogin = () => {
    // TODO: Navigate to login screen (Phase 3)
    console.log('Login flow not yet implemented')
  }

  return (
    <>
      {/* License Block Dialog - Shows when license expired (not for login) */}
      {enforcement && !enforcement.allowed && enforcement.requiresAction !== 'login' && (
        <LicenseBlockDialog
          open={true}
          reason={enforcement.reason || 'License validation required'}
          requiresAction={enforcement.requiresAction || 'validate'}
          onRenew={handleRenewLicense}
          onValidate={handleValidateLicense}
          onLogin={handleLogin}
        />
      )}

      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl space-y-6">
          {/* License Warning Banner - Shows when license needs attention */}
          {enforcement && enforcement.allowed && (enforcement.daysRemaining !== undefined || enforcement.gracePeriodRemaining !== undefined) && (
            <LicenseWarningBanner
              daysRemaining={enforcement.daysRemaining}
              gracePeriodRemaining={enforcement.gracePeriodRemaining}
              requiresAction={enforcement.requiresAction}
              reason={enforcement.reason}
              onValidate={handleValidateLicense}
              onRenew={handleRenewLicense}
            />
          )}

          <div className="text-center space-y-3">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900">
              Whole Sale ERP
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              Offline-First Enterprise Resource Planning System
            </p>
          </div>

          {/* License Status Card */}
          {enforcement && (
            <Card className="border-2 border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Shield className="h-6 w-6" />
                  License Status
                </CardTitle>
                <CardDescription className="text-blue-600">
                  {enforcement.allowed ? 'Your license is active and valid' : 'License validation required'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/70 shadow-sm">
                    <span className="text-gray-700 font-medium">Status:</span>
                    <span className={`font-semibold ${enforcement.allowed ? 'text-green-700' : 'text-red-700'}`}>
                      {enforcement.allowed ? '✓ Active' : '✗ Requires Action'}
                    </span>
                  </div>
                  {enforcement.daysRemaining !== undefined && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/70 shadow-sm">
                      <span className="text-gray-700 font-medium">Days Remaining:</span>
                      <span className={`font-semibold ${
                        enforcement.daysRemaining > 7 ? 'text-green-700' :
                        enforcement.daysRemaining > 3 ? 'text-yellow-700' :
                        'text-red-700'
                      }`}>
                        {enforcement.daysRemaining} days
                      </span>
                    </div>
                  )}
                  {enforcement.gracePeriodRemaining !== undefined && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200 shadow-sm">
                      <span className="flex items-center gap-2 text-red-800 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Grace Period:
                      </span>
                      <span className="font-semibold text-red-700">
                        {enforcement.gracePeriodRemaining} days left
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-2 border-green-200 bg-linear-to-br from-green-50 to-emerald-50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-6 w-6" />
              Phase 2.3 Setup Successful
            </CardTitle>
            <CardDescription className="text-green-600">
              License enforcement and offline mode configured
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-white/80 shadow-sm border border-gray-200">
                <Zap className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Frontend Stack</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Electron + React + TypeScript + Tailwind CSS + shadcn/ui
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-white/80 shadow-sm border border-gray-200">
                <Database className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm text-gray-900">Database</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    SQLite + Prisma ORM (Offline-First)
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 shadow-sm">
                <p className="text-sm text-red-700 text-center font-medium">{error}</p>
              </div>
            ) : versionInfo ? (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 shadow-sm">
                <h4 className="text-sm font-semibold mb-2 text-blue-900">
                  Database Connection Verified ✓
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-blue-700">App Version:</span>
                    <span className="ml-2 font-medium text-blue-900">{versionInfo.appVersion}</span>
                  </div>
                  <div>
                    <span className="text-blue-700">DB Version:</span>
                    <span className="ml-2 font-medium text-blue-900">{versionInfo.dbVersion}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-blue-700">Setup Status:</span>
                    <span className="ml-2 font-medium text-blue-900">{versionInfo.setupStatus}</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-center text-gray-700 leading-relaxed">
                ✓ Phase 1: ERP Foundation & Auto-Updates<br />
                ✓ Phase 2.1: Backend Server (Express + PostgreSQL)<br />
                ✓ Phase 2.2: License Management Integration<br />
                ✓ Phase 2.3: License Enforcement & Offline Mode
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-600">
          <p className="font-medium">Version 1.0.1 • Development Mode • Phase 2.3 Complete</p>
        </div>
        </div>
      </div>
    </>
  )
}
