import DatabaseService from './database'
import { app, dialog } from 'electron'
import { join, basename } from 'path'
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync } from 'fs'
import initSqlJs from 'sql.js'

interface RestoreResult {
  success: boolean
  message: string
  recordsRestored: number
  errors?: string[]
}

class BackupService {
  private static instance: BackupService
  private dbService: DatabaseService
  private defaultBackupFolder: string

  private constructor() {
    this.dbService = DatabaseService.getInstance()
    
    // Set default backup folder
    const userDataPath = app.getPath('userData')
    this.defaultBackupFolder = join(userDataPath, 'backups')
    
    // Ensure backup folder exists
    if (!existsSync(this.defaultBackupFolder)) {
      mkdirSync(this.defaultBackupFolder, { recursive: true })
    }
  }

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService()
    }
    return BackupService.instance
  }

  /**
   * Get per-table counts from last backup
   * Phase 14.8 - Added otherChargesHeads, arrivals, arrivalItems, arrivalCharges
   */
  private async getLastBackupCounts(companyId?: string): Promise<{
    companies: number
    accountGroups: number
    accounts: number
    items: number
    crateMarkas: number
    arrivalTypes: number
    packings: number
    stores: number
    quickSales: number
    quickSaleItems: number
    crateIssues: number
    crateIssueItems: number
    crateReceives: number
    crateReceiveItems: number
    vouchers: number
    voucherItems: number
    voucherCharges: number
    // Phase 14.8 - Arrival tables
    otherChargesHeads: number
    arrivals: number
    arrivalItems: number
    arrivalCharges: number
    // Phase 15 - Stock sale tables
    stockSales: number
    stockSaleItems: number
    stockLedgers: number
    // Phase 16 - Seller bill tables
    sellerBills: number
    sellerBillItems: number
    sellerBillCharges: number
    // Phase 17 - Stock transfer and wattak tables
    stockTransfers: number
    stockTransferItems: number
    stockTransferCharges: number
    stockWattaks: number
    stockWattakItems: number
    stockWattakCharges: number
    stockTransferWattakLedgers: number
    // Phase 18.8 - Quick receipt, quick payment, and account ledger tables
    quickReceipts: number
    quickReceiptItems: number
    quickPayments: number
    quickPaymentItems: number
    accountLedgers: number
    accountLedgerItems: number
  } | null> {
    const client = await this.dbService.getClient()
    
    const lastBackup = await client.backupTracking.findFirst({
      where: {
        status: 'completed',
        ...(companyId ? { companyId } : {})
      },
      orderBy: { backupTimestamp: 'desc' }
    })

    if (!lastBackup) return null

    return {
      companies: lastBackup.companiesCount,
      accountGroups: lastBackup.accountGroupsCount,
      accounts: lastBackup.accountsCount,
      items: lastBackup.itemsCount,
      crateMarkas: lastBackup.crateMarkasCount || 0,
      arrivalTypes: lastBackup.arrivalTypesCount || 0,
      packings: lastBackup.packingsCount || 0,
      stores: lastBackup.storesCount || 0,
      quickSales: lastBackup.quickSalesCount || 0,
      quickSaleItems: lastBackup.quickSaleItemsCount || 0,
      crateIssues: (lastBackup as any).crateIssuesCount || 0,
      crateIssueItems: (lastBackup as any).crateIssueItemsCount || 0,
      crateReceives: (lastBackup as any).crateReceivesCount || 0,
      crateReceiveItems: (lastBackup as any).crateReceiveItemsCount || 0,
      vouchers: (lastBackup as any).vouchersCount || 0,
      voucherItems: (lastBackup as any).voucherItemsCount || 0,
      voucherCharges: (lastBackup as any).voucherChargesCount || 0,
      // Phase 14.8 - Arrival tables
      otherChargesHeads: (lastBackup as any).otherChargesHeadsCount || 0,
      arrivals: (lastBackup as any).arrivalsCount || 0,
      arrivalItems: (lastBackup as any).arrivalItemsCount || 0,
      arrivalCharges: (lastBackup as any).arrivalChargesCount || 0,
      // Phase 15 - Stock sale tables
      stockSales: (lastBackup as any).stockSalesCount || 0,
      stockSaleItems: (lastBackup as any).stockSaleItemsCount || 0,
      stockLedgers: (lastBackup as any).stockLedgersCount || 0,
      // Phase 16 - Seller bill tables
      sellerBills: (lastBackup as any).sellerBillsCount || 0,
      sellerBillItems: (lastBackup as any).sellerBillItemsCount || 0,
      sellerBillCharges: (lastBackup as any).sellerBillChargesCount || 0,
      // Phase 17 - Stock transfer and wattak tables
      stockTransfers: (lastBackup as any).stockTransfersCount || 0,
      stockTransferItems: (lastBackup as any).stockTransferItemsCount || 0,
      stockTransferCharges: (lastBackup as any).stockTransferChargesCount || 0,
      stockWattaks: (lastBackup as any).stockWattaksCount || 0,
      stockWattakItems: (lastBackup as any).stockWattakItemsCount || 0,
      stockWattakCharges: (lastBackup as any).stockWattakChargesCount || 0,
      stockTransferWattakLedgers: (lastBackup as any).stockTransferWattakLedgersCount || 0,
      // Phase 18.8 - Quick receipt, quick payment, and account ledger tables
      quickReceipts: (lastBackup as any).quickReceiptsCount || 0,
      quickReceiptItems: (lastBackup as any).quickReceiptItemsCount || 0,
      quickPayments: (lastBackup as any).quickPaymentsCount || 0,
      quickPaymentItems: (lastBackup as any).quickPaymentItemsCount || 0,
      accountLedgers: (lastBackup as any).accountLedgersCount || 0,
      accountLedgerItems: (lastBackup as any).accountLedgerItemsCount || 0
    }
  }

  /**
   * Create backup - SQLite format only
   * ISSUE 1: Only creates new backup if changes detected
   * ISSUE 2: Tracks changes per table for incremental backups
   * ISSUE 3: Creates backup without system tables
   */
  public async createBackup(options?: {
    companyId?: string
    location?: string
    password?: string
    archiveOld?: boolean
  }): Promise<{ success: boolean; filePath?: string; message?: string; recordsBackedUp?: number; hasChanges?: boolean }> {
    try {
      return await this.createSQLiteBackup(options)
    } catch (error) {
      console.error('[Backup] Error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Create SQLite backup with selective table export
   * ISSUE 1: Check for changes before creating backup
   * ISSUE 2: Track per-table changes
   * ISSUE 3: Backup excludes system tables (authSession, meta, backupTracking, updateInfo)
   * Phase 14.8: Added otherChargesHead, arrival, arrivalItem, arrivalCharges tables
   */
  private async createSQLiteBackup(options?: {
    companyId?: string
    location?: string
    password?: string
    archiveOld?: boolean
  }): Promise<{ success: boolean; filePath?: string; message?: string; recordsBackedUp?: number; hasChanges?: boolean }> {
    try {
      const backupFolder = options?.location || this.defaultBackupFolder
      
      // Ensure backup folder exists
      if (!existsSync(backupFolder)) {
        mkdirSync(backupFolder, { recursive: true })
      }

      const client = await this.dbService.getClient()
      
      // Get current counts for all user data tables
      const companyWhere = options?.companyId ? { where: { id: options.companyId } } : undefined
      const dataWhere = options?.companyId ? { where: { companyId: options.companyId } } : undefined
      const stockSaleItemWhere = options?.companyId
        ? { where: { stockSale: { companyId: options.companyId } } }
        : undefined

      const [
        companiesCount, accountGroupsCount, accountsCount, itemsCount, crateMarkasCount, 
        arrivalTypesCount, packingsCount, storesCount, quickSalesCount, quickSaleItemsCount,
        crateIssuesCount, crateIssueItemsCount, crateReceivesCount, crateReceiveItemsCount,
        vouchersCount, voucherItemsCount, voucherChargesCount,
        // Phase 14.8 - Arrival tables
        otherChargesHeadsCount, arrivalsCount, arrivalItemsCount, arrivalChargesCount,
        // Phase 15 - Stock sale tables
        stockSalesCount, stockSaleItemsCount, stockLedgersCount,
        // Phase 16 - Seller bill tables
        sellerBillsCount, sellerBillItemsCount, sellerBillChargesCount,
        // Phase 17 - Stock transfer and wattak tables
        stockTransfersCount, stockTransferItemsCount, stockTransferChargesCount,
        stockWattaksCount, stockWattakItemsCount, stockWattakChargesCount,
        stockTransferWattakLedgersCount,
        // Phase 18.8 - Quick receipt, quick payment, and account ledger tables
        quickReceiptsCount, quickReceiptItemsCount,
        quickPaymentsCount, quickPaymentItemsCount,
        accountLedgersCount, accountLedgerItemsCount
      ] = await Promise.all([
        client.company.count(companyWhere),
        client.accountGroup.count(dataWhere),
        client.account.count(dataWhere),
        client.item.count(dataWhere),
        client.crateMarka.count(dataWhere),
        client.arrivalType.count(dataWhere),
        client.packing.count(dataWhere),
        client.store.count(dataWhere),
        client.quickSale.count(dataWhere),
        client.quickSaleItem.count(),
        client.crateIssue.count(dataWhere),
        client.crateIssueItem.count(),
        client.crateReceive.count(dataWhere),
        client.crateReceiveItem.count(),
        client.voucher.count(dataWhere),
        client.voucherItem.count(),
        client.voucherCharge.count(),
        // Phase 14.8 - Arrival tables
        client.otherChargesHead.count(dataWhere),
        client.arrival.count(dataWhere),
        client.arrivalItem.count(),
        client.arrivalCharges.count(),
        // Phase 15 - Stock sale tables
        client.stockSale.count(dataWhere),
        client.stockSaleItem.count(stockSaleItemWhere),
        client.stockLedger.count(dataWhere),
        // Phase 16 - Seller bill tables
        client.sellerBill.count(dataWhere),
        client.sellerBillItem.count(),
        client.sellerBillCharge.count(),
        // Phase 17 - Stock transfer and wattak tables
        client.stockTransfer.count(dataWhere),
        client.stockTransferItem.count(),
        client.stockTransferCharge.count(),
        client.stockWattak.count(dataWhere),
        client.stockWattakItem.count(),
        client.stockWattakCharge.count(),
        client.stockTransferWattakLedger.count(dataWhere),
        // Phase 18.8 - Quick receipt, quick payment, and account ledger tables
        client.quickReceipt.count(dataWhere),
        client.quickReceiptItem.count(),
        client.quickPayment.count(dataWhere),
        client.quickPaymentItem.count(),
        client.accountLedger.count(dataWhere),
        client.accountLedgerItem.count()
      ])

      // ISSUE 1 & 2: Check if any table has changed since last backup
      const lastBackupCounts = await this.getLastBackupCounts(options?.companyId)
      
      if (lastBackupCounts) {
        const hasChanges = 
          companiesCount !== lastBackupCounts.companies ||
          accountGroupsCount !== lastBackupCounts.accountGroups ||
          accountsCount !== lastBackupCounts.accounts ||
          itemsCount !== lastBackupCounts.items ||
          crateMarkasCount !== lastBackupCounts.crateMarkas ||
          arrivalTypesCount !== lastBackupCounts.arrivalTypes ||
          packingsCount !== lastBackupCounts.packings ||
          storesCount !== lastBackupCounts.stores ||
          quickSalesCount !== lastBackupCounts.quickSales ||
          quickSaleItemsCount !== lastBackupCounts.quickSaleItems ||
          crateIssuesCount !== lastBackupCounts.crateIssues ||
          crateIssueItemsCount !== lastBackupCounts.crateIssueItems ||
          crateReceivesCount !== lastBackupCounts.crateReceives ||
          crateReceiveItemsCount !== lastBackupCounts.crateReceiveItems ||
          vouchersCount !== lastBackupCounts.vouchers ||
          voucherItemsCount !== lastBackupCounts.voucherItems ||
          voucherChargesCount !== lastBackupCounts.voucherCharges ||
          // Phase 14.8 - Arrival tables change detection
          otherChargesHeadsCount !== lastBackupCounts.otherChargesHeads ||
          arrivalsCount !== lastBackupCounts.arrivals ||
          arrivalItemsCount !== lastBackupCounts.arrivalItems ||
          arrivalChargesCount !== lastBackupCounts.arrivalCharges ||
          // Phase 15 - Stock sale tables change detection
          stockSalesCount !== lastBackupCounts.stockSales ||
          stockSaleItemsCount !== lastBackupCounts.stockSaleItems ||
          stockLedgersCount !== lastBackupCounts.stockLedgers ||
          // Phase 16 - Seller bill tables change detection
          sellerBillsCount !== lastBackupCounts.sellerBills ||
          sellerBillItemsCount !== lastBackupCounts.sellerBillItems ||
          sellerBillChargesCount !== lastBackupCounts.sellerBillCharges ||
          // Phase 17 - Stock transfer and wattak tables change detection
          stockTransfersCount !== lastBackupCounts.stockTransfers ||
          stockTransferItemsCount !== lastBackupCounts.stockTransferItems ||
          stockTransferChargesCount !== lastBackupCounts.stockTransferCharges ||
          stockWattaksCount !== lastBackupCounts.stockWattaks ||
          stockWattakItemsCount !== lastBackupCounts.stockWattakItems ||
          stockWattakChargesCount !== lastBackupCounts.stockWattakCharges ||
          stockTransferWattakLedgersCount !== lastBackupCounts.stockTransferWattakLedgers ||
          // Phase 18.8 - Quick receipt, quick payment, and account ledger tables change detection
          quickReceiptsCount !== lastBackupCounts.quickReceipts ||
          quickReceiptItemsCount !== lastBackupCounts.quickReceiptItems ||
          quickPaymentsCount !== lastBackupCounts.quickPayments ||
          quickPaymentItemsCount !== lastBackupCounts.quickPaymentItems ||
          accountLedgersCount !== lastBackupCounts.accountLedgers ||
          accountLedgerItemsCount !== lastBackupCounts.accountLedgerItems

        if (!hasChanges) {
          console.log('[Backup] No changes detected since last backup')
          return {
            success: false,
            hasChanges: false,
            message: 'No changes detected since last backup'
          }
        }
      }

      // Use a default backup filename
      const defaultBackupFile = 'backup.db'
      const backupFilePath = join(backupFolder, defaultBackupFile)

      // Archive old backup if requested and exists
      if (options?.archiveOld && existsSync(backupFilePath)) {
        await this.archiveOldBackup(backupFilePath, backupFolder)
      }

      // Create selective backup (exclude AuthSession with license data)
      const dbPath = this.dbService.getDatabasePath()
      await this.createSelectiveBackup(dbPath, backupFilePath)

      // Get file size
      const stats = statSync(backupFilePath)
      const fileSizeInBytes = stats.size
      const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2)

      const totalRecords = companiesCount + accountGroupsCount + accountsCount + itemsCount + 
        crateMarkasCount + quickSalesCount + quickSaleItemsCount + 
        crateIssuesCount + crateIssueItemsCount + crateReceivesCount + crateReceiveItemsCount +
        vouchersCount + voucherItemsCount + voucherChargesCount +
        // Phase 14.8 - Arrival tables
        otherChargesHeadsCount + arrivalsCount + arrivalItemsCount + arrivalChargesCount +
        // Phase 15 - Stock sale tables
        stockSalesCount + stockSaleItemsCount + stockLedgersCount +
        // Phase 16 - Seller bill tables
        sellerBillsCount + sellerBillItemsCount + sellerBillChargesCount +
        // Phase 17 - Stock transfer and wattak tables
        stockTransfersCount + stockTransferItemsCount + stockTransferChargesCount +
        stockWattaksCount + stockWattakItemsCount + stockWattakChargesCount +
        stockTransferWattakLedgersCount +
        // Phase 18.8 - Quick receipt, quick payment, and account ledger tables
        quickReceiptsCount + quickReceiptItemsCount +
        quickPaymentsCount + quickPaymentItemsCount +
        accountLedgersCount + accountLedgerItemsCount

      // Track this backup in database with per-table counts
      await client.backupTracking.create({
        data: {
          backupTimestamp: new Date(),
          backupFileName: defaultBackupFile,
          backupLocation: options?.location ? 'custom' : 'local',
          backupSize: `${fileSizeInMB} MB`,
          recordsBackedUp: totalRecords,
          companyId: options?.companyId || null,
          status: 'completed',
          companiesCount,
          accountGroupsCount,
          accountsCount,
          itemsCount,
          crateMarkasCount,
          arrivalTypesCount,
          packingsCount,
          storesCount,
          quickSalesCount,
          quickSaleItemsCount,
          crateIssuesCount,
          crateIssueItemsCount,
          crateReceivesCount,
          crateReceiveItemsCount,
          vouchersCount,
          voucherItemsCount,
          voucherChargesCount,
          // Phase 14.8 - Arrival tables
          otherChargesHeadsCount,
          arrivalsCount,
          arrivalItemsCount,
          arrivalChargesCount,
          // Phase 15 - Stock sale tables
          stockSalesCount,
          stockSaleItemsCount,
          stockLedgersCount,
          // Phase 16 - Seller bill tables
          sellerBillsCount,
          sellerBillItemsCount,
          sellerBillChargesCount,
          // Phase 17 - Stock transfer and wattak tables
          stockTransfersCount,
          stockTransferItemsCount,
          stockTransferChargesCount,
          stockWattaksCount,
          stockWattakItemsCount,
          stockWattakChargesCount,
          stockTransferWattakLedgersCount,
          // Phase 18.8 - Quick receipt, quick payment, and account ledger tables
          quickReceiptsCount,
          quickReceiptItemsCount,
          quickPaymentsCount,
          quickPaymentItemsCount,
          accountLedgersCount,
          accountLedgerItemsCount
        }
      })

      console.log(`[Backup] Created SQLite backup: ${defaultBackupFile} (${totalRecords} user records, ${fileSizeInMB} MB)`)
      console.log(`[Backup] Per-table counts: Companies=${companiesCount}, AccountGroups=${accountGroupsCount}, Accounts=${accountsCount}, Items=${itemsCount}, CrateMarkas=${crateMarkasCount}, ArrivalTypes=${arrivalTypesCount}, Packings=${packingsCount}, Stores=${storesCount}, QuickSales=${quickSalesCount}, QuickSaleItems=${quickSaleItemsCount}, CrateIssues=${crateIssuesCount}, CrateIssueItems=${crateIssueItemsCount}, CrateReceives=${crateReceivesCount}, CrateReceiveItems=${crateReceiveItemsCount}, Vouchers=${vouchersCount}, VoucherItems=${voucherItemsCount}, VoucherCharges=${voucherChargesCount}, OtherChargesHeads=${otherChargesHeadsCount}, Arrivals=${arrivalsCount}, ArrivalItems=${arrivalItemsCount}, ArrivalCharges=${arrivalChargesCount}, StockSales=${stockSalesCount}, StockSaleItems=${stockSaleItemsCount}, StockLedgers=${stockLedgersCount}, SellerBills=${sellerBillsCount}, SellerBillItems=${sellerBillItemsCount}, SellerBillCharges=${sellerBillChargesCount}, StockTransfers=${stockTransfersCount}, StockTransferItems=${stockTransferItemsCount}, StockTransferCharges=${stockTransferChargesCount}, StockWattaks=${stockWattaksCount}, StockWattakItems=${stockWattakItemsCount}, StockWattakCharges=${stockWattakChargesCount}, StockTransferWattakLedgers=${stockTransferWattakLedgersCount}, QuickReceipts=${quickReceiptsCount}, QuickReceiptItems=${quickReceiptItemsCount}, QuickPayments=${quickPaymentsCount}, QuickPaymentItems=${quickPaymentItemsCount}, AccountLedgers=${accountLedgersCount}, AccountLedgerItems=${accountLedgerItemsCount}`)

      return {
        success: true,
        hasChanges: true,
        filePath: backupFilePath,
        recordsBackedUp: totalRecords,
        message: `Backup created successfully with ${totalRecords} records`
      }
    } catch (error) {
      console.error('[Backup] Error creating SQLite backup:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Create selective backup with only user data tables
   * ISSUE 2: Excludes authSession, meta, backupTracking, updateInfo tables
    * Phase 14.8: Added other_charges_head, arrival, arrival_item, arrival_charges tables
    * Phase 15: Added stock_sale, stock_sale_item, stock_ledger tables
   */
  private async createSelectiveBackup(sourcePath: string, targetPath: string): Promise<void> {
    const SQL = await initSqlJs()
    
    // Read source database
    const sourceData = readFileSync(sourcePath)
    const sourceDb = new SQL.Database(sourceData)
    
    // Create new empty database
    const targetDb = new SQL.Database()

    try {
      // First, list all tables in source database for debugging
      const allTablesResult = sourceDb.exec(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      const allTables = allTablesResult.length > 0 ? allTablesResult[0].values.map(row => row[0]) : []
      console.log(`[Backup] All tables in source database: ${allTables.join(', ')}`)
      
      // User data tables to backup (must match exact case-sensitive table names in the database)
      // All tables use lowercase for consistency
      // Phase 14.8: Added other_charges_head, arrival, arrival_item, arrival_charges
      // Phase 15: Added stock_sale, stock_sale_item, stock_ledger
      // Phase 16: Added seller_bill, seller_bill_item, seller_bill_charge
      // Phase 17: Added stock_transfer, stock_transfer_item, stock_transfer_charge, stock_wattak, stock_wattak_item, stock_wattak_charge, stock_transfer_wattak_ledger
      // Phase 18.8: Added quick_receipt, quick_receipt_item, quick_payment, quick_payment_item, account_ledger, account_ledger_item
      const userTables = [
        'company', 'account_groups', 'accounts', 'items', 'crate_marka', 
        'arrival_type', 'packing', 'store', 'quick_sale', 'quick_sale_item',
        'crate_issue', 'crate_issue_item', 'crate_receive', 'crate_receive_item',
        'voucher', 'voucher_item', 'voucher_charge',
        'other_charges_head', 'arrival', 'arrival_item', 'arrival_charges',
        'stock_sale', 'stock_sale_item', 'stock_ledger',
        'seller_bill', 'seller_bill_item', 'seller_bill_charge',
        'stock_transfer', 'stock_transfer_item', 'stock_transfer_charge',
        'stock_wattak', 'stock_wattak_item', 'stock_wattak_charge',
        'stock_transfer_wattak_ledger',
        'quick_receipt', 'quick_receipt_item', 'quick_payment', 'quick_payment_item',
        'account_ledger', 'account_ledger_item'
      ]
      
      // Copy schema and data for each user table
      for (const table of userTables) {
        // Get table schema - use quotes for case-sensitive table names
        const schemaResult = sourceDb.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`)
        
        if (schemaResult.length > 0 && schemaResult[0].values.length > 0) {
          const schema = schemaResult[0].values[0][0] as string
          
          // Create table in target database
          targetDb.run(schema)
          
          // Get all data from source table - use double quotes for table names
          const dataResult = sourceDb.exec(`SELECT * FROM "${table}"`)
          
          if (dataResult.length > 0 && dataResult[0].values.length > 0) {
            const columns = dataResult[0].columns
            const rows = dataResult[0].values
            
            // Insert all rows - use double quotes for table and column names
            for (const row of rows) {
              const placeholders = columns.map(() => '?').join(', ')
              const quotedColumns = columns.map(col => `"${col}"`).join(', ')
              const insertSql = `INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders})`
              targetDb.run(insertSql, row)
            }
          }
          
          // Copy indexes for this table
          const indexResult = sourceDb.exec(
            `SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='${table}' AND sql IS NOT NULL`
          )
          
          if (indexResult.length > 0) {
            for (const indexRow of indexResult[0].values) {
              try {
                const indexSql = indexRow[0] as string
                targetDb.run(indexSql)
              } catch (err) {
                // Index might already exist, ignore
              }
            }
          }
        } else {
          console.log(`[Backup] Warning: Table '${table}' not found in source database`)
        }
      }
      
      // Verify what tables were actually created
      const verifyTables = targetDb.exec(`SELECT name FROM sqlite_master WHERE type='table'`)
      const createdTables = verifyTables.length > 0 ? verifyTables[0].values.map(row => row[0]) : []
      
      // Get counts per table in backup
      const backupCounts: Record<string, number> = {}
      for (const table of userTables) {
        try {
          const countResult = targetDb.exec(`SELECT COUNT(*) FROM "${table}"`)
          if (countResult.length > 0 && countResult[0].values.length > 0) {
            backupCounts[table] = countResult[0].values[0][0] as number
          }
        } catch (err) {
          backupCounts[table] = 0
        }
      }
      
      // Export the target database to file
      const data = targetDb.export()
      const buffer = Buffer.from(data)
      writeFileSync(targetPath, buffer)
      
      console.log(`[Backup] Created selective backup with only user data tables: ${userTables.join(', ')}`)
      console.log(`[Backup] Tables in backup file: ${createdTables.join(', ')}`)
      console.log(`[Backup] Records per table in backup: ${Object.entries(backupCounts).map(([t, c]) => `${t}=${c}`).join(', ')}`)
    } finally {
      sourceDb.close()
      targetDb.close()
    }
  }

  /**
   * Ensure system tables exist after restore
   * ISSUE 4 FIX: Recreate system tables if they don't exist
   * Phase 14.8: Added columns for arrival-related tables
   */
  private async ensureSystemTablesExist(client: any): Promise<void> {
    try {
      // Check if BackupTracking table exists
      const backupTrackingExists = await client.$queryRaw`
        SELECT name FROM sqlite_master WHERE type='table' AND name='backup_tracking'
      `
      
      if (!backupTrackingExists || backupTrackingExists.length === 0) {
        console.log('[Backup] System tables missing, recreating...')
        
        // Create BackupTracking table with all columns including Phase 14.8
        await client.$executeRaw`
          CREATE TABLE IF NOT EXISTS "backup_tracking" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "backupTimestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "backupFileName" TEXT NOT NULL,
            "backupLocation" TEXT NOT NULL,
            "backupSize" TEXT NOT NULL,
            "recordsBackedUp" INTEGER NOT NULL DEFAULT 0,
            "companyId" TEXT,
            "status" TEXT NOT NULL DEFAULT 'completed',
            "companiesCount" INTEGER NOT NULL DEFAULT 0,
            "accountGroupsCount" INTEGER NOT NULL DEFAULT 0,
            "accountsCount" INTEGER NOT NULL DEFAULT 0,
            "itemsCount" INTEGER NOT NULL DEFAULT 0,
            "crateMarkasCount" INTEGER NOT NULL DEFAULT 0,
            "arrivalTypesCount" INTEGER NOT NULL DEFAULT 0,
            "packingsCount" INTEGER NOT NULL DEFAULT 0,
            "storesCount" INTEGER NOT NULL DEFAULT 0,
            "quickSalesCount" INTEGER NOT NULL DEFAULT 0,
            "quickSaleItemsCount" INTEGER NOT NULL DEFAULT 0,
            "crateIssuesCount" INTEGER NOT NULL DEFAULT 0,
            "crateIssueItemsCount" INTEGER NOT NULL DEFAULT 0,
            "crateReceivesCount" INTEGER NOT NULL DEFAULT 0,
            "crateReceiveItemsCount" INTEGER NOT NULL DEFAULT 0,
            "vouchersCount" INTEGER NOT NULL DEFAULT 0,
            "voucherItemsCount" INTEGER NOT NULL DEFAULT 0,
            "voucherChargesCount" INTEGER NOT NULL DEFAULT 0,
            "otherChargesHeadsCount" INTEGER NOT NULL DEFAULT 0,
            "arrivalsCount" INTEGER NOT NULL DEFAULT 0,
            "arrivalItemsCount" INTEGER NOT NULL DEFAULT 0,
            "arrivalChargesCount" INTEGER NOT NULL DEFAULT 0,
            "stockSalesCount" INTEGER NOT NULL DEFAULT 0,
            "stockSaleItemsCount" INTEGER NOT NULL DEFAULT 0,
            "stockLedgersCount" INTEGER NOT NULL DEFAULT 0,
            "sellerBillsCount" INTEGER NOT NULL DEFAULT 0,
            "sellerBillItemsCount" INTEGER NOT NULL DEFAULT 0,
            "sellerBillChargesCount" INTEGER NOT NULL DEFAULT 0,
            "stockTransfersCount" INTEGER NOT NULL DEFAULT 0,
            "stockTransferItemsCount" INTEGER NOT NULL DEFAULT 0,
            "stockTransferChargesCount" INTEGER NOT NULL DEFAULT 0,
            "stockWattaksCount" INTEGER NOT NULL DEFAULT 0,
            "stockWattakItemsCount" INTEGER NOT NULL DEFAULT 0,
            "stockWattakChargesCount" INTEGER NOT NULL DEFAULT 0,
            "stockTransferWattakLedgersCount" INTEGER NOT NULL DEFAULT 0,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `
        
        // Create indexes
        await client.$executeRaw`CREATE INDEX IF NOT EXISTS "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp")`
        await client.$executeRaw`CREATE INDEX IF NOT EXISTS "backup_tracking_companyId_idx" ON "backup_tracking"("companyId")`
        await client.$executeRaw`CREATE INDEX IF NOT EXISTS "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName")`
        
        // Create Meta table
        await client.$executeRaw`
          CREATE TABLE IF NOT EXISTS "Meta" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "key" TEXT NOT NULL UNIQUE,
            "value" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `
        
        // Create UpdateInfo table
        await client.$executeRaw`
          CREATE TABLE IF NOT EXISTS "UpdateInfo" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "version" TEXT NOT NULL,
            "releaseDate" DATETIME NOT NULL,
            "downloadUrl" TEXT NOT NULL,
            "releaseNotes" TEXT NOT NULL,
            "isDownloaded" BOOLEAN NOT NULL DEFAULT 0,
            "downloadPath" TEXT,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `
        
        console.log('[Backup] System tables recreated successfully')
      }
    } catch (error) {
      console.error('[Backup] Error ensuring system tables:', error)
      // Don't throw - let restore continue even if system tables fail
    }
  }

  /**
   * Archive the old backup file with timestamp
   * ISSUE 2: Move old backup to archive with timestamp
   */
  private async archiveOldBackup(backupFilePath: string, backupFolder: string): Promise<void> {
    try {
      const archiveFolder = join(backupFolder, 'archive')
      
      // Create archive folder if needed
      if (!existsSync(archiveFolder)) {
        mkdirSync(archiveFolder, { recursive: true })
      }

      // Get file extension
      const ext = backupFilePath.endsWith('.json') ? '.json' : '.db'

      // Create timestamped filename for archived backup
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .split('Z')[0]
      const archivedFileName = `backup_${timestamp}${ext}`
      const archivedFilePath = join(archiveFolder, archivedFileName)

      // Move old backup to archive
      copyFileSync(backupFilePath, archivedFilePath)
      
      console.log(`[Backup] Archived old backup to: ${archivedFileName}`)
    } catch (error) {
      console.error('[Backup] Error archiving old backup:', error)
      // Don't throw - archiving is optional, continue with new backup
    }
  }

  /**
   * Restore data from backup file
   * ISSUE 3: Only supports SQLite format
   */
  public async restoreFromBackup(filePath: string): Promise<RestoreResult> {
    try {
      // Check if file exists
      if (!existsSync(filePath)) {
        return {
          success: false,
          message: 'Backup file not found',
          recordsRestored: 0
        }
      }

      // Only support .db files (SQLite)
      if (!filePath.endsWith('.db')) {
        return {
          success: false,
          message: 'Only SQLite backup files (.db) are supported',
          recordsRestored: 0
        }
      }

      // Get current database path
      const dbPath = this.dbService.getDatabasePath()

      // Create a temporary backup of current database before restoring
      const tempBackupPath = `${dbPath}.temp`
      try {
        if (existsSync(dbPath)) {
          copyFileSync(dbPath, tempBackupPath)
        }

        // Close current database connection
        const client = await this.dbService.getClient()
        await client.$disconnect()

        // Replace current database with backup file
        copyFileSync(filePath, dbPath)

        // Reconnect to database
        const newClient = await this.dbService.getClient()

        // ISSUE 4 FIX: Ensure system tables exist after restore
        await this.ensureSystemTablesExist(newClient)

        // Count records to report
        // Note: Handle cases where tables might not exist in older backups
        const [companiesCount, accountGroupsCount, accountsCount, itemsCount, crateMarkasCount, arrivalTypesCount] = await Promise.all([
          newClient.company.count(),
          newClient.accountGroup.count(),
          newClient.account.count(),
          newClient.item.count(),
          newClient.crateMarka.count(),
          newClient.arrivalType.count()
        ])
        
        // Try to count packing and store records (tables may not exist in older backups)
        let packingsCount = 0
        try {
          packingsCount = await newClient.packing.count()
        } catch (error) {
          console.log('[Backup] Packing table not found in restored backup (expected for older backups)')
        }
        
        let storesCount = 0
        try {
          storesCount = await newClient.store.count()
        } catch (error) {
          console.log('[Backup] Store table not found in restored backup (expected for older backups)')
        }
        
        // Try to count quick sale records (tables may not exist in older backups)
        let quickSalesCount = 0
        try {
          quickSalesCount = await newClient.quickSale.count()
        } catch (error) {
          console.log('[Backup] QuickSale table not found in restored backup (expected for older backups)')
        }
        
        let quickSaleItemsCount = 0
        try {
          quickSaleItemsCount = await newClient.quickSaleItem.count()
        } catch (error) {
          console.log('[Backup] QuickSaleItem table not found in restored backup (expected for older backups)')
        }
        
        // Try to count crate issue/receive records (tables may not exist in older backups)
        let crateIssuesCount = 0
        try {
          crateIssuesCount = await newClient.crateIssue.count()
        } catch (error) {
          console.log('[Backup] CrateIssue table not found in restored backup (expected for older backups)')
        }
        
        let crateIssueItemsCount = 0
        try {
          crateIssueItemsCount = await newClient.crateIssueItem.count()
        } catch (error) {
          console.log('[Backup] CrateIssueItem table not found in restored backup (expected for older backups)')
        }
        
        let crateReceivesCount = 0
        try {
          crateReceivesCount = await newClient.crateReceive.count()
        } catch (error) {
          console.log('[Backup] CrateReceive table not found in restored backup (expected for older backups)')
        }
        
        let crateReceiveItemsCount = 0
        try {
          crateReceiveItemsCount = await newClient.crateReceiveItem.count()
        } catch (error) {
          console.log('[Backup] CrateReceiveItem table not found in restored backup (expected for older backups)')
        }
        
        // Try to count voucher records (daily sale - tables may not exist in older backups)
        let vouchersCount = 0
        try {
          vouchersCount = await newClient.voucher.count()
        } catch (error) {
          console.log('[Backup] Voucher table not found in restored backup (expected for older backups)')
        }
        
        let voucherItemsCount = 0
        try {
          voucherItemsCount = await newClient.voucherItem.count()
        } catch (error) {
          console.log('[Backup] VoucherItem table not found in restored backup (expected for older backups)')
        }
        
        let voucherChargesCount = 0
        try {
          voucherChargesCount = await newClient.voucherCharge.count()
        } catch (error) {
          console.log('[Backup] VoucherCharge table not found in restored backup (expected for older backups)')
        }
        
        // Phase 14.8 - Try to count arrival-related records (tables may not exist in older backups)
        let otherChargesHeadsCount = 0
        try {
          otherChargesHeadsCount = await newClient.otherChargesHead.count()
        } catch (error) {
          console.log('[Backup] OtherChargesHead table not found in restored backup (expected for older backups)')
        }
        
        let arrivalsCount = 0
        try {
          arrivalsCount = await newClient.arrival.count()
        } catch (error) {
          console.log('[Backup] Arrival table not found in restored backup (expected for older backups)')
        }
        
        let arrivalItemsCount = 0
        try {
          arrivalItemsCount = await newClient.arrivalItem.count()
        } catch (error) {
          console.log('[Backup] ArrivalItem table not found in restored backup (expected for older backups)')
        }
        
        let arrivalChargesCount = 0
        try {
          arrivalChargesCount = await newClient.arrivalCharges.count()
        } catch (error) {
          console.log('[Backup] ArrivalCharges table not found in restored backup (expected for older backups)')
        }

        // Phase 15 - Stock sale tables
        let stockSalesCount = 0
        try {
          stockSalesCount = await newClient.stockSale.count()
        } catch (error) {
          console.log('[Backup] StockSale table not found in restored backup (expected for older backups)')
        }

        let stockSaleItemsCount = 0
        try {
          stockSaleItemsCount = await newClient.stockSaleItem.count()
        } catch (error) {
          console.log('[Backup] StockSaleItem table not found in restored backup (expected for older backups)')
        }

        let stockLedgersCount = 0
        try {
          stockLedgersCount = await newClient.stockLedger.count()
        } catch (error) {
          console.log('[Backup] StockLedger table not found in restored backup (expected for older backups)')
        }

        // Phase 16 - Seller bill tables
        let sellerBillsCount = 0
        try {
          sellerBillsCount = await newClient.sellerBill.count()
        } catch (error) {
          console.log('[Backup] SellerBill table not found in restored backup (expected for older backups)')
        }

        let sellerBillItemsCount = 0
        try {
          sellerBillItemsCount = await newClient.sellerBillItem.count()
        } catch (error) {
          console.log('[Backup] SellerBillItem table not found in restored backup (expected for older backups)')
        }

        let sellerBillChargesCount = 0
        try {
          sellerBillChargesCount = await newClient.sellerBillCharge.count()
        } catch (error) {
          console.log('[Backup] SellerBillCharge table not found in restored backup (expected for older backups)')
        }
        
        const totalRecords = companiesCount + accountGroupsCount + accountsCount + itemsCount + 
          crateMarkasCount + arrivalTypesCount + packingsCount + storesCount + 
          quickSalesCount + quickSaleItemsCount +
          crateIssuesCount + crateIssueItemsCount + crateReceivesCount + crateReceiveItemsCount +
          vouchersCount + voucherItemsCount + voucherChargesCount +
          // Phase 14.8 - Arrival tables
          otherChargesHeadsCount + arrivalsCount + arrivalItemsCount + arrivalChargesCount +
          // Phase 15 - Stock sale tables
          stockSalesCount + stockSaleItemsCount + stockLedgersCount +
          // Phase 16 - Seller bill tables
          sellerBillsCount + sellerBillItemsCount + sellerBillChargesCount

        // Delete temp backup on success
        if (existsSync(tempBackupPath)) {
          const fs = require('fs').promises
          await fs.unlink(tempBackupPath)
        }

        console.log(`[Backup] Restored from backup: ${totalRecords} records`)

        return {
          success: true,
          message: 'Backup restored successfully',
          recordsRestored: totalRecords
        }
      } catch (error) {
        // Restore from temp backup if restore failed
        if (existsSync(tempBackupPath)) {
          copyFileSync(tempBackupPath, dbPath)
          const fs = require('fs').promises
          await fs.unlink(tempBackupPath)
        }
        throw error
      }
    } catch (error) {
      console.error('[Backup] Restore error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        recordsRestored: 0
      }
    }
  }

  /**
   * Get list of available backups
   * ISSUE 3: Only list .db files
   */
  public async listBackups(location?: string): Promise<any[]> {
    try {
      const backupFolder = location || this.defaultBackupFolder
      
      console.log('[Backup] Listing backups from folder:', backupFolder)
      console.log('[Backup] Folder exists:', existsSync(backupFolder))
      
      if (!existsSync(backupFolder)) {
        console.log('[Backup] Folder does not exist, returning empty array')
        return []
      }

      const allFiles = readdirSync(backupFolder)
      console.log('[Backup] All files in folder:', allFiles)
      
      const files = allFiles
        .filter(file => {
          const isDb = file.endsWith('.db')
          const isBackup = file === 'backup.db' || file.startsWith('backup_')
          console.log(`[Backup] File: ${file}, isDb: ${isDb}, isBackup: ${isBackup}`)
          return isDb && isBackup
        })
        .map(file => {
          const filePath = join(backupFolder, file)
          const stats = statSync(filePath)
          const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2)

          return {
            id: file,
            name: file,
            path: filePath,
            size: `${fileSizeInMB} MB`,
            date: stats.mtime,
            location: location ? 'custom' : 'local'
          }
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime())

      return files
    } catch (error) {
      console.error('[Backup] Error listing backups:', error)
      return []
    }
  }

  /**
   * Delete a backup file
   */
  public async deleteBackup(filePath: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!existsSync(filePath)) {
        return {
          success: false,
          message: 'Backup file not found'
        }
      }

      const fileName = basename(filePath)
      const fs = require('fs').promises
      await fs.unlink(filePath)

      // Remove from tracking table
      const client = await this.dbService.getClient()
      await client.backupTracking.deleteMany({
        where: { backupFileName: fileName }
      })

      console.log(`[Backup] Deleted backup: ${fileName}`)

      return {
        success: true,
        message: 'Backup deleted successfully'
      }
    } catch (error) {
      console.error('[Backup] Error deleting backup:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Select folder for backups using native dialog
   */
  public async selectBackupFolder(): Promise<{ success: boolean; path?: string; message?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Backup Folder',
        defaultPath: this.defaultBackupFolder
      })

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: false,
          message: 'Folder selection cancelled'
        }
      }

      return {
        success: true,
        path: result.filePaths[0]
      }
    } catch (error) {
      console.error('[Backup] Error selecting folder:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Browse for a backup file to restore
   */
  public async selectBackupFile(): Promise<{ success: boolean; path?: string; message?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        title: 'Select Backup File',
        defaultPath: this.defaultBackupFolder,
        filters: [
          { name: 'SQLite Backup Files', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return {
          success: false,
          message: 'File selection cancelled'
        }
      }

      return {
        success: true,
        path: result.filePaths[0]
      }
    } catch (error) {
      console.error('[Backup] Error selecting file:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get default backup folder path
   */
  public getDefaultBackupFolder(): string {
    return this.defaultBackupFolder
  }

  /**
   * Get default backup file path
   * TASK 1: For quick restore functionality
   */
  public getDefaultBackupPath(): string {
    return join(this.defaultBackupFolder, 'backup.db')
  }
}

export default BackupService
