import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import {
  selectTabs,
  selectActiveTabId,
  closeTab,
  setActiveTab,
  setTabUnsavedChanges,
  selectMaxTabsWarningShown,
  resetMaxTabsWarning,
  reorderTabs
} from '@/store/slices/tabSlice'
import { X, Circle } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useTranslation } from '@/hooks/useTranslation'

interface TabBarProps {
  onTabChange?: (route: string) => void
}

export function TabBar({ onTabChange }: TabBarProps) {
  const tabs = useAppSelector(selectTabs)
  const activeTabId = useAppSelector(selectActiveTabId)
  const maxTabsWarningShown = useAppSelector(selectMaxTabsWarningShown)
  const dispatch = useAppDispatch()
  const location = useLocation()
  const tabBarRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  
  // State for unsaved changes confirmation
  const [tabToClose, setTabToClose] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // State for drag and drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Show performance warning when many tabs are open
  useEffect(() => {
    if (tabs.length > 10 && maxTabsWarningShown) {
      toast.warning(t('tabBar.performanceNotice'), {
        description: t('tabBar.performanceWarning', { count: tabs.length }),
        duration: 5000,
      })
      dispatch(resetMaxTabsWarning())
    }
  }, [tabs.length, maxTabsWarningShown, dispatch, t])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+W: Close active tab
      if (event.ctrlKey && event.key === 'w') {
        event.preventDefault()
        if (activeTabId) {
          handleCloseTab(activeTabId)
        }
      }

      // Ctrl+Tab: Next tab
      if (event.ctrlKey && event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault()
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId)
        const nextIndex = (currentIndex + 1) % tabs.length
        const nextTab = tabs[nextIndex]
        dispatch(setActiveTab({ tabId: nextTab.id, currentPathname: location.pathname }))
        onTabChange?.(nextTab.currentRoute || nextTab.route)
      }

      // Ctrl+Shift+Tab: Previous tab
      if (event.ctrlKey && event.shiftKey && event.key === 'Tab') {
        event.preventDefault()
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId)
        const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
        const prevTab = tabs[prevIndex]
        dispatch(setActiveTab({ tabId: prevTab.id, currentPathname: location.pathname }))
        onTabChange?.(prevTab.currentRoute || prevTab.route)
      }

      // Ctrl+1 through Ctrl+9: Switch to tab by position
      if (event.ctrlKey && event.key >= '1' && event.key <= '9') {
        event.preventDefault()
        const tabIndex = parseInt(event.key) - 1
        if (tabIndex < tabs.length) {
          const targetTab = tabs[tabIndex]
          dispatch(setActiveTab({ tabId: targetTab.id, currentPathname: location.pathname }))
          onTabChange?.(targetTab.currentRoute || targetTab.route)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tabs, activeTabId, dispatch, onTabChange, location.pathname])

  const handleTabClick = (tabId: string, route: string, currentRoute?: string) => {
    // Save current tab's route before switching
    dispatch(setActiveTab({ tabId, currentPathname: location.pathname }))
    onTabChange?.(currentRoute || route)
  }

  const handleCloseTab = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    
    // Check for unsaved changes
    if (tab?.hasUnsavedChanges) {
      setTabToClose(tabId)
      setShowConfirmDialog(true)
      return
    }
    
    // Close immediately if no unsaved changes
    dispatch(closeTab(tabId))
  }

  const confirmCloseTab = () => {
    if (tabToClose) {
      // Clear unsaved changes flag before closing
      dispatch(setTabUnsavedChanges({ tabId: tabToClose, hasChanges: false }))
      dispatch(closeTab(tabToClose))
      setTabToClose(null)
      setShowConfirmDialog(false)
    }
  }

  const cancelCloseTab = () => {
    setTabToClose(null)
    setShowConfirmDialog(false)
  }

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null
    const Icon = (LucideIcons as any)[iconName]
    return Icon ? <Icon className="w-4 h-4" /> : null
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      dispatch(reorderTabs({ fromIndex: draggedIndex, toIndex: dropIndex }))
    }
    
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <>
      <div 
        ref={tabBarRef}
        className="flex items-center bg-white border-b border-gray-200 overflow-x-auto overflow-y-hidden h-10 shadow-sm"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex items-center h-full">
          {tabs.map((tab, index) => {
            const isActive = tab.id === activeTabId
            const isDragging = draggedIndex === index
            const isDragOver = dragOverIndex === index
            
            return (
              <div
                key={tab.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  group relative flex items-center gap-2 px-4 h-full min-w-[120px] max-w-[200px]
                  cursor-pointer select-none transition-colors
                  ${isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white hover:bg-gray-50'
                  }
                  ${isDragging ? 'opacity-50' : ''}
                  ${isDragOver ? 'border-l-2 border-l-blue-500' : index > 0 ? 'border-l border-gray-200' : ''}
                `}
                onClick={() => handleTabClick(tab.id, tab.route, tab.currentRoute)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  // Context menu will be shown via DropdownMenu
                }}
              >
                {/* Icon */}
                <div className={`shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {getIconComponent(tab.icon)}
                </div>

                {/* Title with unsaved indicator */}
                <span className={`
                  flex-1 truncate text-sm font-medium
                  ${isActive ? 'text-white' : 'text-gray-600'}
                `}>
                  {tab.title}
                  {tab.hasUnsavedChanges && (
                    <Circle className="inline-block w-2 h-2 ml-1 fill-current text-orange-500" />
                  )}
                </span>

                {/* Close button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCloseTab(tab.id)
                  }}
                  className={`
                    shrink-0 p-0.5 rounded transition-colors
                    ${isActive ? 'text-white hover:bg-blue-700 opacity-100' : 'text-gray-400 hover:bg-gray-200 opacity-0 group-hover:opacity-100'}
                  `}
                  title={t('tabBar.closeTabTooltip')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Tab count indicator */}
        {tabs.length > 5 && (
          <div className="ml-auto px-3 text-xs text-gray-500 shrink-0">
            {tabs.length} {tabs.length === 1 ? t('tabBar.tab') : t('tabBar.tabs')}
          </div>
        )}
      </div>

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tabBar.unsavedChanges')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tabBar.unsavedChangesMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelCloseTab}>{t('tabBar.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseTab} className="bg-red-600 hover:bg-red-700">
              {t('tabBar.closeTab')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
