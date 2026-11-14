import { describe, expect, it } from 'vitest'
import { parseCorsOrigins } from './cors-origins.js'

describe('parseCorsOrigins', () => {
  it('acepta un solo origen', () => {
    expect(parseCorsOrigins('http://localhost:5173')).toEqual(['http://localhost:5173'])
  })

  it('separa por comas y recorta espacios', () => {
    expect(parseCorsOrigins('https://app.example.com, https://preview.example.com')).toEqual([
      'https://app.example.com',
      'https://preview.example.com',
    ])
  })

  it('ignora entradas vacías', () => {
    expect(parseCorsOrigins('https://app.example.com,,')).toEqual(['https://app.example.com'])
  })

  it('rechaza una entrada que no es URL', () => {
    expect(() => parseCorsOrigins('https://app.example.com,nope')).toThrow(/nope/)
  })

  it('rechaza una lista vacía', () => {
    expect(() => parseCorsOrigins(' , ')).toThrow(/al menos un origen/i)
  })
})
