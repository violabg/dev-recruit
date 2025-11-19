# API Contracts: Dashboard Runtime Sections

## GET /api/dashboard/candidates/runtime

- **Query Params**: `status` (enum `all|active|archived`, default `all`), `positionId` (optional UUID), `sort` (`newest|oldest|progress`, default `newest`), `view` (`table|grid`, default `table`), `page` (int ≥1), `pageSize` (int, default 15).
- **Response** (cached via `cacheTag("candidates")` + `cacheLife(15, "minutes")`):

```json
{
  "stats": [{ "label": "open interviews", "value": 12 }],
  "filters": [{ "id": "pos-123", "name": "Product" }],
  "candidates": [{ "id": "cand-1", "status": "active", "position": "Product" }],
  "pagination": { "page": 1, "pageSize": 15, "total": 240 }
}
```

- **Cache Notes**: Runs inside `'use cache'` with `cacheTag("candidates")` and `revalidateTag("positions")` so the stats/filters stay in sync but the runtime portion streams under a Suspense fallback.

## GET /api/dashboard/interviews/runtime

- **Query Params**: `status` (`all|scheduled|completed|cancelled`), `page`, `pageSize`, `interviewerId` (optional).
- **Response** (tagged `cacheTag("interviews")`):

```json
{
  "cards": [{ "status": "scheduled", "count": 14 }],
  "table": [{ "id": "intv-1", "candidate": "Sam", "position": "Design" }]
}
```

- **Cache Notes**: The runtime section keeps skeleton cards visible while the cached cards/table resolve; server actions that mutate interviews call `updateTag("interviews")` immediately after writes.

## GET /api/dashboard/candidates/new/positions

- **Query Params**: `positionId` (optional UUID).
- **Response** (uses `cacheTag("positions")` + `cacheLife(30, "minutes")`):

```json
{
  "positions": [{ "id": "pos-123", "name": "Finance" }],
  "validPosition": { "id": "pos-123", "name": "Finance" }
}
```

- **Cache Notes**: The runtime section validates `positionId` before streaming defaults to `CandidateNewForm`. Invalid or absent IDs fall back to the latest open position so the surrounding layout never blocks.
