import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { LicenseState, EnforcementResult, GracePeriodStatus } from '@/types'

const initialState: LicenseState = {
  enforcement: null,
  gracePeriodStatus: null,
  lastValidationTime: null,
  needsValidation: false,
  validating: false,
  error: null
}

// Async thunks
export const checkEnforcement = createAsyncThunk('license/checkEnforcement', async () => {
  if (!window.api?.enforcer) {
    throw new Error('Enforcer API not available')
  }
  return await window.api.enforcer.checkEnforcement()
})

export const forceValidation = createAsyncThunk('license/forceValidation', async () => {
  if (!window.api?.enforcer) {
    throw new Error('Enforcer API not available')
  }
  return await window.api.enforcer.forceValidation()
})

export const getGracePeriodStatus = createAsyncThunk('license/getGracePeriodStatus', async () => {
  if (!window.api?.enforcer) {
    throw new Error('Enforcer API not available')
  }
  return await window.api.enforcer.getGracePeriodStatus()
})

export const getLastValidationTime = createAsyncThunk('license/getLastValidationTime', async () => {
  if (!window.api?.enforcer) {
    return null
  }
  return await window.api.enforcer.getLastValidationTime()
})

export const checkNeedsValidation = createAsyncThunk('license/checkNeedsValidation', async () => {
  if (!window.api?.enforcer) {
    return false
  }
  return await window.api.enforcer.needsValidation()
})

const licenseSlice = createSlice({
  name: 'license',
  initialState,
  reducers: {
    clearLicenseError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Check enforcement
    builder.addCase(checkEnforcement.fulfilled, (state, action: PayloadAction<EnforcementResult>) => {
      state.enforcement = action.payload
    })
    builder.addCase(checkEnforcement.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to check enforcement'
    })

    // Force validation
    builder.addCase(forceValidation.pending, (state) => {
      state.validating = true
      state.error = null
    })
    builder.addCase(forceValidation.fulfilled, (state) => {
      state.validating = false
    })
    builder.addCase(forceValidation.rejected, (state, action) => {
      state.validating = false
      state.error = action.error.message || 'Validation failed'
    })

    // Grace period status
    builder.addCase(
      getGracePeriodStatus.fulfilled,
      (state, action: PayloadAction<GracePeriodStatus>) => {
        state.gracePeriodStatus = action.payload
      }
    )

    // Last validation time
    builder.addCase(
      getLastValidationTime.fulfilled,
      (state, action: PayloadAction<string | null>) => {
        state.lastValidationTime = action.payload
      }
    )

    // Needs validation
    builder.addCase(checkNeedsValidation.fulfilled, (state, action: PayloadAction<boolean>) => {
      state.needsValidation = action.payload
    })
  }
})

export const { clearLicenseError } = licenseSlice.actions
export default licenseSlice.reducer
