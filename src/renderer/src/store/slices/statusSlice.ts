import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface StatusState {
  isOnline: boolean
  lastBackupSync: string | null
  updateAvailable: boolean
  updateVersion: string | null
}

const initialState: StatusState = {
  isOnline: navigator.onLine,
  lastBackupSync: null,
  updateAvailable: false,
  updateVersion: null
}

const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload
    },
    setLastBackupSync: (state, action: PayloadAction<string>) => {
      state.lastBackupSync = action.payload
    },
    setUpdateAvailable: (state, action: PayloadAction<{ available: boolean; version?: string }>) => {
      state.updateAvailable = action.payload.available
      state.updateVersion = action.payload.version || null
    }
  }
})

export const { setOnlineStatus, setLastBackupSync, setUpdateAvailable } = statusSlice.actions
export default statusSlice.reducer
