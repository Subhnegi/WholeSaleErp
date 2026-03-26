import type { LoginCredentials, LoginResponse, License } from '@/types'
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'

class AuthService {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('admin_auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()
      
      // Transform server response to match our expected format
      if (data.success && data.data) {
        const { user, license, token } = data.data
        
        // Normalize license data (server uses endDate, we use both)
        const normalizedLicense: License = {
          ...license,
          endDate: license.endDate,
          expiryDate: license.endDate, // Add alias
        }
        
        return {
          success: true,
          message: data.message,
          data: {
            user,
            license: normalizedLicense,
            token,
          },
        }
      }
      
      return {
        success: false,
        error: data.message || 'Login failed',
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: 'Unable to connect to server. Please check your connection.',
      }
    }
  }

  async validateLicense(licenseKey: string): Promise<{ success: boolean; license?: License; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VALIDATE_LICENSE}`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ licenseKey }),
      })

      const data = await response.json()
      
      if (data.success && data.data) {
        const license = data.data.license || data.data
        return {
          success: true,
          license: {
            ...license,
            endDate: license.endDate,
            expiryDate: license.endDate,
          },
        }
      }
      
      return {
        success: false,
        error: data.message || 'License validation failed',
      }
    } catch (error) {
      console.error('License validation error:', error)
      return {
        success: false,
        error: 'Unable to validate license',
      }
    }
  }

  async getLicenseInfo(): Promise<License | null> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LICENSE_INFO}`, {
        method: 'GET',
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const license = data.data
          return {
            ...license,
            endDate: license.endDate,
            expiryDate: license.endDate,
          }
        }
      }
      return null
    } catch (error) {
      console.error('Get license info error:', error)
      return null
    }
  }
}

export const authService = new AuthService()
