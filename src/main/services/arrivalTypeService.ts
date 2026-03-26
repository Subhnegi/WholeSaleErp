import { v4 as uuidv4 } from 'uuid'
import DatabaseService from './database'
import type { ArrivalType, ArrivalTypeCreateInput, ArrivalTypeUpdateInput } from '../types/arrivalType'
import type { ApiResponse } from '../../preload/types'

const asArrivalType = (record: any): ArrivalType => {
  const purchaseType: ArrivalType['purchaseType'] = record?.purchaseType === 'selfPurchase'
    ? 'selfPurchase'
    : 'partyStock'

  return {
    ...record,
    purchaseType,
    vehicleNoByDefault: record?.vehicleNoByDefault ?? null,
    autoRoundOffAmount: Boolean(record?.autoRoundOffAmount),
    askForAdditionalFields: Boolean(record?.askForAdditionalFields),
    requireForwardingAgent: Boolean(record?.requireForwardingAgent),
    requireBroker: Boolean(record?.requireBroker)
  }
}

const dbService = DatabaseService.getInstance()

/**
 * ArrivalType Service (Phase 14)
 * Business logic layer for arrival type management
 */
class ArrivalTypeService {
  /**
   * Create a new arrival type
   */
  async createArrivalType(
    companyId: string,
    data: ArrivalTypeCreateInput
  ): Promise<ApiResponse<ArrivalType>> {
    try {
      // Check if arrival type with same name already exists for this company
      const existingArrivalTypes = await dbService.getArrivalTypesByCompany(companyId)
      const duplicateArrivalType = existingArrivalTypes.find(
        (arrivalType) => arrivalType.name.toLowerCase() === data.name.toLowerCase()
      )

      if (duplicateArrivalType) {
        return {
          success: false,
          error: `An arrival type with the name "${data.name}" already exists`
        }
      }

      const arrivalTypeId = uuidv4()

      const arrivalTypeRecord = await dbService.createArrivalType({
        id: arrivalTypeId,
        companyId,
        ...data
      })

      const arrivalType = asArrivalType(arrivalTypeRecord)

      return {
        success: true,
        message: 'Arrival type created successfully',
        data: arrivalType
      }
    } catch (error) {
      console.error('Create arrival type error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create arrival type'
      }
    }
  }

  /**
   * Get all arrival types for a company
   */
  async getArrivalTypesByCompany(companyId: string): Promise<ApiResponse<ArrivalType[]>> {
    try {
      const arrivalTypeRecords = await dbService.getArrivalTypesByCompany(companyId)
      const arrivalTypes = arrivalTypeRecords.map(asArrivalType)

      return {
        success: true,
        data: arrivalTypes
      }
    } catch (error) {
      console.error('Get arrival types error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get arrival types'
      }
    }
  }

  /**
   * Get a single arrival type by ID
   */
  async getArrivalTypeById(id: string): Promise<ApiResponse<ArrivalType>> {
    try {
      const arrivalTypeRecord = await dbService.getArrivalTypeById(id)

      if (!arrivalTypeRecord) {
        return {
          success: false,
          error: 'Arrival type not found'
        }
      }

      const arrivalType = asArrivalType(arrivalTypeRecord)

      return {
        success: true,
        data: arrivalType
      }
    } catch (error) {
      console.error('Get arrival type error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get arrival type'
      }
    }
  }

  /**
   * Update an arrival type
   */
  async updateArrivalType(
    id: string,
    data: ArrivalTypeUpdateInput
  ): Promise<ApiResponse<ArrivalType>> {
    try {
      // Check if arrival type exists
      const existingArrivalType = await dbService.getArrivalTypeById(id)
      if (!existingArrivalType) {
        return {
          success: false,
          error: 'Arrival type not found'
        }
      }

      // If name is being updated, check for duplicates
      if (data.name && data.name !== existingArrivalType.name) {
        const arrivalTypes = await dbService.getArrivalTypesByCompany(existingArrivalType.companyId)
        const duplicateArrivalType = arrivalTypes.find(
          (arrivalType) =>
            arrivalType.id !== id &&
            arrivalType.name.toLowerCase() === data.name!.toLowerCase()
        )

        if (duplicateArrivalType) {
          return {
            success: false,
            error: `An arrival type with the name "${data.name}" already exists`
          }
        }
      }

      const updatedArrivalTypeRecord = await dbService.updateArrivalType(id, data)
      const updatedArrivalType = asArrivalType(updatedArrivalTypeRecord)

      return {
        success: true,
        message: 'Arrival type updated successfully',
        data: updatedArrivalType
      }
    } catch (error) {
      console.error('Update arrival type error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update arrival type'
      }
    }
  }

  /**
   * Delete an arrival type
   */
  async deleteArrivalType(id: string): Promise<ApiResponse> {
    try {
      // Check if arrival type exists
      const existingArrivalType = await dbService.getArrivalTypeById(id)
      if (!existingArrivalType) {
        return {
          success: false,
          error: 'Arrival type not found'
        }
      }

      await dbService.deleteArrivalType(id)

      return {
        success: true,
        message: 'Arrival type deleted successfully'
      }
    } catch (error) {
      console.error('Delete arrival type error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete arrival type'
      }
    }
  }

  /**
   * Bulk delete arrival types
   */
  async bulkDeleteArrivalTypes(ids: string[]): Promise<ApiResponse> {
    try {
      if (!ids || ids.length === 0) {
        return {
          success: false,
          error: 'No arrival type IDs provided'
        }
      }

      const result = await dbService.bulkDeleteArrivalTypes(ids)

      return {
        success: true,
        message: `${result.count} arrival type(s) deleted successfully`
      }
    } catch (error) {
      console.error('Bulk delete arrival types error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete arrival types'
      }
    }
  }
}

export default new ArrivalTypeService()
