import { Keyboard, X } from 'lucide-react'
import { Button } from './ui/button'
import { useTranslation } from '../hooks/useTranslation'

interface RightSidebarProps {
  isOpen: boolean
  onClose?: () => void
}

export function RightSidebar({ isOpen, onClose }: RightSidebarProps) {
  const { t } = useTranslation()

  const shortcuts = [
    {
      categoryKey: 'rightSidebar.categories.navigation',
      items: [
        { key: 'Ctrl + A', descriptionKey: 'rightSidebar.shortcuts.openAccounts' },
        { key: 'Ctrl + I', descriptionKey: 'rightSidebar.shortcuts.openItems' },
        { key: 'Ctrl + Q', descriptionKey: 'rightSidebar.shortcuts.openQuickSale' },
        { key: 'Ctrl + D', descriptionKey: 'rightSidebar.shortcuts.openDailySale' },
        { key: 'Alt + A', descriptionKey: 'rightSidebar.shortcuts.openArrivalBook' },
        { key: 'Alt + S', descriptionKey: 'rightSidebar.shortcuts.openStockSale' },
        { key: 'Alt + T', descriptionKey: 'rightSidebar.shortcuts.openStockTransfer' },
        { key: 'Ctrl + Alt + C', descriptionKey: 'rightSidebar.shortcuts.openCrateEntry' },
      ]
    },
    {
      categoryKey: 'rightSidebar.categories.tabManagement',
      items: [
        { key: 'Ctrl + W', descriptionKey: 'rightSidebar.shortcuts.closeActiveTab' },
        { key: 'Ctrl + Tab', descriptionKey: 'rightSidebar.shortcuts.nextTab' },
        { key: 'Ctrl + Shift + Tab', descriptionKey: 'rightSidebar.shortcuts.previousTab' },
        { key: 'Ctrl + 1-9', descriptionKey: 'rightSidebar.shortcuts.switchToTabByNumber' },
      ]
    },
    {
      categoryKey: 'rightSidebar.categories.actions',
      items: [
        { key: 'Enter', descriptionKey: 'rightSidebar.shortcuts.addAndApplyQuickSale' },
        { key: 'Ctrl + S', descriptionKey: 'rightSidebar.shortcuts.saveTransaction' },
        { key: 'Delete', descriptionKey: 'rightSidebar.shortcuts.deleteSelectedItems' },
        { key: 'Esc', descriptionKey: 'rightSidebar.shortcuts.cancelCloseDialog' },
      ]
    },
    {
      categoryKey: 'rightSidebar.categories.sidebarUI',
      items: [
        { key: 'Ctrl + \\', descriptionKey: 'rightSidebar.shortcuts.toggleLeftSidebar' },
        { key: 'Ctrl + Shift + \\', descriptionKey: 'rightSidebar.shortcuts.toggleRightSidebar' },
      ]
    },
    {
      categoryKey: 'rightSidebar.categories.searchFilter',
      items: [
        { key: 'Ctrl + F', descriptionKey: 'rightSidebar.shortcuts.focusSearch' },
      ]
    }
  ]

  if (!isOpen) return null

  return (
    <div 
      className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-sm"
    >
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-800">
            {t('rightSidebar.title')}
          </h2>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Shortcuts List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {shortcuts.map((section) => (
            <div key={section.categoryKey}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {t(section.categoryKey)}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div 
                    key={index}
                    className="flex items-start justify-between gap-3 py-1.5"
                  >
                    <span className="text-xs text-gray-600 flex-1">
                      {t(shortcut.descriptionKey)}
                    </span>
                    <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded shrink-0">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong className="text-gray-700">{t('rightSidebar.notePrefix')}</strong> {t('rightSidebar.noteSuffix')}
        </p>
      </div>
    </div>
  )
}
