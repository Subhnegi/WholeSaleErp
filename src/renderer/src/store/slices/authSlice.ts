import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { 
  AuthState, 
  AuthData, 
  LoginCredentials, 
  RegisterCredentials 
} from '@/types'

const initialState: AuthState = {
  isLoggedIn: false,
  user: null,
  license: null,
  token: null,
  loading: false,
  error: null
}

// Async thunks
export const checkLoginStatus = createAsyncThunk('auth/checkLoginStatus', async () => {
  const isLoggedIn = await window.api.license.isLoggedIn()
  if (isLoggedIn) {
    const userData = await window.api.license.getUserData()
    return userData
  }
  return null
})

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await window.api.license.login(credentials)
      if (response.success && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Login failed')
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterCredentials, { rejectWithValue }) => {
    try {
      const response = await window.api.license.register(data)
      if (response.success && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Registration failed')
    } catch (error: any) {
      return rejectWithValue(error.message || 'Registration failed')
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  // Clear active company from localStorage on logout
  localStorage.removeItem('activeCompanyId')
  await window.api.license.logout()
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Check login status
    builder.addCase(checkLoginStatus.fulfilled, (state, action: PayloadAction<AuthData | null>) => {
      if (action.payload) {
        state.isLoggedIn = true
        state.user = action.payload.user
        state.license = action.payload.license
        state.token = action.payload.token
      } else {
        state.isLoggedIn = false
        state.user = null
        state.license = null
        state.token = null
      }
    })

    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(login.fulfilled, (state, action: PayloadAction<AuthData>) => {
      state.loading = false
      state.isLoggedIn = true
      state.user = action.payload.user
      state.license = action.payload.license
      state.token = action.payload.token
      state.error = null
    })
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Register
    builder.addCase(register.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(register.fulfilled, (state, action: PayloadAction<AuthData>) => {
      state.loading = false
      state.isLoggedIn = true
      state.user = action.payload.user
      state.license = action.payload.license
      state.token = action.payload.token
      state.error = null
    })
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.isLoggedIn = false
      state.user = null
      state.license = null
      state.token = null
      state.error = null
    })
  }
})

export const { clearError } = authSlice.actions

// Export types for store configuration
export type { AuthState } from '@/types'

export default authSlice.reducer
