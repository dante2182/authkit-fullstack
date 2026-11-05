import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { Role } from '../../generated/prisma/enums.js'
import { requirePermission, requireRole } from '../../modules/auth/auth.middleware.js'
import { AppError } from '../errors/app-error.js'
import {
  hasPermission,
  losesPrivileges,
  PERMISSIONS,
  resolveRole,
  type Role as RoleType,
} from './permissions.js'

// Rol de prueba que no existe en el enum: demuestra que los middlewares no
// dependen del enum de Prisma y que un rol sin permisos mapeados se deniega.
const TEST_ROLE = 'SUPPORT' as unknown as RoleType

function fakeRequest(role?: string): Request {
  if (role === undefined) return {} as Request
  return { auth: { user: { role } } } as unknown as Request
}

function run(handler: ReturnType<typeof requirePermission>) {
  const next = vi.fn() as unknown as NextFunction
  const res = {} as Response
  return { next, res, handler }
}

describe('permissions map', () => {
  it('ADMIN tiene todos los permisos y USER no tiene permisos de administración', () => {
    for (const permission of Object.values(PERMISSIONS)) {
      expect(hasPermission(Role.ADMIN, permission)).toBe(true)
      expect(hasPermission(Role.USER, permission)).toBe(false)
    }
  })

  it('un rol no mapeado se deniega sin romper', () => {
    expect(hasPermission(TEST_ROLE, PERMISSIONS.ADMIN_USERS_READ)).toBe(false)
  })

  it('normaliza valores desconocidos al rol menos privilegiado', () => {
    expect(resolveRole(undefined)).toBe(Role.USER)
    expect(resolveRole('NO_EXISTE')).toBe(Role.USER)
    expect(resolveRole(Role.ADMIN)).toBe(Role.ADMIN)
  })

  it('detecta pérdida de privilegios', () => {
    expect(losesPrivileges(Role.ADMIN, Role.USER)).toBe(true)
    expect(losesPrivileges(Role.USER, Role.ADMIN)).toBe(false)
    expect(losesPrivileges(Role.ADMIN, Role.ADMIN)).toBe(false)
  })
})

describe('requirePermission', () => {
  it('deja pasar a ADMIN con el permiso', () => {
    const { handler, next, res } = run(requirePermission(PERMISSIONS.ADMIN_USERS_READ))

    expect(() => handler(fakeRequest(Role.ADMIN), res, next)).not.toThrow()
    expect(next).toHaveBeenCalledOnce()
  })

  it('devuelve 403 INSUFFICIENT_PERMISSION con USER', () => {
    const { handler, next, res } = run(requirePermission(PERMISSIONS.ADMIN_USERS_READ))

    expect(() => handler(fakeRequest(Role.USER), res, next)).toThrow(AppError)

    try {
      handler(fakeRequest(Role.USER), res, next)
    } catch (error) {
      expect(error).toMatchObject({ status: 403, code: 'INSUFFICIENT_PERMISSION' })
    }
    expect(next).not.toHaveBeenCalled()
  })

  it('deniega un rol de prueba sin permisos mapeados', () => {
    const { handler, next, res } = run(requirePermission(PERMISSIONS.ADMIN_USERS_READ))

    try {
      handler(fakeRequest(TEST_ROLE), res, next)
    } catch (error) {
      expect(error).toMatchObject({ status: 403, code: 'INSUFFICIENT_PERMISSION' })
    }
    expect(next).not.toHaveBeenCalled()
  })

  it('responde 401 si se usa sin requireAuth', () => {
    const { handler, next, res } = run(requirePermission(PERMISSIONS.ADMIN_USERS_READ))

    try {
      handler(fakeRequest(), res, next)
    } catch (error) {
      expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' })
    }
    expect(next).not.toHaveBeenCalled()
  })
})

describe('requireRole', () => {
  it('deja pasar al rol exigido', () => {
    const { handler, next, res } = run(requireRole(Role.ADMIN))

    expect(() => handler(fakeRequest(Role.ADMIN), res, next)).not.toThrow()
    expect(next).toHaveBeenCalledOnce()
  })

  it('devuelve 403 INSUFFICIENT_ROLE con otro rol', () => {
    const { handler, next, res } = run(requireRole(Role.ADMIN))

    try {
      handler(fakeRequest(Role.USER), res, next)
    } catch (error) {
      expect(error).toMatchObject({ status: 403, code: 'INSUFFICIENT_ROLE' })
    }
    expect(next).not.toHaveBeenCalled()
  })

  it('acepta un rol de prueba pasado solo en el test', () => {
    const { handler, next, res } = run(requireRole(TEST_ROLE))

    expect(() => handler(fakeRequest(TEST_ROLE), res, next)).not.toThrow()
    expect(next).toHaveBeenCalledOnce()
  })

  it('responde 401 si se usa sin requireAuth', () => {
    const { handler, next, res } = run(requireRole(Role.ADMIN))

    try {
      handler(fakeRequest(), res, next)
    } catch (error) {
      expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' })
    }
    expect(next).not.toHaveBeenCalled()
  })
})
