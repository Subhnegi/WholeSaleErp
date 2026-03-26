/**
 * License Enforcement Types
 */

export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  requiresAction?: 'renew' | 'validate' | 'login';
  daysRemaining?: number;
  gracePeriodRemaining?: number;
}

export interface GracePeriodStatus {
  inGracePeriod: boolean;
  daysRemaining: number;
  expiresAt: string | null;
}

export interface LicenseState {
  enforcement: EnforcementResult | null;
  gracePeriodStatus: GracePeriodStatus | null;
  lastValidationTime: string | null;
  needsValidation: boolean;
  validating: boolean;
  error: string | null;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    license: {
      licenseKey: string;
      startDate: string;
      endDate: string;
      isTrial: boolean;
      status: string;
    };
  };
}
