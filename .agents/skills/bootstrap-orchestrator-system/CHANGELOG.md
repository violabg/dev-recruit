# Changelog

Versions follow semantic versioning. The installer reads the first version heading as the kit version it records in the target's manifest.

## 7.0.1

- **Copilot part size.** GitHub Copilot answers now come in parts of up to 18,000 bytes instead of 7,000. Copilot CLI 1.0.105 and 1.0.110 show shell results of about 20 KB whole; only the 1.0.103 pre-release builds cut them at 8 KB. A long instruction or design section takes about half the calls. Re-render a target to apply it.
- **Review step reads.** In `DESIGN` step 8, the read before each correction covers only the rows that correction touches (`design-snapshot` with `ids`, plus `fields` or `grep`). The whole design is still read cold before the adversarial analysis, and the checks, the verifier and the approval gate are unchanged.

## 7.0.0

The workflows follow upstream 3.0.4. Every workflow lost its first step and was renumbered, the user instruction register is gone and a role was added, so this is a major version. Re-installing keeps the answers, the sessions and the designs.

- **Finish running jobs first.** A job keeps the list of instructions it was created with, and those files are replaced. A job started before this version cannot be continued: finish it before upgrading, or start a new job afterwards. A new DESIGN job can still be started on an existing design.
- **No User Instruction Space.** The step that recorded the particular requests of the first prompt is removed from all three workflows, and no register is appended to the later instructions. `DESIGN` has ten steps and its review is step 8; `FAST_IMPLEMENTATION` has four; `DOCUMENTATION` has seven. Each starts with its own intake.
- **New role: `explorer`.** A read-only delegate that locates symbols, strings, files, usages and callers. In `DESIGN` (decisions, contracts, filesystem, operations) and in `FAST_IMPLEMENTATION` the orchestrator no longer searches the codebase itself: it splits what it needs into small scopes and starts one explorer per scope, all in one batch, each with a budget of 8 tool calls. The role contract is in Italian, as upstream ships it.
- **Delegates of the orchestrator.** Its contract now names `explorer`, `code-implementor` and the general-purpose agent. On OpenCode, which enforces that list, the `DOCUMENTATION` review step cannot start `documentation-reviewer`; the other clients take the list as an instruction. This follows upstream and is reported there.
- **`FAST_IMPLEMENTATION` registers its knowledge.** After every knowledge read it registers the applicable prescriptions with `design-knowledge-references`, kept in a job design with no approval gate. Before the implementation step ends, a knowledge compliance gate reads them back and checks the code against each one.
- **`codebase-clusters` takes `matches`:** a list of terms. The clusters with a file whose path carries a term come first, marked `[match: <n>] <terms>`.
- **`design-operations` takes `instructionsPatch`** on a patched operation: an ordered list of `{ oldText, newText }` exact edits of the stored instructions. Each `oldText` must occur once.
- **New check warning `operation-without-obligations`:** a `Production` operation that realizes no obligation. Warnings do not block approval.
- **Review document.** Returning to a section, with the browser's Back too, reopens it where you left it, and an address that names nothing opens the first section.
- **Implementor prompt.** It lists every session artifact, not only images, and the work-unit loop is stated as a short protocol.
- The last three `DESIGN` steps and the last `FAST_IMPLEMENTATION` step end with rules for disagreeing with the developer: judge claims on evidence, do not repeat a failed approach, ask at most one question.

## 6.2.1

A patch: wording and compatible fixes from a kit report, with the workflows still on upstream 3.0.3. Re-installing keeps the answers and sessions.

- **Artifact names.** `session-artifact-write` drops a trailing `.md` from `name` before it stores the artifact, and returns the name it stored. Before, `work_item_1.md` was stored as `work_item_1.md.md` and could not be read back as `work_item_1`. An artifact already stored under a doubled `.md` is still read by the name the old answer gave.
- **Work item intake.** The intake subagent of the user-story and bug planning skills names its artifact `work_item_<work item id>`, loads no role contract and no knowledge, and writes the artifact once without reading it back.
- **Step 1.** A work item id or other requirement source, and the name of the session, are not particular requests, so a first prompt that holds only those leaves the user instruction register empty.

## 6.2.0

The workflows still follow upstream 3.0.3. A repository with several clients no longer runs all of them at the smallest answer size, so this is a minor version. Re-installing keeps the answers and sessions.

- **A part limit per client.** When the selected clients show different amounts of a command's output, `config.json` records the larger ones in `partLimits` and the role files of those clients pass `--client <id>`. Before, every client ran at the smallest limit: with a 7,000-byte client installed, the nine instructions of a DESIGN job up to the review took 28 calls on every client instead of 11. A repository with one client, or with clients of the same limit, renders as before.
- **After a compaction or a resume.** The router tells an agent whose context was compacted, or whose session was resumed in the middle of a job, to read its role file again, get the active instruction with `workflow-step-pending` and read again the knowledge the design cites.
- **Argument help.** The `name` of `session-artifact-write` states its allowed characters, and `edit` says the id is given as the design shows it, such as `CT1`.
- **Client guide.** Each client's guide says to start the role or the planning skill directly, and to run without tool servers the roles do not use.

## 6.1.0

The workflows still follow upstream 3.0.3. The runtime gains edits in place and kept requests, so this is a minor version. Re-installing keeps the answers and sessions.

- **Edit in place.** The design writes (`design-obligations`, `design-decisions`, `design-file-references`, `design-overview`, `design-contracts`, `design-file-system` and `design-operations`) take `edit`: a list of `{ id, field, from, to }` that changes text inside one field.
- **Kept requests.** A refused design write of 600 bytes or more is kept for 24 hours. The next call sends only the correction (`draft`, `set`, `drop`, `move` or `replace`), and the kept request with the correction is applied as one whole request. Refused JSON text is kept as well, so `replace` repairs it without typing it again.
- **Design snapshot filters.** `design-snapshot` takes `fields`, `brief` and `grep` to read only some fields, the start of each row, or the rows that contain some text.
- **Command definitions.** The first instruction that names a design write in a job is followed by that command's arguments and request fields, so the agent does not probe `--help` first.
- **Parts.** A long runtime answer is split by the client's limit, and every continuation names the client. A unit longer than the limit starts in the part that holds its lead-in.
- **Argument help.** The runtime's `--help` and the role contracts list the arguments each command takes; accepted alternative spellings are no longer listed.

## 6.0.0

The workflows follow upstream 3.0.3. Runtime commands were removed and renamed and both code workflows changed shape, so this is a major version. Re-installing keeps the answers and sessions; a design written by 5.x stays readable and servable.

- **DESIGN has eleven steps.** Obligations, knowledge, decisions, then the contracts, the filesystem and the operations in steps of their own. Step 9 is the orchestrator's adversarial review of its own design, ending at your approval; no verifier subagent is started. Step 10 hands the operations to the code implementor and reviews every work unit; step 11 is the wrap-up.
- **FAST_IMPLEMENTATION has five steps** and no design: the orchestrator gathers the knowledge and implements the change itself, with its build and tests.
- **Design writes.** `design-contracts`, `design-file-system` and `design-operations` replace `design-submit`. Each writes its own section, a call is all or nothing, and none runs the checks: call `design-checks` after them. `design-operations` takes `order` to reorder the plan.
- **Removed:** `design-submit`, `design-open-points`, `design-implementation-context` and `session-execution-report-read`. Obligations no longer have elements, and overview gaps carry no `{{O#.k}}` anchors.
- **Operations** are `Production`, `Documentation` or `Testing`. They name the contracts, APIs and file references they use, or the reason they need none, and can be marked destructive. Files can be `Deleted`. A decision can record a breaking change.
- **Implementation loop:** the production batch, then the documentation batch; Testing and destructive operations only on your selection. Each served operation carries its overview, obligations, decisions, contracts, APIs, files, knowledge text and file references.
- **Checks:** every contract and API must be realized by an operation, and a contract's file must be in the filesystem. The element, placeholder and Build rules are gone.
- **Review document:** deleted files, a breaking-changes group, per-operation references and exemptions, and the operations that realize each contract and API.
- The code implementor can search the codebase (Grep and Glob in Claude Code).

## 5.1.0

Cheaper design runs, from an audit of real sessions. A target re-installed from this version keeps its answers and sessions.

- **Shorter check answers.** Findings that differ only in the element they name are now one row, whose `element` lists them all and whose `detail` says `<element>`. On a 60-obligation design a partial `design-submit` answered 4 KB instead of 24 KB. No finding is lost.
- **Index first.** `design-snapshot` with no selection on a design too long for one answer returns an index: status, each section's rows, ids and size, the coverage, and the calls that read more. `--part 1` reads the whole design as before.
- **Add rows.** `--help` says an Add row omits its `id`, on all four row tables.
- **The instruction register.** Step 1 registers only the developer's own words, not the text of the skill that started the workflow.
- **Work item skills.** `plan-user-story-from-id` and `plan-bug-from-id` pass their bindings to the delegate that gathers the item.
- **Waiting for a delegate.** The delegate binding says a report comes back on its own, so never sleep, poll or list agents while waiting.

## 5.0.0

Only `knowledge-builder` changes knowledge. This changes what a target may do, so it is a major version; the answers do not change.

- Every new job records a hash of the knowledge folder, in all three workflows. `workflow-step-next` refuses without advancing when a file changed outside `knowledge-create` and `knowledge-update`. A developer's hand edit, or a merge that changes knowledge during a job, is refused too: restore it, or apply it through `knowledge-builder`. Jobs that already exist are not checked.
- `knowledge-create` and `knowledge-update` refuse every other named role. `ask` no longer holds them.
- Claude Code gets a project `permissions.deny` rule on the knowledge folder, which also applies to a developer's other Claude Code sessions in that repository. OpenCode roles get an `edit` deny. Other clients get no path deny, and the installer warns about it.
- On FAST_IMPLEMENTATION, `design-implementation-context` also serves the obligations and open points, so the implementor can read its specification after `design-snapshot` is refused.
- A target that kept a local patch for the knowledge check drops it on upgrade. The patch's writes in the cache are not read: finish or restart a job that ran across `knowledge-builder` writes.

## 4.2.2

- The call the runtime prints for a later part now runs as printed: it names `--sessionId`, `--jobId` and the caller's `--role`. Following the old form was refused with `'sessionId' is required`.
- The orchestrator's delegate binding states the resume position on clients that left it out (Codex, OpenCode): their documentation names no way to resume a delegate by id, so the step's arm for a host without resume applies.

Nothing else changes for a target. A target re-installed from this version keeps its answers and sessions.

## 4.2.1

The installation guide and the closing recommendations name `improve-orchestrator-system`. Nothing else changes for a target.

## 4.2.0

Agents can retrieve what they need, from a comparison with real upstream sessions and a second test on two clients. A target re-installed from this version keeps its answers and sessions.

- **Field definitions.** `--help` on a design command prints every field of `request` and of its rows, with its type, allowed values and description. A rejected field names the fields allowed there.
- **One item of the design.** `design-snapshot` takes optional `section` and `ids`, so an agent can read `IM3` or the operations without reading every part.
- **Unused knowledge.** The verification view lists the knowledge references the design registered and no operation cites. A verifier may now fail a design it would have passed.
- **A smaller session store.** New designs and sessions no longer write `snapshot.md`, `verification-view.md` or `execution-report.json`: nothing read them, and the runtime builds its answers on each call. Files already in a session are left in place, and nothing reads them.
- **Clearer answers.** The argument list says what `outline`, `section` and `ids` do, the usage line names inline JSON, a client tool asked of the runtime is answered as one, and the verification view is a little smaller.

## 4.1.0

Runtime and role-file fixes from a parallel test of the system on two clients. A target re-installed from this version keeps its answers and sessions.

- **No answer is too long.** Every runtime response now stays within `partLimit`. Long row reads, `design-submit` results, refusals and artifact reads arrive in parts, and asking for a later part with `--responseId` never runs the operation again. A copy stays in `<sessions root>/.cache/responses/` for a day.
- **Smaller answers.** Structured answers have one row per line, and `design-obligations` `Read` takes `outline: true` for the element ids alone. A row `Read` now answers a JSON array instead of `{ "rows": [...] }`.
- **Fewer turns.** Part 1 and the role bindings ask for the remaining parts in one parallel turn where the client allows it. The role bindings list each command's arguments, so agents need not probe with `--help`; `--help` alone also lists them all.
- **Payloads.** `--json` also takes one inline JSON object, and a wrong form gets a usage error. The role guard allows one quoted heredoc payload, the form the bindings recommend; chaining, pipes and redirects stay blocked.
- **Grounding.** A verifier's or implementor's own knowledge read no longer counts as read during the design, and parallel reads lose no record.

## 4.0.0

Hidden system folders become visible, workflow skills move to one shared folder, and a role can only run its own runtime commands. An existing installation must migrate, and with more than one client it must settle a new question.

- **Visible folders.** The defaults are `agentic-system/` and `agentic-system-maintenance/`, and the repository sessions folder is `agentic-system-sessions/`. The installer refuses a hidden one. `install.mjs migrate` moves an existing installation in three checked steps; see the Maintainer's `contracts/upgrade.md`.
- **Shared skills folder.** Each workflow skill has one body, in the folder recorded in the new `skillSharing` answer. Other clients reach it through a symlink or an approved copy. `install.mjs skills-folder` ranks the candidates. Client differences are written out per client inside the body.
- **Installer safety.** It never writes through a symlink, and it reports a skill copy outside the shared folder. `check` and `verify.mjs` fail on such a copy or on a hidden system folder.
- **Tooling exclusions.** Bootstrap may now add the exact exclusions the user approved to application tooling, for the visible folders only.
- **Role limits.** Roles pass `--role`, and the runtime refuses a command outside the role. Claude Code subagents add a hook, and OpenCode denies other commands per command.
- **Long answers.** The runtime config sets the part size from the selected clients, 7,000 bytes with Copilot. Copilot CLI replaces output of about 8 KB with a file path, which a verifier cannot read, and that blocked design verification. A long implementation operation now arrives in parts too, and cannot be closed until all of them were served.
- **Runtime fixes.** Knowledge counts as read only when its last part was served. The verification view shows every operation, contract, file, API and decision attribute, so it is larger. Unknown arguments are refused. `part: all` is gone. A later part of an older design revision is refused.
- **Payloads on stdin.** The role bindings prefer `--json -` with a heredoc, which saves a separate file write.

## 3.0.1

The review document is easier to read. Its data, sections and links are unchanged, so a target needs no other change.

- **Header.** It is 58px tall from 1081px wide up, and two rows below that. The metadata stays on one line and truncates, with the full text in a tooltip. `Design` moves from the title into that line.
- **Reading column.** The column stops at 54rem and running text at about 80 characters per line.
- **IDs.** They are set in the sans font, so `O1.1` no longer reads as `01.1`.
- **Contrast and size.** The faintest text now meets AA contrast, and small labels and counts are larger.
- **Quieter details.** Inline code has no border, the current step of the reading path is filled, and the approval stamp is straight.

## 3.0.0

The canonical system follows a newer upstream 3.0.1 build. Operation kinds and design requests change, so a target re-installed from this version must re-read its workflows.

- **Operation kinds.** The kinds are now `Code`, `NotCode`, `Commands`, `Testing` and `Build`. `Wiring`, `Documentation`, `Changelog`, `Generator`, `Migration`, `Procedure`, `UnitTest`, `IntegrationTest` and `Verification` are gone.
- **Weights are metadata.**
  - The classes are `authoring`, `commands`, `testing` and `build`.
  - The plan is served in the order it was declared, and `dependsOn` is the only precedence constraint.
  - The automatic batch is `Code`, `NotCode` and `Build`; `Commands` and `Testing` need the developer's authorisation.
- **One Build operation.**
  - A plan declares exactly one, after every `Code` and `NotCode` operation and before every `Commands` and `Testing` operation.
  - The implementor no longer builds at the end of a work unit, and its compiler recovery policy is removed.
- **Testing operations.** A plan declares at most one per `testType` (`Unit`, `Integration`, `E2E`, `Harness`). New checks replace `unit-test-operations`.
- **Decisions are linked from the operations.**
  - An operation cites the decisions it realizes in `realizes`, and a row naming an unknown decision is rejected.
  - `realizedIn` is refused.
- **`design-submit`.**
  - `intros` is removed.
  - A submission may be split across partial calls with disjoint id ranges, including parallel ones. Design calls now run one at a time across runtime processes.
- **`design-schema` is removed.** Read the shape from `design-submit --help` and the walkthrough instruction.
- **No exploration budget.** `bash`, `grep` and `glob` have no numeric cap. An exploration still starts with the clusters, and searches stay scoped to a subtree a cluster named.
- **`design-implementation-context`.** File references list `why` and `purpose` per file, contracts omit the premortem and evidence, and decisions stop at their topic.
- **Review document.** The layout is unchanged. Operations show their test type, decisions read their realization from `realizes`, and the legend describes the new kinds.
- **Designs already stored in a target are not migrated.**
  - A draft must cite its decisions in `realizes` and add a `Build` operation before it can be approved.
  - Operations with an old kind leave the automatic batch and need the developer's authorisation.
  - An approved design is not re-checked.

## 2.0.1

- The review document is redesigned. Its sections, its data and how the runtime renders it are unchanged; only the page changes.
  - Light is the default theme, with a dark theme that follows the system; the ink is blue-black and references are cyanotype blue.
  - A sticky header carries the design title and id, the obligation count, the generator, the plan name and the approval stamp.
  - Cards, code blocks, the section path, the legend and the file and decision dialogs are restyled, and the page prints every section.

## 2.0.0

The canonical system follows upstream 3.0.1. Several answers and outputs change, so a target re-installed from this version must re-read its workflows.

- **The obligations are the requirement.** No workflow writes or reads the `requirement_R_lock` artifact any more. The design verifier judges the design and its obligations through the verification view, no longer reports unmapped requirement rules, and compares every design section with the knowledge the design is grounded in. `design-submit` no longer needs `header.requirementRef`; it is still accepted.
- **FAST_IMPLEMENTATION serves 8 instructions.**
  - A requirement decomposition step is new at 3/8; knowledge, codebase, implementation, validation and wrap-up move down one.
  - A FAST job now creates a job design that holds its obligations, open points and knowledge references, with no approval gate.
  - The workflow files are renamed: `03-requirement-decomposition` … `08-terminal-handoff`.
- **Knowledge references.**
  - Every knowledge read in a job with a design is followed by `design-knowledge-references`, which registers the applicable prescriptions as `kid`s (file id, line range, scope `Production` or `Test`).
  - `knowledge-read` numbers every line.
  - An operation lists the kids it needs, and the knowledge steps make the prescriptions bind every section of the design.
- **The served implementation loop.**
  - The implementor gets one operation at a time from `design-implementation-operation`, with the text of its knowledge references, and closes each one with `design-implementation-operation-close`.
  - It reads the rest of the design once with `design-implementation-context`.
  - Operations are served by weight class: `authoring`, `external-execution`, `unit-test`, `integration-test`, `verification`. Only `authoring` runs without the developer's authorisation, and the developer may authorise several operations together.
  - The new operation kinds `UnitTest` and `IntegrationTest` are added. A plan with more than one `UnitTest` operation fails the `unit-test-operations` check.
  - Only a work unit that writes production code is verified.
- **Decisions.** `highlight` replaces `blocking`, which is still accepted and read as `highlight`. A contract signature change is always a highlighted decision.
- **Codebase clusters are a partition.** Every file is in exactly one cluster:
  - test infrastructure is in `Tests`;
  - every other file is in a PascalCase domain named after its directory;
  - residual files are in `General`; `Uncategorized` is gone.
  - Names are matched exactly, and an unknown name answers `Cluster name '<name>' not found.`
- **Review document.**
  - The header shows the obligation count and the generator instead of the requirement reference.
  - The document gains a Highlighted decisions group, operation weights and statuses, scope tags, and a Knowledge references section with the resolved text.

## 1.2.3

- Every `#operation:<op>` a role or skill names is bound in its Bindings section to the client's native tool, and the binding says it is never a runtime command. In GitHub Copilot for VS Code the knowledge builder ran `agentic-system.mjs question`, read the refusal as a missing runtime and stopped with "required agentic system runtime operations are not available".
  - `#operation:question` (the role's question tool) binds to `vscode/askQuestions` in GitHub Copilot for VS Code, `AskUserQuestion` in Claude Code and `question` in OpenCode. A client with no listed tool uses its own tool, or asks in the reply.
  - The orchestrator's workflow choice says "using `#operation:question`" in place of "using your question tool", so it is bound like the rest.
  - The runtime binding says `<token>` is a runtime capability name and that an `#operation:<op>` is never a runtime command.
- The runtime refuses a host operation (`question`, `read`, `search`, `write`, `terminal`, `delegate`) by naming it as a host operation. Every unknown command now says the runtime is installed and working, so it is not reported as an outage.
- The availability guard of `ask` and `knowledge-builder` says that only the runtime's own commands count, and that a refused `#operation:` call is not an outage.

## 1.2.2

- One runtime operation per shell command. A verifier that fetched several parts in one loop, or piped a part through `head`, `tail`, `cut` or `dd`, went past what the shell host shows and then sliced the spilled output, so each round judged a different fragment of the design.
  - The footer of a part that continues says to run the next call as a shell command of its own, with nothing chained and no pipe.
  - The repository router and every role's runtime binding say: never join two runtime calls with `;`, `&&` or a loop, and never pipe an answer through `head`, `tail`, `cut`, `sed` or `dd`. This replaces "never cut an answer with `head`, `tail` or a byte count".
- `design-verification-view`: a non-empty `## Knowledge grounding` ends with the `knowledge-read` call, with the listed file ids, that reads it.

## 1.2.1

- A `request` object sent to an operation that takes none (anything except the ten design operations that write or act on the design) is read as top-level arguments, and a top-level value wins. Before, `session-artifact-read`, `knowledge-read` and the other plain operations ignored the fields inside `request`. That meant "'name' is required", "pass one or more file ids", or part 1 served again in place of the requested part.
- `node agentic-system.mjs <token> --help` prints the operation's argument shape (request envelope or top-level) and its definition from the runtime contracts. Before, it failed with "'sessionId' is required".
- `design-schema` has a contract definition in `contracts/design-model.md`.
- The repository router and every role's runtime binding say that operations other than the design writes take top-level arguments, and that `--help` prints them.

## 1.2.0

- Long runtime answers arrive in parts of at most 24,000 characters, below what a shell host shows of one command. This covers `knowledge-read`, `design-snapshot`, `design-verification-view` and the workflow instructions.
  - Each part starts at a whole unit (a knowledge document, a snapshot item, an obligation or operation, a paragraph) and ends with the call that returns the next part.
  - `workflow-step-next` serves part 1, and `workflow-step-pending --part <k>` serves the rest of the same instruction without advancing the workflow.
  - `part: "all"` returns the whole answer.
  - The repository router and every role's runtime binding say to read every part before acting and never to cut an answer by bytes.
- The CLI takes every value after a flag, and a repeated flag adds to it. `--fileIds 6 11`, `--fileIds 6 --fileIds 11` and `--fileIds 6,11` are the same call; before, the repeated form kept only the last id. `--json` takes exactly one value.
- `knowledge-read` records the documents it serves in the session (`knowledge-reads.json`). `design-verification-view` opens with `## Knowledge grounding`: every MustHave document, every document read during the design and every document the design names. The design verifier now reads the knowledge the design was built on, not only what an operation cites.
- `session-artifact-read` also accepts `artifactId` and `artifact` for the artifact name.

## 1.1.3

- The runtime CLI exits only after its output is written. On a pipe it used to stop at the first 64 KB, so a delegate reading a large design view through a shell saw only the first obligations.
- `design-verification-view` no longer repeats an operation under every obligation it carries. Each obligation shows only the text its own `{{O#.k}}` placeholders introduce, by operation name. Failure arms, contracts and files are listed once under `# Operations`, and decisions once under `# Decisions`. A 66-obligation design went from 518 KB to 99 KB with the same content.

## 1.1.2

- `design-overview`, `design-submit` and `design-approve` no longer return the design document path. `design-overview` answers `{"status", "currentState", "gaps"}`, `design-submit` answers `status` first, then `applied`, `rejected`, `errors`, `warnings` and `coverage`, and `design-approve` answers `Design approved (<YYYY-MM-DD HH:MM:SS>Z).`. The document is located only with `design-document`, which is where the workflows already read it.

## 1.1.1

- A design operation called with a request field beside `sessionId` and `jobId` (for example `operation: "Read"` at the top level) is refused with an error that names the field and says it belongs inside `request`. Before, the runtime answered `/operation: required property is missing`, which pointed the caller the wrong way, and a flat `design-overview` Read was taken for an empty write.
- Error paths in rejected design requests are absolute: `/request/operation`, `/request/rows/0/<field>`.
- The runtime binding in each role's skill and the repository router say the JSON payload is the operation's argument object, defined in the runtime contracts, with design fields inside `request`.

## 1.1.0

- The design review document (`design.html`) is redesigned for reading:
  - a sticky title bar with the legend and the theme switch;
  - a numbered reading path that shows one section at a time;
  - each decision, operation and obligation opens with its ID in the margin;
  - anchored instructions split into one row per element;
  - a collapsible file tree;
  - links from every mention of a design ID to its item.
- At the design review, the orchestrator gives the developer a `file://` link that opens the design document in a browser, next to its path.
- Symbolic links in the workspace are recorded as links, not read: the design iteration snapshot and the file listing used for clusters no longer follow a link to a directory, so a skill directory linked by the skills installer is not walked.

## 1.0.0

- First release of the orchestrator system Bootstrap: one orchestrator role with the `DESIGN`, `FAST_IMPLEMENTATION` and `DOCUMENTATION` workflows served by a local Node runtime, four delegates with their own context, and the `ask` and `knowledge-builder` roles.
- A zero-dependency installer renders every file from the bundled payload, the client profiles and an answers file, with `plan`, `apply`, `check` and `show`.
- Client profiles for Claude Code, Codex, GitHub Copilot in VS Code, OpenCode and Cursor; other clients are rendered by hand under the same rules.
- Sessions live where the developer chooses, inside the repository (ignored by git) or outside it.
