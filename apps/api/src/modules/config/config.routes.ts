import { Router } from 'express'
import { authCapabilities } from '../../config/auth-capabilities.js'

// Contrato público de autenticación. El frontend lo lee una vez al arrancar para
// decidir qué pintar (formulario, botones sociales o ambos).
// No pasa por el rate limit de /auth ni exige sesión: es configuración estática.
export const configRouter: Router = Router()

configRouter.get('/auth', (_req, res) => {
  // Cambia al desplegar (activar un proveedor, cerrar el registro): no cachear.
  res.set('Cache-Control', 'no-store')
  res.json(authCapabilities)
})
