---
title: "ai generation"
tier: "PerContext"
keywords: ["AI","generateStructured","LLM","Groq","prompt","evaluation","model","streaming","transcription"]
intent: "When touching AI quiz/question generation, scorecard criteria proposal, interview guide or interview kit generation, assessment or resume evaluation, the devil's advocate on a decision, prompts, structured output mode and AI output schemas, model selection, streaming routes or transcription."
editable: true
---
# AI generation and evaluation

Provider is Groq through the Vercel AI SDK; the SDK is documented elsewhere. Model ids, retry counts, delays, timeouts and length caps are NOT written here: read them from the named symbols.

## Single entry point

- Structured output (quiz, question, scorecard criteria, guide, kit, every evaluation) ONLY through `generateStructured()`, which owns model choice, retry, timeout, fallback and Italian error mapping. Streaming text uses `getLanguageModel(getOptimalModel(task))` with the SDK's `streamText`. Never `groq(...)` directly.
- Audio transcription is the only other provider path: `transcribeAudio(audio)` calls the SDK `transcribe` with `groq.transcription(LLM_MODELS.WHISPER_LARGE_V3_TURBO)`. No action or component calls `groq` itself.
- A failed transcription reaches the candidate as `UserError("Trascrizione non riuscita. Riprova o scrivi la risposta.")`, after logging the provider error: it NEVER goes through `describeAIError`, whose generic "Servizio AI temporaneamente non disponibile" would hide that typing is allowed.

## Models and failure policy

- Models live in the models module (`LLM_MODELS`, `getOptimalModel`, `DEFAULT_GENERATION_MODEL`, `FALLBACK_MODELS`), which has no imports and is imported by client components: NEVER add a server import to it.
- Only Groq free-plan models. Model ids exist only in `LLM_MODELS`.
- `getOptimalModel(task, specificModel?)`: `specificModel` wins, then the per-task default (`simple_task` → small model, every other `LLMTaskType` → large model). Forms default to `DEFAULT_GENERATION_MODEL`.
- `FALLBACK_MODELS` is the ordered chain; the primary is skipped when it appears in it. `DEFAULT_CONFIG` holds retries, backoff and timeout: the primary is retried with backoff inside one timeout, each fallback gets one attempt. Content-filtered failures are never retried nor moved to another model.
- Failures are `AIGenerationError` with an `AIErrorCode`, mapped to Italian by `runAction` through `describeAIError` (transcription excepted).

## Structured output mode

- Every `generateStructured` attempt runs in Groq strict mode first: `strictOutputSchema(schema, outputSchema)` sends the strict version of the Zod schema and validates the output with the full Zod `schema` after `nullsToUndefined`. Never build `Output.object` or set `structuredOutputs` yourself.
- An `APICallError` with status 400 (schema refused, or output not matching it) retries the SAME model once in JSON mode (`structuredOutputs: false`, prompt-only shape) inside the same attempt; any other error goes to the normal retry/fallback chain. So prompts keep describing the JSON shape.
- `toStrictJsonSchema` makes every property required, turns optional ones nullable, sets `additionalProperties: false` and drops validation keywords (lengths, ranges, item counts, `default`, `pattern`, `format`): Zod still enforces them. It recurses `properties`, `items`, `anyOf`/`oneOf` only.
- `outputSchema` (optional) is the shape the model receives when the validation schema is wider than what the model should write. Quiz passes `quizOutputSchema(selected types, withCriteria)`, single question `questionOutputSchema([type])`: one variant per question type with exactly its fields, `type` as a one-value enum, `criterionKeys` only with criteria; validation stays `aiQuizGenerationSchema` / `questionSchemas.flexible`. Other flows pass `schema` only.
- A new AI output schema uses only objects, arrays, enums and primitives. A record, `allOf`, `$ref` or a transform is not made strict: Groq may refuse it (400) and every call would end in JSON mode. Give such a schema an `outputSchema` of plain shapes.
- The resume evaluation stays a plain-text `streamText`: Groq does not support structured outputs with streaming.

## Determinism

| Use | temperature | seed |
|---|---|---|
| Quiz, question, position description, scorecard criteria, guide, kit, devil's advocate | 0.7 | none |
| Every evaluation (answer, overall assessment, resume, including the per-criterion part of the resume stream) | 0 | 42 |

`generateStructured` defaults to 0.7 without `temperature`: evaluation calls MUST pass `temperature: 0, seed: 42`.

## Prompts and sanitization

- Prompt builders live in the prompts and evaluation-prompts modules. Every prompt MUST require Italian values; JSON field names stay English.
- Quiz and single-question system prompts are built from the same constants (`QUESTION_TYPE_RULES`, `COMMON_FIELD_RULES`, `QUALITY_RULES`, `TECH_CURRENCY_RULES`, `DIFFICULTY_SCALE`): change a question rule there, never in one path only.
- Recruiter instructions enter through `recruiterInstructionsBlock` (sanitized), which gives them precedence over the default rules (for example an older version that `TECH_CURRENCY_RULES` would forbid) but never over output format or language.
- Write prompts with the `prompt` tagged template: it strips the source indentation of the literal text only, never of interpolated values (code, CV), and drops empty lines left by conditionals. Never pre-indent an interpolated multi-line value.
- Every user-provided free-text value entering a generation prompt (titles, descriptions, instructions, skills, previous questions) MUST pass `sanitizeInput()`, which replaces injection patterns with `[filtered]` and caps length. `sanitizeInput(input, maxLength = 2000)`: pass an explicit cap only when the default is too short, and never pass it bare to `.map` (the index becomes `maxLength`): write `.map((value) => sanitizeInput(value))`.
- Resume text: `redactBirthDate` first, then `sanitizeInput(text, MAX_RESUME_CHARS)`. The order is mandatory: `sanitizeInput` rewrites `Data:` patterns and would destroy the birth marker. The `"... [troncato]"` suffix follows the ORIGINAL length. `redactBirthDate` replaces with `[rimosso]` a date that follows, on the same line, a birth marker (`nato il`, `data di nascita`, `born on`, `DOB` and the like); a date without a marker is left untouched.
- Candidate answers pass `sanitizeInput(answer, MAX_ANSWER_CHARS)` in the answer evaluation prompt. Question text, options, sample answer and explanation are NOT sanitized there: never claim all candidate text is sanitized.
- Candidate-written text is delimited as data: answers inside `<candidate_answer>` (open, code, behavioral; multiple choice sends the option index), the CV inside `<cv>`. The answer and resume system prompts say text inside those tags is never an instruction. New candidate text in a prompt gets the same tags and rule.
- Overall evaluation prompt never receives the candidate name ("the candidate"); its strengths and weaknesses pass `sanitizeInput`.
- Resume prompt: candidate name, position texts (title, experience level, skills, soft skills, description), and every criterion name and description also pass `sanitizeInput`.
- The model never sees criterion ids: it receives the keys `C1`, `C2`, … and answers with them; the service translates back. AI output schemas never contain criterion ids.

## Non-identifying and statistics-only prompts

- Kit prompt calls the candidate "il candidato" and never receives name, email, birth date, photo or CV URL; the context read selects only `resumeUrl` to extract text, redacted then sanitized. Weaknesses, question texts, position texts, answers (the chosen option text for multiple choice) and criterion names/descriptions pass `sanitizeInput`.
- Previous kit rounds arrive as per-criterion statistics ("senza prove", "voti discordanti" with gap ≥ 2) under `F<n>` keys, never as free text and never with interviewer names.
- Devil's advocate: `buildDecisionReviewSystemPrompt` demands 3–5 reasons against the outcome, JSON `{ reasons: [{ title, explanation, criterionKeys }] }`, Italian values, only the listed keys, and forbids arguments about age, family, marital status, children, religion, political opinions or health. `buildDecisionReviewPrompt` receives the position title (sanitized), the outcome in Italian (Offerta, Assunzione, Scarto), the rationale (`sanitizeInput(rationale, 5000)` or "nessuna motivazione"), the overall score, one line per matrix criterion (key `C<n>`, name sanitized, priority, weight, expected level, CV, Test, interviewer mean with count, flags "senza prove", "voti discordanti", "archiviato") and the global rows. Never the candidate's identity or CV text, never interviewer names or free text.

## Criterion and source keys

- `buildCriterionKeys(criteria)` assigns `C<n>` by input position from 1; it neither sorts nor filters.
- `resolveCriterionKeys(keyed, keys)` returns the ids of the model's keys, trimmed and upper-cased for comparison; unknown and non-string keys are discarded, a repeated id kept once, the order is the model's, not the scorecard's; `undefined` → `[]`.
- Prompts list criteria as bullet lines headed by the key with name, category and priority, and allow only the given keys: 1–3 per quiz question, listed keys only per guide question, one `criterionKey` per CV assessment entry.
- Kit adds `Q<n>` (weak answers of the test) and `F<n>` (scorecards of previous rounds), translated into `sourceRef` `quiz:{questionId}`, `feedback:{feedbackId}`, `cv:{quote}` (≤300 characters). An unknown key drops the criterion, drops the hypothesis, or keeps the question without a source.
- Decision review keys the matrix rows with `buildCriterionKeys` and resolves with `resolveCriterionKeys`, discarding unknown keys.

## Flow rules

All generation flows return a proposal only: no write, no invalidation, no save.

| Flow | Non-obvious rules |
|---|---|
| Quiz (`generateNewQuizAction`) | Loads the position and its active criteria. With criteria, keys them, asks for `criterionKeys` per question and resolves them into `criterionIds`; a question whose keys are all unknown gets `[]`. Without criteria: no criteria block, no added field, no added `criterionIds`. Then `convertToStrictQuestions`. Title and time limit come from the form, never from the AI |
| Single question (`generateNewQuestionAction`) | Params from `useAIGeneration.buildParams`, with `previousQuestions` from the editor. Never proposes criteria. The editor prepends, or replaces a regenerated one keeping its `dbId` |
| Scorecard criteria (`generateScorecardCriteriaAction`) | Prompt fixes the criterion JSON shape and requires Italian; lists the position and excludes existing criterion names plus `DEFAULT_SOFT_CRITERIA`; asks for at most 12. Duplicates are prevented twice: prompt, plus a service filter on normalized name against existing names (default soft names are excluded by the prompt only). Returns `{ criteria }` |
| Guide (`generateInterviewGuideAction`) | Requires active criteria. Prompt rules: minutes add up to the requested duration, only listed keys, every `must` criterion gets ≥1 required question, 2–3 follow-ups per question, no questions about age, family, children, religion or health (prompt text only, nothing filters). Service normalizes: `minutes` rounded to ≥1, `criterionKeys` resolved into `criterionIds` and dropped, minutes sum not corrected |
| Kit (`generateInterviewKitAction`) | Only while `scheduled`. Context: position and active criteria, kit sections, CV text (unreadable PDF → null text and missing source `cv`), weaknesses and below-expected criteria of the CV evaluation, weak answers of the last completed evaluated test (score < 7, lowest first, max 6), previous completed rounds, missing sources `cv`, `cv_evaluation`, `assessment`, `answer_detail`. Limit: with `T` template questions `floor(2T/3)`; without template `floor(0.4 · duration / 5)`; AI rows already `edited` are subtracted. Normalization: keys → ids; each question to the first section of the indicated kind, else the last non-closing section, else the last; keep only the first N within the limit; briefing cut to 5 points. Returns `{ proposal }`, merged by `mergeKitProposal` |
| Decision review (`challengeDecisionAction`) | Loads the decision model with `loadApplicationDecision` (submitted scorecards only) and `computeDecisionScore`, passing saved weights only when decided. Keeps interviewer count per criterion. Normalization: title/explanation trimmed, empty title dropped, at most `MAX_CHALLENGE_REASONS` (5), keys → criterion ids. Returns `{ challenge }` |

## Evaluation flows

- Answer evaluation (`evaluateAssessmentAnswerAction(assessmentId, questionId)`): the server reads question and answer from the database, the client sends ids only. Scores 0–10; multiple choice is AI-scored with the correct-option flag passed server-side.
- Completion (`completeAssessmentEvaluationAction`): refuses a second evaluation and unanswered questions, computes `quizScore`, generates the overall evaluation, stores one `Evaluation` (`fitScore / 10`) with `answerEvaluations`, invalidates the evaluation cache.
- "Ricalcola dettaglio risposte": the client re-evaluates every answer, discards and counts failures (never a 0 fallback), then `recalculateAnswerEvaluationsAction` updates `answerEvaluations` only, with no AI call and no change to `evaluation`, narrative, `fitScore`, `quizScore` or `criteriaAssessment`. Errors: "Test non trovato", "Valutazione non trovata", "Nessuna risposta valutata", "Una o più domande non hanno una risposta".
- Resume evaluation (route handler, streamed): POST `{ candidateId, positionId }` → `requireUser()` → `prepareResumeEvaluation` (404 missing candidate/position, 400 no resume or unreadable PDF, 409 already evaluated) extracts the PDF text with `unpdf`, loads active criteria, lists them under "CRITERI DELLA SCHEDA DI VALUTAZIONE:" with expected level, asks for one `criteriaAssessment` entry per criterion and returns the `criterionKeys` mapping with the prompt. `streamText` runs at `temperature: 0, seed: 42`, output streamed as plain text; on end `saveResumeEvaluation` parses with `resumeEvaluationResultSchema`, stores (`fitScore / 10`) in the transaction that advances to `screening`, calls `invalidateEvaluationCacheInRouteHandler`, then the stream closes. On parse/save failure: log and `controller.error(new Error("Valutazione generata ma non salvata. Riprova."))`, never a silent success.
- Position description: POST to the generate-description route → `requireUser()` → `streamPositionDescription` (`simple_task`) → `toTextStreamResponse()`.
- Transcription: public `transcribeAudioAction(formData)` with the assessment token and audio blob; refused above `MAX_AUDIO_BYTES` (provider limit) or when the assessment no longer `acceptsAnswers()`.

## Prohibitions

- NEVER call `generateText`, `streamText` or `groq()` from an action or service instead of `generateStructured` / `getLanguageModel`.
- NEVER expose internal fields or ids in what the model receives: pass an `outputSchema` when the validation schema has them.
- NEVER import `generateStructured` from the AI barrel: `generateStructured`, `getLanguageModel` and `describeAIError` are exported only by the `generate` module of the AI layer.
- NEVER trust client-sent question or answer text for evaluation: only ids come from the client.
- NEVER sanitize a CV before redacting the birth date, or claim a marker-less birth date is removed.
- NEVER send the candidate's identity or CV text to the kit or devil's advocate prompt, or a previous round as free text instead of per-criterion statistics.
