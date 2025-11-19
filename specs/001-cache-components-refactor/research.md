# Research Notes for Cache Components Sweep

## Decision: Keep runtime data inside Suspense with shared skeletons

- **Decision**: All runtime APIs (`searchParams`, `params`, optional `cookies()`/`headers()`) must live inside Suspense boundaries whose fallbacks reuse `components/ui/skeleton` variants (e.g., `StatsSkeleton`, `FiltersSkeleton`, `CandidatesListSkeleton`).
- **Rationale**: The constitution and spec both require preventing uncached data from escaping outside a fallback, so every `/dashboard/*` route that touches runtime filters must defer this work until request time while the static shell renders immediately.
- **Alternatives considered**: Letting runtime parsing happen in parent components would keep layout simpler, but Next.js raises the `Uncached data was accessed outside of <Suspense>` error and the shell would block on search params, violating the cache-first principle.

## Decision: Limit the refactor to `/dashboard/*` routes this sprint

- **Decision**: Focus exclusively on the dashboard routes (candidates, interviews, positions, profile) described in the spec; do not migrate other app areas yet.
- **Rationale**: The user clarified that this sweep should stay within the dashboard so we can release sooner and avoid unintended regressions in unrelated features.
- **Alternatives considered**: Expanding the scope to every app route would require additional coordination, more skeletons, and a longer rollout, so it was rejected in favor of the current branch's goal.

## Decision: Document streaming behavior in README/docs

- **Decision**: Capture the Suspense flow and cache tag strategy in `README.md` and `docs/CACHE_IMPLEMENTATION.md` so future contributors understand how to add runtime segments safely.
- **Rationale**: The spec success criteria explicitly mention these docs; documenting the structure now prevents future cache regressions and keeps the constitution traceable.
- **Alternatives considered**: Waiting until after implementation risks forgetting to mention the new streaming guidance or mismatched info.
