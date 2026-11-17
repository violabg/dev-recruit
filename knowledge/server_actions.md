---
title: "server actions"
tier: "MustHave"
keywords: ["server action","runAction","UserError","ActionResult","requireUser","form","react-hook-form"]
intent: "Always: shape and error contract of every server action, public candidate-facing actions, scorecard, guide, interview, kit and interviewer-scorecard actions, the application decision actions, and how client forms call actions."
editable: true
---
# Server actions and forms

Next.js Server Actions, `redirect()`, `useTransition`, react-hook-form and sonner are in their docs. Only this project's contract is here.

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

- Every exported action wraps its whole body in `runAction(operationName, body)`; `operationName` is the action's own name and appears in the log of unexpected errors.
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

- Expected failure → `throw new UserError` with an Italian message; it is the only way to send a custom message.
- New code uses `UserError` or `schema.parse`, never `QuizSystemError`. Domain services may throw `UserError`; the action lets it propagate.
- A schema `.refine()` message is a `ZodError` message and reaches the client through the same contract.

## Redirecting actions

- `redirect()` and `notFound()` pass through `runAction` unchanged; call them at the top level of the body, after invalidation, and never inside `try/catch`.
- A redirecting action resolves to nothing on success. Callers MUST NOT `unwrap()` it; check `if (result && !result.success) toast.error(errorMessage(result.error))`.
- Redirecting actions: `deleteInterviewGuideAction` (→ `/dashboard/positions/{positionId}?tab=guide`, used through `DeleteWithConfirm` without `unwrap`) and `scheduleInterviewAction` (→ `/dashboard/applications/{id}/interviews/{interviewId}/prepare?scheduled=1`).

## Authentication and public actions

- `requireUser()` throws `Error("UNAUTHENTICATED")`, never redirects. `getCurrentUser()` returns `null`.
- The request proxy protects page visits only. Every non-public action and every route handler MUST call `requireUser()` itself.
- Exactly six actions are public on purpose and skip `requireUser()`:

| Action | Credential |
|---|---|
| `startAssessmentAction(token)`, `submitAnswerAction(token, questionId, answer)`, `completeAssessmentAction(token)` | assessment token |
| `transcribeAudioAction(formData)` | token in the form data; the assessment must still `acceptsAnswers()` |
| `applyAsCandidateAction(formData)` | none (public application, `createdBy: null`, no owner) |
| `fetchPositionDataAction(positionId)` | none; returns `position: null` for a missing and for a non-`open` position |

- Every other action calls `requireUser()` and applies no role or ownership check. `moveApplicationStageAction` accepts any stage to any stage (reopening included); `setApplicationOwnerAction` takes `owner: "me" | "none"`.

## Expected failures by action

All are `UserError`, and every action calls `requireUser()` first.

| Action | Messages |
|---|---|
| `saveScorecardAction` | "Posizione non trovata", "Uno o più criteri non appartengono a questa scheda". Saves the whole scorecard in one transaction, returns no id |
| `generateScorecardCriteriaAction` | "Posizione non trovata" |
| `upsertInterviewGuideAction` | "Guida non trovata" (with a guide id), "Posizione non trovata", "Uno o più criteri selezionati non appartengono alla scheda della posizione". Returns `{ id }`. A guide created without a position fails earlier on the schema refine "La posizione è obbligatoria per creare una guida" |
| `deleteInterviewGuideAction` | "Guida non trovata" |
| `generateInterviewGuideAction` | "Posizione non trovata", "Crea prima la scheda di valutazione della posizione" |
| `recalculateAnswerEvaluationsAction` | "Valutazione non trovata", "Nessuna risposta valutata", "Una o più domande non hanno una risposta" (thrown by the service) |
| `recordApplicationDecisionAction({ applicationId, outcome, rationale })` | "Candidatura non trovata", "Candidatura chiusa: riaprila per registrare la decisione", "La motivazione deve avere almeno 10 caratteri", "La motivazione può avere al massimo 5000 caratteri", "Esito della decisione non valido". Returns `{ stage }`, invalidates the candidate cache, does not redirect (client calls `router.refresh()`) |
| `challengeDecisionAction({ applicationId, outcome, rationale?, specificModel? })` | "Candidatura non trovata", "Crea prima la scheda di valutazione della posizione", plus AI errors through `describeAIError`. Returns `{ challenge: { reasons: { title, explanation, criterionIds }[] } }` |
| `scheduleInterviewAction` | "Candidatura non trovata o chiusa" (also for `rejected`, `withdrawn`, `hired`), "Guida non trovata per questa posizione", "Uno o più partecipanti non sono utenti dell'app", "Indica un solo conduttore", "Un partecipante è indicato più volte", "Data e ora non valide", "Durata minima 10 minuti", "Durata massima 480 minuti", "Link della call non valido". Creates interview, participants and kit and advances the stage in one transaction, then redirects |
| `rescheduleInterviewAction` | "Colloquio non trovato", "Operazione non consentita nello stato attuale del colloquio", "Il partecipante ha già note o una scheda", "Uno o più partecipanti non sono utenti dell'app" |
| `cancelInterviewAction`, `markInterviewNoShowAction`, `startInterviewAction`, `completeInterviewAction` | "Colloquio non trovato", "Operazione non consentita nello stato attuale del colloquio" |
| `generateInterviewKitAction` | "Il kit si modifica solo prima del colloquio", "Crea prima la scheda di valutazione della posizione" |
| `saveInterviewKitAction` | "Il kit si modifica solo prima del colloquio", "Una o più domande non appartengono a questo kit", "Sezione del kit non valida", "Uno o più criteri selezionati non appartengono alla scheda della posizione" |
| `setInterviewKitStatusAction` | "Il kit si modifica solo prima del colloquio" |
| `saveKitItemNoteAction` | "Domanda non trovata", "Non partecipi a questo colloquio", "Il colloquio non accetta più note", "La scheda è già stata inviata" |
| `setKitItemCoveredAction` | "Domanda non trovata", "Il colloquio non accetta più note" |
| `saveInterviewerFeedbackAction` | "Non partecipi a questo colloquio", "La scheda è già stata inviata", "Operazione non consentita nello stato attuale del colloquio", "Uno o più criteri selezionati non appartengono alla scheda della posizione" |
| `submitInterviewerFeedbackAction` | as the draft, plus "Puoi inviare la scheda solo a colloquio concluso", "Indica la raccomandazione finale" |

- The three generation actions and `challengeDecisionAction` are read-only: they return a proposal and never write or invalidate cache.

## Inputs and reads

- Validate every input with a shared schema (`schema.parse`); never define a schema inline in an action or component.
- Inputs are typed values (an object or ids). `FormData` only when a file is uploaded (resume, audio), rebuilt into an object and parsed.
- Page reads live in the cached data layer, never in actions. A read action is acceptable only for data a client component loads on demand after a user event.
- Every action that writes MUST call the matching `invalidate*Cache` helper before returning or redirecting, live-note autosave included (`saveKitItemNoteAction` → `invalidateInterviewCache`, debounced 800 ms client-side).

## Client forms

- `useForm` with `zodResolver(schema)` from the shared schemas; fields from the `rhf-inputs` wrappers (`InputField`, `TextareaField`, `SelectField`, `MultiSelectField`, `CheckboxField`, `SwitchField`, `PasswordField`, `SliderField`, `InputWithTagField`) with `control` and `name`.
- Submit inside `startTransition` from `useTransition`; feedback through `toast` from sonner; navigate with `router.push` or let the action redirect.
- Client error text comes from `errorMessage(error)` (fallback `GENERIC_ERROR`).
- When schema defaults make input differ from output, type `useForm<z.input<typeof schema>, unknown, Output>` (scorecard, guide and kit editors, whose anchors are optional in input and required in output). Use `values`, not `defaultValues`, so the form follows server data after a save and new rows are not created twice, and pass `keyName: "fieldKey"` to `useFieldArray` (each row carries its database `id` in `id`).
- The scheduling form keeps `datetime-local` as a local string and converts it with the browser offset in a resolver (`withLocalScheduledAt`) before validation.

## Logging

Use the logger service (`logger`, or scoped `aiLogger`, `dbLogger`, `authLogger`, `storageLogger`) with a context object. NEVER call `console.*`. Logs are silent under tests.

## Prohibitions

- NEVER `throw new Error("…")` for an expected failure (the user sees the generic text), and never an English `UserError` or Zod message.
- NEVER return a hand-built `{ success, … }` object instead of `runAction`.
- NEVER `unwrap()` a redirecting action, or wrap `redirect()` in `try/catch`.
- NEVER omit `requireUser()` because "the page is protected", and never parse input or touch the database before it.
- NEVER add a read action for page data instead of a cached data-layer function.
- NEVER gate a stage, owner or status change on role or ownership: `requireUser()` is the only guard.
- NEVER take the interviewer of a scorecard from the input instead of the session.
- NEVER use `defaultValues` for a form the server rewrites after a save.
