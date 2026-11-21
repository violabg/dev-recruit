# dev-recruit MCP server

Operator reference for the dev-recruit MCP server (`/api/mcp`) and the OAuth 2.1 authorization server that issues its tokens. Related documents: [operation inventory](mcp-operations.md), [data policy](mcp-data-policy.md).

## 1 Verifica Fase 0

Checked on 2026-11-21 against the published npm packages (downloaded with `npm pack` into a scratch folder outside the repository, nothing installed in the repo) and the official documentation pages cited below.

### 1.1 Pinned versions

| Package | Pinned version | Latest on npm at check time | Notes |
|---|---|---|---|
| `@better-auth/oauth-provider` | `1.7.22` | `1.7.27` (`1.8.0-beta.11` beta) | Same version as the installed `better-auth` |
| `better-auth` (installed) | `1.7.22` | — | `package.json` `"better-auth": "^1.7.22"` |
| `mcp-handler` | `2.4.0` | `2.4.0` | Requires MCP SDK v2 (see 1.5) |
| `@modelcontextprotocol/server` | `2.4.0` | `2.4.0` | MCP SDK v2 server package, peer of `mcp-handler` 2.x and `ext-apps` 2.x |
| `@modelcontextprotocol/sdk` | not used | `1.32.2` | SDK v1: pairs only with `mcp-handler` 1.x |
| `@modelcontextprotocol/ext-apps` | `2.0.4` | `2.0.4` | Peer `@modelcontextprotocol/server` ^2.0.0 |

Commands run: `pnpm view @better-auth/oauth-provider versions --json`, `pnpm view mcp-handler version`, `pnpm view @modelcontextprotocol/sdk version`, `pnpm view @modelcontextprotocol/ext-apps version`, `pnpm view <pkg>@<version> peerDependencies`.

### 1.2 `@better-auth/oauth-provider` 1.7.22

Source: package type definitions (`dist/oauth-*.d.mts`, `dist/index.d.mts`) and code (`dist/authorize-*.mjs`, `dist/resource-challenge-*.mjs`); documentation https://www.better-auth.com/docs/plugins/oauth-provider.

**Compatibility with better-auth 1.7.22.** Peer dependencies of 1.7.22: `better-auth ^1.7.22`, `@better-auth/core ^1.7.22`, `better-call 1.4.5` (exact), `@better-auth/utils ^0.4.2 || ^0.5.0`, `@better-fetch/fetch 1.3.3` (exact). Installed in the repo: `better-auth 1.7.22`, `@better-auth/core 1.7.22`, `better-call 1.4.5`, `@better-auth/utils 0.5.1`, `@better-fetch/fetch 1.3.3`. All satisfied. `better-auth` 1.7.22 ships no OAuth provider of its own (`dist/plugins` has `jwt`, `generic-oauth`, `oauth-proxy`, `oauth-popup`, no `oauth-provider`/`mcp`), so the separate package is required.

**JWT plugin.** Required: access tokens bound to a resource are JWTs signed through the Better Auth `jwt` plugin (`better-auth/plugins`). Only `disableJwtPlugin: true` removes it, and then access tokens are always opaque. The JWT plugin adds `GET /api/auth/jwks` (option `jwks.jwksPath`, default `/jwks`) and `GET /api/auth/token` (a session JWT, unrelated to `/oauth2/token`).

**Options that implement each promise of the authorization server contract.**

| Promise | Plugin behaviour and option name |
|---|---|
| PKCE required, S256 only | Built in. `code_challenge_method` accepts only `S256` (metadata `code_challenge_methods_supported: ["S256"]`); a public client (`token_endpoint_auth_method: "none"`) always requires PKCE (`isPKCERequired`: "pkce is required for public clients"). No option needed. `clientRegistrationRequirePKCE` (default `true`) covers confidential DCR clients |
| Public clients only (`token_endpoint_auth_method: none`) | The plugin also accepts confidential clients, so the restriction is ours: the registration hook (row "registration hook" below) refuses any `token_endpoint_auth_method` other than `none`, and the pre-registered VS Code client is created with `none` |
| Scopes list | `scopes` (default `["openid","profile","email","offline_access"]`). DCR capability set: `clientRegistrationDefaultScopes` (default = `scopes`) and `clientRegistrationAllowedScopes`. Advertised list: `advertisedMetadata.scopes_supported`. A refresh token is issued only when `offline_access` is granted, so `scopes` must contain `offline_access` next to `recruit:read`, `recruit:draft`, `recruit:write` |
| Valid audiences / resource indicator (RFC 8707) | `resources` (string or `{ identifier, accessTokenTtl, allowedScopes, … }`; seeded into the `oauthResource` table, `resourceSeedMode` default `"insertOnly"`). `enforcePerClientResources` (default `true`) requires each client to be linked to the resource; `clientRegistrationDefaultResources` links every DCR client to the listed identifiers. The access token `aud` is the requested `resource` |
| Access token TTL 900 s | `accessTokenExpiresIn: 900` (default 3600), or per resource `accessTokenTtl: 900`. `scopeExpirations` can shorten per scope |
| Refresh TTL 30 days with rotation | `refreshTokenExpiresIn` (default `2592000` = 30 days). Rotation is built in: every refresh revokes the used token (`revoked`/`rotatedAt`) and returns a new one; reuse of a rotated token invalidates the whole token family (`invalidateRefreshFamily`). `refreshTokenReuseInterval` (default `0`) keeps any reuse a replay |
| Revocation endpoint | `POST /api/auth/oauth2/revoke` (RFC 7009), rate limit `rateLimit.revoke` |
| Dynamic client registration toggle | `allowDynamicClientRegistration` (default `false`) enables `POST /api/auth/oauth2/register`; `allowUnauthenticatedClientRegistration` (default `false`) accepts it without a session (needed for Claude, which registers before any user signs in). `clientRegistrationDefaultApplicationType` (`"web"`, `"native"`, `"infer"`) |
| Registration hook | The plugin has no dedicated registration callback. The hook is the Better Auth core `hooks.before` middleware (`createAuthMiddleware` from `better-auth/api`) matching `ctx.path === "/oauth2/register"`: it reads `ctx.body.redirect_uris` and `ctx.body.token_endpoint_auth_method` and throws `APIError("BAD_REQUEST")` unless every redirect URI is on the allowlist and the method is `none`. `validateRedirectUri(redirectUri, registeredUris, defaultResult)` additionally re-checks the allowlist at `/oauth2/authorize`. `rateLimit.register` (default 5 per 60 s) |
| Consent page path | `consentPage` (required option), e.g. `"/auth/consent"`; the page receives `client_id`, `scope`, `code` and completes with `POST /api/auth/oauth2/consent` (`accept: true`) |
| Login page path | `loginPage` (required option): `"/auth/login"` (existing page `app/auth/login`) |
| OAuth rate limits | `rateLimit.{token, authorize, introspect, revoke, register, userinfo, rotateClientKeys}` (`{ window, max }` or `false`) |

No promise is unmet: no Gap.

**Endpoints** (served by the existing catch-all `app/api/auth/[...all]`, base path `/api/auth`):

| Endpoint | Path |
|---|---|
| Authorize | `GET /api/auth/oauth2/authorize` |
| Token | `POST /api/auth/oauth2/token` |
| Register (DCR) | `POST /api/auth/oauth2/register` |
| Revoke | `POST /api/auth/oauth2/revoke` |
| Consent | `POST /api/auth/oauth2/consent` |
| Introspect | `POST /api/auth/oauth2/introspect` |
| UserInfo | `GET /api/auth/oauth2/userinfo` |
| JWKS (jwt plugin) | `GET /api/auth/jwks` |
| AS metadata (plugin copy) | `GET /api/auth/.well-known/oauth-authorization-server` |

**RFC 8414 metadata.** The issuer is the JWT plugin `jwt.issuer` or else the Better Auth base URL including the base path, i.e. `<APP_URL>/api/auth`. With path insertion the metadata document lives at `<APP_URL>/.well-known/oauth-authorization-server/api/auth`, outside the auth catch-all: the plugin exports `oauthProviderAuthServerMetadata(auth, { headers? })`, which returns a `(request) => Response` handler for that route (and `oauthProviderOpenIdConfigMetadata` for `/.well-known/openid-configuration`). The resource-server helper `oauthProviderResourceClient` (`@better-auth/oauth-provider/resource-client`) offers `verifyAccessTokenRequest`, `verifyBearerToken` and `getProtectedResourceMetadata`.

**Prisma models.** From the plugin schema: `oauthClient`, `oauthRefreshToken`, `oauthAccessToken`, `oauthConsent`, `oauthResource`, `oauthClientResource`, `oauthClientAssertion`; from the jwt plugin: `jwks`. The design lists only `oauthClient`, `oauthAccessToken`, `oauthRefreshToken`, `oauthConsent`, `jwks`: `oauthResource`, `oauthClientResource` and `oauthClientAssertion` are also required. `npx @better-auth/cli generate` needs the plugin installed and configured in `lib/auth.ts`, so it was not run here: the database operation runs it and checks these names.

### 1.3 Claude custom connector

Source: https://claude.com/docs/connectors/building/authentication.

- **Callback URL.** The hosted apps (claude.ai on the web, Desktop, mobile, Cowork) use exactly `https://claude.ai/api/mcp/auth_callback`. The page documents no `https://claude.com/api/mcp/auth_callback` callback: the allowlist starts with the claude.ai value only, and a claude.com callback is added only if the client verification observes it. Claude Code is a native client with an RFC 8252 loopback redirect on an ephemeral port (`http://localhost/callback`, `http://127.0.0.1/callback` declared in its CIMD) and is out of scope for the first client.
- **Registration.** Supported by default: `oauth_dcr` (RFC 7591) and `oauth_cimd`. Claude selects CIMD only when the AS metadata advertises both `"client_id_metadata_document_supported": true` and `"none"` in `token_endpoint_auth_methods_supported`; otherwise it uses DCR. Our AS does not advertise CIMD, so Claude registers through restricted DCR as a public client. A client id entered in the developer portal or at connection time (`oauth_anthropic_creds`, `custom_connection`) is the alternative.
- **PKCE and scopes.** Claude always sends `code_challenge_method=S256`. It requests the `scope` of the `WWW-Authenticate` 401 challenge, else the protected-resource metadata `scopes_supported`, and appends `offline_access` when the AS metadata lists it.
- **Resource.** The protected-resource metadata `resource` must equal the URL the user enters, path included (`<APP_URL>/api/mcp`); Claude uses only the first entry of `authorization_servers`. The 401 must carry `WWW-Authenticate` with `resource_metadata`.
- **Tokens.** Claude refreshes on a 401 and up to five minutes before expiry; an invalid refresh token must answer `invalid_grant`; refresh tokens of public clients must rotate, with the new token in the same response. Discovery, registration and token endpoints must answer within 10 s, refresh within 30 s.

### 1.4 VS Code

Sources: https://code.visualstudio.com/api/extension-guides/ai/mcp, https://code.visualstudio.com/docs/copilot/reference/mcp-configuration.

- **DCR.** Supported for OAuth identity providers, as is a pre-registered client id.
- **Pre-registered client id.** Editor `mcp.json`: `"oauth": { "clientId": "<id>" }` on an `http` server; portable Copilot configuration: the flat field `oauthClientId`.
- **Redirect URIs.** `http://127.0.0.1:33418` and `https://vscode.dev/redirect` must be in the client's allowed redirect URLs.

### 1.5 `mcp-handler` 2.4.0

Source: package README and `dist/index.d.mts` (https://www.npmjs.com/package/mcp-handler).

- **SDK.** 2.x is built on MCP SDK v2 and needs `@modelcontextprotocol/server ^2.0.0` and `zod ^4.2.0` (repo: `zod 4.6.7`). `@modelcontextprotocol/sdk` 1.x works only with `mcp-handler` 1.x. Decision D9 names `@modelcontextprotocol/sdk`: with the pinned `mcp-handler` 2.4.0 and `ext-apps` 2.0.4 the dependency is `@modelcontextprotocol/server` 2.4.0 instead.
- **Endpoint `/api/mcp`.** The handler does not read the pathname: the route file `app/api/mcp/route.ts` defines the endpoint. The 1.x options `basePath`, `streamableHttpEndpoint`, `sseEndpoint`, `sseMessageEndpoint`, `disableSse`, `redisUrl`, `maxDuration`, `sessionIdGenerator` no longer exist.
- **SSE and Redis.** HTTP+SSE (2024-11-05) is removed and Redis is not used. Serving is stateless: the 2026-07-28 protocol natively, 2025-era Streamable HTTP through the SDK legacy fallback; GET/DELETE session operations answer `405`.
- **API.** `createMcpHandler(initializeServer, options)` returns `(request: Request) => Promise<Response>`. `options` = SDK `ServerOptions` (including `instructions?: string`, returned in the initialize result) plus `serverInfo`, `verboseLogs`, `onEvent`, `maxSubscriptions`, `telemetry`. Tools: `server.registerTool(name, { title, description, inputSchema: z.object(...), _meta }, cb)`; resources: `server.registerResource(...)` (variadic `tool`/`resource` removed). Auth info in callbacks: `ctx.http?.authInfo`.
- **Auth helpers.** `withMcpAuth(handler, verifyToken, { required, requiredScopes, resourceMetadataPath, resourceUrl })` answers 401/403 with RFC 9728 `WWW-Authenticate`; `protectedResourceHandler({ authServerUrls, resourceUrl })` and `generateProtectedResourceMetadata(...)` serve the protected-resource metadata; `metadataCorsOptionsRequestHandler()` answers CORS preflight.
- **Spec note.** The 2026-07-28 MCP specification deprecates DCR in favour of CIMD (`client_id_metadata_document_supported` in the AS metadata). Better Auth offers it through the separate `@better-auth/cimd` plugin, outside decision D8.

### 1.6 `@modelcontextprotocol/ext-apps` 2.0.4

Source: package README and `dist/src/*.d.ts`; https://claude.com/docs/connectors/building/mcp-apps/getting-started, https://code.visualstudio.com/blogs/2026/01/26/mcp-apps-support.

- **Peers.** `@modelcontextprotocol/server ^2.0.0` (optional), `@modelcontextprotocol/client`, `@modelcontextprotocol/core ^2.0.0`, `zod ^4.2.0`; React optional. Entry points: `.`, `./server`, `./app-bridge`, `./react`, `./app-with-deps`.
- **Resource MIME type.** `RESOURCE_MIME_TYPE = "text/html;profile=mcp-app"`.
- **Tool link.** `_meta.ui.resourceUri: "ui://…"` on the tool; `registerAppTool(server, name, config, cb)` writes it. The legacy flat key `RESOURCE_URI_META_KEY = "ui/resourceUri"` is deprecated.
- **Resource.** `registerAppResource(server, name, uri, config, readCallback)` defaults the MIME type; the read result carries `_meta.ui` (`McpUiResourceMeta`).
- **CSP fields** (`_meta.ui.csp`, `McpUiResourceCsp`): `connectDomains` (connect-src), `resourceDomains` (img/script/style/font/media-src), `frameDomains` (frame-src), `baseUriDomains`. Empty or omitted means no external origin.
- **App bridge** (`App` class): `connect()`, `ontoolresult` (tool result notification), `ontoolinput`, `ontoolinputpartial`, `callServerTool(params)`, `openLink(params)`, `sendMessage(params)`, `updateModelContext(params)`.

## 2 Decisioni Fase 0

| Item | Outcome |
|---|---|
| Claude plan (Team or Enterprise, with DPA) | **Non confermato.** The developer has not confirmed the plan. The Phase 5 pilot cannot start until a Team or Enterprise plan with DPA is confirmed ([data policy](mcp-data-policy.md)) |
| First client | Claude desktop and claude.ai (custom connector, restricted DCR, callback `https://claude.ai/api/mcp/auth_callback`), then VS Code (pre-registered public client, redirects `http://127.0.0.1:33418` and `https://vscode.dev/redirect`) |
| Account gate | Sign-in itself stays blocked until an administrator switches the account's email verification on: `lib/auth.ts` sets `emailAndPassword.requireEmailVerification: true`, and the app sends no email. A banned account cannot open a session (admin plugin). On top of that, the `hooks.before` guard in `lib/auth.ts` (`oauthRequestGuard`, `lib/mcp/oauth-registration.ts`) refuses `/oauth2/authorize` and `/oauth2/consent` with `access_denied` for a session whose user is unverified or banned, and the consent page `/auth/consent` shows "Account non abilitato: chiedi a un amministratore di attivarlo." without buttons. Tests: `tests/lib/mcp/oauth-registration.test.ts`, `tests/app/api/auth/route.test.ts` |
| Better Auth OAuth plugin | `@better-auth/oauth-provider` 1.7.22 with the `jwt` plugin meets every promise (section 1.2); no Gap |
| MCP server library | `mcp-handler` 2.4.0 with `@modelcontextprotocol/server` 2.4.0 (section 1.5) |
| Operation inventory | [mcp-operations.md](mcp-operations.md) |
| Data policy | [mcp-data-policy.md](mcp-data-policy.md) |
