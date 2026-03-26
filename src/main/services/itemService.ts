import DatabaseService from './database'
import { v4 as uuidv4 } from 'uuid'
import type { Item, ItemCreateInput, ItemUpdateInput, ApiResponse } from '../types/item'

const dbService = DatabaseService.getInstance()

class ItemService {
  /**
   * Create a new item
   */
  async createItem(companyId: string, data: ItemCreateInput): Promise<ApiResponse<Item>> {
    try {
      const itemId = uuidv4()

      const item = await dbService.createItem({
        id: itemId,
        companyId,
        ...data
      })

      return {
        success: true,
        message: 'Item created successfully',
        data: item
      }
    } catch (error) {
      console.error('Create item error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create item'
      }
    }
  }

  /**
   * Get all items for a company
   */
  async getItemsByCompany(companyId: string): Promise<ApiResponse<Item[]>> {
    try {
      const items = await dbService.getItemsByCompany(companyId)

      return {
        success: true,
        data: items
      }
    } catch (error) {
      console.error('Get items error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get items'
      }
    }
  }

  /**
   * Get a single item by ID
   */
  async getItemById(id: string): Promise<ApiResponse<Item>> {
    try {
      const item = await dbService.getItemById(id)

      if (!item) {
        return {
          success: false,
          error: 'Item not found'
        }
      }

      return {
        success: true,
        data: item
      }
    } catch (error) {
      console.error('Get item error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get item'
      }
    }
  }

  /**
   * Update an item
   */
  async updateItem(id: string, data: ItemUpdateInput): Promise<ApiResponse<Item>> {
    try {
      const item = await dbService.updateItem(id, data)

      return {
        success: true,
        message: 'Item updated successfully',
        data: item
      }
    } catch (error) {
      console.error('Update item error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update item'
      }
    }
  }

  /**
   * Delete an item
   */
  async deleteItem(id: string): Promise<ApiResponse> {
    try {
      await dbService.deleteItem(id)

      return {
        success: true,
        message: 'Item deleted successfully'
      }
    } catch (error) {
      console.error('Delete item error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete item'
      }
    }
  }

  /**
   * Bulk delete items
   */
  async bulkDeleteItems(ids: string[]): Promise<ApiResponse> {
    try {
      await dbService.bulkDeleteItems(ids)

      return {
        success: true,
        message: `${ids.length} items deleted successfully`
      }
    } catch (error) {
      console.error('Bulk delete items error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete items'
      }
    }
  }
}

export const itemService = new ItemService()
