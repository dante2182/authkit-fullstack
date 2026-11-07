import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { PasswordForm } from '../components/PasswordForm'
import { ProfileForm } from '../components/ProfileForm'
import { SessionsList } from '../components/SessionsList'
import { SettingsSection } from '../components/SettingsSection'

export function AccountPage() {
  // Cambiar la contraseña con `revokeOtherSessions` invalida la sesión actual y
  // emite un token nuevo. La lista de sesiones se remonta para no quedarse con
  // el token muerto marcado como "Esta sesión".
  const [sessionsVersion, setSessionsVersion] = useState(0)

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tu cuenta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona tu perfil, tu contraseña y las sesiones abiertas.
          </p>
        </section>

        <SettingsSection title="Perfil" description="El nombre que se muestra en la aplicación.">
          <ProfileForm />
        </SettingsSection>

        <SettingsSection
          title="Contraseña"
          description="Cambia tu contraseña. Puedes cerrar el resto de sesiones al mismo tiempo."
        >
          <PasswordForm
            onOtherSessionsRevoked={() => setSessionsVersion((version) => version + 1)}
          />
        </SettingsSection>

        <SettingsSection
          title="Sesiones"
          description="Dispositivos con la sesión abierta. Revoca los que no reconozcas."
        >
          <SessionsList key={sessionsVersion} />
        </SettingsSection>
      </main>
    </div>
  )
}
