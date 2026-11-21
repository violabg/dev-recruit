# MCP data policy

Which external services may receive candidate data, and what the MCP server sends by default. Related documents: [MCP server](mcp.md), [operation inventory](mcp-operations.md).

## Checks per service

| Service | Rule | Check result |
|---|---|---|
| Claude (MCP client) | Candidate data may flow through MCP only to a commercial Claude plan, Team or Enterprise, covered by a Data Processing Addendum (DPA). Consumer plans (Free, Pro, Max) must not connect to dev-recruit | **Non confermato**: the developer has not confirmed the plan or the DPA. Until confirmed, the MCP server is used only with test data and the Phase 5 pilot does not start |
| GitHub Copilot in VS Code (MCP client) | Same rule: only a business plan, Copilot Business or Copilot Enterprise, under the organisation's data protection terms | **Non confermato**: the developer has not confirmed the Copilot plan. VS Code stays limited to test data until confirmed |
| Groq (in-app AI) | The app uses Groq free-plan models only (knowledge rule: models in `LLM_MODELS`, free plan). Candidate CVs and answers reach Groq through in-app generation and scoring | **Open risk**: no DPA with Groq is recorded for the free plan. No model change is made here; the decision (DPA, paid plan or another provider) is the developer's, with `knowledge-builder` for the knowledge rule |

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
