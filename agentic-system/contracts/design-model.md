# Design model

Lab-authored contract, derived from the captured design tools, the reference design artifact and the 3.0.3 design artifact and instructions (the implementation loop's serve and close have no tool capture). The runtime implements it in `runtime/lib/design.mjs`, `runtime/lib/plan.mjs` and `runtime/lib/design-store.mjs`. The runtime validates requests against `runtime/assets/design-requests.schema.json`; no command serves it, because upstream removed that tool. The argument descriptions of an operation are its section here, which `<token> --help` prints.

A DESIGN job produces one design. A FAST_IMPLEMENTATION job has a job design that holds the knowledge references of the job and has no approval gate (since 3.0.4, `contracts/workflow-loop.md`, job-activate). A DOCUMENTATION job has none, unless it is started on an existing design. A design lives in `sessions/<sessionId>/designs/<designId>/`:

| File | What it is |
| --- | --- |
| `design.json` | the structured design (this contract) |
| `design.integrity.json` | the hash of the last runtime write; a mismatch means `design.json` was edited outside the runtime |
| `design.html` | the review document, regenerated on every write |
| `iterations/IT<n>.snapshot.json` | the workspace snapshot taken when an iteration opens |

## Model

```json
{
  "schemaVersion": 2, "sessionId": "...", "designId": "...", "originJobId": "...",
  "status": "Draft | Approved", "approvedAt": null, "planName": null, "planDescription": null,
  "modifiedAfterApproval": false, "createdAt": "...", "updatedAt": "...",
  "counters": { "obligation": 0, "contract": 0, "api": 0, "pathFile": 0,
                "operation": 0, "decision": 0, "fileReference": 0, "iteration": 0 },
  "obligations": [ { "id": "O1", "origin": "Requirement | Developer", "behavior": "...", "class": "...",
                     "boundaries": "...", "sourceRef": "..." } ],
  "fileReferences": [ { "id": "FR1", "symbol": "Type.Member", "definitionPath": "path", "files": ["path"],
                        "scope": "Production | Test",
                        "details": [ { "path": "path", "line": 12, "why": "...", "purpose": "..." } ] } ],
  "knowledgeReferences": [ { "kid": 1, "fId": 4, "range": { "s": 3, "e": 9 }, "filePath": "core/changelog.md",
                             "scope": "Production | Test" } ],
  "overview": { "currentState": "...", "gaps": "..." },
  "decisions": [ { "id": "D1", "topic": "...", "question": "...",
                   "source": "Requirements | Codebase | InternalReasoning | BreakingChange", "context": "...",
                   "why": "...", "how": "...", "highlight": false,
                   "options": [ { "id": "D1.1", "text": "...", "chosen": true } ] } ],
  "path": { "title": "...", "generator": "orchestrator",
            "contracts": [ { "id": "CT1", "type": "Interface", "module": "...", "file": "...", "signature": "...",
                             "promises": "...", "premortem": [ { "what": "...", "mitigation": "..." } ] } ],
            "apis": [ { "id": "API1", "method": "POST", "path": "/...", "purpose": "...", "auth": "...",
                        "request": "...", "responses": [ { "status": "201", "description": "...", "body": "..." } ] } ],
            "filesystem": { "files": [ { "id": "FS1", "path": "...", "status": "Added | Modified | Deleted",
                                         "module": "...", "reason": "...", "change": "...", "impact": "..." } ] },
            "operations": [ { "id": "IM1", "operation": "...", "kind": "Production | Documentation | Testing",
                              "testType": "Unit | Integration | E2E | Harness (Testing only)",
                              "instructions": "...", "dependsOn": ["IM0"], "files": [],
                              "refObligations": ["O1"], "refContracts": ["CT1"], "refApis": ["API1"],
                              "knowledgeReferences": [1], "fileReferences": ["FR1"],
                              "referencesExemption": { "knowledge": "...", "file": "..." },
                              "realizes": ["D1"], "source": "Design", "sourceRef": "...",
                              "hasDestructiveSideEffects": false,
                              "branches": [], "negatives": [], "exceptions": [],
                              "implementationStatus": "null | InProgress | Implemented | Completed" } ] },
  "servedOperation": null,
  "iterations": [ { "id": "IT1", "request": "...", "workspacePath": "...", "createdAt": "...", "closedAt": null,
                    "status": "Open | Closed", "files": [ { "path": "...", "change": "Added", "detail": null } ],
                    "verifications": [], "blocks": [], "notes": "" } ],
  "history": [ { "at": "...", "action": "...", "summary": "..." } ]
}
```

A design written before 3.0.3 may still hold obligation `elements`, `openPoints`, `refElements`, `path.requirementRef`, contract `confidence`/`evidence` and the operation kinds `Code`, `NotCode`, `Commands` and `Build`. The runtime keeps them as stored and no longer reads them, except the old kinds (see implementation-loop).

**Identity.** The runtime assigns every id from `counters`, in order, and never renumbers or reuses one. Persisted references are prefixed (`IM1`, `O1`, `CT1`); the section writes take cardinal numbers and convert them.

**Validation.** A payload with an unknown property is refused and nothing is applied. Every design operation takes `sessionId`, `jobId` and `request`. A request field sent beside them (`--operation Read`, or a flat JSON object) is read as that field of the request, and a field sent in both places is refused. Error paths are absolute: `/request/operation`, `/request/rows/0/<field>`. Lab-authored: the captured server leaves the flat form and the paths unspecified, and agents that sent a flat `Read` spent a turn on the refusal the runtime gave before.

**Ids.** A session id, a job id and a design id match `^[A-Za-z0-9_][A-Za-z0-9_-]{0,99}$`. Lab-authored: the captured format has no hyphen, and agents proposed `work-item-11` in two of three measured runs; the first character is never a hyphen, so an id is never read as a flag. `planName` keeps the captured format.

## edits

Lab-authored; the captured tools have no such argument. Every design write that stores text takes `edit` beside `request`: `#capability:design-obligations`, `#capability:design-file-references`, `#capability:design-decisions`, `#capability:design-overview`, `#capability:design-contracts`, `#capability:design-file-system` and `#capability:design-operations`.

```json
{ "sessionId": "...", "jobId": "...",
  "edit": [ { "id": "IM2", "field": "instructions", "from": "the text to find", "to": "the text that replaces it" } ] }
```

An edit changes text inside one field of a stored row, so a correction to long instructions sends the sentence and not the field (a patch replaces the whole field). `edit` is one edit or a list.

- `id` is the row as the design shows it (`IM2`, `CT1`, `D3`). A bare number is read as the row of a command with one table (`2` is `IM2` on `design-operations`); `design-contracts` needs `CT#` or `API#`, and `design-overview` takes no id.
- `field` is a text field of the row, by its name in the request schema; a nested one is a path (`options[0].text`, `premortem[1].mitigation`, `details[0].why`). An id, a list and a field with fixed values are not edited: they change with a patch or an `Update`.
- `from` must occur exactly once in the field; `all: true` replaces every occurrence. Any run of white space in `from` matches any run of white space in the field, so text quoted from a one-line snapshot row finds stored line breaks.
- The call is all or nothing and carries no `request`. A rejected edit is listed as `{ "path": "edit[0]", "message": "..." }` and none is applied. A row of another command is refused with its owner.

Response: `{"edited": ["IM2.instructions"]}`. Measured before it existed: one run spent 26 turns writing and repairing find-and-replace scripts over its own payload files to change sentences in two 10 KB fields.

## kept-requests

Lab-authored. A design write is applied whole or not at all, as captured, so a refused request used to be sent again in full: in one measured run five refusals cost about 55,000 output tokens of resent payloads. A refused design write of 600 bytes or more is kept for a day (`<cache root>/requests/<id>.json`) and its refusal carries `kept`: the draft id and the call that corrects it. A smaller request is cheaper to send again and is not kept.

```json
{ "sessionId": "...", "jobId": "...", "draft": "3f9a2c1d0b7e",
  "move": { "apis": "add.apis" }, "set": { "add.files[2].status": "Added" }, "drop": ["add.contracts"] }
```

The call names the draft and carries only the correction, with the paths the refusal reported (`add.contracts[0].premortem`, `/request/rows/3/elements`; a leading `request` is optional):

| Argument | Effect on the kept request |
| --- | --- |
| `move` | `{ "<from>": "<to>" }`: a value sent in the wrong place. Onto a list it is appended, onto an object merged. |
| `set` | `{ "<path>": <value> }`: a new value at a path. |
| `drop` | `["<path>"]`: a value to remove; elements of one list are removed from the last, so each index names the element the refusal named. |
| `replace` | `[{ "from", "to" }]`: text of a payload that was not valid JSON, each found exactly once, applied before it is parsed. |

The kept request with the correction applied is validated and applied as one whole request, all or nothing, exactly as if it had been sent that way; a correction that leaves it invalid is refused and keeps the new form as a new draft when it is large enough. A draft of another command, an unknown draft and a path that names nothing are refused. The CLI keeps a `--json` payload that is not valid JSON the same way and names the place of the error (`near: …`), so it is repaired with `replace` (`runtime/lib/kept.mjs`).

## row-writes

`#capability:design-obligations`, `#capability:design-file-references`, `#capability:design-decisions` — arguments `sessionId`, `jobId`, `request`:

```json
{ "operation": "Add | Read | Update | Delete", "rows": [ ... ], "ids": [ "O1" ] }
```

| Operation | Effect | Response |
| --- | --- | --- |
| `Add` | rows carry no id; the runtime assigns the next id | `{"added": ["O1", "O2"]}` |
| `Read` | `ids` selects rows; empty `ids` reads all | a JSON array of the rows, each with its `id` (the 3.0.2 capture), one row per line |
| `Update` | each row names its `id`; only the fields sent change | `{"updated": ["O1"]}` |
| `Delete` | removes the rows named by `ids` | `{"deleted": ["O1"]}` |

`#capability:design-obligations` with `Read` also takes a top-level `outline: true` beside `request` (Lab-authored): the answer is one line per obligation, `O1: <its claim on one line>`, which gives the ids an operation's `refObligations` needs without reading every row. It is refused on any other operation and on any other table.

Table rules:

- **Obligations.** One closed claim each: `behavior`, `class`, `boundaries`, `sourceRef`. `origin` defaults to `Requirement`. Since 3.0.3 an obligation carries no elements: the run-4 `design_obligations` capture still shows them, but the 3.0.3 instructions, rendered design and checks dropped them (maintainer decision, 2026-11-09), so `elements` is refused as an unknown property.
- **Decisions.** Options get `D#.1`, `D#.2`, ... in the order sent. Exactly one option is chosen: on `Update`, the option sent with `chosen: true` becomes the only chosen one, every option keeps its id, and a new option without id is appended. `highlight` is honoured on `Add`. `source` is `Requirements`, `Codebase` or `InternalReasoning`, or `BreakingChange` for a decision that records a break the design introduces (a broken contract signature, a broken public API, a changed persisted schema) instead of a provenance; the value name is Lab-authored, from the 3.0.3 instruction and the `breaking-change` the review document renders. A decision carries no link to its operations: an operation cites it in `realizes`, and `realizedIn` is refused as an unknown property. `blocking`, its 3.0.0 name, is still accepted and reads as `highlight` everywhere: the checks, the projections and the document.
- **File references.** One row per symbol. Adding an existing symbol merges into that row; a `details` path missing from `files` is added to `files`. `definitionPath` names the file that defines the symbol and `details[].line` the line of a usage (both from the 3.0.3 instruction and rendered design; the run-4 capture predates them). `scope` is `Production` (what governs the production code, the default for a row added without one) or `Test` (the test infrastructure: the test class to imitate, the base, helpers, builders, fakes); an update that sends no scope keeps the stored one.

## knowledge-references

`#capability:design-knowledge-references` — arguments `sessionId`, `jobId`, `request`:

```json
{ "operation": "Add | Read | Update | Delete",
  "references": [ { "kid": 1, "fId": 4, "range": { "s": 3, "e": 9 }, "scope": "Production | Test" } ] }
```

A knowledge reference is one prescription of a knowledge document the design applies: the document's file id `fId` in the current catalogue and the inclusive line range `s`–`e` of the lines that carry it, as the knowledge read numbers them (contracts/knowledge-catalog.md, read). The caller assigns the `kid`, a distinct positive integer. For `Add` and `Update`, `references` carries the rows; for `Read` and `Delete`, it carries the kids (empty = all).

Every write answers the captured shape:

```json
{"added":0,"updated":0,"deleted":0,"unlinkedOperations":[],"errors":[]}
```

| Operation | Effect |
| --- | --- |
| `Add` | registers each row; an empty `references` registers nothing and is still a valid call (a read with no applicable prescription) |
| `Read` | the kids select the references; empty reads all. Answers `{"references": [ ... ], "errors": []}`, each with its resolved `text` and `resolutionNote` |
| `Update` | each row names its `kid`; only the fields sent change, the stored scope included |
| `Delete` | removes the kids; empty removes all. An operation that declared a removed kid loses it and is listed in `unlinkedOperations` |

- A row that cannot be applied is reported in `errors` as `<operation>: kid <n> ...` and the other rows of the call still apply: a duplicate `kid` on `Add`, an unknown `kid` on `Update`, `Delete` or `Read`, a `fId` not in the current index (`has an unresolvable file id`), or a range outside the document (`has an unresolvable range: The requested range 282-287 is outside the knowledge file, which has 286 line(s).`, as captured).
- The runtime stores the document path beside the `fId` (`filePath`, relative to the knowledge root), so the text still resolves after a rebuild renumbers the file ids. The text is never stored: it is resolved from the document when an operation is served, when the references are read and when the document is rendered. A document that no longer exists, or a range past its end, resolves to no text and a `resolutionNote` that says why.
- `scope` defaults to `Production` on `Add`.

The request, the write response and the range error follow the 3.0.1 capture. Lab-authored: the `Read` answer, the wording of the other errors, what `unlinkedOperations` lists (the capture shows it only empty), `filePath` relative to the knowledge root and the resolution at read time.

## overview

`#capability:design-overview` — arguments `sessionId`, `jobId`, `request: { currentState, gaps }` (or `{ "operation": "Read" }`). Written after the operations, as their final synthesis: the current state of the components involved and the gaps the design closes.

Response: `{"status": "Draft", "currentState": true, "gaps": true}`. Since 3.0.3 the gaps carry no `{{O#.k}}` anchors and the write runs no check; the run-4 `design_overview` capture still describes the anchors and was not re-captured (recorded 2026-11-09).

## section-writes

`#capability:design-contracts`, `#capability:design-file-system`, `#capability:design-operations` — arguments `sessionId`, `jobId`, `request`. Each writes its own section of the design, in this order: the contracts and public APIs, then the filesystem, then the operations.

```json
{ "header": { "title": "...", "generator": "orchestrator" },
  "add":    { "contracts": [], "apis": [] },
  "patch":  { "contracts": [], "apis": [] },
  "delete": { "contracts": [1], "apis": [] } }
```

| Operation | Tables of `add`, `patch`, `delete` | Also |
| --- | --- | --- |
| `#capability:design-contracts` | `contracts` (`CT#`), `apis` (`API#`) | `header` |
| `#capability:design-file-system` | `files` (`FS#`) | `header` |
| `#capability:design-operations` | `operations` (`IM#`) | `header`, `order` |

A contract row: `{ "id": 1, "type": "Interface | Abstract | Record", "module", "file", "signature", "promises", "premortem": [ { "what", "mitigation" } ] }` — `file` is the repository-relative path that hosts it, and the filesystem must declare it. An API row: `{ "id": 1, "method", "path", "purpose", "auth", "request", "responses": [ { "status", "description", "body" } ] }`. A file row: `{ "id": 1, "path", "status": "Added | Modified | Deleted", "module", "reason", "change", "impact" }`, with `path` repository-relative, never absolute.

An operation row:

```json
{ "id": 1, "operation": "...", "kind": "Production", "instructions": "...", "files": ["src/..."], "dependsOn": [1],
  "realizes": ["D1"], "refObligations": [1], "refContracts": [1], "refApis": [1],
  "knowledgeReferences": [1], "fileReferences": ["FR1"],
  "referencesExemption": { "knowledge": "why no prescription applies", "file": "why no symbol is needed" },
  "source": "Knowledge", "sourceRef": "...", "hasDestructiveSideEffects": false, "testType": "Unit",
  "branches": [ { "question": "...", "yes": { "label": "...", "note": "..." }, "no": { "label": "...", "note": "..." }, "why": "..." } ],
  "negatives": [ { "cause": "...", "behavior": "...", "impact": "High" } ],
  "exceptions": [ { "trigger": "...", "recovery": "..." } ] }
```

- `kind`: `Production` writes the production code; `Documentation` writes documentation; `Testing` writes and runs the tests, and fixes the production code when a test reveals a real defect in it.
- `testType` (`Unit`, `Integration`, `E2E`, `Harness`) is declared by a `Testing` operation and by no other.
- `instructions` are complete: an implementor starting from an empty context executes the operation from them alone.
- Ids are cardinal (`1, 2, 3`); the runtime prefixes them by table. Cross references of an operation are cardinal: `dependsOn` → `IM#`, `refObligations` → `O#`, `refContracts` → `CT#`, `refApis` → `API#`. `realizes` carries `D#` ids and `fileReferences` `FR#` ids (a bare number is read as `FR#`). `knowledgeReferences` lists kids, stored as sent.
- Every operation sets `knowledgeReferences` and `fileReferences` to the ids it needs, or the matching `referencesExemption.knowledge` / `referencesExemption.file` to the reason that dimension needs none.
- `hasDestructiveSideEffects: true` keeps the operation out of the automatic batches: it is served only on the developer's selection.
- `order` (operations only) lists the cardinal operation ids in execution order after the call: a permutation of every operation that exists once the call's deletions and additions apply. Without `order`, added rows go before the first stored row with a higher id, so parallel calls with disjoint ranges build the same plan whichever arrives first; stored rows are reordered only by `order`.
- `add` appends rows whose ids are new; `patch` updates existing rows field by field; `delete` removes rows. One call may combine them, and non-empty `header` fields are applied.
- `instructionsPatch` (operations, `patch` only; captured on 3.0.4) is an ordered list of `{ oldText, newText }` exact edits of the stored `instructions`, applied in order instead of sending the whole text. Lab-authored, the capture leaves them unspecified: it is rejected on an added row and beside `instructions`, and each `oldText` must occur exactly once in the text the earlier edits left.

**All or nothing.** A call that names a table of another section is rejected with `rejected here — <table> belong to <operation>`, as captured. A row the schema refuses (the captured case: a `premortem` entry with a property other than `what` and `mitigation`), an `add` of an id that exists, a `patch` or `delete` of one that does not, an operation naming a kid no knowledge reference registers or a decision that does not exist, and an `order` that is not a permutation are rejected too. Any rejection rejects the whole call: nothing is applied, every rejection is listed and the exit code is 1. A rejected call of some size is kept, so it is corrected and not sent again (kept-requests).

**Read.** Lab-authored: upstream gives the section writes no `Read`, and agents ask for one after the row writes, which have it. `request: { "operation": "Read", "ids": [1, "CT2"] }` answers the rows of the command's own section as `#capability:design-snapshot` shows them (contracts/projections.md): every row without `ids`, and with a cardinal id the row of each of its tables. A `Read` takes `ids` only.

**No checks.** A section write runs no mechanical check, as captured: call `#capability:design-checks` after the writes. The completeness gate is the approval (`#capability:design-approve`).

Response, as captured: `{"status": "Draft", "applied": {"added": [], "patched": [], "deleted": []}, "rejected": [ { "path": "add.contracts[0]", "message": "..." } ]}`, written as lined JSON.

Lab-authored: the rejection of rows other than the captured premortem case and of a misplaced table, the wording of every message, the exit code, and the placement of added rows. Design calls take a lock shared between runtime processes (`<runtime root>/.design-lock`, broken after 120 seconds when a process died holding it), so parallel calls run one after the other and none loses rows.

No design write returns the document path: the rendered document is located only with `#capability:design-document` (see contracts/projections.md).

## approval

`#capability:design-approve` — arguments `sessionId`, `jobId`, `request: { planName, description }`. Called only after the developer approves the design.

- `planName` must match `^[A-Za-z0-9_]{1,100}$`.
- Approval is refused while `#capability:design-checks` reports any error; warnings do not block it.
- On success: `status` becomes `Approved`, `approvedAt` and `planName` are recorded. Response: `Design approved (<YYYY-MM-DD HH:MM:SS>Z).`

The approval is permanent. A later write (a modification requested at the terminal hand-off, a design-gap repair during implementation) keeps `Approved`, sets `modifiedAfterApproval: true` and is recorded in `history`; the document shows `Approved, modified after approval`. Implementation progress — an operation status, a served or closed operation, an iteration — is recorded in `history` but is not a modification and never sets `modifiedAfterApproval` (Lab-authored).

## operation-status

`#capability:design-operation-status` — arguments `sessionId`, `jobId`, `request: { ids: ["IM1"], status: "InProgress | Completed" }`.

All-or-nothing: if any id is unknown, no flag changes. `Completed` is set only after the orchestrator's review of the work unit passes. Response: the JSON array of updated ids.

The flag of an operation moves `null` (not started) → `InProgress` (served by `#capability:design-implementation-operation`) → `Implemented` (closed by `#capability:design-implementation-operation-close`, not reviewed yet) → `Completed` (reviewed). `Implemented` is set only by the close.

## iterations

`#capability:design-iteration-open` — arguments `sessionId`, `jobId`, `request: { workspacePath, request }`. `workspacePath` (also accepted as `WorkspacePath`) defaults to the workspace root. Refused while another iteration is open.

Snapshot the workspace: every file `git ls-files -co --exclude-standard` lists (a plain walk that skips `.git`, `node_modules`, `bin`, `obj` and `dist` outside git), with its content hash, excluding the runtime root. A symlink is recorded by the hash of its target path, as git stores it, and never followed, so re-pointing a link is a modification and a link to a directory is not read; an entry that is neither a file nor a symlink (a submodule) is left out. The walk outside git does not descend into symlinked directories. Response: `{"iterationId": "IT1", "createdAt": "..."}`.

`#capability:design-iteration-close` — arguments `sessionId`, `jobId`, `request: { iterationId, verifications: [ { kind, name, outcome } ], blocks: [], notes }`. The request carries no file list: the runtime computes it as the delta between the opening snapshot and the workspace now (`Added`, `Modified`, `Deleted`). Closing a closed iteration is refused and changes nothing. Response: `{"iterationId": "IT1", "closedAt": "..."}`.

## implementation-loop

The DESIGN Implementation step realizes the approved plan one operation at a time. The orchestrator never hands the operations to the implementor: the implementor asks the runtime for them.

**Batches.** Every operation belongs to one batch, from its `kind` and its destructive flag: `Production` operations form the production batch and `Documentation` operations the documentation batch; a `Testing` operation (the test batch) and any operation with `hasDestructiveSideEffects` are served only on the developer's selection. The plan is served in the order the agent declared it, and `dependsOn` is the only precedence constraint: an operation is servable only when every operation it `dependsOn` is `Implemented` or `Completed`. The batches, their order and the selection rule come from the 3.0.3 Implementation instruction. Lab-authored: a design stored before 3.0.3 keeps its kinds, and `Code` joins the production batch, `NotCode` the documentation batch, while `Build`, `Commands` and any unknown kind wait for a selection.

`#capability:design-implementation-operation` — arguments `sessionId`, `jobId`, optional `operationId` (`IM#`) and `part`. Answers one of:

- **The operation to implement now**, in markdown, with the whole context the implementor needs, already expanded: `# Operation IM# — <title>`, its kind (with its `testType`), batch and authorisation, `dependsOn`, files, the obligations it implements and the decisions it realizes; then `## Instructions`, `## Kind rules`, `## Failure arms`, `## Overview`, `## Obligations` (the rows it implements), `## Decisions` (topic, chosen answer and downstream use of each decision it realizes), `## Contracts` and `## Public APIs` (the ones it realizes), `## Filesystem` (the rows of its files), `## Knowledge references` (the resolved text of every kid it declares, with the document path, the range and the scope) and `## File references` (each symbol it consumes with its definition path and its usage files, lines, why and purpose). A dimension with no reference shows the operation's exemption reason. Serving sets the flag to `InProgress` and records the operation as the served one. A long operation arrives in parts (`contracts/workflow-loop.md`, Parts) that start at a heading; reading a later part never advances the plan.
- **`batch-complete: ...`** — without `operationId`, the production and documentation batches have no servable operation but operations remain open; with `operationId`, the selected operation is already `Implemented` or `Completed`, so the delegation's work is done. A closed operation is never reopened.
- **`complete: ...`** — every operation is `Implemented` or `Completed`.

Without `operationId` the runtime serves the first servable operation of the production batch, in plan order, and then of the documentation batch. With `operationId` it serves that operation on the developer's selection, whatever its batch, and refuses it when it does not exist or depends on an operation that is not done. While an operation is served and not closed, every call answers that same operation again (and refuses a different `operationId`): one operation at a time. The answer never lists, counts or names the operations that follow, nor any contract, file, decision or reference the operation does not declare.

`#capability:design-implementation-operation-close` — arguments `sessionId`, `jobId`. Closes the served operation: its flag becomes `Implemented` and the next operation becomes reachable. Refused when no operation is served, and when a part of the served operation was never served, since the operation's whole text is its specification. Response: `IM# closed as Implemented. ...`.

Lab-authored: upstream has no capture of either tool. The answer formats, the terminator texts, the `## Kind rules` texts (the instruction says the answer carries "its kind rules" without stating them; they restate the rules the 3.0.3 steps and the implementor role give each kind), the served-operation record, the re-serve of an unclosed operation and the refusals are chosen here; the batches, the terminators `batch-complete` and `complete`, the expanded context and the masked future come from the 3.0.3 Implementation instruction.
