import { assign, fromPromise, setup } from 'xstate'

import { createMockAuthApi, defaultScenarioId, type ApiErrorFixture, type MockAuthApi, type ScenarioPreset, type TokenFixture } from '../scenarios'

type AuthMachineError = {
  operation: 'session' | 'callback' | 'refresh' | 'logout'
  detail: ApiErrorFixture
}

export type AuthMachineContext = {
  scenario: ScenarioPreset
  token: TokenFixture | null
  activeTabs: number
  serverClockOffsetMs: number
  error: AuthMachineError | null
}

type LoginEvent = { type: 'LOGIN' }
type SubmitCallbackEvent = { type: 'SUBMIT_CALLBACK'; state: string }
type TokenExpiredEvent = { type: 'TOKEN_EXPIRED' }
type RefreshEvent = { type: 'REFRESH' }
type LogoutEvent = { type: 'LOGOUT'; tabId?: string }
type SessionRevokedEvent = { type: 'SESSION_REVOKED'; reason?: string }
type ResetErrorEvent = { type: 'RESET_ERROR' }

export type AuthMachineEvent =
  | LoginEvent
  | SubmitCallbackEvent
  | TokenExpiredEvent
  | RefreshEvent
  | LogoutEvent
  | SessionRevokedEvent
  | ResetErrorEvent

type AuthMachineInput = {
  scenarioId?: string
  api?: MockAuthApi
}

const toMachineError = (operation: AuthMachineError['operation'], detail: ApiErrorFixture): AuthMachineError => ({
  operation,
  detail,
})

export const createAuthMachine = ({ scenarioId = defaultScenarioId, api }: AuthMachineInput = {}) => {
  const authApi = api ?? createMockAuthApi(scenarioId, { latency: 'none' })
  const scenario = authApi.getScenario()

  return setup({
    types: {
      context: {} as AuthMachineContext,
      events: {} as AuthMachineEvent,
      input: {} as AuthMachineInput,
    },
    actors: {
      fetchSession: fromPromise(async () => {
        const response = await authApi.fetchSession()
        if (!response.ok) {
          throw toMachineError('session', response.error)
        }
        return response.data
      }),
      submitCallback: fromPromise(async ({ input }: { input: SubmitCallbackEvent }) => {
        const response = await authApi.submitOAuthCallback(input.state)
        if (!response.ok) {
          throw toMachineError('callback', response.error)
        }

        return {
          accepted: response.data.accepted,
          token: {
            ...scenario.fixture.tokens,
            valid: true,
          } satisfies TokenFixture,
        }
      }),
      refreshToken: fromPromise(async () => {
        const response = await authApi.refreshToken()
        if (!response.ok) {
          throw toMachineError('refresh', response.error)
        }
        return response.data.token
      }),
      logout: fromPromise(async ({ input }: { input: LogoutEvent }) => {
        const response = await authApi.logout(input.tabId)
        if (!response.ok) {
          throw toMachineError('logout', response.error)
        }
        return response.data
      }),
    },
  }).createMachine({
    id: 'authFlow',
    initial: 'booting',
    context: {
      scenario,
      token: scenario.fixture.tokens.valid ? scenario.fixture.tokens : null,
      activeTabs: scenario.fixture.tabsActive,
      serverClockOffsetMs: scenario.fixture.serverClockOffsetMs,
      error: null,
    },
    states: {
      booting: {
        invoke: {
          src: 'fetchSession',
          onDone: {
            target: 'unauthenticated',
            actions: assign({
              activeTabs: ({ event }) => event.output.activeTabs,
              serverClockOffsetMs: ({ event }) => event.output.serverClockOffsetMs,
              error: () => null,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error as AuthMachineError,
            }),
          },
        },
      },
      unauthenticated: {
        on: {
          LOGIN: {
            target: 'authorizing',
            actions: assign({
              error: () => null,
            }),
          },
        },
      },
      authorizing: {
        on: {
          SUBMIT_CALLBACK: {
            target: 'validatingCallback',
          },
          LOGOUT: {
            target: 'loggingOut',
          },
        },
      },
      validatingCallback: {
        invoke: {
          src: 'submitCallback',
          input: ({ event }) => event as SubmitCallbackEvent,
          onDone: {
            target: 'authenticated',
            actions: assign({
              token: ({ event }) => event.output.token,
              error: () => null,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              token: () => null,
              error: ({ event }) => event.error as AuthMachineError,
            }),
          },
        },
      },
      authenticated: {
        on: {
          TOKEN_EXPIRED: 'refreshing',
          REFRESH: 'refreshing',
          LOGOUT: 'loggingOut',
          SESSION_REVOKED: {
            target: 'error',
            actions: assign({
              token: () => null,
              error: ({ context, event }) => ({
                operation: 'session',
                detail: context.scenario.fixture.apiErrors.session ?? {
                  code: event.reason ? 'session_revoked' : 'session_invalid',
                  status: 401,
                  message: event.reason ?? 'Session no longer valid.',
                },
              }),
            }),
          },
        },
      },
      refreshing: {
        invoke: {
          src: 'refreshToken',
          onDone: {
            target: 'authenticated',
            actions: assign({
              token: ({ event }) => event.output,
              error: () => null,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              token: () => null,
              error: ({ event }) => event.error as AuthMachineError,
            }),
          },
        },
      },
      loggingOut: {
        invoke: {
          src: 'logout',
          input: ({ event }) => (event.type === 'LOGOUT' ? event : { type: 'LOGOUT' }),
          onDone: {
            target: 'unauthenticated',
            actions: assign({
              token: () => null,
              error: () => null,
              activeTabs: ({ event }) => event.output.tabsNotified,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              error: ({ event }) => event.error as AuthMachineError,
            }),
          },
        },
      },
      error: {
        on: {
          RESET_ERROR: {
            target: 'unauthenticated',
            actions: assign({
              error: () => null,
            }),
          },
          LOGIN: {
            target: 'authorizing',
            actions: assign({
              error: () => null,
            }),
          },
          LOGOUT: 'loggingOut',
        },
      },
    },
  })
}

export type AuthMachine = ReturnType<typeof createAuthMachine>
