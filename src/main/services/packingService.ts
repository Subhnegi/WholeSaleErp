/**
 * Packing Service
 * Phase 8.2 - Business logic for packing management
 */

import DatabaseService from './database'
import type { CreatePackingInput, UpdatePackingInput, Packing } from '../types/packing'

export class PackingService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Create a new packing
   */
  async create(data: CreatePackingInput): Promise<Packing> {
    try {
      // Validation
      if (!data.packingName || data.packingName.trim() === '') {
        throw new Error('Packing name is required')
      }

      if (!data.companyId || data.companyId.trim() === '') {
        throw new Error('Company ID is required')
      }

      if (!['nug', 'weight'].includes(data.calculate)) {
        throw new Error('Calculate must be either "nug" or "weight"')
      }

      if (data.divideBy <= 0) {
        throw new Error('Divide by must be greater than 0')
      }

      // Check for duplicate name in same company
      const existing = await this.dbService.findPackingByNameAndCompany(
        data.packingName.trim(),
        data.companyId
      )

      if (existing) {
        throw new Error(`Packing with name "${data.packingName}" already exists`)
      }

      // Create packing
      const packing = await this.dbService.createPacking({
        ...data,
        packingName: data.packingName.trim()
      })

      console.log('[PackingService] Created packing:', packing.id)
      return packing as Packing
    } catch (error) {
      console.error('[PackingService] Error creating packing:', error)
      throw error
    }
  }

  /**
   * Get all packings for a company
   */
  async listByCompany(companyId: string): Promise<Packing[]> {
    try {
      if (!companyId || companyId.trim() === '') {
        throw new Error('Company ID is required')
      }

      const packings = await this.dbService.getPackingsByCompany(companyId)
      console.log(`[PackingService] Retrieved ${packings.length} packings for company ${companyId}`)
      return packings as Packing[]
    } catch (error) {
      console.error('[PackingService] Error listing packings:', error)
      throw error
    }
  }

  /**
   * Get a single packing by ID
   */
  async get(id: string): Promise<Packing | null> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Packing ID is required')
      }

      const packing = await this.dbService.getPackingById(id)
      if (!packing) {
        console.log(`[PackingService] Packing not found: ${id}`)
        return null
      }

      return packing as Packing
    } catch (error) {
      console.error('[PackingService] Error getting packing:', error)
      throw error
    }
  }

  /**
   * Update a packing
   */
  async update(id: string, data: UpdatePackingInput): Promise<Packing> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Packing ID is required')
      }

      // Check if packing exists
      const existing = await this.dbService.getPackingById(id)
      if (!existing) {
        throw new Error('Packing not found')
      }

      // Validate updates
      if (data.packingName !== undefined) {
        if (data.packingName.trim() === '') {
          throw new Error('Packing name cannot be empty')
        }

        // Check for duplicate name (excluding current packing)
        const duplicate = await this.dbService.findPackingByNameAndCompany(
          data.packingName.trim(),
          existing.companyId
        )

        if (duplicate && duplicate.id !== id) {
          throw new Error(`Packing with name "${data.packingName}" already exists`)
        }
      }

      if (data.calculate !== undefined && !['nug', 'weight'].includes(data.calculate)) {
        throw new Error('Calculate must be either "nug" or "weight"')
      }

      if (data.divideBy !== undefined && data.divideBy <= 0) {
        throw new Error('Divide by must be greater than 0')
      }

      // Prepare update data
      const updateData: UpdatePackingInput = {}
      if (data.packingName !== undefined) updateData.packingName = data.packingName.trim()
      if (data.calculate !== undefined) updateData.calculate = data.calculate
      if (data.divideBy !== undefined) updateData.divideBy = data.divideBy

      // Update packing
      const updated = await this.dbService.updatePacking(id, updateData)
      console.log('[PackingService] Updated packing:', id)
      return updated as Packing
    } catch (error) {
      console.error('[PackingService] Error updating packing:', error)
      throw error
    }
  }

  /**
   * Delete a packing
   */
  async delete(id: string): Promise<void> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Packing ID is required')
      }

      // Check if packing exists
      const existing = await this.dbService.getPackingById(id)
      if (!existing) {
        throw new Error('Packing not found')
      }

      await this.dbService.deletePacking(id)
      console.log('[PackingService] Deleted packing:', id)
    } catch (error) {
      console.error('[PackingService] Error deleting packing:', error)
      throw error
    }
  }

  /**
   * Bulk delete packings
   */
  async bulkDelete(ids: string[]): Promise<number> {
    try {
      if (!ids || ids.length === 0) {
        throw new Error('No packing IDs provided')
      }

      let deletedCount = 0
      const errors: string[] = []

      for (const id of ids) {
        try {
          await this.delete(id)
          deletedCount++
        } catch (error) {
          errors.push(`${id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      if (errors.length > 0) {
        console.warn('[PackingService] Bulk delete completed with errors:', errors)
      }

      console.log(`[PackingService] Bulk deleted ${deletedCount}/${ids.length} packings`)
      return deletedCount
    } catch (error) {
      console.error('[PackingService] Error in bulk delete:', error)
      throw error
    }
  }
}
