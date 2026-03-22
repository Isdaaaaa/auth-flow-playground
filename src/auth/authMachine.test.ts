import { createActor, waitFor } from 'xstate'
import { describe, expect, it } from 'vitest'

import { createAuthMachine } from './authMachine'

describe('auth machine core', () => {
  it('supports login + callback success path', async () => {
    const actor = createActor(createAuthMachine({ scenarioId: 'clock-skew-drift' }), { input: {} })
    actor.start()

    await waitFor(actor, (snapshot) => snapshot.matches('unauthenticated'))

    actor.send({ type: 'LOGIN' })
    actor.send({ type: 'SUBMIT_CALLBACK', state: 'state-expected-42' })

    await waitFor(actor, (snapshot) => snapshot.matches('authenticated'))

    const snapshot = actor.getSnapshot()
    expect(snapshot.context.token).not.toBeNull()
    expect(snapshot.context.token?.valid).toBe(true)
    expect(snapshot.context.error).toBeNull()
  })

  it('handles refresh success transition when token expires', async () => {
    const actor = createActor(createAuthMachine({ scenarioId: 'clock-skew-drift' }), { input: {} })
    actor.start()

    await waitFor(actor, (snapshot) => snapshot.matches('unauthenticated'))

    actor.send({ type: 'LOGIN' })
    actor.send({ type: 'SUBMIT_CALLBACK', state: 'state-expected-42' })
    await waitFor(actor, (snapshot) => snapshot.matches('authenticated'))

    const beforeRefresh = actor.getSnapshot().context.token
    actor.send({ type: 'TOKEN_EXPIRED' })

    await waitFor(actor, (snapshot) => snapshot.matches('authenticated') && snapshot.context.token !== beforeRefresh)

    const afterRefresh = actor.getSnapshot().context.token
    expect(afterRefresh?.rotation).toBe((beforeRefresh?.rotation ?? 0) + 1)
  })

  it('moves to error state when refresh fails', async () => {
    const actor = createActor(createAuthMachine({ scenarioId: 'expired-refresh-token' }), { input: {} })
    actor.start()

    await waitFor(actor, (snapshot) => snapshot.matches('unauthenticated'))

    actor.send({ type: 'LOGIN' })
    actor.send({ type: 'SUBMIT_CALLBACK', state: 'state-expected-42' })
    await waitFor(actor, (snapshot) => snapshot.matches('authenticated'))

    actor.send({ type: 'REFRESH' })

    await waitFor(actor, (snapshot) => snapshot.matches('error'))

    const snapshot = actor.getSnapshot()
    expect(snapshot.context.error?.operation).toBe('refresh')
    expect(snapshot.context.error?.detail.code).toBe('invalid_grant')
  })

  it('moves to error state for invalid callback state', async () => {
    const actor = createActor(createAuthMachine({ scenarioId: 'invalid-callback-state' }), { input: {} })
    actor.start()

    await waitFor(actor, (snapshot) => snapshot.matches('unauthenticated'))

    actor.send({ type: 'LOGIN' })
    actor.send({ type: 'SUBMIT_CALLBACK', state: 'state-bad' })

    await waitFor(actor, (snapshot) => snapshot.matches('error'))

    const snapshot = actor.getSnapshot()
    expect(snapshot.context.error?.operation).toBe('callback')
    expect(snapshot.context.error?.detail.code).toBe('invalid_state')
  })

  it('handles logout path and clears token', async () => {
    const actor = createActor(createAuthMachine({ scenarioId: 'multi-tab-logout-cascade' }), { input: {} })
    actor.start()

    await waitFor(actor, (snapshot) => snapshot.matches('error'))

    actor.send({ type: 'LOGIN' })
    actor.send({ type: 'SUBMIT_CALLBACK', state: 'state-expected-42' })
    await waitFor(actor, (snapshot) => snapshot.matches('authenticated'))

    actor.send({ type: 'LOGOUT', tabId: 'tab-2' })

    await waitFor(actor, (snapshot) => snapshot.matches('unauthenticated'))

    const snapshot = actor.getSnapshot()
    expect(snapshot.context.token).toBeNull()
    expect(snapshot.context.activeTabs).toBe(3)
  })
})
