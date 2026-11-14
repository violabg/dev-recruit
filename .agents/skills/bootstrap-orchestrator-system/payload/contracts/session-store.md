# Session store

Lab-authored contract, derived from the captured session tools. The runtime implements it in `runtime/lib/session.mjs`; when the runtime is unavailable, follow the procedures below by hand with file tools.

A session is the durable working record of one piece of work. It survives between turns, between delegates and between conversations. All session state lives under `{{SESSIONS_ROOT}}/<sessionId>/` (written `sessions/<sessionId>/` below):

```text
sessions/<sessionId>/
  session.json             { sessionId, createdAt, lastActivatedAt }
  memory.md                appended memory entries, oldest first
  log.md                   appended events, oldest first
  artifacts/<name>.md      one artifact per file: front matter + content
  artifacts/<name>.<ext>   the image file of an image artifact
  jobs/<jobId>.json        one job per workflow run (contracts/workflow-loop.md)
  designs/<designId>/      the structured design of a DESIGN job (contracts/design-model.md)
  knowledge-reads.json     the knowledge documents served in the session, by path (contracts/knowledge-catalog.md)
```

Session ids and job ids match `^[A-Za-z0-9_]{1,100}$`: a hyphen is refused. Artifact names match `^[A-Za-z0-9_.-]{1,150}$`.

## session-list

List the folders under `sessions/` that contain a `session.json`, most recently activated first. Never read another session's content: the list is for the developer to choose from.

Response: `Available sessions (most recent first):` followed by one `- <sessionId>` line per session, or `No sessions available.`

## session-activate

Arguments: `sessionId`.

Create `sessions/<sessionId>/` with an empty `memory.md`, `log.md` and `artifacts/` when it does not exist; otherwise keep everything and update `lastActivatedAt`. A session is activated only on the developer's explicit request.

Response:

```text
session_id: <sessionId>
current_state: <empty for a new session, "resumed (created <timestamp>)" otherwise>
usage_instruction: Start from now you have a long term memory and a logger. ...
```

A refused id answers `session-activate failed: sessionId contains unsupported characters. Allowed format: ^[A-Za-z0-9_]{1,100}$. Provided value: '<id>'.`

## session-memory

`session-memory-append` — arguments `sessionId`, `content`. Append one line `- [<ISO timestamp>] <content>` to `memory.md`. Response: `Content appended successfully.`

`session-memory-read` — arguments `sessionId`. Return `memory.md`, then a `# Agent Artifacts` section with one line per artifact: `- Artifact Name: <name> | Intended Use: <use> | Description: <description>`.

Memory holds validated facts, reasoning worth keeping and pointers to artifacts. It never holds a copy of an artifact.

## session-log

`session-event-log` — arguments `sessionId`, `event` (and optional `level`). Append one line `- [<ISO timestamp>] <level>: <event>` to `log.md`. Response: `Log entry added successfully.`

Keep events (actions, decisions, errors) in the log and durable knowledge in memory; never merge the two.

## session-artifacts

`session-artifact-write` — arguments `sessionId`, `name` (or `artifactFrontMatter.name`), `description`, `intendedUse`, `mimeType` (default `text/markdown`), and `content` (or `contentFile`, a workspace-relative path to read the content from). Write `artifacts/<name>.md`; a `name` that ends in `.md` drops that suffix first, and the response names the artifact written (Lab-authored, report 2026-11-11 finding 3: `work_item_1.md` was stored as `work_item_1.md.md` and could not be read back as `work_item_1`):

```markdown
---
name: "<name>"
description: "<description>"
intendedUse: "<intended use>"
mimeType: "text/markdown"
createdAt: "<first write>"
updatedAt: "<this write>"
---
<content, verbatim>
```

Writing an existing name overwrites the content and keeps `createdAt`: re-create the same artifact to update it, never a new one per update. Response: the artifact name.

`session-artifact-read` — arguments `sessionId`, `name` (also accepted as `artifactName`, `artifactId` or `artifact`). Return the artifact file. A missing artifact is an error, never an empty answer.

`session-artifact-list` — arguments `sessionId`. Return a JSON array of the artifacts' front matter, sorted by name.

## session-images

`session-image-attach` — arguments `sessionId`, `blobUrl` (an absolute or workspace-relative file path, or an `http(s)` URL) and `artifactFrontMatter` (`name`, `description`, `intendedUse`).

Copy the file, or download the URL, to `artifacts/<name>.<ext>` and write `artifacts/<name>.md` with the front matter plus `mimeType`, `source` and `file`. A URL that does not return an `image/*` content type is refused: never attach an HTML page in place of an image. Response: `Image attached as session artifact '<name>'. File: <path>`.

Attaching persists an image; it does not look at it. Looking at an image is `#capability:visual-evidence`, the model's own vision.

There is no execution report: upstream stopped exposing `read_current_execution_report` in 3.0.1 and removed its capture in run 4 (3.0.3), so the runtime no longer serves it.
