# Audit

Start from the digest. Each question below names what answers it, so most need no other file.

## Runtime and flow

| Question | Evidence |
| --- | --- |
| Which responses cost the most? | Largest responses, per conversation usage. A large response that later turns carry is paid for again on each of them. |
| Did agents have to guess? | Failed calls, `--help` probes, contracts read. The same refused shape several times means the runtime or its help did not say what it wanted. |
| Was work repeated? | Identical calls repeated, parts served more than once in a step. |
| Were the runtime's own rules followed? | Runtime calls joined or piped, spilled responses. |
| Did the job follow the flow? | The step table. A step with no operations, a step far costlier than its siblings, and a job that stopped before its last step each need a look. |

Read the served instruction (`<runtime root>/workflows/<step>.md`) only for a step you flagged, and compare what it asks with the calls in that step. Whether a step was followed properly is your judgment, so label it as judged.

The step table covers the main conversation. A delegate's cost appears under its own conversation and is not split by step.

Estimate a saving with the replay, and call it modelled:

```sh
node <skill>/scripts/transcript-cost.mjs <file> --replay <response type>=<fraction kept>
```

## Knowledge

The digest gives documents read, references never read, and reads never referenced. Open a document only to confirm a finding. It is a knowledge finding when:

- an agent searched the code for something a document should state;
- two documents disagree, or a document disagrees with the code the session found;
- a developer decision answered a question that recurs and that no document holds;
- a document was read and was no use to the work, which is a routing or scope problem in the catalog.

## Issue

Each session keeps the item it read as an artifact, such as `work_item_<id>`. Read that first: it is what the agents actually saw. Read the live item only when you need to know whether it changed, through the tracker binding in the digest, and only that id. If the binding is not available in this session, say so and use the artifact. When the digest has no issue candidate, ask the user which issue the session worked on.

It is an issue finding when the session paid for what the issue left out: open points only the author could answer, a design reworked after a late clarification, acceptance criteria that cannot be checked, or scope that had to be guessed.

## Several sessions

The digest's comparison settles what can be said:

| Mode | Report |
| --- | --- |
| `same-issue` | The side-by-side table: which run was cheapest and where the others diverged. A session with unavailable usage stays out of the cost ranking, and the table says so. |
| `different-issues` | Recurring causes only. Never rank different work on cost. |
| `unknown-issue` | Ask which issue each named session worked on, then treat them as one of the two above. |

A transcript the digest warns about ran no job of the session it was named for: its figures belong to another session, so it stays out of the comparison and the recurring causes. Name the transcript of the right session, or report that session as having none.

Merge the same cause across sessions into one finding that lists them. Rank by how many sessions it hit, then by cost. Call a cause seen in several sessions systemic, and one seen in a single session possibly a one-off.

## Classify each finding

| Class | The cause is in | Examples |
| --- | --- | --- |
| `runtime` | `<runtime root>/bin`, `lib`, `assets`, or the contract describing them | a misleading refusal, an oversized response, a missing field description |
| `workflow` | a workflow instruction or a role contract | an instruction that causes a wrong call |
| `knowledge` | the knowledge folder | a missing topic, two documents that conflict |
| `issue` | the tracker item | missing scope, acceptance criteria that cannot be checked |
| `behaviour` | one agent's choice, with nothing in the system that invited it | a one-off mistake |

Prefer the cause over the symptom: a failed call is usually a `runtime` or `workflow` finding, and `behaviour` only when the instruction and the help were both clear. Do not report anything you cannot tie to evidence.

## Report format

```markdown
# Session audit: <session ids>

Issue: <id and title>. Clients: <clients>. Usage: <recorded, partial or unavailable>.
Verdict: <one or two sentences: did it follow the flow, and what cost the most>.

<the comparison table, for several sessions>

## Findings

### 1. <the cause, in one line>
- Class: <class>. Evidence: measured | judged. Sessions: <ids; systemic or possibly a one-off>.
- Evidence: <numbers, the step, the file and line>.
- Cost: <tokens or chars, modelled saving if estimated, or "not measured">.
- Proposed action: <one action from contracts/actions.md, with the exact change>.
```
