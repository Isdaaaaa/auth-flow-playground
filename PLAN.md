# Plan

## Summary
Auth Flow Playground is an interactive sandbox where developers can rehearse tricky authentication scenarios (expired refresh tokens, clock skew, multi-tab logout) without wiring a real IdP. It behaves like a debugger for auth flows, showing state transitions, tokens, and cookies as you step through scenarios.

## Target user
- Frontend/full-stack engineers who routinely handle login/logout flows
- Developer relations folks who teach auth concepts
- Platform/identity teams who need reproducible repros for edge cases

## Portfolio positioning
- Signals systems thinking and auth literacy without requiring a backend integration
- Visual, GIF-friendly UI that demos well
- Differentiates from generic auth starters by focusing on edge cases and clarity

## MVP scope
- Curated scenario catalog with 4-6 presets (expired refresh, invalid callback, clock skew, multi-tab logout)
- Mock API layer with deterministic responses and latency toggles
- XState-driven state machines for login/refresh/logout with observable transitions
- Flow visualizer that steps through states (play/pause/step)
- Token & cookie inspector showing expiry, rotations, and secure flags per step
- Explanation panel summarizing why each transition occurred

## Non-goals (MVP)
- Real OAuth/OpenID integration
- User accounts or persistence
- Multi-tenant/project management
- Mobile clients or native SDKs

## Technical approach
- React + Vite + TypeScript + Tailwind for fast iteration
- XState for modeling auth state machines and emitting transitions
- MSW for mock network layer; seeded fixtures per scenario
- Small utility layer to compute token expiry/clock-skew visuals
- D3/Visx-lightweight components for timelines/graphs
- Storybook or built-in demo mode for GIF capture

## Execution notes
- Keep scenarios deterministic; favor crisp visuals over breadth
- Invest in explanation copy that reads like a debugger summary
- Ship strong defaults for colors/typography to look polished in screenshots
- Budget time for a 60s "watch the flow break" demo path
