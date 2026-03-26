import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import DatabaseService from './services/database'
import UpdaterService from './services/updater'
import LicenseManager from './services/licenseManager'
import LicenseEnforcer from './services/licenseEnforcer'
import BackupService from './services/backupService'
import { companyService } from './services/companyService'
import { accountGroupService } from './services/accountGroupService'
import { accountService } from './services/accountService'
import { itemService } from './services/itemService'
import { crateService } from './services/crateService'
import arrivalTypeService from './services/arrivalTypeService'
import otherChargesHeadService from './services/otherChargesHeadService'
import { PackingService } from './services/packingService'
import { StoreService } from './services/storeService'
import { QuickSaleService } from './services/quickSaleService'
import { QuickReceiptService } from './services/quickReceiptService'
import { QuickPaymentService } from './services/quickPaymentService'
import { VoucherService } from './services/voucherService'
import { CrateIssueService } from './services/crateIssueService'
import { CrateReceiveService } from './services/crateReceiveService'
import { ArrivalService } from './services/arrivalService'
import { StockSaleService } from './services/stockSaleService'
import { SellerBillService } from './services/sellerBillService'
import { StockTransferService } from './services/stockTransferService'
import { StockWattakService } from './services/stockWattakService'
import { lotStockService } from './services/lotStockService'
import { StockLedgerService } from './services/stockLedgerService'
import { partyReportService, SaleSummaryFilters } from './services/partyReportService'
import LaddanProfitabilityService from './services/laddanProfitabilityService'
import { AccountLedgerService } from './services/accountLedgerService'
import { dashboardService } from './services/dashboardService'

const dbService = DatabaseService.getInstance()
const updaterService = UpdaterService.getInstance()
const licenseManager = LicenseManager.getInstance()
const licenseEnforcer = LicenseEnforcer.getInstance()
const backupService = BackupService.getInstance()
const packingService = new PackingService(dbService)
const storeService = new StoreService(dbService)
const quickSaleService = QuickSaleService.getInstance()
const quickReceiptService = QuickReceiptService.getInstance()
const quickPaymentService = QuickPaymentService.getInstance()
const voucherService = VoucherService.getInstance()
const crateIssueService = CrateIssueService.getInstance()
const crateReceiveService = CrateReceiveService.getInstance()
const arrivalService = ArrivalService.getInstance()
const stockSaleService = StockSaleService.getInstance()
const sellerBillService = SellerBillService.getInstance()
const stockTransferService = StockTransferService.getInstance()
const stockWattakService = StockWattakService.getInstance()
const laddanProfitabilityService = LaddanProfitabilityService.getInstance()
const accountLedgerService = AccountLedgerService.getInstance()

// Global reference to the main window for IPC handlers
let mainWindowRef: BrowserWindow | null = null

// @ts-ignore - Unused but kept for future menu implementation
function createMenu(mainWindow: BrowserWindow, hasActiveCompany = false): Menu {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Check for Updates...',
                click: () => updaterService.checkForUpdatesManual()
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    // File Menu
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' as const } : { role: 'quit' as const }]
    },
    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' as const }, { role: 'stopSpeaking' as const }]
              }
            ]
          : [{ role: 'delete' as const }, { type: 'separator' as const }, { role: 'selectAll' as const }])
      ]
    },
    // Transactions Menu (only shown when company is selected)
    ...(hasActiveCompany
      ? [
          {
            label: 'Transactions',
            submenu: [
              {
                label: 'Quick Sale',
                accelerator: 'CmdOrCtrl+Q',
                click: (): void => {
                  mainWindow.webContents.send('navigate-to', '/entries/quick-sale')
                }
              }
            ]
          }
        ]
      : []),
    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        ...(is.dev ? [{ role: 'toggleDevTools' as const }, { type: 'separator' as const }] : []),
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [{ role: 'close' as const }])
      ]
    },
    // Help Menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => updaterService.checkForUpdatesManual()
        },
        { type: 'separator' as const },
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://subhnegi.com')
          }
        },
        {
          label: 'Documentation',
          click: async () => {
            const docsPath = is.dev 
              ? join(process.cwd(), 'docs')
              : join(process.resourcesPath, 'docs')
            
            const result = await shell.openPath(docsPath)
            if (result) {
              // If opening failed, show error
              dialog.showMessageBox({
                type: 'warning',
                title: 'Documentation Not Found',
                message: 'Unable to open documentation folder.',
                detail: `Path: ${docsPath}\n\nError: ${result}`,
                buttons: ['OK']
              })
            }
          }
        },
        { type: 'separator' as const },
        {
          label: 'About whole Sale ERP',
          click: () => {
            const aboutWindow = new BrowserWindow({
              width: 400,
              height: 300,
              resizable: false,
              minimizable: false,
              maximizable: false,
              parent: mainWindow,
              modal: true,
              show: false,
              backgroundColor: '#667eea',
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
              }
            })
            aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <style>
                    * {
                      margin: 0;
                      padding: 0;
                      box-sizing: border-box;
                    }
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      height: 100vh;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      text-align: center;
                      padding: 20px;
                    }
                    h1 {
                      margin: 10px 0;
                      font-size: 28px;
                      font-weight: 600;
                      letter-spacing: -0.5px;
                    }
                    p {
                      margin: 5px 0;
                      font-size: 14px;
                      opacity: 0.95;
                    }
                    .version {
                      font-size: 16px;
                      font-weight: 500;
                      margin-top: 15px;
                    }
                    .subtitle {
                      font-size: 15px;
                      margin-top: 5px;
                      opacity: 0.9;
                    }
                    .copyright {
                      margin-top: 30px;
                      font-size: 12px;
                      opacity: 0.8;
                    }
                    .link {
                      margin-top: 10px;
                      font-size: 13px;
                      opacity: 0.85;
                    }
                  </style>
                </head>
                <body>
                  <h1>whole Sale ERP</h1>
                  <p class="version">Version ${app.getVersion()}</p>
                  <p class="subtitle">Offline-First ERP System</p>
                  <p class="link">www.subhnegi.com</p>
                  <p class="copyright">© 2025 subhnegi. All rights reserved.</p>
                </body>
              </html>
            `)}`)
            aboutWindow.once('ready-to-show', () => {
              aboutWindow.show()
            })
            aboutWindow.removeMenu()
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  return menu
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: false, // Show menu bar to access Help > Check for Updates
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  // Store global reference
  mainWindowRef = mainWindow

  // Handle window close - check for unsaved changes
  let isClosing = false
  mainWindow.on('close', async (e) => {
    // If already confirmed, allow close
    if (isClosing) {
      return
    }

    e.preventDefault()
    
    // Ask renderer if there are unsaved changes (check tabTransactionStates)
    const hasUnsavedChanges = await mainWindow.webContents.executeJavaScript(
      `(() => {
        try {
          const store = window.__REDUX_STORE__;
          if (!store) return false;
          const state = store.getState();
          const tabTransactionStates = state?.tabs?.tabTransactionStates || {};
          return Object.values(tabTransactionStates).some(ts => ts && ts.isActive);
        } catch {
          return false;
        }
      })()`
    )

    if (hasUnsavedChanges) {
      // Send event to renderer to show custom confirmation dialog
      mainWindow.webContents.send('window:request-close-confirmation')
    } else {
      // No unsaved changes, close normally
      isClosing = true
      mainWindow.close()
    }
  })

  // Handle confirmation response from renderer
  ipcMain.on('window:close-confirmed', () => {
    isClosing = true
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
  })

  ipcMain.on('window:close-cancelled', () => {
    isClosing = false
  })

  // Disable native application menu (using React-based menu instead)
  Menu.setApplicationMenu(null)

  // Set updater main window reference
  updaterService.setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.whole.sale.erp')

  // Initialize database
  try {
    await dbService.initialize()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Database IPC handlers
  ipcMain.handle('db:getVersionInfo', async () => {
    try {
      return await dbService.getVersionInfo()
    } catch (error) {
      console.error('Failed to get version info:', error)
      throw error
    }
  })

  ipcMain.handle('db:getMeta', async (_, key: string) => {
    try {
      return await dbService.getMeta(key)
    } catch (error) {
      console.error('Failed to get meta:', error)
      throw error
    }
  })

  ipcMain.handle('db:setMeta', async (_, key: string, value: string) => {
    try {
      await dbService.setMeta(key, value)
    } catch (error) {
      console.error('Failed to set meta:', error)
      throw error
    }
  })

  ipcMain.handle('db:getAllMeta', async () => {
    try {
      return await dbService.getAllMeta()
    } catch (error) {
      console.error('Failed to get all meta:', error)
      throw error
    }
  })

  // Preferences IPC handlers - ISSUE 2 FIX: Store in DB instead of localStorage
  ipcMain.handle('preferences:get', async () => {
    try {
      const prefs = await dbService.getMeta('userPreferences')
      if (prefs && prefs.value) {
        return JSON.parse(prefs.value)
      }
      return null
    } catch (error) {
      console.error('Failed to get preferences:', error)
      return null
    }
  })

  ipcMain.handle('preferences:save', async (_, preferences) => {
    try {
      await dbService.setMeta('userPreferences', JSON.stringify(preferences))
      return { success: true }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Update Info IPC handlers
  ipcMain.handle('db:getUpdateInfo', async () => {
    try {
      return await dbService.getUpdateInfo()
    } catch (error) {
      console.error('Failed to get update info:', error)
      return null
    }
  })

  ipcMain.handle('db:saveUpdateInfo', async (_, data) => {
    try {
      return await dbService.saveUpdateInfo(data)
    } catch (error) {
      console.error('Failed to save update info:', error)
      throw error
    }
  })

  // License Manager IPC handlers
  ipcMain.handle('license:register', async (_, data) => {
    try {
      return await licenseManager.register(data)
    } catch (error) {
      console.error('Failed to register user:', error)
      throw error
    }
  })

  ipcMain.handle('license:login', async (_, data) => {
    try {
      return await licenseManager.login(data)
    } catch (error) {
      console.error('Failed to login user:', error)
      throw error
    }
  })

  ipcMain.handle('license:logout', async () => {
    try {
      return await licenseManager.logout()
    } catch (error) {
      console.error('Failed to logout user:', error)
      throw error
    }
  })

  ipcMain.handle('license:validate', async (_, licenseKey?: string) => {
    try {
      return await licenseManager.validateLicense(licenseKey)
    } catch (error) {
      console.error('Failed to validate license:', error)
      throw error
    }
  })

  ipcMain.handle('license:isLoggedIn', () => {
    try {
      return licenseManager.isLoggedIn()
    } catch (error) {
      console.error('Failed to check login status:', error)
      return false
    }
  })

  ipcMain.handle('license:getUserData', () => {
    try {
      return licenseManager.getUserData()
    } catch (error) {
      console.error('Failed to get user data:', error)
      return null
    }
  })

  ipcMain.handle('license:isExpired', () => {
    try {
      return licenseManager.isLicenseExpired()
    } catch (error) {
      console.error('Failed to check license expiration:', error)
      return true
    }
  })

  ipcMain.handle('license:getDaysRemaining', () => {
    try {
      return licenseManager.getDaysRemaining()
    } catch (error) {
      console.error('Failed to get days remaining:', error)
      return 0
    }
  })

  // License Enforcer IPC handlers
  ipcMain.handle('enforcer:checkEnforcement', async () => {
    try {
      return await licenseEnforcer.checkLicenseEnforcement()
    } catch (error) {
      console.error('Failed to check license enforcement:', error)
      throw error
    }
  })

  ipcMain.handle('enforcer:forceValidation', async () => {
    try {
      return await licenseEnforcer.forceValidation()
    } catch (error) {
      console.error('Failed to force validation:', error)
      throw error
    }
  })

  // Get app version
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  // Check network connectivity
  ipcMain.handle('app:checkConnectivity', async () => {
    try {
      // Try to resolve DNS for a reliable host
      const dns = await import('dns')
      return new Promise((resolve) => {
        dns.resolve('www.google.com', (err) => {
          if (err) {
            // console.log('Network check: Offline (DNS resolution failed)')
            resolve(false)
          } else {
            // console.log('Network check: Online (DNS resolution succeeded)')
            resolve(true)
          }
        })
      })
    } catch (error) {
      // console.log('Network check: Offline (error)', error)
      return false
    }
  })

  // Trigger manual update check
  ipcMain.handle('app:checkForUpdates', async () => {
    try {
      await updaterService.checkForUpdatesManual()
      return { success: true }
    } catch (error) {
      console.error('Failed to check for updates:', error)
      return { success: false, error: String(error) }
    }
  })

  // Relaunch app
  ipcMain.handle('app:relaunch', () => {
    app.relaunch()
    app.quit()
  })

  // Quit app
  ipcMain.handle('app:quit', () => {
    app.quit()
  })

  // Window control methods
  ipcMain.handle('app:forceReload', () => {
    if (mainWindowRef) {
      mainWindowRef.webContents.reloadIgnoringCache()
    }
  })

  ipcMain.handle('app:toggleDevTools', () => {
    if (mainWindowRef) {
      mainWindowRef.webContents.toggleDevTools()
    }
  })

  ipcMain.handle('app:toggleFullscreen', () => {
    if (mainWindowRef) {
      mainWindowRef.setFullScreen(!mainWindowRef.isFullScreen())
    }
  })

  ipcMain.handle('app:zoomIn', () => {
    if (mainWindowRef) {
      const currentZoom = mainWindowRef.webContents.getZoomLevel()
      mainWindowRef.webContents.setZoomLevel(currentZoom + 0.5)
    }
  })

  ipcMain.handle('app:zoomOut', () => {
    if (mainWindowRef) {
      const currentZoom = mainWindowRef.webContents.getZoomLevel()
      mainWindowRef.webContents.setZoomLevel(currentZoom - 0.5)
    }
  })

  ipcMain.handle('app:resetZoom', () => {
    if (mainWindowRef) {
      mainWindowRef.webContents.setZoomLevel(0)
    }
  })

  ipcMain.handle('app:minimize', () => {
    if (mainWindowRef) {
      mainWindowRef.minimize()
    }
  })

  ipcMain.handle('app:maximize', () => {
    if (mainWindowRef) {
      if (mainWindowRef.isMaximized()) {
        mainWindowRef.unmaximize()
      } else {
        mainWindowRef.maximize()
      }
    }
  })

  ipcMain.handle('app:close', () => {
    if (mainWindowRef) {
      mainWindowRef.close()
    }
  })

  ipcMain.handle('app:showAbout', () => {
    if (mainWindowRef) {
      // Create about window (similar to existing createMenu function)
      const aboutWindow = new BrowserWindow({
        width: 400,
        height: 300,
        resizable: false,
        minimizable: false,
        maximizable: false,
        parent: mainWindowRef,
        modal: true,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      const aboutHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>About whole Sale ERP</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
            }
            .logo {
              width: 80px;
              height: 80px;
              background: rgba(255,255,255,0.2);
              border-radius: 16px;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              font-weight: bold;
            }
            h1 { margin: 10px 0; font-size: 24px; }
            p { margin: 8px 0; opacity: 0.9; }
            .version { font-size: 18px; font-weight: 600; }
            .company { margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.3); }
          </style>
        </head>
        <body>
          <div class="logo">Subh</div>
          <h1>whole Sale ERP</h1>
          <p class="version">Version ${app.getVersion()}</p>
          <p>Complete Business Management Solution</p>
          <div class="company">
            <p><strong>subhnegi</strong></p>
            <p>© 2025 All Rights Reserved</p>
          </div>
        </body>
        </html>
      `

      aboutWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(aboutHtml)}`)
      aboutWindow.removeMenu()

      aboutWindow.once('ready-to-show', () => {
        aboutWindow.show()
      })
    }
  })

  ipcMain.handle('app:openExternal', async (_, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('app:openDocumentation', async () => {
    const docsPath = is.dev 
      ? join(process.cwd(), 'docs')
      : join(process.resourcesPath, 'docs')
    
    const result = await shell.openPath(docsPath)
    if (result && mainWindowRef) {
      // If opening failed, show error
      dialog.showMessageBox(mainWindowRef, {
        type: 'warning',
        title: 'Documentation Not Found',
        message: 'Unable to open documentation folder.',
        detail: `Path: ${docsPath}\n\nError: ${result}`,
        buttons: ['OK']
      })
    }
  })

  // Open external URL
  ipcMain.on('open-external-url', (_event, url: string) => {
    shell.openExternal(url)
  })

  // Quit app
  ipcMain.on('quit-app', () => {
    app.quit()
  })

  // Note: Using React-based menu system instead of native Electron menus
  // Menu updates are handled by the React MenuBar component

  // Phase 2.4: Startup license check
  ipcMain.handle('license:startupCheck', async () => {
    try {
      const enforcement = await licenseEnforcer.checkLicenseEnforcement()
      return { success: true, enforcement }
    } catch (error) {
      console.error('Startup license check failed:', error)
      return { success: false, error: String(error) }
    }
  })

  // Phase 2.4: Force online validation (for "I Already Renewed" button)
  ipcMain.handle('license:forceOnlineValidation', async () => {
    try {
      // Force server validation, bypass cache
      const result = await licenseEnforcer.forceValidation()
      if (result.success) {
        // Re-check enforcement after successful validation
        const enforcement = await licenseEnforcer.checkLicenseEnforcement()
        return { success: true, enforcement }
      } else {
        return { success: false, message: result.message || 'Validation failed' }
      }
    } catch (error) {
      console.error('Force online validation failed:', error)
      return { success: false, message: String(error) }
    }
  })

  // ========================
  // Phase 3.2: Company & Financial Year IPC Handlers
  // ========================

  // Company handlers
  ipcMain.handle('company:create', async (_, data) => {
    try {
      // Get auth token from license manager
      const userData = await licenseManager.getUserData()
      if (userData?.token) {
        companyService.setAuthToken(userData.token)
      }
      return await companyService.createCompany(data)
    } catch (error) {
      console.error('Create company error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('company:list', async (_, userId: string) => {
    try {
      const userData = await licenseManager.getUserData()
      if (userData?.token) {
        companyService.setAuthToken(userData.token)
      }
      return await companyService.getCompaniesByUserId(userId)
    } catch (error) {
      console.error('List companies error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('company:update', async (_, id: string, data: any) => {
    try {
      const userData = await licenseManager.getUserData()
      if (userData?.token) {
        companyService.setAuthToken(userData.token)
      }
      return await companyService.updateCompany(id, data)
    } catch (error) {
      console.error('Update company error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('company:delete', async (_, id: string) => {
    try {
      const userData = await licenseManager.getUserData()
      if (userData?.token) {
        companyService.setAuthToken(userData.token)
      }
      return await companyService.deleteCompany(id)
    } catch (error) {
      console.error('Delete company error:', error)
      return { success: false, message: String(error) }
    }
  })

  // ========================
  // Dashboard handlers
  // ========================

  ipcMain.handle('dashboard:getStats', async (_, companyId: string) => {
    try {
      return await dashboardService.getStats(companyId)
    } catch (error) {
      console.error('Dashboard stats error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // Account Group handlers
  // ========================

  ipcMain.handle('accountGroup:create', async (_, data) => {
    try {
      const userData = await licenseManager.getUserData()
      if (userData?.token) {
        accountGroupService.setAuthToken(userData.token)
      }
      return await accountGroupService.createAccountGroup(data)
    } catch (error) {
      console.error('Create account group error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('accountGroup:list', async (_, companyId: string) => {
    try {
      return await accountGroupService.getAccountGroupsByCompany(companyId)
    } catch (error) {
      console.error('List account groups error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('accountGroup:get', async (_, id: string) => {
    try {
      return await accountGroupService.getAccountGroupById(id)
    } catch (error) {
      console.error('Get account group error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('accountGroup:update', async (_, id: string, data: any) => {
    try {
      return await accountGroupService.updateAccountGroup(id, data)
    } catch (error) {
      console.error('Update account group error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('accountGroup:delete', async (_, id: string) => {
    try {
      return await accountGroupService.deleteAccountGroup(id)
    } catch (error) {
      console.error('Delete account group error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('accountGroup:bulkDelete', async (_, ids: string[]) => {
    try {
      return await accountGroupService.bulkDeleteAccountGroups(ids)
    } catch (error) {
      console.error('Bulk delete account groups error:', error)
      return { success: false, message: String(error) }
    }
  })

  // ========================
  // Account handlers
  // ========================

  ipcMain.handle('account:create', async (_, data) => {
    try {
      const userData = await licenseManager.getUserData()
      if (userData?.token) {
        accountService.setAuthToken(userData.token)
      }
      return await accountService.createAccount(data)
    } catch (error) {
      console.error('Create account error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('account:listByCompany', async (_, companyId: string) => {
    try {
      return await accountService.getAccountsByCompany(companyId)
    } catch (error) {
      console.error('List accounts by company error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('account:listByGroup', async (_, accountGroupId: string) => {
    try {
      return await accountService.getAccountsByGroup(accountGroupId)
    } catch (error) {
      console.error('List accounts by group error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('account:get', async (_, id: string) => {
    try {
      return await accountService.getAccountById(id)
    } catch (error) {
      console.error('Get account error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('account:update', async (_, id: string, data: any) => {
    try {
      return await accountService.updateAccount(id, data)
    } catch (error) {
      console.error('Update account error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('account:delete', async (_, id: string) => {
    try {
      return await accountService.deleteAccount(id)
    } catch (error) {
      console.error('Delete account error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('account:bulkDelete', async (_, ids: string[]) => {
    try {
      return await accountService.bulkDeleteAccounts(ids)
    } catch (error) {
      console.error('Bulk delete accounts error:', error)
      return { success: false, message: String(error) }
    }
  })

  ipcMain.handle('account:bulkUpdateGroup', async (_, ids: string[], accountGroupId: string) => {
    try {
      return await accountService.bulkUpdateAccountGroup(ids, accountGroupId)
    } catch (error) {
      console.error('Bulk update account group error:', error)
      return { success: false, message: String(error) }
    }
  })

  // ========================
  // Phase 5.2: Item IPC Handlers
  // ========================

  // Create new item
  ipcMain.handle('item:create', async (_, companyId: string, data: any) => {
    try {
      return await itemService.createItem(companyId, data)
    } catch (error) {
      console.error('Create item error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Get items by company
  ipcMain.handle('item:listByCompany', async (_, companyId: string) => {
    try {
      return await itemService.getItemsByCompany(companyId)
    } catch (error) {
      console.error('Get items by company error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Get single item
  ipcMain.handle('item:get', async (_, id: string) => {
    try {
      return await itemService.getItemById(id)
    } catch (error) {
      console.error('Get item error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Update item
  ipcMain.handle('item:update', async (_, id: string, data: any) => {
    try {
      return await itemService.updateItem(id, data)
    } catch (error) {
      console.error('Update item error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Delete item
  ipcMain.handle('item:delete', async (_, id: string) => {
    try {
      return await itemService.deleteItem(id)
    } catch (error) {
      console.error('Delete item error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Bulk delete items
  ipcMain.handle('item:bulkDelete', async (_, ids: string[]) => {
    try {
      return await itemService.bulkDeleteItems(ids)
    } catch (error) {
      console.error('Bulk delete items error:', error)
      return { success: false, message: String(error) }
    }
  })

  // ========================
  // Phase 6.2: Crate Management IPC Handlers
  // ========================

  // Create new crate marka
  ipcMain.handle('crate:create', async (_, companyId: string, data: any) => {
    try {
      return await crateService.createCrateMarka(companyId, data)
    } catch (error) {
      console.error('Create crate marka error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Get crate markas by company
  ipcMain.handle('crate:listByCompany', async (_, companyId: string) => {
    try {
      return await crateService.getCrateMarkasByCompany(companyId)
    } catch (error) {
      console.error('Get crate markas by company error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Get single crate marka
  ipcMain.handle('crate:get', async (_, id: string) => {
    try {
      return await crateService.getCrateMarkaById(id)
    } catch (error) {
      console.error('Get crate marka error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Update crate marka
  ipcMain.handle('crate:update', async (_, id: string, data: any) => {
    try {
      return await crateService.updateCrateMarka(id, data)
    } catch (error) {
      console.error('Update crate marka error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Delete crate marka
  ipcMain.handle('crate:delete', async (_, id: string) => {
    try {
      return await crateService.deleteCrateMarka(id)
    } catch (error) {
      console.error('Delete crate marka error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Bulk delete crate markas
  ipcMain.handle('crate:bulkDelete', async (_, ids: string[]) => {
    try {
      return await crateService.bulkDeleteCrateMarkas(ids)
    } catch (error) {
      console.error('Bulk delete crate markas error:', error)
      return { success: false, message: String(error) }
    }
  })

  // ========================
  // Phase 7.2: ArrivalType Management IPC Handlers
  // ========================

  // Create new arrival type
  ipcMain.handle('arrivalType:create', async (_, companyId: string, data: any) => {
    try {
      return await arrivalTypeService.createArrivalType(companyId, data)
    } catch (error) {
      console.error('Create arrival type error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Get arrival types by company
  ipcMain.handle('arrivalType:listByCompany', async (_, companyId: string) => {
    try {
      return await arrivalTypeService.getArrivalTypesByCompany(companyId)
    } catch (error) {
      console.error('Get arrival types by company error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Get single arrival type
  ipcMain.handle('arrivalType:get', async (_, id: string) => {
    try {
      return await arrivalTypeService.getArrivalTypeById(id)
    } catch (error) {
      console.error('Get arrival type error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Update arrival type
  ipcMain.handle('arrivalType:update', async (_, id: string, data: any) => {
    try {
      return await arrivalTypeService.updateArrivalType(id, data)
    } catch (error) {
      console.error('Update arrival type error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Delete arrival type
  ipcMain.handle('arrivalType:delete', async (_, id: string) => {
    try {
      return await arrivalTypeService.deleteArrivalType(id)
    } catch (error) {
      console.error('Delete arrival type error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Bulk delete arrival types
  ipcMain.handle('arrivalType:bulkDelete', async (_, ids: string[]) => {
    try {
      return await arrivalTypeService.bulkDeleteArrivalTypes(ids)
    } catch (error) {
      console.error('Bulk delete arrival types error:', error)
      return { success: false, message: String(error) }
    }
  })

  // ========================
  // Phase 14.4: OtherChargesHead IPC Handlers
  // ========================

  // Create new other charges head
  ipcMain.handle('otherChargesHead:create', async (_, companyId: string, data: any) => {
    try {
      return await otherChargesHeadService.createOtherChargesHead(companyId, data)
    } catch (error) {
      console.error('Create other charges head error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Get other charges heads by company
  ipcMain.handle('otherChargesHead:listByCompany', async (_, companyId: string) => {
    try {
      return await otherChargesHeadService.getOtherChargesHeadsByCompany(companyId)
    } catch (error) {
      console.error('Get other charges heads by company error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Get single other charges head
  ipcMain.handle('otherChargesHead:get', async (_, id: string) => {
    try {
      return await otherChargesHeadService.getOtherChargesHeadById(id)
    } catch (error) {
      console.error('Get other charges head error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Update other charges head
  ipcMain.handle('otherChargesHead:update', async (_, id: string, data: any) => {
    try {
      return await otherChargesHeadService.updateOtherChargesHead(id, data)
    } catch (error) {
      console.error('Update other charges head error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Delete other charges head
  ipcMain.handle('otherChargesHead:delete', async (_, id: string) => {
    try {
      return await otherChargesHeadService.deleteOtherChargesHead(id)
    } catch (error) {
      console.error('Delete other charges head error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Bulk delete other charges heads
  ipcMain.handle('otherChargesHead:bulkDelete', async (_, ids: string[]) => {
    try {
      return await otherChargesHeadService.bulkDeleteOtherChargesHeads(ids)
    } catch (error) {
      console.error('Bulk delete other charges heads error:', error)
      return { success: false, message: String(error) }
    }
  })

  // ========================
  // Phase 8.2: Packing IPC Handlers
  // ========================

  // Create new packing
  ipcMain.handle('packing:create', async (_, data: any) => {
    try {
      return await packingService.create(data)
    } catch (error) {
      console.error('Create packing error:', error)
      throw error
    }
  })

  // Get packings by company
  ipcMain.handle('packing:listByCompany', async (_, companyId: string) => {
    try {
      return await packingService.listByCompany(companyId)
    } catch (error) {
      console.error('Get packings by company error:', error)
      throw error
    }
  })

  // Get single packing
  ipcMain.handle('packing:get', async (_, id: string) => {
    try {
      return await packingService.get(id)
    } catch (error) {
      console.error('Get packing error:', error)
      throw error
    }
  })

  // Update packing
  ipcMain.handle('packing:update', async (_, id: string, data: any) => {
    try {
      return await packingService.update(id, data)
    } catch (error) {
      console.error('Update packing error:', error)
      throw error
    }
  })

  // Delete packing
  ipcMain.handle('packing:delete', async (_, id: string) => {
    try {
      await packingService.delete(id)
      return { success: true }
    } catch (error) {
      console.error('Delete packing error:', error)
      throw error
    }
  })

  // Bulk delete packings
  ipcMain.handle('packing:bulkDelete', async (_, ids: string[]) => {
    try {
      const deletedCount = await packingService.bulkDelete(ids)
      return { success: true, deletedCount }
    } catch (error) {
      console.error('Bulk delete packings error:', error)
      throw error
    }
  })

  // ========================
  // Phase 9.2: Store IPC Handlers
  // ========================

  // Create new store
  ipcMain.handle('store:create', async (_, data: any) => {
    try {
      return await storeService.create(data)
    } catch (error) {
      console.error('Create store error:', error)
      throw error
    }
  })

  // Get stores by company
  ipcMain.handle('store:listByCompany', async (_, companyId: string) => {
    try {
      return await storeService.listByCompany(companyId)
    } catch (error) {
      console.error('Get stores by company error:', error)
      throw error
    }
  })

  // Get single store
  ipcMain.handle('store:get', async (_, id: string) => {
    try {
      return await storeService.get(id)
    } catch (error) {
      console.error('Get store error:', error)
      throw error
    }
  })

  // Update store
  ipcMain.handle('store:update', async (_, id: string, data: any) => {
    try {
      return await storeService.update(id, data)
    } catch (error) {
      console.error('Update store error:', error)
      throw error
    }
  })

  // Delete store
  ipcMain.handle('store:delete', async (_, id: string) => {
    try {
      await storeService.delete(id)
      return { success: true }
    } catch (error) {
      console.error('Delete store error:', error)
      throw error
    }
  })

  // Bulk delete stores
  ipcMain.handle('store:bulkDelete', async (_, ids: string[]) => {
    try {
      const deletedCount = await storeService.bulkDelete(ids)
      return { success: true, deletedCount }
    } catch (error) {
      console.error('Bulk delete stores error:', error)
      throw error
    }
  })

  // ========================
  // ===== Quick Sale IPC Handlers (Phase 10.2) =====
  
  // Create Quick Sale
  ipcMain.handle('quickSale:create', async (_, data: any) => {
    try {
      return await quickSaleService.createQuickSale(data)
    } catch (error) {
      console.error('Create Quick Sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // List Quick Sales by company
  ipcMain.handle('quickSale:listByCompany', async (_, companyId: string) => {
    try {
      return await quickSaleService.getQuickSalesByCompany(companyId)
    } catch (error) {
      console.error('List Quick Sales error:', error)
      return { success: false, error: String(error) }
    }
  })

  // List Quick Sales by date range
  ipcMain.handle('quickSale:listByDateRange', async (_, companyId: string, startDate: string, endDate: string) => {
    try {
      return await quickSaleService.getQuickSalesByDateRange(companyId, startDate, endDate)
    } catch (error) {
      console.error('List Quick Sales by date range error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get Quick Sale by ID
  ipcMain.handle('quickSale:get', async (_, id: string) => {
    try {
      return await quickSaleService.getQuickSaleById(id)
    } catch (error) {
      console.error('Get Quick Sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Update Quick Sale
  ipcMain.handle('quickSale:update', async (_, id: string, data: any) => {
    try {
      return await quickSaleService.updateQuickSale(id, data)
    } catch (error) {
      console.error('Update Quick Sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete Quick Sale
  ipcMain.handle('quickSale:delete', async (_, id: string) => {
    try {
      return await quickSaleService.deleteQuickSale(id)
    } catch (error) {
      console.error('Delete Quick Sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Bulk delete Quick Sales
  ipcMain.handle('quickSale:bulkDelete', async (_, ids: string[]) => {
    try {
      return await quickSaleService.bulkDeleteQuickSales(ids)
    } catch (error) {
      console.error('Bulk delete Quick Sales error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Phase 18: Quick Receipt IPC handlers
  // Create Quick Receipt
  ipcMain.handle('quickReceipt:create', async (_, data: any) => {
    try {
      return await quickReceiptService.createQuickReceipt(data)
    } catch (error) {
      console.error('Create Quick Receipt error:', error)
      return { success: false, error: String(error) }
    }
  })

  // List Quick Receipts by company
  ipcMain.handle('quickReceipt:listByCompany', async (_, companyId: string) => {
    try {
      return await quickReceiptService.listByCompany(companyId)
    } catch (error) {
      console.error('List Quick Receipts error:', error)
      return { success: false, error: String(error) }
    }
  })

  // List Quick Receipts by date range
  ipcMain.handle('quickReceipt:listByDateRange', async (_, companyId: string, startDate: string, endDate: string) => {
    try {
      return await quickReceiptService.listByDateRange(companyId, startDate, endDate)
    } catch (error) {
      console.error('List Quick Receipts by date range error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get Quick Receipt by ID
  ipcMain.handle('quickReceipt:get', async (_, id: string) => {
    try {
      return await quickReceiptService.get(id)
    } catch (error) {
      console.error('Get Quick Receipt error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Update Quick Receipt
  ipcMain.handle('quickReceipt:update', async (_, id: string, data: any) => {
    try {
      return await quickReceiptService.update(id, data)
    } catch (error) {
      console.error('Update Quick Receipt error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete Quick Receipt
  ipcMain.handle('quickReceipt:delete', async (_, id: string) => {
    try {
      return await quickReceiptService.delete(id)
    } catch (error) {
      console.error('Delete Quick Receipt error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete multiple Quick Receipts
  ipcMain.handle('quickReceipt:deleteMany', async (_, ids: string[]) => {
    try {
      return await quickReceiptService.deleteMany(ids)
    } catch (error) {
      console.error('Delete many Quick Receipts error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Phase 18.3: Quick Payment IPC handlers
  // Create Quick Payment
  ipcMain.handle('quickPayment:create', async (_, data: any) => {
    try {
      return await quickPaymentService.createQuickPayment(data)
    } catch (error) {
      console.error('Create Quick Payment error:', error)
      return { success: false, error: String(error) }
    }
  })

  // List Quick Payments by company
  ipcMain.handle('quickPayment:listByCompany', async (_, companyId: string) => {
    try {
      return await quickPaymentService.listByCompany(companyId)
    } catch (error) {
      console.error('List Quick Payments error:', error)
      return { success: false, error: String(error) }
    }
  })

  // List Quick Payments by date range
  ipcMain.handle('quickPayment:listByDateRange', async (_, companyId: string, startDate: string, endDate: string) => {
    try {
      return await quickPaymentService.listByDateRange(companyId, startDate, endDate)
    } catch (error) {
      console.error('List Quick Payments by date range error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get Quick Payment by ID
  ipcMain.handle('quickPayment:get', async (_, id: string) => {
    try {
      return await quickPaymentService.get(id)
    } catch (error) {
      console.error('Get Quick Payment error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Update Quick Payment
  ipcMain.handle('quickPayment:update', async (_, id: string, data: any) => {
    try {
      return await quickPaymentService.update(id, data)
    } catch (error) {
      console.error('Update Quick Payment error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete Quick Payment
  ipcMain.handle('quickPayment:delete', async (_, id: string) => {
    try {
      return await quickPaymentService.delete(id)
    } catch (error) {
      console.error('Delete Quick Payment error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete multiple Quick Payments
  ipcMain.handle('quickPayment:deleteMany', async (_, ids: string[]) => {
    try {
      return await quickPaymentService.deleteMany(ids)
    } catch (error) {
      console.error('Delete many Quick Payments error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Phase 18.5: Account Ledger IPC handlers
  // Get or create ledger for an account
  ipcMain.handle('accountLedger:getOrCreate', async (_, companyId: string, accountId: string) => {
    try {
      const ledger = await accountLedgerService.getOrCreateLedger(companyId, accountId)
      return { success: true, data: ledger }
    } catch (error) {
      console.error('Get or create account ledger error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get ledger for an account
  ipcMain.handle('accountLedger:get', async (_, companyId: string, accountId: string) => {
    try {
      return await accountLedgerService.getLedger(companyId, accountId)
    } catch (error) {
      console.error('Get account ledger error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get ledger by ID
  ipcMain.handle('accountLedger:getById', async (_, id: string) => {
    try {
      return await accountLedgerService.getLedgerById(id)
    } catch (error) {
      console.error('Get account ledger by ID error:', error)
      return { success: false, error: String(error) }
    }
  })

  // List all ledgers for a company
  ipcMain.handle('accountLedger:list', async (_, companyId: string, filters?: { accountId?: string; hasBalance?: boolean }) => {
    try {
      return await accountLedgerService.listLedgers(companyId, filters)
    } catch (error) {
      console.error('List account ledgers error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get ledger items with filters
  ipcMain.handle('accountLedger:getItems', async (_, companyId: string, accountId: string, filters?: { startDate?: string; endDate?: string; type?: string }) => {
    try {
      return await accountLedgerService.getLedgerItems(companyId, accountId, filters)
    } catch (error) {
      console.error('Get ledger items error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Add ledger entry
  ipcMain.handle('accountLedger:addEntry', async (_, companyId: string, accountId: string, entry: { type: string; vchNo: string; name: string; particulars: string; debit: number; credit: number }) => {
    try {
      return await accountLedgerService.addLedgerEntry(companyId, accountId, entry)
    } catch (error) {
      console.error('Add ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Reverse ledger entry
  ipcMain.handle('accountLedger:reverseEntry', async (_, companyId: string, accountId: string, vchNo: string, type: string) => {
    try {
      return await accountLedgerService.reverseLedgerEntry(companyId, accountId, vchNo, type)
    } catch (error) {
      console.error('Reverse ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Record specific transaction types
  ipcMain.handle('accountLedger:recordQuickSale', async (_, companyId: string, accountId: string, vchNo: string, totalAmount: number, itemsSummary: string) => {
    try {
      return await accountLedgerService.recordQuickSale(companyId, accountId, vchNo, totalAmount, itemsSummary)
    } catch (error) {
      console.error('Record quick sale ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:recordDailySale', async (_, companyId: string, accountId: string, vchNo: string, totalAmount: number, itemsSummary: string) => {
    try {
      return await accountLedgerService.recordDailySale(companyId, accountId, vchNo, totalAmount, itemsSummary)
    } catch (error) {
      console.error('Record daily sale ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:recordArrival', async (_, companyId: string, supplierId: string, vchNo: string, totalAmount: number, itemsSummary: string) => {
    try {
      return await accountLedgerService.recordArrival(companyId, supplierId, vchNo, totalAmount, itemsSummary)
    } catch (error) {
      console.error('Record arrival ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:recordQuickReceipt', async (_, companyId: string, accountId: string, receiptId: string, amount: number, paymentMode: string, remarks?: string) => {
    try {
      return await accountLedgerService.recordQuickReceipt(companyId, accountId, receiptId, amount, paymentMode, remarks)
    } catch (error) {
      console.error('Record quick receipt ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:recordQuickPayment', async (_, companyId: string, accountId: string, paymentId: string, amount: number, paymentMode: string, remarks?: string) => {
    try {
      return await accountLedgerService.recordQuickPayment(companyId, accountId, paymentId, amount, paymentMode, remarks)
    } catch (error) {
      console.error('Record quick payment ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:recordStockSale', async (_, companyId: string, customerId: string, vchNo: string, totalAmount: number, itemsSummary: string) => {
    try {
      return await accountLedgerService.recordStockSale(companyId, customerId, vchNo, totalAmount, itemsSummary)
    } catch (error) {
      console.error('Record stock sale ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:recordSellerBill', async (_, companyId: string, sellerId: string, vchNo: string, totalAmount: number, itemsSummary: string) => {
    try {
      return await accountLedgerService.recordSellerBill(companyId, sellerId, vchNo, totalAmount, itemsSummary)
    } catch (error) {
      console.error('Record seller bill ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:recordStockTransfer', async (_, companyId: string, accountId: string, vchNo: string, totalAmount: number, itemsSummary: string) => {
    try {
      return await accountLedgerService.recordStockTransfer(companyId, accountId, vchNo, totalAmount, itemsSummary)
    } catch (error) {
      console.error('Record stock transfer ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:recordStockWattak', async (_, companyId: string, partyId: string, vchNo: string, totalAmount: number, itemsSummary: string) => {
    try {
      return await accountLedgerService.recordStockWattak(companyId, partyId, vchNo, totalAmount, itemsSummary)
    } catch (error) {
      console.error('Record stock wattak ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:recordCrateIssue', async (_, companyId: string, accountId: string, vchNo: string, crateQty: number, crateName: string) => {
    try {
      return await accountLedgerService.recordCrateIssue(companyId, accountId, vchNo, crateQty, crateName)
    } catch (error) {
      console.error('Record crate issue ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:recordCrateReceive', async (_, companyId: string, accountId: string, vchNo: string, crateQty: number, crateName: string) => {
    try {
      return await accountLedgerService.recordCrateReceive(companyId, accountId, vchNo, crateQty, crateName)
    } catch (error) {
      console.error('Record crate receive ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Reverse ledger entries for specific transaction types
  ipcMain.handle('accountLedger:reverseQuickSale', async (_, companyId: string, accountId: string, vchNo: string) => {
    try {
      return await accountLedgerService.reverseQuickSale(companyId, accountId, vchNo)
    } catch (error) {
      console.error('Reverse quick sale ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:reverseDailySale', async (_, companyId: string, accountId: string, vchNo: string) => {
    try {
      return await accountLedgerService.reverseDailySale(companyId, accountId, vchNo)
    } catch (error) {
      console.error('Reverse daily sale ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:reverseStockSale', async (_, companyId: string, accountId: string, vchNo: string) => {
    try {
      return await accountLedgerService.reverseStockSale(companyId, accountId, vchNo)
    } catch (error) {
      console.error('Reverse stock sale ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:reverseArrival', async (_, companyId: string, accountId: string, vchNo: string) => {
    try {
      return await accountLedgerService.reverseArrival(companyId, accountId, vchNo)
    } catch (error) {
      console.error('Reverse arrival ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:reverseSellerBill', async (_, companyId: string, accountId: string, vchNo: string) => {
    try {
      return await accountLedgerService.reverseSellerBill(companyId, accountId, vchNo)
    } catch (error) {
      console.error('Reverse seller bill ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:reverseStockTransfer', async (_, companyId: string, accountId: string, vchNo: string) => {
    try {
      return await accountLedgerService.reverseStockTransfer(companyId, accountId, vchNo)
    } catch (error) {
      console.error('Reverse stock transfer ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:reverseStockWattak', async (_, companyId: string, accountId: string, vchNo: string) => {
    try {
      return await accountLedgerService.reverseStockWattak(companyId, accountId, vchNo)
    } catch (error) {
      console.error('Reverse stock wattak ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:reverseQuickReceipt', async (_, companyId: string, accountId: string, receiptId: string) => {
    try {
      return await accountLedgerService.reverseQuickReceipt(companyId, accountId, receiptId)
    } catch (error) {
      console.error('Reverse quick receipt ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('accountLedger:reverseQuickPayment', async (_, companyId: string, accountId: string, paymentId: string) => {
    try {
      return await accountLedgerService.reverseQuickPayment(companyId, accountId, paymentId)
    } catch (error) {
      console.error('Reverse quick payment ledger entry error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get next Quick Sale voucher number
  ipcMain.handle('quickSale:getNextVoucherNo', async (_, companyId: string, saleDate: string) => {
    try {
      return await quickSaleService.getNextVoucherNumber(companyId, saleDate)
    } catch (error) {
      console.error('Get Quick Sale voucher number error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // ===== Daily Sale Voucher IPC Handlers (Phase 12.4) =====
  
  // Create voucher
  ipcMain.handle('voucher:create', async (_, data: any) => {
    try {
      return await voucherService.createVoucher(data)
    } catch (error) {
      console.error('Create voucher error:', error)
      return { success: false, error: String(error) }
    }
  })

  // List vouchers by company
  ipcMain.handle('voucher:listByCompany', async (_, companyId: string) => {
    try {
      return await voucherService.getVouchersByCompany(companyId)
    } catch (error) {
      console.error('List vouchers error:', error)
      return { success: false, error: String(error) }
    }
  })

  // List vouchers by date range
  ipcMain.handle('voucher:listByDateRange', async (_, companyId: string, startDate: string, endDate: string) => {
    try {
      return await voucherService.getVouchersByDateRange(companyId, startDate, endDate)
    } catch (error) {
      console.error('List vouchers by date range error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get voucher by ID
  ipcMain.handle('voucher:get', async (_, id: string) => {
    try {
      return await voucherService.getVoucherById(id)
    } catch (error) {
      console.error('Get voucher error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Update voucher
  ipcMain.handle('voucher:update', async (_, id: string, data: any) => {
    try {
      return await voucherService.updateVoucher(id, data)
    } catch (error) {
      console.error('Update voucher error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete voucher
  ipcMain.handle('voucher:delete', async (_, id: string) => {
    try {
      return await voucherService.deleteVoucher(id)
    } catch (error) {
      console.error('Delete voucher error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Bulk delete vouchers
  ipcMain.handle('voucher:bulkDelete', async (_, ids: string[]) => {
    try {
      return await voucherService.bulkDeleteVouchers(ids)
    } catch (error) {
      console.error('Bulk delete vouchers error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // Phase 13.5: Crate Issue IPC Handlers
  // ========================

  // Create new crate issue
  ipcMain.handle('crateIssue:create', async (_, data: any) => {
    try {
      return await crateIssueService.createCrateIssue(data)
    } catch (error) {
      console.error('Create crate issue error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get crate issues by company
  ipcMain.handle('crateIssue:listByCompany', async (_, companyId: string, options?: any) => {
    try {
      return await crateIssueService.getCrateIssuesByCompany(companyId, options)
    } catch (error) {
      console.error('Get crate issues by company error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get single crate issue
  ipcMain.handle('crateIssue:get', async (_, id: string) => {
    try {
      return await crateIssueService.getCrateIssueById(id)
    } catch (error) {
      console.error('Get crate issue error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Update crate issue
  ipcMain.handle('crateIssue:update', async (_, id: string, data: any) => {
    try {
      return await crateIssueService.updateCrateIssue(id, data)
    } catch (error) {
      console.error('Update crate issue error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete crate issue
  ipcMain.handle('crateIssue:delete', async (_, id: string) => {
    try {
      return await crateIssueService.deleteCrateIssue(id)
    } catch (error) {
      console.error('Delete crate issue error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Bulk delete crate issues
  ipcMain.handle('crateIssue:bulkDelete', async (_, ids: string[]) => {
    try {
      return await crateIssueService.bulkDeleteCrateIssues(ids)
    } catch (error) {
      console.error('Bulk delete crate issues error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Phase 13.7: Sync crate issues from Quick Sale
  ipcMain.handle('crateIssue:syncFromQuickSale', async (_, companyId: string, saleDate: string, quickSaleId: string, items: any[]) => {
    try {
      return await crateIssueService.syncFromQuickSale(companyId, saleDate, quickSaleId, items)
    } catch (error) {
      console.error('Sync crate issues from Quick Sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Phase 13.7: Delete crate issues by Quick Sale
  ipcMain.handle('crateIssue:deleteByQuickSale', async (_, quickSaleItemIds: string[]) => {
    try {
      return await crateIssueService.deleteByQuickSale(quickSaleItemIds)
    } catch (error) {
      console.error('Delete crate issues by Quick Sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Phase 13.7: Sync crate issues from Daily Sale (Voucher)
  ipcMain.handle('crateIssue:syncFromDailySale', async (_, companyId: string, voucherDate: string, voucherNo: string, items: any[]) => {
    try {
      return await crateIssueService.syncFromDailySale(companyId, voucherDate, voucherNo, items)
    } catch (error) {
      console.error('Sync crate issues from Daily Sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Phase 13.7: Delete crate issues by Daily Sale (Voucher)
  ipcMain.handle('crateIssue:deleteByDailySale', async (_, voucherItemIds: string[]) => {
    try {
      return await crateIssueService.deleteByDailySale(voucherItemIds)
    } catch (error) {
      console.error('Delete crate issues by Daily Sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // Phase 13.5: Crate Receive IPC Handlers
  // ========================

  // Create new crate receive
  ipcMain.handle('crateReceive:create', async (_, data: any) => {
    try {
      return await crateReceiveService.createCrateReceive(data)
    } catch (error) {
      console.error('Create crate receive error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get crate receives by company
  ipcMain.handle('crateReceive:listByCompany', async (_, companyId: string, options?: any) => {
    try {
      return await crateReceiveService.getCrateReceivesByCompany(companyId, options)
    } catch (error) {
      console.error('Get crate receives by company error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get single crate receive
  ipcMain.handle('crateReceive:get', async (_, id: string) => {
    try {
      return await crateReceiveService.getCrateReceiveById(id)
    } catch (error) {
      console.error('Get crate receive error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Update crate receive
  ipcMain.handle('crateReceive:update', async (_, id: string, data: any) => {
    try {
      return await crateReceiveService.updateCrateReceive(id, data)
    } catch (error) {
      console.error('Update crate receive error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete crate receive
  ipcMain.handle('crateReceive:delete', async (_, id: string) => {
    try {
      return await crateReceiveService.deleteCrateReceive(id)
    } catch (error) {
      console.error('Delete crate receive error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Bulk delete crate receives
  ipcMain.handle('crateReceive:bulkDelete', async (_, ids: string[]) => {
    try {
      return await crateReceiveService.bulkDeleteCrateReceives(ids)
    } catch (error) {
      console.error('Bulk delete crate receives error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // Phase 14.6: Arrival IPC Handlers
  // ========================

  // Create new arrival
  ipcMain.handle('arrival:create', async (_, companyId: string, data: any) => {
    try {
      return await arrivalService.createArrival(companyId, data)
    } catch (error) {
      console.error('Create arrival error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Update arrival
  ipcMain.handle('arrival:update', async (_, id: string, data: any) => {
    try {
      return await arrivalService.updateArrival(id, data)
    } catch (error) {
      console.error('Update arrival error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get arrivals by filters (date range, status, etc.)
  ipcMain.handle('arrival:list', async (_, companyId: string, filters?: any) => {
    try {
      return await arrivalService.getArrivalsByFilters(companyId, filters)
    } catch (error) {
      console.error('Get arrivals error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get single arrival
  ipcMain.handle('arrival:get', async (_, id: string) => {
    try {
      return await arrivalService.getArrivalById(id)
    } catch (error) {
      console.error('Get arrival error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete arrival
  ipcMain.handle('arrival:delete', async (_, id: string) => {
    try {
      return await arrivalService.deleteArrival(id)
    } catch (error) {
      console.error('Delete arrival error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Bulk delete arrivals
  ipcMain.handle('arrival:bulkDelete', async (_, ids: string[]) => {
    try {
      return await arrivalService.bulkDeleteArrivals(ids)
    } catch (error) {
      console.error('Bulk delete arrivals error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get next voucher number
  ipcMain.handle('arrival:getNextVoucherNo', async (_, companyId: string) => {
    try {
      const voucherNo = await arrivalService.generateVoucherNumber(companyId)
      return { success: true, data: voucherNo }
    } catch (error) {
      console.error('Get next arrival voucher no error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // Phase 15.4: Stock Sale IPC Handlers
  // ========================

  // Create new stock sale
  ipcMain.handle('stockSale:create', async (_, companyId: string, data: any) => {
    try {
      return await stockSaleService.createStockSale(companyId, data)
    } catch (error) {
      console.error('Create stock sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Update stock sale
  ipcMain.handle('stockSale:update', async (_, id: string, data: any) => {
    try {
      return await stockSaleService.updateStockSale(id, data)
    } catch (error) {
      console.error('Update stock sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get stock sales by filters (date range, etc.)
  ipcMain.handle('stockSale:list', async (_, companyId: string, filters?: any) => {
    try {
      return await stockSaleService.getStockSalesByFilters(companyId, filters)
    } catch (error) {
      console.error('Get stock sales error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get single stock sale
  ipcMain.handle('stockSale:get', async (_, id: string) => {
    try {
      return await stockSaleService.getStockSaleById(id)
    } catch (error) {
      console.error('Get stock sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Delete stock sale
  ipcMain.handle('stockSale:delete', async (_, id: string) => {
    try {
      return await stockSaleService.deleteStockSale(id)
    } catch (error) {
      console.error('Delete stock sale error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Bulk delete stock sales
  ipcMain.handle('stockSale:bulkDelete', async (_, ids: string[]) => {
    try {
      return await stockSaleService.bulkDeleteStockSales(ids)
    } catch (error) {
      console.error('Bulk delete stock sales error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockSale:getNextVoucherNo', async (_, companyId: string, saleDate: string) => {
    try {
      return await stockSaleService.getNextVoucherNumber(companyId, saleDate)
    } catch (error) {
      console.error('Get stock sale voucher number error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // Phase 16.3: Seller Bill IPC Handlers
  // ========================

  ipcMain.handle('sellerBill:list', async (_, companyId: string, filters?: any) => {
    try {
      return await sellerBillService.getSellerBillsByFilters(companyId, filters)
    } catch (error) {
      console.error('Get seller bills error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('sellerBill:get', async (_, id: string) => {
    try {
      return await sellerBillService.getSellerBillById(id)
    } catch (error) {
      console.error('Get seller bill error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('sellerBill:create', async (_, companyId: string, data: any) => {
    try {
      return await sellerBillService.createSellerBill(companyId, data)
    } catch (error) {
      console.error('Create seller bill error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('sellerBill:update', async (_, id: string, data: any) => {
    try {
      return await sellerBillService.updateSellerBill(id, data)
    } catch (error) {
      console.error('Update seller bill error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('sellerBill:delete', async (_, id: string) => {
    try {
      return await sellerBillService.deleteSellerBill(id)
    } catch (error) {
      console.error('Delete seller bill error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('sellerBill:getNextVoucherNo', async (_, companyId: string) => {
    try {
      const voucherNo = await sellerBillService.generateVoucherNumber(companyId)
      return { success: true, data: voucherNo }
    } catch (error) {
      console.error('Get seller bill voucher error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('sellerBill:listVehicles', async (_, companyId: string) => {
    try {
      return await sellerBillService.listVehicles(companyId)
    } catch (error) {
      console.error('List seller bill vehicles error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'sellerBill:listSoldItems',
    async (_, companyId: string, params: { supplierId: string; vehicleRef?: string | null }) => {
      try {
        return await sellerBillService.listSoldItems(companyId, params)
      } catch (error) {
        console.error('List seller bill sold items error:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('sellerBill:listEligibleSuppliers', async (_, companyId: string) => {
    try {
      return await sellerBillService.listEligibleSuppliers(companyId)
    } catch (error) {
      console.error('List seller bill eligible suppliers error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'sellerBill:listVehiclesBySupplier',
    async (_, companyId: string, supplierId: string) => {
      try {
        return await sellerBillService.listVehiclesBySupplier(companyId, supplierId)
      } catch (error) {
        console.error('List seller bill vehicles by supplier error:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // ========================
  // Phase 17.2: Stock Transfer IPC Handlers
  // ========================

  ipcMain.handle('stockTransfer:list', async (_, companyId: string, filters?: any) => {
    try {
      return await stockTransferService.listStockTransfers(companyId, filters)
    } catch (error) {
      console.error('Get stock transfers error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockTransfer:get', async (_, id: string) => {
    try {
      return await stockTransferService.getStockTransferById(id)
    } catch (error) {
      console.error('Get stock transfer error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockTransfer:create', async (_, companyId: string, data: any) => {
    try {
      return await stockTransferService.createStockTransfer(companyId, data)
    } catch (error) {
      console.error('Create stock transfer error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockTransfer:update', async (_, id: string, data: any) => {
    try {
      return await stockTransferService.updateStockTransfer(id, data)
    } catch (error) {
      console.error('Update stock transfer error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockTransfer:delete', async (_, id: string) => {
    try {
      return await stockTransferService.deleteStockTransfer(id)
    } catch (error) {
      console.error('Delete stock transfer error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockTransfer:getNextVoucherNo', async (_, companyId: string) => {
    try {
      return await stockTransferService.getNextVoucherNumber(companyId)
    } catch (error) {
      console.error('Get stock transfer voucher no error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // Phase 17.6: Stock Wattak IPC Handlers
  // ========================

  ipcMain.handle('stockWattak:list', async (_, companyId: string, filters?: any) => {
    try {
      return await stockWattakService.listStockWattaks(companyId, filters)
    } catch (error) {
      console.error('Get stock wattaks error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockWattak:get', async (_, id: string) => {
    try {
      return await stockWattakService.getStockWattakById(id)
    } catch (error) {
      console.error('Get stock wattak error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockWattak:create', async (_, companyId: string, data: any) => {
    try {
      return await stockWattakService.createStockWattak(companyId, data)
    } catch (error) {
      console.error('Create stock wattak error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockWattak:update', async (_, id: string, data: any) => {
    try {
      return await stockWattakService.updateStockWattak(id, data)
    } catch (error) {
      console.error('Update stock wattak error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockWattak:delete', async (_, id: string) => {
    try {
      return await stockWattakService.deleteStockWattak(id)
    } catch (error) {
      console.error('Delete stock wattak error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockWattak:getNextVoucherNo', async (_, companyId: string) => {
    try {
      return await stockWattakService.getNextVoucherNumber(companyId)
    } catch (error) {
      console.error('Get stock wattak voucher no error:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('stockWattak:getAvailableTransfers', async (_, companyId: string, filters?: any) => {
    try {
      return await stockWattakService.getAvailableTransfers(companyId, filters)
    } catch (error) {
      console.error('Get available transfers for wattak error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // Party Reports
  // ========================

  ipcMain.handle(
    'reports:saleSummaryCustomerBills',
    async (_, companyId: string, filters: SaleSummaryFilters) => {
      try {
        return await partyReportService.getSaleSummaryCustomerBills(companyId, filters)
      } catch (error) {
        console.error('Sale summary customer bills report error:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    'reports:pendingSellerBills',
    async (
      _,
      companyId: string,
      filters?: {
        startDate?: string
        endDate?: string
        supplierId?: string
        storeId?: string | null
        status?: 'sold' | 'unsold'
        search?: string
      }
    ) => {
      try {
        return await sellerBillService.listPendingSellerBills(companyId, filters)
      } catch (error) {
        console.error('Pending seller bills report error:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    'reports:profitabilityReport',
    async (
      _,
      companyId: string,
      filters?: {
        startDate?: string
        endDate?: string
        supplierId?: string
        storeId?: string | null
        search?: string
      }
    ) => {
      try {
        return await sellerBillService.getProfitabilityReport(companyId, filters)
      } catch (error) {
        console.error('Profitability report error:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle(
    'reports:laddanProfitabilityReport',
    async (
      _,
      companyId: string,
      filters?: {
        startDate?: string
        endDate?: string
        accountId?: string
        search?: string
      }
    ) => {
      try {
        return await laddanProfitabilityService.getReport(companyId, filters)
      } catch (error) {
        console.error('Laddan profitability report error:', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // ========================
  // ===== Lot Stock IPC Handlers =====
  
  // Get lot-wise stock
  ipcMain.handle('lotStock:list', async (_, companyId: string, filters?: any) => {
    try {
      const result = await lotStockService.getLotStock(companyId, filters)
      return { success: true, data: result }
    } catch (error) {
      console.error('Get lot stock error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get available stock for supplier/item/store
  ipcMain.handle('lotStock:getAvailable', async (_, companyId: string, supplierId: string, itemId: string, storeId: string | null) => {
    try {
      const result = await lotStockService.getAvailableStock(companyId, supplierId, itemId, storeId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Get available stock error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get item stock summary
  ipcMain.handle('lotStock:summary', async (_, companyId: string, filters?: any) => {
    try {
      const result = await lotStockService.getItemStockSummary(companyId, filters)
      return { success: true, data: result }
    } catch (error) {
      console.error('Get item stock summary error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Get lots for item
  ipcMain.handle('lotStock:getLotsForItem', async (_, companyId: string, itemId: string, supplierId?: string, storeId?: string | null) => {
    try {
      const result = await lotStockService.getLotsForItem(companyId, itemId, supplierId, storeId)
      return { success: true, data: result }
    } catch (error) {
      console.error('Get lots for item error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // ===== Stock Ledger IPC Handlers =====
  
  // Get available stock with filters
  ipcMain.handle('stockLedger:getAvailable', async (_, companyId: string, filters?: {
    supplierId?: string
    itemId?: string
    storeId?: string
    lotNoVariety?: string
  }) => {
    try {
      const result = await StockLedgerService.getAvailableStock(companyId, filters)
      return { success: true, data: result }
    } catch (error) {
      console.error('Get available stock ledger error:', error)
      return { success: false, error: String(error) }
    }
  })

  // Initialize stock ledger from existing data
  ipcMain.handle('stockLedger:initialize', async (_, companyId: string) => {
    try {
      await StockLedgerService.initializeFromExistingData(companyId)
      return { success: true }
    } catch (error) {
      console.error('Initialize stock ledger error:', error)
      return { success: false, error: String(error) }
    }
  })

  // ========================
  // ===== Backup & Restore IPC Handlers =====
  
  // Create backup
  ipcMain.handle('backup:create', async (_, options?: { 
    companyId?: string
    location?: string
    password?: string
    archiveOld?: boolean
    format?: 'json' | 'sqlite'
  }) => {
    try {
      const result = await backupService.createBackup(options)
      return result
    } catch (error) {
      console.error('Create backup error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Restore from backup
  ipcMain.handle('backup:restore', async (_, filePath: string) => {
    try {
      const result = await backupService.restoreFromBackup(filePath)
      return result
    } catch (error) {
      console.error('Restore backup error:', error)
      return { success: false, message: String(error), recordsRestored: 0 }
    }
  })

  // List available backups
  ipcMain.handle('backup:list', async (_, location?: string) => {
    try {
      const backups = await backupService.listBackups(location)
      return { success: true, backups }
    } catch (error) {
      console.error('List backups error:', error)
      return { success: false, message: String(error), backups: [] }
    }
  })

  // Delete backup
  ipcMain.handle('backup:delete', async (_, filePath: string) => {
    try {
      const result = await backupService.deleteBackup(filePath)
      return result
    } catch (error) {
      console.error('Delete backup error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Select backup folder
  ipcMain.handle('backup:selectFolder', async () => {
    try {
      const result = await backupService.selectBackupFolder()
      return result
    } catch (error) {
      console.error('Select backup folder error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Select backup file for restore
  ipcMain.handle('backup:selectFile', async () => {
    try {
      const result = await backupService.selectBackupFile()
      return result
    } catch (error) {
      console.error('Select backup file error:', error)
      return { success: false, message: String(error) }
    }
  })

  // Get default backup folder
  ipcMain.handle('backup:getDefaultFolder', () => {
    try {
      const folder = backupService.getDefaultBackupFolder()
      return { success: true, path: folder }
    } catch (error) {
      console.error('Get default backup folder error:', error)
      return { success: false, message: String(error) }
    }
  })

  // TASK 1: Get default backup file path
  ipcMain.handle('backup:getDefaultBackupPath', () => {
    try {
      const path = backupService.getDefaultBackupPath()
      return { success: true, path }
    } catch (error) {
      console.error('Get default backup path error:', error)
      return { success: false, message: String(error) }
    }
  })

  // TASK 3: Get last backup information
  ipcMain.handle('backup:getLastBackupInfo', async () => {
    try {
      const dbService = DatabaseService.getInstance()
      const client = await dbService.getClient()
      
      // First try to get from backup tracking table
      const lastBackup = await client.backupTracking.findFirst({
        where: { status: 'completed' },
        orderBy: { backupTimestamp: 'desc' },
        select: { backupTimestamp: true }
      })
      
      if (lastBackup) {
        console.log('[Backup] Found last backup from tracking:', lastBackup.backupTimestamp)
        return { success: true, lastBackup: lastBackup.backupTimestamp.toISOString() }
      }
      
      // Fallback: Check actual backup files if no tracking record exists
      console.log('[Backup] No tracking record found, checking actual backup files')
      const backups = await backupService.listBackups()
      if (backups && backups.length > 0) {
        // Get the most recent backup file
        const mostRecent = backups.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0]
        console.log('[Backup] Found most recent backup file:', mostRecent.date)
        return { success: true, lastBackup: new Date(mostRecent.date).toISOString() }
      }
      
      console.log('[Backup] No backups found at all')
      return { success: true, lastBackup: null }
    } catch (error) {
      console.error('Get last backup info error:', error)
      return { success: false, message: String(error) }
    }
  })

  createWindow()

  // Check for updates automatically on app start (production only, if online)
  setTimeout(async () => {
    // Check network connectivity first
    try {
      const dns = await import('dns')
      const isOnline = await new Promise<boolean>((resolve) => {
        dns.resolve('www.google.com', (err) => {
          resolve(!err)
        })
      })
      
      if (isOnline) {
        console.log('[Startup] Network is online - checking for updates')
        updaterService.checkForUpdates()
      } else {
        console.log('[Startup] Network is offline - skipping update check')
      }
    } catch (error) {
      console.log('[Startup] Failed to check network connectivity - skipping update check:', error)
    }
  }, 3000) // Wait 3 seconds after app start

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  dbService.disconnect()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle app before-quit event for sync on app close
app.on('before-quit', async () => {
  // Check if sync on app close is enabled
  try {
    const userData = await licenseManager.getUserData()
    if (userData?.token && userData?.user?.id) {
      // Note: Preferences would need to be loaded from DB or passed from renderer
      // For now, we'll skip this and let the renderer handle it via IPC
      console.log('App closing - sync service cleaned up')
    }
  } catch (error) {
    console.error('Error during app close:', error)
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
