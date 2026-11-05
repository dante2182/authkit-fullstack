import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import { Role } from '../generated/prisma/enums.js'

// Bootstrap del primer administrador de un proyecto derivado.
// Sin endpoint HTTP a propósito: el rol ADMIN solo se concede desde la consola
// del servidor (o desde este script). Es idempotente.
async function main(): Promise<void> {
  const email = env.ADMIN_EMAIL

  if (!email) {
    console.error(
      'Falta ADMIN_EMAIL. Defínelo en apps/api/.env con el correo de un usuario ya registrado.',
    )
    process.exitCode = 1
    return
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, emailVerified: true },
  })

  if (!user) {
    console.error(
      `No existe ningún usuario con el email "${email}". ` +
        'Regístralo primero con POST /api/auth/register y vuelve a ejecutar el script.',
    )
    process.exitCode = 1
    return
  }

  if (user.role === Role.ADMIN) {
    console.log(`El usuario "${email}" ya es ADMIN. No hay cambios.`)
    warnIfUnverified(user.email, user.emailVerified)
    return
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: Role.ADMIN } })
  console.log(`Usuario "${email}" promovido a ADMIN.`)
  warnIfUnverified(user.email, user.emailVerified)
}

// Las rutas /api/admin/* exigen email verificado (requireVerifiedEmail).
// Sin RESEND_API_KEY el correo de verificación no se envía en desarrollo, así
// que conviene avisar en vez de dejar al operador con un 403 inesperado.
function warnIfUnverified(email: string, emailVerified: boolean): void {
  if (emailVerified) return

  console.warn(
    `Aviso: el email de "${email}" no está verificado. Las rutas /api/admin/* ` +
      'responderán 403 EMAIL_NOT_VERIFIED hasta que lo verifiques.',
  )
}

main()
  .catch((error: unknown) => {
    console.error('No se pudo promover al administrador:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
