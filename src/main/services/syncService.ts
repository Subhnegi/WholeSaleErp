 import { BrowserWindow, app } from 'electron'
import DatabaseService from './database'
import axios from 'axios'

const dbService = DatabaseService.getInstance()

interface SyncQueueItem {
  id: string
  type: 'company'
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: Date
  retryCount: number
}

interface SyncResult {
  success: boolean
  message: string
  synced: number
  failed: number
  errors?: string[]
}

class SyncService {
  private syncQueue: SyncQueueItem[] = []
  private isSyncing = false
  private autoSyncInterval: NodeJS.Timeout | null = null
  private scheduledSyncTimeout: NodeJS.Timeout | null = null
  private mainWindow: BrowserWindow | null = null
  private serverUrl: string

  constructor() {
    // Use production URL in packaged app, localhost in development
    if (app.isPackaged) {
      // Production: Use actual server URL (update this to your production server)
      this.serverUrl = process.env.API_URL || 'http://129.154.225.137:3000'
    } else {
      // Development: Use localhost
      this.serverUrl = process.env.VITE_API_URL || 'http://localhost:3000'
    }
    console.log(`[SyncService] Server URL: ${this.serverUrl}`)
    console.log(`[SyncService] Is Packaged: ${app.isPackaged}`)
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  /**
   * Check if server is online
   */
  async checkServerConnection(): Promise<boolean> {
    try {
      console.log(`[SyncService] Checking server connection at: ${this.serverUrl}/health`)
      const response = await axios.get(`${this.serverUrl}/health`, {
        timeout: 5000,
        validateStatus: (status) => status === 200
      })
      console.log(`[SyncService] Server response status: ${response.status}`)
      console.log(`[SyncService] Server response data:`, response.data)
      return response.status === 200
    } catch (error: any) {
      console.error('[SyncService] Server connection check failed:', error.message)
      console.error('[SyncService] Error code:', error.code)
      console.error('[SyncService] Error details:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      })
      return false
    }
  }

  /**
   * Get last sync timestamp from local database
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const meta = await dbService.getMeta('lastSyncTime')
      return meta?.value ? new Date(meta.value) : null
    } catch (error) {
      console.error('Failed to get last sync time:', error)
      return null
    }
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSyncTime(): Promise<void> {
    try {
      await dbService.setMeta('lastSyncTime', new Date().toISOString())
    } catch (error) {
      console.error('Failed to update last sync time:', error)
    }
  }

  /**
   * Load sync queue from database
   */
  async loadSyncQueue(): Promise<void> {
    try {
      const meta = await dbService.getMeta('syncQueue')
      
      if (meta?.value) {
        this.syncQueue = JSON.parse(meta.value)
        console.log(`Loaded ${this.syncQueue.length} items from sync queue`)
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error)
    }
  }

  /**
   * Save sync queue to database
   */
  async saveSyncQueue(): Promise<void> {
    try {
      await dbService.setMeta('syncQueue', JSON.stringify(this.syncQueue))
    } catch (error) {
      console.error('Failed to save sync queue:', error)
    }
  }

  /**
   * Add item to sync queue
   */
  async addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0
    }
    
    this.syncQueue.push(queueItem)
    await this.saveSyncQueue()
    
    // Notify renderer about pending syncs
    this.notifyRenderer('sync-queue-updated', {
      pending: this.syncQueue.length
    })
  }

  /**
   * Sync companies from local to server
   */
  async syncCompaniesToServer(token: string, userId: string): Promise<{ synced: number; failed: number; errors: string[] }> {
    let synced = 0
    let failed = 0
    const errors: string[] = []

    try {
      console.log('Starting sync: local → server')
      console.log('Server URL:', this.serverUrl)
      console.log('User ID:', userId)
      
      // DISABLED: Sync tracking removed in Phase 10.1 - use backup service instead
      // const companiesToSync = await dbService.getUnsyncedCompanies(userId)
      const companiesToSync: any[] = []
      console.log(`Found ${companiesToSync.length} unsynced companies`)
      
      if (companiesToSync.length === 0) {
        console.log('No companies to sync - all up to date')
        return { synced, failed, errors }
      }

      // Sync each company to server
      for (const company of companiesToSync) {
        try {
          console.log(`Syncing company: ${company.companyName} (${company.id})`)
          console.log('Company data:', JSON.stringify(company, null, 2))
          
          // Send to server
          const response = await axios.post(`${this.serverUrl}/api/companies`, company, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          })
          
          console.log('Server response:', response.status, response.data)
          
          // DISABLED: Sync tracking removed
          // await dbService.markCompanyAsSynced(company.id)
          
          synced++
          console.log(`✓ Synced: ${company.companyName}`)
        } catch (error: any) {
          failed++
          const errorMsg = `Failed to sync company ${company.companyName}: ${error.response?.data?.message || error.message}`
          errors.push(errorMsg)
          console.error(errorMsg)
          console.error('Error details:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          })
        }
      }

      console.log(`Sync to server complete: ${synced} synced, ${failed} failed`)
    } catch (error: any) {
      const errorMsg = `Failed to fetch local companies: ${error.message}`
      errors.push(errorMsg)
      console.error('Failed to sync companies to server:', error)
      console.error('Error stack:', error.stack)
    }

    return { synced, failed, errors }
  }

  /**
   * Sync companies from server to local
   */
  async syncCompaniesFromServer(token: string, userId: string): Promise<{ synced: number; failed: number; errors: string[] }> {
    let synced = 0
    let failed = 0
    const errors: string[] = []

    try {
      console.log('Starting sync: server → local')
      
      // Get all companies from server
      const response = await axios.get(`${this.serverUrl}/api/companies/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      })

      if (!response.data?.success || !response.data?.data) {
        console.log('No companies found on server')
        return { synced, failed, errors }
      }

      const serverCompanies = response.data.data
      console.log(`Found ${serverCompanies.length} companies on server`)
      
      for (const serverCompany of serverCompanies) {
        try {
          // Check if company exists locally
          console.log(`Checking if company exists: ${serverCompany.id}`)
          const existingCompany = await dbService.getCompanyById(serverCompany.id)
          console.log(`Existing company found:`, existingCompany ? `Yes (${existingCompany.companyName})` : 'No')
          
          if (existingCompany) {
            // Compare timestamps - only update if server version is newer
            const serverUpdatedAt = new Date(serverCompany.updatedAt)
            const localUpdatedAt = new Date(existingCompany.updatedAt)
            
            if (serverUpdatedAt > localUpdatedAt) {
              console.log(`Updating local company: ${serverCompany.companyName}`)
              await dbService.updateCompany(serverCompany.id, serverCompany)
              // DISABLED: Sync tracking removed
              // await dbService.markCompanyAsSynced(serverCompany.id)
              synced++
            } else {
              console.log(`Skipping ${serverCompany.companyName} - local version is up to date`)
            }
          } else {
            // Company doesn't exist locally, create it
            console.log(`Creating new local company: ${serverCompany.companyName}`)
            await dbService.createCompany(serverCompany)
            // DISABLED: Sync tracking removed
            // await dbService.markCompanyAsSynced(serverCompany.id)
            synced++
          }
        } catch (error: any) {
          failed++
          errors.push(`Failed to sync company ${serverCompany.companyName}: ${error.message}`)
          console.error(`Failed to sync company ${serverCompany.id} from server:`, error)
        }
      }
      
      console.log(`Sync from server complete: ${synced} synced, ${failed} failed`)
    } catch (error: any) {
      errors.push(`Failed to fetch server companies: ${error.message}`)
      console.error('Failed to sync companies from server:', error)
    }

    return { synced, failed, errors }
  }

  /**
   * Process sync queue
   */
  async processSyncQueue(token: string): Promise<{ processed: number; failed: number; errors: string[] }> {
    let processed = 0
    let failed = 0
    const errors: string[] = []

    const itemsToProcess = [...this.syncQueue]
    this.syncQueue = []

    for (const item of itemsToProcess) {
      try {
        if (item.type === 'company') {
          if (item.action === 'create' || item.action === 'update') {
            await axios.post(`${this.serverUrl}/api/companies`, item.data, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000
            })
          } else if (item.action === 'delete') {
            await axios.delete(`${this.serverUrl}/api/companies/${item.data.id}`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000
            })
          }
          processed++
        }
      } catch (error: any) {
        // If retry count is less than 3, add back to queue
        if (item.retryCount < 3) {
          this.syncQueue.push({
            ...item,
            retryCount: item.retryCount + 1
          })
        } else {
          failed++
          errors.push(`Failed to process queue item ${item.id}: ${error.message}`)
        }
      }
    }

    await this.saveSyncQueue()
    
    // Notify renderer about queue update
    this.notifyRenderer('sync-queue-updated', {
      pending: this.syncQueue.length
    })

    return { processed, failed, errors }
  }

  /**
   * Perform full sync (bidirectional)
   */
  async performFullSync(token: string, userId: string): Promise<SyncResult> {
    console.log('performFullSync called', { isSyncing: this.isSyncing })
    
    if (this.isSyncing) {
      console.log('Sync already in progress, returning early')
      return {
        success: false,
        message: 'Sync already in progress',
        synced: 0,
        failed: 0
      }
    }

    this.isSyncing = true
    console.log('Sending sync-started event')
    this.notifyRenderer('sync-started', {})

    try {
      // Check server connection
      console.log('Sending sync-progress: Checking server connection...')
      this.notifyRenderer('sync-progress', { 
        step: 'Checking server connection...', 
        progress: 10 
      })
      
      const isOnline = await this.checkServerConnection()
      console.log('Server connection check result:', isOnline)
      
      if (!isOnline) {
        this.isSyncing = false
        console.log('Server offline, sending sync-failed event')
        this.notifyRenderer('sync-failed', {
          error: 'Server is offline'
        })
        return {
          success: false,
          message: 'Server is offline. Sync queued for later.',
          synced: 0,
          failed: 0
        }
      }

      let totalSynced = 0
      let totalFailed = 0
      const allErrors: string[] = []

      // Process pending queue first
      console.log('Sending sync-progress: Processing pending queue...')
      this.notifyRenderer('sync-progress', { 
        step: 'Processing pending queue...', 
        progress: 25 
      })
      const queueResult = await this.processSyncQueue(token)
      totalSynced += queueResult.processed
      totalFailed += queueResult.failed
      allErrors.push(...queueResult.errors)

      // Sync local to server
      console.log('Sending sync-progress: Syncing local changes to server...')
      this.notifyRenderer('sync-progress', { 
        step: 'Syncing local changes to server...', 
        progress: 50 
      })
      const toServerResult = await this.syncCompaniesToServer(token, userId)
      totalSynced += toServerResult.synced
      totalFailed += toServerResult.failed
      allErrors.push(...toServerResult.errors)

      // Sync server to local
      console.log('Sending sync-progress: Syncing server changes to local...')
      this.notifyRenderer('sync-progress', { 
        step: 'Syncing server changes to local...', 
        progress: 75 
      })
      const fromServerResult = await this.syncCompaniesFromServer(token, userId)
      totalSynced += fromServerResult.synced
      totalFailed += fromServerResult.failed
      allErrors.push(...fromServerResult.errors)

      // Update last sync time
      console.log('Sending sync-progress: Finalizing...')
      this.notifyRenderer('sync-progress', { 
        step: 'Finalizing...', 
        progress: 90 
      })
      await this.updateLastSyncTime()

      console.log('Sending sync-completed event', { totalSynced, totalFailed })
      this.notifyRenderer('sync-completed', {
        success: totalFailed === 0,
        synced: totalSynced,
        failed: totalFailed
      })

      // Create appropriate message
      let message: string
      if (totalSynced === 0 && totalFailed === 0) {
        message = 'Everything is up to date. Nothing to sync.'
      } else if (totalFailed === 0) {
        message = `Sync completed successfully. ${totalSynced} items synced.`
      } else {
        message = `Sync completed with ${totalFailed} errors. ${totalSynced} items synced.`
      }

      return {
        success: totalFailed === 0,
        message,
        synced: totalSynced,
        failed: totalFailed,
        errors: allErrors.length > 0 ? allErrors : undefined
      }
    } catch (error: any) {
      console.error('Sync failed with error:', error)
      console.error('Error stack:', error.stack)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      })
      
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error'
      
      this.notifyRenderer('sync-failed', {
        error: errorMessage
      })

      return {
        success: false,
        message: `Sync failed: ${errorMessage}`,
        synced: 0,
        failed: 1,
        errors: [errorMessage]
      }
    } finally {
      this.isSyncing = false
      console.log('Sync process finished, isSyncing set to false')
    }
  }

  /**
   * Start auto-sync at regular intervals
   */
  startAutoSync(token: string, userId: string, intervalHours: number) {
    this.stopAutoSync()
    
    const intervalMs = intervalHours * 60 * 60 * 1000
    
    this.autoSyncInterval = setInterval(async () => {
      console.log('Running auto-sync...')
      await this.performFullSync(token, userId)
    }, intervalMs)
    
    console.log(`Auto-sync started with ${intervalHours}h interval`)
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval)
      this.autoSyncInterval = null
      console.log('Auto-sync stopped')
    }
  }

  /**
   * Schedule sync at specific time (e.g., "02:00" for 2 AM)
   */
  scheduleSync(token: string, userId: string, time: string) {
    this.stopScheduledSync()
    
    const [hours, minutes] = time.split(':').map(Number)
    
    const scheduleNext = () => {
      const now = new Date()
      const scheduledTime = new Date()
      scheduledTime.setHours(hours, minutes, 0, 0)
      
      // If time has passed today, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1)
      }
      
      const timeUntilSync = scheduledTime.getTime() - now.getTime()
      
      this.scheduledSyncTimeout = setTimeout(async () => {
        console.log('Running scheduled sync...')
        await this.performFullSync(token, userId)
        // Schedule next occurrence
        scheduleNext()
      }, timeUntilSync)
      
      console.log(`Scheduled sync at ${time} (in ${Math.round(timeUntilSync / 1000 / 60)} minutes)`)
    }
    
    scheduleNext()
  }

  /**
   * Stop scheduled sync
   */
  stopScheduledSync() {
    if (this.scheduledSyncTimeout) {
      clearTimeout(this.scheduledSyncTimeout)
      this.scheduledSyncTimeout = null
      console.log('Scheduled sync stopped')
    }
  }

  /**
   * Get sync queue status
   */
  getSyncQueueStatus() {
    return {
      pending: this.syncQueue.length,
      items: this.syncQueue
    }
  }

  /**
   * Notify renderer process
   */
  private notifyRenderer(channel: string, data: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data)
    }
  }

  /**
   * Cleanup on app quit
   */
  cleanup() {
    this.stopAutoSync()
    this.stopScheduledSync()
  }
}

export const syncService = new SyncService()
