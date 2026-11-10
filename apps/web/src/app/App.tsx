import { RouterProvider } from 'react-router-dom'
import { AuthCapabilitiesProvider, AuthProvider } from '@/features/auth'
import { router } from './router'

function App() {
  return (
    <AuthProvider>
      <AuthCapabilitiesProvider>
        <RouterProvider router={router} />
      </AuthCapabilitiesProvider>
    </AuthProvider>
  )
}

export default App
