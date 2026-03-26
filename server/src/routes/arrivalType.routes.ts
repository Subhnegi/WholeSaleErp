import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  createArrivalType,
  getArrivalTypesByCompany,
  getArrivalTypeById,
  updateArrivalType,
  deleteArrivalType,
  bulkDeleteArrivalTypes
} from '../controllers/arrivalType.controller.js'

const router = Router()

// All arrival type routes require authentication
router.use(authenticate)

// Create new arrival type
router.post('/', createArrivalType)

// Get arrival types by company
router.get('/company/:companyId', getArrivalTypesByCompany)

// Get single arrival type
router.get('/:id', getArrivalTypeById)

// Update arrival type
router.put('/:id', updateArrivalType)

// Delete arrival type
router.delete('/:id', deleteArrivalType)

// Bulk delete arrival types
router.post('/bulk-delete', bulkDeleteArrivalTypes)

export default router
