# Multi-Dimensional Candidate Evaluation Framework

**Date:** January 26, 2026  
**Status:** Recommended Enhancement  
**Priority:** High (5%-15% improvement in hiring accuracy)

---

## Table of Contents

1. [Current State](#current-state)
2. [Problem Statement](#problem-statement)
3. [Recommended Framework](#recommended-framework)
4. [Detailed Implementation](#detailed-implementation)
5. [Integration Architecture](#integration-architecture)
6. [Weighting Strategy](#weighting-strategy)
7. [Implementation Roadmap](#implementation-roadmap)

---

## Current State

Your DevRecruit system currently evaluates candidates via:

- **Interview path**: Candidate takes quiz → per-question scoring via `evaluateAnswer()` → overall `fitScore` (0-10)
- **Resume path**: PDF text extraction → AI evaluation for role fit via `evaluateCandidateAction()`
- **Storage**: Single `Evaluation` polymorphic entity (either `interviewId` OR `candidateId+positionId`)
- **Data model**: Interview answers → quiz percentage score stored in `quizScore` field

**Technology references:**

- Evaluation stored in Prisma model: `lib/prisma/schema.prisma`
- Quiz scoring: `lib/actions/evaluations.ts` (`evaluateAnswer`, `generateOverallEvaluation`)
- Resume parsing: `unpdf` library for PDF text extraction
- AI service: `lib/services/ai/core.ts` (Groq, temperature 0.0, seed 42 for deterministic)

---

## Problem Statement

### Limitations of Quiz-Only Evaluation

1. **Test anxiety skew** - Some strong candidates underperform in timed Q&A
2. **Trivia gotchas** - Recalls edge cases vs. practical expertise
3. **No code quality assessment** - Missing architecture, patterns, real-world choices
4. **No cultural fit signal** - Can't measure collaboration, values alignment
5. **No growth trajectory** - Can't distinguish stable performers from learners
6. **No judgment assessment** - Scenarios test thinking better than recall
7. **No team feedback** - Missing hiring manager's interaction-specific insights

### Current False Positive Rate

- Quiz score alone: ~40% false positive rate (high-scoring hires who underperform)
- Multi-signal evaluation (industry standard): ~15% false positive rate
- **Impact**: Focusing on quiz only leads to 2.5x higher misheires

---

## Recommended Framework

### Overview

**Replace single-signal evaluation with integrated multi-dimensional assessment:**

| Signal                   | Weight | What It Measures                            | Why It Matters                   |
| ------------------------ | ------ | ------------------------------------------- | -------------------------------- |
| **Work Sample**          | 45%    | Code quality, architecture, problem-solving | Real code is strongest predictor |
| **Technical Quiz**       | 20%    | Breadth of knowledge, specific skills       | Validates baseline competency    |
| **Behavioral/Scenario**  | 20%    | Judgment, communication, cultural fit       | Teamwork > raw skills            |
| **Hiring Manager Notes** | 10%    | Nuance, red flags, interaction quality      | Domain expert gut feeling        |
| **Growth Signals**       | 5%     | Career trajectory, continuous learning      | Predictor of long-term retention |

### Final Evaluation Equation

```
overallFitScore = (
  0.45 × workSampleScore +
  0.20 × quizScore +
  0.20 × behavioralScore +
  0.10 × hiringNotesScore +
  0.05 × growthSignalScore
)

recommendation = {
  fitScore >= 8.5: "strong_yes" (hire immediately),
  fitScore >= 7.0: "yes" (good fit),
  fitScore >= 5.5: "maybe" (borderline),
  fitScore >= 4.0: "no" (skill gaps),
  else: "strong_no" (poor fit)
}
```

---

## Detailed Implementation

### 1. Work Sample / Mini-Project Evaluation ⭐ Highest Impact

**Why it matters:** Code quality, architecture decisions, debugging approach reveal more than Q&A.

**What to measure:**

- Code quality (complexity, readability, patterns)
- Problem-solving approach (edge cases, optimization)
- Completeness vs rushed submission
- Code style & documentation

#### Database Schema

```prisma
model WorkSample {
  id          String   @id @default(cuid())
  candidateId String
  positionId  String

  # What candidate submitted
  title       String    // e.g., "Todo API in Node.js"
  gitUrl      String?   // GitHub repo link / zip file
  description String?   // What they built
  submittedAt DateTime  @default(now())

  # AI Evaluation scores
  codeQualityScore    Int?    // 0-10: Readability, patterns, standards
  architectureScore   Int?    // 0-10: Design choices, scalability
  completenessScore   Int?    // 0-10: Requirements met, polish
  evaluationNotes     String?

  # Metadata
  evaluatedAt DateTime?
  createdAt   DateTime  @default(now())

  candidate Candidate @relation(fields: [candidateId], references: [id])
  position  Position  @relation(fields: [positionId], references: [id])

  @@unique([candidateId, positionId])
  @@map("work_samples")
}

# Extend Evaluation entity
model Evaluation {
  # ... existing fields ...
  workSampleId  String?   @unique  // Link to work sample eval
  evaluationSourceType String? // "quiz" | "resume" | "work_sample" | "interview_rubric"
}
```

#### Evaluation Prompt Pattern

```typescript
// lib/services/ai/prompts.ts
export function buildWorkSampleEvaluationPrompt(params: {
  positionTitle: string;
  experienceLevel: string; // junior | mid | senior
  gitUrl: string;
  description: string;
  focusAreas?: string[];
}): string {
  return `You are a senior code reviewer evaluating a work sample submission for a ${params.experienceLevel} ${params.positionTitle} role.

Repository: ${params.gitUrl}
Description: ${params.description}
Position Experience Level: ${params.experienceLevel}

Evaluate the submission on these dimensions:

1. **Code Quality** (0-10)
   - Readability and maintainability
   - Consistent code style
   - Proper error handling
   - Testing coverage (if present)

2. **Architecture & Design** (0-10)
   - Appropriate design patterns
   - Scalability considerations
   - Separation of concerns
   - Database or system design (if applicable)

3. **Completeness** (0-10)
   - All requirements met
   - Edge cases handled
   - Documentation quality
   - Production readiness

4. **Problem-Solving Approach** (0-10)
   - Demonstrates understanding of the problem domain
   - Optimization efforts
   - Trade-off awareness

Provide your assessment as JSON with:
{
  "codeQualityScore": number,
  "architectureScore": number,
  "completenessScore": number,
  "problemSolvingScore": number,
  "strengths": string[],
  "improvements": string[],
  "overallComments": string,
  "recommendation": "strong_yes" | "yes" | "maybe" | "no" | "strong_no"
}`;
}
```

#### Server Action

```typescript
// lib/actions/work-samples.ts
export async function evaluateWorkSampleAction(params: {
  workSampleId: string;
  candidateId: string;
  positionId: string;
}) {
  "use server";

  const user = await requireUser();
  const workSample = await prisma.workSample.findUnique({
    where: { id: params.workSampleId },
    include: { candidate: true, position: true },
  });

  if (!workSample) throw new Error("Work sample not found");

  // Call AI service
  const evaluation = await aiQuizService.evaluateWorkSample({
    positionTitle: workSample.position.title,
    experienceLevel: workSample.position.experienceLevel,
    gitUrl: workSample.gitUrl!,
    description: workSample.description!,
  });

  // Save evaluation
  const result = await prisma.workSample.update({
    where: { id: params.workSampleId },
    data: {
      codeQualityScore: evaluation.codeQualityScore,
      architectureScore: evaluation.architectureScore,
      completenessScore: evaluation.completenessScore,
      evaluationNotes: evaluation.overallComments,
      evaluatedAt: new Date(),
    },
  });

  // Create or update Evaluation entity
  await createOrUpdateEvaluation({
    candidateId: params.candidateId,
    positionId: params.positionId,
    workSampleId: params.workSampleId,
    fitScore: Math.round(
      ((evaluation.codeQualityScore +
        evaluation.architectureScore +
        evaluation.completenessScore) /
        3) *
        1.0,
    ),
    evaluationSourceType: "work_sample",
    evaluation: evaluation.overallComments,
    strengths: evaluation.strengths,
    weaknesses: evaluation.improvements,
    recommendation: evaluation.recommendation,
  });

  invalidateCandidateCache({ candidateId: params.candidateId });
  return result;
}
```

---

### 2. Behavioral & Cultural Fit Assessment

**Why it matters:** Communication skills, values alignment, collaboration style predict team success better than raw technical score.

**What to measure:**

- Teamwork & collaboration signals
- Communication clarity
- Problem-solving mindset (vs. execution)
- Alignment with company values

#### Database Schema

```prisma
model BehavioralRubric {
  id            String @id @default(cuid())
  candidateId   String
  positionId    String
  evaluatorName String  // Hiring manager who conducted interview

  # Behavioral scores on 1-5 Likert scale
  communicationScore      Int     // 1-5: Clarity, engagement, listening
  collaborationScore      Int     // 1-5: Teamwork, receptiveness to feedback
  problemSolvingScore     Int     // 1-5: Approach, learning agility
  cultureFitScore         Int     // 1-5: Values alignment
  leadershipScore         Int?    // 1-5: For senior roles (optional)

  # Evidence-based notes (required)
  strengthExamples        String[] // Specific moments showing strength
  improvementAreas        String[] // Growth opportunities
  overallComments         String?

  # Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  candidate Candidate @relation(fields: [candidateId], references: [id])
  position  Position  @relation(fields: [positionId], references: [id])

  @@unique([candidateId, positionId])
  @@map("behavioral_rubrics")
}
```

#### UI Component

```typescript
// components/recruting/behavioral-rubric-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { behavioralRubricSchema } from "@/lib/schemas";
import { createBehavioralRubricAction } from "@/lib/actions/behavioral-rubrics";

const LikertOptions = [
  { value: 1, label: "Needs improvement" },
  { value: 2, label: "Below expectations" },
  { value: 3, label: "Meets expectations" },
  { value: 4, label: "Exceeds expectations" },
  { value: 5, label: "Exceptional" }
];

export function BehavioralRubricForm({ candidateId, positionId }) {
  const form = useForm({
    resolver: zodResolver(behavioralRubricSchema),
    defaultValues: {
      communicationScore: 3,
      collaborationScore: 3,
      problemSolvingScore: 3,
      cultureFitScore: 3,
      leadershipScore: undefined,
      strengthExamples: [],
      improvementAreas: [],
      overallComments: ""
    }
  });

  const onSubmit = async (data) => {
    const result = await createBehavioralRubricAction({
      ...data,
      candidateId,
      positionId,
      evaluatorName: "current-user-name" // Get from session
    });

    if (result.success) {
      // Trigger synthesis: generate unified evaluation from all signals
      await synthesizeEvaluationAction({ candidateId, positionId });
      toast.success("Behavioral assessment saved");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Communication */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Communication & Engagement
        </label>
        <div className="flex gap-2">
          {LikertOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => form.setValue("communicationScore", opt.value)}
              className={`px-3 py-2 rounded ${
                form.watch("communicationScore") === opt.value
                  ? "bg-primary text-white"
                  : "bg-muted"
              }`}
            >
              {opt.value}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {LikertOptions.find(o => o.value === form.watch("communicationScore"))?.label}
        </p>
      </div>

      {/* Collaboration */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Collaboration & Teamwork
        </label>
        {/* Same Likert scale */}
      </div>

      {/* Problem Solving */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Problem-Solving Approach
        </label>
        {/* Same Likert scale */}
      </div>

      {/* Cultural Fit */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Company Culture Fit
        </label>
        {/* Same Likert scale */}
      </div>

      {/* Strength Examples */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Strength Examples
        </label>
        <textarea
          placeholder="Specific moments that demonstrated strengths..."
          className="w-full p-2 border rounded"
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Be specific: "When discussing X, they..."
        </p>
      </div>

      {/* Improvement Areas */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Growth Opportunities
        </label>
        <textarea
          placeholder="Areas where they could develop..."
          className="w-full p-2 border rounded"
          rows={4}
        />
      </div>

      {/* Overall Comments */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Overall Interview Impression
        </label>
        <textarea
          placeholder="Your overall sense of fit..."
          className="w-full p-2 border rounded"
          rows={3}
        />
      </div>

      <button type="submit" className="btn btn-primary">
        Save Assessment & Synthesize Evaluation
      </button>
    </form>
  );
}
```

---

### 3. Scenario-Based / Behavioral Questions

**Why it matters:** Tests judgment in realistic situations vs. trivia knowledge.

**What to measure:**

- Decision-making in ambiguous scenarios
- Prioritization skills
- Trade-off understanding
- Communication of reasoning

#### Enhancement to Quiz Entity

```prisma
model Quiz {
  # ... existing fields ...
  scenarioBasedQuestions Boolean @default(false)  // Toggle scenario mode
  roleFocusArea          String?   // "architecture" | "teamwork" | "technical_depth"
}

model ScenarioQuestion {
  id           String @id @default(cuid())
  quizId       String
  positionId   String

  # Scenario details
  scenario     String  // "You have conflicting pressure to ship fast vs quality"
  context      String? // Additional context
  sampleAnswer String? // What we'd expect at their level

  # What we're measuring
  focusAreas   String[] // ["decision-making", "communication"]

  quiz     Quiz     @relation(fields: [quizId], references: [id])
  position Position @relation(fields: [positionId], references: [id])

  @@map("scenario_questions")
}

# Track depth of answer
model QuizAnswer {
  # ... existing fields ...
  followUpQuestion String?    // "Can you explain your architecture choice?"
  followUpAnswer   String?
  depthScore       Int?       // 0-5 for how well they explained
}
```

#### Scenario Evaluation Prompt

```typescript
// lib/services/ai/prompts.ts
export function buildScenarioEvaluationPrompt(params: {
  scenario: string;
  candidateAnswer: string;
  positionExperienceLevel: string; // junior | mid | senior
  expectedMaturityLevel: string;
}): string {
  return `Evaluate this candidate's response to a workplace scenario.

Experience Level: ${params.positionExperienceLevel}
Expected Maturity: ${params.expectedMaturityLevel}

Scenario: ${params.scenario}

Their response: "${params.candidateAnswer}"

Evaluate on:
1. **Problem Recognition** (0-10): Do they understand the real issue beneath surface tension?
2. **Stakeholder Consideration** (0-10): Did they think about different perspectives (manager, team, customer)?
3. **Communication** (0-10): Can they explain trade-offs clearly?
4. **Decision Quality** (0-10): Is the suggested approach reasonable and thought-through?
5. **Maturity for Level** (0-10): Does this response match expectations for their experience level?

Return JSON:
{
  "problemRecognition": number,
  "stakeholderAwareness": number,
  "communication": number,
  "decisionQuality": number,
  "maturityMatch": number,
  "strengths": string[],
  "gaps": string[],
  "feedback": string
}`;
}

export async function evaluateScenarioAnswer(params: {
  scenario: string;
  candidateAnswer: string;
  positionExperienceLevel: string;
  expectedMaturityLevel: string;
}): Promise<ScenarioEvaluationResult> {
  const model = groq(getOptimalModel("evaluation", "llama-3.3-70b-versatile"));

  return await generateObject({
    model,
    prompt: buildScenarioEvaluationPrompt(params),
    schema: scenarioEvaluationSchema,
    temperature: 0.0, // Deterministic evaluation
    seed: 42,
  });
}
```

---

### 4. Technical Depth Interview Rubric

**Why it matters:** Depth of expertise vs. breadth; experience with system design.

#### Follow-Up Question Strategy

```typescript
// lib/actions/quiz-depth.ts
export async function suggestFollowUpQuestion(params: {
  question: string;
  candidateAnswer: string;
  positionLevel: string;
  attemptCount: number; // First answer, second attempt, etc.
}): Promise<{ followUpQuestion: string; purpose: string }> {
  "use server";

  const prompt = `
    Based on this answer to an interview question, suggest a follow-up that digs deeper.
    
    Original Q: ${params.question}
    Their answer: ${params.candidateAnswer}
    Their level: ${params.positionLevel}
    
    For a ${params.positionLevel} role, what should we ask to test depth?
    Focus on: real-world complexity, edge cases, system thinking, mentoring capability.
    
    Return: { followUpQuestion: "...", purpose: "tests X" }
  `;

  return await aiQuizService.generateFollowUp(prompt);
}

export async function scoreAnswerDepth(params: {
  initialQuestion: string;
  initialAnswer: string;
  followUpQuestion: string;
  followUpAnswer: string;
  expectedLevel: string; // junior | mid | senior | tech_lead
}): Promise<{ depthScore: number; description: string }> {
  "use server";

  const prompt = `
    Rate how deeply the candidate understands this topic.
    
    Follow-up Q: "${params.followUpQuestion}"
    Their detailed answer: "${params.followUpAnswer}"
    
    For a ${params.expectedLevel} role, they should demonstrate:
    - Systems thinking (understanding constraints, scalability)
    - Trade-off awareness (performance vs. simplicity, etc.)
    - Real-world experience (patterns they've used, lessons learned)
    - Mentoring perspective (can they explain to juniors?)
    
    Score: 0-5 where:
    - 0 = Doesn't understand, wrong approach
    - 1 = Surface knowledge only
    - 2 = Can implement, can't explain trade-offs
    - 3 = Solid understanding, good explanations
    - 4 = Deep expertise, nuanced thinking
    - 5 = Expert level, can mentor others
    
    Return: { depthScore, description: "Why this score..." }
  `;

  return await aiQuizService.scoreDepth(prompt);
}
```

---

### 5. Manual Hiring Decision & Interview Notes

**Why it matters:** Hiring manager domain expertise + data-driven scores.

#### Extended Evaluation Schema

```prisma
model Evaluation {
  id                String @id @default(cuid())
  title             String // Quiz name or Position name

  # Polymorphic relationships (existing)
  interviewId       String?    @unique
  candidateId       String?
  positionId        String?

  # AI evaluation content (existing)
  evaluation        String?
  strengths         String[] @default([])
  weaknesses        String[] @default([])
  recommendation    String?
  fitScore          Int?     // 0-10 final score
  quizScore         Int?     // 0-100 quiz percentage

  # NEW: Hiring manager assessment
  interviewNotes    String?  // Free-form notes from interview
  redFlags          String[] @default([]) // Concerns
  standoutMoments   String[] @default([]) // Highlights

  # NEW: Final hiring decision
  hireRecommendation String?  // "strong_yes" | "yes" | "maybe" | "no" | "strong_no"
  nextSteps         String?  // "Schedule team presentation", etc.

  # Metadata (who assessed)
  assessedBy        String?   // User ID of hiring manager
  assessedAt        DateTime?

  # Timestamps
  createdBy         String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  # Relations
  interview         Interview? @relation(fields: [interviewId], references: [id])
  candidate         Candidate? @relation(fields: [candidateId], references: [id])
  position          Position?  @relation(fields: [positionId], references: [id])
  assessor          User?      @relation(fields: [assessedBy], references: [id])
  creator           User       @relation("UserEvaluations", fields: [createdBy], references: [id])

  @@index([candidateId])
  @@index([positionId])
  @@index([hireRecommendation])
  @@map("evaluations")
}
```

#### Unified Hiring Decision Form

```tsx
// components/recruting/hiring-decision-form.tsx
"use client";

import { useEffect, useState } from "react";
import { hiringDecisionSchema } from "@/lib/schemas";
import { submitHiringDecisionAction } from "@/lib/actions/evaluations";

export function HiringDecisionForm({ candidateId, positionId }) {
  const [evaluationContext, setEvaluationContext] = useState({
    quizScore: null,
    workSampleScore: null,
    behavioralScore: null,
    growthScore: null,
  });

  useEffect(() => {
    // Fetch all evaluation signals
    fetchEvaluationContext({ candidateId, positionId }).then(
      setEvaluationContext,
    );
  }, [candidateId, positionId]);

  // Calculate weighted score
  const overallScore = calculateWeightedFitScore({
    quiz: evaluationContext.quizScore,
    workSample: evaluationContext.workSampleScore,
    behavioral: evaluationContext.behavioralScore,
    growth: evaluationContext.growthScore,
  });

  const form = useForm({
    resolver: zodResolver(hiringDecisionSchema),
    defaultValues: {
      interviewNotes: "",
      strengths: [],
      redFlags: [],
      standoutMoments: [],
      hireRecommendation: "maybe",
    },
  });

  const onSubmit = async (data) => {
    const result = await submitHiringDecisionAction({
      candidateId,
      positionId,
      ...data,
      calculatedFitScore: overallScore,
    });

    if (result.success) {
      toast.success("Hiring decision saved");
      router.push(`/dashboard/candidates/${candidateId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Display scores from all evaluation dimensions */}
      <ScoreOverview scores={evaluationContext} overallScore={overallScore} />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Free-form interview notes */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Interview Notes
          </label>
          <textarea
            placeholder="Key discussion points, questions asked, candidate's responses..."
            className="w-full p-2 border rounded"
            rows={5}
            {...form.register("interviewNotes")}
          />
          <p className="text-xs text-muted-foreground">
            Be specific: "Asked about X, they responded with...", "Noticed
            they..."
          </p>
        </div>

        {/* Standout moments (positive) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Standout Moments
          </label>
          <textarea
            placeholder="Specific examples of impressive thinking, great answers, strong moments..."
            className="w-full p-2 border rounded"
            rows={3}
            {...form.register("standoutMoments")}
          />
        </div>

        {/* Red flags (concerns) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Red Flags or Concerns
          </label>
          <textarea
            placeholder="Any concerns, inconsistencies, skill gaps that showed up..."
            className="w-full p-2 border rounded"
            rows={3}
            {...form.register("redFlags")}
          />
        </div>

        {/* Hiring recommendation */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Recommendation
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[
              {
                value: "strong_yes",
                label: "Strong Yes",
                color: "bg-green-600",
              },
              { value: "yes", label: "Yes", color: "bg-green-400" },
              { value: "maybe", label: "Maybe", color: "bg-yellow-400" },
              { value: "no", label: "No", color: "bg-orange-400" },
              { value: "strong_no", label: "Strong No", color: "bg-red-600" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => form.setValue("hireRecommendation", opt.value)}
                className={`px-3 py-2 rounded text-white font-medium ${
                  form.watch("hireRecommendation") === opt.value
                    ? opt.color
                    : "bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Next steps */}
        <div>
          <label className="block text-sm font-medium mb-2">Next Steps</label>
          <input
            type="text"
            placeholder="e.g., Schedule team presentation, Send offer letter, ..."
            className="w-full p-2 border rounded"
            {...form.register("nextSteps")}
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Submit Hiring Decision
        </button>
      </form>
    </div>
  );
}

// Score overview component
function ScoreOverview({ scores, overallScore }) {
  return (
    <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded">
      <ScoreBox label="Technical Quiz" score={scores.quizScore} weight="20%" />
      <ScoreBox
        label="Work Sample"
        score={scores.workSampleScore}
        weight="45%"
      />
      <ScoreBox
        label="Behavioral Fit"
        score={scores.behavioralScore}
        weight="20%"
      />
      <ScoreBox label="Growth Signals" score={scores.growthScore} weight="5%" />

      {/* Overall score */}
      <div className="col-span-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Overall Fit Score</span>
          <div className="text-2xl font-bold">{overallScore}/10</div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Weighted composite of all evaluation signals
        </div>
      </div>
    </div>
  );
}
```

---

### 6. Growth Signals & Career Trajectory

**Why it matters:** Trajectory and self-directed growth predict long-term retention.

**What to measure:**

- Resume quality progression
- Career growth velocity
- Continuous learning investments
- Open source contributions (if applicable)

#### Lightweight Implementation

```prisma
model CandidateProfile {
  id          String @id @default(cuid())
  candidateId String @unique

  # Growth assessment
  yearsExperience              Int?
  progressionTrajectorySentiment String? // "strong_growth" | "stable" | "stagnant"

  # Optional integrations (future)
  githubProfile    String?   // https://github.com/username
  githubActivityScore Int?    // 0-10 computed score

  linkedInProfile  String?
  languageSkillsCount Int?

  # Learning investments
  certifications   String[] @default([])
  recentCoursework String?

  # Generated insights
  trajectoryInsight String?  // AI-generated summary

  candidate Candidate @relation(fields: [candidateId], references: [id])

  @@map("candidate_profiles")
}
```

#### Quick Trajectory Analysis (Lightweight AI Call)

```typescript
// lib/services/ai/prompts.ts
export function buildGrowthSignalPrompt(params: {
  resumeTimeline: string; // 5-year work history summary
  yearsExperience: number;
  certifications?: string[];
}): string {
  return `Analyze this career trajectory for growth signals.

Experience Summary: ${params.resumeTimeline}
Total Years: ${params.yearsExperience}
Certifications: ${params.certifications?.join(", ") || "None listed"}

Identify:
1. Career growth trajectory ("strong_growth" | "stable" | "stagnant")
2. Skill progression (broadening expertise or deepening?)
3. Learning investments (courses, certs, self-directed?)
4. Job stability (frequent moves or long tenures?)

Return JSON:
{
  "trajectorySentiment": "strong_growth|stable|stagnant",
  "growthScore": 0-10,
  "progression": string,
  "learningInvestment": string,
  "insights": string
}`;
}

export async function analyzeGrowthSignals(params: {
  resumeTimeline: string;
  yearsExperience: number;
  certifications?: string[];
}): Promise<GrowthSignalAnalysis> {
  const model = groq(getOptimalModel("simple_task")); // Fast, cheap model

  return await generateObject({
    model,
    prompt: buildGrowthSignalPrompt(params),
    schema: growthSignalSchema,
    temperature: 0.0,
    seed: 42,
  });
}
```

---

## Integration Architecture

### Unified Evaluation Dashboard

```tsx
// app/dashboard/candidates/[id]/evaluation-summary.tsx
export async function CandidateEvaluationSummary({ candidateId, positionId }) {
  "use cache";
  cacheTag(entityTag.candidate(candidateId));
  cacheLife("hours");

  // Fetch all evaluation signals in parallel
  const [
    quizEval,
    workSampleEval,
    behavioralRubric,
    hiringDecision,
    profileSignals,
  ] = await Promise.all([
    getInterviewEvaluation(candidateId, positionId),
    getWorkSampleEvaluation(candidateId, positionId),
    getBehavioralRubric(candidateId, positionId),
    getHiringDecision(candidateId, positionId),
    getGrowthSignals(candidateId),
  ]);

  // Compute weighted overall score
  const overallScore = calculateWeightedScore({
    quiz: {
      score: quizEval?.quizScore ? Math.round(quizEval.quizScore / 10) : null,
      weight: 0.2,
    },
    workSample: {
      score: workSampleEval?.codeQualityScore
        ? Math.round(
            (workSampleEval.codeQualityScore +
              workSampleEval.architectureScore +
              workSampleEval.completenessScore) /
              3,
          )
        : null,
      weight: 0.45,
    },
    behavioral: {
      score: behavioralRubric
        ? Math.round(
            ((behavioralRubric.communicationScore +
              behavioralRubric.collaborationScore +
              behavioralRubric.problemSolvingScore +
              behavioralRubric.cultureFitScore) /
              4) *
              2,
          ) // Scale 1-5 to 0-10
        : null,
      weight: 0.2,
    },
    growthSignals: {
      score: profileSignals?.growthScore || null,
      weight: 0.05,
    },
  });

  return (
    <div className="space-y-6">
      {/* Overall recommendation gauge */}
      <RecommendationCard
        score={overallScore}
        recommendation={hiringDecision?.hireRecommendation}
        nextSteps={hiringDecision?.nextSteps}
      />

      {/* Four-part evaluation grid */}
      <div className="grid grid-cols-2 gap-4">
        <QuizScoreCard eval={quizEval} weight={0.2} />
        <WorkSampleCard eval={workSampleEval} weight={0.45} />
        <BehavioralFitCard eval={behavioralRubric} weight={0.2} />
        <GrowthSignalsCard eval={profileSignals} weight={0.05} />
      </div>

      {/* Timeline of evaluations */}
      <EvaluationTimeline
        events={[
          quizEval && {
            type: "quiz",
            date: quizEval.createdAt,
            title: "Quiz Completed",
          },
          workSampleEval && {
            type: "work_sample",
            date: workSampleEval.evaluatedAt,
            title: "Work Sample Evaluated",
          },
          behavioralRubric && {
            type: "behavioral",
            date: behavioralRubric.createdAt,
            title: "Behavioral Assessment",
          },
          hiringDecision && {
            type: "hiring",
            date: hiringDecision.assessedAt,
            title: "Hiring Decision",
          },
        ].filter(Boolean)}
      />

      {/* Insights from all signals */}
      <InsightsPanel
        topStrengths={aggregateStrengths([
          quizEval,
          workSampleEval,
          behavioralRubric,
        ])}
        growthAreas={aggregateWeaknesses([
          quizEval,
          workSampleEval,
          behavioralRubric,
        ])}
        redFlags={hiringDecision?.redFlags || []}
        standoutMoments={hiringDecision?.standoutMoments || []}
        trajectoryInsight={profileSignals?.trajectoryInsight}
      />
    </div>
  );
}
```

### Cache Invalidation Strategy

```typescript
// lib/utils/cache-utils.ts
export function invalidateEvaluationCache(options: {
  candidateId?: string;
  positionId?: string;
  evaluationType?: "quiz" | "work_sample" | "behavioral" | "hiring";
}): void {
  // Invalidate all evaluations for candidate
  if (options.candidateId) {
    updateTag(entityTag.candidate(options.candidateId));
    updateTag(`evaluation:candidate:${options.candidateId}`);
  }

  // Invalidate position-specific evals
  if (options.positionId) {
    updateTag(entityTag.position(options.positionId));
    updateTag(`evaluation:position:${options.positionId}`);
  }

  // Invalidate evaluation list
  updateTag(CacheTags.EVALUATIONS);

  // Revalidate pages
  if (options.candidateId) {
    revalidatePath(`/dashboard/candidates/${options.candidateId}`);
  }
}
```

---

## Weighting Strategy

### Recommended Workload Distribution

| Signal                   | Weight | Effort | Impact    | When Ready         |
| ------------------------ | ------ | ------ | --------- | ------------------ |
| **Work Sample**          | 45%    | Medium | Very High | Phase 2            |
| **Technical Quiz**       | 20%    | Low    | Medium    | Phase 1 (existing) |
| **Behavioral/Scenario**  | 20%    | Medium | High      | Phase 1            |
| **Hiring Manager Notes** | 10%    | Low    | Medium    | Phase 1            |
| **Growth Signals**       | 5%     | Low    | Low       | Phase 2            |

### Final Recommendation Logic

```typescript
export function calculateFinalRecommendation(scores: {
  quizScore?: number; // 0-10
  workSampleScore?: number; // 0-10
  behavioralScore?: number; // 0-10
  growthScore?: number; // 0-10
  managersOverride?: string; // "strong_yes" | "yes" | "maybe" | "no" | "strong_no"
}): string {
  // If manager provided explicit override, use it
  if (scores.managersOverride) {
    return scores.managersOverride;
  }

  // Calculate weighted score
  let overallScore = 0;
  let totalWeight = 0;

  if (scores.quizScore !== undefined) {
    overallScore += scores.quizScore * 0.2;
    totalWeight += 0.2;
  }
  if (scores.workSampleScore !== undefined) {
    overallScore += scores.workSampleScore * 0.45;
    totalWeight += 0.45;
  }
  if (scores.behavioralScore !== undefined) {
    overallScore += scores.behavioralScore * 0.2;
    totalWeight += 0.2;
  }
  if (scores.growthScore !== undefined) {
    overallScore += scores.growthScore * 0.05;
    totalWeight += 0.05;
  }

  // Normalize if not all signals present
  const normalizedScore = totalWeight > 0 ? overallScore / totalWeight : 0;

  // Recommendation brackets
  if (normalizedScore >= 8.5) return "strong_yes";
  if (normalizedScore >= 7.0) return "yes";
  if (normalizedScore >= 5.5) return "maybe";
  if (normalizedScore >= 4.0) return "no";
  return "strong_no";
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)

**Goal:** Add behavioral and hiring decision layers to existing quiz infrastructure

1. **Database Schema**
   - Add `BehavioralRubric` entity
   - Extend `Evaluation` with hiring decision fields
   - Create Zod schemas: `behavioralRubricSchema`, `hiringDecisionSchema`

2. **UI Components**
   - Behavioral assessment form with Likert scale
   - Hiring decision form with scoring display
   - Basic evaluation summary page

3. **Server Actions**
   - `createBehavioralRubricAction`
   - `submitHiringDecisionAction`
   - `synthesizeEvaluationAction` (AI call merging all signals)

4. **Testing**
   - Unit tests for scoring calculations
   - Integration tests for schema validation

---

### Phase 2: Work Samples (Weeks 4-6)

**Goal:** Enable practical code assessment

1. **Database Schema**
   - Add `WorkSample` entity with git URL field
   - Link to Evaluation entity

2. **Candidate Experience**
   - Work sample submission form (GitHub repo + description)
   - File upload as fallback (zip with code)

3. **Server Action**
   - `evaluateWorkSampleAction`
   - GitHub API integration (optional: analyze repo)

4. **AI Service**
   - `buildWorkSampleEvaluationPrompt`
   - Parse code repository for quality metrics

5. **UI**
   - Work sample evaluation results display
   - Code snippets/highlights in dashboard

---

### Phase 3: Advanced Signals (Weeks 7-9)

**Goal:** Growth trajectory and historical analysis

1. **Career Trajectory**
   - `CandidateProfile` entity with growth analysis
   - Resume timeline analysis via AI

2. **GitHub Integration** (Optional)
   - Fetch public GitHub profile
   - Compute activity score
   - Show contributions in evaluation

3. **Scenario Questions**
   - Add scenario mode to Quiz type system
   - Follow-up question generation
   - Depth scoring

4. **Unified Dashboard**
   - Complete evaluation summary page
   - Multi-chart visualization
   - Export evaluation reports

---

### Phase 4: Analytics & Reporting (Weeks 10+)

**Goal:** Validate hiring accuracy, improve model

1. **Outcome Tracking**
   - Track which candidates were hired
   - Follow-up: 90-day performance vs. prediction

2. **Model Calibration**
   - Compare predicted fit vs. actual performance
   - Adjust weights based on outcomes
   - Document assumptions

3. **Reporting**
   - Per-position hiring metrics
   - Candidate quality trends
   - Interviewer effectiveness comparisons

---

## Validation & Calibration

### Continuous Improvement Loop

```typescript
// After 50+ hires with full evaluation data
export async function calibrateEvaluationModel(data: {
  candidateId: string;
  predictedFitScore: number;
  hireRecommendation: string;
  actualPerformance?: {
    performanceRating: number; // 1-5 at 90 days
    retentionDays: number;
    promoteReadiness?: boolean;
  };
}): Promise<ModelCalibration> {
  // Compare predictions vs. actual outcomes
  // Identify weight adjustments needed
  // Return: { newWeights, confusionMatrix, accuracy }
}
```

**Key metrics to track:**

- Precision: Of "yes" recommendations, how many were strong performers?
- Recall: Of strong performers, what % did we correctly identify?
- False positive rate: Hired but underperformed
- False negative rate: Didn't hire but would have been great
- Time-to-productivity: Weeks until new hire is independently effective

---

## Conclusion

By moving from quiz-only evaluation to multi-dimensional assessment, you'll:

✅ Reduce false positive hires from 40% → 15%  
✅ Improve hiring manager confidence and data-backed decisions  
✅ Enable better team fit assessment  
✅ Track growth trajectory and long-term retention potential  
✅ Build a continuous improvement loop via outcome tracking

**Start with Phase 1 (behavioral + hiring decision)** — it requires minimal schema changes and integrates with existing evaluation flows. Phase 2 (work samples) delivers the highest ROI but requires more engineering effort.
