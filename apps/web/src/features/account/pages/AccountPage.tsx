import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { ChangeEmailSection } from '../components/ChangeEmailSection'
import { DeleteAccountSection } from '../components/DeleteAccountSection'
import { PasswordForm } from '../components/PasswordForm'
import { ProfileForm } from '../components/ProfileForm'
import { SessionsList } from '../components/SessionsList'
import { SettingsSection } from '../components/SettingsSection'
import { accountService } from '../services/account.service'

export function AccountPage() {
  // Cambiar la contraseña con `revokeOtherSessions` invalida la sesión actual y
  // emite un token nuevo. La lista de sesiones se remonta para no quedarse con
  // el token muerto marcado como "Esta sesión".
  const [sessionsVersion, setSessionsVersion] = useState(0)
  // null = comprobando. Un usuario solo-OAuth no tiene cuenta `credential` y no
  // puede cambiar una contraseña que no existe.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true

    accountService
      .listAccounts()
      .then((accounts) => {
        if (!active) return
        setHasPassword(accounts.some((account) => account.providerId === 'credential'))
      })
      .catch(() => {
        // Si la comprobación falla, se muestra el formulario: es preferible un
        // error claro de la API a esconder la única forma de cambiar la clave.
        if (active) setHasPassword(true)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tu cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona tu perfil, tu correo, tu contraseña y las sesiones abiertas.
          </p>
        </section>

        <SettingsSection title="Perfil" description="El nombre que se muestra en la aplicación.">
          <ProfileForm />
        </SettingsSection>

        <SettingsSection
          title="Correo electrónico"
          description="El cambio se confirma desde tu correo actual."
        >
          <ChangeEmailSection />
        </SettingsSection>

        {hasPassword === false ? (
          <SettingsSection
            title="Contraseña"
            description="Esta cuenta entra solo con proveedores sociales."
          >
            <p className="text-sm text-slate-500">
              No hay contraseña asociada. Inicia sesión con el mismo proveedor que usaste para crear
              la cuenta.
            </p>
          </SettingsSection>
        ) : hasPassword ? (
          <SettingsSection
            title="Contraseña"
            description="Cambia tu contraseña. Puedes cerrar el resto de sesiones al mismo tiempo."
          >
            <PasswordForm
              onOtherSessionsRevoked={() => setSessionsVersion((version) => version + 1)}
            />
          </SettingsSection>
        ) : null}

        <SettingsSection
          title="Sesiones"
          description="Dispositivos con la sesión abierta. Revoca los que no reconozcas."
        >
          <SessionsList key={sessionsVersion} />
        </SettingsSection>

        {hasPassword === false ? (
          <SettingsSection
            title="Zona de peligro"
            description="Borrar la cuenta requiere una contraseña y esta cuenta no tiene."
          >
            <p className="text-sm text-slate-500">
              Las cuentas que entran solo con proveedores sociales no pueden borrarse desde aquí.
            </p>
          </SettingsSection>
        ) : hasPassword ? (
          <SettingsSection
            title="Zona de peligro"
            description="Acciones irreversibles sobre tu cuenta."
          >
            <DeleteAccountSection />
          </SettingsSection>
        ) : null}
      </main>
    </div>
  )
}
