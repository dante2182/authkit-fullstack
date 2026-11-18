import { describe, expect, it } from 'vitest'
import { buildCookieAttributes } from './cookies.js'

const base = {
  NODE_ENV: 'development' as const,
  COOKIE_SAME_SITE: 'lax' as const,
  COOKIE_SECURE: false,
}

describe('buildCookieAttributes', () => {
  it('default: lax, httpOnly, sin domain', () => {
    expect(buildCookieAttributes(base)).toEqual({ httpOnly: true, sameSite: 'lax', secure: false })
  })

  it('incluye el domain cuando se define', () => {
    expect(buildCookieAttributes({ ...base, COOKIE_DOMAIN: '.example.com' })).toMatchObject({
      domain: '.example.com',
    })
  })

  it('sameSite none exige secure', () => {
    expect(() => buildCookieAttributes({ ...base, COOKIE_SAME_SITE: 'none' })).toThrow(/secure/i)
  })

  it('sameSite none con secure es válido', () => {
    expect(
      buildCookieAttributes({ ...base, COOKIE_SAME_SITE: 'none', COOKIE_SECURE: true }),
    ).toMatchObject({ sameSite: 'none', secure: true })
  })

  it('en producción secure es true por defecto', () => {
    expect(buildCookieAttributes({ ...base, NODE_ENV: 'production' })).toMatchObject({
      secure: true,
    })
  })
})
