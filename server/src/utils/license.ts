import { v4 as uuidv4 } from 'uuid';
import { TRIAL_DURATION_DAYS, LICENSE_STATUS } from '../config/constants.js';

/**
 * Generate a unique license key
 * @returns License key in format: XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  
  // Format as XXXX-XXXX-XXXX-XXXX
  return `${uuid.substring(0, 4)}-${uuid.substring(4, 8)}-${uuid.substring(8, 12)}-${uuid.substring(12, 16)}`;
}

/**
 * Calculate trial end date
 * @param startDate - Trial start date (defaults to now)
 * @returns End date for trial license
 */
export function calculateTrialEndDate(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + TRIAL_DURATION_DAYS);
  return endDate;
}

/**
 * Check if a license is expired
 * @param endDate - License end date
 * @returns True if license is expired
 */
export function isLicenseExpired(endDate: Date): boolean {
  return new Date() > new Date(endDate);
}

/**
 * Get license status based on end date and current status
 * @param endDate - License end date
 * @param currentStatus - Current license status
 * @returns Updated license status
 */
export function getLicenseStatus(endDate: Date, currentStatus: string): string {
  if (currentStatus === LICENSE_STATUS.REVOKED) {
    return LICENSE_STATUS.REVOKED;
  }
  
  return isLicenseExpired(endDate) ? LICENSE_STATUS.EXPIRED : LICENSE_STATUS.ACTIVE;
}

/**
 * Calculate days remaining until license expires
 * @param endDate - License end date
 * @returns Number of days remaining (negative if expired)
 */
export function getDaysRemaining(endDate: Date): number {
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
