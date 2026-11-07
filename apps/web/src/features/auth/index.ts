// API pública de la feature auth. Exporta aquí solo lo que otras capas pueden usar.

// Contexto y provider
export { AuthProvider } from './providers/AuthProvider'
export { useAuth } from './hooks/use-auth'
export type { AuthContextValue } from './context/auth-context'

// Layout y guards
export { AuthLayout } from './components/AuthLayout'
export { GuestRoute, ProtectedRoute } from './components/guards'

// Páginas
export { ForgotPasswordPage } from './pages/ForgotPasswordPage'
export { LoginPage } from './pages/LoginPage'
export { RegisterPage } from './pages/RegisterPage'
export { ResetPasswordPage } from './pages/ResetPasswordPage'
export { VerifyEmailPage } from './pages/VerifyEmailPage'

// Componentes que otras features pueden reutilizar
export { Alert } from './components/Alert'
export { FullPageLoader } from './components/FullPageLoader'
export { PasswordField } from './components/PasswordField'
export { ResendVerificationButton } from './components/ResendVerificationButton'
export { SubmitButton } from './components/SubmitButton'
export { TextField } from './components/TextField'

// Traducción compartida de códigos de error de la API/better-auth
export { authErrorMessage } from './lib/auth-errors'

// Tipos del contrato
export type { AuthSession, AuthUser, SessionResponse, UserRole } from './types'
