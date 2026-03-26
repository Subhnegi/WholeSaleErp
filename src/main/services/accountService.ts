import axios, { AxiosInstance } from 'axios';
import DatabaseService from './database';
import { v4 as uuidv4 } from 'uuid';
import type { Account, AccountCreateInput, ApiResponse } from '../types/account';

class AccountService {
  private static instance: AccountService;
  private apiClient: AxiosInstance;
  private dbService: DatabaseService;
  private baseURL: string;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.baseURL = process.env.API_URL || 'http://localhost:3000/api';
    
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public static getInstance(): AccountService {
    if (!AccountService.instance) {
      AccountService.instance = new AccountService();
    }
    return AccountService.instance;
  }

  /**
   * Set authentication token for API requests
   */
  public setAuthToken(token: string) {
    this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Create a new account (LOCAL-FIRST)
   */
  public async createAccount(data: AccountCreateInput): Promise<ApiResponse<Account>> {
    try {
      // Verify account group exists
      const group = await this.dbService.getAccountGroupById(data.accountGroupId);

      if (!group) {
        return {
          success: false,
          message: 'Account group not found',
          error: 'Invalid account group ID'
        };
      }

      const accountId = uuidv4();
      const account = await this.dbService.createAccount({
        id: accountId,
        accountName: data.accountName,
        code: data.code,
        accountGroupId: data.accountGroupId,
        companyId: data.companyId,
        openingBalance: data.openingBalance || 0,
        drCr: data.drCr || 'Dr',
        area: data.area,
        srNo: data.srNo,
        crLimit: data.crLimit,
        nameLang: data.nameLang,
        address: data.address,
        address2: data.address2,
        city: data.city,
        state: data.state,
        panNo: data.panNo,
        mobile1: data.mobile1,
        mobile2: data.mobile2,
        bankName1: data.bankName1,
        accountNo1: data.accountNo1,
        bankName2: data.bankName2,
        accountNo2: data.accountNo2,
        contactPerson: data.contactPerson,
        ledgerFolioNo: data.ledgerFolioNo,
        auditUpto: data.auditUpto,
        maintainBillByBillBalance: data.maintainBillByBillBalance || false,
        photo: data.photo
      });

      return {
        success: true,
        message: 'Account created successfully',
        data: account as Account
      };
    } catch (error: any) {
      console.error('Create account error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create account',
        error: error.message
      };
    }
  }

  /**
   * Get all accounts for a company
   */
  public async getAccountsByCompany(companyId: string): Promise<ApiResponse<Account[]>> {
    try {
      const accounts = await this.dbService.getAccountsByCompany(companyId);

      return {
        success: true,
        message: 'Accounts loaded from local database',
        data: accounts as Account[]
      };
    } catch (error: any) {
      console.error('Get accounts error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch accounts',
        error: error.message
      };
    }
  }

  /**
   * Get accounts by account group
   */
  public async getAccountsByGroup(accountGroupId: string): Promise<ApiResponse<Account[]>> {
    try {
      const accounts = await this.dbService.getAccountsByGroup(accountGroupId);

      return {
        success: true,
        data: accounts as Account[]
      };
    } catch (error: any) {
      console.error('Get accounts by group error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch accounts',
        error: error.message
      };
    }
  }

  /**
   * Get a single account by ID
   */
  public async getAccountById(id: string): Promise<ApiResponse<Account>> {
    try {
      const account = await this.dbService.getAccountById(id);

      if (!account) {
        return {
          success: false,
          message: 'Account not found',
          error: 'Not found'
        };
      }

      return {
        success: true,
        data: account as Account
      };
    } catch (error: any) {
      console.error('Get account error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch account',
        error: error.message
      };
    }
  }

  /**
   * Update an account (LOCAL-FIRST)
   */
  public async updateAccount(id: string, data: Partial<AccountCreateInput>): Promise<ApiResponse<Account>> {
    try {
      const existing = await this.dbService.getAccountById(id);

      if (!existing) {
        return {
          success: false,
          message: 'Account not found',
          error: 'Not found'
        };
      }

      await this.dbService.updateAccount(id, data);

      return {
        success: true,
        message: 'Account updated successfully'
      };
    } catch (error: any) {
      console.error('Update account error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update account',
        error: error.message
      };
    }
  }

  /**
   * Delete an account (LOCAL-FIRST)
   */
  public async deleteAccount(id: string): Promise<ApiResponse> {
    try {
      await this.dbService.deleteAccount(id);

      return {
        success: true,
        message: 'Account deleted successfully'
      };
    } catch (error: any) {
      console.error('Delete account error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete account',
        error: error.message
      };
    }
  }

  /**
   * Bulk delete accounts (LOCAL-FIRST)
   */
  public async bulkDeleteAccounts(ids: string[]): Promise<ApiResponse> {
    try {
      await this.dbService.bulkDeleteAccounts(ids);

      return {
        success: true,
        message: `${ids.length} accounts deleted successfully`
      };
    } catch (error: any) {
      console.error('Bulk delete accounts error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete accounts',
        error: error.message
      };
    }
  }

  /**
   * Bulk update account group (LOCAL-FIRST)
   */
  public async bulkUpdateAccountGroup(ids: string[], accountGroupId: string): Promise<ApiResponse> {
    try {
      // Verify account group exists
      const group = await this.dbService.getAccountGroupById(accountGroupId);

      if (!group) {
        return {
          success: false,
          message: 'Account group not found',
          error: 'Invalid account group ID'
        };
      }

      await this.dbService.bulkUpdateAccountGroup(ids, accountGroupId);

      return {
        success: true,
        message: `${ids.length} accounts updated successfully`
      };
    } catch (error: any) {
      console.error('Bulk update account group error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update accounts',
        error: error.message
      };
    }
  }
}

export const accountService = AccountService.getInstance();
