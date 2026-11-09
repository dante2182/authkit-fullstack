import { describe, expect, it } from 'vitest'
import { envSchema } from './env.js'

const productionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/app',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:4000',
}

describe('envSchema', () => {
  it('exige RESEND_API_KEY en producción: el correo nunca se imprime en consola', () => {
    const result = envSchema.safeParse(productionEnv)

    expect(result.success).toBe(false)
  })

  it('acepta producción cuando RESEND_API_KEY está definida', () => {
    const result = envSchema.safeParse({ ...productionEnv, RESEND_API_KEY: 're_test_key' })

    expect(result.success).toBe(true)
  })

  it('trata RESEND_API_KEY vacía como ausente en desarrollo', () => {
    const parsed = envSchema.parse({
      ...productionEnv,
      NODE_ENV: 'development',
      RESEND_API_KEY: '',
    })

    expect(parsed.RESEND_API_KEY).toBeUndefined()
  })

  it('sigue exigiendo RESEND_API_KEY en producción aunque llegue vacía', () => {
    const result = envSchema.safeParse({ ...productionEnv, RESEND_API_KEY: '' })

    expect(result.success).toBe(false)
  })

  it('interpreta "false" como false en SENSITIVE_RATE_LIMIT_ENABLED', () => {
    const parsed = envSchema.parse({
      ...productionEnv,
      RESEND_API_KEY: 're_test_key',
      SENSITIVE_RATE_LIMIT_ENABLED: 'false',
    })

    expect(parsed.SENSITIVE_RATE_LIMIT_ENABLED).toBe(false)
  })

  it('acepta un proveedor social solo con la pareja completa', () => {
    const parsed = envSchema.parse({
      ...productionEnv,
      NODE_ENV: 'development',
      GOOGLE_CLIENT_ID: 'google-id',
      GOOGLE_CLIENT_SECRET: 'google-secret',
    })

    expect(parsed.GOOGLE_CLIENT_ID).toBe('google-id')
  })

  it('rechaza media pareja de credenciales sociales', () => {
    const result = envSchema.safeParse({
      ...productionEnv,
      NODE_ENV: 'development',
      GITHUB_CLIENT_ID: 'github-id',
    })

    expect(result.success).toBe(false)
  })

  it('trata las credenciales sociales vacías como ausentes', () => {
    const parsed = envSchema.parse({
      ...productionEnv,
      NODE_ENV: 'development',
      GITHUB_CLIENT_ID: '',
      GITHUB_CLIENT_SECRET: '',
    })

    expect(parsed.GITHUB_CLIENT_ID).toBeUndefined()
  })
})

describe('modos de autenticación', () => {
  const devEnv = { ...productionEnv, NODE_ENV: 'development' }

  it('activa credenciales y registro por defecto', () => {
    const parsed = envSchema.parse(devEnv)

    expect(parsed.AUTH_EMAIL_PASSWORD_ENABLED).toBe(true)
    expect(parsed.AUTH_SIGN_UP_ENABLED).toBe(true)
  })

  it('interpreta "false" en AUTH_EMAIL_PASSWORD_ENABLED', () => {
    const parsed = envSchema.parse({
      ...devEnv,
      AUTH_EMAIL_PASSWORD_ENABLED: 'false',
      GOOGLE_CLIENT_ID: 'google-id',
      GOOGLE_CLIENT_SECRET: 'google-secret',
    })

    expect(parsed.AUTH_EMAIL_PASSWORD_ENABLED).toBe(false)
  })

  it('interpreta "false" en AUTH_SIGN_UP_ENABLED', () => {
    const parsed = envSchema.parse({ ...devEnv, AUTH_SIGN_UP_ENABLED: 'false' })

    expect(parsed.AUTH_SIGN_UP_ENABLED).toBe(false)
  })

  it('trata los flags vacíos como ausentes y aplica el default', () => {
    const parsed = envSchema.parse({
      ...devEnv,
      AUTH_EMAIL_PASSWORD_ENABLED: '',
      AUTH_SIGN_UP_ENABLED: '',
    })

    expect(parsed.AUTH_EMAIL_PASSWORD_ENABLED).toBe(true)
    expect(parsed.AUTH_SIGN_UP_ENABLED).toBe(true)
  })

  it('trata solo espacios como ausente', () => {
    const parsed = envSchema.parse({
      ...devEnv,
      AUTH_EMAIL_PASSWORD_ENABLED: '   ',
      AUTH_SIGN_UP_ENABLED: '   ',
    })

    expect(parsed.AUTH_EMAIL_PASSWORD_ENABLED).toBe(true)
    expect(parsed.AUTH_SIGN_UP_ENABLED).toBe(true)
  })

  it('respeta cada flag cuando uno está vacío y el otro en "false"', () => {
    const parsed = envSchema.parse({
      ...devEnv,
      AUTH_EMAIL_PASSWORD_ENABLED: '',
      AUTH_SIGN_UP_ENABLED: 'false',
    })

    expect(parsed.AUTH_EMAIL_PASSWORD_ENABLED).toBe(true)
    expect(parsed.AUTH_SIGN_UP_ENABLED).toBe(false)
  })

  it.each(['yes', 'FALSE', '1'])('rechaza el valor inválido %s sin coercionar', (value) => {
    const result = envSchema.safeParse({ ...devEnv, AUTH_EMAIL_PASSWORD_ENABLED: value })

    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some((issue) => issue.path.includes('AUTH_EMAIL_PASSWORD_ENABLED')),
    ).toBe(true)
  })

  it('mantiene el rechazo de SENSITIVE_RATE_LIMIT_ENABLED vacío', () => {
    // Invariante: el helper nuevo no cambia el comportamiento de los flags existentes.
    const result = envSchema.safeParse({ ...devEnv, SENSITIVE_RATE_LIMIT_ENABLED: '' })

    expect(result.success).toBe(false)
  })

  it('rechaza un modo sin ningún método de acceso', () => {
    const result = envSchema.safeParse({ ...devEnv, AUTH_EMAIL_PASSWORD_ENABLED: 'false' })

    expect(result.success).toBe(false)
    expect(
      result.error?.issues.some((issue) => issue.path.includes('AUTH_EMAIL_PASSWORD_ENABLED')),
    ).toBe(true)
  })

  it('acepta solo proveedores cuando hay una pareja completa', () => {
    const parsed = envSchema.parse({
      ...devEnv,
      AUTH_EMAIL_PASSWORD_ENABLED: 'false',
      GOOGLE_CLIENT_ID: 'google-id',
      GOOGLE_CLIENT_SECRET: 'google-secret',
    })

    expect(parsed.AUTH_EMAIL_PASSWORD_ENABLED).toBe(false)
  })
})
