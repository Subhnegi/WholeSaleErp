import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  createItem,
  getItemsByCompany,
  getItemById,
  updateItem,
  deleteItem,
  bulkDeleteItems
} from '../controllers/item.controller.js'

const router = Router()

// All item routes require authentication
router.use(authenticate)

// Create new item
router.post('/', createItem)

// Get items by company
router.get('/company/:companyId', getItemsByCompany)

// Get single item
router.get('/:id', getItemById)

// Update item
router.put('/:id', updateItem)

// Delete item
router.delete('/:id', deleteItem)

// Bulk delete items
router.post('/bulk-delete', bulkDeleteItems)

export default router
