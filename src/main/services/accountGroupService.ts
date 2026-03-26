import axios, { AxiosInstance } from 'axios';
import DatabaseService from './database';
import { v4 as uuidv4 } from 'uuid';
import type { AccountGroup, AccountGroupCreateInput, ApiResponse } from '../types/account';

class AccountGroupService {
  private static instance: AccountGroupService;
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

  public static getInstance(): AccountGroupService {
    if (!AccountGroupService.instance) {
      AccountGroupService.instance = new AccountGroupService();
    }
    return AccountGroupService.instance;
  }

  /**
   * Set authentication token for API requests
   */
  public setAuthToken(token: string) {
    this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Create a new account group (LOCAL-FIRST)
   */
  public async createAccountGroup(data: AccountGroupCreateInput): Promise<ApiResponse<AccountGroup>> {
    try {
      // Check for duplicate name at the same level
      const existingGroups = await this.dbService.getAccountGroupsByCompany(data.companyId);
      const duplicateAtSameLevel = existingGroups.find(
        g => g.name.toLowerCase() === data.name.toLowerCase() && 
             g.parentGroupId === data.parentGroupId
      );
      
      if (duplicateAtSameLevel) {
        return {
          success: false,
          message: 'A group with this name already exists at the same level',
          error: 'Duplicate name'
        };
      }

      // Determine level based on parent
      let level = 0;
      if (data.parentGroupId) {
        const parent = await this.dbService.getAccountGroupById(data.parentGroupId);
        
        if (!parent) {
          return {
            success: false,
            message: 'Parent account group not found',
            error: 'Invalid parent group ID'
          };
        }
        
        if (parent.level >= 2) {
          return {
            success: false,
            message: 'Cannot create more than 2 levels of nesting',
            error: 'Maximum nesting level exceeded'
          };
        }
        
        level = parent.level + 1;
      }
      
      const accountGroupId = uuidv4();
      const accountGroup = await this.dbService.createAccountGroup({
        id: accountGroupId,
        name: data.name,
        parentGroupId: data.parentGroupId,
        level,
        companyId: data.companyId
      });

      return {
        success: true,
        message: 'Account group created successfully',
        data: accountGroup as AccountGroup
      };
    } catch (error: any) {
      console.error('Create account group error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create account group',
        error: error.message
      };
    }
  }

  /**
   * Get all account groups for a company
   */
  public async getAccountGroupsByCompany(companyId: string): Promise<ApiResponse<AccountGroup[]>> {
    try {
      const accountGroups = await this.dbService.getAccountGroupsByCompany(companyId);

      return {
        success: true,
        message: 'Account groups loaded from local database',
        data: accountGroups as AccountGroup[]
      };
    } catch (error: any) {
      console.error('Get account groups error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch account groups',
        error: error.message
      };
    }
  }

  /**
   * Get a single account group by ID
   */
  public async getAccountGroupById(id: string): Promise<ApiResponse<AccountGroup>> {
    try {
      const accountGroup = await this.dbService.getAccountGroupById(id);

      if (!accountGroup) {
        return {
          success: false,
          message: 'Account group not found',
          error: 'Not found'
        };
      }

      return {
        success: true,
        data: accountGroup as AccountGroup
      };
    } catch (error: any) {
      console.error('Get account group error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch account group',
        error: error.message
      };
    }
  }

  /**
   * Update an account group (LOCAL-FIRST)
   */
  public async updateAccountGroup(id: string, data: Partial<AccountGroupCreateInput>): Promise<ApiResponse<AccountGroup>> {
    try {
      const existing = await this.dbService.getAccountGroupById(id);

      if (!existing) {
        return {
          success: false,
          message: 'Account group not found',
          error: 'Not found'
        };
      }

      // Check for duplicate name at the same level
      if (data.name !== undefined) {
        const existingGroups = await this.dbService.getAccountGroupsByCompany(existing.companyId);
        const parentGroupId = data.parentGroupId !== undefined ? data.parentGroupId : existing.parentGroupId;
        const duplicateAtSameLevel = existingGroups.find(
          g => g.id !== id &&
               g.name.toLowerCase() === data.name!.toLowerCase() && 
               g.parentGroupId === parentGroupId
        );
        
        if (duplicateAtSameLevel) {
          return {
            success: false,
            message: 'A group with this name already exists at the same level',
            error: 'Duplicate name'
          };
        }
      }

      let level = existing.level;
      
      if (data.parentGroupId !== undefined) {
        // Validate new parent
        if (data.parentGroupId) {
          const parent = await this.dbService.getAccountGroupById(data.parentGroupId);
          
          if (!parent) {
            return {
              success: false,
              message: 'Parent account group not found',
              error: 'Invalid parent group ID'
            };
          }
          
          if (parent.level >= 2) {
            return {
              success: false,
              message: 'Cannot create more than 2 levels of nesting',
              error: 'Maximum nesting level exceeded'
            };
          }
          
          level = parent.level + 1;
        } else {
          level = 0;
        }
      }

      await this.dbService.updateAccountGroup(id, {
        name: data.name,
        parentGroupId: data.parentGroupId,
        level
      });

      return {
        success: true,
        message: 'Account group updated successfully'
      };
    } catch (error: any) {
      console.error('Update account group error:', error);
      return {
        success: false,
        message: error.message || 'Failed to update account group',
        error: error.message
      };
    }
  }

  /**
   * Delete an account group (LOCAL-FIRST)
   */
  public async deleteAccountGroup(id: string): Promise<ApiResponse> {
    try {
      const group = await this.dbService.getAccountGroupById(id);

      if (!group) {
        return {
          success: false,
          message: 'Account group not found',
          error: 'Not found'
        };
      }

      // Check if group has sub-groups
      if (group.subGroups && group.subGroups.length > 0) {
        return {
          success: false,
          message: 'Cannot delete account group with sub-groups',
          error: 'Has child groups'
        };
      }

      // Check if group has accounts
      if (group.accounts && group.accounts.length > 0) {
        return {
          success: false,
          message: 'Cannot delete account group with accounts',
          error: 'Has associated accounts'
        };
      }

      await this.dbService.deleteAccountGroup(id);

      return {
        success: true,
        message: 'Account group deleted successfully'
      };
    } catch (error: any) {
      console.error('Delete account group error:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete account group',
        error: error.message
      };
    }
  }

  /**
   * Bulk delete account groups (LOCAL-FIRST)
   */
  public async bulkDeleteAccountGroups(ids: string[]): Promise<ApiResponse<{ deletedCount: number; failedCount: number; errors: string[] }>> {
    try {
      let deletedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const id of ids) {
        const result = await this.deleteAccountGroup(id);
        if (result.success) {
          deletedCount++;
        } else {
          failedCount++;
          errors.push(`${id}: ${result.message}`);
        }
      }

      return {
        success: true,
        message: `Deleted ${deletedCount} group(s), ${failedCount} failed`,
        data: { deletedCount, failedCount, errors }
      };
    } catch (error: any) {
      console.error('Bulk delete account groups error:', error);
      return {
        success: false,
        message: error.message || 'Failed to bulk delete account groups',
        error: error.message
      };
    }
  }
}

export const accountGroupService = AccountGroupService.getInstance();
