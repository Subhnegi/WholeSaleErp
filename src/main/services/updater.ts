import pkg from 'electron-updater'
const { autoUpdater } = pkg
import { BrowserWindow, dialog, app } from 'electron'
import { is } from '@electron-toolkit/utils'
import DatabaseService from './database'

class UpdaterService {
  private static instance: UpdaterService
  private mainWindow: BrowserWindow | null = null
  private dbService: DatabaseService
  private isManualCheck = false

  private constructor() {
    this.dbService = DatabaseService.getInstance()
    
    // Configure auto-updater
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // Configure GitHub token for private repositories (optional)
    // If your repository is private, set GH_TOKEN environment variable
    if (process.env.GH_TOKEN) {
      autoUpdater.requestHeaders = {
        Authorization: `token ${process.env.GH_TOKEN}`
      }
      console.log('GitHub token configured for private repository access')
    }

    // Set up event listeners
    this.setupEventListeners()
  }

  public static getInstance(): UpdaterService {
    if (!UpdaterService.instance) {
      UpdaterService.instance = new UpdaterService()
    }
    return UpdaterService.instance
  }

  public setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  private setupEventListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      console.log('=== UPDATE CHECK STARTED ===')
      console.log('Checking for updates...')
      console.log('Feed URL:', autoUpdater.getFeedURL())
      this.sendStatusToWindow({
        type: 'checking',
        message: 'Checking for updates...'
      })
      
      // Save check timestamp to database
      this.dbService.saveUpdateInfo({
        lastCheckDate: new Date(),
        currentVersion: app.getVersion(),
        updateAvailable: false
      }).catch(err => console.error('Failed to save update check:', err))
    })

    autoUpdater.on('update-available', (info) => {
      console.log('=== UPDATE AVAILABLE ===')
      console.log('Update available:', info)
      console.log('Current version:', app.getVersion())
      console.log('New version:', info.version)
      this.sendStatusToWindow({
        type: 'available',
        message: `Update available: v${info.version}`,
        version: info.version
      })
      
      // Save update info to database
      this.dbService.saveUpdateInfo({
        lastCheckDate: new Date(),
        currentVersion: app.getVersion(),
        availableVersion: info.version,
        updateAvailable: true
      }).catch(err => console.error('Failed to save update info:', err))
      
      dialog
        .showMessageBox({
          type: 'info',
          title: 'Update Available',
          message: `A new version (${info.version}) is available. Would you like to download it now?`,
          buttons: ['Download', 'Later'],
          defaultId: 0,
          cancelId: 1
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.downloadUpdate()
          }
        })
    })

    autoUpdater.on('update-not-available', (info) => {
      console.log('=== UPDATE NOT AVAILABLE ===')
      console.log('Update not available:', info)
      console.log('Current version:', app.getVersion())
      console.log('Latest version:', info.version)
      this.sendStatusToWindow({
        type: 'not-available',
        message: 'App is up to date',
        version: info.version
      })
      
      // Save update info to database
      this.dbService.saveUpdateInfo({
        lastCheckDate: new Date(),
        currentVersion: app.getVersion(),
        availableVersion: info.version,
        updateAvailable: false
      }).catch(err => console.error('Failed to save update info:', err))
      
      // Only show dialog if this was a manual check
      if (this.isManualCheck) {
        dialog.showMessageBox({
          type: 'info',
          title: 'No Updates',
          message: 'You are running the latest version.',
          buttons: ['OK']
        })
      }
      
      // Reset manual check flag
      this.isManualCheck = false
    })

    autoUpdater.on('error', (err) => {
      console.error('=== UPDATE ERROR ===')
      console.error('Update error:', err)
      console.error('Error message:', err.message)
      console.error('Error stack:', err.stack)
      this.sendStatusToWindow({
        type: 'error',
        message: err.message
      })
      
      // Check if it's a network error (DNS, connection refused, etc.)
      const isNetworkError = err.message && (
        err.message.includes('net::ERR_NAME_NOT_RESOLVED') ||
        err.message.includes('ERR_INTERNET_DISCONNECTED') ||
        err.message.includes('ENOTFOUND') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('network')
      )
      
      if (isNetworkError) {
        // Only show dialog for manual checks, not automatic checks
        if (this.isManualCheck) {
          dialog.showMessageBox({
            type: 'warning',
            title: 'Connection Error',
            message: 'Unable to check for updates.',
            detail: 'Please check your internet connection and try again.',
            buttons: ['OK']
          })
        } else {
          console.log('[Update] Automatic update check failed due to network error - skipping dialog')
        }
        this.isManualCheck = false
        return
      }
      
      // Check if it's a 404 error
      if (err.message && err.message.includes('404')) {
        dialog.showMessageBox({
          type: 'warning',
          title: 'Cannot Access Updates',
          message: 'Unable to check for updates.',
          detail: 'Possible reasons:\n\n' +
                  '1. The GitHub repository is private and requires authentication\n' +
                  '2. No releases have been published yet\n' +
                  '3. The repository does not exist\n\n' +
                  'If this is a private repository, configure a GitHub token (GH_TOKEN environment variable).',
          buttons: ['OK']
        })
      } else {
        // Only show generic error dialog for manual checks
        if (this.isManualCheck) {
          dialog.showMessageBox({
            type: 'error',
            title: 'Update Error',
            message: 'An error occurred while checking for updates.',
            detail: err.message,
            buttons: ['OK']
          })
        } else {
          console.log('[Update] Automatic update check failed - skipping error dialog')
        }
      }
      
      // Reset manual check flag
      this.isManualCheck = false
    })

    autoUpdater.on('download-progress', (progressObj) => {
      const bytesPerSecondMB = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2)
      const totalMB = (progressObj.total / 1024 / 1024).toFixed(2)
      const transferredMB = (progressObj.transferred / 1024 / 1024).toFixed(2)
      
      const message = `Downloading: ${transferredMB}MB / ${totalMB}MB (${bytesPerSecondMB} MB/s)`
      console.log(message)
      
      // Send download progress to renderer
      this.sendStatusToWindow({
        type: 'downloading',
        message: message,
        progress: progressObj.percent
      })
      
      // Show progress in taskbar
      if (this.mainWindow) {
        this.mainWindow.setProgressBar(progressObj.percent / 100)
      }
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info)
      this.sendStatusToWindow({
        type: 'downloaded',
        message: 'Update ready to install',
        version: info.version
      })
      
      // Reset progress bar
      if (this.mainWindow) {
        this.mainWindow.setProgressBar(-1)
      }
      
      dialog
        .showMessageBox({
          type: 'info',
          title: 'Update Ready',
          message: 'A new version has been downloaded. The application will restart to install the update.',
          buttons: ['Restart Now', 'Later'],
          defaultId: 0,
          cancelId: 1
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall()
          }
        })
    })
  }

  private sendStatusToWindow(data: {
    type: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
    message?: string
    progress?: number
    version?: string
  }): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('update-status', data)
    }
  }

  public checkForUpdates(): void {
    // Only check for updates in production
    if (!is.dev) {
      console.log('Checking for updates automatically...')
      console.log('Current version:', app.getVersion())
      autoUpdater.checkForUpdates()
    } else {
      console.log('Auto-update disabled in development mode')
    }
  }

  public async checkForUpdatesManual(): Promise<void> {
    if (!is.dev) {
      try {
        // Set flag to show dialog for manual checks
        this.isManualCheck = true
        await autoUpdater.checkForUpdates()
      } catch (error) {
        console.error('Manual update check failed:', error)
        this.isManualCheck = false
        // Error will be handled by the 'error' event listener
      }
    } else {
      console.log('Manual update check in development mode')
      dialog.showMessageBox({
        type: 'info',
        title: 'Development Mode',
        message: 'Auto-update is disabled in development mode.\n\nIn production, this will check for updates from your configured update server.',
        buttons: ['OK']
      })
    }
  }
}

export default UpdaterService
