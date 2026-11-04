import { Router } from 'express'
import { authRateLimit } from '../config/rate-limit.js'
import { env } from '../config/env.js'
import { authRouter } from '../modules/auth/auth.routes.js'
import { usersRouter } from '../modules/users/users.routes.js'
import { testOnlyRouter } from './test-only.routes.js'

export const router: Router = Router()

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' })
})

router.use('/auth', authRateLimit, authRouter)
router.use('/users', usersRouter)

// Rutas de apoyo que solo existen en el entorno de test.
if (env.NODE_ENV === 'test') router.use('/test', testOnlyRouter)
