// Atributos de la cookie de sesión. `sameSite: none` solo vale con `secure`: sin esa
// pareja el navegador descarta la cookie en silencio.
export type CookieEnv = {
  NODE_ENV: 'development' | 'test' | 'production'
  COOKIE_SAME_SITE: 'lax' | 'strict' | 'none'
  COOKIE_SECURE: boolean
  COOKIE_DOMAIN?: string | undefined
}

export type CookieAttributes = {
  httpOnly: true
  sameSite: 'lax' | 'strict' | 'none'
  secure: boolean
  domain?: string
}

export function buildCookieAttributes(input: CookieEnv): CookieAttributes {
  const secure = input.COOKIE_SECURE || input.NODE_ENV === 'production'

  if (input.COOKIE_SAME_SITE === 'none' && !secure) {
    throw new Error('COOKIE_SAME_SITE=none exige COOKIE_SECURE=true')
  }

  return {
    httpOnly: true,
    sameSite: input.COOKIE_SAME_SITE,
    secure,
    ...(input.COOKIE_DOMAIN ? { domain: input.COOKIE_DOMAIN } : {}),
  }
}
