import type { PrismaClient as PrismaClientType } from '@prisma/client'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { pathToFileURL } from 'url'
// Item model added - Prisma client regenerated

class DatabaseService {
  private static instance: DatabaseService
  private prisma!: PrismaClientType
  private dbPath: string
  private isPackaged: boolean
  private initialized = false

  private constructor() {
    this.isPackaged = app.isPackaged
    
    if (this.isPackaged) {
      // Production: Use %APPDATA%\whole-sale-erp\database.db
      const userDataPath = app.getPath('userData')
      this.dbPath = join(userDataPath, 'database.db')
      
      // Ensure directory exists
      if (!existsSync(userDataPath)) {
        mkdirSync(userDataPath, { recursive: true })
      }
    } else {
      // Development: Use C:\whole-sale-erp\prisma\dev.db (project directory)
      const projectRoot = app.getAppPath()
      const prismaDir = join(projectRoot, 'prisma')
      this.dbPath = join(prismaDir, 'dev.db')
      
      // Ensure prisma directory exists
      if (!existsSync(prismaDir)) {
        mkdirSync(prismaDir, { recursive: true })
      }
    }
    
    console.log(`[Database] Using database at: ${this.dbPath}`)
    console.log(`[Database] Environment: ${this.isPackaged ? 'PRODUCTION' : 'DEVELOPMENT'}`)
  }

  private async createPrismaClient(): Promise<PrismaClientType> {
    let PrismaClient: any

    if (this.isPackaged) {
      // In packaged app, load from unpacked location
      const prismaPath = join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        '@prisma',
        'client',
        'default.js'
      )
      const prismaModule = await import(pathToFileURL(prismaPath).href)
      PrismaClient = prismaModule.PrismaClient
    } else {
      // In development, use normal import
      const prismaModule = await import('@prisma/client')
      PrismaClient = prismaModule.PrismaClient
    }

    // Set Prisma options
    const prismaOptions: any = {
      datasources: {
        db: {
          url: `file:${this.dbPath}`
        }
      },
      log: ['error', 'warn']
    }

    return new PrismaClient(prismaOptions)
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      this.prisma = await this.createPrismaClient()
      this.initialized = true
    }
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  public async getClient(): Promise<PrismaClientType> {
    await this.ensureInitialized()
    return this.prisma
  }

  public async disconnect(): Promise<void> {
    if (this.initialized) {
      await this.prisma.$disconnect()
    }
  }

  // Meta table operations
  public async getMeta(key: string) {
    await this.ensureInitialized()
    return await this.prisma.meta.findUnique({
      where: { key }
    })
  }

  public async getAllMeta() {
    await this.ensureInitialized()
    return await this.prisma.meta.findMany()
  }

  public async setMeta(key: string, value: string) {
    await this.ensureInitialized()
    return await this.prisma.meta.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
  }

  public async getVersionInfo() {
    await this.ensureInitialized()
    const appVersion = await this.getMeta('app_version')
    const dbVersion = await this.getMeta('db_version')
    const setupStatus = await this.getMeta('setup_status')
    
    return {
      appVersion: appVersion?.value || 'Unknown',
      dbVersion: dbVersion?.value || 'Unknown',
      setupStatus: setupStatus?.value || 'Unknown'
    }
  }

  // Initialize database with default data if needed
  public async initialize() {
    try {
      await this.ensureInitialized()
      
      // Run migrations to ensure database schema is up to date
      await this.runMigrations()
      
      // Check if database is already initialized
      const appVersion = await this.getMeta('app_version')
      
      if (!appVersion) {
        // First run - initialize with default data
        await this.setMeta('app_version', '1.0.0')
        await this.setMeta('db_version', '1.0.0')
        await this.setMeta('setup_status', 'initialized')
        console.log('Database initialized successfully')
      }
    } catch (error) {
      console.error('Database initialization error:', error)
      throw error
    }
  }

  // Run Prisma migrations
  private async runMigrations() {
    try {
      // Use Prisma's migration SQL to create tables if they don't exist
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Meta" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "key" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)
      
      await this.prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "Meta_key_key" ON "Meta"("key");
      `)

      // Update Info table for storing update check information
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UpdateInfo" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "lastCheckDate" DATETIME NOT NULL,
          "currentVersion" TEXT NOT NULL,
          "availableVersion" TEXT,
          "updateAvailable" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Auth Session table for storing authentication data
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AuthSession" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "userId" TEXT NOT NULL,
          "userName" TEXT NOT NULL,
          "userEmail" TEXT NOT NULL,
          "token" TEXT NOT NULL,
          "licenseKey" TEXT NOT NULL,
          "licenseStartDate" TEXT NOT NULL,
          "licenseEndDate" TEXT NOT NULL,
          "licenseIsTrial" INTEGER NOT NULL DEFAULT 0,
          "licenseStatus" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Backup Tracking table for incremental backups
      await this.prisma.$executeRawUnsafe(`
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
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "backup_tracking_companyId_idx" ON "backup_tracking"("companyId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName");
      `)

      // Migrate existing backup_tracking table to add per-table tracking columns
      await this.migrateBackupTrackingColumns()

      // Migrate table names to lowercase for consistency
      await this.renameTablesLowercase()

      // Company table with embedded financial year fields
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "company" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "companyName" TEXT NOT NULL,
          "printName" TEXT,
          "printNameLang" TEXT,
          "addressLine1" TEXT,
          "addressLine2" TEXT,
          "city" TEXT,
          "state" TEXT,
          "countryCode" TEXT,
          "mobile1" TEXT,
          "mobile2" TEXT,
          "email" TEXT,
          "website" TEXT,
          "contactPerson" TEXT,
          "billTitle" TEXT,
          "userId" TEXT NOT NULL,
          "companyPassword" TEXT,
          "fyStartDate" TEXT NOT NULL,
          "fyEndDate" TEXT NOT NULL,
          "fyLabel" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Migrate existing Company table to add FY columns if they don't exist
      await this.migrateCompanyFinancialYearColumns()

      // Item table
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "items" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "itemName" TEXT NOT NULL,
          "code" TEXT,
          "printAs" TEXT,
          "printAsLang" TEXT,
          "commission" REAL NOT NULL DEFAULT 0,
          "commissionAsPer" TEXT,
          "marketFees" REAL NOT NULL DEFAULT 0,
          "rdf" REAL NOT NULL DEFAULT 0,
          "bardanaPerNug" REAL NOT NULL DEFAULT 0,
          "laga" REAL NOT NULL DEFAULT 0,
          "wtPerNug" REAL NOT NULL DEFAULT 0,
          "kaatPerNug" REAL NOT NULL DEFAULT 0,
          "maintainCratesInSalePurchase" INTEGER NOT NULL DEFAULT 0,
          "disableWeight" INTEGER NOT NULL DEFAULT 0,
          "companyId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Items_companyId_idx" ON "items"("companyId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Items_itemName_idx" ON "items"("itemName");
      `)

      // CrateMarka table
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "crate_marka" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "crateMarkaName" TEXT NOT NULL,
          "printAs" TEXT,
          "opQty" REAL NOT NULL DEFAULT 0,
          "cost" REAL NOT NULL DEFAULT 0,
          "companyId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "crate_marka_companyId_idx" ON "crate_marka"("companyId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "crate_marka_crateMarkaName_idx" ON "crate_marka"("crateMarkaName");
      `)

      // ArrivalType table (Phase 7)
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "arrival_type" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "arrivalTypeName" TEXT NOT NULL,
          "partyStock" INTEGER NOT NULL DEFAULT 0,
          "selfPurchase" INTEGER NOT NULL DEFAULT 0,
          "vehicleNo" TEXT,
          "autoRoundoffAmount" INTEGER NOT NULL DEFAULT 0,
          "askForAdditionalFields" INTEGER NOT NULL DEFAULT 0,
          "requireForwardingAgent" INTEGER NOT NULL DEFAULT 0,
          "requireBroker" INTEGER NOT NULL DEFAULT 0,
          "companyId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "arrival_type_companyId_idx" ON "arrival_type"("companyId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "arrival_type_arrivalTypeName_idx" ON "arrival_type"("arrivalTypeName");
      `)

      // AccountGroup table
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "account_groups" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "parentGroupId" TEXT,
          "level" INTEGER NOT NULL DEFAULT 0,
          "companyId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("parentGroupId") REFERENCES "account_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "account_groups_companyId_idx" ON "account_groups"("companyId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "account_groups_parentGroupId_idx" ON "account_groups"("parentGroupId");
      `)

      // Account table
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "accounts" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "accountName" TEXT NOT NULL,
          "code" TEXT,
          "accountGroupId" TEXT NOT NULL,
          "companyId" TEXT NOT NULL,
          "openingBalance" REAL NOT NULL DEFAULT 0,
          "drCr" TEXT NOT NULL DEFAULT 'Dr',
          "area" TEXT,
          "srNo" TEXT,
          "crLimit" REAL,
          "nameLang" TEXT,
          "address" TEXT,
          "address2" TEXT,
          "city" TEXT,
          "state" TEXT,
          "panNo" TEXT,
          "mobile1" TEXT,
          "mobile2" TEXT,
          "bankName1" TEXT,
          "accountNo1" TEXT,
          "bankName2" TEXT,
          "accountNo2" TEXT,
          "contactPerson" TEXT,
          "ledgerFolioNo" TEXT,
          "auditUpto" TEXT,
          "maintainBillByBillBalance" INTEGER NOT NULL DEFAULT 0,
          "photo" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("accountGroupId") REFERENCES "account_groups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "accounts_companyId_idx" ON "accounts"("companyId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "accounts_accountGroupId_idx" ON "accounts"("accountGroupId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "accounts_accountName_idx" ON "accounts"("accountName");
      `)

      // Packing table
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "packing" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "packingName" TEXT NOT NULL,
          "calculate" TEXT NOT NULL,
          "divideBy" REAL NOT NULL,
          "companyId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "packing_packingName_companyId_key" UNIQUE("packingName", "companyId")
        );
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "packing_companyId_idx" ON "packing"("companyId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "packing_packingName_idx" ON "packing"("packingName");
      `)

      // Store table
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "store" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "storeName" TEXT NOT NULL,
          "companyId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "store_storeName_companyId_key" UNIQUE("storeName", "companyId")
        );
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "store_companyId_idx" ON "store"("companyId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "store_storeName_idx" ON "store"("storeName");
      `)

      // QuickSale table (Phase 10)
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "quick_sale" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "saleDate" TEXT NOT NULL,
          "totalItems" INTEGER NOT NULL DEFAULT 0,
          "totalCrates" REAL NOT NULL DEFAULT 0,
          "totalNug" REAL NOT NULL DEFAULT 0,
          "totalWeight" REAL NOT NULL DEFAULT 0,
          "basicAmount" REAL NOT NULL DEFAULT 0,
          "commissionExpenses" REAL NOT NULL DEFAULT 0,
          "totalSaleAmount" REAL NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "quick_sale_companyId_idx" ON "quick_sale"("companyId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "quick_sale_saleDate_idx" ON "quick_sale"("saleDate");
      `)

      // QuickSaleItem table (Phase 10)
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "quick_sale_item" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "quickSaleId" TEXT NOT NULL,
          "itemId" TEXT NOT NULL,
          "itemName" TEXT NOT NULL,
          "accountId" TEXT NOT NULL,
          "accountName" TEXT NOT NULL,
          "nug" REAL NOT NULL DEFAULT 0,
          "kg" REAL NOT NULL DEFAULT 0,
          "rate" REAL NOT NULL DEFAULT 0,
          "per" TEXT NOT NULL DEFAULT 'nug',
          "basicAmount" REAL NOT NULL DEFAULT 0,
          "totalAmount" REAL NOT NULL DEFAULT 0,
          "crateMarkaId" TEXT,
          "crateMarkaName" TEXT,
          "crateQty" REAL,
          "crateRate" REAL,
          "crateValue" REAL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("quickSaleId") REFERENCES "quick_sale"("id") ON DELETE CASCADE
        );
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "quick_sale_item_quickSaleId_idx" ON "quick_sale_item"("quickSaleId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "quick_sale_item_itemId_idx" ON "quick_sale_item"("itemId");
      `)

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "quick_sale_item_accountId_idx" ON "quick_sale_item"("accountId");
      `)

      // Fix column names in existing tables if they were created with snake_case
      await this.fixPackingStoreColumnNames()
      
      console.log('Database migrations completed successfully')
    } catch (error) {
      console.error('Migration error:', error)
      throw error
    }
  }

  // Fix column names in packing and store tables (migrate from snake_case to camelCase)
  private async fixPackingStoreColumnNames() {
    try {
      // Check if packing table has wrong column names
      const packingTableInfo = await this.prisma.$queryRaw<any[]>`
        PRAGMA table_info("packing")
      `
      
      const hasWrongPackingColumns = packingTableInfo.some(col => col.name === 'created_at')
      
      if (hasWrongPackingColumns) {
        console.log('Migrating packing table column names from snake_case to camelCase...')
        
        // Rename columns using ALTER TABLE
        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE "packing" RENAME COLUMN "created_at" TO "createdAt"
        `)
        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE "packing" RENAME COLUMN "updated_at" TO "updatedAt"
        `)
        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE "packing" RENAME COLUMN "last_synced_at" TO "lastSyncedAt"
        `)
        
        console.log('Packing table column names migrated successfully')
      }

      // Check if store table has wrong column names
      const storeTableInfo = await this.prisma.$queryRaw<any[]>`
        PRAGMA table_info("store")
      `
      
      const hasWrongStoreColumns = storeTableInfo.some(col => col.name === 'created_at')
      
      if (hasWrongStoreColumns) {
        console.log('Migrating store table column names from snake_case to camelCase...')
        
        // Rename columns using ALTER TABLE
        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE "store" RENAME COLUMN "created_at" TO "createdAt"
        `)
        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE "store" RENAME COLUMN "updated_at" TO "updatedAt"
        `)
        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE "store" RENAME COLUMN "last_synced_at" TO "lastSyncedAt"
        `)
        
        console.log('Store table column names migrated successfully')
      }
    } catch (error) {
      console.error('Error fixing packing/store column names:', error)
      // Don't throw - this is a non-critical migration
    }
  }

  // Migrate table names to lowercase for consistency
  private async renameTablesLowercase() {
    try {
      console.log('Checking if tables need to be renamed to lowercase...')
      
      // Check if old PascalCase tables exist
      const tables = await this.prisma.$queryRaw<any[]>`
        SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
      `
      
      const tableNames = tables.map(t => t.name)
      
      // Rename Company to company if it exists
      if (tableNames.includes('Company') && !tableNames.includes('company')) {
        console.log('Renaming Company table to company...')
        await this.prisma.$executeRawUnsafe(`ALTER TABLE "Company" RENAME TO "company"`)
      }
      
      // Rename Items to items if it exists
      if (tableNames.includes('Items') && !tableNames.includes('items')) {
        console.log('Renaming Items table to items...')
        await this.prisma.$executeRawUnsafe(`ALTER TABLE "Items" RENAME TO "items"`)
      }
      
      console.log('Table name migration completed')
    } catch (error) {
      console.error('Error renaming tables to lowercase:', error)
      // Don't throw - this is a non-critical migration
    }
  }

  // Migrate existing Company table to add financial year columns
  private async migrateCompanyFinancialYearColumns() {
    try {
      // Check if fyStartDate column exists
      const tableInfo = await this.prisma.$queryRaw<any[]>`
        PRAGMA table_info("company")
      `
      
      const hasFinancialYearColumns = tableInfo.some(col => col.name === 'fyStartDate')
      
      if (!hasFinancialYearColumns) {
        console.log('Migrating Company table to add financial year columns...')
        
        // Add the financial year columns with default values
        // Using current year as default for existing companies
        const currentYear = new Date().getFullYear()
        const defaultStartDate = `${currentYear}-04-01`
        const defaultEndDate = `${currentYear + 1}-03-31`
        const defaultLabel = `FY ${currentYear}-${currentYear + 1}`
        
        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE "company" ADD COLUMN "fyStartDate" TEXT NOT NULL DEFAULT '${defaultStartDate}'
        `)
        
        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE "company" ADD COLUMN "fyEndDate" TEXT NOT NULL DEFAULT '${defaultEndDate}'
        `)
        
        await this.prisma.$executeRawUnsafe(`
          ALTER TABLE "company" ADD COLUMN "fyLabel" TEXT NOT NULL DEFAULT '${defaultLabel}'
        `)
        
        console.log('Company table migrated successfully with financial year columns')
      } else {
        console.log('Company table already has financial year columns')
      }
    } catch (error) {
      console.error('Error migrating Company table:', error)
      throw error
    }
  }

  // Migrate existing backup_tracking table to add per-table tracking columns
  private async migrateBackupTrackingColumns() {
    try {
      // First, check if the unique constraint on backupFileName exists and remove it
      await this.removeBackupFileNameUniqueConstraint()
      
      // Check if each column exists
      const tableInfo = await this.prisma.$queryRaw<any[]>`
        PRAGMA table_info("backup_tracking")
      `
      
      const hasPerTableColumns = tableInfo.some(col => col.name === 'companiesCount')
      const hasCrateMarkasCount = tableInfo.some(col => col.name === 'crateMarkasCount')
      const hasArrivalTypesCount = tableInfo.some(col => col.name === 'arrivalTypesCount')
      const hasPackingsCount = tableInfo.some(col => col.name === 'packingsCount')
      const hasStoresCount = tableInfo.some(col => col.name === 'storesCount')
      const hasQuickSalesCount = tableInfo.some(col => col.name === 'quickSalesCount')
      const hasQuickSaleItemsCount = tableInfo.some(col => col.name === 'quickSaleItemsCount')
      // Phase 14.8 - Arrival tables columns
      const hasOtherChargesHeadsCount = tableInfo.some(col => col.name === 'otherChargesHeadsCount')
      const hasArrivalsCount = tableInfo.some(col => col.name === 'arrivalsCount')
      const hasArrivalItemsCount = tableInfo.some(col => col.name === 'arrivalItemsCount')
      const hasArrivalChargesCount = tableInfo.some(col => col.name === 'arrivalChargesCount')
      
      // Add initial per-table tracking columns if they don't exist
      if (!hasPerTableColumns) {
        console.log('Migrating backup_tracking table to add per-table tracking columns...')
        
        try {
          // Add per-table tracking columns
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "companiesCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "accountGroupsCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "accountsCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "itemsCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "crateMarkasCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "arrivalTypesCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('backup_tracking table migrated successfully with per-table tracking columns')
        } catch (alterError: any) {
          // Ignore duplicate column errors (means migration already ran)
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('backup_tracking table already has per-table tracking columns')
          } else {
            throw alterError
          }
        }
      }
      
      // Add crateMarkasCount if missing (for older databases)
      if (!hasCrateMarkasCount) {
        console.log('Adding crateMarkasCount column to backup_tracking table...')
        
        try {
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "crateMarkasCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('crateMarkasCount column added successfully')
        } catch (alterError: any) {
          // Ignore duplicate column errors
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('crateMarkasCount column already exists')
          } else {
            throw alterError
          }
        }
      }
      
      // Add arrivalTypesCount if missing (for older databases)
      if (!hasArrivalTypesCount) {
        console.log('Adding arrivalTypesCount column to backup_tracking table...')
        
        try {
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "arrivalTypesCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('arrivalTypesCount column added successfully')
        } catch (alterError: any) {
          // Ignore duplicate column errors
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('arrivalTypesCount column already exists')
          } else {
            throw alterError
          }
        }
      }
      
      // Add packingsCount if missing (Phase 8)
      if (!hasPackingsCount) {
        console.log('Adding packingsCount column to backup_tracking table...')
        
        try {
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "packingsCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('packingsCount column added successfully')
        } catch (alterError: any) {
          // Ignore duplicate column errors
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('packingsCount column already exists')
          } else {
            throw alterError
          }
        }
      }
      
      // Add storesCount if missing (Phase 9)
      if (!hasStoresCount) {
        console.log('Adding storesCount column to backup_tracking table...')
        
        try {
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "storesCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('storesCount column added successfully')
        } catch (alterError: any) {
          // Ignore duplicate column errors
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('storesCount column already exists')
          } else {
            throw alterError
          }
        }
      }
      
      // Add quickSalesCount if missing (Phase 10.4)
      if (!hasQuickSalesCount) {
        console.log('Adding quickSalesCount column to backup_tracking table...')
        
        try {
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "quickSalesCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('quickSalesCount column added successfully')
        } catch (alterError: any) {
          // Ignore duplicate column errors
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('quickSalesCount column already exists')
          } else {
            throw alterError
          }
        }
      }
      
      // Add quickSaleItemsCount if missing (Phase 10.4)
      if (!hasQuickSaleItemsCount) {
        console.log('Adding quickSaleItemsCount column to backup_tracking table...')
        
        try {
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "quickSaleItemsCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('quickSaleItemsCount column added successfully')
        } catch (alterError: any) {
          // Ignore duplicate column errors
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('quickSaleItemsCount column already exists')
          } else {
            throw alterError
          }
        }
      }
      
      // Phase 14.8 - Add otherChargesHeadsCount if missing
      if (!hasOtherChargesHeadsCount) {
        console.log('Adding otherChargesHeadsCount column to backup_tracking table...')
        
        try {
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "otherChargesHeadsCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('otherChargesHeadsCount column added successfully')
        } catch (alterError: any) {
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('otherChargesHeadsCount column already exists')
          } else {
            throw alterError
          }
        }
      }
      
      // Phase 14.8 - Add arrivalsCount if missing
      if (!hasArrivalsCount) {
        console.log('Adding arrivalsCount column to backup_tracking table...')
        
        try {
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "arrivalsCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('arrivalsCount column added successfully')
        } catch (alterError: any) {
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('arrivalsCount column already exists')
          } else {
            throw alterError
          }
        }
      }
      
      // Phase 14.8 - Add arrivalItemsCount if missing
      if (!hasArrivalItemsCount) {
        console.log('Adding arrivalItemsCount column to backup_tracking table...')
        
        try {
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "arrivalItemsCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('arrivalItemsCount column added successfully')
        } catch (alterError: any) {
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('arrivalItemsCount column already exists')
          } else {
            throw alterError
          }
        }
      }
      
      // Phase 14.8 - Add arrivalChargesCount if missing
      if (!hasArrivalChargesCount) {
        console.log('Adding arrivalChargesCount column to backup_tracking table...')
        
        try {
          await this.prisma.$executeRawUnsafe(`
            ALTER TABLE "backup_tracking" ADD COLUMN "arrivalChargesCount" INTEGER NOT NULL DEFAULT 0
          `)
          
          console.log('arrivalChargesCount column added successfully')
        } catch (alterError: any) {
          if (alterError.code === 'P2010' || alterError.message?.includes('duplicate column')) {
            console.log('arrivalChargesCount column already exists')
          } else {
            throw alterError
          }
        }
      }
      
      // Log completion
      if (hasPerTableColumns && hasCrateMarkasCount && hasArrivalTypesCount && hasPackingsCount && hasStoresCount && hasQuickSalesCount && hasQuickSaleItemsCount && hasOtherChargesHeadsCount && hasArrivalsCount && hasArrivalItemsCount && hasArrivalChargesCount) {
        console.log('backup_tracking table already has all required columns')
      }
    } catch (error: any) {
      // Only throw if it's not a duplicate column error
      if (error.code !== 'P2010' && !error.message?.includes('duplicate column')) {
        console.error('Error migrating backup_tracking columns:', error)
        throw error
      } else {
        console.log('backup_tracking table columns migration skipped (already applied)')
      }
    }
  }

  // Remove unique constraint from backupFileName column (SQLite requires table recreation)
  private async removeBackupFileNameUniqueConstraint() {
    try {
      // First check if the table exists at all
      const tableExists = await this.prisma.$queryRaw<any[]>`
        SELECT name FROM sqlite_master WHERE type='table' AND name='backup_tracking'
      `
      
      if (!tableExists || tableExists.length === 0) {
        console.log('backup_tracking table does not exist yet, skipping constraint removal')
        return
      }
      
      // Check the table schema to see if backupFileName has a unique constraint
      const tableInfo = await this.prisma.$queryRaw<any[]>`
        SELECT sql FROM sqlite_master WHERE type='table' AND name='backup_tracking'
      `
      
      const createTableSql = tableInfo[0].sql as string
      const hasUniqueConstraint = createTableSql.includes('UNIQUE') && 
                                   createTableSql.toLowerCase().includes('backupfilename')
      
      // Also check for unique index
      const indexes = await this.prisma.$queryRaw<any[]>`
        SELECT name, sql FROM sqlite_master 
        WHERE type='index' AND tbl_name='backup_tracking' AND sql IS NOT NULL
      `
      
      const hasUniqueIndex = indexes.some(idx => {
        const sql = (idx.sql as string || '').toLowerCase()
        return sql.includes('unique') && sql.includes('backupfilename')
      })
      
      if (hasUniqueConstraint || hasUniqueIndex) {
        console.log('Found unique constraint/index on backupFileName, removing it...')
        console.log('Current table schema:', createTableSql)
        
        // Get column info to check what columns exist
        const columns = await this.prisma.$queryRaw<any[]>`
          PRAGMA table_info("backup_tracking")
        `
        
        const columnNames = columns.map(col => col.name)
        console.log('Table columns:', columnNames)
        
        // Get existing data first - only if table has data
        const countResult = await this.prisma.$queryRaw<any[]>`
          SELECT COUNT(*) as count FROM "backup_tracking"
        `
        
        const recordCount = countResult[0]?.count || 0
        console.log(`Found ${recordCount} existing backup records to preserve`)
        
        let existingData: any[] = []
        if (recordCount > 0) {
          existingData = await this.prisma.$queryRaw<any[]>`
            SELECT * FROM "backup_tracking"
          `
        }
        
        // SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we need to recreate the table
        // 1. Drop old table
        await this.prisma.$executeRawUnsafe(`DROP TABLE "backup_tracking"`)
        console.log('Dropped old backup_tracking table')
        
        // 2. Create new table without unique constraint
        await this.prisma.$executeRawUnsafe(`
          CREATE TABLE "backup_tracking" (
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
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `)
        console.log('Created new backup_tracking table without unique constraint')
        
        // 3. Restore existing data if we had any
        if (existingData.length > 0) {
          for (const row of existingData) {
            await this.prisma.$executeRawUnsafe(`
              INSERT INTO "backup_tracking" (
                id, backupTimestamp, backupFileName, backupLocation, backupSize,
                recordsBackedUp, companyId, status,
                companiesCount, accountGroupsCount, accountsCount, itemsCount, crateMarkasCount, arrivalTypesCount,
                createdAt
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
              row.id,
              row.backupTimestamp,
              row.backupFileName,
              row.backupLocation,
              row.backupSize,
              row.recordsBackedUp,
              row.companyId,
              row.status,
              row.companiesCount || 0,
              row.accountGroupsCount || 0,
              row.accountsCount || 0,
              row.itemsCount || 0,
              row.crateMarkasCount || 0,
              row.arrivalTypesCount || 0,
              row.createdAt
            )
          }
          console.log(`Restored ${existingData.length} backup records`)
        }
        
        // 4. Recreate indexes (non-unique)
        await this.prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "backup_tracking_backupTimestamp_idx" ON "backup_tracking"("backupTimestamp")
        `)
        
        await this.prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "backup_tracking_companyId_idx" ON "backup_tracking"("companyId")
        `)
        
        await this.prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "backup_tracking_backupFileName_idx" ON "backup_tracking"("backupFileName")
        `)
        
        console.log('Unique constraint removed from backupFileName successfully')
      } else {
        console.log('No unique constraint found on backupFileName, table schema is correct')
      }
    } catch (error: any) {
      console.error('Error removing unique constraint:', error)
      // Don't throw - allow app to continue, but log the error
    }
  }

  // Auth Session operations
  public async getAuthSession() {
    await this.ensureInitialized()
    // Get the most recent session
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM "AuthSession" 
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `
    return result[0] || null
  }

  public async saveAuthSession(data: {
    userId: string
    userName: string
    userEmail: string
    token: string
    licenseKey: string
    licenseStartDate: string
    licenseEndDate: string
    licenseIsTrial: boolean
    licenseStatus: string
  }) {
    await this.ensureInitialized()
    
    // Clear any existing sessions first
    await this.clearAuthSession()
    
    // Insert new session with timestamps
    const now = new Date().toISOString()
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO "AuthSession" (
        userId, userName, userEmail, token, licenseKey,
        licenseStartDate, licenseEndDate, licenseIsTrial, licenseStatus,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, 
      data.userId,
      data.userName,
      data.userEmail,
      data.token,
      data.licenseKey,
      data.licenseStartDate,
      data.licenseEndDate,
      data.licenseIsTrial ? 1 : 0,
      data.licenseStatus,
      now,
      now
    )
  }

  public async clearAuthSession() {
    await this.ensureInitialized()
    await this.prisma.$executeRaw`DELETE FROM "AuthSession"`
  }

  public async updateLicenseStatus(status: string, isExpired: boolean) {
    await this.ensureInitialized()
    const isExpiredValue = isExpired ? 1 : 0
    await this.prisma.$executeRaw`
      UPDATE "AuthSession" 
      SET licenseStatus = ${status}, 
          licenseIsTrial = CASE WHEN ${isExpiredValue} = 1 THEN 0 ELSE licenseIsTrial END,
          updatedAt = CURRENT_TIMESTAMP
    `
  }

  // Company operations
  public async createCompany(data: {
    id: string
    companyName: string
    printName?: string
    printNameLang?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    countryCode?: string
    mobile1?: string
    mobile2?: string
    email?: string
    website?: string
    contactPerson?: string
    billTitle?: string
    userId: string
    companyPassword?: string
    fyStartDate: string
    fyEndDate: string
    fyLabel: string
  }) {
    await this.ensureInitialized()
    const now = new Date().toISOString()
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO "Company" (
        id, companyName, printName, printNameLang, addressLine1, addressLine2,
        city, state, countryCode, mobile1, mobile2, email, website,
        contactPerson, billTitle, userId, companyPassword,
        fyStartDate, fyEndDate, fyLabel,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      data.id,
      data.companyName,
      data.printName || null,
      data.printNameLang || null,
      data.addressLine1 || null,
      data.addressLine2 || null,
      data.city || null,
      data.state || null,
      data.countryCode || null,
      data.mobile1 || null,
      data.mobile2 || null,
      data.email || null,
      data.website || null,
      data.contactPerson || null,
      data.billTitle || null,
      data.userId,
      data.companyPassword || null,
      data.fyStartDate,
      data.fyEndDate,
      data.fyLabel,
      now,
      now
    )
  }

  public async getCompaniesByUserId(userId: string) {
    await this.ensureInitialized()
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM "Company"
      WHERE userId = ${userId}
      ORDER BY "createdAt" DESC
    `
    return result
  }

  public async getCompanyById(id: string) {
    await this.ensureInitialized()
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM "Company" 
      WHERE id = ${id}
      LIMIT 1
    `
    return result[0] || null
  }

  public async updateCompany(id: string, data: Partial<{
    companyName: string
    printName: string
    printNameLang: string
    addressLine1: string
    addressLine2: string
    city: string
    state: string
    countryCode: string
    mobile1: string
    mobile2: string
    email: string
    website: string
    contactPerson: string
    billTitle: string
    companyPassword: string
    fyStartDate: string
    fyEndDate: string
    fyLabel: string
  }>) {
    await this.ensureInitialized()
    const fields = Object.keys(data).map(key => `"${key}" = ?`).join(', ')
    const values = [...Object.values(data), id]
    
    await this.prisma.$executeRawUnsafe(`
      UPDATE "Company" 
      SET ${fields}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ?
    `, ...values)
  }

  public async deleteCompany(id: string) {
    await this.ensureInitialized()
    await this.prisma.$executeRaw`DELETE FROM "Company" WHERE id = ${id}`
  }

  // Update Info operations
  public async getUpdateInfo() {
    await this.ensureInitialized()
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM "UpdateInfo" 
      ORDER BY "lastCheckDate" DESC 
      LIMIT 1
    `
    
    if (result[0]) {
      return {
        lastCheckDate: new Date(result[0].lastCheckDate),
        currentVersion: result[0].currentVersion,
        availableVersion: result[0].availableVersion,
        updateAvailable: result[0].updateAvailable === 1
      }
    }
    return null
  }

  public async saveUpdateInfo(data: {
    lastCheckDate: Date
    currentVersion: string
    availableVersion?: string
    updateAvailable: boolean
  }) {
    await this.ensureInitialized()
    
    // Clear old records
    await this.prisma.$executeRaw`DELETE FROM "UpdateInfo"`
    
    // Insert new record
    const lastCheckDate = data.lastCheckDate.toISOString()
    const currentVersion = data.currentVersion
    const availableVersion = data.availableVersion || null
    const updateAvailable = data.updateAvailable ? 1 : 0
    const now = new Date().toISOString()
    
    await this.prisma.$executeRaw`
      INSERT INTO "UpdateInfo" (
        lastCheckDate, currentVersion, availableVersion, updateAvailable,
        createdAt, updatedAt
      ) VALUES (${lastCheckDate}, ${currentVersion}, ${availableVersion}, ${updateAvailable}, ${now}, ${now})
    `
  }

  // Account Group operations
  public async createAccountGroup(data: {
    id: string
    name: string
    parentGroupId?: string
    level: number
    companyId: string
  }) {
    await this.ensureInitialized()
    return await this.prisma.accountGroup.create({
      data: {
        id: data.id,
        name: data.name,
        parentGroupId: data.parentGroupId || null,
        level: data.level,
        companyId: data.companyId,

      }
    })
  }

  public async getAccountGroupsByCompany(companyId: string) {
    await this.ensureInitialized()
    return await this.prisma.accountGroup.findMany({
      where: { companyId },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        parentGroup: true,
        subGroups: true,
        _count: {
          select: { accounts: true }
        }
      }
    })
  }

  public async getAccountGroupById(id: string) {
    await this.ensureInitialized()
    return await this.prisma.accountGroup.findUnique({
      where: { id },
      include: {
        parentGroup: true,
        subGroups: true,
        accounts: true
      }
    })
  }

  public async updateAccountGroup(id: string, data: { name?: string; parentGroupId?: string | null; level?: number }) {
    await this.ensureInitialized()
    return await this.prisma.accountGroup.update({
      where: { id },
      data: {
        ...data,

        updatedAt: new Date()
      }
    })
  }

  public async deleteAccountGroup(id: string) {
    await this.ensureInitialized()
    return await this.prisma.accountGroup.delete({
      where: { id }
    })
  }

  // Account operations
  public async createAccount(data: {
    id: string
    accountName: string
    code?: string
    accountGroupId: string
    companyId: string
    openingBalance?: number
    drCr?: string
    area?: string
    srNo?: string
    crLimit?: number
    nameLang?: string
    address?: string
    address2?: string
    city?: string
    state?: string
    panNo?: string
    mobile1?: string
    mobile2?: string
    bankName1?: string
    accountNo1?: string
    bankName2?: string
    accountNo2?: string
    contactPerson?: string
    ledgerFolioNo?: string
    auditUpto?: string
    maintainBillByBillBalance?: boolean
    photo?: string
  }) {
    await this.ensureInitialized()
    return await this.prisma.account.create({
      data: {
        ...data,

      }
    })
  }

  public async getAccountsByCompany(companyId: string) {
    await this.ensureInitialized()
    return await this.prisma.account.findMany({
      where: { companyId },
      orderBy: { accountName: 'asc' },
      include: {
        accountGroup: true
      }
    })
  }

  public async getAccountsByGroup(accountGroupId: string) {
    await this.ensureInitialized()
    return await this.prisma.account.findMany({
      where: { accountGroupId },
      orderBy: { accountName: 'asc' }
    })
  }

  public async getAccountById(id: string) {
    await this.ensureInitialized()
    return await this.prisma.account.findUnique({
      where: { id },
      include: {
        accountGroup: true
      }
    })
  }

  public async updateAccount(id: string, data: any) {
    await this.ensureInitialized()
    const account = await this.prisma.account.update({
      where: { id },
      data: {
        ...data,

        updatedAt: new Date()
      }
    })
    if (typeof data.accountName === 'string') {
      await this.syncAccountNameReferences(id, data.accountName)
    }
    return account
  }

  public async deleteAccount(id: string) {
    await this.ensureInitialized()
    return await this.prisma.account.delete({
      where: { id }
    })
  }

  public async bulkDeleteAccounts(ids: string[]) {
    await this.ensureInitialized()
    return await this.prisma.account.deleteMany({
      where: {
        id: { in: ids }
      }
    })
  }

  public async bulkUpdateAccountGroup(ids: string[], accountGroupId: string) {
    await this.ensureInitialized()
    return await this.prisma.account.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        accountGroupId,

        updatedAt: new Date()
      }
    })
  }

  // Item operations
  public async createItem(data: {
    id: string
    companyId: string
    itemName: string
    code?: string
    printAs?: string
    printAsLang?: string
    commission?: number
    commissionAsPer?: string
    marketFees?: number
    rdf?: number
    bardanaPerNug?: number
    laga?: number
    wtPerNug?: number
    kaatPerNug?: number
    maintainCratesInSalePurchase?: boolean
    disableWeight?: boolean
  }) {
    await this.ensureInitialized()
    return await this.prisma.item.create({
      data: {
        ...data,

      }
    })
  }

  public async getItemsByCompany(companyId: string) {
    await this.ensureInitialized()
    return await this.prisma.item.findMany({
      where: { companyId },
      orderBy: { itemName: 'asc' }
    })
  }

  public async getItemById(id: string) {
    await this.ensureInitialized()
    return await this.prisma.item.findUnique({
      where: { id }
    })
  }

  public async updateItem(id: string, data: any) {
    await this.ensureInitialized()
    const item = await this.prisma.item.update({
      where: { id },
      data: {
        ...data,

        updatedAt: new Date()
      }
    })
    if (typeof data.itemName === 'string') {
      await this.syncItemNameReferences(id, data.itemName)
    }
    return item
  }

  public async deleteItem(id: string) {
    await this.ensureInitialized()
    return await this.prisma.item.delete({
      where: { id }
    })
  }

  public async bulkDeleteItems(ids: string[]) {
    await this.ensureInitialized()
    return await this.prisma.item.deleteMany({
      where: {
        id: { in: ids }
      }
    })
  }

  private async syncItemNameReferences(itemId: string, itemName: string) {
    await this.ensureInitialized()
    await this.prisma.$transaction([
      this.prisma.quickSaleItem.updateMany({
        where: { itemId },
        data: { itemName }
      }),
      this.prisma.voucherItem.updateMany({
        where: { itemId },
        data: { itemName }
      }),
      this.prisma.stockSaleItem.updateMany({
        where: { itemId },
        data: { itemName }
      })
    ])
  }

  private async syncAccountNameReferences(accountId: string, accountName: string) {
    await this.ensureInitialized()
    await this.prisma.$transaction([
      this.prisma.quickSaleItem.updateMany({
        where: { accountId },
        data: { accountName }
      }),
      this.prisma.voucher.updateMany({
        where: { supplierId: accountId },
        data: { supplierName: accountName }
      }),
      this.prisma.voucherItem.updateMany({
        where: { customerId: accountId },
        data: { customerName: accountName }
      }),
      this.prisma.stockSaleItem.updateMany({
        where: { supplierId: accountId },
        data: { supplierName: accountName }
      }),
      this.prisma.stockSaleItem.updateMany({
        where: { customerId: accountId },
        data: { customerName: accountName }
      })
    ])
  }

  // ==================== CrateMarka Methods ====================

  public async createCrateMarka(data: {
    id: string
    companyId: string
    crateMarkaName: string
    printAs?: string
    opQty?: number
    cost?: number
  }) {
    await this.ensureInitialized()
    return await this.prisma.crateMarka.create({
      data: {
        ...data,

      }
    })
  }

  public async getCrateMarkasByCompany(companyId: string) {
    await this.ensureInitialized()
    return await this.prisma.crateMarka.findMany({
      where: { companyId },
      orderBy: { crateMarkaName: 'asc' }
    })
  }

  public async getCrateMarkaById(id: string) {
    await this.ensureInitialized()
    return await this.prisma.crateMarka.findUnique({
      where: { id }
    })
  }

  public async updateCrateMarka(id: string, data: any) {
    await this.ensureInitialized()
    return await this.prisma.crateMarka.update({
      where: { id },
      data: {
        ...data,

        updatedAt: new Date()
      }
    })
  }

  public async deleteCrateMarka(id: string) {
    await this.ensureInitialized()
    return await this.prisma.crateMarka.delete({
      where: { id }
    })
  }

  public async bulkDeleteCrateMarkas(ids: string[]) {
    await this.ensureInitialized()
    return await this.prisma.crateMarka.deleteMany({
      where: {
        id: { in: ids }
      }
    })
  }

  // ==================== ArrivalType Methods (Phase 14) ====================

  public async createArrivalType(data: {
    id: string
    companyId: string
    name: string
    purchaseType?: 'partyStock' | 'selfPurchase'
    vehicleNoByDefault?: string | null
    autoRoundOffAmount?: boolean
    askForAdditionalFields?: boolean
    requireForwardingAgent?: boolean
    requireBroker?: boolean
  }) {
    await this.ensureInitialized()
    return await this.prisma.arrivalType.create({
      data: {
        id: data.id,
        companyId: data.companyId,
        name: data.name,
        purchaseType: data.purchaseType ?? 'partyStock',
        vehicleNoByDefault: data.vehicleNoByDefault ?? null,
        autoRoundOffAmount: data.autoRoundOffAmount ?? false,
        askForAdditionalFields: data.askForAdditionalFields ?? false,
        requireForwardingAgent: data.requireForwardingAgent ?? false,
        requireBroker: data.requireBroker ?? false,
      }
    })
  }

  public async getArrivalTypesByCompany(companyId: string) {
    await this.ensureInitialized()
    return await this.prisma.arrivalType.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    })
  }

  public async getArrivalTypeById(id: string) {
    await this.ensureInitialized()
    return await this.prisma.arrivalType.findUnique({
      where: { id }
    })
  }

  public async updateArrivalType(id: string, data: any) {
    await this.ensureInitialized()
    return await this.prisma.arrivalType.update({
      where: { id },
      data: {
        ...data,

        updatedAt: new Date()
      }
    })
  }

  public async deleteArrivalType(id: string) {
    await this.ensureInitialized()
    return await this.prisma.arrivalType.delete({
      where: { id }
    })
  }

  public async bulkDeleteArrivalTypes(ids: string[]) {
    await this.ensureInitialized()
    return await this.prisma.arrivalType.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })
  }

  // ===========================
  // OtherChargesHead Management Methods (Phase 14.4)
  // ===========================

  public async createOtherChargesHead(data: {
    id: string
    companyId: string
    headingName: string
    printAs?: string | null
    accountHeadId?: string | null
    chargeType?: 'plus' | 'minus'
    feedAs?: 'absolute' | 'percentage' | 'onWeight' | 'onNug' | 'onPetti'
  }) {
    await this.ensureInitialized()
    return await this.prisma.otherChargesHead.create({
      data: {
        id: data.id,
        companyId: data.companyId,
        headingName: data.headingName,
        printAs: data.printAs ?? null,
        accountHeadId: data.accountHeadId ?? null,
        chargeType: data.chargeType ?? 'plus',
        feedAs: data.feedAs ?? 'absolute',
      }
    })
  }

  public async getOtherChargesHeadsByCompany(companyId: string) {
    await this.ensureInitialized()
    return await this.prisma.otherChargesHead.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    })
  }

  public async getOtherChargesHeadById(id: string) {
    await this.ensureInitialized()
    return await this.prisma.otherChargesHead.findUnique({
      where: { id }
    })
  }

  public async updateOtherChargesHead(id: string, data: any) {
    await this.ensureInitialized()
    return await this.prisma.otherChargesHead.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  public async deleteOtherChargesHead(id: string) {
    await this.ensureInitialized()
    return await this.prisma.otherChargesHead.delete({
      where: { id }
    })
  }

  public async bulkDeleteOtherChargesHeads(ids: string[]) {
    await this.ensureInitialized()
    return await this.prisma.otherChargesHead.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })
  }

  // ===========================
  // Packing Management Methods (Phase 8)
  // ===========================

  public async createPacking(data: {
    packingName: string
    calculate: string
    divideBy: number
    companyId: string
  }) {
    await this.ensureInitialized()
    return await this.prisma.packing.create({
      data: {
        packingName: data.packingName,
        calculate: data.calculate,
        divideBy: data.divideBy,
        companyId: data.companyId,

      }
    })
  }

  public async getPackingsByCompany(companyId: string) {
    await this.ensureInitialized()
    return await this.prisma.packing.findMany({
      where: { companyId },
      orderBy: { packingName: 'asc' }
    })
  }

  public async getPackingById(id: string) {
    await this.ensureInitialized()
    return await this.prisma.packing.findUnique({
      where: { id }
    })
  }

  public async findPackingByNameAndCompany(packingName: string, companyId: string) {
    await this.ensureInitialized()
    return await this.prisma.packing.findFirst({
      where: {
        packingName,
        companyId
      }
    })
  }

  public async updatePacking(
    id: string,
    data: {
      packingName?: string
      calculate?: string
      divideBy?: number
    }
  ) {
    await this.ensureInitialized()
    return await this.prisma.packing.update({
      where: { id },
      data: {
        ...data,

      }
    })
  }

  public async deletePacking(id: string) {
    await this.ensureInitialized()
    return await this.prisma.packing.delete({
      where: { id }
    })
  }

  public async bulkDeletePackings(ids: string[]) {
    await this.ensureInitialized()
    return await this.prisma.packing.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })
  }

  // ===========================
  // Store Management Methods (Phase 9)
  // ===========================

  public async createStore(data: {
    name: string
    companyId: string
    address?: string | null
    address2?: string | null
    address3?: string | null
    contactNo?: string | null
  }) {
    await this.ensureInitialized()
    return await this.prisma.store.create({
      data: {
        name: data.name,
        companyId: data.companyId,
        address: data.address || null,
        address2: data.address2 || null,
        address3: data.address3 || null,
        contactNo: data.contactNo || null
      }
    })
  }

  public async getStoresByCompany(companyId: string) {
    await this.ensureInitialized()
    return await this.prisma.store.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    })
  }

  public async getStoreById(id: string) {
    await this.ensureInitialized()
    return await this.prisma.store.findUnique({
      where: { id }
    })
  }

  public async findStoreByNameAndCompany(name: string, companyId: string) {
    await this.ensureInitialized()
    return await this.prisma.store.findFirst({
      where: {
        name,
        companyId
      }
    })
  }

  public async updateStore(
    id: string,
    data: {
      name?: string
      address?: string | null
      address2?: string | null
      address3?: string | null
      contactNo?: string | null
    }
  ) {
    await this.ensureInitialized()
    return await this.prisma.store.update({
      where: { id },
      data: {
        ...data
      }
    })
  }

  public async deleteStore(id: string) {
    await this.ensureInitialized()
    return await this.prisma.store.delete({
      where: { id }
    })
  }

  public async bulkDeleteStores(ids: string[]) {
    await this.ensureInitialized()
    return await this.prisma.store.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })
  }

  /**
   * Get the database file path
   */
  public getDatabasePath(): string {
    return this.dbPath
  }

  /**
   * Get Prisma client instance (for backup service)
   */
  public getPrisma(): PrismaClientType {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call getClient() first.')
    }
    return this.prisma
  }
}

export default DatabaseService


