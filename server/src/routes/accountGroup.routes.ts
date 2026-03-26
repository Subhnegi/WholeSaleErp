import { Router } from 'express';
import {
  createAccountGroup,
  getAccountGroupsByCompany,
  getAccountGroupById,
  updateAccountGroup,
  deleteAccountGroup
} from '../controllers/accountGroup.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Account Group routes
router.post('/account-groups', authenticate, createAccountGroup);
router.get('/account-groups/company/:companyId', authenticate, getAccountGroupsByCompany);
router.get('/account-groups/:id', authenticate, getAccountGroupById);
router.put('/account-groups/:id', authenticate, updateAccountGroup);
router.delete('/account-groups/:id', authenticate, deleteAccountGroup);

export default router;
