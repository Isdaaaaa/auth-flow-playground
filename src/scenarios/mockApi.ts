import { getScenarioById, scenarioCatalog } from './catalog'
import type {
  ApiLatencyProfile,
  ApiResponse,
  MockApiOptions,
  ScenarioPreset,
  TokenFixture,
} from './types'

const latencyMap: Record<ApiLatencyProfile, number> = {
  none: 0,
  fast: 80,
  realistic: 350,
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const resolveDelay = (latency: ApiLatencyProfile = 'realistic') =>
  new Promise((resolve) => setTimeout(resolve, latencyMap[latency]))

const withLatency = async <T>(
  run: () => ApiResponse<T>,
  options?: MockApiOptions,
): Promise<ApiResponse<T>> => {
  await resolveDelay(options?.latency)
  return run()
}

export const listScenarios = async (options?: MockApiOptions): Promise<ApiResponse<ScenarioPreset[]>> =>
  withLatency(() => ({ ok: true, data: clone(scenarioCatalog) }), options)

export const getScenario = async (
  scenarioId: string,
  options?: MockApiOptions,
): Promise<ApiResponse<ScenarioPreset>> =>
  withLatency(() => ({ ok: true, data: clone(getScenarioById(scenarioId)) }), options)

export const refreshToken = async (
  scenarioId: string,
  options?: MockApiOptions,
): Promise<ApiResponse<{ accessToken: string; refreshToken: string; rotation: number }>> =>
  withLatency(() => {
    const scenario = getScenarioById(scenarioId)
    if (scenario.fixture.apiErrors.refresh) {
      return { ok: false, error: scenario.fixture.apiErrors.refresh }
    }

    return {
      ok: true,
      data: {
        accessToken: `${scenario.fixture.tokens.accessToken}_next`,
        refreshToken: `${scenario.fixture.tokens.refreshToken}_next`,
        rotation: scenario.fixture.tokens.rotation + 1,
      },
    }
  }, options)

export const validateCallback = async (
  scenarioId: string,
  options?: MockApiOptions,
): Promise<ApiResponse<{ accepted: true }>> =>
  withLatency(() => {
    const scenario = getScenarioById(scenarioId)
    if (scenario.fixture.apiErrors.callback) {
      return { ok: false, error: scenario.fixture.apiErrors.callback }
    }
    return { ok: true, data: { accepted: true } }
  }, options)

export const fetchSession = async (
  scenarioId: string,
  options?: MockApiOptions,
): Promise<ApiResponse<{ activeTabs: number; serverClockOffsetMs: number }>> =>
  withLatency(() => {
    const scenario = getScenarioById(scenarioId)
    if (scenario.fixture.apiErrors.session) {
      return { ok: false, error: scenario.fixture.apiErrors.session }
    }

    return {
      ok: true,
      data: {
        activeTabs: scenario.fixture.tabsActive,
        serverClockOffsetMs: scenario.fixture.serverClockOffsetMs,
      },
    }
  }, options)

export type MockAuthApi = {
  getScenario(): ScenarioPreset
  fetchSession(): Promise<ApiResponse<{ activeTabs: number; serverClockOffsetMs: number }>>
  refreshToken(): Promise<ApiResponse<{ token: TokenFixture }>>
  logout(tabId?: string): Promise<ApiResponse<{ tabId: string; tabsNotified: number }>>
  submitOAuthCallback(state: string): Promise<ApiResponse<{ accepted: true }>>
}

export function createMockAuthApi(scenarioId: string, options?: MockApiOptions): MockAuthApi {
  const scenario = getScenarioById(scenarioId)

  return {
    getScenario() {
      return clone(scenario)
    },

    fetchSession() {
      return fetchSession(scenario.id, options)
    },

    async refreshToken() {
      const result = await refreshToken(scenario.id, options)
      if (!result.ok) {
        return result
      }

      const token: TokenFixture = {
        ...scenario.fixture.tokens,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
        rotation: result.data.rotation,
        valid: true,
      }

      return {
        ok: true,
        data: {
          token,
        },
      }
    },

    async logout(tabId = 'tab-1') {
      await resolveDelay(options?.latency)
      return {
        ok: true,
        data: {
          tabId,
          tabsNotified: scenario.fixture.tabsActive,
        },
      }
    },

    async submitOAuthCallback(state: string) {
      await resolveDelay(options?.latency)
      if (scenario.id === 'invalid-callback-state' || state !== 'state-expected-42') {
        return {
          ok: false,
          error:
            scenario.fixture.apiErrors.callback ?? {
              code: 'invalid_state',
              status: 400,
              message: 'State parameter does not match initiating request.',
            },
        }
      }

      return {
        ok: true,
        data: {
          accepted: true,
        },
      }
    },
  }
}
