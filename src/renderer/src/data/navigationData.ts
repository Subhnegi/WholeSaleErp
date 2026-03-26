import {
  Building2,
  Package,
  Tag,
  Truck,
  PackageOpen,
  FileSpreadsheet,
  Store,
  Users,
  Info,
  ShoppingCart,
  Receipt,
  FileEdit,
  TrendingUp,
  ArrowLeftRight,
  // Scale,
  PackageCheck,
  DollarSign,
  Landmark,
  BookOpen,
  ClipboardList,
  BarChart3,
  PieChart,
  FileBarChart,
  // Wrench,
  Calendar,
  // Settings,
  Shield,
  // UserPlus,
  FileText,
  // Smartphone
} from 'lucide-react'

// Navigation items now use translationKey for i18n support
// The Sidebar component will use t(item.translationKey) to get the translated name

export const masterItems = [
  { name: 'Accounts', translationKey: 'nav.master.accounts', icon: Building2, path: '/accounts', shortcut: 'Ctrl+A', hasShortcut: true },
  { name: 'Items', translationKey: 'nav.master.items', icon: Package, path: '/items', shortcut: 'Ctrl+I', hasShortcut: true },
  { name: 'Crate Marka', translationKey: 'nav.master.crateMarka', icon: Tag, path: '/crates', shortcut: '', hasShortcut: false },
  { name: 'Arrival Type', translationKey: 'nav.master.arrivalType', icon: Truck, path: '/arrival-types', shortcut: '', hasShortcut: false },
  { name: 'Other Charges Head', translationKey: 'nav.master.otherChargesHead', icon: DollarSign, path: '/other-charges-head', shortcut: '', hasShortcut: false },
  // { name: 'Packing', translationKey: 'nav.master.packing', icon: PackageOpen, path: '/packing', shortcut: '', hasShortcut: false },
  { name: 'Store', translationKey: 'nav.master.store', icon: Store, path: '/stores', shortcut: '', hasShortcut: false },
  { name: 'Bill Sundry', translationKey: 'nav.master.billSundry', icon: FileSpreadsheet, path: '/master/bill-sundry', shortcut: '', hasShortcut: false },
  // { name: 'User', translationKey: 'nav.master.user', icon: Users, path: '/master/user', shortcut: '', hasShortcut: false },
  { name: 'Company Info', translationKey: 'nav.master.companyInfo', icon: Info, path: '/master/company-info', shortcut: '', hasShortcut: false }
]

export const entriesGroups = [
  {
    name: 'Sales',
    translationKey: 'nav.entries.groups.sales',
    items: [
      { name: 'Quick Sale', translationKey: 'nav.entries.quickSale', icon: ShoppingCart, path: '/entries/quick-sale', shortcut: 'Ctrl+Q', hasShortcut: true },
      { name: 'Daily Sale', translationKey: 'nav.entries.dailySale', icon: TrendingUp, path: '/entries/daily-sale', shortcut: 'Ctrl+D', hasShortcut: true },
      { name: 'Stock Sale', translationKey: 'nav.entries.stockSale', icon: TrendingUp, path: '/entries/stock-sale', shortcut: 'Alt+S', hasShortcut: true }
    ]
  },
  {
    name: 'Arrivals & Stock',
    translationKey: 'nav.entries.groups.arrivalsStock',
    items: [
      { name: 'Arrival Book', translationKey: 'nav.entries.arrivalBook', icon: BookOpen, path: '/entries/arrival-book', shortcut: 'Alt+A', hasShortcut: true },
      { name: 'Seller Bill', translationKey: 'nav.entries.sellerBill', icon: Receipt, path: '/entries/seller-bill' },
      // { name: 'Retail Challan', translationKey: 'nav.entries.retailChallan', icon: FileText, path: '/entries/retail-challan' },
      // { name: 'Auction Sale', translationKey: 'nav.entries.auctionSale', icon: Scale, path: '/entries/auction-sale' }
    ]
  },
  // {
  //   name: 'Sale Proceeds',
  //   translationKey: 'nav.entries.groups.saleProceeds',
  //   items: [
  //     { name: 'Sale Proceeds - Manual', translationKey: 'nav.entries.saleProceedsManual', icon: DollarSign, path: '/entries/sale-proceeds-manual' }
  //   ]
  // },
  {
    name: 'Stock Management',
    translationKey: 'nav.entries.groups.stockManagement',
    items: [
      { name: 'Stock Transfer', translationKey: 'nav.entries.stockTransfer', icon: ArrowLeftRight, path: '/entries/stock-transfer' },
      { name: 'Stock Wattak', translationKey: 'nav.entries.stockWattak', icon: PackageOpen, path: '/entries/stock-wattak' }
    ]
  },
  // {
  //   name: 'Loading & Grower',
  //   translationKey: 'nav.entries.groups.loadingGrover',
  //   items: [
  //     { name: 'Loading', translationKey: 'nav.entries.loading', icon: Truck, path: '/entries/loading' },
  //     { name: 'Grower + Buyer Sale', translationKey: 'nav.entries.growerBuyerSale', icon: Users, path: '/entries/grower-buyer-sale' }
  //   ]
  // },
  {
    name: 'Crates',
    translationKey: 'nav.entries.groups.crates',
    items: [
      { name: 'Crate Entry', translationKey: 'nav.entries.crateEntry', icon: PackageOpen, path: '/entries/crate-entry', shortcut: 'Ctrl+Alt+C', hasShortcut: true }
    ]
  },
  {
    name: 'Payments & Banking',
    translationKey: 'nav.entries.groups.paymentsBanking',
    items: [
      { name: 'Quick Payment', translationKey: 'nav.entries.quickPayment', icon: DollarSign, path: '/entries/quick-payment' },
      { name: 'Quick Receipt', translationKey: 'nav.entries.quickReceipt', icon: DollarSign, path: '/entries/quick-receipt' },
      { name: 'Bank Entry', translationKey: 'nav.entries.bankEntry', icon: Landmark, path: '/entries/bank-entry' },
      { name: 'Journal', translationKey: 'nav.entries.journal', icon: BookOpen, path: '/entries/journal' }
    ]
  },
  {
    name: 'Store & Misc',
    translationKey: 'nav.entries.groups.storeMisc',
    items: [
      { name: 'Store Transfer', translationKey: 'nav.entries.storeTransfer', icon: Store, path: '/entries/store-transfer' },
      { name: 'Temporary Bill', translationKey: 'nav.entries.temporaryBill', icon: FileEdit, path: '/entries/temporary-bill' }
    ]
  }
]

export const reportsGroups = [
  {
    name: 'Financial Reports',
    translationKey: 'nav.reports.groups.financialReports',
    items: [
      { name: 'Balance Sheet', translationKey: 'nav.reports.balanceSheet', icon: FileBarChart, path: '/reports/balance-sheet' },
      { name: 'Profit & Loss', translationKey: 'nav.reports.profitLoss', icon: TrendingUp, path: '/reports/profit-loss' },
      // { name: 'Trading Account', translationKey: 'nav.reports.tradingAccount', icon: BarChart3, path: '/reports/trading-account' }
    ]
  },
  // {
  //   name: 'Trial Balance',
  //   translationKey: 'nav.reports.groups.trialBalance',
  //   items: [
  //     { name: 'Trial Balance', translationKey: 'nav.reports.trialBalance', icon: Scale, path: '/reports/trial-balance' }
  //   ]
  // },
  {
    name: 'Books',
    translationKey: 'nav.reports.groups.books',
    items: [
      { name: 'Day Book', translationKey: 'nav.reports.dayBook', icon: BookOpen, path: '/reports/day-book' },
      { name: 'Ledger', translationKey: 'nav.reports.ledger', icon: BookOpen, path: '/reports/ledger' },
      { name: 'Handy Ledger', translationKey: 'nav.reports.handyLedger', icon: BookOpen, path: '/reports/handy-ledger' },
      { name: 'Cash Book', translationKey: 'nav.reports.cashBook', icon: DollarSign, path: '/reports/cash-book' },
      { name: 'Cash Book Summary', translationKey: 'nav.reports.cashBookSummary', icon: FileText, path: '/reports/cash-book-summary' }
    ]
  },
  {
    name: 'Account Books',
    translationKey: 'nav.reports.groups.accountBooks',
    items: [
      { name: 'Account Books', translationKey: 'nav.reports.accountBooks', icon: BookOpen, path: '/reports/account-books' }
    ]
  },
  {
    name: 'Registers',
    translationKey: 'nav.reports.groups.registers',
    items: [
      { name: 'Quick Sale Register', translationKey: 'nav.reports.quickSaleRegister', icon: ClipboardList, path: '/reports/quick-sale-register' },
      { name: 'Daily Sale Register', translationKey: 'nav.reports.dailySaleRegister', icon: ClipboardList, path: '/reports/daily-sale-register' },
      { name: 'Stock Sale Register', translationKey: 'nav.reports.stockSaleRegister', icon: ClipboardList, path: '/reports/stock-sale-register' },
      { name: 'Arrival Register', translationKey: 'nav.reports.arrivalRegister', icon: ClipboardList, path: '/reports/arrival-register' }
    ]
  },
  {
    name: 'Profitability',
    translationKey: 'nav.reports.groups.profitability',
    items: [
      { name: 'Profitability Report', translationKey: 'nav.reports.profitabilityReport', icon: TrendingUp, path: '/reports/profitability-report' },
      { name: 'Cost & Profit Report', translationKey: 'nav.reports.costProfitReport', icon: BarChart3, path: '/reports/cost-profit-report' },
      { name: 'Laddan Profitability Report', translationKey: 'nav.reports.laddanProfitability', icon: PieChart, path: '/reports/laddan-profitability' }
    ]
  },
  {
    name: 'Seller & Supplier',
    translationKey: 'nav.reports.groups.sellerSupplier',
    items: [
      { name: 'Pending Seller Bills', translationKey: 'nav.reports.pendingSellerBills', icon: FileText, path: '/reports/pending-seller-bills' },
      { name: 'Supplier Report', translationKey: 'nav.reports.supplierReport', icon: Users, path: '/reports/supplier-report' },
      { name: 'Supplier Statement', translationKey: 'nav.reports.supplierStatement', icon: FileBarChart, path: '/reports/supplier-statement' }
    ]
  },
  {
    name: 'Summary Reports',
    translationKey: 'nav.reports.groups.summaryReports',
    items: [
      { name: 'Day Summary', translationKey: 'nav.reports.daySummary', icon: Calendar, path: '/reports/day-summary' },
      { name: 'Register', translationKey: 'nav.reports.register', icon: ClipboardList, path: '/reports/register' }
    ]
  },
  {
    name: 'Party Reports',
    translationKey: 'nav.reports.groups.partyReports',
    items: [
      { name: 'Party Bill - Summary', translationKey: 'nav.reports.partyBillSummary', icon: FileText, path: '/reports/party-bill-summary' },
      { name: 'Party Bill - Detailed', translationKey: 'nav.reports.partyBillDetailed', icon: FileBarChart, path: '/reports/party-bill-detailed' },
      { name: 'Collection Report', translationKey: 'nav.reports.collectionReport', icon: DollarSign, path: '/reports/collection-report' },
      { name: 'Sale Summary - Customer Bills', translationKey: 'nav.reports.saleSummaryCustomerBills', icon: ShoppingCart, path: '/reports/sale-summary-customer-bills' }
    ]
  },
  {
    name: 'Analysis',
    translationKey: 'nav.reports.groups.analysis',
    items: [
      { name: 'Outstanding Analysis', translationKey: 'nav.reports.outstandingAnalysis', icon: BarChart3, path: '/reports/outstanding-analysis' },
      { name: 'Ugrahi Register', translationKey: 'nav.reports.ugrahiRegister', icon: ClipboardList, path: '/reports/ugrahi-register' }
    ]
  }
]

export const cratesAnalysisItems = [
  { name: 'Crates Receivable', translationKey: 'nav.cratesAnalysis.cratesReceivable', icon: PackageCheck, path: '/crates-analysis/receivable' },
  { name: 'Crates Issuable', translationKey: 'nav.cratesAnalysis.cratesIssuable', icon: PackageOpen, path: '/crates-analysis/issuable' },
  { name: 'Crates Report', translationKey: 'nav.cratesAnalysis.cratesReport', icon: FileText, path: '/crates-analysis/report' },
  { name: 'Crates Details', translationKey: 'nav.cratesAnalysis.cratesDetails', icon: Info, path: '/crates-analysis/details' },
  { name: 'Crate Register', translationKey: 'nav.cratesAnalysis.crateRegister', icon: ClipboardList, path: '/crates-analysis/register' },
  { name: 'Crates Ledger', translationKey: 'nav.cratesAnalysis.cratesLedger', icon: BookOpen, path: '/crates-analysis/ledger' },
  { name: 'Crate Summary (Party Wise)', translationKey: 'nav.cratesAnalysis.crateSummaryPartyWise', icon: PieChart, path: '/crates-analysis/summary-party-wise' },
]

export const stockReportsItems = [
  { name: 'Store Ledger', translationKey: 'nav.stockReports.storeLedger', icon: BookOpen, path: '/stock-reports/store-ledger' },
  { name: 'Item Wise Stock In Store', translationKey: 'nav.stockReports.itemWiseStockInStore', icon: Package, path: '/stock-reports/item-wise-stock' },
  { name: 'Party Wise Stock Details', translationKey: 'nav.stockReports.partyWiseStockDetails', icon: Users, path: '/stock-reports/party-wise-stock' },
  { name: 'Party Wise Pendency', translationKey: 'nav.stockReports.partyWisePendency', icon: ClipboardList, path: '/stock-reports/party-wise-pendency' },
  { name: 'Pendency Report', translationKey: 'nav.stockReports.pendencyReport', icon: FileText, path: '/stock-reports/pendency-report' },
  { name: 'Stock Transfer Report', translationKey: 'nav.stockReports.stockTransferReport', icon: ArrowLeftRight, path: '/stock-reports/stock-transfer-report' },
]

export const toolItems = [
  // { name: 'Report Builder Tool', translationKey: 'nav.tool.reportBuilderTool', icon: Wrench, path: '/tool/report-builder' },
  // { name: 'Options', translationKey: 'nav.tool.options', icon: Settings, path: '/tool/options' },
  // { name: 'Reset Financial Year', translationKey: 'nav.tool.resetFinancialYear', icon: Calendar, path: '/tool/reset-financial-year' },
  // { name: 'Voucher Numbering', translationKey: 'nav.tool.voucherNumbering', icon: FileText, path: '/tool/voucher-numbering' },
  { name: 'Calculator', translationKey: 'nav.tool.calculator', icon: BarChart3, path: '/tool/calculator' },
  // { name: 'SMS & Whatsapp', translationKey: 'nav.tool.smsWhatsapp', icon: Smartphone, path: '/tool/sms-whatsapp-templates' },
  // { name: 'Merge Accounts', translationKey: 'nav.tool.mergeAccounts', icon: ArrowLeftRight, path: '/tool/merge-accounts' },
  // { name: 'Merge Crate Marka', translationKey: 'nav.tool.mergeCrateMarka', icon: Tag, path: '/tool/merge-crate-marka' },
  // { name: 'Expense Settings', translationKey: 'nav.tool.expenseSettings', icon: DollarSign, path: '/tool/expense-settings' },
  // { name: 'Charges Printing Order', translationKey: 'nav.tool.chargesPrintingOrder', icon: FileText, path: '/tool/charges-printing-order' },
  // { name: 'Import Data From Another Software', translationKey: 'nav.tool.importData', icon: ArrowLeftRight, path: '/tool/import-data' },
  // { name: 'Additional Fields', translationKey: 'nav.tool.additionalFields', icon: FileEdit, path: '/tool/additional-fields' },
  // { name: 'Business Promotions', translationKey: 'nav.tool.businessPromotions', icon: TrendingUp, path: '/tool/business-promotions' },
  // { name: 'Enable / Disable Features', translationKey: 'nav.tool.enableDisableFeatures', icon: Settings, path: '/tool/enable-disable-features' },
  // { name: 'Shortcut Buttons', translationKey: 'nav.tool.shortcutButtons', icon: Wrench, path: '/tool/shortcut-buttons' },
  // { name: 'System Settings', translationKey: 'nav.tool.systemSettings', icon: Settings, path: '/tool/system-settings' }
]

export const helpItems = [
  // { name: 'Register Now', translationKey: 'nav.help.registerNow', icon: UserPlus, path: '/help/register-now' },
  { name: 'License Info', translationKey: 'nav.help.licenseInfo', icon: Shield, path: '/help/license-info' },
  // { name: 'AMC Info', translationKey: 'nav.help.amcInfo', icon: Info, path: '/help/amc-info' },
  // { name: 'Rewrite Books of Accounts', translationKey: 'nav.help.rewriteBooks', icon: BookOpen, path: '/help/rewrite-books' },
  // { name: 'User Activity Report', translationKey: 'nav.help.userActivityReport', icon: Calendar, path: '/help/timeline' },
  // { name: 'Remove Null', translationKey: 'nav.help.removeNull', icon: FileEdit, path: '/help/remove-null' },
  { name: 'Feedback & Complaints', translationKey: 'nav.help.feedbackComplaints', icon: FileText, path: '/help/feedback-complaints' },
  // { name: 'Refer Software Friend List', translationKey: 'nav.help.referSoftwareFriendList', icon: Users, path: '/help/refer-software-friend-list' }
]
