---
title: "question schemas"
tier: "PerContext"
keywords: ["zod","schema","question","flexible","strict","dbId","question type"]
intent: "When touching question shapes, quiz editor validation, AI question output, DB to form mapping, or adding a question type."
editable: true
---
# Question schemas

## Question types and fields

`QuestionType` (Prisma enum and `baseSchemas.questionType`): `multiple_choice`, `open_question`, `code_snippet`, `behavioral_scenario`. All types: `question` (required), `keywords?`, `explanation?`, `criterionIds?`.

| Type | Required | Optional |
|---|---|---|
| `multiple_choice` | `options` (≥4, each ≥3 characters), `correctAnswer` (integer 0–3, INDEX into `options`) | |
| `open_question` | `sampleAnswer` | `sampleSolution`, `codeSnippet` |
| `code_snippet` | `codeSnippet`, `sampleSolution`, `language` | |
| `behavioral_scenario` | `sampleAnswer` | |

- The `question` text of a code snippet holds no code; the code goes in `codeSnippet`.
- `criterionIds` are the scorecard criteria the question verifies in one quiz. They belong to the quiz-question link, never to `Question`: two quizzes may use the same question with different criteria, or none. Declared on the base schema, so it exists in `flexible` and in all four strict schemas; the strict parse keeps it while dropping `dbId` and `isFavorite`.

## Flexible vs strict

`questionSchemas` exposes `strict`, `flexible`, `base` and one schema per type (`multipleChoice`, `openQuestion`, `codeSnippet`, `behavioralScenario`).

| | `flexible` → `FlexibleQuestion` | `strict` → `Question` |
|---|---|---|
| Shape | one object, every field optional except `type` and `question`; extra rules only for multiple choice | discriminated union of the four types, all required fields enforced |
| Ids | `dbId?` (the row id) and `isFavorite?`; `criterionIds?` | none for the row: parsing strips `dbId` and `isFavorite` |
| Used by | AI output schema, editor form (`quizEditorSchema`), save (`saveQuizSchema`), `syncQuizQuestions` | normalizing AI output only (`convertToStrictQuestions`) |

- `dbId`, not `id`: react-hook-form `useFieldArray` adds its own `id`. `SavedQuestion` = `FlexibleQuestion` with a required `dbId`.
- A strict `Question` is always unsaved; anything that must keep the database link uses `FlexibleQuestion` / `SavedQuestion`.
- `convertToStrictQuestion(s)` fills missing fields, then parses strict (throws `ZodError` if still invalid). Defaults: `open_question`/`behavioral_scenario` `sampleAnswer` → `"Risposta di esempio da fornire"`; `code_snippet` `sampleSolution` → `"// Soluzione di esempio da fornire"`, `codeSnippet` → `"// Snippet di codice da fornire"`, `language` → `"javascript"`; `multiple_choice` has none.
- The generated-quiz AI schema is a separate composition: `questionSchemas.flexible.and(z.object({ criterionKeys: z.array(z.string()).optional() }))`. The intersection inside `z.array` is mandatory (the flexible schema is refined and cannot be extended). `criterionKeys` exists only there; the service translates it into `criterionIds` and removes it before the editor.
- Type guards `isMultipleChoiceQuestion`, `isOpenQuestion`, `isCodeSnippetQuestion` check only `type` and do not validate fields. `behavioral_scenario` has none: compare `type === "behavioral_scenario"`.

## Mapping database ↔ form

- Database → form: `mapQuizQuestionsToFlexible(quizQuestions)` → `SavedQuestion[]` (`dbId` = row id, null strings → `undefined`). It reads `criterionIds` from the link, so its input type requires that field. It does not sort: load with `orderBy: { order: "asc" }`.
- Form → database: `prepareQuestionForCreate(question, userId)` and `prepareQuestionForUpdate(question)`, called only by `syncQuizQuestions`. They build the row field by field and never write `criterionIds` (written on the link). Update never changes `isFavorite` (only `toggleQuestionFavoriteAction` does) or `createdBy`.

## Schema rules

- Every schema is defined in the shared schemas and imported by forms and actions; no inline `z.object` in components, hooks or actions.
- Zod is configured with the Italian locale (`z.config(it())`, loaded once per runtime by the server and client instrumentation), so default messages are Italian. Custom messages override the locale and are shown verbatim (form error, and the action error for the first issue): write them in Italian.
- The guide schema imports the anchors schema directly from the scorecard module, never from the barrel, to avoid a cycle.

## Adding a question type

Search the code for an existing type name to catch every per-type branch. The branches a naive change misses: Prisma `enum QuestionType` and its client, `baseSchemas.questionType`, the strict union and `questionSchemas`, the defaults in `convertToStrictQuestion`, `flexible` and its `superRefine` for new fields, a link `select` that includes `criterionIds`, the generation config and both prompt builders, `<X>QuestionParams` in the `GenerateQuestionParams` union with its prompt builder and `useAIGeneration` switch, `createEmptyQuestion`, `getQuestionTypeLabel`, the read-only quiz view, the answer input in `AssessmentQuestion` with `answerToText`, `buildAnswerEvaluationPrompt` with the results UI, and the tests.

## Prohibitions

- NEVER validate the editor or the save path with `strict`: it rejects partial questions and drops `dbId`, turning updates into creates.
- NEVER use `id` for the database id of a question.
- NEVER assume `flexible` guarantees a valid question: only multiple-choice options are checked.
- NEVER extend the refined `flexible` schema with `.extend()`: intersect it.
- NEVER write `criterionIds` on the `Question` row, or select links without `criterionIds`.
