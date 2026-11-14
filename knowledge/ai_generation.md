---
title: "ai generation"
tier: "PerContext"
keywords: ["AI","generateStructured","LLM","Groq","prompt","evaluation","model","streaming","transcription"]
intent: "When touching AI quiz/question generation, interview or resume evaluation, prompts, model selection, streaming routes or transcription."
editable: true
---
# AI generation and evaluation

The provider is Groq through the Vercel AI SDK. SDK APIs are in the official docs (context7); this document holds only this project's rules.

## Single entry point

- Structured output (quiz, question, every evaluation) goes ONLY through `generateStructured()`. It owns model choice, retry, timeout, fallback and the Italian error mapping.
- Streaming text uses `getLanguageModel(getOptimalModel(task))` with the SDK's `streamText`. Never call `groq(...)` directly.
- `generateStructured`, `getLanguageModel` and `describeAIError` are exported only by the `generate` module of the AI layer, not by the AI barrels (`ai/index`, `ai-service`).

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
- Only models of Groq's free plan are used. `getOptimalModel(task, specificModel?)`: `specificModel` wins; `simple_task` → `openai/gpt-oss-20b`; every other task (`quiz_generation`, `question_generation`, `evaluation`, `overall_evaluation`, `resume_evaluation`) → `openai/gpt-oss-120b`. Forms default to `DEFAULT_GENERATION_MODEL` (gpt-oss-120b).
- Fallback chain (`FALLBACK_MODELS`): `openai/gpt-oss-20b`, then `qwen/qwen3.8-27b`, skipping the primary.
- `DEFAULT_CONFIG`: primary model retried up to 3 times with backoff 1 s, 2 s, 4 s; the 60 s timeout bounds the primary's whole retry sequence; each fallback gets one attempt bounded by 60 s. Content-filtered failures are never retried or sent to another model.
- Failures are `AIGenerationError` with an `AIErrorCode`; `runAction` turns them into Italian messages through `describeAIError`.
- Audio transcription uses `LLM_MODELS.WHISPER_LARGE_V3_TURBO`.

## Determinism

| Use | temperature | seed |
|---|---|---|
| Quiz generation, question generation, position description | 0.7 | none |
| Every evaluation (answer, overall interview, resume) | 0 | 42 |

`generateStructured` defaults to 0.7 when `temperature` is omitted: evaluation calls MUST pass `temperature: 0, seed: 42`.

## Prompts: Italian and sanitization

- Prompt builders live in the prompts module (generation) and the evaluation-prompts module. Every prompt MUST require Italian for all generated values; JSON field names stay in English.
- Every user-provided free-text value that goes into a generation prompt (titles, descriptions, instructions, skills, previous questions) MUST pass through `sanitizeInput()` (replaces prompt-injection patterns with `[filtered]`, cuts at 2000 characters).
- Resume text is cut at `MAX_RESUME_CHARS` (80,000).

## Flows

Quiz generation (editor):
1. `QuizGenerationForm` → `generateNewQuizAction(input)` (validated with `generateQuizSchema`; loads the position).
2. `aiQuizService.generateQuiz` → `generateStructured("quiz_generation", aiQuizGenerationSchema)` → `convertToStrictQuestions`.
3. The questions replace the editor content as unsaved changes; the quiz title and time limit come from the form, not from the AI. Save → `upsertQuizAction`.

Single question / preset generation:
1. The AI dialog options, or a preset's fields spread by the preset buttons, → `useAIGeneration.buildParams(type, options)` builds the type-specific `GenerateQuestionParams` (with `previousQuestions` from the editor).
2. `generateNewQuestionAction(params)` → `aiQuizService.generateQuestion` → `generateStructured("question_generation", questionSchemas.flexible)` → strict conversion.
3. The editor prepends the new question, or replaces a regenerated one keeping its `dbId`. Nothing is saved.

Interview evaluation:
1. Per answered question: `evaluateInterviewAnswerAction(interviewId, questionId)`. The server reads question and answer from the database (the client sends only ids) and scores 0–10. Multiple choice is scored by the AI, told server-side whether the chosen option is correct.
2. `completeInterviewEvaluationAction({ interviewId, questionEvaluations })`: refuses a second evaluation and questions that were not answered, computes `quizScore`, generates the overall evaluation, stores one `Evaluation` (`fitScore / 10`), invalidates the evaluation cache.

Resume evaluation (route handler, streamed):
1. POST `{ candidateId, positionId }` → `requireUser()` → `prepareResumeEvaluation` (404 candidate/position missing, 400 no resume or unreadable PDF, 409 already evaluated) extracts the PDF text with `unpdf`.
2. The model output is streamed as plain text; when it ends, `saveResumeEvaluation` parses it with `overallEvaluationSchema`, stores it (`fitScore / 10`) and calls `invalidateEvaluationCacheInRouteHandler`, before the stream closes.

Position description: POST to the generate-description route → `requireUser()` → `streamPositionDescription` (`simple_task`) → `toTextStreamResponse()`.

Transcription: public `transcribeAudioAction(formData)` with the interview `token` and the audio blob; refused above 25 MB or when the interview no longer `acceptsAnswers()`.

## Common mistakes

- Calling `generateText`/`streamText`/`groq()` from an action or service instead of `generateStructured` / `getLanguageModel`.
- Importing `generateStructured` from the AI barrel.
- An evaluation call without `temperature: 0, seed: 42`.
- A new free-text field in a generation prompt not passed through `sanitizeInput()`, or a prompt that does not require Italian output.
- Adding a server import to the models module (breaks client bundles).
- Saving or invalidating cache inside a generation action.
- Trusting client-sent question or answer text for evaluation; only ids come from the client.
