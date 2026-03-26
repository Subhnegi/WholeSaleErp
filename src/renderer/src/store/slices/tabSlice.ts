import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index'

// Tab-specific transaction state for isolating transaction state per tab
export interface TabTransactionState {
  isActive: boolean             // Whether tab has active transaction
  isDirty: boolean             // Whether tab has unsaved changes
  transactionType?: string     // Type of transaction (quicksale, etc.)
  lastModified?: number        // Timestamp of last modification
}

// Tab interface
export interface Tab {
  id: string                    // Unique tab ID (uuid)
  title: string                 // Display name (e.g., "Quick Sale", "Dashboard")
  route: string                 // Base route path (e.g., "/entries/quick-sale", "/dashboard")
  currentRoute: string          // Current active route including sub-routes (e.g., "/entries/daily-sale/new")
  icon?: string                 // Icon name from lucide-react
  isPinned?: boolean            // Cannot be closed if true (not used per QUESTION 6 answer D)
  hasUnsavedChanges?: boolean   // Show indicator if true (for QUESTION 4 answer A)
  isTransaction?: boolean       // Transaction pages always open in new tabs (QUESTION 2)
}

// Tab state interface
export interface TabState {
  tabs: Tab[]                   // All open tabs
  activeTabId: string | null    // Currently visible tab ID
  maxTabsWarningShown: boolean  // Track if performance warning shown
  tabTransactionStates: { [tabId: string]: TabTransactionState }  // Tab-specific transaction states
}

// Initial state with no tabs (tabs only start after company is selected)
const initialState: TabState = {
  tabs: [],
  activeTabId: null,
  maxTabsWarningShown: false,
  tabTransactionStates: {}
}

const DEFAULT_TAB_TRANSACTION_STATE: TabTransactionState = Object.freeze({
  isActive: false,
  isDirty: false
}) as TabTransactionState

const tabSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    /**
     * Open a new tab or switch to existing
     * QUESTION 2: Transaction pages always open new tabs, non-transaction switch to existing
     */
    openTab: (state, action: PayloadAction<Omit<Tab, 'id' | 'hasUnsavedChanges' | 'currentRoute'> & { currentRoute?: string }>) => {
      const { route, title, icon, isTransaction, currentRoute } = action.payload
      
      // Check if tab already exists
      const existingTab = state.tabs.find(tab => tab.route === route)
      
      if (existingTab) {
        // For non-transaction pages, switch to existing tab
        if (!isTransaction) {
          state.activeTabId = existingTab.id
          return
        }
        // For transaction pages, continue to create new tab
      }
      
      // Create new tab
      const newTabId = `${route.replace(/\//g, '-')}-${Date.now()}`
      const newTab: Tab = {
        id: newTabId,
        title,
        route,
        currentRoute: currentRoute || route,  // Initialize currentRoute to base route or provided value
        icon,
        isPinned: false,
        hasUnsavedChanges: false,
        isTransaction: isTransaction || false
      }
      
      state.tabs.push(newTab)
      state.activeTabId = newTabId
      
      // Show performance warning if many tabs open (QUESTION 1)
      if (state.tabs.length > 10 && !state.maxTabsWarningShown) {
        state.maxTabsWarningShown = true
        // Note: UI will show toast based on this flag
      }
    },

    /**
     * Update the current route of a tab (for sub-navigation within a tab)
     * This preserves form pages when switching tabs
     */
    updateTabRoute: (state, action: PayloadAction<{ tabId: string; currentRoute: string }>) => {
      const { tabId, currentRoute } = action.payload
      const tab = state.tabs.find(t => t.id === tabId)
      
      if (tab) {
        tab.currentRoute = currentRoute
      }
    },

    /**
     * Close a tab
     * QUESTION 4: Check for unsaved changes (UI will show confirmation dialog)
     */
    closeTab: (state, action: PayloadAction<string>) => {
      const tabId = action.payload
      const tabIndex = state.tabs.findIndex(tab => tab.id === tabId)
      
      if (tabIndex === -1) return
      
      // Note: Unsaved changes check handled by UI (shows confirmation dialog)
      // If we get here, user confirmed or no unsaved changes
      
      // Remove the tab
      state.tabs.splice(tabIndex, 1)
      
      // Clean up tab transaction state
      if (state.tabTransactionStates[tabId]) {
        delete state.tabTransactionStates[tabId]
      }
      
      // If closing active tab, switch to another tab
      if (state.activeTabId === tabId) {
        if (state.tabs.length > 0) {
          // Switch to previous tab if available, otherwise next tab
          const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0
          state.activeTabId = state.tabs[newActiveIndex]?.id || null
        } else {
          // When all tabs are closed, auto-open Dashboard
          state.tabs = [
            {
              id: 'dashboard-default',
              title: 'Dashboard',
              route: '/dashboard',
              currentRoute: '/dashboard',
              icon: 'LayoutDashboard',
              isPinned: false,
              hasUnsavedChanges: false,
              isTransaction: false
            }
          ]
          state.activeTabId = 'dashboard-default'
        }
      }
    },

    /**
     * Set active tab
     * Also accepts optional currentPathname to save the current tab's route before switching
     */
    setActiveTab: (state, action: PayloadAction<{ tabId: string; currentPathname?: string } | string>) => {
      // Handle both old format (string) and new format (object)
      const payload = typeof action.payload === 'string' 
        ? { tabId: action.payload } 
        : action.payload
      
      const { tabId, currentPathname } = payload
      
      // Save current tab's route before switching (if pathname provided)
      if (currentPathname && state.activeTabId) {
        const currentTab = state.tabs.find(t => t.id === state.activeTabId)
        if (currentTab) {
          currentTab.currentRoute = currentPathname
        }
      }
      
      const tab = state.tabs.find(t => t.id === tabId)
      if (tab) {
        state.activeTabId = tabId
      }
    },

    /**
     * Reorder tabs (for drag-and-drop)
     */
    reorderTabs: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload
      
      if (fromIndex < 0 || fromIndex >= state.tabs.length ||
          toIndex < 0 || toIndex >= state.tabs.length) {
        return
      }
      
      const [movedTab] = state.tabs.splice(fromIndex, 1)
      state.tabs.splice(toIndex, 0, movedTab)
    },

    /**
     * Set unsaved changes flag for a tab
     * QUESTION 4: Track unsaved changes to show confirmation on close
     */
    setTabUnsavedChanges: (state, action: PayloadAction<{ tabId: string; hasChanges: boolean }>) => {
      const { tabId, hasChanges } = action.payload
      const tab = state.tabs.find(t => t.id === tabId)
      
      if (tab) {
        tab.hasUnsavedChanges = hasChanges
      }
    },

    /**
     * Set tab-specific transaction state
     * Manages transaction lifecycle per tab to prevent cross-tab interference
     */
    setTabTransactionState: (state, action: PayloadAction<{ 
      tabId: string; 
      transactionState: Partial<TabTransactionState> 
    }>) => {
      const { tabId, transactionState } = action.payload
      
      // Initialize tab transaction state if it doesn't exist
      if (!state.tabTransactionStates[tabId]) {
        state.tabTransactionStates[tabId] = {
          isActive: false,
          isDirty: false
        }
      }
      
      // Update with provided state
      state.tabTransactionStates[tabId] = {
        ...state.tabTransactionStates[tabId],
        ...transactionState,
        lastModified: Date.now()
      }
      
      // Also update the tab's hasUnsavedChanges flag for consistency
      const tab = state.tabs.find(t => t.id === tabId)
      if (tab) {
        tab.hasUnsavedChanges = state.tabTransactionStates[tabId].isDirty
      }
    },

    /**
     * Start transaction for a tab
     */
    startTabTransaction: (state, action: PayloadAction<{ 
      tabId: string; 
      transactionType?: string 
    }>) => {
      const { tabId, transactionType } = action.payload
      
      if (!state.tabTransactionStates[tabId]) {
        state.tabTransactionStates[tabId] = {
          isActive: false,
          isDirty: false
        }
      }
      
      state.tabTransactionStates[tabId].isActive = true
      state.tabTransactionStates[tabId].isDirty = true
      if (transactionType) {
        state.tabTransactionStates[tabId].transactionType = transactionType
      }
      state.tabTransactionStates[tabId].lastModified = Date.now()
      
      // Update tab's unsaved changes flag
      const tab = state.tabs.find(t => t.id === tabId)
      if (tab) {
        tab.hasUnsavedChanges = true
      }
    },

    /**
     * End transaction for a tab (save or cancel)
     */
    endTabTransaction: (state, action: PayloadAction<{ 
      tabId: string; 
      saved?: boolean 
    }>) => {
      const { tabId, saved = true } = action.payload
      
      if (state.tabTransactionStates[tabId]) {
        state.tabTransactionStates[tabId].isActive = false
        state.tabTransactionStates[tabId].isDirty = false
        if (saved) {
          state.tabTransactionStates[tabId].lastModified = Date.now()
        }
      }
      
      // Update tab's unsaved changes flag
      const tab = state.tabs.find(t => t.id === tabId)
      if (tab) {
        tab.hasUnsavedChanges = false
      }
    },

    /**
     * Close all tabs except the specified one
     */
    closeOtherTabs: (state, action: PayloadAction<string>) => {
      const keepTabId = action.payload
      const keepTab = state.tabs.find(tab => tab.id === keepTabId)
      
      if (keepTab) {
        state.tabs = [keepTab]
        state.activeTabId = keepTabId
      }
    },

    /**
     * Close all tabs to the right of specified tab
     */
    closeTabsToRight: (state, action: PayloadAction<string>) => {
      const tabId = action.payload
      const tabIndex = state.tabs.findIndex(tab => tab.id === tabId)
      
      if (tabIndex !== -1 && tabIndex < state.tabs.length - 1) {
        state.tabs = state.tabs.slice(0, tabIndex + 1)
        
        // If active tab was closed, switch to the rightmost tab
        if (!state.tabs.find(tab => tab.id === state.activeTabId)) {
          state.activeTabId = state.tabs[state.tabs.length - 1].id
        }
      }
    },

    /**
     * Reset max tabs warning flag
     */
    resetMaxTabsWarning: (state) => {
      state.maxTabsWarningShown = false
    },

    /**
     * Clear all tabs (used when company changes or logout)
     * Opens Dashboard tab by default (company must be selected for this to be called)
     */
    clearAllTabs: (state) => {
      // Reset to initial state with just Dashboard
      state.tabs = [
        {
          id: 'dashboard-default',
          title: 'Dashboard',
          route: '/dashboard',
          currentRoute: '/dashboard',
          icon: 'LayoutDashboard',
          isPinned: false,
          hasUnsavedChanges: false,
          isTransaction: false
        }
      ]
      state.activeTabId = 'dashboard-default'
      state.maxTabsWarningShown = false
      state.tabTransactionStates = {}
    },

    /**
     * Clear all tabs completely (used on logout or when no company selected)
     */
    resetTabs: (state) => {
      state.tabs = []
      state.activeTabId = null
      state.maxTabsWarningShown = false
      state.tabTransactionStates = {}
    }
  }
})

// Actions
export const {
  openTab,
  closeTab,
  setActiveTab,
  updateTabRoute,
  reorderTabs,
  setTabUnsavedChanges,
  setTabTransactionState,
  startTabTransaction,
  endTabTransaction,
  closeOtherTabs,
  closeTabsToRight,
  resetMaxTabsWarning,
  clearAllTabs,
  resetTabs
} = tabSlice.actions

// Selectors
export const selectTabs = (state: RootState) => state.tabs.tabs
export const selectActiveTabId = (state: RootState) => state.tabs.activeTabId
export const selectActiveTab = (state: RootState) => {
  const activeId = state.tabs.activeTabId
  return state.tabs.tabs.find(tab => tab.id === activeId) || null
}
export const selectTabById = (tabId: string) => (state: RootState) =>
  state.tabs.tabs.find(tab => tab.id === tabId)
export const selectTabCount = (state: RootState) => state.tabs.tabs.length
export const selectMaxTabsWarningShown = (state: RootState) => state.tabs.maxTabsWarningShown

// Transaction-specific selectors
export const selectTabTransactionState = (state: RootState, tabId: string): TabTransactionState =>
  state.tabs.tabTransactionStates[tabId] || DEFAULT_TAB_TRANSACTION_STATE
export const selectActiveTabTransactionState = (state: RootState) => {
  const activeId = state.tabs.activeTabId
  if (!activeId) return DEFAULT_TAB_TRANSACTION_STATE
  return state.tabs.tabTransactionStates[activeId] || DEFAULT_TAB_TRANSACTION_STATE
}
export const selectTabHasActiveTransaction = (state: RootState, tabId: string) => {
  const transactionState = state.tabs.tabTransactionStates[tabId]
  return transactionState ? transactionState.isActive : false
}
export const selectActiveTabHasActiveTransaction = (state: RootState) => {
  const activeId = state.tabs.activeTabId
  if (!activeId) return false
  const transactionState = state.tabs.tabTransactionStates[activeId]
  return transactionState ? transactionState.isActive : false
}

export default tabSlice.reducer
