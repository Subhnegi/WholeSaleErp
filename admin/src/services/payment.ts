import type { LicensePlan, License } from '@/types'
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api'

// Payment request interface
export interface SimulatedPaymentRequest {
  licenseKey: string
  plan: LicensePlan
  amount: number
  paymentMethod: 'card' | 'upi' | 'netbanking'
}

// Payment response interface
export interface SimulatedPaymentResponse {
  success: boolean
  message?: string
  data?: {
    transactionId: string
    amount: number
    plan: LicensePlan
    paymentMethod: string
    timestamp: string
  }
  error?: string
}

// Renew license response
export interface RenewLicenseResponse {
  success: boolean
  message?: string
  data?: {
    license: License
    transactionId: string
    plan: LicensePlan
  }
  error?: string
}

class PaymentService {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('admin_auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  /**
   * Simulate payment gateway processing
   * In a real implementation, this would integrate with Razorpay, Stripe, etc.
   */
  async simulatePayment(request: SimulatedPaymentRequest): Promise<SimulatedPaymentResponse> {
    // Simulate network delay (1-2 seconds)
    await this.delay(1500)

    // Simulate payment processing
    // In production, this would call actual payment gateway API
    const transactionId = this.generateTransactionId()
    
    // Simulate 95% success rate for demo purposes
    const isSuccess = Math.random() > 0.05

    if (isSuccess) {
      return {
        success: true,
        message: 'Payment processed successfully',
        data: {
          transactionId,
          amount: request.amount,
          plan: request.plan,
          paymentMethod: request.paymentMethod,
          timestamp: new Date().toISOString(),
        },
      }
    } else {
      return {
        success: false,
        error: 'Payment failed. Please try again or use a different payment method.',
      }
    }
  }

  /**
   * Call backend API to renew the license after successful payment
   */
  async renewLicense(
    licenseKey: string, 
    plan: LicensePlan, 
    transactionId: string
  ): Promise<RenewLicenseResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_LICENSE}`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ licenseKey, plan, transactionId }),
      })

      const data = await response.json()
      
      if (data.success && data.data) {
        // Normalize license data
        const license = data.data.license
        return {
          success: true,
          message: data.message,
          data: {
            license: {
              ...license,
              endDate: license.endDate,
              expiryDate: license.endDate,
            },
            transactionId: data.data.transactionId,
            plan: data.data.plan,
          },
        }
      }
      
      return {
        success: false,
        error: data.message || 'Failed to renew license',
      }
    } catch (error) {
      console.error('Renew license error:', error)
      return {
        success: false,
        error: 'Unable to connect to server. Please try again.',
      }
    }
  }

  /**
   * Complete payment flow: simulate payment + renew license
   */
  async processPaymentAndRenew(request: SimulatedPaymentRequest): Promise<RenewLicenseResponse> {
    // Step 1: Simulate payment processing
    const paymentResult = await this.simulatePayment(request)
    
    if (!paymentResult.success || !paymentResult.data) {
      return {
        success: false,
        error: paymentResult.error || 'Payment processing failed',
      }
    }

    // Step 2: Call backend to renew license
    const renewResult = await this.renewLicense(
      request.licenseKey,
      request.plan,
      paymentResult.data.transactionId
    )

    return renewResult
  }

  // Helper: Generate a mock transaction ID
  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `TXN-${timestamp}-${random}`
  }

  // Helper: Delay function for simulating network latency
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const paymentService = new PaymentService()

// Named exports for convenience
export const simulatePayment = (request: SimulatedPaymentRequest) => 
  paymentService.simulatePayment(request)

export const renewLicense = (licenseKey: string, plan: LicensePlan, transactionId: string) => 
  paymentService.renewLicense(licenseKey, plan, transactionId)

export const processPaymentAndRenew = (request: SimulatedPaymentRequest) => 
  paymentService.processPaymentAndRenew(request)
