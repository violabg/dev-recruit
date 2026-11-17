---
title: "question schemas"
tier: "PerContext"
keywords: ["zod","schema","question","flexible","strict","dbId","question type"]
intent: "When touching question shapes, quiz editor validation, AI question output, DB to form mapping, or adding a question type."
editable: true
---
# Question schemas

All Zod schemas live in the shared schema modules and are imported through their barrel. Zod itself is documented elsewhere.

## Question types and fields

`QuestionType` (Prisma enum and `baseSchemas.questionType`): `multiple_choice`, `open_question`, `code_snippet`, `behavioral_scenario`.

All types: `question` (required), `keywords?`, `explanation?`, `criterionIds?`.

| Type | Required | Optional |
|---|---|---|
| `multiple_choice` | `options` (≥4, each ≥3 characters), `correctAnswer` (integer 0–3, index into `options`) | |
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
- The generated-quiz AI schema is a separate composition: each question is `questionSchemas.flexible.and(z.object({ criterionKeys: z.array(z.string()).optional() }))`. The intersection inside `z.array` is mandatory (the flexible schema is refined and cannot be extended). `criterionKeys` exists only there; the service translates it into `criterionIds` and removes it before the editor.
- Type guards `isMultipleChoiceQuestion`, `isOpenQuestion`, `isCodeSnippetQuestion` check only `type` and do not validate fields. `behavioral_scenario` has no guard and no exported per-type type: compare `type === "behavioral_scenario"`.

```ts
// AI path: flexible output, then normalized
const output = await generateStructured({ task: "quiz_generation", schema: aiQuizGenerationSchema });
return { questions: convertToStrictQuestions(output.questions) };

// Save path: flexible only
const parsed = saveQuizSchema.safeParse(input); // questions: z.array(questionSchemas.flexible).min(1)
```

## Mapping database ↔ form

- Database → form: `mapQuizQuestionsToFlexible(quizQuestions)` → `SavedQuestion[]` (`dbId` = row id, null strings → `undefined`). It reads `criterionIds` from the link, so its input type requires that field. It does not sort: load with `orderBy: { order: "asc" }`.
- Form → database: `prepareQuestionForCreate(question, userId)` and `prepareQuestionForUpdate(question)`, called only by `syncQuizQuestions`. They build the row field by field and never write `criterionIds` (that is written on the link). Update never changes `isFavorite` (only `toggleQuestionFavoriteAction` does) or `createdBy`.

## Schema rules

- Every schema is defined in the shared schemas; forms and actions import them. No inline `z.object` in components, hooks or actions.
- Zod is configured with the Italian locale (`z.config(it())`, loaded once per runtime by the server and client instrumentation), so default messages are Italian.
- Custom messages override the locale and are shown verbatim (form error, and the action error for the first issue): write them in Italian.
- Scorecard, guide and evaluation schemas are ordinary shared schemas with no extra rule. The guide schema imports the anchors schema directly from the scorecard module, never from the barrel, to avoid a cycle.

## Adding a question type

Change all of these, then search the code for an existing type name to catch every per-type branch:

1. Prisma `enum QuestionType` (and columns if new fields), regenerate the client.
2. `baseSchemas.questionType`.
3. Question schemas: `<x>QuestionSchema = baseQuestionSchema.extend({ type: z.literal(...) })`, add to the strict union and to `questionSchemas`, export its type and an `is<X>Question` guard only when code must narrow, add defaults in `convertToStrictQuestion`; new fields also in `flexible` (and its `superRefine` if they have rules).
4. New fields: `mapQuizQuestionsToFlexible`, `prepareQuestionForCreate`, `prepareQuestionForUpdate`, explicit Prisma `select`s. A link select must include `criterionIds`.
5. Whole-quiz generation: `include<X>` flag in the generation config schema, `GenerateQuizParams`, both prompt builders, `QuizGenerationForm`.
6. Single-question generation: `<X>QuestionParams` in the `GenerateQuestionParams` union, `questionPromptBuilders.<x>`, `buildQuestionPrompts`, `create<X>Params`, `createQuestionParams`, the `useAIGeneration` switch, `questionGenerationOptionsSchema` and the dialog if it has own options.
7. Presets: form options and fields, detail page.
8. Editor: `createEmptyQuestion`, editor form component, `QuestionItem` rendering, `questionTypes`, `getQuestionTypeLabel`.
9. Read-only quiz view: display component and questions view.
10. Assessment: answer input in `AssessmentQuestion`, `answerToText` if the answer is not plain text.
11. Evaluation: branch in `buildAnswerEvaluationPrompt`, results UI in `AssessmentResultsClient`.
12. Tests for the schemas, the mocks and the prompt helpers.

## Prohibitions

- NEVER validate the editor or the save path with `strict`: it rejects partial questions and drops `dbId`, turning updates into creates.
- NEVER use `id` for the database id of a question.
- NEVER assume `flexible` guarantees a valid question: only multiple-choice options are checked.
- NEVER expect `mapQuizQuestionsToFlexible` to order questions.
- NEVER write a custom Zod message in English.
- NEVER write `criterionIds` on the `Question` row or in `syncQuizQuestions` instead of the link, or select links without `criterionIds`.
- NEVER extend the refined `flexible` schema with `.extend()`: intersect it.
