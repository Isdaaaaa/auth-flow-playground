import { describe, expect, it } from 'vitest'

import { getScenarioById, scenarioCatalog } from './catalog'
import { fetchSession, refreshToken, validateCallback } from './mockApi'

describe('scenarioCatalog', () => {
  it('contains expected core scenarios and deterministic ids', () => {
    const ids = scenarioCatalog.map((scenario) => scenario.id)

    expect(ids).toContain('expired-refresh-token')
    expect(ids).toContain('invalid-callback-state')
    expect(ids).toContain('clock-skew-drift')
    expect(ids).toContain('multi-tab-logout-cascade')
    expect(ids).toContain('stale-refresh-rotation-replay')
    expect(ids).toContain('server-side-session-revoked')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back to first scenario for unknown ids', () => {
    expect(getScenarioById('__unknown__').id).toBe(scenarioCatalog[0].id)
  })
})

describe('mockScenarioApi', () => {
  it('returns configured refresh error for expired refresh scenario', async () => {
    const result = await refreshToken('expired-refresh-token', { latency: 'none' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_grant')
      expect(result.error.status).toBe(401)
    }
  })

  it('returns callback error for invalid callback scenario', async () => {
    const result = await validateCallback('invalid-callback-state', { latency: 'none' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('invalid_state')
    }
  })

  it('returns deterministic session metadata for clock-skew scenario', async () => {
    const result = await fetchSession('clock-skew-drift', { latency: 'none' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.activeTabs).toBe(1)
      expect(result.data.serverClockOffsetMs).toBe(-90000)
    }
  })
})
