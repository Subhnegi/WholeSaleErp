/**
 * License Enforcer Service
 * 
 * Enforces license validation:
 * - Online: Always validate with server for fresh data
 * - Offline: Fallback to local SQLite database
 */

import { app } from 'electron';
import LicenseManager from './licenseManager';

interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  requiresAction?: 'renew' | 'validate' | 'login';
  daysRemaining?: number;
  gracePeriodRemaining?: number;
}

class LicenseEnforcer {
  private static instance: LicenseEnforcer;
  private licenseManager: LicenseManager;
  
  // Configuration
  private readonly GRACE_PERIOD_DAYS = 3; // Days after expiration before blocking

  private constructor() {
    this.licenseManager = LicenseManager.getInstance();
    
    const isProduction = app.isPackaged;
    console.log(`[LicenseEnforcer] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`[LicenseEnforcer] Grace Period: ${this.GRACE_PERIOD_DAYS} days`);
  }

  static getInstance(): LicenseEnforcer {
    if (!LicenseEnforcer.instance) {
      LicenseEnforcer.instance = new LicenseEnforcer();
    }
    return LicenseEnforcer.instance;
  }

  /**
   * Check if app usage is allowed based on license status
   * - Try server validation first (if online)
   * - Fallback to local database (if offline)
   */
  async checkLicenseEnforcement(): Promise<EnforcementResult> {
    try {
      console.log('[LicenseEnforcer] === Starting license enforcement check ===');
      
      // First, ensure auth data is loaded from database (important for packaged app startup)
      const userData = await this.licenseManager.getUserData();
      
      // Check if user is logged in (has valid auth data in database)
      if (!userData || !userData.token) {
        console.log('[LicenseEnforcer] User not logged in (no auth session in database)');
        return {
          allowed: false,
          reason: 'No active session. Please login.',
          requiresAction: 'login'
        };
      }

      console.log('[LicenseEnforcer] User is logged in, proceeding with license validation');

      // Try to validate with server first
      let licenseData: any = null;
      let isOnline = false;

      try {
        console.log('[LicenseEnforcer] Attempting server validation...');
        const response = await this.licenseManager.validateLicense();
        
        if (response.success || response.data) {
          // Server responded with license data (even if expired)
          licenseData = response.data?.license || response.data;
          isOnline = true;
          console.log('[LicenseEnforcer] Server validation successful, using fresh data');
        } else {
          console.log('[LicenseEnforcer] Server validation failed:', response.message);
        }
      } catch (error) {
        console.log('[LicenseEnforcer] Server validation error (offline?):', error);
      }

      // If server failed, use the userData we already loaded
      if (!licenseData) {
        console.log('[LicenseEnforcer] Server validation failed, using local database data');
        
        if (!userData.license) {
          console.log('[LicenseEnforcer] No license data in database');
          return {
            allowed: false,
            reason: 'Unable to validate license. Please check your internet connection.',
            requiresAction: 'validate'
          };
        }
        
        licenseData = userData.license;
        console.log('[LicenseEnforcer] Using local database license data:', {
          endDate: licenseData.endDate,
          status: licenseData.status
        });
      }

      // Now check the license data
      const now = new Date();
      const expiresAt = new Date(licenseData.endDate);
      const isExpired = now > expiresAt;
      
      console.log('[LicenseEnforcer] License check:', {
        source: isOnline ? 'SERVER' : 'LOCAL_DB',
        now: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        isExpired,
        status: licenseData.status
      });

      if (isExpired) {
        // Calculate grace period
        const gracePeriodExpiresAt = new Date(expiresAt);
        gracePeriodExpiresAt.setDate(gracePeriodExpiresAt.getDate() + this.GRACE_PERIOD_DAYS);
        const inGracePeriod = now <= gracePeriodExpiresAt;
        
        console.log('[LicenseEnforcer] License expired - checking grace period:', {
          gracePeriodExpiresAt: gracePeriodExpiresAt.toISOString(),
          inGracePeriod
        });

        if (inGracePeriod) {
          const gracePeriodRemaining = Math.ceil(
            (gracePeriodExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          console.log('[LicenseEnforcer] In grace period - allowing access with warning');
          return {
            allowed: true,
            reason: `License expired. ${gracePeriodRemaining} days remaining in grace period.`,
            requiresAction: 'renew',
            gracePeriodRemaining
          };
        } else {
          console.log('[LicenseEnforcer] Grace period ended - BLOCKING ACCESS');
          return {
            allowed: false,
            reason: 'License has expired and grace period has ended. Please renew your license.',
            requiresAction: 'renew'
          };
        }
      }

      // License is valid
      const daysRemaining = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log('[LicenseEnforcer] License is valid -', daysRemaining, 'days remaining');

      return {
        allowed: true,
        daysRemaining
      };

    } catch (error) {
      console.error('License enforcement check failed:', error);
      return {
        allowed: false,
        reason: 'License validation error. Please contact support.',
        requiresAction: 'validate'
      };
    }
  }

  /**
   * Force online validation (for "I Already Renewed" button)
   */
  async forceValidation(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[LicenseEnforcer] Force validation requested');
      const response = await this.licenseManager.validateLicense();
      
      if (response.success || response.data) {
        return {
          success: true,
          message: 'License validated successfully'
        };
      } else {
        return {
          success: false,
          message: response.message || 'Validation failed'
        };
      }
    } catch (error) {
      console.error('[LicenseEnforcer] Force validation error:', error);
      return {
        success: false,
        message: 'Network error during validation'
      };
    }
  }
}

export default LicenseEnforcer;
