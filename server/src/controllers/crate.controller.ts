import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Create a new crate marka
 */
export const createCrateMarka = async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      crateMarkaName,
      printAs,
      opQty,
      cost
    } = req.body

    // Validate required fields
    if (!companyId || !crateMarkaName) {
      return res.status(400).json({
        success: false,
        message: 'Company ID and crate marka name are required'
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

    // Check if crate with same name already exists for this company
    const existingCrateWithSameName = await prisma.crateMarka.findFirst({
      where: {
        companyId,
        crateMarkaName: {
          equals: crateMarkaName,
          mode: 'insensitive'
        }
      }
    })

    if (existingCrateWithSameName) {
      return res.status(400).json({
        success: false,
        message: `A crate marka with the name "${crateMarkaName}" already exists`
      })
    }

    // Create crate marka
    const crate = await prisma.crateMarka.create({
      data: {
        companyId,
        crateMarkaName,
        printAs: printAs || null,
        opQty: opQty || 0,
        cost: cost || 0
      }
    })

    return res.status(201).json({
      success: true,
      message: 'Crate marka created successfully',
      data: crate
    })
  } catch (error) {
    console.error('Create crate marka error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create crate marka'
    })
  }
}

/**
 * Get all crate markas for a company
 */
export const getCrateMarkasByCompany = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      })
    }

    const crates = await prisma.crateMarka.findMany({
      where: { companyId },
      orderBy: { crateMarkaName: 'asc' }
    })

    return res.status(200).json({
      success: true,
      message: 'Crate markas retrieved successfully',
      data: crates
    })
  } catch (error) {
    console.error('Get crate markas by company error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve crate markas'
    })
  }
}

/**
 * Get a single crate marka by ID
 */
export const getCrateMarkaById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Crate marka ID is required'
      })
    }

    const crate = await prisma.crateMarka.findUnique({
      where: { id }
    })

    if (!crate) {
      return res.status(404).json({
        success: false,
        message: 'Crate marka not found'
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Crate marka retrieved successfully',
      data: crate
    })
  } catch (error) {
    console.error('Get crate marka by ID error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve crate marka'
    })
  }
}

/**
 * Update a crate marka
 */
export const updateCrateMarka = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const updateData = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Crate marka ID is required'
      })
    }

    // Check if crate marka exists
    const existingCrate = await prisma.crateMarka.findUnique({
      where: { id }
    })

    if (!existingCrate) {
      return res.status(404).json({
        success: false,
        message: 'Crate marka not found'
      })
    }

    // If updating the name, check for duplicates
    if (updateData.crateMarkaName) {
      const duplicateCrate = await prisma.crateMarka.findFirst({
        where: {
          companyId: existingCrate.companyId,
          crateMarkaName: {
            equals: updateData.crateMarkaName,
            mode: 'insensitive'
          },
          NOT: {
            id: id
          }
        }
      })

      if (duplicateCrate) {
        return res.status(400).json({
          success: false,
          message: `A crate marka with the name "${updateData.crateMarkaName}" already exists`
        })
      }
    }

    // Remove id and timestamps from update data
    delete updateData.id
    delete updateData.createdAt
    delete updateData.updatedAt

    // Update crate marka
    const crate = await prisma.crateMarka.update({
      where: { id },
      data: updateData
    })

    return res.status(200).json({
      success: true,
      message: 'Crate marka updated successfully',
      data: crate
    })
  } catch (error) {
    console.error('Update crate marka error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update crate marka'
    })
  }
}

/**
 * Delete a crate marka
 */
export const deleteCrateMarka = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Crate marka ID is required'
      })
    }

    // Check if crate marka exists
    const existingCrate = await prisma.crateMarka.findUnique({
      where: { id }
    })

    if (!existingCrate) {
      return res.status(404).json({
        success: false,
        message: 'Crate marka not found'
      })
    }

    // Delete crate marka
    await prisma.crateMarka.delete({
      where: { id }
    })

    return res.status(200).json({
      success: true,
      message: 'Crate marka deleted successfully'
    })
  } catch (error) {
    console.error('Delete crate marka error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete crate marka'
    })
  }
}

/**
 * Bulk delete crate markas
 */
export const bulkDeleteCrateMarkas = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Crate marka IDs array is required'
      })
    }

    // Delete crate markas
    const result = await prisma.crateMarka.deleteMany({
      where: {
        id: { in: ids }
      }
    })

    return res.status(200).json({
      success: true,
      message: `${result.count} crate marka(s) deleted successfully`,
      data: { deletedCount: result.count }
    })
  } catch (error) {
    console.error('Bulk delete crate markas error:', error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete crate markas'
    })
  }
}
