import React from 'react'
import { AlertCircle, RefreshCw, XCircle } from 'lucide-react'

interface LicenseErrorScreenProps {
  error: string
  onRetry: () => void
  onClose: () => void
}

const LicenseErrorScreen: React.FC<LicenseErrorScreenProps> = ({ error, onRetry, onClose }) => {
  return (
    <div className="fixed inset-0 bg-linear-to-br from-gray-50 via-orange-50 to-gray-50 flex items-center justify-center z-10000">
      <div className="max-w-2xl w-full mx-4 p-10 text-center bg-white rounded-xl border border-gray-200 shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-orange-100 rounded-full">
            <AlertCircle className="w-12 h-12 text-orange-600" />
          </div>
        </div>
        
        {/* Title */}
        <h1 className="text-3xl font-semibold mb-4 text-orange-600">
          License Validation Error
        </h1>
        
        {/* Error Message */}
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-base text-gray-800">{error}</p>
        </div>
        
        {/* Error Details */}
        <div className="text-left mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-700 text-sm font-medium mb-3">
            This error may be caused by:
          </p>
          <ul className="list-disc list-inside text-gray-600 text-sm space-y-1.5 pl-2">
            <li>Network connectivity issues</li>
            <li>Server maintenance or downtime</li>
            <li>Invalid license configuration</li>
          </ul>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mb-5">
          <button
            className="px-7 py-3.5 text-base font-semibold rounded-lg bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-indigo-600 hover:to-blue-700 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            onClick={onRetry}
          >
            <RefreshCw className="w-5 h-5" />
            Retry Validation
          </button>
          <button
            className="px-7 py-3.5 text-base font-semibold rounded-lg bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            onClick={onClose}
          >
            <XCircle className="w-5 h-5" />
            Close Application
          </button>
        </div>
        
        {/* Support */}
        <div className="pt-5 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            If the problem persists, please contact support at{' '}
            <a
              href="mailto:support@example.com"
              className="text-blue-600 hover:text-indigo-600 hover:underline transition-colors"
            >
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LicenseErrorScreen
