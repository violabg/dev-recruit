# MCP data policy

Which external services may receive candidate data, and what the MCP server sends by default. Related documents: [MCP server](mcp.md), [operation inventory](mcp-operations.md).

**Current status: proof of concept with fake data.** dev-recruit holds only invented candidates, so no Data Processing Addendum (DPA) is needed and any Claude or Copilot plan may connect. The rules below apply before the first real candidate data, if the proof of concept passes its evaluation.

## Checks per service

| Service | Rule | Check result |
|---|---|---|
| Claude (MCP client) | With real candidate data, candidate data may flow through MCP only to a commercial Claude plan, Team or Enterprise, covered by a DPA; consumer plans (Free, Pro, Max) must not connect | **Not required for the proof of concept** (fake data only). To do before real data: choose the plan and sign the DPA |
| GitHub Copilot in VS Code (MCP client) | With real candidate data, only a business plan, Copilot Business or Copilot Enterprise, under the organisation's data protection terms | **Not required for the proof of concept** (fake data only). To do before real data: confirm the Copilot plan |
| Groq (in-app AI) | The app uses Groq free-plan models only (knowledge rule: models in `LLM_MODELS`, free plan). Candidate CVs and answers reach Groq through in-app generation and scoring | **Not required for the proof of concept** (fake data only). Open before real data: no DPA with Groq is recorded for the free plan; the decision (DPA, paid plan or another provider) is the developer's, with `knowledge-builder` for the knowledge rule |

## Minimal data by default

- No full CV text in a tool result unless the user explicitly asks for it.
- Interview preparation is non-identifying: no candidate name, email, date of birth, photo or resume URL.
- Candidate-written content (CV text, answers) is returned as clearly delimited untrusted data, never as instructions.
- No tool sends anything outside the app: no email, no invitation, no message to a candidate.
- Final decisions, deletions and anything sent to candidates stay in the dashboard ([operation inventory](mcp-operations.md)).

## Who may connect

- Only staff accounts of dev-recruit: an account connects through OAuth with its own sign-in, and installing a plugin or connector gives no access without one.
- The account must be enabled: an administrator has switched its email verification on, and it is not banned. Candidates are not users and never connect.
- OAuth scopes (`recruit:read`, `recruit:draft`, `recruit:write`) limit what one token may do; they never restrict a user or a role.
