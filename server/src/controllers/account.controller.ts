import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new account
 * POST /api/accounts
 */
export const createAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, ...accountData } = req.body;

    // Validation
    if (!accountData.accountName || !accountData.accountGroupId || !accountData.companyId) {
      res.status(400).json({
        success: false,
        message: 'Account name, account group ID, and company ID are required'
      });
      return;
    }

    // Validate company exists
    const company = await prisma.company.findUnique({
      where: { id: accountData.companyId }
    });

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    // Validate account group exists
    const accountGroup = await prisma.accountGroup.findUnique({
      where: { id: accountData.accountGroupId }
    });

    if (!accountGroup) {
      res.status(404).json({
        success: false,
        message: 'Account group not found'
      });
      return;
    }

    // Use provided ID (for sync) or generate new one
    const accountId = id || uuidv4();

    // Check if account with this ID already exists (for sync/upsert behavior)
    const existingAccount = await prisma.account.findUnique({
      where: { id: accountId }
    });

    let account;
    if (existingAccount) {
      // Update existing account
      account = await prisma.account.update({
        where: { id: accountId },
        data: accountData
      });
    } else {
      // Create new account
      account = await prisma.account.create({
        data: {
          id: accountId,
          ...accountData
        }
      });
    }

    res.status(existingAccount ? 200 : 201).json({
      success: true,
      message: existingAccount ? 'Account updated successfully' : 'Account created successfully',
      data: account
    });
  } catch (error: any) {
    console.error('Create account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account',
      error: error.message
    });
  }
};

/**
 * Get all accounts for a company
 * GET /api/accounts/company/:companyId
 */
export const getAccountsByCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;

    const accounts = await prisma.account.findMany({
      where: { companyId },
      orderBy: { accountName: 'asc' },
      include: {
        accountGroup: true
      }
    });

    res.status(200).json({
      success: true,
      data: accounts
    });
  } catch (error: any) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounts',
      error: error.message
    });
  }
};

/**
 * Get accounts by account group
 * GET /api/accounts/group/:accountGroupId
 */
export const getAccountsByGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accountGroupId } = req.params;

    const accounts = await prisma.account.findMany({
      where: { accountGroupId },
      orderBy: { accountName: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: accounts
    });
  } catch (error: any) {
    console.error('Get accounts by group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accounts',
      error: error.message
    });
  }
};

/**
 * Get a single account by ID
 * GET /api/accounts/:id
 */
export const getAccountById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        accountGroup: true
      }
    });

    if (!account) {
      res.status(404).json({
        success: false,
        message: 'Account not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error: any) {
    console.error('Get account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account',
      error: error.message
    });
  }
};

/**
 * Update an account
 * PUT /api/accounts/:id
 */
export const updateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.companyId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const account = await prisma.account.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Account updated successfully',
      data: account
    });
  } catch (error: any) {
    console.error('Update account error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Account not found'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update account',
      error: error.message
    });
  }
};

/**
 * Delete an account
 * DELETE /api/accounts/:id
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.account.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete account error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Account not found'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
};

/**
 * Bulk delete accounts
 * POST /api/accounts/bulk-delete
 */
export const bulkDeleteAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'IDs array is required and must not be empty'
      });
      return;
    }

    const result = await prisma.account.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    res.status(200).json({
      success: true,
      message: `${result.count} accounts deleted successfully`,
      data: { count: result.count }
    });
  } catch (error: any) {
    console.error('Bulk delete accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete accounts',
      error: error.message
    });
  }
};

/**
 * Bulk update account group
 * POST /api/accounts/bulk-update-group
 */
export const bulkUpdateAccountGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, accountGroupId } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'IDs array is required and must not be empty'
      });
      return;
    }

    if (!accountGroupId) {
      res.status(400).json({
        success: false,
        message: 'Account group ID is required'
      });
      return;
    }

    // Validate account group exists
    const accountGroup = await prisma.accountGroup.findUnique({
      where: { id: accountGroupId }
    });

    if (!accountGroup) {
      res.status(404).json({
        success: false,
        message: 'Account group not found'
      });
      return;
    }

    const result = await prisma.account.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        accountGroupId
      }
    });

    res.status(200).json({
      success: true,
      message: `${result.count} accounts updated successfully`,
      data: { count: result.count }
    });
  } catch (error: any) {
    console.error('Bulk update account group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update accounts',
      error: error.message
    });
  }
};
