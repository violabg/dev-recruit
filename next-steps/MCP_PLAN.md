# MCP plan: drive dev-recruit from AI subscription apps

Goal: recruiters run most dashboard work (positions, quizzes, kits, interviews, action center) from Claude Desktop / claude.ai, later VS Code Copilot, through a remote MCP server with visual widgets (MCP Apps). Model work runs on the user's subscription; the app stays system of record.

## Principles

- **Subscription vs API.** Consumer/Team subscriptions cannot power the app backend. Legit use: the person uses Claude, Claude calls our MCP server. In-app background work (automations) keeps using the API.
- **Legal line.** AI prepares, summarises, challenges; a person decides. No AI scoring of CVs, answers or candidates (EU AI Act Annex III §4 high-risk, GDPR art. 22, L. 132/2025). Emotion recognition is prohibited. The rule goes in tool descriptions and plugin skills.
- **Stays in the web app.** Everything candidates see (quiz taking, code editor, invites), automations (reminders, deadlines, notifications: cron + rules, no AI), dense/bulk views.
- **Trust ladder.** Read-only → drafts → confirmed writes.

## Architecture

- Remote MCP server inside the Next.js app (`/api/mcp`, Streamable HTTP). No local install.
- Tools call existing `lib/actions` / `lib/services`: same role and data checks as the dashboard.
- MCP Apps widgets: `ui://` HTML resources rendered by the host in a sandboxed iframe. They can call tools back, update model context, open deep links to the dashboard. No access to app cookies; data comes only from tool results. Package: `@modelcontextprotocol/ext-apps`. Supported hosts: claude.ai, Claude Desktop, VS Code Copilot, M365 Copilot (behaviour varies; mobile unverified).
- Every tool has a plain-text result usable without the widget.

## Distribution

| Client | How |
|---|---|
| Claude Team/Enterprise | Org admin adds a custom connector once; members click Connect and sign in. Optional plugin bundling connector + skills. |
| VS Code Copilot | Shared `mcp.json`; GitHub org Copilot policy allowlists MCP servers. |
| M365 Copilot | Copilot Studio / agent setup. Later. |

Disabling a dev-recruit user cuts access from every client.

## Security

1. **Authentication**: OAuth 2.1 per MCP authorization spec; dev-recruit is the authorization server via Better Auth (verify current OAuth-provider / MCP plugin). Short-lived, audience-bound, revocable tokens. Client registration limited to allowlisted redirect URIs.
2. **Authorization**: existing roles, enforced inside the actions. OAuth scopes `read`, `draft`, `write`.
3. **Write safety**: creates/updates produce drafts or need explicit confirmation in the widget. Dashboard-only at first: final decisions, deletions, messages to candidates.
4. **Prompt injection**: candidate content (CV, answers) marked as untrusted data in tool results; minimal data by default (no full CV unless asked); nothing leaves the app without confirmation.
5. **Audit**: user, client, tool, arguments, result, timestamp, channel `mcp`.
6. **Controls**: rate limits, kill switch per org and per user, admin view to revoke tokens.
7. **Data policy**: only commercial Claude plans (Team/Enterprise, DPA). Consumer Pro/Max not allowed for candidate data.

## Phases

### 0. Decisions (no code)
- Company Claude plan; first client (Claude only, then VS Code).
- Write down the legal line.
- Inventory dashboard operations, mark each *read* / *draft* / *write* / *dashboard-only*.
- Decide what to do with the existing in-app AI evaluation (answer, resume, overall evaluation in `lib/services/ai/`).

### 1. Read-only foundation
- MCP endpoint, Better Auth OAuth, audit log.
- Tools: `action_center`, `list_positions`, `get_position`, `get_application`, `list_interviews`.
- Text results with dashboard deep links. Test in Claude Desktop.

### 2. Widgets
- 4–5 MCP Apps views in the flow-track style: action center, position, application flow, interview list.
- Text fallback for hosts without widget support.

### 3. Drafts
- `create_position_draft`, `save_quiz_draft`, `save_interview_kit_draft`, `propose_interview_slot`.
- Claude generates content on the subscription; the tool validates with existing Zod schemas and saves a draft.
- Preview + confirm in widget.

### 4. Plugin + pilot
- Claude plugin: connector + skills (create position, quiz for candidate, interview prep) with the rules (no scoring, drafts first).
- Pilot with 2–3 recruiters; review audit log and feedback.

### 5. Broaden and slim down
- Remaining operations; confirmed writes once drafts proved safe.
- Retire in-app Groq generation now done by Claude; keep the API for background automations and as fallback for users without a subscription.
- Add VS Code Copilot.

## Open questions

- Better Auth OAuth/MCP plugin maturity for MCP authorization (dynamic client registration, resource indicators).
- MCP Apps rendering differences between Claude and Copilot; mobile support.
- Sandboxed execution of candidate code against test cases (deterministic grading) as a separate track.
