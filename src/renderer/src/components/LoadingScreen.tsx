
import { Loader2 } from 'lucide-react'

interface LoadingScreenProps {
  message?: string
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* App Logo/Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl flex items-center justify-center transform hover:scale-105 transition-transform">
            <span className="text-3xl font-bold text-white">Subh</span>
          </div>
        </div>
        
        {/* Spinner */}
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
        
        {/* Message */}
        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-800">{message}</p>
          <p className="text-sm text-gray-500">Please wait...</p>
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen

