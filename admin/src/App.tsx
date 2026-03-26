import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LoginPage, LicenseManagementPage, PaymentPage } from '@/pages'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/license"
            element={
              <ProtectedRoute>
                <LicenseManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/license" replace />} />
          <Route path="*" element={<Navigate to="/license" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
