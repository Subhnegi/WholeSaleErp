import { Router } from 'express';
import {
  createCompany,
  getCompaniesByUserId,
  getCompanyById,
  updateCompany,
  deleteCompany
} from '../controllers/company.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Company routes
router.post('/companies', authenticate, createCompany);
router.get('/companies/user/:userId', authenticate, getCompaniesByUserId);
router.get('/companies/:id', authenticate, getCompanyById);
router.put('/companies/:id', authenticate, updateCompany);
router.delete('/companies/:id', authenticate, deleteCompany);

export default router;
