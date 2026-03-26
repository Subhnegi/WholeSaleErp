/**
 * Centralized Type Exports
 * 
 * This barrel file exports all types used throughout the application.
 * Import from here to maintain consistency and ease refactoring.
 * 
 * @example
 * import { User, License, AuthState } from '@/types'
 */

// Auth Types
export type {
  User,
  License,
  AuthData,
  AuthState,
  LoginCredentials,
  RegisterCredentials,
} from './auth';

// License Types
export type {
  EnforcementResult,
  GracePeriodStatus,
  LicenseState,
  ValidationResult,
} from './license';

// Database Types
export type {
  VersionInfo,
  Meta,
  PhaseStatus,
} from './database';

// API Types
export type {
  ApiResponse,
  ApiError,
} from './api';

// Company Types
export type {
  Company,
  CompanyState,
} from './company';

