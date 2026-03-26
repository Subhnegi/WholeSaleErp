import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Create a new arrival type (Phase 7)
 */
export const createArrivalType = async (req: Request, res: Response) => {
  try {
    const {
      companyId,
      arrivalTypeName,
      partyStock,
      selfPurchase,
      vehicleNo,
      autoRoundoffAmount,
      askForAdditionalFields,
      requireForwardingAgent,
      requireBroker
    } = req.body

    // Validate required fields
    if (!companyId || !arrivalTypeName) {
      return res.status(400).json({
        success: false,
        message: 'Company ID and arrival type name are required'
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

    // Check if arrival type with same name already exists for this company
    const existingArrivalTypeWithSameName = await prisma.arrivalType.findFirst({
      where: {
        companyId,
        arrivalTypeName: {
          equals: arrivalTypeName,
          mode: 'insensitive'
        }
      }
    })

    if (existingArrivalTypeWithSameName) {
      return res.status(400).json({
        success: false,
        message: `An arrival type with the name "${arrivalTypeName}" already exists`
      })
    }

    // Create arrival type
    const arrivalType = await prisma.arrivalType.create({
      data: {
        companyId,
        arrivalTypeName,
        partyStock: partyStock || false,
        selfPurchase: selfPurchase || false,
        vehicleNo: vehicleNo || null,
        autoRoundoffAmount: autoRoundoffAmount || false,
        askForAdditionalFields: askForAdditionalFields || false,
        requireForwardingAgent: requireForwardingAgent || false,
        requireBroker: requireBroker || false
      }
    })

    return res.status(201).json({
      success: true,
      message: 'Arrival type created successfully',
      data: arrivalType
    })
  } catch (error) {
    console.error('Create arrival type error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

/**
 * Get all arrival types for a company
 */
export const getArrivalTypesByCompany = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      })
    }

    const arrivalTypes = await prisma.arrivalType.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    })

    return res.status(200).json({
      success: true,
      data: arrivalTypes
    })
  } catch (error) {
    console.error('Get arrival types error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

/**
 * Get a single arrival type by ID
 */
export const getArrivalTypeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Arrival type ID is required'
      })
    }

    const arrivalType = await prisma.arrivalType.findUnique({
      where: { id }
    })

    if (!arrivalType) {
      return res.status(404).json({
        success: false,
        message: 'Arrival type not found'
      })
    }

    return res.status(200).json({
      success: true,
      data: arrivalType
    })
  } catch (error) {
    console.error('Get arrival type error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

/**
 * Update an arrival type
 */
export const updateArrivalType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const {
      arrivalTypeName,
      partyStock,
      selfPurchase,
      vehicleNo,
      autoRoundoffAmount,
      askForAdditionalFields,
      requireForwardingAgent,
      requireBroker
    } = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Arrival type ID is required'
      })
    }

    // Check if arrival type exists
    const existingArrivalType = await prisma.arrivalType.findUnique({
      where: { id }
    })

    if (!existingArrivalType) {
      return res.status(404).json({
        success: false,
        message: 'Arrival type not found'
      })
    }

    // If name is being updated, check for duplicates
    if (arrivalTypeName && arrivalTypeName !== existingArrivalType.arrivalTypeName) {
      const duplicateArrivalType = await prisma.arrivalType.findFirst({
        where: {
          companyId: existingArrivalType.companyId,
          arrivalTypeName: {
            equals: arrivalTypeName,
            mode: 'insensitive'
          },
          NOT: {
            id
          }
        }
      })

      if (duplicateArrivalType) {
        return res.status(400).json({
          success: false,
          message: `An arrival type with the name "${arrivalTypeName}" already exists`
        })
      }
    }

    // Update arrival type
    const updatedArrivalType = await prisma.arrivalType.update({
      where: { id },
      data: {
        arrivalTypeName,
        partyStock,
        selfPurchase,
        vehicleNo,
        autoRoundoffAmount,
        askForAdditionalFields,
        requireForwardingAgent,
        requireBroker
      }
    })

    return res.status(200).json({
      success: true,
      message: 'Arrival type updated successfully',
      data: updatedArrivalType
    })
  } catch (error) {
    console.error('Update arrival type error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

/**
 * Delete an arrival type
 */
export const deleteArrivalType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Arrival type ID is required'
      })
    }

    // Check if arrival type exists
    const existingArrivalType = await prisma.arrivalType.findUnique({
      where: { id }
    })

    if (!existingArrivalType) {
      return res.status(404).json({
        success: false,
        message: 'Arrival type not found'
      })
    }

    // Delete arrival type
    await prisma.arrivalType.delete({
      where: { id }
    })

    return res.status(200).json({
      success: true,
      message: 'Arrival type deleted successfully'
    })
  } catch (error) {
    console.error('Delete arrival type error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

/**
 * Bulk delete arrival types
 */
export const bulkDeleteArrivalTypes = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'An array of arrival type IDs is required'
      })
    }

    // Delete arrival types
    const result = await prisma.arrivalType.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })

    return res.status(200).json({
      success: true,
      message: `${result.count} arrival type(s) deleted successfully`
    })
  } catch (error) {
    console.error('Bulk delete arrival types error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}
