import { Router } from 'express'
import { authCapabilities } from '../../config/auth-capabilities.js'

// Contrato público de autenticación: el frontend decide qué pintar con él. No pasa
// por el rate limit de /auth ni exige sesión: es configuración estática.
export const configRouter: Router = Router()

configRouter.get('/auth', (_req, res) => {
  // Cambia al desplegar (activar un proveedor, cerrar el registro): no cachear.
  res.set('Cache-Control', 'no-store')
  res.json(authCapabilities)
})
