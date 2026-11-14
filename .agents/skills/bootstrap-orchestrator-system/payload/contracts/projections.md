# Design projections

Lab-authored contract, derived from the captured `get_design_snapshot`, `get_design_document`, the design verifier's definition and the 3.0.3 implementation step (`design_implementation_operation` has no capture). The runtime implements it in `runtime/lib/projections.mjs` and `runtime/lib/render.mjs`, and rewrites every projection on every design write, so no reader ever sees a stale view.

The served operation, the implementor's only projection since 3.0.3 removed `get_design_implementation_context`, is defined in contracts/design-model.md (implementation-loop).

## snapshot

`#capability:design-snapshot` — arguments `sessionId`, `jobId`. A compact markdown projection of the whole design, one item per line, ids preserved:

```text
# Design snapshot — <designId>
status: Draft | plan: ... | approved: ... | title: ...

## Overview            - current codebase: ... / - gaps: ...
## Obligations         - O1 | requirement | <behavior> | class: ... | boundaries: ... | source: ...
## File references     - FR1 | scope: production | symbol: Type.Member | defined in: <path> | files: <path>:<line> (why: ... | purpose: ...)
## Knowledge references - kid 1 | fId 4 | <knowledge path> | lines 3–9 | scope: test
## Contracts           - CT1 | interface | module: ... | file: ... | promises: ... | signature: ... | premortem: ... | realized by: IM1
## Public APIs         - API1 | POST /path | purpose: ... | auth: ... | request: ... | responses: ... | realized by: IM1
## Filesystem          - FS1 | deleted | <path> | module: ... | reason: ... | change: ... | impact: ...
## Operations          - IM1 | production | batch: production | <operation> | status: ... | dependsOn: ... | files: ... | implements: O1 | contracts: CT1 | apis: API1 | knowledge: kid 1, kid 2 | file references: FR1 | realizes: D1 | instructions: ... | branch/negative/exception arms
                         (a Testing operation adds "| test type: Unit" after its kind, a destructive one "| destructive" after its batch,
                          and an empty dimension with an exemption "| no knowledge: <reason>" or "| no file references: <reason>")
## Decisions           - D1 | requirements | highlight: false | topic: ... | question: ... | context: ... | why: ... | how: ... | realized by: IM1 | options: D1.1 (chosen): ... || D1.2: ...
## History             - IT1 | closed | request: ... | created: ... | closed: ... | files: added <path>; modified <path> | verifications: ... | blocks: ... | notes: ...
## Coverage            - obligations 3/3
```

Optional arguments `section` and `ids` (Lab-authored; the captured tool has neither) answer part of the snapshot, so an agent that needs one thing need not read every part: `section` names one section or a comma-separated list (`Operations`), `ids` names rows by their first field (`IM3,CT1,kid 7`, an array in a JSON payload), and both together select within the section. The rows read exactly as in the whole snapshot, under the same two header lines and their section heading. An id that is missing is listed in a `Not found:` line; a section that does not exist, or a selection that finds no row, refuses and changes nothing. A long whole snapshot says so in the footer of part 1. A section name ignores case, spaces and punctuation (`publicapis`, `Public APIs`), and the table names of the design writes are accepted (`apis`, `files`).

Three more optional arguments read the design for a review without reading every row whole (Lab-authored: one measured run made 54 design reads, 206 KB, to review its own design). They combine with `section` and `ids` and with each other, in this order:

- `fields` keeps, of each row, its id and the fields named, where a field is the label before a colon in the row (`instructions`, `files`, `promises`, `signature`, `change`). A segment with no label belongs to the field before it. Rows with none of the fields are left out; when none is left the call refuses.
- `grep` keeps the rows that contain a text, ignoring case and reading any white space as one space, and answers for each `- <id> | <n> matches | …<80 characters before and after each of the first five>…`. A section with no match is left out, and a search that finds nothing says `No row contains '<text>'.`
- `brief: true` cuts each row to its first 200 characters.

The call for a later part repeats the whole selection. The DESIGN review step names `ids` with `fields` or `grep` for the read before each correction (a declared adaptation, report 2026-11-12).

On a DOCUMENTATION job, which has no design, the snapshot says the job has no design artifact. A long snapshot is served in parts (optional argument `part`, `contracts/workflow-loop.md`, Parts) that start at a section heading or an item.

Lab-authored: a call with no selection and no `part`, on a design too long for one part, answers an index instead of part 1: the two header lines, each section with its row count, first and last id and size, the coverage, and the calls that read the whole design (`--part 1`), one section or a few items. A filled design takes 20 or more parts, and an agent re-read them whole after a resume or compaction. The rows are one call away, and a snapshot that fits is returned unchanged.

`batch` is the operation's batch and `status` its implementation flag (contracts/design-model.md, implementation-loop). A decision stored with the 3.0.0 `blocking` flag shows it as `highlight`.

## verification-view

`#capability:design-verification-view` — arguments `sessionId`, `jobId`, optional `part` and `revision`. The view the design verifier judges. Since 3.0.3 no served step invokes the design verifier (step 9 is the orchestrator's own adversarial review); the role and its view stay, because upstream still ships the role and the orchestrator may still delegate to it.

```text
# Design verification view
## Knowledge grounding    - file_id <n>: <path> (MustHave, read during the design, named by the design)
                          Read every document above before judging: call knowledge-read ... (CLI: --fileIds <ids> --sessionId <id>) ...
## O1                     - claim / class / boundaries / origin
                          - mechanisms:  in "<operation name>" (<kind>): <its instructions>
                          - knowledge grounding: ...
# Operations
## "<operation name>" (<kind>)   - plan position / test type / destructive side effects / depends on / source / knowledge / exemptions
                                 - failure arms / contracts (promises | signature | type) / public APIs / files (path (status): change)
                                 - an operation that addresses no obligation also says so and shows its instructions
# Contracts in no operation      (only when there are some)
# Files in no operation          (only when there are some)
# Knowledge references in no operation  (only when there are some) - <path> lines <s>–<e> (<scope>)
# Public APIs                    (only when there are some)
# Decisions
- <question> → <chosen answer> | realized in: "<operation name>", ... | source: ... | highlight: true|false
```

Under each obligation, every operation that lists it in `refObligations` contributes its instructions. What an operation shares across obligations — failure arms, contracts, public APIs, files — and the chosen answers of the decisions realized in those operations are printed once, joined by the operation name. An operation's contracts are those it lists in `refContracts`, and, for a design written before 3.0.3, those hosted in its files (Lab-authored: upstream has no capture of the shape).

The verifier's conformance comparison reads every section and every operation, so the view presents all of them whether or not they address an obligation: every operation in plan order with its attributes, every contract, public API and file, and every decision with its source and highlight. A sequencing or representation prescription can only be judged against these.

`## Knowledge grounding` lists the knowledge the whole design grounds in, so the verifier reads it: every `MustHave` document, every document `#capability:knowledge-read` served to the design's author in the design's session, never a verifier's own read (`contracts/knowledge-catalog.md`), and every document whose file name (without `.md`, at least six characters) appears anywhere in the design. Each line says which of the three applies; with none, it says `- none`. A list that is not empty ends with the call that reads it: `Read every document above before judging: call knowledge-read with these file ids (CLI: --fileIds <ids>) and follow its parts.` (Lab-authored: verifiers that were only given the list grepped the files or skipped them.) The per-obligation `knowledge grounding` line still names what an operation cites.

Only obligation labels (`O#`) are kept. Operation, decision, contract and file ids are left out, so the verifier judges the content presented and never reconstructs the mapping.

`# Knowledge references in no operation` (Lab-authored; `get_design_verification` has no capture) lists the knowledge references the design registered that no operation names in `knowledgeReferences` or, on a `Knowledge` operation, in `sourceRef`. It states the fact and asks nothing: the verifier reads those documents whole, and only this section says which prescriptions the author registered and then used nowhere.

What each `mechanisms` list does not carry is said once, after the knowledge grounding, rather than under every obligation.

A projection is built from `design.json` on each call, so no copy of it is stored and it can never be stale (Lab-authored; upstream's session folders hold none either).

A long view is served in parts (`contracts/workflow-loop.md`, Parts) that start at a section, an obligation or an operation.

## document

`#capability:design-document` — arguments `sessionId`, `jobId`. Render `design.html` and answer:

```text
Design document (<status>): <absolute path>
```

`<status>` is `Draft`, `Approved`, or `Approved, modified after approval`. Parse the path out of the line.

`design.html` is one self-contained file: `runtime/assets/design-review.html` with the design and its check results inlined as JSON, rendered client-side. The URL fragment names the section or the row shown, so the browser history moves between them and a link opens one; a fragment that names nothing is rewritten to the section shown, and returning to a visited fragment reopens it at the scroll position the reader left (ported from the 3.0.4 upstream rendering). Sections: Overview, Decisions (highlighted first, breaking changes in a group of their own), Implementation plan (each operation with its kind, test type, batch, destructive flag, status, the obligations, contracts, APIs, knowledge references and file references it uses, the reason a dimension has none, and the decisions it realizes), Filesystem (files added, modified and deleted), Contracts (public APIs and internal contracts, each with the operations that realize it), Obligations, File references (with their scope and definition path), Knowledge references (each kid with its scope, file id, range and the text resolved from the knowledge document at render time, or why it cannot be resolved), History, Checks. The sections form a numbered reading path and are shown one at a time; every design ID (`D3`, `D3.1`, `O1`, `IM4`, `FS7`, …) is addressable as `design.html#<ID>`, and any mention of a known ID links to it. It supports light and dark themes, prints every section, and opens from the file system without a server. The layout is the Lab's own (maintainer decision, 2026-10-24); the data follows the 3.0.3 rendering (maintainer decision, 2026-11-09).
