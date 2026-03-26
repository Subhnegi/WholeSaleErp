import axios, { AxiosInstance } from 'axios';
import DatabaseService from './database';
import { v4 as uuidv4 } from 'uuid';
import type { Company, ApiResponse } from '../types';

class CompanyService {
  private static instance: CompanyService;
  private apiClient: AxiosInstance;
  private dbService: DatabaseService;
  private baseURL: string;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    // Main process doesn't have Vite env variables, use process.env or default
    this.baseURL = process.env.API_URL || 'http://localhost:3000/api';
    
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public static getInstance(): CompanyService {
    if (!CompanyService.instance) {
      CompanyService.instance = new CompanyService();
    }
    return CompanyService.instance;
  }

  /**
   * Set authentication token for API requests
   */
  public setAuthToken(token: string) {
    this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Create a new company (LOCAL-FIRST: SQLite only, sync later)
   */
  public async createCompany(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Company>> {
    try {
      // Validate financial year fields
      if (!data.fyStartDate || !data.fyEndDate || !data.fyLabel) {
        return {
          success: false,
          message: 'Financial year information is required',
          error: 'Missing financial year fields'
        };
      }

      // Validate dates
      const startDate = new Date(data.fyStartDate);
      const endDate = new Date(data.fyEndDate);

      if (endDate <= startDate) {
        return {
          success: false,
          message: 'Financial year end date must be after start date',
          error: 'Invalid date range'
        };
      }

      // LOCAL-FIRST: Create in SQLite directly, no server call
      const companyId = uuidv4();
      
      const now = new Date();
      const company: Company = {
        ...data,
        id: companyId,
        createdAt: now,
        updatedAt: now
      };

      // Convert Date objects to ISO strings for SQLite
      const dbData = {
        ...company,
        fyStartDate: typeof company.fyStartDate === 'string' ? company.fyStartDate : company.fyStartDate.toISOString(),
        fyEndDate: typeof company.fyEndDate === 'string' ? company.fyEndDate : company.fyEndDate.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      await this.dbService.createCompany(dbData);
      
      return {
        success: true,
        message: 'Company created successfully',
        data: company
      };
    } catch (error: any) {
      console.error('Create company error:', error);
      
      return {
        success: false,
        message: error.message || 'Failed to create company',
        error: error.message
      };
    }
  }

  /**
   * Get companies for a user (LOCAL-FIRST: SQLite only)
   */
  public async getCompaniesByUserId(userId: string): Promise<ApiResponse<Company[]>> {
    try {
      // LOCAL-FIRST: Read from SQLite directly
      const companies = await this.dbService.getCompaniesByUserId(userId);

      return {
        success: true,
        message: 'Companies loaded from local database',
        data: companies
      };
    } catch (error: any) {
      console.error('Get companies error:', error);

      return {
        success: false,
        message: error.message || 'Failed to fetch companies',
        error: error.message
      };
    }
  }

  /**
   * Update a company (LOCAL-FIRST: SQLite only, sync later)
   */
  public async updateCompany(id: string, data: Partial<Company>): Promise<ApiResponse<Company>> {
    try {
      // Convert Date objects to ISO strings for SQLite
      const dbData: any = { ...data };
      if (dbData.fyStartDate && typeof dbData.fyStartDate !== 'string') {
        dbData.fyStartDate = dbData.fyStartDate.toISOString();
      }
      if (dbData.fyEndDate && typeof dbData.fyEndDate !== 'string') {
        dbData.fyEndDate = dbData.fyEndDate.toISOString();
      }
      if (dbData.createdAt && typeof dbData.createdAt !== 'string') {
        dbData.createdAt = dbData.createdAt.toISOString();
      }
      if (dbData.updatedAt && typeof dbData.updatedAt !== 'string') {
        dbData.updatedAt = dbData.updatedAt.toISOString();
      }

      // LOCAL-FIRST: Update in SQLite directly
      await this.dbService.updateCompany(id, dbData);

      return {
        success: true,
        message: 'Company updated locally. Will sync to server later.',
        data: { id, ...data } as Company
      };
    } catch (error: any) {
      console.error('Update company error:', error);

      return {
        success: false,
        message: error.message || 'Failed to update company',
        error: error.message
      };
    }
  }

  /**
   * Delete a company (LOCAL-FIRST: SQLite only, sync later)
   */
  public async deleteCompany(id: string): Promise<ApiResponse> {
    try {
      // LOCAL-FIRST: Delete from SQLite directly
      await this.dbService.deleteCompany(id);

      return {
        success: true,
        message: 'Company deleted locally. Will sync to server later.'
      };
    } catch (error: any) {
      console.error('Delete company error:', error);

      return {
        success: false,
        message: error.message || 'Failed to delete company',
        error: error.message
      };
    }
  }
}

export const companyService = CompanyService.getInstance();
