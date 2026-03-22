# Auth Flow Playground

Interactive sandbox for rehearsing tricky authentication lifecycle scenarios (expired refresh, clock skew, multi-tab logout) with a debugger-style UI.

## Slice-000 status

This slice bootstraps the repository foundation:

- React + Vite + TypeScript app scaffold
- Tailwind setup with project-specific design tokens
- Baseline linting/formatting/tooling scripts
- Intentional three-panel UI shell:
  - Scenario catalog (left)
  - Flow visualizer stage (center)
  - Token/cookie inspector (right)

No auth state machine execution is wired yet in this slice; current panels include intentional empty/loading states for next-slice integration.

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
- `npm run test` - Placeholder script for upcoming test harness

## Architecture notes (slice-000)

- `src/App.tsx`: shell layout and baseline panel composition
- `src/index.css`: Tailwind layers + shared component utility classes
- `tailwind.config.ts`: color, typography, and shadow tokens aligned with `PROJECT_DESIGN.md`
- `eslint.config.js` + `.prettierrc`: code quality baseline for future slices

Planned in subsequent slices:

- XState machine integration
- deterministic mock API layer
- transition timeline + node graph rendering
- real inspector data binding
