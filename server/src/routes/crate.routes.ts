import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  createCrateMarka,
  getCrateMarkasByCompany,
  getCrateMarkaById,
  updateCrateMarka,
  deleteCrateMarka,
  bulkDeleteCrateMarkas
} from '../controllers/crate.controller.js'

const router = Router()

// All crate marka routes require authentication
router.use(authenticate)

// Create new crate marka
router.post('/', createCrateMarka)

// Get crate markas by company
router.get('/company/:companyId', getCrateMarkasByCompany)

// Get single crate marka
router.get('/:id', getCrateMarkaById)

// Update crate marka
router.put('/:id', updateCrateMarka)

// Delete crate marka
router.delete('/:id', deleteCrateMarka)

// Bulk delete crate markas
router.post('/bulk-delete', bulkDeleteCrateMarkas)

export default router
