# Integrations

The runtime replaces only the workflow server of the original system. Everything else a role reaches through the repository's own integrations: the tracker, a wiki, documentation services, design tools. Bootstrap finds them, binds them and verifies them per client and role.

## Discover

For every selected client, inspect its MCP configuration (`.mcp.json` and user settings for Claude Code, `.codex/config.toml`, `.vscode/mcp.json`, `opencode.json`, `.cursor/mcp.json`) and the tools each server exposes to the roles that would use them. Prefer an integration the repository already uses, then a client-native tool, then the documented fallback. A server declared in a file is not proof that it is installed, authenticated or visible to a role.

## Record, never store secrets

For each integration and client record in the answers file (`decisions`, and `environments[].bindings`):

- transport, server identity and where the client registers it;
- configuration scope (repository, workspace, user) and whether the client must trust the folder first;
- authentication method (OAuth, CLI session, token in an environment variable, OS credential store, none) with the non-secret reference and the login steps;
- the least-privilege scopes the operations need;
- `configuration_status` (`configured`, `missing`, `unverified`) and `authentication_status` (`verified`, `missing`, `expired`, `unverified`, `not-required`).

Never copy a token, password, cookie, authorization header or credential-bearing URL into the answers file, the records, a guide, a log or the chat. If a client needs a secret in a local file, keep it outside every installed and recorded file and document the injection step.

## Configure

Propose each configuration change in the file plan with its exact file, keys and scope. Preserve existing server entries. Never broaden global permissions or share authentication across clients on your own; a user- or organization-level change needs its own explicit approval. A login only the user can complete stays a pending step in the handoff.

## Verify

After the client reloads its configuration, check from the role that uses it: the role sees the exact tools, and one bounded read-only operation returns real data (one work item with its comments, one wiki page, one image's bytes). A listed tool is not a working one. A missing scope or login blocks the dependent workflow step; a client you cannot exercise leaves it `unverified`.
