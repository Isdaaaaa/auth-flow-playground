import { describe, expect, it } from 'vitest'
import { scenarioCatalog } from './catalog'

describe('scenarioCatalog', () => {
  it('contains required core presets with unique ids', () => {
    const ids = scenarioCatalog.map((scenario) => scenario.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
    expect(ids).toEqual(
      expect.arrayContaining([
        'expired-refresh-token',
        'invalid-callback-state',
        'clock-skew-drift',
        'multi-tab-logout-cascade',
      ]),
    )
    expect(scenarioCatalog.length).toBeGreaterThanOrEqual(4)
    expect(scenarioCatalog.length).toBeLessThanOrEqual(6)
  })

  it('ships deterministic fixture structure for each scenario', () => {
    for (const scenario of scenarioCatalog) {
      expect(scenario.fixture.user.id).toMatch(/^usr_\d+$/)
      expect(scenario.fixture.tokens.accessToken).toContain('atk_')
      expect(scenario.fixture.cookies.length).toBeGreaterThan(0)
      expect(scenario.fixture.events.length).toBeGreaterThan(0)
    }
  })
})
