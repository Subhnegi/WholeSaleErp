import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new account group
 * POST /api/account-groups
 */
export const createAccountGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, name, parentGroupId, companyId } = req.body;

    // Validation
    if (!name || !companyId) {
      res.status(400).json({
        success: false,
        message: 'Name and company ID are required'
      });
      return;
    }

    // Validate company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    // Determine level based on parent
    let level = 0;
    if (parentGroupId) {
      const parent = await prisma.accountGroup.findUnique({
        where: { id: parentGroupId }
      });

      if (!parent) {
        res.status(404).json({
          success: false,
          message: 'Parent account group not found'
        });
        return;
      }

      if (parent.level >= 1) {
        res.status(400).json({
          success: false,
          message: 'Cannot create more than 1 level of nesting'
        });
        return;
      }

      level = parent.level + 1;
    }

    // Use provided ID (for sync) or generate new one
    const accountGroupId = id || uuidv4();

    // Check if account group with this ID already exists (for sync/upsert behavior)
    const existingAccountGroup = await prisma.accountGroup.findUnique({
      where: { id: accountGroupId }
    });

    let accountGroup;
    if (existingAccountGroup) {
      // Update existing account group
      accountGroup = await prisma.accountGroup.update({
        where: { id: accountGroupId },
        data: { name, parentGroupId, level }
      });
    } else {
      // Create new account group
      accountGroup = await prisma.accountGroup.create({
        data: {
          id: accountGroupId,
          name,
          parentGroupId,
          level,
          companyId
        }
      });
    }

    res.status(existingAccountGroup ? 200 : 201).json({
      success: true,
      message: existingAccountGroup ? 'Account group updated successfully' : 'Account group created successfully',
      data: accountGroup
    });
  } catch (error: any) {
    console.error('Create account group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create account group',
      error: error.message
    });
  }
};

/**
 * Get all account groups for a company
 * GET /api/account-groups/company/:companyId
 */
export const getAccountGroupsByCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId } = req.params;

    const accountGroups = await prisma.accountGroup.findMany({
      where: { companyId },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        parentGroup: true,
        subGroups: true,
        _count: {
          select: { accounts: true }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: accountGroups
    });
  } catch (error: any) {
    console.error('Get account groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account groups',
      error: error.message
    });
  }
};

/**
 * Get a single account group by ID
 * GET /api/account-groups/:id
 */
export const getAccountGroupById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const accountGroup = await prisma.accountGroup.findUnique({
      where: { id },
      include: {
        parentGroup: true,
        subGroups: true,
        accounts: true
      }
    });

    if (!accountGroup) {
      res.status(404).json({
        success: false,
        message: 'Account group not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: accountGroup
    });
  } catch (error: any) {
    console.error('Get account group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch account group',
      error: error.message
    });
  }
};

/**
 * Update an account group
 * PUT /api/account-groups/:id
 */
export const updateAccountGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, parentGroupId } = req.body;

    // Check if exists
    const existing = await prisma.accountGroup.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Account group not found'
      });
      return;
    }

    let level = existing.level;

    // Validate parent if provided
    if (parentGroupId !== undefined) {
      if (parentGroupId) {
        const parent = await prisma.accountGroup.findUnique({
          where: { id: parentGroupId }
        });

        if (!parent) {
          res.status(404).json({
            success: false,
            message: 'Parent account group not found'
          });
          return;
        }

        if (parent.level >= 1) {
          res.status(400).json({
            success: false,
            message: 'Cannot create more than 1 level of nesting'
          });
          return;
        }

        level = parent.level + 1;
      } else {
        level = 0;
      }
    }

    const accountGroup = await prisma.accountGroup.update({
      where: { id },
      data: {
        name,
        parentGroupId,
        level
      }
    });

    res.status(200).json({
      success: true,
      message: 'Account group updated successfully',
      data: accountGroup
    });
  } catch (error: any) {
    console.error('Update account group error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update account group',
      error: error.message
    });
  }
};

/**
 * Delete an account group
 * DELETE /api/account-groups/:id
 */
export const deleteAccountGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if group has sub-groups
    const subGroupsCount = await prisma.accountGroup.count({
      where: { parentGroupId: id }
    });

    if (subGroupsCount > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete account group with sub-groups'
      });
      return;
    }

    // Check if group has accounts
    const accountsCount = await prisma.account.count({
      where: { accountGroupId: id }
    });

    if (accountsCount > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete account group with accounts'
      });
      return;
    }

    await prisma.accountGroup.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Account group deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete account group error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Account group not found'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete account group',
      error: error.message
    });
  }
};
