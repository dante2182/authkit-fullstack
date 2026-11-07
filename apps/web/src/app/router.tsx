import { createBrowserRouter, Navigate } from 'react-router-dom'
import {
  AuthLayout,
  ForgotPasswordPage,
  GuestRoute,
  LoginPage,
  ProtectedRoute,
  RegisterPage,
  ResetPasswordPage,
  VerifyEmailPage,
} from '@/features/auth'
import { AccountPage } from '@/features/account'
import { AdminRoute, AdminUsersPage } from '@/features/admin'
import { DashboardPage } from '@/features/dashboard'
import { NotFoundPage } from './NotFoundPage'

export const router = createBrowserRouter([
  {
    // Solo visitantes: con sesión se redirige al panel.
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },
  {
    // Públicas incluso con sesión: son destinos de los enlaces de correo.
    element: <AuthLayout />,
    children: [
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/account', element: <AccountPage /> },
      {
        // Solo ADMIN con email verificado: la API aplica el mismo criterio.
        element: <AdminRoute />,
        children: [{ path: '/admin/users', element: <AdminUsersPage /> }],
      },
    ],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <NotFoundPage /> },
])
