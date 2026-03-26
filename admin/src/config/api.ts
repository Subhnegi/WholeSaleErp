// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const API_ENDPOINTS = {
  // Auth endpoints (server uses /api/login, /api/register directly)
  LOGIN: '/api/login',
  REGISTER: '/api/register',
  LOGOUT: '/api/logout',
  VALIDATE_LICENSE: '/api/validate-license',
  RENEW_LICENSE: '/api/renew-license',
  
  // License endpoints
  LICENSE_INFO: '/api/license/info',
  
  // Payment endpoints (simulated in frontend)
  PAYMENT_PROCESS: '/api/payment/process',
  PAYMENT_VERIFY: '/api/payment/verify',
  PAYMENT_HISTORY: '/api/payment/history',
} as const

// Plan options for license renewal
export const LICENSE_PLANS = [
  {
    id: 'monthly' as const,
    name: 'Monthly',
    duration: 30,
    price: 499,
  },
  {
    id: 'quarterly' as const,
    name: 'Quarterly',
    duration: 90,
    price: 1299,
    savings: 'Save 13%',
  },
  {
    id: 'yearly' as const,
    name: 'Yearly',
    duration: 365,
    price: 4499,
    savings: 'Save 25%',
  },
  {
    id: 'lifetime' as const,
    name: 'Lifetime',
    duration: -1, // -1 indicates lifetime
    price: 14999,
    savings: 'Best Value',
  },
]
