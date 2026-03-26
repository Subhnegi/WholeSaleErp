import DatabaseService from './database'
import { v4 as uuidv4 } from 'uuid'
import type {
  CrateMarka,
  CrateMarkaCreateInput,
  CrateMarkaUpdateInput,
  ApiResponse
} from '../types/crate'

const dbService = DatabaseService.getInstance()

class CrateService {
  /**
   * Create a new crate marka
   */
  async createCrateMarka(
    companyId: string,
    data: CrateMarkaCreateInput
  ): Promise<ApiResponse<CrateMarka>> {
    try {
      // Check if crate with same name already exists for this company
      const existingCrates = await dbService.getCrateMarkasByCompany(companyId)
      const duplicateCrate = existingCrates.find(
        (crate) => crate.crateMarkaName.toLowerCase() === data.crateMarkaName.toLowerCase()
      )

      if (duplicateCrate) {
        return {
          success: false,
          error: `A crate marka with the name "${data.crateMarkaName}" already exists`
        }
      }

      const crateId = uuidv4()

      const crate = await dbService.createCrateMarka({
        id: crateId,
        companyId,
        ...data
      })

      return {
        success: true,
        message: 'Crate marka created successfully',
        data: crate
      }
    } catch (error) {
      console.error('Create crate marka error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create crate marka'
      }
    }
  }

  /**
   * Get all crate markas for a company
   */
  async getCrateMarkasByCompany(companyId: string): Promise<ApiResponse<CrateMarka[]>> {
    try {
      const crates = await dbService.getCrateMarkasByCompany(companyId)

      return {
        success: true,
        data: crates
      }
    } catch (error) {
      console.error('Get crate markas error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get crate markas'
      }
    }
  }

  /**
   * Get a single crate marka by ID
   */
  async getCrateMarkaById(id: string): Promise<ApiResponse<CrateMarka>> {
    try {
      const crate = await dbService.getCrateMarkaById(id)

      if (!crate) {
        return {
          success: false,
          error: 'Crate marka not found'
        }
      }

      return {
        success: true,
        data: crate
      }
    } catch (error) {
      console.error('Get crate marka error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get crate marka'
      }
    }
  }

  /**
   * Update a crate marka
   */
  async updateCrateMarka(
    id: string,
    data: CrateMarkaUpdateInput
  ): Promise<ApiResponse<CrateMarka>> {
    try {
      // If updating the name, check for duplicates
      if (data.crateMarkaName !== undefined) {
        const currentCrate = await dbService.getCrateMarkaById(id)
        if (!currentCrate) {
          return {
            success: false,
            error: 'Crate marka not found'
          }
        }

        // Check if new name conflicts with another crate in the same company
        const existingCrates = await dbService.getCrateMarkasByCompany(currentCrate.companyId)
        const duplicateCrate = existingCrates.find(
          (crate) =>
            crate.id !== id &&
            crate.crateMarkaName.toLowerCase() === data.crateMarkaName!.toLowerCase()
        )

        if (duplicateCrate) {
          return {
            success: false,
            error: `A crate marka with the name "${data.crateMarkaName}" already exists`
          }
        }
      }

      const crate = await dbService.updateCrateMarka(id, data)

      return {
        success: true,
        message: 'Crate marka updated successfully',
        data: crate
      }
    } catch (error) {
      console.error('Update crate marka error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update crate marka'
      }
    }
  }

  /**
   * Delete a crate marka
   */
  async deleteCrateMarka(id: string): Promise<ApiResponse> {
    try {
      await dbService.deleteCrateMarka(id)

      return {
        success: true,
        message: 'Crate marka deleted successfully'
      }
    } catch (error) {
      console.error('Delete crate marka error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete crate marka'
      }
    }
  }

  /**
   * Bulk delete crate markas
   */
  async bulkDeleteCrateMarkas(ids: string[]): Promise<ApiResponse> {
    try {
      await dbService.bulkDeleteCrateMarkas(ids)

      return {
        success: true,
        message: `${ids.length} crate markas deleted successfully`
      }
    } catch (error) {
      console.error('Bulk delete crate markas error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete crate markas'
      }
    }
  }
}

export const crateService = new CrateService()
