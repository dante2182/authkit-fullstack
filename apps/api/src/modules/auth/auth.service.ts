import { auth } from '../../config/auth.js'
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
} from './auth.schema.js'

// better-auth devuelve la Response cruda (asResponse) para reenviar cookies.
export const authService = {
  register(input: RegisterInput, headers: Headers): Promise<Response> {
    return auth.api.signUpEmail({ body: input, headers, asResponse: true })
  },

  login(input: LoginInput, headers: Headers): Promise<Response> {
    return auth.api.signInEmail({ body: input, headers, asResponse: true })
  },

  logout(headers: Headers): Promise<Response> {
    return auth.api.signOut({ headers, asResponse: true })
  },

  requestPasswordReset(input: RequestPasswordResetInput, headers: Headers): Promise<Response> {
    return auth.api.requestPasswordReset({ body: input, headers, asResponse: true })
  },

  resetPassword(input: ResetPasswordInput, headers: Headers): Promise<Response> {
    return auth.api.resetPassword({ body: input, headers, asResponse: true })
  },

  sendVerificationEmail(
    input: { email: string; callbackURL: string },
    headers: Headers,
  ): Promise<Response> {
    return auth.api.sendVerificationEmail({ body: input, headers, asResponse: true })
  },

  verifyEmail(query: { token: string; callbackURL: string }, headers: Headers): Promise<Response> {
    return auth.api.verifyEmail({ query, headers, asResponse: true })
  },

  // Lista las sesiones activas del usuario autenticado. Incluye el token, así que
  // el controlador lo elimina antes de responder.
  listSessions(headers: Headers) {
    return auth.api.listSessions({ headers })
  },

  // El token se resuelve en el servidor a partir del id: nunca viaja al cliente.
  revokeSession(token: string, headers: Headers): Promise<Response> {
    return auth.api.revokeSession({ body: { token }, headers, asResponse: true })
  },

  revokeOtherSessions(headers: Headers): Promise<Response> {
    return auth.api.revokeOtherSessions({ headers, asResponse: true })
  },

  changePassword(input: ChangePasswordInput, headers: Headers): Promise<Response> {
    return auth.api.changePassword({ body: input, headers, asResponse: true })
  },
}
