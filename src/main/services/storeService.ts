/**
 * Store Service
 * Phase 14.5 - Business logic for store management
 */

import DatabaseService from './database'
import type { CreateStoreInput, UpdateStoreInput, Store } from '../types/store'

export class StoreService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Create a new store
   */
  async create(data: CreateStoreInput): Promise<Store> {
    try {
      // Validation
      if (!data.name || data.name.trim() === '') {
        throw new Error('Store name is required')
      }

      if (!data.companyId || data.companyId.trim() === '') {
        throw new Error('Company ID is required')
      }

      // Check for duplicate name in same company
      const existing = await this.dbService.findStoreByNameAndCompany(
        data.name.trim(),
        data.companyId
      )

      if (existing) {
        throw new Error(`Store with name "${data.name}" already exists`)
      }

      // Create store
      const store = await this.dbService.createStore({
        name: data.name.trim(),
        companyId: data.companyId,
        address: data.address?.trim() || null,
        address2: data.address2?.trim() || null,
        address3: data.address3?.trim() || null,
        contactNo: data.contactNo?.trim() || null
      })

      console.log('[StoreService] Created store:', store.id)
      return store
    } catch (error) {
      console.error('[StoreService] Error creating store:', error)
      throw error
    }
  }

  /**
   * Get all stores for a company
   */
  async listByCompany(companyId: string): Promise<Store[]> {
    try {
      if (!companyId || companyId.trim() === '') {
        throw new Error('Company ID is required')
      }

      const stores = await this.dbService.getStoresByCompany(companyId)
      console.log(`[StoreService] Retrieved ${stores.length} stores for company ${companyId}`)
      return stores
    } catch (error) {
      console.error('[StoreService] Error listing stores:', error)
      throw error
    }
  }

  /**
   * Get a single store by ID
   */
  async get(id: string): Promise<Store | null> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Store ID is required')
      }

      const store = await this.dbService.getStoreById(id)
      if (!store) {
        console.log(`[StoreService] Store not found: ${id}`)
        return null
      }

      return store
    } catch (error) {
      console.error('[StoreService] Error getting store:', error)
      throw error
    }
  }

  /**
   * Update a store
   */
  async update(id: string, data: UpdateStoreInput): Promise<Store> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Store ID is required')
      }

      // Check if store exists
      const existing = await this.dbService.getStoreById(id)
      if (!existing) {
        throw new Error('Store not found')
      }

      // Validate updates
      if (data.name !== undefined) {
        if (data.name.trim() === '') {
          throw new Error('Store name cannot be empty')
        }

        // Check for duplicate name (excluding current store)
        const duplicate = await this.dbService.findStoreByNameAndCompany(
          data.name.trim(),
          existing.companyId
        )

        if (duplicate && duplicate.id !== id) {
          throw new Error(`Store with name "${data.name}" already exists`)
        }
      }

      // Prepare update data
      const updateData: UpdateStoreInput = {}
      if (data.name !== undefined) updateData.name = data.name.trim()
      if (data.address !== undefined) updateData.address = data.address?.trim() || null
      if (data.address2 !== undefined) updateData.address2 = data.address2?.trim() || null
      if (data.address3 !== undefined) updateData.address3 = data.address3?.trim() || null
      if (data.contactNo !== undefined) updateData.contactNo = data.contactNo?.trim() || null

      // Update store
      const updated = await this.dbService.updateStore(id, updateData)
      console.log('[StoreService] Updated store:', id)
      return updated
    } catch (error) {
      console.error('[StoreService] Error updating store:', error)
      throw error
    }
  }

  /**
   * Delete a store
   */
  async delete(id: string): Promise<void> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Store ID is required')
      }

      // Check if store exists
      const existing = await this.dbService.getStoreById(id)
      if (!existing) {
        throw new Error('Store not found')
      }

      await this.dbService.deleteStore(id)
      console.log('[StoreService] Deleted store:', id)
    } catch (error) {
      console.error('[StoreService] Error deleting store:', error)
      throw error
    }
  }

  /**
   * Bulk delete stores
   */
  async bulkDelete(ids: string[]): Promise<number> {
    try {
      if (!ids || ids.length === 0) {
        throw new Error('No store IDs provided')
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
        console.warn('[StoreService] Bulk delete completed with errors:', errors)
      }

      console.log(`[StoreService] Bulk deleted ${deletedCount}/${ids.length} stores`)
      return deletedCount
    } catch (error) {
      console.error('[StoreService] Error in bulk delete:', error)
      throw error
    }
  }
}
