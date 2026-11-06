import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { FullPageLoader } from './FullPageLoader'

// Rutas solo para visitantes: si ya hay sesión, se va directo al panel.
export function GuestRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <FullPageLoader />
  if (user) return <Navigate to="/dashboard" replace />

  return <Outlet />
}

// Rutas privadas: guarda el destino original para volver tras el login.
export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  return <Outlet />
}
