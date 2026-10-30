import { auth } from '../../config/auth.js'
import type { LoginInput, RegisterInput } from './auth.schema.js'

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
}
