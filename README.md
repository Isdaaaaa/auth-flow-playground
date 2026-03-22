# Auth Flow Playground

Interactive sandbox for rehearsing tricky authentication lifecycle scenarios (expired refresh, clock skew, multi-tab logout) with a debugger-style UI.

## Slice-001 status: scenario catalog + deterministic fixtures

This slice adds real scenario data plumbing for upcoming timeline/state-machine work:

- Typed scenario catalog (`src/scenarios/catalog.ts`) with 6 presets:
  - Expired refresh token
  - Invalid callback state
  - Clock skew drift
  - Multi-tab logout
  - Stale refresh rotation replay
  - Server-side session revoke
- Deterministic fixture bundles per scenario:
  - user profile
  - token state (issued/expires/rotation/validity)
  - cookie flags
  - ordered event timeline entries
  - known API error surfaces
- Mock API layer (`src/scenarios/mockApi.ts`) with deterministic async responses and optional latency profile (`none`, `fast`, `realistic`).
- Minimal UI wiring so the left scenario list renders from the typed catalog and selecting a scenario updates details in the center/right panels.
- Test coverage for catalog integrity and deterministic mock API behavior.

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

## Architecture notes (slice-001)

- `src/scenarios/types.ts`: shared types for scenarios, fixtures, and API responses
- `src/scenarios/catalog.ts`: scenario presets + fixture datasets
- `src/scenarios/mockApi.ts`: deterministic mock auth API functions
- `src/scenarios/*.test.ts`: catalog and API behavior tests
- `src/App.tsx`: shell now reads from catalog and displays active scenario fixture details

## Extending scenarios

1. Add a new `ScenarioPreset` object in `src/scenarios/catalog.ts`.
2. Include complete fixture data (`user`, `tokens`, `cookies`, `events`, `apiErrors`).
3. Use a unique `id` and ensure deterministic values (avoid `Date.now()` / random values).
4. If needed, update branches in `src/scenarios/mockApi.ts` for scenario-specific behavior.
5. Add or update tests in `src/scenarios/scenarios.test.ts`.
