import { auth } from '../../config/auth.js'
import type {
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
}
