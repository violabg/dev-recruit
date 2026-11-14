# Workflow loop

Lab-authored contract, derived from the captured workflow tools. The runtime implements it in `runtime/lib/workflow.mjs`.

The orchestrator does not know the workflow. The runtime serves it one instruction at a time, and the instruction text names the tools that step may use. The loop is the only clock: the orchestrator never reads the instruction files directly and never sees a future step, so it states every deferred effect as a condition ("when a step asks to interview the developer"), never as "at step N".

## workflow-types

`workflow-types-list` — no arguments. Read `agentic-system/workflows/workflow-types.yaml` and answer:

```text
Available workflow types:
- DESIGN: Design. Design complex requirements with a human in the middle decision judgement.
- DOCUMENTATION: ...
- FAST_IMPLEMENTATION: ...
```

The developer always chooses the workflow type explicitly; the orchestrator never infers it.

## job-activate

`workflow-job-activate` — arguments `sessionId`, `jobId`, `workflowType`, optional `agentName` and `designId`.

Write `sessions/<sessionId>/jobs/<jobId>.json`:

```json
{ "jobId": "...", "sessionId": "...", "agentName": "orchestrator", "workflowType": "DESIGN",
  "designId": "...", "steps": ["design/01-image-intake", "design/02-requirement-decomposition", "..."],
  "currentStep": 0, "createdAt": "...", "knowledgeBaseline": { "<path>": "<sha256>" } }
```

- `steps` is the ordered list of the type in `workflow-types.yaml`, frozen into the job.
- A DESIGN job without `designId` creates a new design whose id is the job id. A job with `designId` reuses that existing design, approval included: follow-up work continues on the same design.
- A FAST_IMPLEMENTATION job without `designId` creates a job design whose id is the job id, as a DESIGN job does. Since 3.0.4 its steps register the knowledge references of the job with `#capability:design-knowledge-references` and its compliance gate reads them back; the job design holds them. It has no approval gate, and the orchestrator implements the requirement directly. Lab-authored: the 3.0.4 captures show the call on a FAST_IMPLEMENTATION job and not where the server keeps the rows, and the runtime does not limit the job design to that one operation.
- `knowledgeBaseline` (Lab-authored) records the hash of every knowledge file when the job is created, in every workflow (`contracts/knowledge-catalog.md`, guard).
- A DOCUMENTATION job started without `designId` has no design (`designId: null`); every `#capability:design-*` operation on it is refused.
- Activating an existing job resumes it; asking for a different workflow type on an existing job is refused.

Response: `Agent job created;\nJobId: <jobId>\nDesignId: <designId given, or <none>>`, or `Agent job resumed; ...` with the current instruction.

## step-serving

`workflow-step-pending` — arguments `sessionId`, `jobId`, optional `part`. Serve the current instruction; on a new job this is instruction 1. Calling it again re-serves the same instruction, and `part` selects which part of it (see Parts).

`workflow-step-next` — arguments `sessionId`, `jobId`. Advance `currentStep` by one and serve part 1 of that instruction. After the last instruction it is refused: the final instruction says the workflow is complete and the orchestrator stays with the developer. It is also refused, without advancing, when knowledge changed outside the runtime (`contracts/knowledge-catalog.md`, guard).

The served text is:

```text
Instruction <N>/<M>.
<the content of workflows/<step>.md>
```

Since 3.0.4 no workflow has a User Instruction Space step, so no instruction writes a `user_instruction_register_<jobId>` artifact and the runtime appends no register to an instruction. A job created before 3.0.4 keeps the step list it froze, whose instruction files are no longer installed: it cannot be resumed, and the work continues in a new job.

**Command definitions** (Lab-authored). Upstream gives the shape of a design write through the argument descriptions its server hands the client; a command line has no such channel, and in three measured runs agents called `--help` before almost every first write (8 to 24 calls a run, a turn each). So an instruction that names a design write (a command that takes `request`) for the first time in its job is followed by:

```text
---

## RUNTIME COMMANDS OF THIS INSTRUCTION

The arguments of the design writes this instruction names, ...

### design-obligations
Arguments: sessionId, jobId, request { operation, rows, ids }, outline (...), edit (...)
Fields of request (* = required):
- operation*: Add | Read | Update | Delete
...
Fields of obligation:
...
```

One `### <command>` block per command, with the fields `<command> --help` prints from the request schema. A command an earlier instruction of the job defined is only listed with that instruction's number. The job records the instruction that defined each command (`defined` in the job file), so an instruction reads the same every time it is served, and its parts never move. With `--role`, only that role's commands are defined. The instruction text itself is unchanged.

**Parts.** A shell host caps the output it shows of one command and spills the rest to a file the agent may not be allowed to read (about 30,000 characters in Claude Code, about 8 KB in Copilot CLI). So no runtime response is longer than the part limit. An answer that is computed again from state is served in parts by its own operation: `workflow-step-next`/`workflow-step-pending`, `#capability:knowledge-read`, `#capability:design-snapshot`, `#capability:design-verification-view` and `#capability:design-implementation-operation`. Every other long response, of any token, a write's result or a refusal included, is served from a stored copy (see Stored responses). The limit counts UTF-8 bytes, markers included (Lab-authored): `partLimit` in the runtime config, or else 24,000 (`PART_LIMIT` in `runtime/lib/util.mjs`). A client with a limit of its own has it under its id in `partLimits`, and its role files pass `--client <id>` on every call: three clients installed together all ran at the smallest limit, 7,000 bytes, which cut every instruction in two to five parts. A client the config does not name uses `partLimit`. The call for a later part names the client, because another limit cuts the answer at other boundaries. Each part starts at a unit of that answer: a paragraph of an instruction, a knowledge document, a snapshot item, an obligation or an operation of the view. A unit longer than the limit continues over several parts on line boundaries, and a piece after the first repeats the unit's heading with ` (continued)`; a single line longer than the limit is cut at a character boundary. A unit longer than the limit starts in the part that holds the text before it when that text is short (a quarter of the limit or less): a part that held only a title and a section heading read as an empty answer (Lab-authored). No text is ever lost. Part 1 is the answer's own text followed by:

```text
[part 1 of <M>. The answer continues in parts 2 to <M>: <the call that returns part 2> Request each remaining part the same way, as a shell command of its own, with nothing chained and no pipe: all in this turn as parallel tool calls if your client allows it, or else one by one. Read every part before acting on any of it.]
```

An answer of two parts names only part 2. A later part opens with `[part <k> of <M>]`, a part before the last names the next call for a client that reads one part at a time, and the last part ends with `[part <M> of <M>: end of the answer.]`. Lab-authored: part 1 asks for every remaining part at once because a client that runs tool calls in parallel then spends one turn on them instead of one per part; each call stays a command of its own, so no output exceeds the host cap. The optional argument `part` selects a part (a whole number, default 1); any other value is refused with the valid range and records nothing. There is no way to ask for the whole answer at once, because that is the output a capped host loses. Parts are computed from the same state, so asking again returns the same part. The CLI form of the call for a later part can be run exactly as printed: it names every argument the operation requires, including `--sessionId` and `--jobId` of a job's operation, and the caller's `--role` when it has one (Lab-authored: a footer that named only `--part` was followed literally and refused as a whole parallel batch). A design projection names its `revision` (the design's `updatedAt`) in the call for the next part, and a part requested with an older revision is refused: the agent starts again from part 1, so text from two revisions is never read as one answer. An answer that fits is returned unchanged, with no marker. One runtime operation runs per shell command: calls joined with `;`, `&&` or a loop exceed the host cap again, and an answer piped through `head`, `tail`, `cut`, `sed` or `dd` is cut (Lab-authored: verifiers that looped over parts and sliced the spilled file judged a different fragment of the design in each round). The rest of an instruction always comes from `workflow-step-pending`, which never advances the workflow.

**Stored responses** (Lab-authored). A response of any other token that is longer than the limit is kept as an immutable copy, `<cache root>/responses/<id>.json`, named by a hash of the token, exit code and text, and its first part is returned with the same footer. `--responseId <id> --part <k>` on the same token serves part k of that copy (`runtime/lib/responses.mjs`). It never runs the operation again, so a write is not repeated and parts asked in parallel always belong to one answer. The other arguments are ignored, the exit code is the original one, and the copy of another token is refused. A part starts at a heading, a list item or a row of lined JSON. A copy is discarded a day after it was written, and asking for it then is refused with what to do instead. If the copy cannot be written the response is returned whole, because a spilled answer can be recovered and a lost one cannot.

Structured answers are written as lined JSON (`linedJson` in `runtime/lib/util.mjs`): one array element per line, with no indentation. It parses to the same value as the indented form, which keeps the captured shapes, and costs fewer bytes. The parts of such an answer, with their markers removed and joined with a newline, are that JSON, except where a single row alone is longer than the limit: the pieces of a cut line join with nothing between them.

The CLI takes every value after a flag up to the next flag, and a repeated flag adds to the earlier values: `--fileIds 6 11`, `--fileIds 6 --fileIds 11` and `--fileIds 6,11` are the same call. `--json` takes exactly one value: a file path, `-` for stdin, or one quoted JSON object inline, up to 2,000 characters (Lab-authored: every verifier of one test session sent inline JSON first and spent a turn on the error). A value it cannot read or parse is a usage error with exit code 2 that names the accepted forms.

**Arguments.** Only the design operations that write or act on the design take `{ "sessionId", "jobId", "request": { ... } }`: `design-obligations`, `design-file-references`, `design-decisions`, `design-knowledge-references`, `design-overview`, `design-contracts`, `design-file-system`, `design-operations`, `design-approve`, `design-operation-status`, `design-iteration-open` and `design-iteration-close` (the commands that declare a `request` in `runtime/lib/commands.mjs`). Every other operation takes its arguments at the top level. The command table in that file is the one declaration of every command: its arguments, the other names it accepts for them (an alias is accepted and never shown), the schema of its request and the Lab-authored arguments it takes beside it. Validation, `--help`, the role bindings and the command definitions of an instruction all read it. When one of those is sent a `request` object anyway, its fields are read as top-level arguments, and a top-level value wins (Lab-authored: agents carry the design envelope over to every call). `node agentic-system.mjs <token> --help` prints the token's argument shape and its definition from these contracts. `node agentic-system.mjs --help` lists the arguments of every command in one answer, one line each, and `--role <role>` limits the list to that role's commands (Lab-authored: `commandArguments` in `runtime/lib/help.mjs`, so an agent does not spend a turn probing each command).

**Field definitions.** Upstream takes the shape of a design write from the argument descriptions its server gives the client. A command line has no such channel, so `<token> --help` on a design operation that takes `request` prints every field of it from the schema the runtime validates by: name, `*` when required, type or allowed values, description and first example, then the fields of each kind of row it holds (Lab-authored; the descriptions themselves were not captured, so this is the schema's own text). After them comes the operation's definition from these contracts. A client tool asked of the runtime (`work-item-retrieval`) is answered as a client tool.

An argument the token does not define is refused and applies nothing, as in the captured tool-call contract (`runtime/lib/commands.mjs`). The envelope fields `sessionId`, `jobId` and `request` are never unknown: they are ignored or unwrapped where they mean nothing. `session-memory-append` and `session-event-log` take their text under any field name, so they check nothing.

**Roles.** The CLI flag `--role <role>` runs a token as that role. A token outside the role's list is refused with exit code 2 and the role's own commands, and nothing is applied. The lists are `roles` in the runtime config, rendered by Bootstrap from the capability sidecars; without a table, or without the flag, nothing is restricted, so an operator can still run any command. The agent names its own role, so this stops a wrong call and not a hostile one. Where the client can do better it enforces the same list itself: `runtime/bin/role-guard.mjs <role>` is a hook that reads the client's `{ "tool_input": { "command" } }` on stdin and blocks, with exit code 2, any shell command other than one runtime command of that role with nothing chained, piped or redirected (Lab-authored). One quoted heredoc is allowed as the `--json -` payload of that command: `<<'JSON'` or `<<"JSON"` ends the command line, and the first line that closes it is the last line of the text. The shell does not expand a quoted heredoc, so the payload may hold any character. An unquoted heredoc, a heredoc that is not the `--json -` payload, and anything after the closing line are blocked. `--role` also names the caller to the operation, which `#capability:knowledge-read` uses (`contracts/knowledge-catalog.md`). `--client <id>` names the calling client and only selects its part limit (see Parts); it restricts nothing.

**Halt points.** An instruction may end at an explicit halt (a review awaiting approval, an interview question, a required decision). At a halt the orchestrator presents what the instruction requires and stops; it calls `#capability:workflow-step-next` only after the developer answers. Everywhere else it keeps executing until the step's work is done.
