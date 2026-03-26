import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Supported Indian languages
 */
export type Language = 
  | 'english'
  | 'hindi'
  | 'gujarati'
  | 'tamil'
  | 'telugu'
  | 'marathi'
  | 'bengali'
  | 'punjabi'

export interface LanguageOption {
  code: Language
  name: string
  nativeName: string
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'english', name: 'English', nativeName: 'English' },
  { code: 'hindi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'gujarati', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'tamil', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'telugu', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'marathi', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bengali', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'punjabi', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' }
]

export interface PreferencesState {
  language: Language
  theme: 'light' | 'dark' | 'system'
  autoSync: boolean
  syncInterval: number // in hours
  syncSchedule: string | null // cron expression or time like "02:00"
  syncOnAppStart: boolean
  syncOnAppClose: boolean
  isLoaded: boolean
  // ISSUE 2 FIX: Backup settings persistence
  backupSettings: {
    // Basic backup options
    archiveOldBackups: boolean
    deleteOldBackups: boolean
    deleteAfterDays: number
    passwordProtect: boolean
    // Offline automatic backup
    offlineAutoBackup: boolean
    offlineBackupFrequency: 'daily' | 'weekly' | 'monthly'
    offlineBackupTime: string
    // Cloud automatic backup
    cloudAutoBackup: boolean
    cloudBackupFrequency: 'daily' | 'weekly' | 'monthly'
    cloudBackupTime: string
  }
}

const initialState: PreferencesState = {
  language: 'english',
  theme: 'system',
  autoSync: false,
  syncInterval: 24, // 24 hours
  syncSchedule: null,
  syncOnAppStart: false,
  syncOnAppClose: false,
  isLoaded: false,
  backupSettings: {
    archiveOldBackups: true,
    deleteOldBackups: false,
    deleteAfterDays: 30,
    passwordProtect: false,
    offlineAutoBackup: false,
    offlineBackupFrequency: 'daily',
    offlineBackupTime: '02:00',
    cloudAutoBackup: false,
    cloudBackupFrequency: 'daily',
    cloudBackupTime: '02:00'
  }
}

/**
 * Save preferences to database
 * ISSUE 2 FIX: Use DB instead of localStorage
 * Convert Immer draft to plain object to avoid "object could not be cloned" error
 */
const savePreferencesToDB = (preferences: PreferencesState) => {
  if (window.api?.preferences?.save) {
    // Use current() to get a plain object from the Immer draft
    const plainPreferences = JSON.parse(JSON.stringify(preferences))
    window.api.preferences.save(plainPreferences).catch((error) => {
      console.error('Failed to save preferences to DB:', error)
    })
  }
}

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    /**
     * Load preferences from DB
     */
    loadPreferences: (state, action: PayloadAction<Partial<PreferencesState>>) => {
      Object.assign(state, action.payload)
      state.isLoaded = true
    },
    
    /**
     * Set the application language
     */
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.language = action.payload
      savePreferencesToDB(state)
    },
    
    /**
     * Set the application theme
     */
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload
      savePreferencesToDB(state)
    },
    
    /**
     * Toggle auto-sync
     */
    toggleAutoSync: (state) => {
      state.autoSync = !state.autoSync
      savePreferencesToDB(state)
    },
    
    /**
     * Set auto-sync enabled/disabled
     */
    setAutoSync: (state, action: PayloadAction<boolean>) => {
      state.autoSync = action.payload
      savePreferencesToDB(state)
    },
    
    /**
     * Set sync interval in hours
     */
    setSyncInterval: (state, action: PayloadAction<number>) => {
      state.syncInterval = action.payload
      savePreferencesToDB(state)
    },
    
    /**
     * Set sync schedule (cron or time)
     */
    setSyncSchedule: (state, action: PayloadAction<string | null>) => {
      state.syncSchedule = action.payload
      savePreferencesToDB(state)
    },
    
    /**
     * Toggle sync on app start
     */
    toggleSyncOnAppStart: (state) => {
      state.syncOnAppStart = !state.syncOnAppStart
      savePreferencesToDB(state)
    },
    
    /**
     * Set sync on app start
     */
    setSyncOnAppStart: (state, action: PayloadAction<boolean>) => {
      state.syncOnAppStart = action.payload
      savePreferencesToDB(state)
    },
    
    /**
     * Toggle sync on app close
     */
    toggleSyncOnAppClose: (state) => {
      state.syncOnAppClose = !state.syncOnAppClose
      savePreferencesToDB(state)
    },
    
    /**
     * Set sync on app close
     */
    setSyncOnAppClose: (state, action: PayloadAction<boolean>) => {
      state.syncOnAppClose = action.payload
      savePreferencesToDB(state)
    },
    
    /**
     * Reset all preferences to defaults
     */
    resetPreferences: (state) => {
      Object.assign(state, initialState)
      savePreferencesToDB(state)
    },
    
    /**
     * Update multiple preferences at once
     */
    updatePreferences: (state, action: PayloadAction<Partial<PreferencesState>>) => {
      Object.assign(state, action.payload)
      savePreferencesToDB(state)
    },
    
    /**
     * ISSUE 2 FIX: Update backup settings
     */
    updateBackupSettings: (state, action: PayloadAction<Partial<PreferencesState['backupSettings']>>) => {
      console.log('[Redux] updateBackupSettings called with:', action.payload)
      console.log('[Redux] Current backup settings:', state.backupSettings)
      state.backupSettings = { ...state.backupSettings, ...action.payload }
      console.log('[Redux] New backup settings:', state.backupSettings)
      savePreferencesToDB(state)
    }
  }
})

export const {
  loadPreferences,
  setLanguage,
  setTheme,
  toggleAutoSync,
  setAutoSync,
  setSyncInterval,
  setSyncSchedule,
  toggleSyncOnAppStart,
  setSyncOnAppStart,
  toggleSyncOnAppClose,
  setSyncOnAppClose,
  resetPreferences,
  updatePreferences,
  updateBackupSettings
} = preferencesSlice.actions

// Async action creator to load preferences from DB
export const initializePreferences = () => async (dispatch: any) => {
  try {
    if (window.api?.preferences?.get) {
      const stored = await window.api.preferences.get()
      if (stored) {
        dispatch(loadPreferences(stored))
      }
    }
  } catch (error) {
    console.error('Failed to load preferences from DB:', error)
  }
}

export default preferencesSlice.reducer
