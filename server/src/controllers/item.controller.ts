import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Create a new item
 */
export const createItem = async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      itemName,
      code,
      printAs,
      printAsLang,
      commission,
      commissionAsPer,
      marketFees,
      rdf,
      bardanaPerNug,
      laga,
      wtPerNug,
      kaatPerNug,
      maintainCratesInSalePurchase,
      disableWeight
    } = req.body

    // Validate required fields
    if (!companyId || !itemName) {
      return res.status(400).json({
        success: false,
        message: 'Company ID and item name are required'
      })
    }

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    })

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      })
    }

    // Create item
    const item = await prisma.item.create({
      data: {
        companyId,
        itemName,
        code: code || null,
        printAs: printAs || null,
        printAsLang: printAsLang || null,
        commission: commission || 0,
        commissionAsPer: commissionAsPer || null,
        marketFees: marketFees || 0,
        rdf: rdf || 0,
        bardanaPerNug: bardanaPerNug || 0,
        laga: laga || 0,
        wtPerNug: wtPerNug || 0,
        kaatPerNug: kaatPerNug || 0,
        maintainCratesInSalePurchase: maintainCratesInSalePurchase || false,
        disableWeight: disableWeight || false
      }
    })

    return res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: item
    })
  } catch (error) {
    console.error('Create item error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create item'
    })
  }
}

/**
 * Get all items for a company
 */
export const getItemsByCompany = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      })
    }

    const items = await prisma.item.findMany({
      where: { companyId },
      orderBy: { itemName: 'asc' }
    })

    return res.status(200).json({
      success: true,
      message: 'Items retrieved successfully',
      data: items
    })
  } catch (error) {
    console.error('Get items by company error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve items'
    })
  }
}

/**
 * Get a single item by ID
 */
export const getItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      })
    }

    const item = await prisma.item.findUnique({
      where: { id }
    })

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Item retrieved successfully',
      data: item
    })
  } catch (error) {
    console.error('Get item by ID error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve item'
    })
  }
}

/**
 * Update an item
 */
export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updateData = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      })
    }

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id }
    })

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      })
    }

    // Remove id and timestamps from update data
    delete updateData.id
    delete updateData.createdAt
    delete updateData.updatedAt

    // Update item
    const item = await prisma.item.update({
      where: { id },
      data: updateData
    })

    return res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: item
    })
  } catch (error) {
    console.error('Update item error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update item'
    })
  }
}

/**
 * Delete an item
 */
export const deleteItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required'
      })
    }

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id }
    })

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      })
    }

    // Delete item
    await prisma.item.delete({
      where: { id }
    })

    return res.status(200).json({
      success: true,
      message: 'Item deleted successfully'
    })
  } catch (error) {
    console.error('Delete item error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete item'
    })
  }
}

/**
 * Bulk delete items
 */
export const bulkDeleteItems = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Item IDs array is required'
      })
    }

    // Delete items
    const result = await prisma.item.deleteMany({
      where: {
        id: { in: ids }
      }
    })

    return res.status(200).json({
      success: true,
      message: `${result.count} item(s) deleted successfully`,
      data: { deletedCount: result.count }
    })
  } catch (error) {
    console.error('Bulk delete items error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete items'
    })
  }
}
