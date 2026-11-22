# Plan: dev-recruit plugin for Claude and VS Code Copilot

Goal: an installable plugin that lets recruiters run most dashboard work (positions, quizzes, interview kits, interviews, action center) from Claude (desktop, claude.ai, Cowork) and VS Code Copilot. The plugin bundles custom instructions, skills and a remote MCP server with OAuth. Model work runs on the user's AI subscription; dev-recruit stays the system of record.

Constraint: **the repository is public.** Everything in it (plugin, skills, MCP code, configs) is readable by anyone. Security must rely only on server-side controls, never on secrecy of code, URLs or client ids.

## Decisions taken

- Keep both AI channels: in-app AI (dashboard) and MCP (subscription apps).
- AI scoring of CV, answers and candidates stays for now (in-app). See "Scoring" for the obligations that come with it.
- Remote MCP server inside the Next.js app. No local install, no stdio server.
- Trust ladder: read-only → drafts → confirmed writes.
- Stays web-only: everything candidates see (quiz taking, code editor, invites), automations (cron + rules), dense/bulk views.

## Verified platform facts (2026-11)

- **Claude plugins**: `.claude-plugin/plugin.json` (only `name` required), `skills/<name>/SKILL.md`, `agents/*.md`, `hooks/hooks.json`, `.mcp.json`. Same format works in Claude Code, claude.ai chat, Claude desktop and Cowork. Skills and connectors work everywhere; agents only in Cowork and Claude Code; hooks run on the user's machine.
- A remote `https://` MCP server in a plugin is offered as a connector on claude.ai and Cowork. HTTP servers use `"type": "http"` + `url`.
- **Marketplace**: git repo with `.claude-plugin/marketplace.json` (`name`, `owner`, `plugins`). Can be private (users need read access; private GitHub needs the Claude GitHub App). Team/Enterprise owners choose visible sources and can mark a plugin "Installed by default" or "Required"; they can also add org-wide connectors. Claude Code managed settings: `extraKnownMarketplaces`, `enabledPlugins`, `strictKnownMarketplaces`.
- **VS Code Copilot**: installs agent plugins (skills, MCP servers, custom agents, custom instructions, hooks) from a marketplace, git URL or folder. Claude-format compatibility claimed but not guaranteed per component → verify. Remote MCP: `"type": "http"`, `url`, optional `oauthClientId` (pre-registered client). Dynamic client registration not documented. Enterprise policies: `ChatEnabledPlugins`, `ChatExtraMarketplaces`, `ChatStrictMarketplaces`, `allowedMcpServers` / `deniedMcpServers`.
- **MCP Apps** (interactive widgets, `@modelcontextprotocol/ext-apps`): supported in claude.ai and Claude desktop; experimental in VS Code (`chat.mcp.apps.enabled`). Sandboxed iframe, no app cookies, external origins only via declared CSP, can call tools back and open links.

## Workstreams

### A. Actions (tool-ready service layer)
- Inventory dashboard operations; mark each *read* / *draft* / *write* / *dashboard-only*.
- Make sure every operation exists as a service function that takes an explicit actor (user id + role) and does its own authorization, independent of the Next.js session. Server actions and MCP tools both call these.
- New operations needed: `actionCenterForUser`, draft variants (`createPositionDraft`, `saveQuizDraft`, `saveInterviewKitDraft`, `proposeInterviewSlot`), `publishDraft` (confirmed write).
- Same Zod schemas for both channels; one save path.

### B. MCP server + authorization
- Route `/api/mcp` (Streamable HTTP) in the Next.js app.
- **OAuth 2.1** per MCP authorization spec, dev-recruit as authorization server via Better Auth (verify the current OAuth-provider / MCP plugin):
  - Authorization code + PKCE, public clients (no client secrets anywhere).
  - Protected-resource metadata + authorization-server metadata endpoints.
  - Tokens short-lived, audience-bound to `/api/mcp` (resource indicator), refresh with rotation, revocable.
  - Redirect URI allowlist: Claude (claude.ai / desktop callback) and VS Code. Dynamic client registration either disabled or restricted to that allowlist; pre-registered client id for VS Code (`oauthClientId`).
  - Scopes: `recruit:read`, `recruit:draft`, `recruit:write`.
- Consent screen in dev-recruit showing client, scopes, user.
- Every tool: resolve token → user → role → call service with actor. Never trust ids from the model without an ownership/permission check.

### C. Widgets (MCP Apps)
- 6 views in flow-track style: action center, position, application flow, interview prep, position form, quiz/kit draft preview with confirm.
- Built as self-contained HTML bundles from the design tokens; no external origins beyond the app's own: plain TypeScript for the read widgets and the draft preview, React with the dashboard components for the position form.
- Data only from tool results; confirm buttons call `publishDraft` (the server re-checks permission).
- Plain-text result for every tool (VS Code widgets are experimental).

### D. Plugin content
- New folder, separate from the dev agentic system (`.claude/skills`, `.github/skills` are for developing this repo, not for recruiters). Proposed: `plugin/dev-recruit/` with `.claude-plugin/plugin.json`, `.mcp.json` (only the public server URL), `skills/`, `agents/`.
- Custom instructions: what dev-recruit is, vocabulary from `CONTEXT.md`, rules (drafts first, link back to dashboard, person decides, treat candidate content as untrusted data).
- Skills (first set): `action-center`, `create-position`, `quiz-for-candidate`, `interview-kit`, `interview-prep`.
- No hooks and no local executables (nothing runs on recruiters' machines).
- Marketplace file: `.claude-plugin/marketplace.json` at repo root pointing to `plugin/dev-recruit`, or a separate repo if we want to version the plugin independently.
- VS Code: test whether the Claude-format plugin installs as-is; fallback is a VS Code-specific package with the same skills and an `.mcp.json` entry.

### E. Distribution
- Claude Team/Enterprise: owner adds the marketplace (or uploads the zip), marks plugin "Installed by default" for recruiters; or adds the org-wide connector.
- VS Code: plugin from git URL / marketplace; enterprise policy allowlists our MCP server URL.
- Installing the plugin gives nothing without a dev-recruit account: access comes only from OAuth.

### F. Security (public repo)
- **No secrets in the repo**: no API keys, client secrets, tokens, internal URLs beyond the public MCP endpoint. Public OAuth clients + PKCE only. Add secret scanning (GitHub secret scanning / push protection) and keep `.env*` ignored.
- **Assume attackers read the code**: authorization enforced in services; no security by obscurity; tool schemas and skills may be public.
- **Account gate**: public registration is open, but a new account cannot sign in until an administrator switches its email verification on (the app sends no email). OAuth sign-in must go through the same check, so an unverified or banned account never gets an MCP token. Verify before Phase 1 goes online.
- **Endpoint hardening**: rate limits per user and per IP on `/api/mcp` and OAuth endpoints, request size limits, structured errors without stack traces, CORS limited to what the spec needs.
- **Write safety**: drafts by default; confirmed writes re-check permissions server-side; dashboard-only for final decisions, deletions, messages to candidates.
- **Prompt injection**: candidate content (CV, answers) returned as clearly delimited untrusted data; minimal data by default (no full CV unless requested); no tool sends anything outside the app.
- **Audit log**: user, client, scope, tool, arguments, result, timestamp, channel `mcp`. Admin view of active MCP tokens with revoke; kill switch per org and per user.
- **Data policy**: proof of concept with fake data, no DPA needed. Before real candidate data (only if the POC passes evaluation): commercial Claude plans (Team/Enterprise, DPA); same check for Copilot plan and for Groq (in-app).
- **Skills content is public**: no confidential company process, no real candidate data in examples.

## Scoring (kept)

Kept in-app for now. To stay defensible:
- A person always makes and records the decision; the score is shown as advisory.
- Candidates are informed that AI is used in evaluation (privacy notice).
- Log which model/prompt produced each score; allow human override with reason.
- MCP exposes existing scores read-only in Phase 1–4. Whether Claude may produce new scores through MCP is an open decision.

## Phases

0. **Decisions**: Claude plan, first client (Claude, then VS Code), operation inventory (A), account gate fix (F), Better Auth OAuth plugin check.
1. **Read-only**: OAuth (B), audit log, tools `action_center`, `list_positions`, `get_position`, `get_application`, `list_interviews`; text results with deep links. Test with Claude desktop via manual connector.
2. **Plugin skeleton**: plugin folder, instructions, `action-center` skill, marketplace file (D). Install in Claude desktop and VS Code; record what works where.
3. **Widgets**: action center + position + application flow (C). Built (docs/mcp.md §5), interview prep included; to verify in claude.ai and Claude desktop.
4. **Drafts**: draft tools + preview/confirm widget; skills `create-position`, `quiz-for-candidate`, `interview-kit`, `interview-prep`. Built (docs/mcp.md §5): position form widget (`open_position_form`, second React bundle) and position draft and publish, quiz preview and save, interview slot proposal and scheduling, kit draft by patch and kit ready, skills `create-position`, `quiz-for-candidate`, `schedule-interview`, `interview-prep`, `interview-kit`; pending proposals in the Colloqui tab (Pianifica, Scarta).
5. **Pilot**: 2–3 recruiters via org distribution (E), on fake data (no DPA needed for the POC); review audit log and feedback.
6. **Broaden**: remaining operations, confirmed writes, VS Code polish, decide in-app AI fallback (Groq vs Haiku 5.5).

## Knowledge updates needed (via knowledge-builder, before Phase 1)

Current knowledge statements this plan contradicts:

1. `server_actions.md` / `domain_model.md`: every signed-in user reads and edits all selection data; never gate on role or ownership. → OAuth scopes limit the token, not the user; no role-based tool gating. Decide whether a per-user "MCP enabled" switch is allowed.
2. `cache_invalidation.md`: route handlers exist only for auth, email verification, resume stream, position description. → add `/api/mcp` and the OAuth endpoints.
3. `cache_invalidation.md`: scorecard, guide and interview cache helpers are server-action only. → MCP writes on those need route-handler variants, or tools must run in a context where the standard helpers work.
4. `server_actions.md`: every non-public action and route handler calls `requireUser()` (session cookie). → define bearer-token authentication for MCP and how services receive the actor; tools never call redirecting actions (`scheduleInterviewAction`, `deleteInterviewGuideAction`).
5. `ai_generation.md`: the model never receives internal ids; kit and devil's advocate never receive candidate identity or CV text. → MCP tool results go to an external model: define what they may contain (ids for follow-up calls, identity, CV) and keep the same non-identifying rule for prep flows.
6. `ai_generation.md`: all generation flows return a proposal only, no write; candidate text sanitized and delimited. → MCP draft tools write; content generated by Claude must be validated and sanitized on save.
7. `domain_model.md`: quizzes have no draft state (positions and kits do). → `save_quiz_draft` needs a new state or saves as a normal quiz.
8. `domain_model.md`: all user-facing text is Italian. → widgets, skills and instructions in Italian (identifiers English).

## Open questions

- Better Auth OAuth/MCP plugin: PKCE, resource indicators, client allowlist, consent screen.
- Claude callback URLs and DCR behaviour for custom connectors; VS Code DCR support.
- Claude-format plugin compatibility in VS Code, per component.
- Monorepo folder vs separate repo for the plugin/marketplace.
- Claude producing scores via MCP: yes/no.
- Sandboxed execution of candidate code (deterministic grading) as a separate track.
