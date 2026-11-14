import { Navigate, Outlet } from 'react-router-dom'
import { FullPageLoader, useAuth } from '@/features/auth'
import { AdminAccessDenied } from './AdminAccessDenied'

// La autorización real la impone la API; este guard solo evita mostrar una página que
// respondería 403 y distingue los dos motivos, que exigen salidas distintas.
export function AdminRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />

  if (user.role !== 'ADMIN') return <AdminAccessDenied reason="role" />
  if (!user.emailVerified) return <AdminAccessDenied reason="email" />

  return <Outlet />
}
