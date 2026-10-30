import { Router } from 'express'
import { validate } from '../../shared/middlewares/validate.js'
import { requireAuth } from '../auth/auth.middleware.js'
import * as usersController from './users.controller.js'
import { updateUserSchema } from './users.schema.js'

export const usersRouter: Router = Router()

usersRouter.use(requireAuth)
usersRouter.get('/me', usersController.me)
usersRouter.patch('/me', validate({ body: updateUserSchema }), usersController.updateMe)
usersRouter.delete('/me', usersController.deleteMe)
