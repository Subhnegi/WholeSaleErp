/**
 * Application Constants
 * 
 * Centralized configuration values for the application.
 * Modify these values to change application behavior.
 */

// Trial License Configuration
export const TRIAL_DURATION_DAYS = parseInt(process.env.TRIAL_DURATION_DAYS || '7', 10);

// License Status
export const LICENSE_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

// JWT Configuration
export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
} as const;

// Server Configuration
export const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
} as const;

// Bcrypt Configuration
export const BCRYPT_CONFIG = {
  SALT_ROUNDS: 10,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  USER_EXISTS: 'User with this email already exists',
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  LICENSE_NOT_FOUND: 'License not found',
  LICENSE_EXPIRED: 'License has expired',
  LICENSE_REVOKED: 'License has been revoked',
  INVALID_TOKEN: 'Invalid or expired token',
  UNAUTHORIZED: 'Unauthorized access',
  SERVER_ERROR: 'Internal server error',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  REGISTRATION_SUCCESS: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  LICENSE_VALID: 'License is valid',
  LICENSE_RENEWED: 'License renewed successfully',
} as const;
