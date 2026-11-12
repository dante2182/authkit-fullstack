import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthCapabilitiesProvider, AuthProvider } from '@/features/auth'
import { router } from './router'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthCapabilitiesProvider>
          <RouterProvider router={router} />
          {/* Fuera del router: un toast sobrevive a la navegación. */}
          <Toaster position="bottom-right" richColors closeButton />
        </AuthCapabilitiesProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
