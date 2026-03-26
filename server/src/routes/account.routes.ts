import { Router } from 'express';
import {
  createAccount,
  getAccountsByCompany,
  getAccountsByGroup,
  getAccountById,
  updateAccount,
  deleteAccount,
  bulkDeleteAccounts,
  bulkUpdateAccountGroup
} from '../controllers/account.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Account routes
router.post('/accounts', authenticate, createAccount);
router.get('/accounts/company/:companyId', authenticate, getAccountsByCompany);
router.get('/accounts/group/:accountGroupId', authenticate, getAccountsByGroup);
router.get('/accounts/:id', authenticate, getAccountById);
router.put('/accounts/:id', authenticate, updateAccount);
router.delete('/accounts/:id', authenticate, deleteAccount);
router.post('/accounts/bulk-delete', authenticate, bulkDeleteAccounts);
router.post('/accounts/bulk-update-group', authenticate, bulkUpdateAccountGroup);

export default router;
