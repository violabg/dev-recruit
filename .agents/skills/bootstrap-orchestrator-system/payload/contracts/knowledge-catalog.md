# Knowledge catalogue

Lab-authored contract, derived from the captured knowledge catalogue. The runtime implements it in `runtime/lib/knowledge.mjs`.

Project knowledge is a set of markdown documents under `{{KNOWLEDGE_ROOT}}`. Each document declares its tier in its front matter:

```markdown
---
title: "coding standards"
tier: MustHave | PerContext | PerComponent
keywords: [coding standard, clean code]
intent: "When writing new code or reviewing existing code."
editable: true
---
<the knowledge>
```

| Tier | Meaning |
| --- | --- |
| `MustHave` | Mandatory knowledges for the project. Agent must always apply them: every workflow reads all of them in full. |
| `PerContext` | Context depending knowledges. Agent must evaluate them as context evolves. |
| `PerComponent` | Component depending knowledges. Agent must evaluate them based on the component involved in its implementation. |

A document without a valid `tier` is `PerContext`. `README.md` files are not knowledge. `{{KNOWLEDGE_ROOT}}/kbsettings.yaml` may exclude documents with relative glob patterns:

```yaml
excludes:
  - "External/**/*.md"
```

## catalog

`#capability:knowledge-catalog` — no arguments. List the documents (path order, excludes applied), assign `file_id` 1, 2, 3, ... in that order, and answer:

```yaml
MustHave:
  section_description: Mandatory knowledges for the project. Agent must always apply them
  knowledges:
  - file_id: 1
    keywords: changelog, user story
    intent: When implementing or planning any new User Story or Bug.
    IsEditable: true
PerContext:
  ...
PerComponent:
  ...
```

The catalogue is rebuilt on every call, so a `file_id` is valid only for the current index: adding, renaming or excluding a document renumbers the ids. Re-read the catalogue before using an id from an earlier session. The last index is cached in `{{SESSIONS_ROOT}}/.cache/knowledge-catalog.yaml` for humans; a read never writes into the knowledge folder.

## read

`#capability:knowledge-read` — arguments `fileIds` (one id, a list, or a comma-separated string), optional `sessionId` and `part`. Answer each document in full under a `# file_id <n> — <title>` heading, separated by `---`. Every line of the document, front matter included, is prefixed with its number as `<n>| ` (Lab-authored: the served instructions register a knowledge reference by "the numbered lines returned by the read tool", and the captured read shows none). An id missing from the current index says so; it is never answered with another document. A long answer is served in parts that each start at a document (`contracts/workflow-loop.md`, Parts); a document longer than one part continues under the same heading.

A document is recorded by path in `sessions/<sessionId>/knowledge-reads.json` (Lab-authored) when the part holding its last line is served to the role that writes the design (`orchestrator`, or a call that names no role, which is an operator's), not when it is requested, in the session named by `sessionId` or, without one, the most recently activated session; with no session nothing is recorded. A refused part records nothing. Name the session whenever it is known: another job's activation can change the most recent one. The verification view uses the record to show the verifier the knowledge the design was built on (`contracts/projections.md`).

## write

`#capability:knowledge-create` — arguments `title`, `content`, `tier`, optional `keywords`, `intent`, `folder`. Create `<folder>/<title as snake case>.md` with the front matter above; refuse when the file exists. Answer the new `file_id`.

`#capability:knowledge-update` — arguments `fileId`, `content`, optional `intent`. Replace the document's content, keeping its front matter; refuse a document with `editable: false`.

Knowledge has one writer: `knowledge-builder`, through these two operations. No workflow changes knowledge: not DESIGN, not FAST_IMPLEMENTATION, not DOCUMENTATION, and not a correction round. A call naming any other role is refused (Lab-authored: this overrides the upstream tool map, which also grants them to `ask`). A call naming no role is an operator's.

## guard

Lab-authored. A role's file tools can reach the knowledge folder, so the runtime also notices a change it did not make:

- `workflow-job-activate` stores `knowledgeBaseline` in a new job: the SHA-256 of every file under the knowledge root, catalogued or not, except dotfiles.
- `#capability:knowledge-create` and `#capability:knowledge-update` record the hash they leave in `<sessions root>/knowledge-writes.json`.
- `workflow-step-next` refuses without advancing when a file differs from the baseline and is not the runtime's last write, or when a baseline file is gone. A job with no baseline is not checked.

The refusal: `workflow-step-next failed: knowledge changed outside knowledge-create and knowledge-update: <paths>. No workflow agent may edit knowledge, and the step did not advance. Halt and report this to the developer: the change must be restored or applied through knowledge-builder.`

Limits: it detects a change at the next advance and does not prevent it, so the client's own path deny is the stronger layer where it has one. A change after the last `workflow-step-next` of a job is not checked. A developer's hand edit, or a merge that changes knowledge during a job, is refused too.

## rebuild

`#capability:knowledge-index-rebuild` — no arguments. Rebuild the index and answer the number of documents.
