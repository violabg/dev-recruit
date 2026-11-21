/**
 * AI Service Prompts
 *
 * Prompt builders of every generation call: questions, quizzes, position
 * descriptions, scorecards, interview guides and kits, decision review.
 * Question and quiz prompts share one set of rules (QUESTION_TYPE_RULES,
 * TECH_CURRENCY_RULES, DIFFICULTY_SCALE) so both paths ask for the same
 * quality.
 */

import type { DecisionOutcomeValue } from "../../schemas";
import type { KeyedCriterion } from "../../utils/criterion-keys";
import type { CriterionDecisionRow } from "../../utils/decision-score";
import { DEFAULT_SOFT_CRITERIA } from "../../utils/scorecard-defaults";
import type { KitGenerationContext } from "../interview-kits";
import type { ActiveCriterion } from "../scorecards";
import type { GenerateInterviewGuideParams } from "./guide-generation";
import { bullets, prompt } from "./prompt-text";
import { sanitizeInput } from "./sanitize";
import type { GenerateScorecardCriteriaParams } from "./scorecard-generation";
import type {
  BaseQuestionParams,
  BehavioralScenarioQuestionParams,
  CodeSnippetQuestionParams,
  GeneratePositionDescriptionParams,
  GenerateQuestionParams,
  GenerateQuizParams,
  MultipleChoiceQuestionParams,
  OpenQuestionParams,
} from "./types";

// ====================
// SHARED RULES
// ====================
// One source for the rules every question prompt (single question and whole
// quiz) applies, so both paths ask for the same quality.

const OUTPUT_LANGUAGE_RULE =
  "JSON field names stay in English; every text value is written in Italian. Code, identifiers and established technical terms (hook, closure, race condition, deadlock, ...) keep their original form.";

/** Keeps generated content on current versions and idioms */
export const TECH_CURRENCY_RULES = prompt`
  Technology currency (questions, options, code, sample answers):
  - Target the current stable major version of every language, framework and library involved (the most recent one you know well) and its current idioms and recommended APIs.
  - Never use deprecated or legacy APIs and patterns (for example React class components and legacy lifecycle methods, \`var\` in JavaScript, callback-style Node.js APIs where a promise API exists, CommonJS where ES modules are the norm, Python 2 idioms, Java without records, \`var\` or switch expressions where they are idiomatic, jQuery for DOM work) UNLESS the recruiter instructions or the required skills explicitly ask for a legacy stack or an older version: then use exactly that version.
  - A question may be about a legacy topic (for example migrating away from a deprecated API) only when that skill is still relevant today.
  - Never invent APIs, options, flags or version numbers: when unsure that a feature exists in the current stable version, use a well-established one.
  - Test behaviour and reasoning, not release trivia: never write a version number in a question unless the skills or the instructions mention it.
  - Current defaults to assume unless told otherwise: Next.js App Router with Server Components, Server Actions and route handlers (the pages router, getServerSideProps and getStaticProps are legacy); React function components with hooks, data loaded on the server or through a data-fetching library rather than fetch inside useEffect; Node.js ES modules with the built-in fetch; TypeScript in strict mode with no \`any\`; Python 3 with type hints; Java 17+ with records; .NET 8+.
`;

const DIFFICULTY_SCALE = prompt`
  Difficulty scale (1-5):
  1. basic concepts and everyday usage
  2. common tasks with the standard APIs
  3. realistic problems that need an understanding of how things work and of the typical pitfalls
  4. non-trivial trade-offs, edge cases, performance, concurrency or security
  5. expert depth: internals, architecture at scale, subtle bugs
  Calibrate on the experience level too: junior = fundamentals used correctly, mid = autonomous work on real features, senior/lead = design decisions, trade-offs and risks.
`;

const QUESTION_TYPE_RULES = {
  multiple_choice: prompt`
    Multiple choice (\`type: "multiple_choice"\`):
    - question: tests applied understanding (what this code/configuration does, which approach fits a concrete situation, what causes a given behaviour), never a definition or the expansion of an acronym. One paragraph; a short inline expression in backticks is allowed, longer code belongs to code_snippet questions.
    - options: exactly 4 Italian strings, mutually exclusive, similar in length and style; exactly one is unambiguously correct; every distractor reflects a real misconception. Never "tutte le precedenti" or "nessuna delle precedenti".
    - correctAnswer: zero-based index (0-3) of the correct option.
    - explanation: why the correct option is right and why the most tempting distractor is wrong. Never refer to options by letter or position: they are shuffled.
  `,
  open_question: prompt`
    Open question (\`type: "open_question"\`):
    - question: asks to explain, compare, justify a decision or describe an approach, preferably starting from a concrete situation. It NEVER asks to write code ("Spiega...", "Confronta...", "Come affronteresti..." are fine; "Scrivi una funzione...", "Implementa..." are not).
    - sampleAnswer: the key points a strong answer covers, compact, usable as grading reference.
    - explanation: what to reward and the most common mistakes.
    - Do not include codeSnippet or sampleSolution.
  `,
  code_snippet: prompt`
    Code question (\`type: "code_snippet"\`):
    - question: states precisely what to do (find and fix the bug, or improve the code) and the expected behaviour; it contains no code and never reveals where the problem is.
    - codeSnippet: self-contained, realistic production-style code (imports included), idiomatic for the current version of the language. It contains NO comment that names or hints at the problem (never "// bug", "// errore", "// fix", "// TODO" or similar): the candidate must find it. The problem must be one that really happens with the current version, not only with old ones.
    - sampleSolution: the complete corrected code (not a diff), correct and runnable, changing only what the task needs plus clearly justified improvements.
    - language: lowercase identifier of the language of BOTH snippets (javascript, typescript, python, java, kotlin, csharp, php, go, rust, ruby, swift, sql, ...).
    - explanation: what was wrong, why the fix works, which alternative fixes are also acceptable.
  `,
  behavioral_scenario: prompt`
    Behavioral scenario (\`type: "behavioral_scenario"\`):
    - question: a realistic situation of a software team (incident, code review, deadline, technical disagreement, onboarding, stakeholder pressure) and how the candidate would act; no code.
    - sampleAnswer: the behaviours a strong answer shows (judgment, communication, collaboration, risk awareness).
    - explanation: what to reward and which answers are red flags.
  `,
} as const;

const COMMON_FIELD_RULES = prompt`
  Every question also has:
  - keywords: 3-6 short terms with the concepts the question verifies.
  - Omit optional fields that do not apply; no extra fields.
`;

const QUALITY_RULES = prompt`
  Quality bar:
  - Practical and job-relevant: what a person in this role meets in real work.
  - Unambiguous: one clear reading, no trick questions, no dependence on undocumented behaviour.
  - Technically exact: if you are not certain an answer is correct, write a different question.
`;

/** Instructions of the recruiter: they win over the default rules */
function recruiterInstructionsBlock(instructions: string | undefined): string {
  const sanitized = instructions ? sanitizeInput(instructions) : "";
  if (!sanitized) return "";
  return prompt`
    Recruiter instructions (follow them; they take precedence over the default rules, for example a requested older version or a specific topic, but never over the output format or the language):
    ${sanitized}
  `;
}

function previousQuestionsBlock(
  previousQuestions: { question: string }[] | undefined,
): string {
  if (!previousQuestions || previousQuestions.length === 0) return "";
  return prompt`
    Avoid repeating these existing questions (do not paraphrase them either; cover different concepts):
    ${bullets(previousQuestions.map((q) => sanitizeInput(q.question)))}
  `;
}

/**
 * Builds common context shared across all question types
 */
function buildCommonContext(params: BaseQuestionParams): string {
  return prompt`
    Position: "${sanitizeInput(params.positionTitle)}" (quiz "${sanitizeInput(params.quizTitle)}")
    - Experience level: ${sanitizeInput(params.experienceLevel)}
    - Required skills: ${params.skills.map((value) => sanitizeInput(value)).join(", ")}
    - Difficulty level: ${params.difficulty || 3}/5

    ${recruiterInstructionsBlock(params.instructions)}

    ${previousQuestionsBlock(params.previousQuestions)}
  `;
}

function buildSingleQuestionSystemPrompt(
  type: keyof typeof QUESTION_TYPE_RULES,
  label: string,
  example: string,
): string {
  return prompt`
    You are a senior technical interviewer writing ${label} questions for developer assessments.

    Answer ONLY with one valid JSON object for a single question (NOT an array). ${OUTPUT_LANGUAGE_RULE}

    ${QUESTION_TYPE_RULES[type]}

    ${COMMON_FIELD_RULES}

    ${QUALITY_RULES}

    ${TECH_CURRENCY_RULES}

    ${DIFFICULTY_SCALE}

    Example Structure:
    ${example}
  `;
}

const MULTIPLE_CHOICE_EXAMPLE = `{"type":"multiple_choice","question":"Devi caricare in parallelo i dati di tre servizi indipendenti e mostrare quelli disponibili anche se uno dei servizi fallisce. Quale approccio è il più adatto?","options":["Usare Promise.allSettled e gestire separatamente i risultati con status \\"rejected\\"","Usare Promise.all, che in caso di errore restituisce comunque i risultati riusciti","Usare Promise.race per ottenere la prima risposta e ignorare le altre","Eseguire le chiamate in sequenza con await dentro un ciclo for"],"correctAnswer":0,"keywords":["Promise.allSettled","concorrenza","gestione errori"],"explanation":"Promise.allSettled attende tutte le promise e riporta l'esito di ciascuna, quindi i dati riusciti restano utilizzabili. Promise.all invece viene rifiutata al primo errore e perde gli altri risultati."}`;

const OPEN_QUESTION_EXAMPLE = `{"type":"open_question","question":"In un'applicazione React con molte pagine, lo stato del carrello viene letto da componenti molto distanti tra loro e i re-render sono diventati un problema. Come decideresti tra Context, una libreria di stato esterna e lo stato del server gestito da una libreria di data fetching? Motiva i trade-off.","keywords":["React","state management","re-render","server state"],"sampleAnswer":"Distingue stato del server (cache, invalidazione: libreria di data fetching) da stato client; spiega che Context ri-renderizza tutti i consumer al cambio di valore e va diviso o memoizzato; propone una libreria con selettori per stato client condiviso e frequente; valuta complessità, DevTools e dimensione del team.","explanation":"Premiare la separazione tra stato server e client e la comprensione del costo dei re-render; errore tipico: mettere tutto in un unico Context."}`;

const CODE_SNIPPET_EXAMPLE = `{"type":"code_snippet","question":"La funzione dovrebbe restituire i dati dell'utente o lanciare un errore se la risposta HTTP non è positiva, ma restituisce sempre dati non validi. Individua e correggi il problema.","codeSnippet":"type User = { id: string; name: string };\\n\\nexport async function fetchUser(userId: string): Promise<User> {\\n  const response = fetch(\`/api/users/\${userId}\`);\\n  const user = await response.json();\\n  return user;\\n}","sampleSolution":"type User = { id: string; name: string };\\n\\nexport async function fetchUser(userId: string): Promise<User> {\\n  const response = await fetch(\`/api/users/\${userId}\`);\\n  if (!response.ok) {\\n    throw new Error(\`Richiesta fallita: \${response.status}\`);\\n  }\\n  return (await response.json()) as User;\\n}","language":"typescript","keywords":["async/await","fetch","gestione errori"],"explanation":"Manca await prima di fetch, quindi response è una Promise e json() non esiste su di essa; inoltre va controllato response.ok. È accettabile anche validare il payload con uno schema."}`;

const BEHAVIORAL_EXAMPLE = `{"type":"behavioral_scenario","question":"Mancano due giorni al rilascio e un collega propone di saltare i test di integrazione per rispettare la scadenza. Come gestisci la situazione?","sampleAnswer":"Valuta il rischio concreto, propone alternative (ridurre lo scope, eseguire i test sui flussi critici, feature flag), comunica rischi e opzioni al team e al responsabile, cerca un accordo esplicito su priorità e responsabilità.","keywords":["gestione del rischio","comunicazione","qualità"],"explanation":"Premiare equilibrio tra urgenza e qualità e la trasparenza verso gli stakeholder; segnale negativo: accettare o rifiutare senza valutare l'impatto."}`;

/** Detail lines of the optional generation settings */
const DISTRACTOR_COMPLEXITY = {
  simple: "distractors clearly wrong for someone who knows the topic",
  moderate: "plausible distractors based on common misconceptions",
  complex:
    "distractors that differ from the correct answer by one subtle detail",
} as const;

const RESPONSE_LENGTH = {
  short: "answerable in 3-5 sentences",
  medium: "answerable in one or two paragraphs",
  long: "needs a structured answer of several paragraphs",
} as const;

const CODE_COMPLEXITY = {
  basic: "8-15 lines, a single function",
  intermediate: "15-30 lines, a few cooperating functions",
  advanced:
    "25-45 lines, several interacting parts (async flow, state, types or concurrency)",
} as const;

const BUG_TYPE = {
  syntax:
    "a compile-time or syntax/type error that developers really make in this language",
  logic: "a logic error (wrong condition, off-by-one, wrong state update, missed edge case)",
  performance:
    "a performance problem (needless work in a loop, N+1 queries, blocking call, missing memoization or index)",
  security:
    "a real vulnerability (injection, missing authorization check, XSS, unsafe deserialization, secret in code)",
} as const;

/** Language identifiers recognised in the skills, most specific first */
const LANGUAGE_HINTS: [RegExp, string][] = [
  [/typescript|\bts\b|angular|nestjs|deno/i, "typescript"],
  [/javascript|\bjs\b|node|react|vue|svelte|next\.?js|express/i, "javascript"],
  [/python|django|flask|fastapi|pandas/i, "python"],
  [/kotlin/i, "kotlin"],
  [/\bjava\b|spring|jakarta|quarkus/i, "java"],
  [/c#|csharp|\.net|asp\.net|blazor/i, "csharp"],
  [/php|laravel|symfony/i, "php"],
  [/golang|^go$|\bgo\b/i, "go"],
  [/rust/i, "rust"],
  [/ruby|rails/i, "ruby"],
  [/swift/i, "swift"],
  [/dart|flutter/i, "dart"],
  [/scala/i, "scala"],
  [/c\+\+|cpp/i, "cpp"],
  [/\bsql\b|postgres|mysql|sql server|oracle/i, "sql"],
];

/**
 * Language of a code question from the skills, or undefined when none of
 * them names a language (the model then picks the most relevant one).
 */
export function inferCodeLanguage(skills: string[]): string | undefined {
  for (const [pattern, language] of LANGUAGE_HINTS) {
    if (skills.some((skill) => pattern.test(skill))) return language;
  }
  return undefined;
}

// ====================
// QUESTION TYPE PROMPT BUILDERS
// ====================

/**
 * Prompt builders for each question type
 */
export const questionPromptBuilders = {
  multiple_choice: {
    system: () =>
      buildSingleQuestionSystemPrompt(
        "multiple_choice",
        "multiple choice",
        MULTIPLE_CHOICE_EXAMPLE,
      ),

    user: (params: MultipleChoiceQuestionParams): string =>
      prompt`
        ${buildCommonContext(params)}

        Additional Requirements:
        ${bullets([
          params.focusAreas?.length &&
            `Focus areas: ${params.focusAreas.map((value) => sanitizeInput(value)).join(", ")}`,
          params.distractorComplexity &&
            `Distractor complexity: ${params.distractorComplexity} (${DISTRACTOR_COMPLEXITY[params.distractorComplexity]})`,
        ]) || "- none"}

        Generate exactly 1 multiple choice question.
      `,
  },

  open_question: {
    system: () =>
      buildSingleQuestionSystemPrompt(
        "open_question",
        "open question",
        OPEN_QUESTION_EXAMPLE,
      ),

    user: (params: OpenQuestionParams): string =>
      prompt`
        ${buildCommonContext(params)}

        Additional Requirements:
        ${bullets([
          "The question must NOT ask to write code: it asks to explain, compare or justify.",
          params.expectedResponseLength &&
            `Expected response length: ${params.expectedResponseLength} (${RESPONSE_LENGTH[params.expectedResponseLength]})`,
          params.evaluationCriteria?.length &&
            `Evaluation criteria: ${params.evaluationCriteria.map((value) => sanitizeInput(value)).join(", ")}`,
        ])}

        Generate exactly 1 open question.
      `,
  },

  code_snippet: {
    system: () =>
      buildSingleQuestionSystemPrompt(
        "code_snippet",
        "code snippet",
        CODE_SNIPPET_EXAMPLE,
      ),

    user: (params: CodeSnippetQuestionParams): string => {
      const language = params.language
        ? sanitizeInput(params.language)
        : inferCodeLanguage(params.skills);
      const bugType = params.bugType?.trim() ? params.bugType : undefined;

      return prompt`
        ${buildCommonContext(params)}

        Additional Requirements:
        ${bullets([
          language
            ? `Programming language: ${language}. Both codeSnippet and sampleSolution are written in ${language} and "language" is "${language}".`
            : "Programming language: the one most relevant to the required skills; both snippets use it and \"language\" names it.",
          bugType
            ? `Question type: bug fixing. Bug type focus: ${bugType} (${BUG_TYPE[bugType]}).`
            : "Question type: code improvement/analysis. The code works but has a clear, gradable problem of readability, robustness or performance; the solution fixes it.",
          params.codeComplexity &&
            `Code complexity: ${params.codeComplexity} (${CODE_COMPLEXITY[params.codeComplexity]})`,
          params.includeComments !== undefined &&
            (params.includeComments
              ? "Include comments: yes, brief comments on intent that never point at the problem"
              : "Include comments: no"),
        ])}

        Generate exactly 1 code snippet question.
      `;
    },
  },

  behavioral_scenario: {
    system: () =>
      buildSingleQuestionSystemPrompt(
        "behavioral_scenario",
        "behavioral scenario",
        BEHAVIORAL_EXAMPLE,
      ),

    user: (params: BehavioralScenarioQuestionParams): string =>
      prompt`
        ${buildCommonContext(params)}

        Additional Requirements:
        ${bullets([
          "No code implementation required.",
          params.expectedResponseLength &&
            `Expected response length: ${params.expectedResponseLength} (${RESPONSE_LENGTH[params.expectedResponseLength]})`,
          params.evaluationCriteria?.length &&
            `Evaluation criteria: ${params.evaluationCriteria.map((value) => sanitizeInput(value)).join(", ")}`,
        ])}

        Generate exactly 1 behavioral scenario question.
      `,
  },
} as const;

/**
 * Builds system and user prompts for a specific question type.
 * Handles type narrowing to ensure proper parameter matching.
 */
export function buildQuestionPrompts(params: GenerateQuestionParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  switch (params.type) {
    case "multiple_choice":
      return {
        systemPrompt: questionPromptBuilders.multiple_choice.system(),
        userPrompt: questionPromptBuilders.multiple_choice.user(params),
      };
    case "open_question":
      return {
        systemPrompt: questionPromptBuilders.open_question.system(),
        userPrompt: questionPromptBuilders.open_question.user(params),
      };
    case "code_snippet":
      return {
        systemPrompt: questionPromptBuilders.code_snippet.system(),
        userPrompt: questionPromptBuilders.code_snippet.user(params),
      };
    case "behavioral_scenario":
      return {
        systemPrompt: questionPromptBuilders.behavioral_scenario.system(),
        userPrompt: questionPromptBuilders.behavioral_scenario.user(params),
      };
    default:
      throw new Error(
        `Unsupported question type: ${(params as GenerateQuestionParams).type}`,
      );
  }
}

// ====================
// QUIZ PROMPT BUILDERS
// ====================

/**
 * Line added to the quiz system prompt only when the position has criteria
 */
const QUIZ_CRITERION_KEYS_FIELD = `
Optional field of every question (only when criteria are provided in the request):
- criterionKeys: array of criterion keys (only when criteria are provided), e.g. ["C1", "C3"]`;

/**
 * Builds the system prompt for quiz generation.
 * With `withCriteria` it also documents the optional criterionKeys field;
 * without it the prompt is unchanged.
 */
export function buildQuizSystemPrompt(withCriteria = false): string {
  const base = buildBaseQuizSystemPrompt();
  return withCriteria ? `${base}\n${QUIZ_CRITERION_KEYS_FIELD}` : base;
}

function buildBaseQuizSystemPrompt(): string {
  return prompt`
    You are a technical recruitment expert and senior technical interviewer specializing in creating assessment quizzes for developers.

    Answer ONLY with one valid JSON object: { "title": string, "questions": [ ... ] }. ${OUTPUT_LANGUAGE_RULE}

    Question types and their fields:

    ${QUESTION_TYPE_RULES.multiple_choice}

    ${QUESTION_TYPE_RULES.open_question}

    ${QUESTION_TYPE_RULES.code_snippet}

    ${QUESTION_TYPE_RULES.behavioral_scenario}

    ${COMMON_FIELD_RULES}

    ${QUALITY_RULES}

    ${TECH_CURRENCY_RULES}

    ${DIFFICULTY_SCALE}

    Example Structure:
    {"title":"Quiz per Sviluppatore Frontend Senior","questions":[${MULTIPLE_CHOICE_EXAMPLE},${CODE_SNIPPET_EXAMPLE}]}
  `;
}

/** A scorecard criterion listed in the quiz prompt under its key (C1, C2, ...) */
export type QuizPromptCriterion = {
  key: string;
  name: string;
  description: string | null;
  category: string;
  priority: string;
};

/**
 * Block appended to the quiz prompt when the position has criteria
 */
function buildQuizCriteriaBlock(keyedCriteria: QuizPromptCriterion[]): string {
  const lines = keyedCriteria.map((criterion) => {
    const description = criterion.description
      ? sanitizeInput(criterion.description)
      : "";
    return `${criterion.key} - ${sanitizeInput(criterion.name)} (${criterion.category}, ${criterion.priority})${
      description ? `: ${description}` : ""
    }`;
  });

  return prompt`
    Evaluation criteria of this position:
    ${bullets(lines)}

    Criteria rules:
    - Every question must list in "criterionKeys" the keys of the criteria it verifies (one to three keys, only keys from the list above).
    - The criteria with priority "must" should be covered by at least one question when the question count allows.
  `;
}

/**
 * Builds the user prompt for quiz generation.
 * With `keyedCriteria` (not empty) it lists the criteria of the position and
 * asks the keys each question verifies; without them the prompt is unchanged.
 */
export function buildQuizPrompt(
  params: GenerateQuizParams,
  keyedCriteria?: QuizPromptCriterion[],
): string {
  const questionTypes = [
    params.includeMultipleChoice && "multiple_choice",
    params.includeOpenQuestions && "open_question",
    params.includeCodeSnippets && "code_snippet",
    params.includeBehavioralScenarios && "behavioral_scenario",
  ].filter((type): type is string => Boolean(type));

  const quizPrompt = prompt`
    Create a technical quiz for the position "${sanitizeInput(params.positionTitle)}" with ${params.questionCount} questions.

    Position Details:
    - Experience Level: ${sanitizeInput(params.experienceLevel)}
    - Required Skills: ${params.skills.map((value) => sanitizeInput(value)).join(", ")}
    ${params.description ? `- Description: ${sanitizeInput(params.description)}` : ""}

    Quiz Requirements:
    - Title: ${sanitizeInput(params.quizTitle)}
    - Number of questions: ${params.questionCount}
    - Difficulty level: ${params.difficulty}/5 (individual questions may vary by one level around it)
    - Question types to include: ${questionTypes.join(", ")}

    ${recruiterInstructionsBlock(params.instructions)}

    ${previousQuestionsBlock(params.previousQuestions)}

    Composition:
    - Use every listed question type at least once when the question count allows, and only the listed types.
    - Spread the questions over the required skills, weighting the most central ones; no two questions test the same concept.
    - Order the questions from easier to harder.

    Generate exactly ${params.questionCount} questions.
  `;

  if (keyedCriteria && keyedCriteria.length > 0) {
    return `${quizPrompt}\n\n${buildQuizCriteriaBlock(keyedCriteria)}`;
  }

  return quizPrompt;
}

// ====================
// POSITION DESCRIPTION PROMPT
// ====================

/**
 * Builds prompt for position description generation
 */
export function buildPositionDescriptionPrompt(
  params: GeneratePositionDescriptionParams,
): string {
  const sanitizedTitle = sanitizeInput(params.title);
  const sanitizedSkills = params.skills.map((value) => sanitizeInput(value)).join(", ");
  const sanitizedSoftSkills = params.softSkills
    ? params.softSkills.map((value) => sanitizeInput(value)).join(", ")
    : "Not specified";
  const sanitizedContract = params.contractType
    ? sanitizeInput(params.contractType)
    : "Not specified";
  const sanitizedCurrentDescription = params.currentDescription
    ? sanitizeInput(params.currentDescription)
    : "";
  const sanitizedInstructions = params.instructions
    ? sanitizeInput(params.instructions)
    : "";

  return prompt`
    You are a senior technical recruiter writing concise Italian job descriptions for a modern tech team.
    Write a short summary (4-8 sentences) of the role: the team context, the main responsibilities, the required experience and the key technologies, named in their current form.
    Do not invent salary, benefits, company name or location; do not use clichés ("ambiente giovane e dinamico") or discriminatory requirements (age, gender, nationality).
    Write only the description text in Italian. Do not include JSON, markdown, or any formatting - just the plain description text.

    Position:
    - Title: ${sanitizedTitle}
    - Experience level: ${sanitizeInput(params.experienceLevel)}
    - Technical skills: ${sanitizedSkills}
    - Soft skills: ${sanitizedSoftSkills}
    - Contract type: ${sanitizedContract}
    ${sanitizedCurrentDescription ? `- Current description (improve it, keep its facts): ${sanitizedCurrentDescription}` : ""}
    ${sanitizedInstructions ? `- Additional instructions: ${sanitizedInstructions}` : ""}
  `;
}


// ====================
// SCORECARD PROMPTS
// ====================

/**
 * System prompt of the scorecard criteria proposal
 */
export function buildScorecardSystemPrompt(): string {
  return prompt`
          You are a senior technical recruiter defining the evaluation scorecard of a job position.

          Answer ONLY with a valid JSON object: { "criteria": [ ... ] }.
          Field names stay in English; EVERY value (name, description, anchors) MUST be written in Italian.

          Each criterion has these fields:
          - name: short Italian name of the criterion
          - description: one Italian sentence describing what is evaluated
          - category: "technical" | "soft" | "culture"
          - priority: "must" (indispensable) | "nice" (preferable)
          - weight: integer from 1 to 5, the relative importance of the criterion
          - expectedLevel: integer from 1 to 5, the level expected for this position
          - anchors: { "weak": string, "medium": string, "strong": string }: how a weak, a medium and a strong answer sound, one or two Italian sentences each
          - source: "skill" for criteria derived from the technical skills, "softSkill" for criteria derived from the soft skills

          Example:
          {
            "criteria": [
              {
                "name": "React",
                "description": "Capacità di progettare componenti React manutenibili",
                "category": "technical",
                "priority": "must",
                "weight": 4,
                "expectedLevel": 4,
                "anchors": {
                  "weak": "Conosce solo la sintassi di base e non sa motivare le scelte.",
                  "medium": "Usa hook e stato in modo corretto in casi comuni.",
                  "strong": "Progetta componenti riutilizzabili e spiega i trade-off di prestazioni."
                },
                "source": "skill"
              }
            ]
          }`;
}

/**
 * User prompt of the scorecard criteria proposal
 */
export function buildScorecardPrompt(
  params: GenerateScorecardCriteriaParams,
): string {
  const sanitizedTitle = sanitizeInput(params.positionTitle);
  const sanitizedLevel = sanitizeInput(params.experienceLevel);
  const sanitizedSkills = params.skills
    .map((value) => sanitizeInput(value))
    .join(", ");
  const sanitizedSoftSkills = params.softSkills
    .map((value) => sanitizeInput(value))
    .join(", ");
  const sanitizedDescription = params.description
    ? sanitizeInput(params.description)
    : "";
  const excludedNames = [
    ...params.existingNames,
    ...DEFAULT_SOFT_CRITERIA.map((criterion) => criterion.name),
  ]
    .map((value) => sanitizeInput(value))
    .filter(Boolean);

  return prompt`
          Position:
          - Title: ${sanitizedTitle}
          - Experience level: ${sanitizedLevel}
          - Technical skills: ${sanitizedSkills || "Not specified"}
          - Soft skills: ${sanitizedSoftSkills || "Not specified"}
          ${sanitizedDescription ? `- Description: ${sanitizedDescription}` : ""}

          Rules:
          1. Propose one technical criterion (category "technical", source "skill") for each relevant technical skill; merge skills that are too close into one criterion.
          2. Propose soft criteria (source "softSkill") from the listed soft skills.
          3. Use category "culture" only when a soft skill is about values or way of working; otherwise use "soft".
          4. Calibrate expectedLevel on the experience level: lower for junior positions, higher for senior positions.
          5. Propose at most 12 criteria; mark "must" only what is truly indispensable for the role.
          6. Technical criteria refer to the current practice of each skill (for example "React moderno: hook, Server Components" rather than old patterns); the anchors describe observable evidence, not generic adjectives.
          7. Write every value in Italian.
          ${
            excludedNames.length > 0
              ? `8. Do not propose criteria named like these, they already exist: ${excludedNames.join(", ")}`
              : ""
          }`;
}

// ====================
// INTERVIEW GUIDE PROMPTS
// ====================

/**
 * System prompt of the interview guide generation
 */
export function buildGuideSystemPrompt(): string {
  return prompt`
          You are an expert interviewer designing a structured interview guide for a job position.

          Answer ONLY with a valid JSON object with this shape:
          {
            "sections": [
              {
                "title": string,
                "minutes": number,
                "kind": "intro" | "experience" | "technical" | "behavioral" | "candidate_questions" | "closing",
                "questions": [
                  {
                    "text": string,
                    "followUps": string[],
                    "criterionKeys": string[],
                    "anchors": { "weak": string, "medium": string, "strong": string },
                    "required": boolean
                  }
                ]
              }
            ]
          }

          Field names stay in English; EVERY value (titles, questions, follow-ups, anchors) MUST be written in Italian.
          "kind" is one of: intro, experience, technical, behavioral, candidate_questions, closing.`;
}

/**
 * User prompt of the interview guide generation
 */
export function buildGuidePrompt(
  params: GenerateInterviewGuideParams,
  keyedCriteria: KeyedCriterion<ActiveCriterion>[],
): string {
  const sanitizedPositionTitle = sanitizeInput(params.positionTitle);
  const sanitizedLevel = sanitizeInput(params.experienceLevel);
  const sanitizedDescription = params.description
    ? sanitizeInput(params.description)
    : "";
  const sanitizedGuideTitle = sanitizeInput(params.title);
  const sanitizedInstructions = params.instructions
    ? sanitizeInput(params.instructions)
    : "";

  const criteriaLines = keyedCriteria
    .map((criterion) => {
      const description = criterion.description
        ? sanitizeInput(criterion.description)
        : "";
      return `- ${criterion.key} - ${sanitizeInput(criterion.name)} (${criterion.category}, ${criterion.priority}, expected level ${criterion.expectedLevel})${
        description ? `: ${description}` : ""
      }`;
    })
    .join("\n");

  return prompt`
          Position:
          - Title: ${sanitizedPositionTitle}
          - Experience level: ${sanitizedLevel}
          ${sanitizedDescription ? `- Description: ${sanitizedDescription}` : ""}

          Interview guide:
          - Title: ${sanitizedGuideTitle}
          - Round: ${params.round}
          - Total duration: ${params.durationMinutes} minutes
          ${sanitizedInstructions ? `- Special instructions: ${sanitizedInstructions}` : ""}

          Evaluation criteria of this position:
${criteriaLines}

          Rules:
          1. Start with an "intro" section and end with a "candidate_questions" section followed by a "closing" section.
          2. The sum of the section minutes must equal the total duration (${params.durationMinutes} minutes).
          3. Every question lists in "criterionKeys" only keys from the list above.
          4. Each criterion with priority "must" has at least one question with "required": true.
          5. Give two or three follow-ups per question.
          6. The anchors describe how a weak, a medium and a strong answer sound.
          7. The intro, candidate_questions and closing sections may have questions with no criteria.
          8. Never ask about age, family, children, religion or health.
          9. Technical questions reflect the current versions and practices of the position's technologies, start from real situations and are open (no yes/no questions).
          10. Write every value in Italian.`;
}

// ====================
// INTERVIEW KIT PROMPTS
// ====================

/** Keys handed to the model instead of ids */
export type KitPromptKeys = {
  criteria: KeyedCriterion<ActiveCriterion>[];
  answers: { key: string; questionId: string }[];
  feedback: { key: string; feedbackId: string }[];
};

/**
 * System prompt of the personalized interview kit generation
 */
export function buildKitSystemPrompt(): string {
  return prompt`
          You are an expert interviewer preparing a personalized interview kit for one candidate.

          Answer ONLY with a valid JSON object with this shape:
          {
            "briefing": string[],
            "hypotheses": [
              { "criterionKey": string, "hypothesis": string, "howToVerify": string }
            ],
            "items": [
              {
                "text": string,
                "followUps": string[],
                "criterionKeys": string[],
                "sectionKind": "intro" | "experience" | "technical" | "behavioral" | "candidate_questions" | "closing",
                "origin": "cv" | "resume_gap" | "quiz_answer" | "previous_round",
                "rationale": string,
                "sourceKey": string (optional),
                "cvQuote": string (optional),
                "anchors": { "weak": string, "medium": string, "strong": string }
              }
            ],
            "suggestedChecklist": [
              { "category": "communicate" | "logistics", "text": string }
            ]
          }

          Field names stay in English; EVERY value (briefing, hypotheses, questions, follow-ups, rationales, anchors, checklist) MUST be written in Italian.
          The personalized questions ADD to the questions of the interview template: they never replace them.
          Never ask about age, marital status, family, children, religion, political opinions or health.
          Always refer to the person as "il candidato": you are never given a name.`;
}

/**
 * User prompt of the personalized interview kit generation
 */
export function buildKitPrompt(
  context: KitGenerationContext,
  keys: KitPromptKeys,
  cap: number,
): string {
  const criterionKey = new Map(
    keys.criteria.map((criterion) => [criterion.id, criterion.key]),
  );
  const answerKey = new Map(
    keys.answers.map((answer) => [answer.questionId, answer.key]),
  );
  const feedbackKey = new Map(
    keys.feedback.map((feedback) => [feedback.feedbackId, feedback.key]),
  );

  const sanitizedTitle = sanitizeInput(context.position.title);
  const sanitizedLevel = sanitizeInput(context.position.experienceLevel);
  const sanitizedSkills = context.position.skills.map((skill) =>
    sanitizeInput(skill),
  );
  const sanitizedSoftSkills = context.position.softSkills.map((skill) =>
    sanitizeInput(skill),
  );

  const sectionLines = context.sections
    .map(
      (section) =>
        `- ${sanitizeInput(section.title)} (kind: ${section.kind}, ${section.minutes} min)`,
    )
    .join("\n");
  const kinds = [...new Set(context.sections.map((section) => section.kind))];

  const criteriaLines = keys.criteria
    .map((criterion) => {
      const description = criterion.description
        ? sanitizeInput(criterion.description)
        : "";
      return `- ${criterion.key}: ${sanitizeInput(criterion.name)} (${criterion.category}, ${criterion.priority}, peso ${criterion.weight}, livello atteso ${criterion.expectedLevel})${
        description ? ` — ${description}` : ""
      }`;
    })
    .join("\n");

  const gapLines = context.resumeCriteriaGaps
    .flatMap((gap) => {
      const key = criterionKey.get(gap.criterionId);
      if (!key) return [];
      return [
        gap.score === null
          ? `- ${key}: nessuna evidenza nel CV (atteso ${gap.expectedLevel})`
          : `- ${key}: punteggio CV ${gap.score} (atteso ${gap.expectedLevel})`,
      ];
    })
    .join("\n");

  const weaknessLines = context.resumeWeaknesses
    .map((weakness) => `- ${weakness}`)
    .join("\n");

  const answerLines = context.weakAnswers
    .flatMap((answer) => {
      const key = answerKey.get(answer.questionId);
      if (!key) return [];
      const weaknesses = answer.weaknesses.length
        ? ` — debolezze: ${answer.weaknesses.join("; ")}`
        : "";
      return [
        `- ${key}: domanda: ${answer.question} — risposta: ${answer.answer} — punteggio ${answer.score}/10${weaknesses}`,
      ];
    })
    .join("\n");

  const roundLines = context.previousRounds
    .map((round) => {
      const feedbackKeys = round.feedbackIds
        .map((id) => feedbackKey.get(id))
        .filter((key): key is string => Boolean(key));
      const criteria = round.criteria
        .flatMap((entry) => {
          const key = criterionKey.get(entry.criterionId);
          if (!key) return [];
          return [
            entry.status === "no_evidence"
              ? `${key}: senza prove`
              : `${key}: voti discordanti (${entry.scores.join(", ")})`,
          ];
        })
        .join("; ");
      return `- Schede ${feedbackKeys.join(", ")}${criteria ? ` — ${criteria}` : " — nessun criterio da approfondire"}`;
    })
    .join("\n");

  return prompt`
          Position:
          - Title: ${sanitizedTitle}
          - Experience level: ${sanitizedLevel}
          - Skills: ${sanitizedSkills.join(", ")}
          - Soft skills: ${sanitizedSoftSkills.join(", ")}

          Interview: round ${context.interview.round}, ${context.interview.durationMinutes} minutes.

          Sections of the interview (from the template):
${sectionLines}

          Evaluation criteria of this position:
${criteriaLines}

          CV of il candidato:
          ${context.resumeText ?? "CV non disponibile"}

          Weaknesses from the CV evaluation:
${weaknessLines || "(nessuna)"}

          Criteria without evidence or below the expected level in the CV:
${gapLines || "(nessuno)"}

          Weak answers of the test (key Q<n>):
${answerLines || "(nessuna)"}

          Previous interview rounds (scorecard keys F<n>):
${roundLines || "(nessuno)"}

          Rules:
          1. Propose at most ${cap} personalized questions: together they take at most 30-40% of the interview time. They are added to the template questions, never replace them.
          2. Each question has two or three follow-ups.
          3. "criterionKeys" uses only keys from the criteria list above.
          4. "origin" is one of cv, resume_gap, quiz_answer, previous_round, and "rationale" explains why the question is asked (for example: "nel test ha sbagliato la domanda Q4 sulla concorrenza").
          5. "sourceKey" is the Q<n> or F<n> key the question comes from, when there is one.
          6. For questions with origin cv or resume_gap, "cvQuote" quotes the CV passage (at most 300 characters).
          7. The anchors describe how a weak, a medium and a strong answer sound.
          8. "sectionKind" is one of: ${kinds.join(", ")}.
          9. "briefing" has exactly 5 short points about il candidato.
          10. Each hypothesis has a "criterionKey" from the list, the hypothesis and how to verify it.
          11. "suggestedChecklist" items have category communicate or logistics.
          12. Never ask about age, marital status, family, children, religion, political opinions or health.
          13. Ground every question in the given sources: never invent CV facts. Technical questions reflect the current practice of the position's technologies.
          14. Write every value in Italian.`;
}

// ====================
// DECISION REVIEW PROMPTS
// ====================

export type DecisionReviewPromptInput = {
  positionTitle: string;
  outcome: DecisionOutcomeValue;
  rationale?: string;
  rows: { key: string; row: CriterionDecisionRow; interviewerCount: number }[];
  globals: { cv: number | null; test: number | null };
  overall: number | null;
};

const DECISION_OUTCOME_PROMPT_LABELS: Record<DecisionOutcomeValue, string> = {
  offer: "Offerta",
  hired: "Assunzione",
  rejected: "Scarto",
};

/**
 * System prompt of the devil's advocate on a hiring decision
 */
export function buildDecisionReviewSystemPrompt(): string {
  return prompt`
          Sei l'avvocato del diavolo di una decisione di assunzione.
          Il tuo compito è argomentare CONTRO la decisione proposta: elenca da 3 a 5 motivi per cui potrebbe essere sbagliata.

          Rispondi SOLO con un oggetto JSON valido con questa forma:
          {
            "reasons": [
              { "title": string, "explanation": string, "criterionKeys": string[] }
            ]
          }

          Regole:
          1. Da 3 a 5 motivi, ciascuno con un titolo breve e una spiegazione concreta.
          2. In "criterionKeys" usa solo le chiavi dei criteri elencati (C1, C2, ...); lascia la lista vuota se il motivo non riguarda un criterio.
          3. Basa gli argomenti solo sui dati forniti: criteri senza prove, voti discordanti tra intervistatori, criteri indispensabili sotto il livello atteso, punteggi globali.
          4. Non argomentare e non menzionare mai età, famiglia, stato civile, figli, religione, opinioni politiche o salute.
          5. I nomi dei campi JSON restano in inglese; OGNI valore deve essere scritto in italiano.`;
}

/**
 * User prompt of the devil's advocate: per-criterion statistics only, never
 * the candidate's identity, the CV text or the interviewers' names and notes
 */
export function buildDecisionReviewPrompt(
  input: DecisionReviewPromptInput,
): string {
  const rationale = input.rationale
    ? sanitizeInput(input.rationale, 5000)
    : "nessuna motivazione";

  const criteriaLines = input.rows
    .map(({ key, row, interviewerCount }) => {
      const priority =
        row.criterion.priority === "must" ? "indispensabile" : "preferibile";
      const flags = [
        row.hasEvidence ? "" : " | senza prove",
        row.disagreement ? " | voti discordanti" : "",
        row.criterion.archived ? " | archiviato" : "",
      ].join("");
      return `- ${key}: ${sanitizeInput(row.criterion.name)} | priorità ${priority} | peso ${row.weight ?? "n/d"} | livello atteso ${row.criterion.expectedLevel} | CV ${row.cv ?? "—"} | Test ${row.test ?? "—"} | Colloqui ${row.interviewerMean ?? "—"} (${interviewerCount} intervistatori)${flags}`;
    })
    .join("\n");

  return prompt`
          Posizione: ${sanitizeInput(input.positionTitle)}
          Decisione proposta: ${DECISION_OUTCOME_PROMPT_LABELS[input.outcome]}
          Motivazione: ${rationale}
          Punteggio complessivo: ${input.overall ?? "non calcolabile"}/5

          Criteri:
${criteriaLines || "(nessuno)"}

          Punteggi globali (non inclusi nella media): CV ${input.globals.cv ?? "—"}, Test ${input.globals.test ?? "—"}`;
}
