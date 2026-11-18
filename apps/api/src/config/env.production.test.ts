import { describe, expect, it } from 'vitest'
import { envSchema } from './env.js'

const prod = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://u:p@db:5432/app',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'https://api.example.com',
  CORS_ORIGIN: 'https://app.example.com',
  RESEND_API_KEY: 're_test',
}

describe('envSchema en producción', () => {
  it('acepta https en ambos lados', () => {
    expect(envSchema.safeParse(prod).success).toBe(true)
  })

  it('rechaza BETTER_AUTH_URL sin https', () => {
    const r = envSchema.safeParse({ ...prod, BETTER_AUTH_URL: 'http://api.example.com' })
    expect(r.success).toBe(false)
    expect(JSON.stringify(r.error?.issues)).toMatch(/https/i)
  })

  it('rechaza un origen CORS sin https', () => {
    const r = envSchema.safeParse({ ...prod, CORS_ORIGIN: 'http://app.example.com' })
    expect(r.success).toBe(false)
  })

  it('rechaza localhost en producción', () => {
    const r = envSchema.safeParse({ ...prod, CORS_ORIGIN: 'https://localhost:5173' })
    expect(r.success).toBe(false)
    expect(JSON.stringify(r.error?.issues)).toMatch(/localhost/i)
  })
})
