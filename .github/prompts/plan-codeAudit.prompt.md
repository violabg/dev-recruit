Goal: Audit the repository for code optimization, remove redundant and unused code, and improve code organization without changing behavior.

Repo context: Next.js App Router project (TypeScript), Prisma, Tailwind; key folders: app/, components/, lib/, prisma/. Preserve runtime behavior and tests.

Scope & Tasks:

1. Run static analysis and builds (TypeScript, ESLint, pnpm build).
2. Find unused exports, files, imports, and dead code (use ts-prune, depcheck, eslint-unused-imports).
3. Identify performance/complexity hotspots (heavy client bundles, hot DB loops).
4. Centralize and validate environment variables (Zod-based lib/env.ts).
5. Consolidate AI/prompt/sanitization logic (split ai-service into smaller modules).
6. Remove or stop committing generated artifacts (Prisma client under lib/prisma/), add generation step.
7. Consolidate repeated DB patterns (bulk create questions, shared transaction helpers).
8. Replace eslint-disable occurrences with proper fixes or documented exceptions.
9. Centralize cache invalidation helpers (lib/utils/cache-utils.ts) (optional, save it for last).

Constraints:

- Do not change runtime semantics without tests proving equivalence.
- Preserve AI prompt content unless refactoring for reuse; any prompt edits require human QA.
- Keep PRs small; each change must include description and tests where applicable.

Success Criteria (what the prompt should return):

- A JSON report containing: summary, findings (path + issue + severity + suggestion), patches (unified-diff strings, if trivial), commands to reproduce, next steps.
- Prioritized list of candidate fixes (<= 15) with severity and minimal action.

Suggested Tools / Commands (to run locally):
pnpm install
pnpm lint
pnpm build
npx depcheck
pnpm dlx ts-prune --project || echo 'install ts-prune for dead export detection'
rg -n "TODO|FIXME|console.error|process.env\.[A-Z0-9_]+!" --hidden --glob '!node_modules' || true
find . -type f \( -name "_.ts" -o -name "_.tsx" \) -not -path "./node_modules/\*" -exec wc -l {} + | awk '$1 > 300 {print $2 ":" $1}' | sort -rn -k2

Deliverables expected from the agent run:

- summary: short 3-6 lines
- findings: array of {path, issue, evidence, severity, suggestedFix}
- patches: array of minimal safe patches as unified-diff strings (only trivial ones, e.g., remove unused imports)
- commands: list of commands to reproduce the checks locally
- nextSteps: rollout plan with checkpoints (run build, apply trivial patches, manual review, larger refactors in PRs)

Safety checks / notes:

- Removing generated Prisma client files requires a reproducible generation step in CI.
- Prompt and AI changes require human QA and unit tests for Zod validation.
- Bulk DB operations may change created IDs behavior; include mapping plan.

Output format required (strict):
Return a single JSON object with keys: summary, findings[], patches[], commands[], nextSteps[].

If you want me to run the audit now and produce the JSON report and patches, say 'run audit'.
