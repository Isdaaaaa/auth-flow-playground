import { useEffect, useMemo, useRef, useState } from 'react'
import { createActor, type ActorRefFrom, type SnapshotFrom } from 'xstate'

import { createAuthMachine, type AuthMachineEvent } from './auth'
import { defaultScenarioId, scenarioCatalog, type AuthEventType, type EventFixture } from './scenarios'

const severityClass: Record<(typeof scenarioCatalog)[number]['severity'], string> = {
  normal: 'border-emeraldOk/40 text-emeraldOk',
  warning: 'border-amberWarn/40 text-amberWarn',
  critical: 'border-roseError/40 text-roseError',
}

const stateNodes = [
  { id: 'booting', label: 'Booting' },
  { id: 'unauthenticated', label: 'Unauthenticated' },
  { id: 'authorizing', label: 'Authorizing' },
  { id: 'validatingCallback', label: 'Validating Callback' },
  { id: 'authenticated', label: 'Authenticated' },
  { id: 'refreshing', label: 'Refreshing Token' },
  { id: 'loggingOut', label: 'Logging Out' },
  { id: 'error', label: 'Error' },
] as const

const graphTransitions = [
  { from: 'booting', to: 'unauthenticated', label: 'session loaded' },
  { from: 'unauthenticated', to: 'authorizing', label: 'LOGIN' },
  { from: 'authorizing', to: 'validatingCallback', label: 'SUBMIT_CALLBACK' },
  { from: 'validatingCallback', to: 'authenticated', label: 'callback accepted' },
  { from: 'authenticated', to: 'refreshing', label: 'TOKEN_EXPIRED / REFRESH' },
  { from: 'refreshing', to: 'authenticated', label: 'refresh ok' },
  { from: 'authenticated', to: 'loggingOut', label: 'LOGOUT' },
  { from: 'loggingOut', to: 'unauthenticated', label: 'logout complete' },
  { from: 'authenticated', to: 'error', label: 'SESSION_REVOKED' },
] as const

type EdgeInjectOption = {
  id: string
  label: string
  event: AuthMachineEvent
}

const edgeEventOptions: EdgeInjectOption[] = [
  { id: 'refresh', label: 'Force refresh attempt', event: { type: 'REFRESH' } },
  { id: 'expire', label: 'Inject token expired', event: { type: 'TOKEN_EXPIRED' } },
  {
    id: 'callback-bad',
    label: 'Inject callback mismatch',
    event: { type: 'SUBMIT_CALLBACK', state: 'state-mismatch' },
  },
  {
    id: 'callback-good',
    label: 'Inject callback success',
    event: { type: 'SUBMIT_CALLBACK', state: 'state-expected-42' },
  },
  { id: 'session-revoked', label: 'Inject server revoke', event: { type: 'SESSION_REVOKED', reason: 'Manual revocation event' } },
  { id: 'logout', label: 'Inject broadcast logout', event: { type: 'LOGOUT', tabId: 'tab-injected' } },
]

const toMachineEvent = (eventType: AuthEventType): EdgeInjectOption['event'] | null => {
  switch (eventType) {
    case 'token_issued':
      return { type: 'LOGIN' }
    case 'token_expired':
      return { type: 'TOKEN_EXPIRED' }
    case 'refresh_rejected':
    case 'refresh_succeeded':
      return { type: 'REFRESH' }
    case 'callback_failed':
      return { type: 'SUBMIT_CALLBACK', state: 'state-mismatch' }
    case 'clock_skew_detected':
      return { type: 'SESSION_REVOKED', reason: 'Clock skew made token invalid.' }
    case 'broadcast_logout':
      return { type: 'LOGOUT', tabId: 'tab-broadcast' }
    case 'cookie_cleared':
    case 'session_revoked':
    case 'csrf_failed':
      return { type: 'SESSION_REVOKED', reason: 'Scenario forced session invalidation.' }
    default:
      return null
  }
}

const playIntervalMs = 1000

type AuthMachineInstance = ReturnType<typeof createAuthMachine>

const maskToken = (token: string) => {
  if (!token) {
    return '—'
  }

  if (token.length <= 10) {
    return token
  }

  return `${token.slice(0, 6)}…${token.slice(-4)}`
}

const formatIsoTime = (value: string) => value.slice(11, 19)

const eventImpactRank: Record<AuthEventType, number> = {
  token_issued: 0,
  refresh_succeeded: 1,
  token_expired: 2,
  broadcast_logout: 2,
  cookie_cleared: 2,
  callback_failed: 3,
  clock_skew_detected: 3,
  csrf_failed: 4,
  refresh_rejected: 4,
  session_revoked: 4,
}

const eventRiskLabel: Record<AuthEventType, string> = {
  token_issued: 'Low risk · baseline auth state',
  refresh_succeeded: 'Low risk · refresh path healthy',
  token_expired: 'Medium risk · access interruption likely',
  broadcast_logout: 'Medium risk · shared-session disruption',
  cookie_cleared: 'Medium risk · local session invalidated',
  callback_failed: 'High risk · callback integrity failed',
  clock_skew_detected: 'High risk · token validation drift',
  csrf_failed: 'Critical risk · CSRF guard triggered',
  refresh_rejected: 'Critical risk · refresh grant denied',
  session_revoked: 'Critical risk · server trust revoked',
}

const eventRootCause: Record<AuthEventType, string> = {
  token_issued: 'Fresh tokens were minted after auth initiation.',
  refresh_succeeded: 'Refresh token accepted and rotated successfully.',
  token_expired: 'Access token TTL elapsed before refresh completed.',
  broadcast_logout: 'Another tab emitted a logout event through BroadcastChannel/storage.',
  cookie_cleared: 'Session cookie invalidated locally as part of logout or revocation handling.',
  callback_failed: 'OAuth state/PKCE validation mismatch indicates callback tampering or stale state.',
  clock_skew_detected: 'Client/server clocks diverged enough to violate token nbf/exp assumptions.',
  csrf_failed: 'State/CSRF checks failed and session was force-reset defensively.',
  refresh_rejected: 'Refresh token is expired, revoked, or replayed and rejected by IdP.',
  session_revoked: 'Server-side policy/admin action invalidated the active session.',
}

const eventNextAction: Record<AuthEventType, string> = {
  token_issued: 'Continue stepping to validate expiry and recovery behavior.',
  refresh_succeeded: 'Verify rotation counter increments and stale token rejection rules.',
  token_expired: 'Trigger refresh immediately and inspect refresh API response payload.',
  broadcast_logout: 'Confirm all tabs clear memory + cookies and redirect to login.',
  cookie_cleared: 'Confirm cookie flags and trigger explicit re-authentication UX.',
  callback_failed: 'Restart login with a fresh state nonce and validate callback origin.',
  clock_skew_detected: 'Apply clock sync/leeway and re-test with server-issued timestamps.',
  csrf_failed: 'Invalidate local auth context, rotate state secret, and require full login.',
  refresh_rejected: 'Force sign-in, revoke token family, and audit for replay indicators.',
  session_revoked: 'Purge local tokens/cookies, show re-auth prompt, and log revocation reason.',
}

export default function App() {
  const [activeScenarioId, setActiveScenarioId] = useState(defaultScenarioId)
  const [snapshot, setSnapshot] = useState<SnapshotFrom<ReturnType<typeof createAuthMachine>> | null>(null)
  const [timelineCursor, setTimelineCursor] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedEdgeEvent, setSelectedEdgeEvent] = useState(edgeEventOptions[0].id)
  const [lastInjectedEdgeEvent, setLastInjectedEdgeEvent] = useState<string>('')

  const actorRef = useRef<ActorRefFrom<AuthMachineInstance> | null>(null)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  const activeScenario = useMemo(
    () => scenarioCatalog.find((scenario) => scenario.id === activeScenarioId) ?? scenarioCatalog[0],
    [activeScenarioId],
  )

  const timelineEvents = activeScenario.fixture.events

  const currentNode = snapshot?.value.toString() ?? 'booting'

  const startActor = (scenarioId: string) => {
    subscriptionRef.current?.unsubscribe()
    actorRef.current?.stop()

    const actor = createActor(createAuthMachine({ scenarioId }), { input: {} })
    actorRef.current = actor
    subscriptionRef.current = actor.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot)
    })
    actor.start()
  }

  useEffect(() => {
    setIsPlaying(false)
    setTimelineCursor(0)
    startActor(activeScenarioId)

    return () => {
      subscriptionRef.current?.unsubscribe()
      actorRef.current?.stop()
    }
  }, [activeScenarioId])

  const applyTimelineEvent = (entry: EventFixture) => {
    const mapped = toMachineEvent(entry.type)
    if (!mapped) {
      return
    }

    const actor = actorRef.current
    if (!actor) {
      return
    }

    actor.send(mapped)

    if (entry.type === 'callback_failed') {
      actor.send({ type: 'LOGIN' })
      actor.send(mapped)
    }
  }

  const handleStepForward = () => {
    if (timelineCursor >= timelineEvents.length) {
      setIsPlaying(false)
      return
    }

    const entry = timelineEvents[timelineCursor]
    if (!entry) {
      return
    }

    applyTimelineEvent(entry)
    setTimelineCursor((cursor) => Math.min(cursor + 1, timelineEvents.length))
  }

  const handleStepBack = () => {
    const nextCursor = Math.max(timelineCursor - 1, 0)
    setTimelineCursor(nextCursor)
    setIsPlaying(false)

    startActor(activeScenarioId)

    for (let i = 0; i < nextCursor; i += 1) {
      const entry = timelineEvents[i]
      if (entry) {
        applyTimelineEvent(entry)
      }
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    setTimelineCursor(0)
    startActor(activeScenarioId)
  }

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    if (timelineCursor >= timelineEvents.length) {
      setIsPlaying(false)
      return
    }

    const timer = window.setTimeout(() => {
      handleStepForward()
    }, playIntervalMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isPlaying, timelineCursor, timelineEvents.length])

  const activeEvent = timelineCursor > 0 ? timelineEvents[timelineCursor - 1] : undefined
  const processedEvents = timelineEvents.slice(0, timelineCursor)
  const refreshSuccesses = processedEvents.filter((event) => event.type === 'refresh_succeeded').length
  const refreshFailures = processedEvents.filter((event) => event.type === 'refresh_rejected').length
  const tokenExpiredSeen = processedEvents.some((event) => event.type === 'token_expired')
  const sessionRevokedSeen = processedEvents.some((event) =>
    ['cookie_cleared', 'session_revoked', 'csrf_failed', 'broadcast_logout'].includes(event.type),
  )
  const cookieClearedSeen = processedEvents.some((event) => ['cookie_cleared', 'broadcast_logout'].includes(event.type))
  const latestSignal = [...processedEvents].sort((a, b) => eventImpactRank[b.type] - eventImpactRank[a.type])[0]
  const fixtureRefreshError = activeScenario.fixture.apiErrors.refresh
  const fixtureCallbackError = activeScenario.fixture.apiErrors.callback
  const fixtureSessionError = activeScenario.fixture.apiErrors.session
  const fallbackRootCause =
    fixtureRefreshError?.message ?? fixtureCallbackError?.message ?? fixtureSessionError?.message ?? 'No explicit API error fixture for this scenario.'
  const edgeCaseRisk = latestSignal ? eventRiskLabel[latestSignal.type] : `Pending risk signal · ${activeScenario.severity} scenario`
  const edgeCaseRootCause = latestSignal ? eventRootCause[latestSignal.type] : fallbackRootCause
  const edgeCaseNextAction = latestSignal
    ? eventNextAction[latestSignal.type]
    : 'Press Play or Step to inspect the first event and derive a concrete remediation path.'
  const stepTimestamp = activeEvent?.at ?? activeScenario.fixture.tokens.issuedAt
  const effectiveToken = snapshot?.context.token
  const accessTokenValue = effectiveToken?.accessToken ?? activeScenario.fixture.tokens.accessToken
  const refreshTokenValue = effectiveToken?.refreshToken ?? activeScenario.fixture.tokens.refreshToken
  const tokenRotation = (effectiveToken?.rotation ?? activeScenario.fixture.tokens.rotation) + refreshSuccesses
  const tokenValid = Boolean(effectiveToken?.valid) && !sessionRevokedSeen
  const tokenStateLabel = sessionRevokedSeen
    ? 'revoked'
    : tokenExpiredSeen
      ? 'expired'
      : tokenValid
        ? 'active'
        : 'pending'

  return (
    <main className="min-h-screen bg-slatebg text-offwhite">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-4 sm:p-6 lg:h-screen lg:flex-row lg:gap-5 lg:p-8">
        <aside className="lg:w-[300px] lg:flex-none">
          <section className="panel flex h-full flex-col gap-4">
            <header className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/70">Scenario Catalog</p>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight">Auth Flow Playground</h1>
              <p className="text-sm text-slate-300">
                Pick a deterministic failure path and inspect each transition like a debugger trace.
              </p>
            </header>

            <ul className="space-y-2">
              {scenarioCatalog.map((scenario, index) => {
                const isActive = scenario.id === activeScenario.id
                return (
                  <li key={scenario.id}>
                    <button
                      type="button"
                      onClick={() => setActiveScenarioId(scenario.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isActive
                          ? 'border-indigoTrust/80 bg-indigoTrust/15 shadow-panel'
                          : 'border-slate-600/70 bg-slatepanel/55 hover:border-blueTrust/45 hover:bg-slatepanel/80'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-offwhite">{scenario.title}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityClass[scenario.severity]}`}
                        >
                          {scenario.severity}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-300">{scenario.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <p className="font-mono text-[11px] text-slate-400">Preset {index + 1}</p>
                        {scenario.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-blueTrust/40 bg-blueTrust/10 px-1.5 py-[1px] text-[10px] uppercase tracking-wide text-blue-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </aside>

        <section className="panel flex min-h-[520px] flex-1 flex-col">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/70">Flow Visualizer</p>
              <h2 className="mt-1 text-lg font-semibold">{activeScenario.title}</h2>
              <p className="mt-2 text-xs text-slate-300">
                Step {Math.min(timelineCursor, timelineEvents.length)} / {timelineEvents.length} · Current state:{' '}
                <span className="font-mono text-blue-200">{currentNode}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="control-btn" onClick={handleStepBack}>
                ◀ Back
              </button>
              <button
                type="button"
                className="control-btn control-btn--primary"
                onClick={() => setIsPlaying((value) => !value)}
              >
                {isPlaying ? '❚❚ Pause' : '▶ Play'}
              </button>
              <button type="button" className="control-btn" onClick={handleStepForward}>
                Step ▶
              </button>
              <button type="button" className="control-btn" onClick={handleReset}>
                Reset
              </button>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-slate-600/60 bg-slatebg/50 p-3">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-slate-300" htmlFor="edge-event-select">
              Edge-event injection
            </label>
            <div className="flex flex-wrap gap-2">
              <select
                id="edge-event-select"
                className="min-w-[220px] flex-1 rounded-lg border border-slate-500/80 bg-slatepanel/80 px-3 py-2 text-sm text-offwhite outline-none ring-blueTrust/70 transition focus:ring-2"
                value={selectedEdgeEvent}
                onChange={(event) => setSelectedEdgeEvent(event.target.value)}
              >
                {edgeEventOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="control-btn"
                onClick={() => {
                  const chosen = edgeEventOptions.find((option) => option.id === selectedEdgeEvent)
                  if (chosen) {
                    actorRef.current?.send(chosen.event)
                    setLastInjectedEdgeEvent(chosen.label)
                  }
                }}
              >
                Inject Event
              </button>
            </div>
          </div>

          {lastInjectedEdgeEvent ? (
            <div className="mb-3 rounded-lg border border-indigoTrust/45 bg-indigoTrust/15 px-3 py-2 text-xs text-blue-100">
              Last injected edge event: <span className="font-medium">{lastInjectedEdgeEvent}</span>
            </div>
          ) : null}

          <div className="relative grid flex-1 grid-cols-1 gap-4 overflow-hidden rounded-2xl border border-slate-600/60 bg-slatepanel/45 p-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(67,56,202,0.22),transparent_45%),radial-gradient(circle_at_75%_65%,rgba(236,72,153,0.16),transparent_40%)]" />

            <section className="relative rounded-xl border border-slate-500/65 bg-slatebg/45 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">State Graph</h3>
              <ul className="space-y-2" aria-label="state graph">
                {stateNodes.map((node) => {
                  const isCurrent = node.id === currentNode
                  return (
                    <li key={node.id} className="flex items-center gap-2">
                      <span
                        className={`inline-flex min-w-[145px] items-center justify-between rounded-lg border px-2 py-1 text-xs font-mono transition ${
                          isCurrent
                            ? 'border-pinkAccent/70 bg-pinkAccent/20 text-pink-100 shadow-[0_0_0_1px_rgba(236,72,153,0.35)]'
                            : 'border-slate-500/75 bg-slatepanel/55 text-slate-200'
                        }`}
                      >
                        {node.label}
                        {isCurrent ? <span className="ml-2 text-[10px] uppercase tracking-wide">current</span> : null}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 rounded-lg border border-slate-600/70 bg-slatepanel/50 p-3">
                <p className="mb-2 text-[11px] uppercase tracking-[0.15em] text-slate-300">Labeled transitions</p>
                <ul className="space-y-1.5 text-xs text-slate-200">
                  {graphTransitions.map((transition) => (
                    <li key={`${transition.from}-${transition.to}-${transition.label}`} className="font-mono">
                      {transition.from} → {transition.to}{' '}
                      <span className="text-blue-200">[{transition.label}]</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="relative rounded-xl border border-slate-500/65 bg-slatebg/45 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">Scenario Timeline</h3>
              {timelineEvents.length === 0 ? (
                <div className="flex h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-blueTrust/45 bg-blueTrust/10 p-5 text-center">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">Timeline empty</p>
                  <p className="max-w-[34ch] text-sm leading-relaxed text-slate-200">
                    No seeded events for this preset. Inject an edge event or switch scenarios to start tracing state transitions.
                  </p>
                </div>
              ) : (
                <ol className="space-y-2 overflow-auto pr-1" aria-label="scenario timeline">
                  {timelineEvents.map((event, index) => {
                    const completed = index < timelineCursor
                    const active = index === timelineCursor - 1
                    return (
                      <li
                        key={event.id}
                        className={`rounded-lg border p-2.5 transition ${
                          active
                            ? 'border-pinkAccent/65 bg-pinkAccent/12'
                            : completed
                              ? 'border-emeraldOk/45 bg-emeraldOk/10'
                              : 'border-slate-600/70 bg-slatepanel/45'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-blue-100">{event.step}</p>
                          <span className="font-mono text-[10px] text-slate-300">{event.at.slice(11, 19)}</span>
                        </div>
                        <p className="text-xs font-medium text-offwhite">{event.type}</p>
                        <p className="mt-1 text-xs text-slate-300">{event.detail}</p>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          </div>

          {!snapshot || snapshot.matches('booting') ? (
            <div className="mt-3 rounded-lg border border-indigoTrust/50 bg-indigoTrust/12 px-3 py-2.5 text-xs text-blue-100 shadow-panel">
              <p className="font-semibold uppercase tracking-[0.14em]">Bootstrapping auth machine</p>
              <p className="mt-1 text-[11px] text-blue-100/90">Loading machine context and deterministic fixture state…</p>
            </div>
          ) : null}
        </section>

        <aside className="lg:w-[320px] lg:flex-none">
          <section className="panel flex h-full flex-col gap-4">
            <header>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/70">Inspector</p>
              <h2 className="mt-1 text-lg font-semibold">Token + Cookie Snapshot</h2>
              <p className="mt-2 text-xs text-slate-300">
                Step timestamp <span className="font-mono text-blue-100">{formatIsoTime(stepTimestamp)}</span>
              </p>
            </header>

            <article className="rounded-xl border border-indigoTrust/45 bg-indigoTrust/10 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.18em] text-blue-100">Access Token</p>
                <span className="rounded-full border border-blueTrust/40 bg-blueTrust/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-blue-100">
                  {tokenStateLabel}
                </span>
              </div>
              <p className="mb-3 rounded-lg border border-slate-500/70 bg-slatebg/50 px-2 py-1.5 font-mono text-xs text-offwhite" aria-label="access token value">
                {maskToken(accessTokenValue)}
              </p>
              <ul className="space-y-2 text-sm text-slate-200">
                <li className="flex justify-between gap-2">
                  <span>Issued at</span>
                  <span className="font-mono text-slate-300">{formatIsoTime(activeScenario.fixture.tokens.issuedAt)}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Expires at</span>
                  <span className="font-mono text-amberWarn">{formatIsoTime(effectiveToken?.expiresAt ?? activeScenario.fixture.tokens.expiresAt)}</span>
                </li>
              </ul>
            </article>

            <article className="rounded-xl border border-slate-600/70 bg-slatepanel/60 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-300">Refresh Token</p>
              <p className="rounded-lg border border-slate-500/70 bg-slatebg/50 px-2 py-1.5 font-mono text-xs text-offwhite" aria-label="refresh token value">
                {maskToken(refreshTokenValue)}
              </p>
            </article>

            <article className="rounded-xl border border-pinkAccent/45 bg-pinkAccent/10 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-pink-100">Rotation Ledger</p>
              <ul className="space-y-2 text-sm text-slate-100">
                <li className="flex justify-between gap-2">
                  <span>Current rotation</span>
                  <span className="font-mono">#{tokenRotation}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Refresh success</span>
                  <span className="font-mono text-emeraldOk">{refreshSuccesses}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Refresh rejected</span>
                  <span className="font-mono text-roseError">{refreshFailures}</span>
                </li>
              </ul>
            </article>

            <article className="rounded-xl border border-slate-600/70 bg-slatepanel/60 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-300">Cookie Flags (per step)</p>
              <ul className="space-y-2" aria-label="cookie flags">
                {activeScenario.fixture.cookies.map((cookie) => {
                  const isCleared = cookieClearedSeen
                  return (
                    <li key={cookie.name} className="rounded-lg border border-slate-500/65 bg-slatebg/40 p-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="font-mono text-xs text-offwhite">{cookie.name}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                            isCleared
                              ? 'border-roseError/45 bg-roseError/10 text-rose-200'
                              : 'border-emeraldOk/45 bg-emeraldOk/10 text-emerald-100'
                          }`}
                        >
                          {isCleared ? 'cleared' : 'active'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="chip">SameSite:{cookie.sameSite}</span>
                        <span className="chip">HttpOnly:{cookie.httpOnly ? 'yes' : 'no'}</span>
                        <span className="chip">Secure:{cookie.secure ? 'yes' : 'no'}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </article>

            <article className="rounded-xl border border-amberWarn/35 bg-amberWarn/10 p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.18em] text-amberWarn">Debugger Note</p>
              <p className="text-sm leading-relaxed text-amber-100/90">{activeEvent?.detail ?? 'Step the timeline to inspect transition metadata.'}</p>
            </article>

            <article className="rounded-xl border border-blueTrust/45 bg-blueTrust/12 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-blue-100">Edge Case Lab</p>
              <div className="mb-3 rounded-lg border border-blueTrust/35 bg-slatebg/45 px-2.5 py-2 text-xs text-blue-100">
                Risk profile: {edgeCaseRisk}
              </div>
              <div className="space-y-2 text-sm text-slate-100">
                <p>
                  <span className="text-slate-300">Likely root cause:</span> {edgeCaseRootCause}
                </p>
                <p>
                  <span className="text-slate-300">Recommended next action:</span> {edgeCaseNextAction}
                </p>
              </div>
            </article>

            {snapshot?.context.error ? (
              <article className="rounded-xl border border-roseError/35 bg-roseError/10 p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.18em] text-rose-200">Error Trace</p>
                <p className="text-sm text-rose-100">
                  {snapshot.context.error.operation}: {snapshot.context.error.detail.code} · {snapshot.context.error.detail.message}
                </p>
              </article>
            ) : null}
          </section>
        </aside>
      </div>
    </main>
  )
}
