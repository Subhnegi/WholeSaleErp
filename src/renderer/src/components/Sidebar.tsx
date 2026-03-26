import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../store/slices/authSlice'
import { openTab, resetTabs } from '../store/slices/tabSlice'
import { useTranslation } from '../hooks/useTranslation'
import { 
  User, 
  Home, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Package,
  FileText,
  BarChart3,
  Archive,
  Boxes
} from 'lucide-react'
import { Button } from './ui/button'
import {
  masterItems,
  entriesGroups,
  reportsGroups,
  cratesAnalysisItems,
  stockReportsItems
} from '../data/navigationData'
import { getRouteInfo } from '../utils/routeInfo'

interface SidebarProps {
  onNavigate?: (view: string) => void
  currentView?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ onNavigate, currentView = 'dashboard', isCollapsed: externalCollapsed, onToggleCollapse }: SidebarProps) {
  const { t } = useTranslation()
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed
  const [masterExpanded, setMasterExpanded] = useState(false)
  const [entriesExpanded, setEntriesExpanded] = useState(false)
  const [reportsExpanded, setReportsExpanded] = useState(false)
  const [cratesAnalysisExpanded, setCratesAnalysisExpanded] = useState(false)
  const [stockReportsExpanded, setStockReportsExpanded] = useState(false)
  const [hoveredSubmenu, setHoveredSubmenu] = useState<{ group: string; section: string } | null>(null)
  const [submenuPosition, setSubmenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPath, setContextMenuPath] = useState<string | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector((state) => state.auth.user)
  const license = useAppSelector((state) => state.auth.license)
  const activeCompany = useAppSelector((state) => state.company.activeCompany)

  const handleSubmenuHover = (group: string, section: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    const rect = event.currentTarget.getBoundingClientRect()
    setSubmenuPosition({
      top: rect.top,
      left: rect.right
    })
    setHoveredSubmenu({ group, section })
  }

  const handleSubmenuLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredSubmenu(null)
      setSubmenuPosition(null)
    }, 200)
  }

  const handleSubmenuEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
  }

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Hide Dashboard option when on company selection screen
  const isOnCompanyScreen = location.pathname === '/' || location.pathname === '/companies'
  
  const mainNavItems = [
    { id: 'dashboard', label: t('sidebar.dashboard'), icon: Home, path: '/dashboard' }
  ].filter(item => {
    // Hide dashboard when on company screen
    if (isOnCompanyScreen && item.id === 'dashboard') {
      return false
    }
    return true
  })

  const handleLogout = async () => {
    // Clear all tabs on logout
    dispatch(resetTabs())
    await dispatch(logout())
  }

  // Helper imported from shared utility

  const handleNavigation = (path: string, forceNewTab: boolean = false) => {
    // Open tab using Redux if company is selected
    if (activeCompany) {
      const routeInfo = getRouteInfo(path)
      dispatch(openTab({
        route: path,
        title: t(routeInfo.title),
        icon: routeInfo.icon,
        isTransaction: forceNewTab ? true : routeInfo.isTransaction // Force new tab if right-clicked
      }))
    }
    navigate(path)
  }

  const handleRightClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    setContextMenuPath(path)
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  const handleOpenInNewTab = () => {
    if (contextMenuPath) {
      handleNavigation(contextMenuPath, true)
      setShowContextMenu(false)
      setContextMenuPath(null)
      setContextMenuPosition(null)
    }
  }

  const handleOpenNormally = () => {
    if (contextMenuPath) {
      handleNavigation(contextMenuPath, false)
      setShowContextMenu(false)
      setContextMenuPath(null)
      setContextMenuPosition(null)
    }
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false)
        setContextMenuPath(null)
        setContextMenuPosition(null)
      }
    }

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showContextMenu])

  const handleMainNavigation = (itemId: string) => {
    // Use onNavigate callback if provided (for backwards compatibility)
    if (onNavigate) {
      onNavigate(itemId)
    }

    // Handle navigation with React Router and tabs
    switch (itemId) {
      case 'dashboard':
        if (activeCompany) {
          const path = `/dashboard/${activeCompany.id}`
          dispatch(openTab({
            route: '/dashboard',
            title: 'Dashboard',
            icon: 'LayoutDashboard',
            isTransaction: false
          }))
          navigate(path)
        } else {
          navigate('/dashboard')
        }
        break
      case 'companies':
        navigate('/companies')
        break
      case 'Crate Marka':
        if (activeCompany) {
          dispatch(openTab({
            route: '/crates',
            title: 'Crate/Marka',
            icon: 'Box',
            isTransaction: false
          }))
        }
        navigate('/crates')
        break
      default:
        break
    }
  }

  // Check if we're on the company management page
  const isOnCompanyPage = location.pathname === '/' || location.pathname === '/companies'

  // Check if we're on the dashboard
  const isDashboard = location.pathname.startsWith('/dashboard')

  // Check if current path is active
  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // Determine active item based on current location
  const getActiveMainItem = () => {
    if (isDashboard) return 'dashboard'
    if (isOnCompanyPage) return currentView
    // Extract from pathname
    const path = location.pathname.split('/')[1]
    return path || currentView
  }

  const activeMainItem = getActiveMainItem()

  const getDaysRemaining = () => {
    if (!license) return 0
    const endDate = new Date(license.endDate)
    const now = new Date()
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  return (
    <div 
      className={`
        ${isCollapsed ? 'w-16' : 'w-64'} 
        bg-white border-r border-gray-200 
        flex flex-col transition-all duration-300 ease-in-out
        shadow-sm
      `}
    >
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        {!isCollapsed && (
          <h1 className="text-lg font-semibold text-gray-800">
            {t('app.name')}
          </h1>
        )}
        <button
          onClick={() => {
            if (onToggleCollapse) {
              onToggleCollapse()
            } else {
              setInternalCollapsed(!internalCollapsed)
            }
          }}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            )}
          </div>

          {/* License Badge */}
          {!isCollapsed && license && (
            <div className="mt-3 p-2 rounded-md bg-indigo-50 border border-indigo-100">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-medium text-indigo-900">
                  {license.isTrial ? t('sidebar.trialLicense') : t('sidebar.fullLicense')}
                </span>
              </div>
              <p className="text-xs text-indigo-700">
                {getDaysRemaining()} {t('sidebar.daysRemaining')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {/* Main Navigation Items */}
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeMainItem === item.id

            return (
              <li key={item.id}>
                <button
                  onClick={() => handleMainNavigation(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-md
                    transition-colors duration-150
                    ${isActive 
                      ? 'bg-indigo-50 text-indigo-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                  {!isCollapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </button>
              </li>
            )
          })}

          {/* Collapsed view - show section icons */}
          {isCollapsed && !isOnCompanyPage && (
            <>
              <li className="pt-4">
                <button
                  onClick={() => {
                    if (onToggleCollapse && isCollapsed) {
                      onToggleCollapse()
                    } else if (externalCollapsed === undefined) {
                      setInternalCollapsed(false)
                    }
                    setMasterExpanded(true)
                  }}
                  className="w-full flex items-center justify-center px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  title={t('sidebar.master')}
                >
                  <Package className="w-5 h-5 text-gray-500" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onToggleCollapse && isCollapsed) {
                      onToggleCollapse()
                    } else if (externalCollapsed === undefined) {
                      setInternalCollapsed(false)
                    }
                    setEntriesExpanded(true)
                  }}
                  className="w-full flex items-center justify-center px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  title={t('sidebar.entries')}
                >
                  <FileText className="w-5 h-5 text-gray-500" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onToggleCollapse && isCollapsed) {
                      onToggleCollapse()
                    } else if (externalCollapsed === undefined) {
                      setInternalCollapsed(false)
                    }
                    setReportsExpanded(true)
                  }}
                  className="w-full flex items-center justify-center px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  title={t('sidebar.reports')}
                >
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onToggleCollapse && isCollapsed) {
                      onToggleCollapse()
                    } else if (externalCollapsed === undefined) {
                      setInternalCollapsed(false)
                    }
                    setCratesAnalysisExpanded(true)
                  }}
                  className="w-full flex items-center justify-center px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  title={t('sidebar.cratesAnalysis')}
                >
                  <Archive className="w-5 h-5 text-gray-500" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (onToggleCollapse && isCollapsed) {
                      onToggleCollapse()
                    } else if (externalCollapsed === undefined) {
                      setInternalCollapsed(false)
                    }
                    setStockReportsExpanded(true)
                  }}
                  className="w-full flex items-center justify-center px-3 py-2.5 rounded-md text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  title={t('sidebar.stockReports')}
                >
                  <Boxes className="w-5 h-5 text-gray-500" />
                </button>
              </li>
            </>
          )}

          {/* Master Section - Hidden on company management page */}
          {!isCollapsed && !isOnCompanyPage && (
            <>
              <li className="pt-4">
                <button
                  onClick={() => setMasterExpanded(!masterExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  <span>{t('sidebar.master')}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${masterExpanded ? 'rotate-180' : ''}`} />
                </button>
              </li>
              {masterExpanded && masterItems.map((item) => {
                const Icon = item.icon
                const isActive = isPathActive(item.path)

                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      onContextMenu={(e) => handleRightClick(e, item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-md
                        transition-colors duration-150 text-sm text-left
                        ${isActive 
                          ? 'bg-indigo-50 text-indigo-600 font-medium' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                      <span className="flex-1">{t(item.translationKey)}</span>
                      {item.hasShortcut && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-300 font-mono">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </>
          )}

          {/* Entries Section - Hidden on company management page */}
          {!isCollapsed && !isOnCompanyPage && (
            <>
              <li className="pt-4">
                <button
                  onClick={() => setEntriesExpanded(!entriesExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  <span>{t('sidebar.entries')}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${entriesExpanded ? 'rotate-180' : ''}`} />
                </button>
              </li>
              {entriesExpanded && entriesGroups.map((group) => (
                <li key={group.name} className="space-y-1 relative">
                  <button
                    onMouseEnter={(e) => handleSubmenuHover(group.name, 'entries', e)}
                    onMouseLeave={handleSubmenuLeave}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <span>{t(group.translationKey)}</span>
                    <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </>
          )}

          {/* Reports Section - Hidden on company management page */}
          {!isCollapsed && !isOnCompanyPage && (
            <>
              <li className="pt-4">
                <button
                  onClick={() => setReportsExpanded(!reportsExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  <span>{t('sidebar.reports')}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${reportsExpanded ? 'rotate-180' : ''}`} />
                </button>
              </li>
              {reportsExpanded && reportsGroups.map((group) => (
                <li key={group.name} className="space-y-1 relative">
                  <button
                    onMouseEnter={(e) => handleSubmenuHover(group.name, 'reports', e)}
                    onMouseLeave={handleSubmenuLeave}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <span>{t(group.translationKey)}</span>
                    <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </>
          )}

          {/* Crates Analysis Section - Hidden on company management page */}
          {!isCollapsed && !isOnCompanyPage && (
            <>
              <li className="pt-4">
                <button
                  onClick={() => setCratesAnalysisExpanded(!cratesAnalysisExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  <span>{t('sidebar.cratesAnalysis')}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${cratesAnalysisExpanded ? 'rotate-180' : ''}`} />
                </button>
              </li>
              {cratesAnalysisExpanded && cratesAnalysisItems.map((item) => {
                const Icon = item.icon
                const isActive = isPathActive(item.path)

                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      onContextMenu={(e) => handleRightClick(e, item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-md
                        transition-colors duration-150 text-sm text-left
                        ${isActive 
                          ? 'bg-indigo-50 text-indigo-600 font-medium' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                      <span>{t(item.translationKey)}</span>
                    </button>
                  </li>
                )
              })}
            </>
          )}

          {/* Stock Reports Section - Hidden on company management page */}
          {!isCollapsed && !isOnCompanyPage && (
            <>
              <li className="pt-4">
                <button
                  onClick={() => setStockReportsExpanded(!stockReportsExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  <span>{t('sidebar.stockReports')}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${stockReportsExpanded ? 'rotate-180' : ''}`} />
                </button>
              </li>
              {stockReportsExpanded && stockReportsItems.map((item) => {
                const Icon = item.icon
                const isActive = isPathActive(item.path)

                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      onContextMenu={(e) => handleRightClick(e, item.path)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-md
                        transition-colors duration-150 text-sm text-left
                        ${isActive 
                          ? 'bg-indigo-50 text-indigo-600 font-medium' 
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                      <span>{t(item.translationKey)}</span>
                    </button>
                  </li>
                )
              })}
            </>
          )}

          {/* Tool & Help sections migrated to menu bar */}
        </ul>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={`
            w-full justify-start gap-3 text-red-600 hover:text-red-700 
            hover:bg-red-50
            ${isCollapsed ? 'px-3' : ''}
          `}
          title={isCollapsed ? t('sidebar.logout') : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>{t('sidebar.logout')}</span>}
        </Button>
      </div>

      {/* Right Panel Submenu */}
      {hoveredSubmenu && submenuPosition && !isCollapsed && (
        <div
          ref={submenuRef}
          onMouseEnter={handleSubmenuEnter}
          onMouseLeave={handleSubmenuLeave}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50 min-w-[200px] max-w-[250px]"
          style={{
            top: `${submenuPosition.top}px`,
            left: `${submenuPosition.left + 8}px`
          }}
        >
          {hoveredSubmenu.section === 'entries' && 
            entriesGroups
              .find(g => g.name === hoveredSubmenu.group)
              ?.items.map((item) => {
                const Icon = item.icon
                const isActive = isPathActive(item.path)

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      handleNavigation(item.path)
                      setHoveredSubmenu(null)
                    }}
                    onContextMenu={(e) => {
                      handleRightClick(e, item.path)
                      setHoveredSubmenu(null)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2
                      transition-colors duration-150 text-sm text-left
                      ${isActive 
                        ? 'bg-indigo-50 text-indigo-600 font-medium' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                    <span className="flex-1">{t(item.translationKey)}</span>
                    {item.hasShortcut && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded border border-gray-300 font-mono">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                )
              })
          }
          {hoveredSubmenu.section === 'reports' && 
            reportsGroups
              .find(g => g.name === hoveredSubmenu.group)
              ?.items.map((item) => {
                const Icon = item.icon
                const isActive = isPathActive(item.path)

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      handleNavigation(item.path)
                      setHoveredSubmenu(null)
                    }}
                    onContextMenu={(e) => {
                      handleRightClick(e, item.path)
                      setHoveredSubmenu(null)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2
                      transition-colors duration-150 text-sm text-left
                      ${isActive 
                        ? 'bg-indigo-50 text-indigo-600 font-medium' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                    <span>{t(item.translationKey)}</span>
                  </button>
                )
              })
          }
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && contextMenuPosition && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
          style={{
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
          }}
        >
          <button
            onClick={handleOpenNormally}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {t('sidebar.openNormally')}
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {t('sidebar.openInNewTab')}
          </button>
        </div>
      )}
    </div>
  )
}
