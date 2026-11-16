---
title: "ai generation"
tier: "PerContext"
keywords: ["AI","generateStructured","LLM","Groq","prompt","evaluation","model","streaming","transcription"]
intent: "When touching AI quiz/question generation, scorecard criteria proposal, interview guide generation, assessment or resume evaluation, prompts, model selection, streaming routes or transcription."
editable: true
---
# AI generation and evaluation

The provider is Groq through the Vercel AI SDK. SDK APIs are in the official docs (context7); this document holds only this project's rules. Model ids, retry counts, delays, timeouts and length caps are deliberately not written here: read them from the symbols named below.

## Single entry point

- Structured output (quiz, question, scorecard criteria proposal, interview guide, every evaluation) goes ONLY through `generateStructured()`. It owns model choice, retry, timeout, fallback and the Italian error mapping.
- Streaming text uses `getLanguageModel(getOptimalModel(task))` with the SDK's `streamText`. A text model is never taken from `groq(...)` directly.
- Audio transcription is the one provider path outside `generateStructured` and `streamText`: `transcribeAudio(audio)` in the transcription module of the AI layer calls the SDK's `transcribe` with `groq.transcription(LLM_MODELS.WHISPER_LARGE_V3_TURBO)`. The server action keeps the token and size checks; no action or component calls `groq` itself.
- A failed transcription MUST reach the candidate as its own message, "Trascrizione non riuscita. Riprova o scrivi la risposta.", thrown as `UserError` after logging the provider error. It never goes through `describeAIError`: the generic "Servizio AI temporaneamente non disponibile" does not tell the candidate they can type the answer instead.
- `generateStructured`, `getLanguageModel` and `describeAIError` are exported only by the `generate` module of the AI layer, not by the AI barrels.

```ts
const result = await generateStructured({
  task: "evaluation",                     // LLMTaskType: picks the default model
  schema: evaluationResultSchema,         // Zod schema from the shared schemas
  system: ANSWER_EVALUATION_SYSTEM_PROMPT,
  prompt: buildAnswerEvaluationPrompt(question, answer),
  temperature: 0,
  seed: 42,
  // specificModel?: user-picked model; config?: Partial<AIGenerationConfig>
});
```

## Models and failure policy

- Models are defined in the models module (`LLM_MODELS`, `getOptimalModel`, `DEFAULT_GENERATION_MODEL`, `FALLBACK_MODELS`). It has no imports and is used by client components: NEVER import server code into it.
- Only models of Groq's free plan are used. Model ids live only in `LLM_MODELS`; never write a model id string anywhere else.
- `getOptimalModel(task, specificModel?)` picks the model: `specificModel` wins, then the per-task default (`simple_task` gets the small model, every other `LLMTaskType` the large one). Forms default to `DEFAULT_GENERATION_MODEL`.
- `LLMTaskType` includes `scorecard_generation` and `guide_generation`, both on the large model: they produce structured Italian content tied to the position requirements. The small model stays reserved to `simple_task`.
- `FALLBACK_MODELS` is the ordered fallback chain; the primary is skipped when it appears in it.
- `DEFAULT_CONFIG` holds the retry count, backoff and timeout: the primary is retried with backoff and the timeout bounds its whole retry sequence; each fallback gets one attempt bounded by the timeout. Content-filtered failures are never retried or sent to another model.
- Failures are `AIGenerationError` with an `AIErrorCode`; `runAction` turns them into Italian messages through `describeAIError` (transcription excepted, see Single entry point).
- Audio transcription uses `LLM_MODELS.WHISPER_LARGE_V3_TURBO`; the ban on `generateText`/`groq(...)` is about text models (see Single entry point).

## Determinism

| Use | temperature | seed |
|---|---|---|
| Quiz generation, question generation, position description, scorecard criteria proposal, interview guide generation | 0.7 | none |
| Every evaluation (answer, overall assessment, resume, and the per-criterion part of the resume evaluation, which travels in the same stream) | 0 | 42 |

`generateStructured` defaults to 0.7 when `temperature` is omitted: evaluation calls MUST pass `temperature: 0, seed: 42`. A call with no `seed` sends none to the provider, so the two new flows are non-deterministic exactly like quiz and question generation.

## Prompts: Italian and sanitization

- Prompt builders live in the prompts module (generation) and the evaluation-prompts module. Every prompt MUST require Italian for all generated values; JSON field names stay in English.
- Every user-provided free-text value that goes into a generation prompt (titles, descriptions, instructions, skills, previous questions) MUST pass through `sanitizeInput()`, which replaces prompt-injection patterns with `[filtered]` and caps the length.
- `sanitizeInput(input, maxLength = 2000)` takes an optional cap whose default is 2000 characters. Pass the cap as the explicit second argument when the default is not enough; when it is, call the function with one argument. NEVER hand the bare function to `.map`: the array index would arrive as `maxLength` and each string would be cut to 0, 1, 2 characters. Write `.map((value) => sanitizeInput(value))`.
- The resume text goes through `redactBirthDate` first and then through `sanitizeInput(text, MAX_RESUME_CHARS)`. The order is mandatory: `sanitizeInput` rewrites `Data:` patterns and would destroy the birth marker before `redactBirthDate` could see it. The truncation suffix `"... [troncato]"` follows the ORIGINAL text length, so it may appear even when the cleaned text ended up shorter than the cap.
- `redactBirthDate(text)` replaces with `[rimosso]` a date that follows, on the same line, one of these markers: `nato il`, `nata il`, `nato/a il`, `nato a <place> il` (any place up to 80 characters on the same line), `data di nascita`, `date of birth`, `born on`, `born`, `DOB`. The marker itself stays and only the date is replaced; the match is case-insensitive and every marker must start at a word boundary. The accepted date formats are `aaaa-m-g`, `gg/mm/aaaa`, `gg-mm-aaaa`, `gg.mm.aaaa`, a two-digit year in the day-first forms, one-digit day and month, a day followed by an optional ordinal suffix (`st`, `nd`, `rd`, `th`, `°`, `º`) plus the month name in Italian or English plus the year, and an optional dot and comma after the month name. A date with no marker before it is left untouched (known limit).
- Every answer of the candidate goes through `sanitizeInput(answer, MAX_ANSWER_CHARS)` in the answer evaluation prompt. Question text, options, sample answer and explanation are not sanitized there, and neither are the candidate name nor the strengths and weaknesses of the overall evaluation: never claim that all candidate-provided text is sanitized.
- In the resume prompt the candidate name and the position texts (title, experience level, skills, soft skills, description) also pass through `sanitizeInput`, and so do the name and description of every criterion.
- The model never sees the ids of the criteria. Criteria are listed with the keys `C1`, `C2`, … and the model answers with those keys; the service translates them back into ids. The AI output schemas never contain criterion ids.

## Criterion keys

- `buildCriterionKeys(criteria)` assigns `C<n>` by position in the input array, starting at 1: the first criterion is `C1`, the second `C2`. It neither sorts nor filters, so the keys follow the order received, which is the scorecard order.
- `resolveCriterionKeys(keyed, keys)` returns the ids matching the keys the model wrote. Comparison trims the key and upper-cases it, so case and surrounding spaces do not matter; unknown and non-string keys are discarded, a repeated id is kept once, and the returned ids follow the order of the model's keys, not the scorecard order. An `undefined` key list gives an empty array.
- The prompts list the criteria as bullet lines headed by the key, with name, category and priority, and the model is told to use only the keys it was given: one to three keys per quiz question, only listed keys per guide question, one `criterionKey` per CV assessment entry.

## Flows

Quiz generation (editor):
1. `QuizGenerationForm` → `generateNewQuizAction(input)` (validated with `generateQuizSchema`; loads the position).
2. The action loads the active criteria of the position's scorecard and passes them to the AI quiz service.
3. `aiQuizService.generateQuiz` keys the criteria, builds the system prompt with the `criterionKeys` field documented only when criteria exist, and the user prompt with the criteria block titled "Evaluation criteria of this position:".
4. `generateStructured("quiz_generation", aiQuizGenerationSchema)` → the service drops `criterionKeys` from every question and, with criteria, adds `criterionIds` resolved from those keys; a question whose keys are all unknown gets an empty array → `convertToStrictQuestions`.
5. Without criteria the prompt is the one used before: no criteria block, no added field, and the service adds no `criterionIds`. `criterionIds` is an optional field of the flexible schema, so an id the model emitted on its own would be kept.
6. The questions replace the editor content as unsaved changes; the quiz title and time limit come from the form, not from the AI. Save → `upsertQuizAction`.

Single question / preset generation:
1. The AI dialog options, or a preset's fields spread by the preset buttons, → `useAIGeneration.buildParams(type, options)` builds the type-specific `GenerateQuestionParams` (with `previousQuestions` from the editor).
2. `generateNewQuestionAction(params)` → `aiQuizService.generateQuestion` → `generateStructured("question_generation", questionSchemas.flexible)` → strict conversion.
3. Single-question generation never proposes criteria: no criteria list reaches its prompt.
4. The editor prepends the new question, or replaces a regenerated one keeping its `dbId`. Nothing is saved.

Scorecard criteria proposal (editor):
1. `generateScorecardCriteriaAction({ positionId, specificModel? })` loads the position and the names of its active criteria, minuscolized, and `generateScorecardCriteria` calls `generateStructured("scorecard_generation", aiScorecardGenerationSchema)`.
2. `buildScorecardSystemPrompt` fixes the JSON shape of a criterion (`name`, `description`, `category`, `priority`, `weight` 1–5, `expectedLevel` 1–5, `anchors.weak/medium/strong`, `source`) and requires Italian values. `buildScorecardPrompt` lists the position, the names already in the scorecard plus the names of `DEFAULT_SOFT_CRITERIA` as excluded, and asks for at most 12 criteria.
3. Duplicates are handled twice: the prompt forbids the excluded names, and the service discards any proposed criterion whose normalized name (`trim().toLowerCase()`) is already among the existing names. The service filter covers the existing names only; the default soft criteria names are excluded by the prompt alone.
4. The action returns `{ criteria }`: it writes nothing and invalidates nothing. The editor adds only the names not already present as unsaved rows.

Interview guide generation (editor):
1. `generateInterviewGuideAction` loads the position and its active criteria and refuses with `UserError("Crea prima la scheda di valutazione della posizione")` when there are none.
2. `generateInterviewGuide` keys the criteria and calls `generateStructured("guide_generation", aiInterviewGuideGenerationSchema)` with the guide builders.
3. `buildGuidePrompt` lists the criteria with keys, category, priority and expected level, and states the rules: the minutes must add up to the requested duration, only the listed keys may appear in `criterionKeys`, each `must` criterion needs at least one required question, two or three follow-ups per question, and no question about age, family, children, religion or health. That prohibition is prompt text only: nothing filters the result.
4. The service normalizes the output: each section keeps `title` and `kind`, its `minutes` become an integer of at least 1 by rounding, and each question keeps `text`, `followUps`, `anchors`, `required` and receives `criterionIds` resolved from `criterionKeys`, which is dropped. The minutes sum is not corrected.
5. The action returns the proposal: it writes nothing and invalidates nothing. The guide is stored only by "Salva guida".

Assessment evaluation:
1. Per answered question: `evaluateAssessmentAnswerAction(assessmentId, questionId)`. The server reads question and answer from the database (the client sends only ids) and scores 0–10. Multiple choice is scored by the AI, told server-side whether the chosen option is correct.
2. `completeAssessmentEvaluationAction({ assessmentId, questionEvaluations })`: refuses a second evaluation and questions that were not answered, computes `quizScore`, generates the overall evaluation, stores one `Evaluation` (`fitScore / 10`) with `answerEvaluations`, invalidates the evaluation cache.
3. "Ricalcola dettaglio risposte": the client re-evaluates every answer with `evaluateAssessmentAnswerAction`, discards and counts the failed ones (never a fallback 0), then calls `recalculateAnswerEvaluationsAction({ assessmentId, questionEvaluations })`. The service updates `answerEvaluations` only: `evaluation`, `strengths`, `weaknesses`, `recommendation`, `fitScore`, `quizScore`, `criteriaAssessment` and the hiring fields are untouched, and no AI call is made. Its errors are "Test non trovato", "Valutazione non trovata", "Nessuna risposta valutata", "Una o più domande non hanno una risposta".

Resume evaluation (route handler, streamed):
1. POST `{ candidateId, positionId }` → `requireUser()` → `prepareResumeEvaluation` (404 candidate/position missing, 400 no resume or unreadable PDF, 409 already evaluated) extracts the PDF text with `unpdf`.
2. `prepareResumeEvaluation` also loads the active criteria, lists them in the prompt under the exact heading "CRITERI DELLA SCHEDA DI VALUTAZIONE:" with expected level and asks for a `criteriaAssessment` entry per criterion, and returns the `criterionKeys` mapping together with the prompt.
3. `streamText` runs with `temperature: 0, seed: 42` and its output is streamed as plain text. When it ends, `saveResumeEvaluation` parses it with `resumeEvaluationResultSchema` (`overallEvaluationSchema` plus an optional `criteriaAssessment`), stores it (`fitScore / 10`) in the transaction that advances the application to screening, and calls `invalidateEvaluationCacheInRouteHandler`; the stream closes only after that. If parsing or saving fails, the error is logged and the stream fails with `controller.error(new Error("Valutazione generata ma non salvata. Riprova."))`, so the client never sees a silent success.
4. The request body, the HTTP statuses and the streaming contract are unchanged by the per-criterion evaluation: only the `criterionKeys` mapping was added to the save call.

Position description: POST to the generate-description route → `requireUser()` → `streamPositionDescription` (`simple_task`) → `toTextStreamResponse()`.

Transcription: public `transcribeAudioAction(formData)` with the assessment `token` and the audio blob; refused above `MAX_AUDIO_BYTES` (the provider's own limit) or when the assessment no longer `acceptsAnswers()`. A provider failure returns the dedicated transcription message.

## Common mistakes

- Calling `generateText`/`streamText`/`groq()` from an action or service instead of `generateStructured` / `getLanguageModel`.
- Importing `generateStructured` from the AI barrel.
- An evaluation call without `temperature: 0, seed: 42`.
- A new free-text field in a generation prompt not passed through `sanitizeInput()`, or a prompt that does not require Italian output.
- Passing `sanitizeInput` bare to `.map`, or forgetting the explicit cap on a value longer than the default.
- Sanitizing a CV before redacting the birth date, or claiming that a birth date with no marker is removed.
- Adding a server import to the models module (breaks client bundles).
- Writing a model id string outside `LLM_MODELS`.
- Putting criterion ids in a prompt or in an AI output schema instead of the `C1`, `C2` keys.
- Saving or invalidating cache inside a generation action, including the scorecard criteria proposal and the interview guide.
- Trusting client-sent question or answer text for evaluation; only ids come from the client.
- Letting a transcription failure fall through to `describeAIError` instead of the dedicated transcription message.
