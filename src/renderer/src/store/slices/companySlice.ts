import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { Company } from '@/types/company'

export interface CompanyState {
  activeCompany: Company | null
  companies: Company[]
  loading: boolean
  error: string | null
}

const initialState: CompanyState = {
  activeCompany: null,
  companies: [],
  loading: false,
  error: null
}

const ensureIsoDateString = (value: string | Date): string =>
  typeof value === 'string' ? value : value.toISOString()

const optionalIsoDateString = (value?: string | Date | null) => {
  if (!value) return undefined
  return typeof value === 'string' ? value : value.toISOString()
}

const sanitizeCompany = (company: Company): Company => ({
  ...company,
  fyStartDate: ensureIsoDateString(company.fyStartDate),
  fyEndDate: ensureIsoDateString(company.fyEndDate),
  createdAt: optionalIsoDateString(company.createdAt),
  updatedAt: optionalIsoDateString(company.updatedAt)
})

const sanitizeCompanies = (companies: Company[]) => companies.map(sanitizeCompany)

/**
 * Load companies for the logged-in user
 */
export const loadCompanies = createAsyncThunk(
  'company/loadCompanies',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await window.api.company.list(userId)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to load companies')
      }
      
      return response.data || []
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load companies')
    }
  }
)

/**
 * Create a new company
 */
export const createCompany = createAsyncThunk(
  'company/createCompany',
  async (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>, { rejectWithValue }) => {
    try {
      const response = await window.api.company.create(data)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to create company')
      }
      
      return response.data as Company
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create company')
    }
  }
)

/**
 * Update an existing company
 */
export const updateCompany = createAsyncThunk(
  'company/updateCompany',
  async ({ id, data }: { id: string; data: Partial<Company> }, { rejectWithValue }) => {
    try {
      const response = await window.api.company.update(id, data)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to update company')
      }
      
      return response.data as Company
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update company')
    }
  }
)

/**
 * Delete a company
 */
export const deleteCompany = createAsyncThunk(
  'company/deleteCompany',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await window.api.company.delete(id)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to delete company')
      }
      
      return id
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete company')
    }
  }
)

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    /**
     * Set the active company
     */
    setActiveCompany: {
      reducer: (state, action: PayloadAction<Company | null>) => {
        state.activeCompany = action.payload
        
        // Persist to localStorage
        if (action.payload) {
          localStorage.setItem('activeCompanyId', action.payload.id)
        } else {
          localStorage.removeItem('activeCompanyId')
        }
        
        // Update Electron menu to show/hide Transactions menu
        window.electron.ipcRenderer.send('update-menu', !!action.payload)
      },
      prepare: (company: Company | null) => ({
        payload: company ? sanitizeCompany(company) : null
      })
    },
    
    /**
     * Clear company state (on logout)
     */
    clearCompanyState: (state) => {
      state.activeCompany = null
      state.companies = []
      state.error = null
      localStorage.removeItem('activeCompanyId')
      // Update Electron menu to hide Transactions menu
      window.electron.ipcRenderer.send('update-menu', false)
    },
    
    /**
     * Restore active company from localStorage
     */
    restoreActiveCompany: (state) => {
      const activeCompanyId = localStorage.getItem('activeCompanyId')
      
      if (activeCompanyId && state.companies.length > 0) {
        const company = state.companies.find(c => c.id === activeCompanyId)
        if (company) {
          state.activeCompany = company
        }
      }
    }
  },
  extraReducers: (builder) => {
    // Load companies
    builder
      .addCase(loadCompanies.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadCompanies.fulfilled, (state, action) => {
        state.loading = false
        state.companies = sanitizeCompanies(action.payload)
        
        // Always start with no company selected
        // User must explicitly select company each time app opens
        state.activeCompany = null
        window.electron.ipcRenderer.send('update-menu', false)
      })
      .addCase(loadCompanies.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Create company
    builder
      .addCase(createCompany.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createCompany.fulfilled, (state, action) => {
        state.loading = false
        const newCompany = sanitizeCompany(action.payload)
        state.companies.push(newCompany)
        
        // Auto-select newly created company
        state.activeCompany = newCompany
        localStorage.setItem('activeCompanyId', newCompany.id)
        // Update Electron menu to show Transactions menu
        window.electron.ipcRenderer.send('update-menu', true)
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Update company
    builder
      .addCase(updateCompany.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateCompany.fulfilled, (state, action) => {
        state.loading = false
        const updatedCompany = sanitizeCompany(action.payload)
        const index = state.companies.findIndex(c => c.id === updatedCompany.id)
        if (index !== -1) {
          state.companies[index] = updatedCompany
        }
        
        // Update active company if it's the one being updated
        if (state.activeCompany?.id === updatedCompany.id) {
          state.activeCompany = updatedCompany
        }
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
    
    // Delete company
    builder
      .addCase(deleteCompany.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteCompany.fulfilled, (state, action) => {
        state.loading = false
        state.companies = state.companies.filter(c => c.id !== action.payload)
        
        // Clear active company if it's the one being deleted
        if (state.activeCompany?.id === action.payload) {
          state.activeCompany = state.companies.length > 0 ? state.companies[0] : null
          if (state.activeCompany) {
            localStorage.setItem('activeCompanyId', state.activeCompany.id)
          } else {
            localStorage.removeItem('activeCompanyId')
          }
        }
      })
      .addCase(deleteCompany.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  }
})

export const { setActiveCompany, clearCompanyState, restoreActiveCompany } = companySlice.actions
export default companySlice.reducer
