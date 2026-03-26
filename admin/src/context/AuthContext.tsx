import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User, License, LoginCredentials, AuthState } from '@/types'
import { authService } from '@/services/auth'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  refreshLicense: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const AUTH_TOKEN_KEY = 'admin_auth_token'
const USER_DATA_KEY = 'admin_user_data'
const LICENSE_DATA_KEY = 'admin_license_data'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    license: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  })

  // Load stored auth data on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        const storedUser = localStorage.getItem(USER_DATA_KEY)
        const storedLicense = localStorage.getItem(LICENSE_DATA_KEY)

        if (token && storedUser && storedLicense) {
          const user = JSON.parse(storedUser) as User
          const license = JSON.parse(storedLicense) as License
          
          // Validate license with server if we have a license key
          if (license.licenseKey) {
            try {
              const validation = await authService.validateLicense(license.licenseKey)
              if (validation.success && validation.license) {
                // Update with fresh license data from server
                localStorage.setItem(LICENSE_DATA_KEY, JSON.stringify(validation.license))
                setState({
                  user,
                  license: validation.license,
                  isAuthenticated: true,
                  isLoading: false,
                  error: null,
                })
                return
              }
            } catch {
              // If validation fails, still use stored data but mark as potentially stale
              console.warn('License validation failed, using stored data')
            }
          }
          
          // Use stored data if validation was skipped or failed
          setState({
            user,
            license,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          return
        }
        
        // Clear invalid data
        localStorage.removeItem(AUTH_TOKEN_KEY)
        localStorage.removeItem(USER_DATA_KEY)
        localStorage.removeItem(LICENSE_DATA_KEY)
        
        setState(prev => ({ ...prev, isLoading: false }))
      } catch {
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    loadStoredAuth()
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await authService.login(credentials)

      if (response.success && response.data) {
        const { user, license, token } = response.data

        // Store auth data
        localStorage.setItem(AUTH_TOKEN_KEY, token)
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
        if (license) {
          localStorage.setItem(LICENSE_DATA_KEY, JSON.stringify(license))
        }

        setState({
          user,
          license,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })

        return true
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Login failed',
        }))
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
      return false
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(USER_DATA_KEY)
    localStorage.removeItem(LICENSE_DATA_KEY)

    setState({
      user: null,
      license: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  }, [])

  const refreshLicense = useCallback(async () => {
    if (!state.license?.licenseKey) return

    try {
      const validation = await authService.validateLicense(state.license.licenseKey)
      if (validation.success && validation.license) {
        localStorage.setItem(LICENSE_DATA_KEY, JSON.stringify(validation.license))
        setState(prev => ({ ...prev, license: validation.license! }))
      }
    } catch (error) {
      console.error('Failed to refresh license:', error)
    }
  }, [state.license?.licenseKey])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshLicense,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
