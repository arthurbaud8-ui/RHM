import React from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { OffersPage } from './pages/OffersPage'
import { ApplicationsPage } from './pages/ApplicationsPage'
import { MessagingPage } from './pages/MessagingPage'
import { ProfilePage } from './pages/ProfilePage'
import { TestsPage } from './pages/TestsPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'
import { CreateOfferPage } from './pages/CreateOfferPage'
import { EditOfferPage } from './pages/EditOfferPage'
import { OfferApplicationsPage } from './pages/OfferApplicationsPage'
import { TestResultsPage } from './pages/TestResultsPage'
import { LandingPage } from './pages/LandingPage'
import { JobOfferDetailPage } from './pages/JobOfferDetailPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-text-muted">Chargement...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/home" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/frontend" element={<Navigate to="/" replace />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="offers/new" element={<CreateOfferPage />} />
        <Route path="offers/:id/edit" element={<EditOfferPage />} />
        <Route path="offers/:id" element={<JobOfferDetailPage />} />
        <Route path="offers/:offerId/applications" element={<OfferApplicationsPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="messaging" element={<MessagingPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="tests" element={<TestsPage />} />
        <Route path="test-results" element={<TestResultsPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <div
            className="min-h-screen bg-bg text-text"
            data-theme="light"
          >
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  toast:
                    'bg-bg-elevated border border-border text-text shadow-elevated-soft',
                },
              }}
            />
            <AppRoutes />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

