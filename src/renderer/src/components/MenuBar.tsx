import React, { useState, useRef, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { openTab } from '@/store/slices/tabSlice'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  TrendingUp,
  Eye,
  Monitor,
  HelpCircle,
  Wrench,
  ChevronDown,
  RefreshCw,
  ToggleLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Bell,
  ExternalLink,
  FileText,
  Keyboard,
  Info,
  BookOpen,
  Package,
  Receipt,
  ArrowLeftRight
} from 'lucide-react'
import { toolItems, helpItems } from '@/data/navigationData'
import { useTranslation } from '@/hooks/useTranslation'
import { getRouteInfo } from '@/utils/routeInfo'

interface MenuBarProps {
  onToggleDevTools?: () => void
  onToggleFullscreen?: () => void
  onReload?: () => void
  onForceReload?: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onResetZoom?: () => void
  onMinimize?: () => void
  onMaximize?: () => void
  onCheckUpdates?: () => void
  onShowAbout?: () => void
  onShowKeyboardShortcuts?: () => void
  onToggleCalculator?: () => void
}

interface MenuItem {
  id: string
  label: string
  shortcut?: string
  icon?: React.ReactNode
  disabled?: boolean
  separator?: boolean
  action?: () => void
  submenu?: MenuItem[]
}

interface MenuSection {
  id: string
  label: string
  icon?: React.ReactNode
  items: MenuItem[]
  visible?: boolean
  action?: () => void // For direct button actions (no dropdown)
}

export function MenuBar({
  onToggleDevTools,
  onToggleFullscreen,
  onReload,
  onForceReload,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onMinimize,
  onMaximize,
  onCheckUpdates,
  onShowAbout,
  onShowKeyboardShortcuts,
  onToggleCalculator
}: MenuBarProps) {
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector(state => state.company)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Check if company is active for conditional menu visibility
  const hasActiveCompany = activeCompany !== null

  const handleOpenQuickSale = () => {
    dispatch(openTab({
      route: '/entries/quick-sale',
      title: 'Quick Sale',
      icon: 'ShoppingCart',
      isTransaction: true
    }))
  }

  const handleOpenDailySale = () => {
    dispatch(openTab({
      route: '/entries/daily-sale',
      title: 'Daily Sale',
      icon: 'TrendingUp',
      isTransaction: true
    }))
  }

  const handleOpenArrivalBook = () => {
    dispatch(openTab({
      route: '/entries/arrival-book',
      title: 'Arrival Book',
      icon: 'BookOpen',
      isTransaction: true
    }))
  }

  const handleOpenStockSale = () => {
    dispatch(openTab({
      route: '/entries/stock-sale',
      title: 'Stock Sale',
      icon: 'Package',
      isTransaction: true
    }))
  }

  const handleOpenSellerBill = () => {
    dispatch(openTab({
      route: '/entries/seller-bill',
      title: 'Seller Bill',
      icon: 'Receipt',
      isTransaction: true
    }))
  }

  const handleOpenStockTransfer = () => {
    dispatch(openTab({
      route: '/entries/stock-transfer',
      title: 'Stock Transfer',
      icon: 'ArrowLeftRight',
      isTransaction: true
    }))
  }

  const handleLearnMore = () => {
    if (window.api?.app?.openExternal) {
      window.api.app.openExternal('subhnegi.github.io/whole-sale-erp')
    }
  }

  const handleOpenDocumentation = () => {
    if (window.api?.app?.openDocumentation) {
      window.api.app.openDocumentation()
    }
  }

  const handleToggleCalculator = () => {
    if (onToggleCalculator) {
      onToggleCalculator()
    }
  }

  const handleRouteNavigation = (path: string) => {
    if (activeCompany) {
      const routeInfo = getRouteInfo(path)
      dispatch(openTab({
        route: path,
        title: t(routeInfo.title),
        icon: routeInfo.icon,
        isTransaction: routeInfo.isTransaction
      }))
    }
    navigate(path)
  }

  const toolMenuItems: MenuItem[] = toolItems.map(item => {
    const Icon = item.icon
    const menuItem: MenuItem = {
      id: `tool-${item.path}`,
      label: t(item.translationKey),
      icon: <Icon className="w-4 h-4" />
    }
    if (item.path === '/tool/calculator') {
      return {
        ...menuItem,
        action: handleToggleCalculator
      }
    }
    return {
      ...menuItem,
      action: () => handleRouteNavigation(item.path)
    }
  })

  const helpResourceMenuItems: MenuItem[] = helpItems.map(item => {
    const Icon = item.icon
    return {
      id: `help-${item.path}`,
      label: t(item.translationKey),
      icon: <Icon className="w-4 h-4" />,
      action: () => handleRouteNavigation(item.path)
    }
  })

  const helpMenuItems: MenuItem[] = [
    {
      id: 'check-updates',
      label: t('menu.checkUpdates'),
      icon: <RefreshCw className="w-4 h-4" />,
      action: onCheckUpdates
    },
    {
      id: 'separator-1',
      label: '',
      separator: true
    },
    {
      id: 'learn-more',
      label: t('menu.learnMore'),
      icon: <ExternalLink className="w-4 h-4" />,
      action: handleLearnMore
    },
    {
      id: 'documentation',
      label: t('menu.documentation'),
      icon: <FileText className="w-4 h-4" />,
      action: handleOpenDocumentation
    },
    {
      id: 'keyboard-shortcuts',
      label: t('menu.keyboardShortcuts'),
      shortcut: 'Ctrl+/',
      icon: <Keyboard className="w-4 h-4" />,
      action: onShowKeyboardShortcuts
    },
    {
      id: 'separator-2',
      label: '',
      separator: true
    },
    {
      id: 'about',
      label: t('menu.about'),
      icon: <Info className="w-4 h-4" />,
      action: onShowAbout
    },
    ...(helpResourceMenuItems.length
      ? [
          {
            id: 'separator-help-resources',
            label: '',
            separator: true
          },
          ...helpResourceMenuItems
        ]
      : [])
  ]

  const menuSections: MenuSection[] = [
    {
      id: 'quick-sale',
      label: t('nav.entries.quickSale'),
      icon: <ShoppingCart className="w-4 h-4" />,
      visible: hasActiveCompany,
      items: [],
      action: handleOpenQuickSale // Direct button action
    },
    {
      id: 'daily-sale',
      label: t('nav.entries.dailySale'),
      icon: <TrendingUp className="w-4 h-4" />,
      visible: hasActiveCompany,
      items: [],
      action: handleOpenDailySale // Direct button action
    },
    {
      id: 'arrival-book',
      label: t('nav.entries.arrivalBook'),
      icon: <BookOpen className="w-4 h-4" />,
      visible: hasActiveCompany,
      items: [],
      action: handleOpenArrivalBook // Direct button action
    },
    {
      id: 'stock-sale',
      label: t('nav.entries.stockSale'),
      icon: <Package className="w-4 h-4" />,
      visible: hasActiveCompany,
      items: [],
      action: handleOpenStockSale // Direct button action
    },
    {
      id: 'seller-bill',
      label: t('nav.entries.sellerBill'),
      icon: <Receipt className="w-4 h-4" />,
      visible: hasActiveCompany,
      items: [],
      action: handleOpenSellerBill
    },
    {
      id: 'stock-transfer',
      label: t('nav.entries.stockTransfer'),
      icon: <ArrowLeftRight className="w-4 h-4" />,
      visible: hasActiveCompany,
      items: [],
      action: handleOpenStockTransfer
    },
    {
      id: 'view',
      label: t('menu.view'),
      icon: <Eye className="w-4 h-4" />,
      visible: true,
      items: [
        ...(import.meta.env.DEV ? [
          {
            id: 'reload',
            label: t('menu.reload'),
            shortcut: 'Ctrl+R',
            icon: <RefreshCw className="w-4 h-4" />,
            action: onReload
          },
          {
            id: 'force-reload',
            label: t('menu.forceReload'),
            shortcut: 'Ctrl+Shift+R',
            icon: <RotateCcw className="w-4 h-4" />,
            action: onForceReload
          },
          {
            id: 'separator-1',
            label: '',
            separator: true
          },
          {
            id: 'toggle-devtools',
            label: t('menu.toggleDevTools'),
            shortcut: 'F12',
            icon: <ToggleLeft className="w-4 h-4" />,
            action: onToggleDevTools
          },
          {
            id: 'separator-2',
            label: '',
            separator: true
          }
        ] : []),
        {
          id: 'reset-zoom',
          label: t('menu.resetZoom'),
          shortcut: 'Ctrl+0',
          icon: <RotateCcw className="w-4 h-4" />,
          action: onResetZoom
        },
        {
          id: 'zoom-in',
          label: t('menu.zoomIn'),
          shortcut: 'Ctrl++',
          icon: <ZoomIn className="w-4 h-4" />,
          action: onZoomIn
        },
        {
          id: 'zoom-out',
          label: t('menu.zoomOut'),
          shortcut: 'Ctrl+-',
          icon: <ZoomOut className="w-4 h-4" />,
          action: onZoomOut
        },
        {
          id: 'separator-4',
          label: '',
          separator: true
        },
        {
          id: 'toggle-fullscreen',
          label: t('menu.toggleFullscreen'),
          shortcut: 'F11',
          icon: <Maximize2 className="w-4 h-4" />,
          action: onToggleFullscreen
        }
      ]
    },
    {
      id: 'window',
      label: t('menu.window'),
      icon: <Monitor className="w-4 h-4" />,
      visible: true,
      items: [
        {
          id: 'minimize',
          label: t('menu.minimize'),
          shortcut: 'Ctrl+M',
          icon: <Minimize2 className="w-4 h-4" />,
          action: onMinimize
        },
        {
          id: 'maximize',
          label: t('menu.maximize'),
          shortcut: 'Ctrl+Shift+M',
          icon: <Maximize2 className="w-4 h-4" />,
          action: onMaximize
        }
      ]
    },
    {
      id: 'tools',
      label: t('sidebar.tool'),
      icon: <Wrench className="w-4 h-4" />,
      visible: hasActiveCompany && toolMenuItems.length > 0,
      items: toolMenuItems
    },
    {
      id: 'help',
      label: t('menu.help'),
      icon: <HelpCircle className="w-4 h-4" />,
      visible: true,
      items: helpMenuItems
    }
  ]

  // Filter visible menu sections
  const visibleMenuSections = menuSections.filter(section => section.visible !== false)

  const handleMenuClick = (menuId: string) => {
    if (activeMenu === menuId) {
      setActiveMenu(null)
    } else {
      setActiveMenu(menuId)
    }
  }

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.action) {
      item.action()
    }
    setActiveMenu(null)
    setHoveredMenu(null)
  }

  const handleMouseEnter = (menuId: string) => {
    if (activeMenu) {
      setActiveMenu(menuId)
    }
    setHoveredMenu(menuId)
  }

  const handleMouseLeave = () => {
    if (!activeMenu) {
      setHoveredMenu(null)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [activeMenu])

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMenu(null)
        setHoveredMenu(null)
      }
    }

    if (activeMenu) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
    return undefined
  }, [activeMenu])

  return (
    <div
      ref={menuBarRef}
      className="h-8 bg-[#007ACC] text-white text-sm flex items-center px-3 select-none border-b border-[#005A9E] relative z-50"
    >
      {/* Menu Items */}
      <div className="flex items-center gap-1">
        {visibleMenuSections.map((section) => (
          <div
            key={section.id}
            className="relative"
            ref={(el) => { menuRefs.current[section.id] = el }}
          >
            {/* Menu Button */}
            <button
              onClick={() => {
                if (section.action) {
                  // Direct button action
                  section.action()
                  setActiveMenu(null)
                  setHoveredMenu(null)
                } else {
                  // Dropdown menu
                  handleMenuClick(section.id)
                }
              }}
              onMouseEnter={() => handleMouseEnter(section.id)}
              onMouseLeave={handleMouseLeave}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-sm transition-colors text-sm font-medium
                ${activeMenu === section.id || hoveredMenu === section.id
                  ? 'bg-white/15 text-white'
                  : 'text-white/90 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              {section.icon}
              <span>{section.label}</span>
              {!section.action && section.items.length > 0 && (
                <ChevronDown className={`w-3 h-3 transition-transform ${
                  activeMenu === section.id ? 'rotate-180' : ''
                }`} />
              )}
            </button>

            {/* Dropdown Menu */}
            {!section.action && activeMenu === section.id && section.items.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[200px] z-50">
                {section.items.map((item) => {
                  if (item.separator) {
                    return (
                      <div
                        key={item.id}
                        className="border-t border-gray-200 my-1"
                      />
                    )
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuItemClick(item)}
                      disabled={item.disabled}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-700
                        hover:bg-gray-100 hover:text-gray-900 transition-colors
                        ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {item.icon && (
                        <span className="shrink-0 text-gray-500">
                          {item.icon}
                        </span>
                      )}
                      <span className="flex-1">{item.label}</span>
                      {item.shortcut && (
                        <span className="text-xs text-gray-400 font-mono">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Company Status Indicator */}
      {!hasActiveCompany && (
        <div className="ml-auto flex items-center gap-2 text-xs text-white/70">
          <Bell className="w-3 h-3" />
          <span>{t('menu.selectCompany')}</span>
        </div>
      )}
    </div>
  )
}