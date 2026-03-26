import { Provider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import { store } from './store'
import { AuthScreen } from './components/AuthScreen'
import { MainLayout } from './components/MainLayout'
import { CompanyManager } from './pages/CompanyManager'
import { useAppSelector } from './store/hooks'
import { useEffect, useState } from 'react'
import { useAppDispatch } from './store/hooks'
import { checkLoginStatus } from './store/slices/authSlice'
import { loadCompanies } from './store/slices/companySlice'
import { initializePreferences } from './store/slices/preferencesSlice'
import LicenseGate from './components/LicenseGate'
import { Toaster } from './components/ui/sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from './components/ui/alert-dialog'

function AppContent(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const { isLoggedIn, user } = useAppSelector((state) => state.auth)
  const { activeCompany } = useAppSelector((state) => state.company)
  const tabs = useAppSelector((state) => state.tabs.tabs)
  const [showWindowCloseConfirm, setShowWindowCloseConfirm] = useState(false)

  // ISSUE 2 FIX: Load preferences from DB on mount
  useEffect(() => {
    dispatch(initializePreferences())
  }, [dispatch])

  // Check login status on mount
  useEffect(() => {
    dispatch(checkLoginStatus())
  }, [dispatch])

    // Load companies when user is logged in
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      dispatch(loadCompanies(user.id))
    }
  }, [dispatch, isLoggedIn, user?.id])

  // Save active company to localStorage (for session persistence during navigation)
  useEffect(() => {
    if (activeCompany) {
      localStorage.setItem('activeCompanyId', activeCompany.id)
    }
  }, [activeCompany])

  // Prevent app close if there are unsaved changes in transaction tabs
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Clear active company from localStorage when app closes
      localStorage.removeItem('activeCompanyId')
      
      // Check if any transaction tab has unsaved changes
      const hasUnsavedTransactions = tabs.some(
        tab => tab.isTransaction && tab.hasUnsavedChanges
      )

      if (hasUnsavedTransactions) {
        // Prevent the default behavior (closing the app)
        e.preventDefault()
        // Chrome requires returnValue to be set
        e.returnValue = ''
        // Show a custom message (note: most modern browsers ignore this and show their own message)
        return 'You have unsaved changes in transaction tabs. Are you sure you want to close?'
      }
      return undefined
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [tabs])

  // Handle window close confirmation request from main process
  useEffect(() => {
    const cleanup = window.api.app.onRequestCloseConfirmation(() => {
      setShowWindowCloseConfirm(true)
    })

    return cleanup
  }, [])

  const handleConfirmClose = () => {
    setShowWindowCloseConfirm(false)
    window.api.app.confirmClose()
  }

  const handleCancelClose = () => {
    setShowWindowCloseConfirm(false)
    window.api.app.cancelClose()
  }

  if (!isLoggedIn) {
    return <AuthScreen />
  }

  return (
    <>
      <HashRouter>
        <MainLayout>
          {/* Show CompanyManager when no company is selected */}
          {!activeCompany && <CompanyManager />}
        </MainLayout>
      </HashRouter>

      {/* Window Close Confirmation Dialog */}
      <AlertDialog open={showWindowCloseConfirm} onOpenChange={setShowWindowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in one or more tabs. Are you sure you want to close the
              application? All unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>Close Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <LicenseGate>
        <AppContent />
        <Toaster />
      </LicenseGate>
    </Provider>
  )
}

export default App
