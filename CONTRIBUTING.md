# Contributing to Keja.ai

Thanks for helping build Kenya's AI real-estate trust layer. This document is the short path to a merged PR.

## Prerequisites

- Node.js **20.19+** (CI pins Node 20; Vite 8 requires ≥20.19)
- npm 10+

## Setup

```bash
git clone https://github.com/gadda00/keja-ai.git
cd keja-ai
npm install        # also runs `husky` to install the pre-commit hook
npm run dev        # http://localhost:5173
```

## The quality bar — run before every push

```bash
npm run verify     # typecheck + ESLint + vitest + production build
```

CI runs the same pipeline (plus oxlint and the Auto-Pilot deploy gates) on every push to `main`; PRs that fail any gate are not deployable.

| Gate      | Command               | Notes                                                                          |
| --------- | --------------------- | ------------------------------------------------------------------------------ |
| Types     | `npm run typecheck`   | `tsc -b` — strict, `noUnusedLocals/Parameters` on                              |
| Lint      | `npm run lint:eslint` | ESLint 9 flat config, `--max-warnings 0`                                       |
| Fast lint | `npm run lint`        | oxlint — quick feedback while coding                                           |
| Tests     | `npm test`            | vitest; node env for lib tests, `// @vitest-environment jsdom` for React tests |
| Build     | `npm run build`       | must succeed with the `/keja-ai/` base                                         |

## Code conventions

- **TypeScript strict** — no `any`, no non-null assertions outside tests (`??` / guards instead).
- **Purity in render** — nothing inside `useMemo`/render may write to storage or mutate module state; side effects belong in event handlers or `useEffect`.
- **Import order** is enforced by `simple-import-sort` (via ESLint autofix).
- **Formatting** — Prettier (semi, single quotes, 100 cols). The pre-commit hook runs `lint-staged` automatically.
- **A11y** — every form control gets an `id` + `htmlFor` pair; interactive elements must be keyboard-operable; jsx-a11y recommended rules are errors.
- **Data honesty** — never fabricate trust claims: machine-screened listings stay capped (`titleCheck: pending`), user-submitted listings cap at 94, simulated flows must be labelled.

## Adding a property listing pipeline change

Auto-Pilot lives in `scripts/auto-listings/` (zero npm deps — plain ESM). After changing any stage, run:

```bash
node scripts/auto-listings/run.mjs --dry --count 6   # preview
node scripts/auto-listings/run.mjs --count 6         # write src/data/auto-listings.json
npm test                                              # pipeline regression tests must pass
```

## Adding tests

- Pure engine code (finance, scoring, search, pipeline, anomaly) → node-env test in `src/lib/__tests__/`.
- React context/store code → add `// @vitest-environment jsdom` at the top (see `tokenizeStore.test.tsx`).

## Commit style

Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`). The Auto-Pilot bot commits as `chore(autopilot): …`.

## Security & content rules

- No secrets in the bundle — everything shipped to GitHub Pages is public.
- Auth is demo-grade (client-side). Do not store real personal data; the Phase-2 backend owns real auth.
- Marketing claims about yields/returns must carry disclaimers — this is a CMA-sensitive domain.
