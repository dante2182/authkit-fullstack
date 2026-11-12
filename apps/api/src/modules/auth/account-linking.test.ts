import { handleOAuthUserInfo, linkOAuthAccount } from 'better-auth/oauth2'
import { beforeEach, describe, expect, it } from 'vitest'
import { auth } from '../../config/auth.js'
import { prisma } from '../../config/prisma.js'
import { resetDatabase } from '../../test/db.js'

type EndpointContext = Parameters<typeof handleOAuthUserInfo>[0]

const LINKING = {
  enabled: true,
  allowDifferentEmails: false,
  trustedProviders: [],
}

async function createLocalUser(input: { email: string; emailVerified: boolean }) {
  return prisma.user.create({
    data: {
      id: `local-${Math.random().toString(36).slice(2, 10)}`,
      name: 'Local User',
      email: input.email,
      emailVerified: input.emailVerified,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

async function linkProvider(input: {
  localEmail: string
  localVerified: boolean
  providerVerified: boolean
  providerEmail?: string
}) {
  const user = await createLocalUser({
    email: input.localEmail,
    emailVerified: input.localVerified,
  })

  const context = await auth.$context
  const result = await handleOAuthUserInfo({ context } as unknown as EndpointContext, {
    userInfo: {
      id: 'provider-user-1',
      name: 'Provider User',
      email: input.providerEmail ?? input.localEmail,
      emailVerified: input.providerVerified,
      image: null,
    },
    account: {
      providerId: 'google',
      accountId: `google-${Math.random().toString(36).slice(2, 10)}`,
      accessToken: 'access-token',
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      password: null,
    },
  })

  return { user, result }
}

beforeEach(async () => {
  await resetDatabase()
})

describe('account linking: política configurada', () => {
  it('exige email verificado y no confía en ningún proveedor', () => {
    expect(auth.options.account?.accountLinking).toMatchObject(LINKING)
  })
})

describe('account linking implícito de OAuth', () => {
  it('rechaza vincular cuando el proveedor no confirma el email', async () => {
    const { result } = await linkProvider({
      localEmail: 'victim@example.com',
      localVerified: true,
      providerVerified: false,
    })

    expect(result.error).toBe('account not linked')
    expect(result.data).toBeNull()
    expect(await prisma.account.count()).toBe(0)
  })

  it('rechaza vincular cuando la cuenta local no está verificada', async () => {
    const { result } = await linkProvider({
      localEmail: 'unverified@example.com',
      localVerified: false,
      providerVerified: true,
    })

    expect(result.error).toBe('account not linked')
    expect(result.data).toBeNull()
    expect(await prisma.account.count()).toBe(0)
  })

  it('vincula cuando el proveedor confirma el email y la cuenta local está verificada', async () => {
    const { user, result } = await linkProvider({
      localEmail: 'verified@example.com',
      localVerified: true,
      providerVerified: true,
    })

    expect(result.error).toBeNull()
    expect(result.data?.user.id).toBe(user.id)
    expect(await prisma.account.count({ where: { userId: user.id, providerId: 'google' } })).toBe(1)
  })

  it('rechaza la vinculación explícita de un email distinto al de la cuenta', async () => {
    const user = await createLocalUser({ email: 'owner@example.com', emailVerified: true })
    const context = await auth.$context

    const result = await linkOAuthAccount({ context } as unknown as EndpointContext, {
      link: { userId: user.id, email: user.email },
      userInfo: {
        name: 'Provider User',
        email: 'attacker@example.com',
        emailVerified: true,
        image: null,
      },
      account: {
        providerId: 'google',
        accountId: 'google-explicit-link',
        accessToken: 'access-token',
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: null,
      },
      profile: {},
    })

    expect(result).toEqual({ linked: false, error: { code: 'email_does_not_match' } })
    expect(await prisma.account.count()).toBe(0)
  })
})
