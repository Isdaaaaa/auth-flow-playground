# Auth Flow Playground

Interactive sandbox for rehearsing tricky authentication lifecycle scenarios (expired refresh, clock skew, multi-tab logout) with a debugger-style UI.

## Slice-004 status: token + cookie inspector

This slice upgrades the right-side inspector into a true per-step auth debugger:

- Per-step token inspection in `src/App.tsx`:
  - masked access + refresh token values
  - issued/expiry time visibility
  - derived token state badge (`active`, `expired`, `revoked`, `pending`)
- Rotation ledger in the inspector:
  - current rotation counter
  - refresh success count
  - refresh rejection count
- Cookie flag inspector with event-aware status:
  - SameSite, HttpOnly, Secure flags
  - per-step `active`/`cleared` status as timeline events are applied
- Extended UI tests in `src/App.test.tsx` that validate inspector rendering and step-driven updates.

## Getting started

### 1) Install dependencies

```bash
npm install
```

### 2) Run locally

```bash
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - TypeScript build + production bundle
- `npm run preview` - Preview built app locally
- `npm run typecheck` - Strict TS type checks (`tsc --noEmit`)
- `npm run lint` - ESLint checks with zero warnings allowed
- `npm run format` - Prettier write pass
- `npm run format:check` - Prettier check mode
- `npm run test` - Run deterministic scenario tests via Vitest

## Architecture notes (slice-004)

- `src/scenarios/types.ts`: shared types for scenarios, fixtures, and API responses
- `src/scenarios/catalog.ts`: scenario presets + fixture datasets
- `src/scenarios/mockApi.ts`: deterministic mock auth API functions
- `src/scenarios/*.test.ts`: catalog and API behavior tests
- `src/App.tsx`: three-panel debugger UI + per-step token/cookie inspector logic

## Extending scenarios

1. Add a new `ScenarioPreset` object in `src/scenarios/catalog.ts`.
2. Include complete fixture data (`user`, `tokens`, `cookies`, `events`, `apiErrors`).
3. Use a unique `id` and ensure deterministic values (avoid `Date.now()` / random values).
4. If needed, update branches in `src/scenarios/mockApi.ts` for scenario-specific behavior.
5. Add or update tests in `src/scenarios/scenarios.test.ts`.
