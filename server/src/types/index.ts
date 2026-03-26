/**
 * Central Type Definitions
 * 
 * This file contains all TypeScript interfaces and types used across the application.
 * Import types from this file to maintain consistency and avoid duplication.
 */

// ===========================
// JWT & Authentication Types
// ===========================

/**
 * JWT Token Payload
 * Contains user identification data encoded in the token
 */
export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Express Request User
 * Attached to request object after authentication middleware
 */
export interface RequestUser {
  userId: string;
  email: string;
}

// ===========================
// API Request Types
// ===========================

/**
 * User Registration Request Body
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/**
 * User Login Request Body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * License Validation Request Body
 */
export interface ValidateLicenseRequest {
  licenseKey: string;
}

// ===========================
// API Response Types
// ===========================

/**
 * Standard API Success Response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
}

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

/**
 * User Response Data (excludes password)
 */
export interface UserResponse {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

/**
 * License Response Data
 */
export interface LicenseResponse {
  licenseKey: string;
  startDate: Date;
  endDate: Date;
  isTrial: boolean;
  status: string;
}

/**
 * Authentication Response Data (register/login)
 */
export interface AuthResponse {
  user: UserResponse;
  license: LicenseResponse;
  token: string;
}

/**
 * License Validation Response Data
 */
export interface LicenseValidationResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  license: LicenseResponse;
}

// ===========================
// Database Model Types
// ===========================

/**
 * User model (from Prisma)
 * Use Prisma's generated types in actual implementation
 */
export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * License model (from Prisma)
 * Use Prisma's generated types in actual implementation
 */
export type License = {
  id: string;
  licenseKey: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  isTrial: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

// ===========================
// Utility Types
// ===========================

/**
 * License Status Type
 */
export type LicenseStatus = 'active' | 'expired' | 'revoked';

/**
 * Environment Mode Type
 */
export type EnvironmentMode = 'development' | 'production' | 'test';

// ===========================
// Company & Financial Year Types
// ===========================

/**
 * Company model (from Prisma)
 */
export interface Company {
  id: string;
  companyName: string;
  printName?: string;
  printNameLang?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  mobile1?: string;
  mobile2?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
  billTitle?: string;
  userId: string;
  companyPassword?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Financial Year model (from Prisma)
 */
export interface FinancialYear {
  id: string;
  startDate: Date;
  endDate: Date;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Company Financial Year Junction model (from Prisma)
 */
export interface CompanyFinancialYear {
  id: string;
  companyId: string;
  financialYearId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

