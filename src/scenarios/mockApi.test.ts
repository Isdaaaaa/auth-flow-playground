import { describe, expect, it } from 'vitest'
import { createMockAuthApi } from './mockApi'

describe('createMockAuthApi', () => {
  it('returns deterministic refresh error for expired refresh scenario', async () => {
    const api = createMockAuthApi('expired-refresh-token', { latency: 'none' })

    const response = await api.refreshToken()

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('invalid_grant')
      expect(response.error.status).toBe(401)
    }
  })

  it('returns deterministic logout fan-out for multi-tab scenario', async () => {
    const api = createMockAuthApi('multi-tab-logout-cascade', { latency: 'none' })

    const response = await api.logout('tab-2')

    expect(response.ok).toBe(true)
    if (response.ok) {
      expect(response.data.tabId).toBe('tab-2')
      expect(response.data.tabsNotified).toBe(3)
    }
  })

  it('returns stable callback mismatch errors for invalid callback scenario', async () => {
    const api = createMockAuthApi('invalid-callback-state', { latency: 'none' })

    const response = await api.submitOAuthCallback('state-expected-42')

    expect(response.ok).toBe(false)
    if (!response.ok) {
      expect(response.error.code).toBe('invalid_state')
      expect(response.error.status).toBe(400)
    }
  })
})
