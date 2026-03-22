type Scenario = {
  id: string
  title: string
  summary: string
  severity: 'normal' | 'warning' | 'critical'
}

const scenarios: Scenario[] = [
  {
    id: 'expired-refresh',
    title: 'Expired refresh token',
    summary: 'Access token expires and refresh attempt receives invalid_grant.',
    severity: 'critical',
  },
  {
    id: 'clock-skew',
    title: 'Clock skew drift',
    summary: 'Client clock is 90s ahead; server validates token as not-yet-valid.',
    severity: 'warning',
  },
  {
    id: 'multi-tab-logout',
    title: 'Multi-tab logout',
    summary: 'Logout in one tab invalidates cookie and cascades session reset.',
    severity: 'normal',
  },
  {
    id: 'stale-rotation',
    title: 'Stale refresh rotation',
    summary: 'Refresh token replay detected after rotation counter increments.',
    severity: 'critical',
  },
]

const severityClass: Record<Scenario['severity'], string> = {
  normal: 'border-emeraldOk/40 text-emeraldOk',
  warning: 'border-amberWarn/40 text-amberWarn',
  critical: 'border-roseError/40 text-roseError',
}

export default function App() {
  const activeScenario = scenarios[0]

  return (
    <main className="min-h-screen bg-slatebg text-offwhite">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-4 sm:p-6 lg:h-screen lg:flex-row lg:gap-5 lg:p-8">
        <aside className="lg:w-[300px] lg:flex-none">
          <section className="panel flex h-full flex-col gap-4">
            <header className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/70">
                Scenario Catalog
              </p>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight">
                Auth Flow Playground
              </h1>
              <p className="text-sm text-slate-300">
                Pick a deterministic failure path and inspect each transition like a debugger trace.
              </p>
            </header>

            <ul className="space-y-2">
              {scenarios.map((scenario, index) => {
                const isActive = scenario.id === activeScenario.id
                return (
                  <li key={scenario.id}>
                    <button
                      type="button"
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
                      <p className="mt-2 font-mono text-[11px] text-slate-400">Preset {index + 1}</p>
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
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/70">
                Flow Visualizer
              </p>
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
              <h3 className="max-w-lg text-xl font-semibold tracking-tight text-offwhite">
                Waiting for first transition event
              </h3>
              <p className="max-w-xl text-sm leading-relaxed text-slate-300">
                Trigger <span className="font-mono text-blue-200">Start scenario</span> to render state
                nodes, transition arcs, and token rotation markers. Slice-000 ships the shell and
                design system; state engine wiring begins in the next slice.
              </p>
              <div className="w-full max-w-md rounded-xl border border-slate-500/40 bg-slatebg/60 p-3 text-left">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Loading shape</p>
                <div className="space-y-2">
                  <div className="h-2 animate-pulse rounded bg-slateelev/80" />
                  <div className="h-2 w-10/12 animate-pulse rounded bg-slateelev/70" />
                  <div className="h-2 w-8/12 animate-pulse rounded bg-slateelev/60" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="lg:w-[320px] lg:flex-none">
          <section className="panel flex h-full flex-col gap-4">
            <header>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-blue-200/70">
                Inspector
              </p>
              <h2 className="mt-1 text-lg font-semibold">Token + Cookie Snapshot</h2>
            </header>

            <article className="rounded-xl border border-slate-600/70 bg-slatepanel/60 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Access Token</p>
              <ul className="space-y-2 text-sm text-slate-200">
                <li className="flex justify-between gap-2"><span>Issued at</span><span className="font-mono text-slate-300">--:--:--</span></li>
                <li className="flex justify-between gap-2"><span>Expires in</span><span className="font-mono text-amberWarn">pending</span></li>
                <li className="flex justify-between gap-2"><span>Rotation</span><span className="font-mono text-slate-300">#0</span></li>
              </ul>
            </article>

            <article className="rounded-xl border border-slate-600/70 bg-slatepanel/60 p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Cookie Flags</p>
              <div className="flex flex-wrap gap-2">
                <span className="chip">HttpOnly</span>
                <span className="chip">SameSite=Lax</span>
                <span className="chip">Secure</span>
              </div>
            </article>

            <article className="rounded-xl border border-amberWarn/35 bg-amberWarn/10 p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.18em] text-amberWarn">Debugger Note</p>
              <p className="text-sm leading-relaxed text-amber-100/90">
                No transition selected yet. As events stream in, this panel will explain why the
                machine moved, including clock-skew and stale-token diagnostics.
              </p>
            </article>
          </section>
        </aside>
      </div>
    </main>
  )
}
