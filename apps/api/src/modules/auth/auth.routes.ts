import { Router } from 'express'
import { validate } from '../../shared/middlewares/validate.js'
import * as authController from './auth.controller.js'
import { requireAuth } from './auth.middleware.js'
import { loginSchema, registerSchema } from './auth.schema.js'

export const authRouter: Router = Router()

authRouter.post('/register', validate({ body: registerSchema }), authController.register)
authRouter.post('/login', validate({ body: loginSchema }), authController.login)
authRouter.post('/logout', requireAuth, authController.logout)
authRouter.get('/session', requireAuth, authController.session)
