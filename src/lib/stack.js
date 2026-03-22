import { StackClientApp } from '@stackframe/react'

const projectId = import.meta.env.VITE_STACK_PROJECT_ID
const publishableClientKey = import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY

export const isStackConfigured = Boolean(projectId && publishableClientKey)

export const stackApp = isStackConfigured
  ? new StackClientApp({
      projectId,
      publishableClientKey,
      tokenStore: 'cookie',
      urls: {
        home: '/',
        afterSignIn: '/',
        afterSignUp: '/',
        afterSignOut: '/',
        signIn: '/handler/sign-in',
        signUp: '/handler/sign-up',
        handler: '/handler',
      },
    })
  : null
