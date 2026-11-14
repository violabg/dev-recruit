---
title: "question schemas"
tier: "PerContext"
keywords: ["zod","schema","question","flexible","strict","dbId","question type"]
intent: "When touching question shapes, quiz editor validation, AI question output, DB to form mapping, or adding a question type."
editable: true
---
# Question schemas

All Zod schemas live in the shared schema modules and are imported through their barrel. Zod itself is documented elsewhere; this document holds only this project's rules.

## Question types and fields

`QuestionType` (Prisma enum and `baseSchemas.questionType`): `multiple_choice`, `open_question`, `code_snippet`, `behavioral_scenario`.

All types: `question` (required), `keywords?`, `explanation?`.

| Type | Required | Optional |
|---|---|---|
| `multiple_choice` | `options` (at least 4, each at least 3 characters), `correctAnswer` (integer 0–3, index into `options`) | |
| `open_question` | `sampleAnswer` | `sampleSolution`, `codeSnippet` |
| `code_snippet` | `codeSnippet`, `sampleSolution`, `language` | |
| `behavioral_scenario` | `sampleAnswer` | |

The `question` text of a code snippet holds no code; the code goes in `codeSnippet`.

## Flexible vs strict

`questionSchemas` exposes `strict`, `flexible`, `base` and one schema per type (`multipleChoice`, `openQuestion`, `codeSnippet`, `behavioralScenario`).

| | `questionSchemas.flexible` → `FlexibleQuestion` | `questionSchemas.strict` → `Question` |
|---|---|---|
| Shape | one object, every field optional except `type` and `question`; extra rules only for multiple choice | discriminated union of the four types, all required fields enforced |
| Ids | `dbId?` (the `Question` row id) and `isFavorite?` | none: parsing strips `dbId` and `isFavorite` |
| Used by | AI output schema, quiz editor form (`quizEditorSchema`), save action (`saveQuizSchema`), `syncQuizQuestions` | normalizing AI output only (`convertToStrictQuestions`) |

- `dbId`, not `id`: react-hook-form `useFieldArray` adds its own `id` to every item. `SavedQuestion` = `FlexibleQuestion` with a required `dbId`.
- A strict `Question` is always an unsaved question; anything that must keep the database link works with `FlexibleQuestion` / `SavedQuestion`.
- `convertToStrictQuestion(s)` fills missing fields, then parses strict (throws `ZodError` if still invalid):

| Type | Missing field | Default |
|---|---|---|
| `open_question`, `behavioral_scenario` | `sampleAnswer` | `"Risposta di esempio da fornire"` |
| `code_snippet` | `sampleSolution` | `"// Soluzione di esempio da fornire"` |
| `code_snippet` | `codeSnippet` | `"// Snippet di codice da fornire"` |
| `code_snippet` | `language` | `"javascript"` |
| `multiple_choice` | — | none |

```ts
// AI path: flexible output validated by generateStructured, then normalized
const output = await generateStructured({ task: "quiz_generation", schema: aiQuizGenerationSchema, /* … */ });
return { questions: convertToStrictQuestions(output.questions) };

// Save path: flexible only
const parsed = saveQuizSchema.safeParse(input); // questions: z.array(questionSchemas.flexible).min(1)
```

Type guards `isMultipleChoiceQuestion`, `isOpenQuestion`, `isCodeSnippetQuestion` check only `type`; on a `FlexibleQuestion` they narrow without validating the fields. `behavioral_scenario` has no guard and no exported per-type type: compare `type === "behavioral_scenario"` directly.

## Mapping database ↔ form

- Database → form: `mapQuizQuestionsToFlexible(quizQuestions)` returns `SavedQuestion[]` (`dbId` = row id, null strings → `undefined`). It does not sort: load with `orderBy: { order: "asc" }`.
- Form → database: `prepareQuestionForCreate(question, userId)` and `prepareQuestionForUpdate(question)`, called only by `syncQuizQuestions`. Update never changes `isFavorite` (only `toggleQuestionFavoriteAction` does) or `createdBy`.

## Schema rules

- Define every schema in the shared schemas; forms and actions import them. No inline `z.object` in components, hooks or actions.
- Zod is globally configured with the Italian locale (`z.config(it())`, loaded once per runtime by the server and client instrumentation), so default messages are Italian.
- Custom messages override the locale and are shown to users verbatim (as form errors, and as the action error for the first Zod issue): write them in Italian.

## Adding a question type

Change all of these, then search the code for an existing type name (e.g. `behavioral_scenario`) to catch every per-type branch:

1. Prisma `enum QuestionType` (and `Question` columns if new fields), regenerate the client.
2. `baseSchemas.questionType`.
3. Question schemas: new `<x>QuestionSchema = baseQuestionSchema.extend({ type: z.literal(...) })`, add it to the strict union and to `questionSchemas`, export its type and an `is<X>Question` guard only when code must narrow on the new type, add defaults in `convertToStrictQuestion`; new fields also in `flexible` (and its `superRefine` if they have rules).
4. New fields: `mapQuizQuestionsToFlexible`, `prepareQuestionForCreate`, `prepareQuestionForUpdate`, explicit Prisma `select`s.
5. Whole-quiz generation: `include<X>` flag in the quiz generation config schema, in `GenerateQuizParams`, in `buildQuizPrompt` and `buildQuizSystemPrompt`, and in `QuizGenerationForm`.
6. Single-question generation: `<X>QuestionParams` in the `GenerateQuestionParams` union, `questionPromptBuilders.<x>` and `buildQuestionPrompts`, `create<X>Params` and `createQuestionParams`, the type switch in `useAIGeneration`, `questionGenerationOptionsSchema` and `AIQuestionGenerationDialog` if it has its own options.
7. Presets: preset form options and fields, preset detail page.
8. Editor: `createEmptyQuestion`, an editor form component, `QuestionItem` rendering, `questionTypes` and `getQuestionTypeLabel`.
9. Read-only quiz view: a display component and the quiz questions view.
10. Interview: the answer input in `InterviewQuestion`, and `answerToText` if the stored answer is not plain text.
11. Evaluation: a branch in `buildAnswerEvaluationPrompt`; results UI in `InterviewResultsClient`.
12. Tests for the schemas, mocks and prompt helpers.

## Common mistakes

- Validating the editor or the save path with `strict`: it rejects partially filled questions and drops `dbId`, which turns updates into creates.
- Using `id` for the database id of a question.
- Assuming `flexible` guarantees a valid question: only multiple-choice options are checked.
- Expecting `mapQuizQuestionsToFlexible` to order questions.
- Writing a custom Zod message in English.
