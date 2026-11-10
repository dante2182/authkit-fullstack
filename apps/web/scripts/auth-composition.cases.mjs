import { createRequire } from 'node:module'
import { AuthCapabilitiesContext } from '/src/features/auth/context/auth-capabilities-context.ts'
import { AuthContext } from '/src/features/auth/context/auth-context.ts'
import { LoginPage } from '/src/features/auth/pages/LoginPage.tsx'
import { RegisterPage } from '/src/features/auth/pages/RegisterPage.tsx'

const require = createRequire(new URL('../package.json', import.meta.url))
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { MemoryRouter } = require('react-router-dom')

// `SocialButtons` y las páginas construyen el callbackURL con el origen actual.
globalThis.window = { location: { origin: 'https://app.example', assign() {} } }

const auth = {
  user: null,
  isLoading: false,
  refreshSession: async () => null,
  signOut: async () => {},
}

const capabilities = (enabled, signUpEnabled, socialProviders) => ({
  emailPassword: { enabled, signUpEnabled },
  socialProviders,
})

function render(Page, state, initialEntry = '/login') {
  const value = {
    capabilities: state.capabilities ?? null,
    isLoading: state.isLoading ?? false,
    error: state.error ?? null,
    reload: () => {},
  }

  return renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: [initialEntry] },
      React.createElement(
        AuthContext.Provider,
        { value: auth },
        React.createElement(AuthCapabilitiesContext.Provider, { value }, React.createElement(Page)),
      ),
    ),
  )
}

export const cases = []

function check(name, html, present, absent) {
  const missing = present.filter((text) => !html.includes(text))
  const leaked = absent.filter((text) => html.includes(text))

  cases.push({ name, ok: missing.length === 0 && leaked.length === 0, missing, leaked })
}

check(
  'login/loading',
  render(LoginPage, { isLoading: true }),
  ['Cargando métodos de acceso'],
  ['Entrar', 'Continuar con'],
)
check(
  'login/error',
  render(LoginPage, { error: 'No pudimos cargar los métodos de acceso.' }),
  ['No pudimos cargar los métodos de acceso.', 'Reintentar'],
  ['Entrar', 'Continuar con'],
)
check(
  'login/no-methods',
  render(LoginPage, { capabilities: capabilities(false, false, []) }),
  ['No hay ningún método de acceso activo'],
  ['Entrar', 'Crear una cuenta'],
)
check(
  'login/defaults',
  render(LoginPage, { capabilities: capabilities(true, true, []) }),
  ['Entrar', '¿Olvidaste tu contraseña?', 'Crear una cuenta'],
  ['Continuar con', 'o continúa con'],
)
check(
  'login/closed-signup',
  render(LoginPage, { capabilities: capabilities(true, false, ['google', 'github']) }),
  ['Entrar', 'o continúa con', 'Continuar con Google', 'Continuar con GitHub'],
  ['Crear una cuenta'],
)
check(
  'login/social-only',
  render(LoginPage, { capabilities: capabilities(false, true, ['google']) }),
  ['Continuar con Google', 'Crear una cuenta'],
  ['Entrar', 'o continúa con', '¿Olvidaste'],
)
check(
  'login/unknown-provider',
  render(LoginPage, { capabilities: capabilities(false, true, ['unknown-oidc']) }),
  ['Continuar con unknown-oidc'],
  ['Continuar con Google'],
)
check(
  'register/defaults',
  render(RegisterPage, { capabilities: capabilities(true, true, []) }),
  ['Crear cuenta', 'Repite la contraseña', 'Inicia sesión'],
  ['Continuar con', 'El registro está cerrado'],
)
check(
  'register/credentials+social',
  render(RegisterPage, { capabilities: capabilities(true, true, ['google']) }),
  ['Crear cuenta', 'o continúa con', 'Continuar con Google'],
  ['El registro está cerrado'],
)
check(
  'register/social-only',
  render(RegisterPage, { capabilities: capabilities(false, true, ['google']) }),
  ['Te darás de alta al continuar con un proveedor.', 'Continuar con Google'],
  ['Crear cuenta', 'Repite la contraseña'],
)
check(
  'register/closed',
  render(RegisterPage, { capabilities: capabilities(true, false, ['google']) }),
  ['El registro está cerrado. Si ya tienes cuenta, inicia sesión.'],
  ['Crear cuenta', 'Continuar con', 'o continúa con'],
)
check(
  'register/social-but-closed',
  render(RegisterPage, { capabilities: capabilities(false, false, ['google']) }),
  ['El registro está cerrado. Si ya tienes cuenta, inicia sesión.'],
  ['Crear cuenta', 'Continuar con', 'Te darás de alta'],
)
check(
  'login/oauth-account-not-linked',
  render(
    LoginPage,
    { capabilities: capabilities(true, true, ['google']) },
    '/login?error=account_not_linked',
  ),
  ['Ya existe una cuenta con ese correo.'],
  [],
)
check(
  'login/oauth-unknown-code',
  render(LoginPage, { capabilities: capabilities(true, true, ['google']) }, '/login?error=raro'),
  ['No pudimos completar el acceso con el proveedor.'],
  [],
)
check(
  'register/oauth-account-not-linked',
  render(
    RegisterPage,
    { capabilities: capabilities(true, true, ['google']) },
    '/register?error=account_not_linked',
  ),
  ['Ya existe una cuenta con ese correo.'],
  [],
)
