import type { Request, Response } from 'express';
import prisma from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { generateToken } from '../utils/jwt.js';
import { generateLicenseKey, calculateTrialEndDate } from '../utils/license.js';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  LICENSE_STATUS,
} from '../config/constants.js';

/**
 * Register a new user with a 7-day trial license
 * POST /api/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body as { name: string; email: string; password: string };

    // Validation
    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: ERROR_MESSAGES.USER_EXISTS,
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate license key
    const licenseKey = generateLicenseKey();
    const startDate = new Date();
    const endDate = calculateTrialEndDate(startDate);

    // Create user and license in a transaction
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        licenses: {
          create: {
            licenseKey,
            startDate,
            endDate,
            isTrial: true,
            status: LICENSE_STATUS.ACTIVE,
          },
        },
      },
      include: {
        licenses: true,
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Return response
    res.status(201).json({
      success: true,
      message: SUCCESS_MESSAGES.REGISTRATION_SUCCESS,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        license: {
          licenseKey: user.licenses[0].licenseKey,
          startDate: user.licenses[0].startDate,
          endDate: user.licenses[0].endDate,
          isTrial: user.licenses[0].isTrial,
          status: user.licenses[0].status,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
}

/**
 * Login user and return user info with license details
 * POST /api/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
      return;
    }

    // Find user with their latest license
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        licenses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
      return;
    }

    // Check if user has a license
    if (!user.licenses || user.licenses.length === 0) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.LICENSE_NOT_FOUND,
      });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    const license = user.licenses[0];

    // Calculate current status based on endDate
    const now = new Date();
    const endDate = new Date(license.endDate);
    const isExpired = now > endDate;
    const currentStatus = isExpired ? LICENSE_STATUS.EXPIRED : license.status;
    const currentIsTrial = isExpired ? false : license.isTrial; // Trial ends when license expires

    // If status changed, update in database
    if (currentStatus !== license.status || (isExpired && license.isTrial)) {
      await prisma.license.update({
        where: { id: license.id },
        data: { 
          status: currentStatus,
          isTrial: currentIsTrial,
        },
      });
    }

    // Return response
    res.status(200).json({
      success: true,
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        license: {
          licenseKey: license.licenseKey,
          startDate: license.startDate,
          endDate: license.endDate,
          isTrial: currentIsTrial,
          status: currentStatus,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
}

/**
 * Validate a license key
 * POST /api/validate-license
 */
export async function validateLicense(req: Request, res: Response): Promise<void> {
  try {
    const { licenseKey } = req.body as { licenseKey: string };

    // Validation
    if (!licenseKey) {
      res.status(400).json({
        success: false,
        message: 'License key is required',
      });
      return;
    }

    // Find license
    const license = await prisma.license.findUnique({
      where: { licenseKey },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!license) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.LICENSE_NOT_FOUND,
      });
      return;
    }

    // Check if license is revoked
    if (license.status === LICENSE_STATUS.REVOKED) {
      res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.LICENSE_REVOKED,
        data: {
          user: license.user,
          license: {
            licenseKey: license.licenseKey,
            startDate: license.startDate,
            endDate: license.endDate,
            status: license.status,
            isTrial: license.isTrial,
          },
        },
      });
      return;
    }

    // Check if license is expired
    const isExpired = new Date() > new Date(license.endDate);
    
    if (isExpired) {
      // Update license status to expired and set isTrial to false
      await prisma.license.update({
        where: { id: license.id },
        data: { 
          status: LICENSE_STATUS.EXPIRED,
          isTrial: false, // Trial ends when license expires
        },
      });

      res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.LICENSE_EXPIRED,
        data: {
          user: license.user,
          license: {
            licenseKey: license.licenseKey,
            startDate: license.startDate,
            endDate: license.endDate,
            status: LICENSE_STATUS.EXPIRED,
            isTrial: false, // Return false since trial has ended
          },
        },
      });
      return;
    }

    // License is valid
    res.status(200).json({
      success: true,
      message: SUCCESS_MESSAGES.LICENSE_VALID,
      data: {
        user: license.user,
        license: {
          licenseKey: license.licenseKey,
          startDate: license.startDate,
          endDate: license.endDate,
          isTrial: license.isTrial,
          status: license.status,
        },
      },
    });
  } catch (error) {
    console.error('License validation error:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
}

/**
 * Logout user (client-side token removal)
 * POST /api/logout
 */
export async function logout(_req: Request, res: Response): Promise<void> {
  try {
    // Since we're using JWT, logout is handled client-side by removing the token
    // This endpoint is mainly for logging purposes or future session management
    res.status(200).json({
      success: true,
      message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
}

/**
 * Renew a license with a new plan
 * POST /api/renew-license
 */
export async function renewLicense(req: Request, res: Response): Promise<void> {
  try {
    const { licenseKey, plan, transactionId } = req.body as { 
      licenseKey: string
      plan: 'monthly' | 'quarterly' | 'yearly' | 'lifetime'
      transactionId: string 
    };

    // Validation
    if (!licenseKey || !plan || !transactionId) {
      res.status(400).json({
        success: false,
        message: 'License key, plan, and transaction ID are required',
      });
      return;
    }

    // Validate plan
    const planDurations: Record<string, number> = {
      monthly: 30,
      quarterly: 90,
      yearly: 365,
      lifetime: 36500, // ~100 years
    };

    if (!planDurations[plan]) {
      res.status(400).json({
        success: false,
        message: 'Invalid plan selected',
      });
      return;
    }

    // Find license
    const license = await prisma.license.findUnique({
      where: { licenseKey },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!license) {
      res.status(404).json({
        success: false,
        message: ERROR_MESSAGES.LICENSE_NOT_FOUND,
      });
      return;
    }

    // Check if license is revoked
    if (license.status === LICENSE_STATUS.REVOKED) {
      res.status(403).json({
        success: false,
        message: ERROR_MESSAGES.LICENSE_REVOKED,
      });
      return;
    }

    // Calculate new end date
    // If license is expired, start from today; otherwise extend from current end date
    const currentEndDate = new Date(license.endDate);
    const now = new Date();
    const startFromDate = currentEndDate > now ? currentEndDate : now;
    
    const newEndDate = new Date(startFromDate);
    newEndDate.setDate(newEndDate.getDate() + planDurations[plan]);

    // Update license
    const updatedLicense = await prisma.license.update({
      where: { id: license.id },
      data: {
        endDate: newEndDate,
        status: LICENSE_STATUS.ACTIVE,
        isTrial: false, // No longer a trial after renewal
      },
    });

    // Return success response
    res.status(200).json({
      success: true,
      message: SUCCESS_MESSAGES.LICENSE_RENEWED,
      data: {
        license: {
          licenseKey: updatedLicense.licenseKey,
          startDate: updatedLicense.startDate,
          endDate: updatedLicense.endDate,
          isTrial: updatedLicense.isTrial,
          status: updatedLicense.status,
        },
        user: license.user,
        transactionId,
        plan,
      },
    });
  } catch (error) {
    console.error('License renewal error:', error);
    res.status(500).json({
      success: false,
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
}
