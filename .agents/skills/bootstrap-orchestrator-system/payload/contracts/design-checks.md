# Design checks

Lab-authored contract, derived from the captured `get_design_checks` responses, the rules the 3.0.3 `design_contracts`, `design_fileSystem` and `design_operations` captures say `get_design_checks` enforces, and the rules stated by the DESIGN instructions. The runtime implements it in `runtime/lib/checks.mjs`; without the runtime, apply each rule by hand to `design.json`.

The checks are facts about the artifact: references that resolve, realized obligations, contracts, APIs and decisions, an executable plan. They never judge whether the design realizes R — that is the orchestrator's adversarial review.

`#capability:design-checks` — arguments `sessionId`, `jobId`. Response, as captured on 3.0.3:

```json
{ "errors": [ { "rule": "<slug>", "element": "<id>", "detail": "<text>" } ],
  "warnings": [ ... ],
  "coverage": { "obligationsTotal": 0, "obligationsRealized": 0 } }
```

Findings that differ only in the element they name are one row, whose `element` lists them all (`O1, O2`) and whose `detail` says `<element>` in their place (Lab-authored: a design written in several calls otherwise answers one row for every item not realized yet). The same applies to the findings of `#capability:design-approve`.

The section writes run no check: call `#capability:design-checks` after them. The design can be presented for approval only when `errors` is empty. Warnings never block approval. The answer is lined JSON, and a long one is served from a stored copy (`contracts/workflow-loop.md`, Stored responses).

## Errors

| Rule | Reported when |
| --- | --- |
| `operation-reference-unknown` | an operation's `refObligations`, `refContracts`, `refApis`, `fileReferences` or `knowledgeReferences` names a row that does not exist |
| `operation-source-without-ref` | an operation sets a `source` other than `Design` without a `sourceRef` |
| `operation-dependency-unknown` | `dependsOn` names an operation that does not exist |
| `operation-dependency-order` | `dependsOn` names the operation itself or one scheduled after it |
| `obligation-not-realized` | operations exist and no operation lists an obligation in `refObligations` |
| `contract-not-realized` | operations exist and no operation lists a contract in `refContracts` |
| `api-not-realized` | operations exist and no operation lists a public API in `refApis` |
| `contract-file-undeclared` | the filesystem has rows and a contract is hosted in a `file` none of them declares |
| `decision-chosen-count` | a decision does not have exactly one chosen option |
| `decision-realized-unknown` | an operation's `realizes` names a decision that does not exist (a decision deleted after the plan cited it) |
| `decision-not-realized` | operations exist and no operation cites a decision that is not highlighted in `realizes` |
| `file-without-operation` | operations exist and a filesystem row's path is listed by no operation |
| `testing-operation-without-type` | a `Testing` operation declares no `testType` |
| `testing-operations` | two `Testing` operations declare the same `testType`; reported on the second |
| `operation-test-type-misplaced` | an operation of another kind declares a `testType` |

`decision-not-realized`, `file-without-operation`, `file-reference-without-detail` and `operation-without-obligations` are captured slugs. The 3.0.3 captures state the realization of contracts and APIs and the declared contract file as `get_design_checks` rules without showing their slugs; those slugs, and the slugs of the other rules the instructions state, are Lab-authored.

A highlighted decision (`highlight: true`, or the 3.0.0 `blocking: true`) is exempt from `decision-not-realized`. Before any operation exists, the realization rules and `file-without-operation` do not apply; before any filesystem row exists, `contract-file-undeclared` does not apply (Lab-authored: the 3.0.3 steps write the contracts, then the filesystem, then the operations, and a check that fires on a section not written yet tells the author nothing).

Rules the 3.0.3 captures still list that the runtime cannot apply: an operation carrying a guard, an effect or a state semantics must declare `negatives` or `exceptions` — without obligation elements the artifact no longer says which operation carries one, so the rule stays an instruction the orchestrator's review applies. `build-operation-not-last-authoring` was reported by an earlier build and 3.0.3 has no `Build` kind.

## Warnings

| Rule | Reported when |
| --- | --- |
| `file-reference-without-detail` | a file of a file reference has no `details` entry with both `why` and `purpose` |
| `operation-without-obligations` | a `Production` operation declares no `refObligations`; detail `the operation writes code but realizes no obligation of R` (captured on 3.0.4; the capture shows it on a `Production` operation and on no `Documentation` one, so the limit to `Production` is Lab-authored) |
| `operation-references-undeclared` | an operation declares no `knowledgeReferences` and no `referencesExemption.knowledge`, or no `fileReferences` and no `referencesExemption.file` (Lab-authored: the 3.0.3 instructions require the references or the reason; no capture shows a finding for it, so it does not block approval) |

## Coverage

An obligation is realized when at least one operation lists it in `refObligations`. Since 3.0.3 there are no elements and no element counters.

## Out-of-band edits

Every design operation refuses with `design-out-of-band-edit` when `design.json` no longer matches the hash of the last runtime write. Revert the manual edit, or review it and run `#capability:design-checks` with `acceptExternalEdit: "true"` to re-seal the file.
