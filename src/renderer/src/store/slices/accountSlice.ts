import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { Account, AccountGroup } from '@/types/account'

export interface AccountState {
  accounts: Account[]
  accountGroups: AccountGroup[]
  selectedAccount: Account | null
  selectedAccounts: string[] // For bulk operations
  loading: boolean
  groupsLoading: boolean
  error: string | null
}

const initialState: AccountState = {
  accounts: [],
  accountGroups: [],
  selectedAccount: null,
  selectedAccounts: [],
  loading: false,
  groupsLoading: false,
  error: null
}

/**
 * Load account groups for a company
 */
export const loadAccountGroups = createAsyncThunk(
  'account/loadAccountGroups',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await window.api.accountGroup.list(companyId)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to load account groups')
      }
      
      return response.data || []
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load account groups')
    }
  }
)

/**
 * Load accounts for a company
 */
export const loadAccounts = createAsyncThunk(
  'account/loadAccounts',
  async (companyId: string, { rejectWithValue }) => {
    try {
      const response = await window.api.account.listByCompany(companyId)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to load accounts')
      }
      
      return response.data || []
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load accounts')
    }
  }
)

/**
 * Create a new account group
 */
export const createAccountGroup = createAsyncThunk(
  'account/createAccountGroup',
  async (data: { name: string; parentGroupId?: string; companyId: string }, { rejectWithValue }) => {
    try {
      const response = await window.api.accountGroup.create(data)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to create account group')
      }
      
      return response.data as AccountGroup
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create account group')
    }
  }
)

/**
 * Update an account group
 */
export const updateAccountGroup = createAsyncThunk(
  'account/updateAccountGroup',
  async ({ id, data }: { id: string; data: { name?: string; parentGroupId?: string } }, { rejectWithValue }) => {
    try {
      const response = await window.api.accountGroup.update(id, data)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to update account group')
      }
      
      return { id, data }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update account group')
    }
  }
)

/**
 * Delete an account group
 */
export const deleteAccountGroup = createAsyncThunk(
  'account/deleteAccountGroup',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await window.api.accountGroup.delete(id)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to delete account group')
      }
      
      return id
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete account group')
    }
  }
)

/**
 * Bulk delete account groups
 */
export const bulkDeleteAccountGroups = createAsyncThunk(
  'account/bulkDeleteAccountGroups',
  async (ids: string[], { rejectWithValue }) => {
    try {
      const response = await window.api.accountGroup.bulkDelete(ids)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to bulk delete account groups')
      }
      
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to bulk delete account groups')
    }
  }
)

/**
 * Create a new account
 */
export const createAccount = createAsyncThunk(
  'account/createAccount',
  async (data: Partial<Account>, { rejectWithValue }) => {
    try {
      const response = await window.api.account.create(data)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to create account')
      }
      
      return response.data as Account
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create account')
    }
  }
)

/**
 * Update an existing account
 */
export const updateAccount = createAsyncThunk(
  'account/updateAccount',
  async ({ id, data }: { id: string; data: Partial<Account> }, { rejectWithValue }) => {
    try {
      const response = await window.api.account.update(id, data)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to update account')
      }
      
      return { id, data }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update account')
    }
  }
)

/**
 * Delete an account
 */
export const deleteAccount = createAsyncThunk(
  'account/deleteAccount',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await window.api.account.delete(id)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to delete account')
      }
      
      return id
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete account')
    }
  }
)

/**
 * Bulk delete accounts
 */
export const bulkDeleteAccounts = createAsyncThunk(
  'account/bulkDeleteAccounts',
  async (ids: string[], { rejectWithValue }) => {
    try {
      const response = await window.api.account.bulkDelete(ids)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to delete accounts')
      }
      
      return ids
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete accounts')
    }
  }
)

/**
 * Bulk update account group
 */
export const bulkUpdateAccountGroup = createAsyncThunk(
  'account/bulkUpdateAccountGroup',
  async ({ ids, accountGroupId }: { ids: string[]; accountGroupId: string }, { rejectWithValue }) => {
    try {
      const response = await window.api.account.bulkUpdateGroup(ids, accountGroupId)
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to update accounts')
      }
      
      return { ids, accountGroupId }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update accounts')
    }
  }
)

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setSelectedAccount: (state, action: PayloadAction<Account | null>) => {
      state.selectedAccount = action.payload
    },
    toggleAccountSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedAccounts.indexOf(action.payload)
      if (index > -1) {
        state.selectedAccounts.splice(index, 1)
      } else {
        state.selectedAccounts.push(action.payload)
      }
    },
    selectAllAccounts: (state) => {
      state.selectedAccounts = state.accounts.map(a => a.id)
    },
    clearAccountSelection: (state) => {
      state.selectedAccounts = []
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Load Account Groups
    builder.addCase(loadAccountGroups.pending, (state) => {
      state.groupsLoading = true
      state.error = null
    })
    builder.addCase(loadAccountGroups.fulfilled, (state, action) => {
      state.groupsLoading = false
      state.accountGroups = action.payload
    })
    builder.addCase(loadAccountGroups.rejected, (state, action) => {
      state.groupsLoading = false
      state.error = action.payload as string
    })

    // Load Accounts
    builder.addCase(loadAccounts.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(loadAccounts.fulfilled, (state, action) => {
      state.loading = false
      state.accounts = action.payload
    })
    builder.addCase(loadAccounts.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Create Account Group
    builder.addCase(createAccountGroup.pending, (state) => {
      state.groupsLoading = true
      state.error = null
    })
    builder.addCase(createAccountGroup.fulfilled, (state, action) => {
      state.groupsLoading = false
      state.accountGroups.push(action.payload)
    })
    builder.addCase(createAccountGroup.rejected, (state, action) => {
      state.groupsLoading = false
      state.error = action.payload as string
    })

    // Update Account Group
    builder.addCase(updateAccountGroup.fulfilled, (state, action) => {
      const index = state.accountGroups.findIndex(g => g.id === action.payload.id)
      if (index !== -1) {
        state.accountGroups[index] = { ...state.accountGroups[index], ...action.payload.data }
      }
    })

    // Delete Account Group
    builder.addCase(deleteAccountGroup.fulfilled, (state, action) => {
      state.accountGroups = state.accountGroups.filter(g => g.id !== action.payload)
    })

    // Bulk Delete Account Groups
    builder.addCase(bulkDeleteAccountGroups.pending, (state) => {
      state.groupsLoading = true
    })
    builder.addCase(bulkDeleteAccountGroups.fulfilled, (state) => {
      state.groupsLoading = false
      // The bulk delete will be handled by re-fetching groups
    })
    builder.addCase(bulkDeleteAccountGroups.rejected, (state) => {
      state.groupsLoading = false
    })

    // Create Account
    builder.addCase(createAccount.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(createAccount.fulfilled, (state, action) => {
      state.loading = false
      state.accounts.push(action.payload)
    })
    builder.addCase(createAccount.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Update Account
    builder.addCase(updateAccount.fulfilled, (state, action) => {
      const index = state.accounts.findIndex(a => a.id === action.payload.id)
      if (index !== -1) {
        state.accounts[index] = { ...state.accounts[index], ...action.payload.data }
      }
    })

    // Delete Account
    builder.addCase(deleteAccount.fulfilled, (state, action) => {
      state.accounts = state.accounts.filter(a => a.id !== action.payload)
      state.selectedAccounts = state.selectedAccounts.filter(id => id !== action.payload)
    })

    // Bulk Delete Accounts
    builder.addCase(bulkDeleteAccounts.fulfilled, (state, action) => {
      state.accounts = state.accounts.filter(a => !action.payload.includes(a.id))
      state.selectedAccounts = []
    })

    // Bulk Update Account Group
    builder.addCase(bulkUpdateAccountGroup.fulfilled, (state, action) => {
      action.payload.ids.forEach(id => {
        const index = state.accounts.findIndex(a => a.id === id)
        if (index !== -1) {
          state.accounts[index].accountGroupId = action.payload.accountGroupId
        }
      })
      state.selectedAccounts = []
    })
  }
})

export const {
  setSelectedAccount,
  toggleAccountSelection,
  selectAllAccounts,
  clearAccountSelection,
  clearError
} = accountSlice.actions

export default accountSlice.reducer
