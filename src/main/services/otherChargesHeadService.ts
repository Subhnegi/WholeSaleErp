import { v4 as uuidv4 } from 'uuid'
import DatabaseService from './database'
import type { OtherChargesHead, OtherChargesHeadCreateInput, OtherChargesHeadUpdateInput } from '../types/otherChargesHead'
import type { ApiResponse } from '../../preload/types'

const normalizeChargeType = (value: any): OtherChargesHead['chargeType'] =>
  value === 'minus' ? 'minus' : 'plus'

const normalizeFeedAs = (value: any): OtherChargesHead['feedAs'] => {
  switch (value) {
    case 'percentage':
    case 'onWeight':
    case 'onNug':
    case 'onPetti':
      return value
    default:
      return 'absolute'
  }
}

const asOtherChargesHead = (record: any): OtherChargesHead => ({
  ...record,
  chargeType: normalizeChargeType(record?.chargeType),
  feedAs: normalizeFeedAs(record?.feedAs),
  printAs: record?.printAs ?? null,
  accountHeadId: record?.accountHeadId ?? null
})

const dbService = DatabaseService.getInstance()

/**
 * OtherChargesHead Service (Phase 14.4)
 * Business logic layer for other charges head management
 */
class OtherChargesHeadService {
  /**
   * Create a new other charges head
   */
  async createOtherChargesHead(
    companyId: string,
    data: OtherChargesHeadCreateInput
  ): Promise<ApiResponse<OtherChargesHead>> {
    try {
      // Check if other charges head with same name already exists for this company
      const existingChargesHeads = await dbService.getOtherChargesHeadsByCompany(companyId)
      const duplicate = existingChargesHeads.find(
        (head) => head.headingName.toLowerCase() === data.headingName.toLowerCase()
      )

      if (duplicate) {
        return {
          success: false,
          error: `A charge head with the name "${data.headingName}" already exists`
        }
      }

      const chargesHeadId = uuidv4()

      const chargesHeadRecord = await dbService.createOtherChargesHead({
        id: chargesHeadId,
        companyId,
        ...data
      })

      const chargesHead = asOtherChargesHead(chargesHeadRecord)

      return {
        success: true,
        message: 'Other charges head created successfully',
        data: chargesHead
      }
    } catch (error) {
      console.error('Create other charges head error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create other charges head'
      }
    }
  }

  /**
   * Get all other charges heads for a company
   */
  async getOtherChargesHeadsByCompany(companyId: string): Promise<ApiResponse<OtherChargesHead[]>> {
    try {
      const chargesHeadRecords = await dbService.getOtherChargesHeadsByCompany(companyId)
      const chargesHeads = chargesHeadRecords.map(asOtherChargesHead)

      return {
        success: true,
        data: chargesHeads
      }
    } catch (error) {
      console.error('Get other charges heads error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get other charges heads'
      }
    }
  }

  /**
   * Get a single other charges head by ID
   */
  async getOtherChargesHeadById(id: string): Promise<ApiResponse<OtherChargesHead>> {
    try {
      const chargesHeadRecord = await dbService.getOtherChargesHeadById(id)

      if (!chargesHeadRecord) {
        return {
          success: false,
          error: 'Other charges head not found'
        }
      }

      const chargesHead = asOtherChargesHead(chargesHeadRecord)

      return {
        success: true,
        data: chargesHead
      }
    } catch (error) {
      console.error('Get other charges head error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get other charges head'
      }
    }
  }

  /**
   * Update an other charges head
   */
  async updateOtherChargesHead(
    id: string,
    data: OtherChargesHeadUpdateInput
  ): Promise<ApiResponse<OtherChargesHead>> {
    try {
      // Check if other charges head exists
      const existingChargesHead = await dbService.getOtherChargesHeadById(id)
      if (!existingChargesHead) {
        return {
          success: false,
          error: 'Other charges head not found'
        }
      }

      // If name is being updated, check for duplicates
      if (data.headingName && data.headingName !== existingChargesHead.headingName) {
        const chargesHeads = await dbService.getOtherChargesHeadsByCompany(existingChargesHead.companyId)
        const duplicate = chargesHeads.find(
          (head) =>
            head.id !== id &&
            head.headingName.toLowerCase() === data.headingName!.toLowerCase()
        )

        if (duplicate) {
          return {
            success: false,
            error: `A charge head with the name "${data.headingName}" already exists`
          }
        }
      }

      const updatedChargesHeadRecord = await dbService.updateOtherChargesHead(id, data)
      const updatedChargesHead = asOtherChargesHead(updatedChargesHeadRecord)

      return {
        success: true,
        message: 'Other charges head updated successfully',
        data: updatedChargesHead
      }
    } catch (error) {
      console.error('Update other charges head error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update other charges head'
      }
    }
  }

  /**
   * Delete an other charges head
   */
  async deleteOtherChargesHead(id: string): Promise<ApiResponse> {
    try {
      // Check if other charges head exists
      const existingChargesHead = await dbService.getOtherChargesHeadById(id)
      if (!existingChargesHead) {
        return {
          success: false,
          error: 'Other charges head not found'
        }
      }

      await dbService.deleteOtherChargesHead(id)

      return {
        success: true,
        message: 'Other charges head deleted successfully'
      }
    } catch (error) {
      console.error('Delete other charges head error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete other charges head'
      }
    }
  }

  /**
   * Bulk delete other charges heads
   */
  async bulkDeleteOtherChargesHeads(ids: string[]): Promise<ApiResponse> {
    try {
      if (!ids || ids.length === 0) {
        return {
          success: false,
          error: 'No other charges head IDs provided'
        }
      }

      const result = await dbService.bulkDeleteOtherChargesHeads(ids)

      return {
        success: true,
        message: `${result.count} other charges head(s) deleted successfully`
      }
    } catch (error) {
      console.error('Bulk delete other charges heads error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete other charges heads'
      }
    }
  }
}

export default new OtherChargesHeadService()
