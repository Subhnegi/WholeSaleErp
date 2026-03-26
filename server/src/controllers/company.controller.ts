import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new company
 * POST /api/companies
 */
export const createCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id,  // Accept ID from client for sync purposes
      companyName,
      printName,
      printNameLang,
      addressLine1,
      addressLine2,
      city,
      state,
      countryCode,
      mobile1,
      mobile2,
      email,
      website,
      contactPerson,
      billTitle,
      userId,
      companyPassword,
      fyStartDate,
      fyEndDate,
      fyLabel
    } = req.body;

    // Validation
    if (!companyName || !userId) {
      res.status(400).json({
        success: false,
        message: 'Company name and user ID are required'
      });
      return;
    }

    // Validate financial year fields
    if (!fyStartDate || !fyEndDate || !fyLabel) {
      res.status(400).json({
        success: false,
        message: 'Financial year start date, end date, and label are required'
      });
      return;
    }

    // Validate dates
    const start = new Date(fyStartDate);
    const end = new Date(fyEndDate);

    if (end <= start) {
      res.status(400).json({
        success: false,
        message: 'Financial year end date must be after start date'
      });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Use provided ID (for sync) or generate new one
    const companyId = id || uuidv4();

    // Check if company with this ID already exists (for sync/upsert behavior)
    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId }
    });

    let company;
    if (existingCompany) {
      // Update existing company
      company = await prisma.company.update({
        where: { id: companyId },
        data: {
          companyName,
          printName,
          printNameLang,
          addressLine1,
          addressLine2,
          city,
          state,
          countryCode,
          mobile1,
          mobile2,
          email,
          website,
          contactPerson,
          billTitle,
          companyPassword,
          fyStartDate: start,
          fyEndDate: end,
          fyLabel
        }
      });
    } else {
      // Create new company
      company = await prisma.company.create({
        data: {
          id: companyId,
          companyName,
          printName,
          printNameLang,
          addressLine1,
          addressLine2,
          city,
          state,
          countryCode,
          mobile1,
          mobile2,
          email,
          website,
          contactPerson,
          billTitle,
          userId,
          companyPassword,
          fyStartDate: start,
          fyEndDate: end,
          fyLabel
        }
      });
    }

    res.status(existingCompany ? 200 : 201).json({
      success: true,
      message: existingCompany ? 'Company updated successfully' : 'Company created successfully',
      data: company
    });
  } catch (error: any) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company',
      error: error.message
    });
  }
};

/**
 * Get all companies for a user
 * GET /api/companies/user/:userId
 */
export const getCompaniesByUserId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const companies = await prisma.company.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: companies
    });
  } catch (error: any) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error.message
    });
  }
};

/**
 * Get a single company by ID
 * GET /api/companies/:id
 */
export const getCompanyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: company
    });
  } catch (error: any) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company',
      error: error.message
    });
  }
};

/**
 * Update a company
 * PUT /api/companies/:id
 */
export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const company = await prisma.company.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Company updated successfully',
      data: company
    });
  } catch (error: any) {
    console.error('Update company error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: error.message
    });
  }
};

/**
 * Delete a company
 * DELETE /api/companies/:id
 */
export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.company.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Company deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete company error:', error);
    
    if (error.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Company not found'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete company',
      error: error.message
    });
  }
};
