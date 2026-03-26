import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { Sidebar } from './Sidebar'
import { RightSidebar } from './RightSidebar'
import { StatusBar } from './StatusBar'
import { TabBar } from './TabBar'
import { TabContentRenderer } from './TabContentRenderer'
import { MenuBar } from './MenuBar'
import { selectTabs, selectActiveTabId, openTab, updateTabRoute } from '@/store/slices/tabSlice'
import { useTranslation } from '@/hooks/useTranslation'

interface MainLayoutProps {
  children?: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [currentView, setCurrentView] = useState('dashboard')
  const [showRightSidebar, setShowRightSidebar] = useState(false)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [showCalculator, setShowCalculator] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  const { activeCompany } = useAppSelector((state) => state.company)
  const tabs = useAppSelector(selectTabs)
  const activeTabId = useAppSelector(selectActiveTabId)

  const lastSyncedPathRef = useRef(location.pathname)

  // Sync location.pathname to active tab's currentRoute
  // Only runs when the actual browser path changes to avoid copying stale routes
  useEffect(() => {
    if (location.pathname === lastSyncedPathRef.current) {
      return
    }

    lastSyncedPathRef.current = location.pathname

    if (!activeTabId) return

    const activeTab = tabs.find(t => t.id === activeTabId)
    if (!activeTab || activeTab.currentRoute === location.pathname) return

    const baseRoute = activeTab.route
    const matchesBaseRoute =
      location.pathname === baseRoute ||
      location.pathname.startsWith(baseRoute + '/')

    if (matchesBaseRoute) {
      dispatch(updateTabRoute({ tabId: activeTabId, currentRoute: location.pathname }))
    }
  }, [location.pathname, activeTabId, tabs, dispatch])

  // Listen for navigation events from main process (Electron menu)
  useEffect(() => {
    const handleNavigate = (_event: unknown, path: string) => {
      if (activeCompany) {
        // Determine if this is a transaction page
        const transactionRoutes = [
          '/entries/quick-sale',
          '/entries/daily-sale',
          '/entries/crate-entry',
          '/entries/seller-bill',
          '/entries/stock-transfer'
        ]
        const isTransaction = transactionRoutes.includes(path)
        
        // Get icon and title based on route
        const routeInfo = getRouteInfo(path)
        
        // Open tab using Redux action
        dispatch(openTab({
          route: path,
          title: t(routeInfo.title),
          icon: routeInfo.icon,
          isTransaction
        }))
        
        navigate(path)
      }
    }

    window.electron.ipcRenderer.on('navigate-to', handleNavigate)

    return () => {
      window.electron.ipcRenderer.removeListener('navigate-to', handleNavigate)
    }
  }, [navigate, activeCompany, dispatch])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Disabled paths where shortcuts shouldn't work
      const disabledPaths = ['/companies', '/', '/login', '/register', '/starter']
      const currentPath = location.pathname
      
      if (disabledPaths.includes(currentPath)) {
        return // Don't prevent default, allow normal behavior
      }
      
      // Global shortcuts (work everywhere)
      // Ctrl+Shift+\ : Toggle right sidebar
      if (event.ctrlKey && event.shiftKey && (event.key === '\\' || event.key === '|' || event.code === 'Backslash')) {
        event.preventDefault()
        setShowRightSidebar(prev => !prev)
        return
      }
      
      // Ctrl+\ : Toggle left sidebar
      if (event.ctrlKey && !event.shiftKey && (event.key === '\\' || event.code === 'Backslash')) {
        event.preventDefault()
        setShowLeftSidebar(prev => !prev)
        return
      }
      
      // Alt+C : Toggle calculator (but not when Ctrl is also pressed)
      if (event.altKey && !event.ctrlKey && event.key === 'c') {
        event.preventDefault()
        setShowCalculator(prev => !prev)
        return
      }
      
      // ESC : Close any open modal/dialog
      if (event.key === 'Escape') {
        // Close calculator if open
        if (showCalculator) {
          setShowCalculator(false)
          return
        }
        // Close right sidebar if open
        if (showRightSidebar) {
          setShowRightSidebar(false)
          return
        }
        // Other modals will handle their own ESC key
      }
      
      // Ctrl+A: Navigate to Account Management (only if company selected)
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault() // Prevent default "Select All" behavior
        
        if (activeCompany) {
          dispatch(openTab({
            route: '/accounts',
            title: 'Accounts',
            icon: 'User',
            isTransaction: false
          }))
          navigate('/accounts')
          setCurrentView('accounts')
        }
      }
      
      // Ctrl+I: Navigate to Item Management (only if company selected)
      if (event.ctrlKey && event.key === 'i') {
        event.preventDefault() // Prevent default behavior
        
        if (activeCompany) {
          dispatch(openTab({
            route: '/items',
            title: 'Items',
            icon: 'Package',
            isTransaction: false
          }))
          navigate('/items')
          setCurrentView('items')
        }
      }
      
      // Ctrl+Q: Navigate to Quick Sale (only if company selected)
      if (event.ctrlKey && event.key === 'q') {
        event.preventDefault() // Prevent default behavior
        
        if (activeCompany) {
          dispatch(openTab({
            route: '/entries/quick-sale',
            title: 'Quick Sale',
            icon: 'ShoppingCart',
            isTransaction: true // Always open in new tab
          }))
          navigate('/entries/quick-sale')
          setCurrentView('quick-sale')
        }
      }
      
      // Ctrl+D: Navigate to Daily Sale (only if company selected)
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault() // Prevent default behavior
        
        if (activeCompany) {
          dispatch(openTab({
            route: '/entries/daily-sale',
            title: 'Daily Sale',
            icon: 'TrendingUp',
            isTransaction: true // Always open in new tab
          }))
          navigate('/entries/daily-sale')
          setCurrentView('daily-sale')
        }
      }

      // Ctrl+Alt+C: Navigate to Crate Entry (only if company selected)
      if (event.ctrlKey && event.altKey && event.key === 'c') {
        event.preventDefault() // Prevent default behavior
        
        if (activeCompany) {
          dispatch(openTab({
            route: '/entries/crate-entry',
            title: 'Crate Entry',
            icon: 'PackageOpen',
            isTransaction: true // Always open in new tab
          }))
          navigate('/entries/crate-entry')
          setCurrentView('crate-entry')
        }
      }

      // Alt+A: Navigate to Arrival Book (only if company selected)
      if (event.altKey && !event.ctrlKey && event.key === 'a') {
        event.preventDefault() // Prevent default behavior
        
        if (activeCompany) {
          dispatch(openTab({
            route: '/entries/arrival-book',
            title: 'Arrival Book',
            icon: 'BookOpen',
            isTransaction: true // Always open in new tab
          }))
          navigate('/entries/arrival-book')
          setCurrentView('arrival-book')
        }
      }

      // Alt+S: Navigate to Stock Sale (only if company selected)
      if (event.altKey && !event.ctrlKey && event.key === 's') {
        event.preventDefault() // Prevent default behavior
        
        if (activeCompany) {
          dispatch(openTab({
            route: '/entries/stock-sale',
            title: 'Stock Sale',
            icon: 'Package',
            isTransaction: true // Always open in new tab
          }))
          navigate('/entries/stock-sale')
          setCurrentView('stock-sale')
        }
      }

      // Alt+B: Navigate to Seller Bill (only if company selected)
      if (event.altKey && !event.ctrlKey && event.key === 'b') {
        event.preventDefault()

        if (activeCompany) {
          dispatch(openTab({
            route: '/entries/seller-bill',
            title: 'Seller Bill',
            icon: 'Receipt',
            isTransaction: true
          }))
          navigate('/entries/seller-bill')
          setCurrentView('seller-bill')
        }
      }

      // Alt+T: Navigate to Stock Transfer (only if company selected)
      if (event.altKey && !event.ctrlKey && event.key === 't') {
        event.preventDefault()

        if (activeCompany) {
          dispatch(openTab({
            route: '/entries/stock-transfer',
            title: 'Stock Transfer',
            icon: 'ArrowLeftRight',
            isTransaction: true
          }))
          navigate('/entries/stock-transfer')
          setCurrentView('stock-transfer')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [navigate, activeCompany, location.pathname, dispatch, showCalculator, showRightSidebar])

  // Helper function to get route info (title and icon)
  const getRouteInfo = (route: string): { title: string; icon: string } => {
    const routeMap: Record<string, { title: string; icon: string }> = {
      '/dashboard': { title: 'sidebar.dashboard', icon: 'LayoutDashboard' },
      '/accounts': { title: 'sidebar.accounts', icon: 'User' },
      '/items': { title: 'sidebar.items', icon: 'Package' },
      '/crates': { title: 'sidebar.crates', icon: 'Box' },
      '/arrival-types': { title: 'sidebar.arrivalType', icon: 'Truck' },
      '/packing': { title: 'sidebar.packing', icon: 'PackageOpen' },
      '/stores': { title: 'sidebar.store', icon: 'Store' },
      '/entries/quick-sale': { title: 'sidebar.quickSale', icon: 'ShoppingCart' },
      '/entries/daily-sale': { title: 'sidebar.dailySale', icon: 'TrendingUp' },
      '/entries/crate-entry': { title: 'sidebar.crateEntry', icon: 'PackageOpen' },
      '/entries/arrival-book': { title: 'sidebar.arrivalBook', icon: 'BookOpen' },
      '/entries/stock-sale': { title: 'sidebar.stockSale', icon: 'Package' },
      '/entries/stock-transfer': { title: 'sidebar.stockTransfer', icon: 'ArrowLeftRight' },
      '/entries/seller-bill': { title: 'sidebar.sellerBill', icon: 'Receipt' },
      '/companies': { title: 'sidebar.companies', icon: 'Building2' },
    }
    
    return routeMap[route] || { title: 'Page', icon: 'FileText' }
  }

  // Handle tab change from TabBar
  const handleTabChange = (route: string) => {
    navigate(route)
  }

  // Menu action handlers
  const handleReload = () => {
    window.location.reload()
  }

  const handleForceReload = () => {
    if (window.api?.app?.forceReload) {
      window.api.app.forceReload()
    } else {
      window.location.reload()
    }
  }

  const handleToggleDevTools = () => {
    if (window.api?.app?.toggleDevTools) {
      window.api.app.toggleDevTools()
    }
  }

  const handleToggleFullscreen = () => {
    if (window.api?.app?.toggleFullscreen) {
      window.api.app.toggleFullscreen()
    }
  }

  const handleZoomIn = () => {
    if (window.api?.app?.zoomIn) {
      window.api.app.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (window.api?.app?.zoomOut) {
      window.api.app.zoomOut()
    }
  }

  const handleResetZoom = () => {
    if (window.api?.app?.resetZoom) {
      window.api.app.resetZoom()
    }
  }

  const handleMinimize = () => {
    if (window.api?.app?.minimize) {
      window.api.app.minimize()
    }
  }

  const handleMaximize = () => {
    if (window.api?.app?.maximize) {
      window.api.app.maximize()
    }
  }

  // const handleClose = () => {
  //   if (window.api?.app?.close) {
  //     window.api.app.close()
  //   }
  // }

  const handleCheckUpdates = () => {
    if (window.api?.app?.checkForUpdates) {
      window.api.app.checkForUpdates()
    }
  }

  const handleShowAbout = () => {
    if (window.api?.app?.showAbout) {
      window.api.app.showAbout()
    }
  }

  const handleShowKeyboardShortcuts = () => {
    setShowRightSidebar(true)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Menu Bar - Always visible */}
      <MenuBar
        onReload={handleReload}
        onForceReload={handleForceReload}
        onToggleDevTools={handleToggleDevTools}
        onToggleFullscreen={handleToggleFullscreen}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onCheckUpdates={handleCheckUpdates}
        onShowAbout={handleShowAbout}
        onShowKeyboardShortcuts={handleShowKeyboardShortcuts}
        onToggleCalculator={() => setShowCalculator(prev => !prev)}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Full height below MenuBar */}
        <Sidebar 
          onNavigate={setCurrentView} 
          currentView={currentView} 
          isCollapsed={!showLeftSidebar}
          onToggleCollapse={() => setShowLeftSidebar(!showLeftSidebar)}
        />
        
        {/* Right side: Tab Bar + Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Tab Bar - Only show when company is selected */}
          {activeCompany && <TabBar onTabChange={handleTabChange} />}
          
          {/* Main content area with tab rendering */}
          {activeCompany ? (
            <main className="flex-1 overflow-hidden relative">
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
                  className="h-full overflow-y-auto"
                >
                  <TabContentRenderer 
                    route={tab.route} 
                    currentRoute={tab.currentRoute || tab.route} 
                    tabId={tab.id} 
                  />
                </div>
              ))}
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          )}
        </div>
        
        <RightSidebar isOpen={showRightSidebar} onClose={() => setShowRightSidebar(false)} />
      </div>
      <StatusBar 
        onToggleRightSidebar={() => setShowRightSidebar(!showRightSidebar)}
        showCalculator={showCalculator}
        onToggleCalculator={() => setShowCalculator(!showCalculator)}
      />
    </div>
  )
}
