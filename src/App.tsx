import { useMemo, useState } from 'react'

import { defaultScenarioId, scenarioCatalog } from './scenarios'

const severityClass: Record<(typeof scenarioCatalog)[number]['severity'], string> = {
  normal: 'border-emeraldOk/40 text-emeraldOk',
  warning: 'border-amberWarn/40 text-amberWarn',
  critical: 'border-roseError/40 text-roseError',
}

export default function App() {
  const [activeScenarioId, setActiveScenarioId] = useState(defaultScenarioId)

  const activeScenario = useMemo(
    () => scenarioCatalog.find((scenario) => scenario.id === activeScenarioId) ?? scenarioCatalog[0],
    [activeScenarioId],
  )

  return (
    <main className="min-h-screen bg-slatebg text-offwhite">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-4 sm:p-6 lg:h-screen lg:flex-row lg:gap-5 lg:p-8">
        <aside className="lg:w-[300px] lg:flex-none">
          <section className="panel flex h-full flex-col gap-4">
            <header className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/70">
                Scenario Catalog
              </p>
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

        <section className="panel flex min-h-[420px] flex-1 flex-col">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/70">Flow Visualizer</p>
              <h2 className="mt-1 text-lg font-semibold">{activeScenario.title}</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" className="control-btn">
                ◀ Step
              </button>
              <button type="button" className="control-btn control-btn--primary">
                ▶ Play
              </button>
              <button type="button" className="control-btn">
                Reset
              </button>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-600/60 bg-slatepanel/45 p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(67,56,202,0.22),transparent_45%),radial-gradient(circle_at_75%_65%,rgba(236,72,153,0.16),transparent_40%)]" />
            <div className="relative flex h-full min-h-[280px] flex-col items-center justify-center gap-6 text-center">
              <div className="rounded-full border border-blueTrust/45 bg-blueTrust/15 px-4 py-1 text-xs font-medium text-blue-100">
                Timeline not running yet
              </div>
              <h3 className="max-w-lg text-xl font-semibold tracking-tight text-offwhite">Waiting for first transition event</h3>
              <p className="max-w-xl text-sm leading-relaxed text-slate-300">
                Selected scenario has <span className="font-mono text-blue-200">{activeScenario.fixture.events.length}</span>{' '}
                seeded events and <span className="font-mono text-blue-200">{activeScenario.fixture.tabsActive}</span> active tab
                {activeScenario.fixture.tabsActive > 1 ? 's' : ''}. State-machine wiring lands in the next slice.
              </p>
            </div>
          </div>
        </section>

        <aside className="lg:w-[320px] lg:flex-none">
          <section className="panel flex h-full flex-col gap-4">
            <header>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/70">Inspector</p>
              <h2 className="mt-1 text-lg font-semibold">Token + Cookie Snapshot</h2>
            </header>

            <article className="rounded-xl border border-slate-600/70 bg-slatepanel/60 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Access Token</p>
              <ul className="space-y-2 text-sm text-slate-200">
                <li className="flex justify-between gap-2">
                  <span>Issued at</span>
                  <span className="font-mono text-slate-300">{activeScenario.fixture.tokens.issuedAt.slice(11, 19)}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Expires at</span>
                  <span className="font-mono text-amberWarn">{activeScenario.fixture.tokens.expiresAt.slice(11, 19)}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Rotation</span>
                  <span className="font-mono text-slate-300">#{activeScenario.fixture.tokens.rotation}</span>
                </li>
              </ul>
            </article>

            <article className="rounded-xl border border-slate-600/70 bg-slatepanel/60 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Cookie Flags</p>
              <div className="flex flex-wrap gap-2">
                {activeScenario.fixture.cookies.map((cookie) => (
                  <span className="chip" key={cookie.name}>
                    {cookie.name}:{cookie.sameSite}
                  </span>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-amberWarn/35 bg-amberWarn/10 p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.18em] text-amberWarn">Debugger Note</p>
              <p className="text-sm leading-relaxed text-amber-100/90">{activeScenario.fixture.events.at(-1)?.detail}</p>
            </article>
          </section>
        </aside>
      </div>
    </main>
  )
}
