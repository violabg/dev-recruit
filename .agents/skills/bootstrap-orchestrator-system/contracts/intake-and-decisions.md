# Intake, discovery and decisions

Phases A to C. Nothing is written to the target in these phases.

## Phase A: Intake

Confirm the request is installing the agentic system. Redirect requests for application work, product tests, schema or application configuration.

Settle:

- the target repository and its root;
- the clients the team uses (`environments` in `registry/questions.json`): a multi-select of the profiles in `registry/clients.json` plus Other with a name. Ask which surfaces each client is used on (terminal, IDE extension, desktop or web app); a route that works on one surface may not work on another;
- the execution host: the client running this session. It selects nothing;
- Node.js: run `node --version`. The runtime needs it in every selected client's terminal or sandbox. Without it, the user must explicitly approve running the gates by hand from the contracts, recorded as instruction-only;
- plan-only or install.

## Phase B: Discovery

Read-only. Use subagents for independent lanes when the client has them; otherwise run the lanes in order.

- **Profiles.** For every selected client, read the documentation the profile lists in `docs`, at the version the team runs. Compare folders, file formats, frontmatter fields, tool names, route, delegation, skill invocation control and permission files with the profile. Every difference becomes an `overrides` entry in that environment's answers, with the source and the date. A client without a profile follows `contracts/client-bindings.md`.
- **Tracker and integrations.** Find the tracker, the MCP servers already configured for each client, their tools and how they authenticate (`contracts/integrations.md`).
- **Wiki.** Look for a wiki only from evidence: links in README and docs, a configured MCP server.
- **Knowledge and vocabulary.** Existing `knowledge/`, docs, ADRs, `CONTEXT.md` or another glossary.
- **Validation.** The commands CI runs, in order.
- **Paths.** Collisions with the default folders, and files the installer would replace: existing role files, skills with the same names, `AGENTS.md`, `CLAUDE.md`, client settings. An installation with hidden system folders is migrated, not reinstalled (`maintain-orchestrator-system`).
- **Skill folders.** Every existing skill folder, copy and symlink, and which folders each selected client discovers on each surface (`contracts/locations-and-permissions.md`, Shared skills folder).
- **Tooling globs.** Compiler, lint, test and bundler configuration whose broad globs would include the visible system folders.

## Phase C: Decisions

Work through `registry/questions.json`:

- `always`: ask, one material question at a time. State the evidence, the recommendation adjusted to it, and what changes with another answer.
- `per-environment`: ask for each selected client.
- `on-evidence`: ask only when discovery found the thing; otherwise record the documented default (for example `{ "none": "no wiki" }`).
- `derived`: fill from discovery and present all of them together as one grouped approval.

Then write the answers file at `<maintenance root>/answers.json` (default `agentic-system-maintenance/answers.json`). Its shape:

```json
{
  "version": 1,
  "repo": { "name": "shop-web" },
  "prefix": "shop-",
  "executionHost": "claude-code",
  "nodeVersion": "v24.1.0",
  "locations": {
    "runtimeRoot": "agentic-system",
    "sessionsRoot": "~/.agentic-system/sessions/shop-web",
    "userRuntimeRoot": "~/.agentic-system",
    "knowledgeRoot": "knowledge",
    "maintenanceRoot": "agentic-system-maintenance",
    "guideRoot": "docs/agentic-system",
    "documentationTemplates": "user"
  },
  "glossaryPath": "CONTEXT.md",
  "validationCommands": "npm run lint && npm test",
  "tracker": { "adapter": "GitHub Issues" },
  "skills": { "manage-work-item": "generate" },
  "skillSharing": {
    "folder": ".claude/skills",
    "clients": { "claude-code": { "via": "native", "evidence": "the documented project folder" } }
  },
  "environments": [
    {
      "id": "claude-code",
      "profile": "claude-code",
      "route": "skill",
      "delegation": "native",
      "overrides": {},
      "bindings": {
        "work-item-*": { "text": "Use the GitHub MCP server's issue tools on this repository; they return Markdown.", "tools": ["mcp__github__issue_read", "mcp__github__issue_write"] },
        "wiki-*": { "none": "no wiki" },
        "visual-evidence": "Read the image with the Read tool; for an issue attachment, fetch it with the GitHub MCP server first."
      },
      "roleTools": { "ask": ["mcp__context7__query-docs"] },
      "verification": {}
    }
  ],
  "decisions": [
    { "id": "sessions-root", "answer": "outside the repository", "source": "user", "evidence": "team keeps the repository free of generated files" }
  ]
}
```

- `locations` may omit anything at its default, except `sessionsRoot`: the user always chooses it.
- `skillSharing` is required with more than one client (`contracts/locations-and-permissions.md`, Shared skills folder). With one client it may be left out.
- `tracker.adapter` is the tracker's name, or `local-markdown` for the local Markdown tracker (its contract is installed at `tracker.localContract`, default `<runtime root>/work-items/README.md`).
- `bindings` binds each host capability token the installed roles and skills use. A key ending in `-*` binds a whole family. A value is a sentence (the procedure), `{ "text", "tools" }` when the procedure needs exact tools (they are added to the tool lists of the roles that use the token), or `{ "none": "<reason>" }` for an operation the repository does not have. `delegate` is bound from the profile; leave it out unless an override is needed.
- `decisions` keeps one line per settled question: the answer, how it was settled (`user`, `recommend-accepted`, `discovery`, `fallback`) and the evidence. Maintenance reads it instead of asking again.
- `verification` is filled in phase F.

The installer refuses incomplete answers and names what is missing. Run `node <this skill>/scripts/install.mjs plan --repo <target>` as soon as the answers exist: its errors and warnings are part of the decision work (an unbound token, a collision, a client that cannot prevent automatic skill use).
