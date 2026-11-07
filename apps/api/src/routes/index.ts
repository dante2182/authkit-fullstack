import { Router } from 'express'
import { env } from '../config/env.js'
import { adminRouter } from '../modules/admin/admin.routes.js'
import { usersRouter } from '../modules/users/users.routes.js'
import { testOnlyRouter } from './test-only.routes.js'

export const router: Router = Router()

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' })
})

// /api/auth lo sirve better-auth directamente en app.ts, antes de express.json().
router.use('/users', usersRouter)
router.use('/admin', adminRouter)

// Rutas de apoyo que solo existen en el entorno de test.
if (env.NODE_ENV === 'test') router.use('/test', testOnlyRouter)
