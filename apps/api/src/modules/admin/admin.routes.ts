import { Router } from 'express'
import { PERMISSIONS } from '../../shared/auth/permissions.js'
import { validate } from '../../shared/middlewares/validate.js'
import { requireAuth, requirePermission, requireVerifiedEmail } from '../auth/auth.middleware.js'
import * as adminController from './admin.controller.js'
import { changeRoleSchema, listUsersQuerySchema, userIdParamSchema } from './admin.schema.js'

export const adminRouter: Router = Router()

adminRouter.use(requireAuth, requireVerifiedEmail)

adminRouter.get(
  '/users',
  requirePermission(PERMISSIONS.ADMIN_USERS_READ),
  validate({ query: listUsersQuerySchema }),
  adminController.listUsers,
)

adminRouter.patch(
  '/users/:id/role',
  requirePermission(PERMISSIONS.ADMIN_USERS_ROLES_UPDATE),
  validate({ params: userIdParamSchema, body: changeRoleSchema }),
  adminController.changeRole,
)
