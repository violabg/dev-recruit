---
title: "server actions"
tier: "MustHave"
keywords: ["server action","runAction","UserError","ActionResult","requireUser","form","react-hook-form"]
intent: "Always: shape and error contract of every server action, public candidate-facing actions, scorecard, guide, interview, kit and interviewer-scorecard actions, and how client forms call actions."
editable: true
---
# Server actions and forms

Server Actions, `redirect()`, `useTransition`, react-hook-form and sonner mechanics are in their official docs, not restated here: read them through next-devtools MCP or context7. This document holds only this project's contract.

## Action shape

Every exported server action wraps its whole body in `runAction(operationName, body)`. `operationName` is the action's own name; it appears in the log line of unexpected errors.

```ts
export async function updatePositionAction(id: string, values: PositionFormData) {
  return runAction("updatePositionAction", async () => {
    await requireUser();                          // first, unless candidate-facing
    const payload = positionFormSchema.parse(values); // schema from the shared schemas

    const existing = await prisma.position.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new UserError("Posizione non trovata");

    await prisma.position.update({ where: { id }, data: { /* payload */ } });

    invalidatePositionCache(id);                  // helper, see cache_invalidation
    redirect(`/dashboard/positions/${id}`);       // or: return { positionId: id }
  });
}
```

- `runAction` and `UserError` are imported from the `run-action` module of the actions layer (it is not a `"use server"` module).
- Order inside the body: `requireUser()` → `schema.parse(input)` → Prisma → `invalidate*Cache` → `return` data or `redirect()`.
- The returned object is merged into `{ success: true, ...data }`; returning nothing gives `{ success: true }`.

## Error contract

A failure never escapes an action as a throw: `runAction` turns anything thrown into `{ success: false, error }`.

| Thrown inside the body | `error` returned to the client |
|---|---|
| `UserError("…")` | its message, as written |
| `ZodError` | the first issue's message |
| `QuizSystemError` | a fixed Italian text per `QuizErrorCode` (its own message is never shown) |
| `AIGenerationError` | `describeAIError()` Italian text (rate limit / timeout / unavailable) |
| `Error("UNAUTHENTICATED")` from `requireUser()` | "Sessione scaduta. Accedi di nuovo per continuare." |
| anything else | logged, then `GENERIC_ERROR` ("Si è verificato un errore. Riprova.") in every environment |

- For an expected failure, throw `UserError` with an Italian message. It is the only way to send a custom message.
- New code uses `UserError` or `schema.parse`, not `QuizSystemError`.
- `UserError` can also be thrown by domain services; the action just lets it propagate.
- A message produced by a schema `.refine()` is a `ZodError` message, not a `UserError`: it reaches the client through the same contract, but it is not thrown by the action body.

## Redirecting actions

- `redirect()` and `notFound()` pass through `runAction` unchanged. Call them at the top level of the body, after cache invalidation; the framework's rules for these calls and `try/catch` apply.
- A redirecting action resolves to nothing on success. Callers MUST NOT `unwrap()` it; check `if (result && !result.success) toast.error(errorMessage(result.error))`.
- `deleteInterviewGuideAction` is a redirecting action: it invalidates, then redirects to `/dashboard/positions/{positionId}?tab=guide`. Pass it to `DeleteWithConfirm` bound to the guide id and without `unwrap`; the component itself handles both a result and the absence of one.
- `scheduleInterviewAction` is a redirecting action: it invalidates, then redirects to `/dashboard/applications/{id}/interviews/{interviewId}/prepare?scheduled=1`. Call it without `unwrap`.

## Authentication and public actions

- `requireUser()` throws `Error("UNAUTHENTICATED")`; it never redirects. `getCurrentUser()` returns `null` instead of throwing.
- The request proxy redirects signed-out page visits to login, but it does not protect server actions or route handlers. Every non-public action and every route handler MUST call `requireUser()` itself.
- Exactly six actions are public on purpose and skip `requireUser()`:

| Action | Credential |
|---|---|
| `startAssessmentAction(token)` | assessment token |
| `submitAnswerAction(token, questionId, answer)` | assessment token |
| `completeAssessmentAction(token)` | assessment token |
| `transcribeAudioAction(formData)` | assessment token in the form data, and the assessment must still `acceptsAnswers()` |
| `applyAsCandidateAction(formData)` | none (public application, `createdBy: null`, no owner) |
| `fetchPositionDataAction(positionId)` | none (public apply form) |

- `fetchPositionDataAction` returns `position: null` both when the position does not exist and when it exists but is not `open`.
- Every other action, including the entity actions of the application hub (`moveApplicationStageAction`, `setApplicationOwnerAction`, `updatePositionStatusAction`) and the scorecard, interview-guide, interview, kit, interviewer-scorecard and evaluation-recalculation actions, calls `requireUser()` and applies no role or ownership check. `moveApplicationStageAction` accepts any stage to any stage, including reopening a closed application; `setApplicationOwnerAction` takes `owner: "me" | "none"`.
- The scorecard and interview-guide actions follow the same rule. Their expected failures, all `UserError`:
  - `saveScorecardAction`: "Posizione non trovata", "Uno o più criteri non appartengono a questa scheda". It saves the whole scorecard in one transaction and returns no id.
  - `generateScorecardCriteriaAction`: "Posizione non trovata".
  - `upsertInterviewGuideAction`: "Guida non trovata" when a guide id is given, "Posizione non trovata" when it is not, and the criteria error "Uno o più criteri selezionati non appartengono alla scheda della posizione". It returns `{ id }`. A guide created without a position fails earlier, on the schema refine "La posizione è obbligatoria per creare una guida", which is a `ZodError` message.
  - `deleteInterviewGuideAction`: "Guida non trovata".
  - `generateInterviewGuideAction`: "Posizione non trovata", "Crea prima la scheda di valutazione della posizione".
  - `recalculateAnswerEvaluationsAction`: "Valutazione non trovata", "Nessuna risposta valutata", "Una o più domande non hanno una risposta", all thrown by the recalculation service.
- The interview actions follow the same rule and none of them checks a role or an owner:
  - `scheduleInterviewAction`: "Candidatura non trovata o chiusa" (also for `rejected`, `withdrawn` and `hired`), "Guida non trovata per questa posizione", "Uno o più partecipanti non sono utenti dell'app", plus the schema messages "Indica un solo conduttore", "Un partecipante è indicato più volte", "Data e ora non valide", "Durata minima 10 minuti", "Durata massima 480 minuti", "Link della call non valido". It creates the interview, its participants and its kit and advances the stage in one transaction, then redirects (see Redirecting actions).
  - `rescheduleInterviewAction`: "Colloquio non trovato", "Operazione non consentita nello stato attuale del colloquio", "Il partecipante ha già note o una scheda", "Uno o più partecipanti non sono utenti dell'app".
  - `cancelInterviewAction`, `markInterviewNoShowAction`, `startInterviewAction`, `completeInterviewAction`: "Colloquio non trovato", "Operazione non consentita nello stato attuale del colloquio".
  - `generateInterviewKitAction`: "Il kit si modifica solo prima del colloquio", "Crea prima la scheda di valutazione della posizione".
  - `saveInterviewKitAction`: "Il kit si modifica solo prima del colloquio", "Una o più domande non appartengono a questo kit", "Sezione del kit non valida", "Uno o più criteri selezionati non appartengono alla scheda della posizione".
  - `setInterviewKitStatusAction`: "Il kit si modifica solo prima del colloquio".
  - `saveKitItemNoteAction`: "Domanda non trovata", "Non partecipi a questo colloquio", "Il colloquio non accetta più note", "La scheda è già stata inviata".
  - `setKitItemCoveredAction`: "Domanda non trovata", "Il colloquio non accetta più note".
  - `saveInterviewerFeedbackAction`: "Non partecipi a questo colloquio", "La scheda è già stata inviata", "Operazione non consentita nello stato attuale del colloquio", and the criteria error "Uno o più criteri selezionati non appartengono alla scheda della posizione".
  - `submitInterviewerFeedbackAction`: the same as the draft plus "Puoi inviare la scheda solo a colloquio concluso" and "Indica la raccomandazione finale".
- The three generation actions (`generateScorecardCriteriaAction`, `generateInterviewGuideAction`, `generateInterviewKitAction`) are read-only: they return a proposal and never write or invalidate cache.

## Inputs and reads

- Validate every input with a schema from the shared schemas (`schema.parse`). Never define a schema inline in an action or component.
- Inputs are typed values (an object, or ids). Use `FormData` only when a file is uploaded (candidate resume, assessment audio); rebuild a plain object from it and parse it with the schema.
- Reads for pages live in the cached data layer, not in actions. A read action is acceptable only for data a client component loads on demand after a user event.
- Mutations only: an action that writes MUST call the matching `invalidate*Cache` helper before returning or redirecting. This includes the live-note autosave: `saveKitItemNoteAction` calls `invalidateInterviewCache`, and the client groups its calls with an 800 ms debounce.

## Client forms

- `useForm` with `zodResolver(schema)`, where the schema comes from the shared schemas.
- Fields from the `rhf-inputs` wrappers (`InputField`, `TextareaField`, `SelectField`, `MultiSelectField`, `CheckboxField`, `SwitchField`, `PasswordField`, `SliderField`, `InputWithTagField`), passing `control` and `name`.
- `const [isPending, startTransition] = useTransition()`; submit inside `startTransition`.
- Feedback through `toast` from `sonner`; navigate with `router.push`, or let the action `redirect()`.
- Error text on the client comes from `errorMessage(error)` (fallback `GENERIC_ERROR`).
- When the schema's defaults make the form input differ from the validated output, type `useForm` with three arguments: `useForm<z.input<typeof schema>, unknown, Output>`. This is the case of the scorecard, interview-guide and kit editors, whose anchors have default values, so the input type has them optional and the output type requires them. Use `values` instead of `defaultValues` so the form follows the server data after a save and rows created by the save are not created twice, and pass `keyName: "fieldKey"` to `useFieldArray` because every row already carries its own database `id` in the `id` field.
- The scheduling form keeps `datetime-local` as a local string field in the form and converts it to an ISO string with the browser offset in a resolver before validation (`withLocalScheduledAt`), because the schema requires an ISO datetime with offset.

```tsx
const [isPending, startTransition] = useTransition();
const form = useForm<DuplicateFormData>({
  resolver: zodResolver(duplicateQuizFormSchema),
  defaultValues: { newTitle: `${quizTitle} - Copia`, newPositionId: "" },
});

const onSubmit = (data: DuplicateFormData) =>
  startTransition(async () => {
    try {
      const { id } = unwrap(await duplicateQuizAction({ quizId, ...data }));
      toast.success("Quiz duplicato con successo!");
      router.push(`/dashboard/quizzes/${id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  });
```

Equivalent without `unwrap`: `const result = await action(values); if (!result.success) { toast.error(errorMessage(result.error)); return; }`.

## Logging

Use the logger service: `logger`, or the scoped `aiLogger`, `dbLogger`, `authLogger`, `storageLogger`, always with a context object. Never call `console.*`. Logs are silent under tests.

## Common mistakes

- `throw new Error("messaggio")` for an expected failure: the user sees the generic text and the error is logged as unexpected. Use `UserError`.
- English text in `UserError` or in custom Zod messages: it is shown to the user verbatim.
- Returning a hand-built `{ success, ... }` object instead of using `runAction`.
- Calling `unwrap()` on an action that redirects, including `scheduleInterviewAction`.
- Wrapping `redirect()` in a `try/catch` inside the body.
- Omitting `requireUser()` because "the page is protected": actions are callable directly.
- Parsing input or touching the database before `requireUser()`.
- Adding a read action for page data instead of a cached data-layer function.
- Gating a stage, owner or status change on the current user's role or ownership: `requireUser()` is the only guard.
- Adding a database write or a cache invalidation to a generation action, including the scorecard criteria proposal, the interview guide and the interview kit.
- Taking the interviewer of a scorecard from the input instead of from the session.
- Using `defaultValues` for a form the server rewrites after a save: the new rows are then recreated on the next submit.
