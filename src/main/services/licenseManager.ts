/**
 * License Manager Service
 * 
 * Handles user authentication and license validation with the backend server
 */

import axios, { AxiosInstance } from 'axios';
import { app } from 'electron';
import DatabaseService from './database';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface License {
  licenseKey: string;
  startDate: string;
  endDate: string;
  isTrial: boolean;
  status: string;
}

interface AuthData {
  user: User;
  license: License;
  token: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

class LicenseManager {
  private static instance: LicenseManager;
  private apiClient: AxiosInstance;
  private authData: AuthData | null = null;
  private dbService: DatabaseService;

  private constructor() {
    // Determine API URL based on environment
    const isProduction = app.isPackaged;
    const apiUrl = isProduction 
      ? 'http://129.154.225.137/api'  // Production server
      : 'http://localhost:3000/api';   // Development server
    
    console.log(`[LicenseManager] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`[LicenseManager] API URL: ${apiUrl}`);
    
    // Initialize API client
    this.apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Get database service instance
    this.dbService = DatabaseService.getInstance();

    // Load saved auth data from SQLite
    this.loadAuthData();
  }

  static getInstance(): LicenseManager {
    if (!LicenseManager.instance) {
      LicenseManager.instance = new LicenseManager();
    }
    return LicenseManager.instance;
  }

  /**
   * Load authentication data from SQLite database
   */
  private async loadAuthData(): Promise<void> {
    try {
      // Ensure database is initialized first
      await this.dbService.initialize();
      
      const session = await this.dbService.getAuthSession();
      
      if (session) {
        this.authData = {
          user: {
            id: session.userId,
            name: session.userName,
            email: session.userEmail,
            createdAt: session.createdAt instanceof Date 
              ? session.createdAt.toISOString() 
              : session.createdAt,
          },
          license: {
            licenseKey: session.licenseKey,
            startDate: session.licenseStartDate,
            endDate: session.licenseEndDate,
            isTrial: Boolean(session.licenseIsTrial),
            status: session.licenseStatus,
          },
          token: session.token,
        };
        
        // Set authorization header if token exists
        if (this.authData.token) {
          this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${this.authData.token}`;
        }
      } else {
        this.authData = null;
      }
    } catch (error) {
      console.error('Failed to load auth data:', error);
      this.authData = null;
    }
  }

  /**
   * Save authentication data to SQLite database
   */
  private async saveAuthData(data: AuthData): Promise<void> {
    try {
      // Ensure dates are strings (serialize if needed)
      const serializedData: AuthData = {
        user: {
          ...data.user,
          createdAt: typeof data.user.createdAt === 'string' 
            ? data.user.createdAt 
            : new Date(data.user.createdAt).toISOString()
        },
        license: {
          ...data.license,
          startDate: typeof data.license.startDate === 'string'
            ? data.license.startDate
            : new Date(data.license.startDate).toISOString(),
          endDate: typeof data.license.endDate === 'string'
            ? data.license.endDate
            : new Date(data.license.endDate).toISOString()
        },
        token: data.token
      };

      await this.dbService.saveAuthSession({
        userId: serializedData.user.id,
        userName: serializedData.user.name,
        userEmail: serializedData.user.email,
        token: serializedData.token,
        licenseKey: serializedData.license.licenseKey,
        licenseStartDate: serializedData.license.startDate,
        licenseEndDate: serializedData.license.endDate,
        licenseIsTrial: serializedData.license.isTrial,
        licenseStatus: serializedData.license.status,
      });
      
      this.authData = serializedData;
      
      // Set authorization header
      this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${serializedData.token}`;
    } catch (error) {
      console.error('Failed to save auth data:', error);
      throw new Error('Failed to save authentication data');
    }
  }

  /**
   * Clear authentication data from SQLite database
   */
  private async clearAuthData(): Promise<void> {
    try {
      await this.dbService.clearAuthSession();
      this.authData = null;
      delete this.apiClient.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      // Still clear in-memory data even if database operation fails
      this.authData = null;
      delete this.apiClient.defaults.headers.common['Authorization'];
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<ApiResponse<AuthData>> {
    try {
      const response = await this.apiClient.post<ApiResponse<AuthData>>('/register', data);
      
      if (response.data.success && response.data.data) {
        await this.saveAuthData(response.data.data);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<ApiResponse<AuthData>> {
    try {
      const response = await this.apiClient.post<ApiResponse<AuthData>>('/login', data);
      
      if (response.data.success && response.data.data) {
        await this.saveAuthData(response.data.data);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse> {
    try {
      await this.apiClient.post('/logout');
      await this.clearAuthData();
      
      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error: any) {
      console.error('Logout error:', error);
      // Clear local data even if API call fails
      await this.clearAuthData();
      
      return {
        success: true,
        message: 'Logout successful',
      };
    }
  }

  /**
   * Validate license key
   */
  async validateLicense(licenseKey?: string): Promise<ApiResponse<{ user: User; license: License }>> {
    try {
      const key = licenseKey || this.authData?.license.licenseKey;
      
      if (!key) {
        return {
          success: false,
          message: 'No license key available',
        };
      }

      const response = await this.apiClient.post<ApiResponse<{ user: User; license: License }>>(
        '/validate-license',
        { licenseKey: key }
      );
      
      // Update local license data if validation successful
      if (response.data.success && response.data.data && this.authData) {
        this.authData.license = response.data.data.license;
        await this.saveAuthData(this.authData);
        console.log('[LicenseManager] Updated local database with fresh license data from server');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('License validation error:', error);
      
      // Check if server returned license data even with 403 (expired license)
      if (error.response?.status === 403 && error.response?.data?.data) {
        console.log('[LicenseManager] License expired - updating local database with fresh server data');
        console.log('[LicenseManager] Server data:', JSON.stringify(error.response.data, null, 2));
        
        // Update local database with expired license data from server
        if (this.authData && error.response.data.data.license) {
          this.authData.license = error.response.data.data.license;
          await this.saveAuthData(this.authData);
          console.log('[LicenseManager] Local database updated with expired license from server');
        }
        
        // Return the expired license data so the enforcer can process it
        const result = {
          success: false,
          message: error.response.data.message || 'License has expired',
          data: error.response.data.data
        };
        console.log('[LicenseManager] Returning:', JSON.stringify(result, null, 2));
        return result;
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'License validation failed',
      };
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.authData !== null && this.authData.token !== undefined;
  }

  /**
   * Get current user data
   */
  /**
   * Get user data - always reads fresh from database to avoid stale cache
   * Automatically calculates and updates status based on current date
   */
  async getUserData(): Promise<AuthData | null> {
    try {
      const session = await this.dbService.getAuthSession();
      
      if (!session) {
        return null;
      }
      
      // Calculate current status based on endDate
      const now = new Date();
      const endDate = new Date(session.licenseEndDate);
      const isExpired = now > endDate;
      
      // Determine status: 'active' or 'expired'
      const currentStatus = isExpired ? 'expired' : 'active';
      
      // If status changed in database, update it
      if (currentStatus !== session.licenseStatus) {
        console.log(`[LicenseManager] License status auto-update: ${session.licenseStatus} -> ${currentStatus}`);
        await this.dbService.updateLicenseStatus(currentStatus, isExpired);
      }
      
      return {
        user: {
          id: session.userId,
          name: session.userName,
          email: session.userEmail,
          createdAt: session.createdAt instanceof Date 
            ? session.createdAt.toISOString() 
            : session.createdAt,
        },
        license: {
          licenseKey: session.licenseKey,
          startDate: session.licenseStartDate,
          endDate: session.licenseEndDate,
          isTrial: isExpired ? false : Boolean(session.licenseIsTrial), // Trial becomes false after expiration
          status: currentStatus, // Use calculated status
        },
        token: session.token,
      };
    } catch (error) {
      console.error('[LicenseManager] Failed to get user data:', error);
      return null;
    }
  }

  /**
   * Get user data synchronously from memory cache (for quick checks)
   * Note: May be stale if database was updated externally
   */
  getUserDataSync(): AuthData | null {
    return this.authData;
  }

  /**
   * Check if license is expired
   */
  isLicenseExpired(): boolean {
    if (!this.authData?.license) return true;
    
    const endDate = new Date(this.authData.license.endDate);
    return new Date() > endDate;
  }

  /**
   * Get days remaining on license
   */
  getDaysRemaining(): number {
    if (!this.authData?.license) return 0;
    
    const endDate = new Date(this.authData.license.endDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
}

export default LicenseManager;
