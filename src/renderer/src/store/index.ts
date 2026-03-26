import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import licenseReducer from './slices/licenseSlice'
import statusReducer from './slices/statusSlice'
import companyReducer from './slices/companySlice'
import preferencesReducer from './slices/preferencesSlice'
import accountReducer from './slices/accountSlice'
import tabReducer from './slices/tabSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    license: licenseReducer,
    status: statusReducer,
    company: companyReducer,
    preferences: preferencesReducer,
    account: accountReducer,
    tabs: tabReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state for serialization checks
        ignoredActions: [
          'auth/checkLoginStatus/fulfilled', 
          'auth/login/fulfilled', 
          'auth/register/fulfilled',
          'company/loadCompanies/fulfilled',
          'company/createCompany/fulfilled',
          'company/updateCompany/fulfilled',
          'account/loadAccounts/fulfilled',
          'account/loadAccountGroups/fulfilled',
          'account/createAccount/fulfilled',
          'account/updateAccount/fulfilled',
          'account/createAccountGroup/fulfilled',
          'account/updateAccountGroup/fulfilled'
        ],
        ignoredPaths: [
          'auth.user.createdAt', 
          'license.startDate', 
          'license.endDate',
          'company.activeCompany.createdAt',
          'company.activeCompany.updatedAt',
          'company.activeCompany.fyStartDate',
          'company.activeCompany.fyEndDate',
          'company.activeCompany.lastSyncedAt',
          'company.companies',
          'account.accounts',
          'account.accountGroups',
          'account.selectedAccount'
        ],
      },
    }),
})

// Expose store to window for main process close confirmation check
declare global {
  interface Window {
    __REDUX_STORE__: typeof store
  }
}
window.__REDUX_STORE__ = store

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
