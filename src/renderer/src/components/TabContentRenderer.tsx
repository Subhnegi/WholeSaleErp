import { CompanyManager } from '@/pages/CompanyManager'
import { Dashboard } from '@/pages/Dashboard'
import { AccountManagement } from '@/pages/AccountManagement'
import { ItemManagement } from '@/pages/ItemManagement'
import { CrateManagement } from '@/pages/CrateManagement'
import { CrateEntryManagement } from '@/pages/CrateEntryManagement'
import { CrateReceivablePage } from '@/pages/CrateReceivablePage'
import { CrateIssuablePage } from '@/pages/CrateIssuablePage'
import { CrateReportPage } from '@/pages/CrateReportPage'
import { CrateDetailPage } from '@/pages/CrateDetailPage'
import { CrateRegisterPage } from '@/pages/CrateRegisterPage'
import StockTransferEntryFormPage from '@/pages/StockTransferEntryFormPage'
import { CrateLedgerPage } from '@/pages/CrateLedgerPage'
import { CrateSummaryPage } from '@/pages/CrateSummaryPage'
import { ArrivalTypeManagement } from '@/pages/ArrivalTypeManagement'
import { OtherChargesHeadManagement } from '@/pages/OtherChargesHeadManagement'
import { PackingManagement } from '@/pages/PackingManagement'
import { StoreManagement } from '@/pages/StoreManagement'
import { QuickSaleManagement } from '@/pages/QuickSaleManagement'
import { QuickReceiptPage } from '@/pages/QuickReceiptPage'
import { DailySaleManagement } from '@/pages/DailySaleManagement'
import { DailySaleFormPage } from '@/pages/DailySaleFormPage'
import { ArrivalBookManagement } from '@/pages/ArrivalBookManagement'
import ArrivalEntryFormPage from '@/pages/ArrivalEntryFormPage'
import { StockSaleManagement } from '@/pages/StockSaleManagement'
import { StockSaleFormPage } from '@/pages/StockSaleFormPage'
import { SellerBillManagement } from '@/pages/SellerBillManagement'
import SellerBillEntryFormPage from '@/pages/SellerBillEntryFormPage'
import { StockTransferManagement } from '@/pages/StockTransferManagement'
import { StockWattakManagement } from '@/pages/StockWattakManagement'
import StockWattakEntryFormPage from '@/pages/StockWattakEntryFormPage'
import { PartyWiseStockDetailsPage } from '@/pages/PartyWiseStockDetailsPage'
import { ItemWiseStockDetailsPage } from '@/pages/ItemWiseStockDetailsPage'
import { PartyWisePendencyPage } from '@/pages/PartyWisePendencyPage'
import { PendencyReportPage } from '@/pages/PendencyReportPage'
import { StockTransferReportPage } from '@/pages/StockTransferReportPage'
import { StoreLedgerPage } from '@/pages/StoreLedgerPage'
import { StockSaleRegisterPage } from '@/pages/StockSaleRegisterPage'
import { DailySaleRegisterPage } from '@/pages/DailySaleRegisterPage'
import { QuickSaleRegisterPage } from '@/pages/QuickSaleRegisterPage'
import { ArrivalRegisterPage } from '@/pages/ArrivalRegisterPage'
import { SaleSummaryCustomerBillsPage } from '@/pages/SaleSummaryCustomerBillsPage'
import { PendingSellerBillsPage } from '@/pages/PendingSellerBillsPage'
import { ProfitabilityReportPage } from '@/pages/ProfitabilityReportPage'
import { LaddanProfitabilityReportPage } from '@/pages/LaddanProfitabilityReportPage'
import { LedgerPage } from '@/pages/LedgerPage'
import { UgrahiRegisterPage } from '@/pages/UgrahiRegisterPage'
import { Navigate } from 'react-router-dom'
import { QuickPaymentPage } from '@renderer/pages/QuickPaymentPage'

interface TabContentRendererProps {
  route: string
  currentRoute: string  // Current active route including sub-routes
  tabId: string
}

/**
 * Renders the appropriate component based on the route
 * This allows multiple instances of the same component to exist simultaneously
 * but only the active tab is visible
 * 
 * IMPORTANT: We pass currentRoute to form pages so they can extract the ID
 * from the tab's stored route instead of using useParams() which reads
 * from the browser URL (could be wrong when multiple tabs are open)
 */
export function TabContentRenderer({ route, currentRoute, tabId }: TabContentRendererProps) {
  // For stock sale, check if we're in a sub-route (new/edit)
  if (route === '/entries/stock-sale') {
    if (currentRoute === '/entries/stock-sale/new' || currentRoute.startsWith('/entries/stock-sale/edit/')) {
      return <StockSaleFormPage tabId={tabId} currentRoute={currentRoute} />
    }
    return <StockSaleManagement tabId={tabId} />
  }

  // For daily sale, check if we're in a sub-route (new/edit)
  if (route === '/entries/daily-sale') {
    if (currentRoute === '/entries/daily-sale/new' || currentRoute.startsWith('/entries/daily-sale/edit/')) {
      return <DailySaleFormPage tabId={tabId} currentRoute={currentRoute} />
    }
    return <DailySaleManagement tabId={tabId} />
  }

  // For arrival entry, check if we're in a sub-route (new/edit)
  if (route === '/entries/arrival-entry') {
    if (currentRoute === '/entries/arrival-entry/new' || currentRoute.startsWith('/entries/arrival-entry/edit/')) {
      return <ArrivalEntryFormPage tabId={tabId} currentRoute={currentRoute} />
    }
    // Default to arrival book if no sub-route
    return <ArrivalBookManagement tabId={tabId} />
  }
  
  // For all other routes, use the tab's stored route
  switch (route) {
    case '/':
    case '/companies':
      return <CompanyManager />
    case '/dashboard':
      return <Dashboard />
    case '/accounts':
      return <AccountManagement />
    case '/items':
      return <ItemManagement />
    case '/crates':
      return <CrateManagement />
    case '/arrival-types':
      return <ArrivalTypeManagement />
    case '/other-charges-head':
      return <OtherChargesHeadManagement />
    case '/packing':
      return <PackingManagement />
    case '/stores':
      return <StoreManagement />
    case '/entries/quick-sale':
      return <QuickSaleManagement tabId={tabId} />
    case '/entries/quick-receipt':
      return <QuickReceiptPage tabId={tabId} />
    case '/entries/quick-payment':
      return <QuickPaymentPage tabId={tabId} />
    case '/entries/arrival-book':
      // Check for sub-routes (new/edit)
      if (currentRoute === '/entries/arrival-book/new' || currentRoute.startsWith('/entries/arrival-book/edit/')) {
        return <ArrivalEntryFormPage tabId={tabId} currentRoute={currentRoute} />
      }
      return <ArrivalBookManagement tabId={tabId} />
    case '/entries/crate-entry':
      return <CrateEntryManagement tabId={tabId} />
    case '/entries/stock-sale':
      return <StockSaleManagement tabId={tabId} />
    case '/entries/stock-transfer':
      if (
        currentRoute === '/entries/stock-transfer/new' ||
        currentRoute.startsWith('/entries/stock-transfer/edit/')
      ) {
        return <StockTransferEntryFormPage tabId={tabId} currentRoute={currentRoute} />
      }
      return <StockTransferManagement tabId={tabId} />
    case '/entries/seller-bill':
      if (currentRoute === '/entries/seller-bill/new' || currentRoute.startsWith('/entries/seller-bill/edit/')) {
        return <SellerBillEntryFormPage tabId={tabId} currentRoute={currentRoute} />
      }
      return <SellerBillManagement tabId={tabId} />
    case '/entries/stock-wattak':
      if (
        currentRoute === '/entries/stock-wattak/new' ||
        currentRoute.startsWith('/entries/stock-wattak/edit/')
      ) {
        return <StockWattakEntryFormPage tabId={tabId} currentRoute={currentRoute} />
      }
      return <StockWattakManagement tabId={tabId} />
    case '/crates-analysis/receivable':
      return <CrateReceivablePage />
    case '/crates-analysis/issuable':
      return <CrateIssuablePage />
    case '/crates-analysis/report':
      return <CrateReportPage />
    case '/crates-analysis/details':
      return <CrateDetailPage />
    case '/crates-analysis/register':
      return <CrateRegisterPage />
    case '/crates-analysis/ledger':
      return <CrateLedgerPage />
    case '/crates-analysis/summary-party-wise':
      return <CrateSummaryPage />
    case '/stock-reports/party-wise-stock':
      return <PartyWiseStockDetailsPage />
    case '/stock-reports/item-wise-stock':
      return <ItemWiseStockDetailsPage />
    case '/stock-reports/store-ledger':
      return <StoreLedgerPage />
    case '/stock-reports/party-wise-pendency':
      return <PartyWisePendencyPage />
    case '/stock-reports/pendency-report':
      return <PendencyReportPage />
    case '/stock-reports/stock-transfer-report':
      return <StockTransferReportPage />
    case '/reports/stock-sale-register':
      return <StockSaleRegisterPage />
    case '/reports/quick-sale-register':
      return <QuickSaleRegisterPage />
    case '/reports/daily-sale-register':
      return <DailySaleRegisterPage />
    case '/reports/arrival-register':
      return <ArrivalRegisterPage />
    case '/reports/pending-seller-bills':
      return <PendingSellerBillsPage />
    case '/reports/profitability-report':
      return <ProfitabilityReportPage />
    case '/reports/laddan-profitability':
      return <LaddanProfitabilityReportPage />
    case '/reports/ledger':
      return <LedgerPage />
    case '/reports/sale-summary-customer-bills':
      return <SaleSummaryCustomerBillsPage />
    case '/reports/ugrahi-register':
      return <UgrahiRegisterPage />
    default:
      // Handle dynamic routes or fallback
      if (route.startsWith('/dashboard/')) {
        return <Dashboard />
      }
      return <Navigate to="/dashboard" replace />
  }
}
