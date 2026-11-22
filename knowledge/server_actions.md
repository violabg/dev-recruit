---
title: "server actions"
tier: "MustHave"
keywords: ["server action","runAction","UserError","ActionResult","requireUser","form","react-hook-form"]
intent: "Always: shape and error contract of every server action, public candidate-facing actions, the admin-only check of user- and MCP-management actions, scorecard, guide, interview, kit and interviewer-scorecard actions, the application decision actions, and how client forms call actions."
editable: true
---
# Server actions and forms

## Action shape

```ts
export async function updatePositionAction(id: string, values: PositionFormData) {
  return runAction("updatePositionAction", async () => {
    await requireUser();                              // first, unless candidate-facing
    const payload = positionFormSchema.parse(values);  // shared schema, never inline
    // prisma
    invalidatePositionCache(id);
    redirect(`/dashboard/positions/${id}`);            // or: return { positionId: id }
  });
}
```

- Every exported action wraps its whole body in `runAction(operationName, body)`; `operationName` is the action's own name.
- Order: `requireUser()` → `schema.parse(input)` → Prisma → `invalidate*Cache` → return data or `redirect()`.
- The result is `{ success: true, ...data }`; returning nothing gives `{ success: true }`.
- `runAction` and `UserError` come from the `run-action` module of the actions layer (not a `"use server"` module).

## Error contract

A failure never escapes as a throw: `runAction` turns anything thrown into `{ success: false, error }`.

| Thrown inside the body | `error` returned |
|---|---|
| `UserError("…")` | its message, as written |
| `ZodError` | the first issue's message |
| `QuizSystemError` | fixed Italian text per `QuizErrorCode` (own message never shown) |
| `AIGenerationError` | `describeAIError()` text (rate limit / timeout / unavailable) |
| `Error("UNAUTHENTICATED")` from `requireUser()` | "Sessione scaduta. Accedi di nuovo per continuare." |
| anything else | logged, then `GENERIC_ERROR` ("Si è verificato un errore. Riprova.") in every environment |

- Expected failure → `throw new UserError` with an Italian message; it is the only way to send a custom message. A schema `.refine()` message reaches the client through the same contract.
- New code uses `UserError` or `schema.parse`, never `QuizSystemError`. Domain services may throw `UserError`; the action lets it propagate.
- `redirect()` and `notFound()` pass through `runAction` unchanged: call them at the top level of the body, after invalidation, never inside `try/catch`. A redirecting action resolves to nothing on success, so callers check `if (result && !result.success) toast.error(errorMessage(result.error))` and never `unwrap()` it.
- Redirecting actions: `deleteInterviewGuideAction` (→ `/dashboard/positions/{positionId}?tab=guide`, used through `DeleteWithConfirm`) and `scheduleInterviewAction` (→ `…/interviews/{interviewId}/prepare?scheduled=1`).

## Authentication and public actions

- `requireUser()` throws `Error("UNAUTHENTICATED")`, never redirects; `getCurrentUser()` returns `null`.
- The request proxy protects page visits only: every non-public action and every route handler MUST call `requireUser()` itself, except the MCP endpoint and the OAuth endpoints.
- MCP tools authenticate with the OAuth bearer token and check its scope, then call the same services as the actions with the token user. A tool never calls a server action (cookie session, `redirect()`, `updateTag`).
- Exactly six actions are public on purpose and skip `requireUser()`:

| Action | Credential |
|---|---|
| `startAssessmentAction(token)`, `submitAnswerAction(token, questionId, answer)`, `completeAssessmentAction(token)` | assessment token |
| `transcribeAudioAction(formData)` | token in the form data; the assessment must still `acceptsAnswers()` |
| `applyAsCandidateAction(formData)` | none (public application, `createdBy: null`, no owner) |
| `fetchPositionDataAction(positionId)` | none; returns `position: null` for a missing and for a non-`open` position |

- Every other action calls `requireUser()` and applies no ownership check. The only role check: user-management and MCP-management actions (`setMcpEnabledAction`, `setUserMcpDisabledAction`, `revokeMcpTokenAction`) also require the `admin` role, on the server right after the session and before parsing input (a non-admin gets a `UserError`). `moveApplicationStageAction` accepts any stage to any stage (reopening included); `setApplicationOwnerAction` takes `owner: "me" | "none"`.

## Expected failures by action

Every expected failure is a `UserError`. The non-obvious ones:

- A missing resource and a refused state often share one message: scheduling gives "Candidatura non trovata o chiusa" for a missing application and for `rejected`, `withdrawn`, `hired`; kit and live-note actions share "Il kit si modifica solo prima del colloquio" and "Il colloquio non accetta più note"; a state refusal is "Operazione non consentita nello stato attuale del colloquio".
- Criteria sent with a save are validated against the position scorecard: scorecard ("Uno o più criteri non appartengono a questa scheda"), guide, kit and interviewer scorecard all reject a foreign criterion.
- Scheduling: "Indica un solo conduttore", "Un partecipante è indicato più volte", "Uno o più partecipanti non sono utenti dell'app", "Durata minima 10 minuti", "Durata massima 480 minuti"; it creates interview, participants and kit and advances the stage in one transaction, then redirects.
- `upsertInterviewGuideAction` returns `{ id }`; a guide created without a position fails earlier on the schema refine "La posizione è obbligatoria per creare una guida".
- `recordApplicationDecisionAction({ applicationId, outcome, rationale })`: rationale 10–5000 characters, closed application refused ("Candidatura chiusa: riaprila per registrare la decisione"), invalid outcome refused; returns `{ stage }` and does not redirect (the client calls `router.refresh()`).
- `challengeDecisionAction` and the three generation actions are read-only and return a proposal; `challengeDecisionAction` returns `{ challenge: { reasons: { title, explanation, criterionIds }[] } }` plus AI errors through `describeAIError`.

## Inputs and reads

- Validate every input with a shared schema (`schema.parse`); never define a schema inline in an action or component.
- Inputs are typed values (an object or ids). `FormData` only when a file is uploaded (resume, audio), rebuilt into an object and parsed.
- Page reads live in the cached data layer, never in actions. A read action is acceptable only for data a client component loads on demand after a user event.
- Every action that writes MUST call the matching `invalidate*Cache` helper before returning or redirecting, live-note autosave included (`saveKitItemNoteAction` → `invalidateInterviewCache`, debounced 800 ms client-side).

## Client forms

- `useForm` with `zodResolver(schema)` from the shared schemas; fields from the `rhf-inputs` wrappers with `control` and `name`; raw `Controller` only for `LLMModelSelect` and `CodeEditor`.
- Submit inside `startTransition` from `useTransition`; feedback through `toast` from sonner; navigate with `router.push` or let the action redirect. Client error text comes from `errorMessage(error)`.
- When schema defaults make input differ from output, type `useForm<z.input<typeof schema>, unknown, Output>` (scorecard, guide and kit editors, whose anchors are optional in input and required in output). Use `values`, not `defaultValues`, so the form follows server data after a save and new rows are not created twice, and pass `keyName: "fieldKey"` to `useFieldArray`.
- The scheduling form keeps `datetime-local` as a local string and converts it with the browser offset in a resolver (`withLocalScheduledAt`) before validation.

## Logging

- Use the logger service (`logger`, or scoped `aiLogger`, `dbLogger`, `authLogger`, `storageLogger`) with a context object. NEVER call `console.*`.

## Prohibitions

- NEVER `throw new Error("…")` for an expected failure (the user sees the generic text), and never an English `UserError` or Zod message.
- NEVER return a hand-built `{ success, … }` object instead of `runAction`.
- NEVER omit `requireUser()` because "the page is protected", or parse input or touch the database before it.
- NEVER gate a stage, owner or status change, or any other selection-data action, on role or ownership. An MCP scope check limits the token, it is not a role gate.
