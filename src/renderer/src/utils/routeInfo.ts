export interface RouteInfo {
  title: string
  icon: string
  isTransaction: boolean
}

const routeMap: Record<string, RouteInfo> = {
  '/dashboard': { title: 'sidebar.dashboard', icon: 'LayoutDashboard', isTransaction: false },
  '/accounts': { title: 'sidebar.accounts', icon: 'User', isTransaction: false },
  '/items': { title: 'sidebar.items', icon: 'Package', isTransaction: false },
  '/crates': { title: 'sidebar.crates', icon: 'Box', isTransaction: false },
  '/arrival-types': { title: 'sidebar.arrivalType', icon: 'Truck', isTransaction: false },
  '/other-charges-head': { title: 'nav.master.otherChargesHead', icon: 'DollarSign', isTransaction: false },
  '/packing': { title: 'sidebar.packing', icon: 'PackageOpen', isTransaction: false },
  '/stores': { title: 'sidebar.store', icon: 'Store', isTransaction: false },
  '/entries/quick-sale': { title: 'sidebar.quickSale', icon: 'ShoppingCart', isTransaction: true },
  '/entries/daily-sale': { title: 'sidebar.dailySale', icon: 'TrendingUp', isTransaction: true },
  '/entries/stock-sale': { title: 'sidebar.stockSale', icon: 'TrendingUp', isTransaction: true },
  '/entries/seller-bill': { title: 'sidebar.sellerBill', icon: 'Receipt', isTransaction: true },
  '/entries/arrival-book': { title: 'sidebar.arrivalBook', icon: 'BookOpen', isTransaction: true },
  '/entries/arrival-entry': { title: 'sidebar.arrivalEntry', icon: 'Truck', isTransaction: true },
  '/entries/crate-entry': { title: 'sidebar.crateEntry', icon: 'PackageOpen', isTransaction: true },
  '/entries/stock-transfer': { title: 'sidebar.stockTransfer', icon: 'ArrowLeftRight', isTransaction: true },
  '/entries/stock-wattak': { title: 'sidebar.stockWattak', icon: 'PackageOpen', isTransaction: true },
  '/entries/quick-receipt': { title: 'sidebar.quickReceipt', icon: 'DollarSign', isTransaction: true },
  '/entries/quick-payment': { title: 'sidebar.quickPayment', icon: 'DollarSign', isTransaction: true },
  '/crates-analysis/receivable': { title: 'sidebar.cratesReceivable', icon: 'PackageOpen', isTransaction: false },
  '/crates-analysis/issuable': { title: 'sidebar.cratesIssuable', icon: 'PackageOpen', isTransaction: false },
  '/crates-analysis/report': { title: 'sidebar.cratesReport', icon: 'PackageOpen', isTransaction: false },
  '/crates-analysis/details': { title: 'sidebar.cratesDetails', icon: 'PackageOpen', isTransaction: false },
  '/crates-analysis/register': { title: 'sidebar.crateRegister', icon: 'PackageOpen', isTransaction: false },
  '/crates-analysis/ledger': { title: 'sidebar.cratesLedger', icon: 'PackageOpen', isTransaction: false },
  '/crates-analysis/summary-party-wise': { title: 'sidebar.crateSummaryPartyWise', icon: 'PackageOpen', isTransaction: false },
  '/stock-reports/party-wise-stock': { title: 'sidebar.partyWiseStockDetails', icon: 'Users', isTransaction: false },
  '/stock-reports/store-ledger': { title: 'sidebar.storeLedger', icon: 'BookOpen', isTransaction: false },
  '/stock-reports/item-wise-stock': { title: 'sidebar.itemWiseStockInStore', icon: 'Package', isTransaction: false },
  '/stock-reports/party-wise-pendency': { title: 'sidebar.partyWisePendency', icon: 'ClipboardList', isTransaction: false },
  '/stock-reports/pendency-report': { title: 'sidebar.pendencyReport', icon: 'FileText', isTransaction: false },
  '/stock-reports/stock-transfer-report': { title: 'sidebar.stockTransferReport', icon: 'ArrowLeftRight', isTransaction: false },
  '/reports/stock-sale-register': { title: 'sidebar.stockSaleRegister', icon: 'ClipboardList', isTransaction: false },
  '/reports/daily-sale-register': { title: 'sidebar.dailySaleRegister', icon: 'ClipboardList', isTransaction: false },
  '/reports/quick-sale-register': { title: 'sidebar.quickSaleRegister', icon: 'ClipboardList', isTransaction: false },
  '/reports/arrival-register': { title: 'sidebar.arrivalRegister', icon: 'ClipboardList', isTransaction: false },
  '/reports/sale-summary-customer-bills': { title: 'sidebar.saleSummaryCustomerBills', icon: 'ClipboardList', isTransaction: false },
  '/reports/pending-seller-bills': { title: 'sidebar.pendingSellerBills', icon: 'FileText', isTransaction: false },
  '/reports/profitability-report': { title: 'sidebar.profitabilityReport', icon: 'TrendingUp', isTransaction: false },
  '/reports/laddan-profitability': { title: 'sidebar.laddanProfitability', icon: 'PieChart', isTransaction: false },
  '/reports/ledger': { title: 'sidebar.ledger', icon: 'BookOpen', isTransaction: false },
  '/reports/day-book': { title: 'sidebar.dayBook', icon: 'BookOpen', isTransaction: false },
  '/reports/handy-ledger': { title: 'sidebar.handyLedger', icon: 'BookOpen', isTransaction: false },
  '/reports/cash-book': { title: 'sidebar.cashBook', icon: 'DollarSign', isTransaction: false },
  '/reports/cash-book-summary': { title: 'sidebar.cashBookSummary', icon: 'FileText', isTransaction: false },
  '/reports/account-books': { title: 'sidebar.accountBooks', icon: 'BookOpen', isTransaction: false },
  '/reports/balance-sheet': { title: 'sidebar.balanceSheet', icon: 'FileBarChart', isTransaction: false },
  '/reports/profit-loss': { title: 'sidebar.profitLoss', icon: 'TrendingUp', isTransaction: false },
  '/reports/cost-profit-report': { title: 'sidebar.costProfitReport', icon: 'BarChart3', isTransaction: false },
  '/reports/ugrahi-register': { title: 'sidebar.ugrahiRegister', icon: 'ClipboardList', isTransaction: false },
  '/companies': { title: 'sidebar.companies', icon: 'Building2', isTransaction: false }
}

export function getRouteInfo(path: string): RouteInfo {
  return routeMap[path] || { title: 'Page', icon: 'FileText', isTransaction: false }
}
