# Auth Flow Playground

Auth Flow Playground is an interactive sandbox for developers to rehearse and debug authentication flows and edge cases without wiring a real Identity Provider (IdP). It visualizes state transitions, tokens, and cookies so you can step through scenarios like expired refresh tokens, clock skew, multi-tab logout, and failed callbacks.

Core features

- Curated scenario catalog (expired refresh, invalid callback, clock skew, multi-tab logout, stale refresh)
- Mock API layer with deterministic responses and latency controls (MSW)
- XState-driven auth state machines for login, refresh, and logout with observable transitions
- Flow visualizer (play/pause/step) showing timeline and state graph
- Token & cookie inspector showing expiry, rotations, and cookie flags per step
- Explanation panel that summarizes why each state transition occurred

Why it matters

Authentication bugs are often subtle and hard to reproduce. This project provides a deterministic, visual debugger for auth flows so engineers and platform teams can reproduce, explain, and teach complex edge cases quickly. It's ideal for demos, debugging sessions, and onboarding engineers to common identity pitfalls.

Quickstart (development)

1. Install dependencies

   npm install

2. Start development server

   npm run dev

3. Open http://localhost:5173 and choose a scenario from the catalog. Use the stepper and timeline to observe state transitions and inspect tokens/cookies.

Notes on implementation

- Built with React + Vite + TypeScript + Tailwind
- XState models the auth flows and emits structured transition events consumed by the visualizer
- MSW provides a seeded mock API layer for deterministic scenario playback
- Small utilities compute token expiry visuals and clock-skew demonstrations
- Demo mode scripts produce short, GIF-friendly recordings of failing flows

Limitations

- No real OAuth/OpenID integration (intentionally mocked for deterministic behavior)
- No user accounts or persistence; this is a developer sandbox
- Not production-ready as an identity provider or SDK

Showcase notes

- Recording a 60s demo that shows a refresh token expiry mid-session produces a concise clip that demonstrates both the problem and recommended mitigation (graceful logout + user-facing refresh error guidance).
- The UI is optimized for screenshot and GIF capture: strong default colors, legible typography, and compact panels.

Monetization assessment

- Target users (developer teams, platform/identity teams, DevRel) can plausibly pay for a hosted, branded version, workshop content, or specialized training materials.
- A freemium model (open-source sandbox + paid hosted/demo workspace or enterprise-ready integrations) is feasible.

Repository status

Stage: dev_complete (finalization in progress)

Contact / Maintainers

- Maintainer: (add name/email/contact here)

