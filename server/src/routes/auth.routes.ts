import { Router } from 'express';
import { register, login, validateLicense, logout, renewLicense } from '../controllers/auth.controller.js';

const router = Router();

/**
 * @route   POST /api/register
 * @desc    Register a new user with a 7-day trial license
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/login
 * @desc    Login user and return user info with license details
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/validate-license
 * @desc    Validate a license key
 * @access  Public
 */
router.post('/validate-license', validateLicense);

/**
 * @route   POST /api/logout
 * @desc    Logout user (client-side token removal)
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   POST /api/renew-license
 * @desc    Renew a license with a new plan
 * @access  Public (requires valid license key)
 */
router.post('/renew-license', renewLicense);

export default router;
