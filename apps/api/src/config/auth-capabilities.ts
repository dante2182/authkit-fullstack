import { env } from './env.js'

// Orden estable: el frontend pinta los botones en este mismo orden.
const PROVIDER_IDS = ['google', 'github'] as const

export type SocialProviderId = (typeof PROVIDER_IDS)[number]

export interface SocialProviderSettings {
  clientId: string
  clientSecret: string
  disableSignUp: boolean
}

export interface AuthCapabilities {
  emailPassword: { enabled: boolean; signUpEnabled: boolean }
  socialProviders: SocialProviderId[]
}

// Credenciales crudas por proveedor, declaradas solo aquí: el handler nativo y el
// contrato público se derivan de este mapa, así que no pueden divergir.
const providerCredentials: Record<
  SocialProviderId,
  { clientId: string | undefined; clientSecret: string | undefined }
> = {
  google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
}

function isProviderConfigured(id: SocialProviderId): boolean {
  const { clientId, clientSecret } = providerCredentials[id]
  return Boolean(clientId && clientSecret)
}

// Config que espera `socialProviders` de better-auth. Un proveedor sin pareja
// completa no se registra: sus rutas responden PROVIDER_NOT_FOUND.
export function buildSocialProvidersConfig(): Partial<
  Record<SocialProviderId, SocialProviderSettings>
> {
  const config: Partial<Record<SocialProviderId, SocialProviderSettings>> = {}

  for (const id of PROVIDER_IDS) {
    const { clientId, clientSecret } = providerCredentials[id]
    if (!clientId || !clientSecret) continue

    config[id] = {
      clientId,
      clientSecret,
      disableSignUp: !env.AUTH_SIGN_UP_ENABLED,
    }
  }

  return config
}

// Contrato público (GET /api/config/auth). Solo lo que el cliente necesita para
// decidir qué pintar; nunca secretos ni detalles internos de better-auth.
export const authCapabilities: AuthCapabilities = {
  emailPassword: {
    enabled: env.AUTH_EMAIL_PASSWORD_ENABLED,
    signUpEnabled: env.AUTH_SIGN_UP_ENABLED,
  },
  socialProviders: PROVIDER_IDS.filter(isProviderConfigured),
}
