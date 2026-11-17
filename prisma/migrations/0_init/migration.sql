-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('draft', 'open', 'closed');

-- CreateEnum
CREATE TYPE "CriterionCategory" AS ENUM ('technical', 'soft', 'culture');

-- CreateEnum
CREATE TYPE "CriterionPriority" AS ENUM ('must', 'nice');

-- CreateEnum
CREATE TYPE "CriterionSource" AS ENUM ('skill', 'softSkill', 'custom');

-- CreateEnum
CREATE TYPE "GuideSectionKind" AS ENUM ('intro', 'experience', 'technical', 'behavioral', 'candidate_questions', 'closing');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('applied', 'screening', 'assessment', 'interview', 'decision', 'offer', 'hired', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "InterviewParticipantRole" AS ENUM ('lead', 'observer');

-- CreateEnum
CREATE TYPE "KitStatus" AS ENUM ('draft', 'ready');

-- CreateEnum
CREATE TYPE "KitItemOrigin" AS ENUM ('template', 'cv', 'resume_gap', 'quiz_answer', 'previous_round', 'manual');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('multiple_choice', 'open_question', 'code_snippet', 'behavioral_scenario');

-- CreateEnum
CREATE TYPE "ExpectedResponseLength" AS ENUM ('short', 'medium', 'long');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'user',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "isAnonymous" BOOLEAN,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "userName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "experienceLevel" TEXT NOT NULL,
    "skills" TEXT[],
    "softSkills" TEXT[],
    "contractType" TEXT,
    "status" "PositionStatus" NOT NULL DEFAULT 'draft',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scorecards" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scorecard_criteria" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "CriterionCategory" NOT NULL,
    "priority" "CriterionPriority" NOT NULL,
    "weight" INTEGER NOT NULL,
    "expectedLevel" INTEGER NOT NULL,
    "anchors" JSONB,
    "source" "CriterionSource" NOT NULL,
    "order" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scorecard_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_guides" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_sections" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" "GuideSectionKind" NOT NULL,

    CONSTRAINT "guide_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_questions" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "followUps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criterionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "anchors" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "guide_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "resumeUrl" TEXT,
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "doNotContactNote" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'applied',
    "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT,
    "decision" TEXT,
    "decisionRationale" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionWeights" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "guideId" TEXT,
    "round" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "meetingUrl" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'scheduled',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_participants" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "InterviewParticipantRole" NOT NULL,

    CONSTRAINT "interview_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_kits" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "status" "KitStatus" NOT NULL DEFAULT 'draft',
    "briefing" JSONB,
    "hypotheses" JSONB,
    "checklist" JSONB NOT NULL,
    "missingSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_sections" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" "GuideSectionKind" NOT NULL,

    CONSTRAINT "kit_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_items" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "followUps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criterionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "anchors" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "origin" "KitItemOrigin" NOT NULL,
    "rationale" TEXT,
    "sourceRef" TEXT,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "covered" BOOLEAN NOT NULL DEFAULT false,
    "coveredAt" TIMESTAMP(3),

    CONSTRAINT "kit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_item_notes" (
    "id" TEXT NOT NULL,
    "kitItemId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "note" TEXT,
    "score" INTEGER,
    "evidenceQuote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kit_item_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviewer_feedback" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "hireRecommendation" TEXT,
    "notes" TEXT,
    "redFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "standoutMoments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviewer_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterion_scores" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "evidence" TEXT,

    CONSTRAINT "criterion_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "timeLimit" INTEGER,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "answers" JSONB,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "explanation" TEXT,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correctAnswer" INTEGER,
    "sampleAnswer" TEXT,
    "codeSnippet" TEXT,
    "sampleSolution" TEXT,
    "language" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "criterionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assessmentId" TEXT,
    "candidateId" TEXT,
    "positionId" TEXT,
    "evaluation" TEXT,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weaknesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendation" TEXT,
    "fitScore" INTEGER,
    "quizScore" INTEGER,
    "answerEvaluations" JSONB,
    "criteriaAssessment" JSONB,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "instructions" TEXT,
    "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "distractorComplexity" TEXT,
    "expectedResponseLength" "ExpectedResponseLength",
    "evaluationCriteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT,
    "bugType" TEXT,
    "codeComplexity" TEXT,
    "includeComments" BOOLEAN,
    "tags" TEXT[],
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_data" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "positions_status_idx" ON "positions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "scorecards_positionId_key" ON "scorecards"("positionId");

-- CreateIndex
CREATE INDEX "scorecard_criteria_scorecardId_idx" ON "scorecard_criteria"("scorecardId");

-- CreateIndex
CREATE INDEX "interview_guides_positionId_idx" ON "interview_guides"("positionId");

-- CreateIndex
CREATE INDEX "guide_sections_guideId_idx" ON "guide_sections"("guideId");

-- CreateIndex
CREATE INDEX "guide_questions_sectionId_idx" ON "guide_questions"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "applications_candidateId_idx" ON "applications"("candidateId");

-- CreateIndex
CREATE INDEX "applications_positionId_idx" ON "applications"("positionId");

-- CreateIndex
CREATE INDEX "applications_stage_idx" ON "applications"("stage");

-- CreateIndex
CREATE INDEX "applications_ownerId_idx" ON "applications"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidateId_positionId_key" ON "applications"("candidateId", "positionId");

-- CreateIndex
CREATE INDEX "interviews_applicationId_idx" ON "interviews"("applicationId");

-- CreateIndex
CREATE INDEX "interviews_status_scheduledAt_idx" ON "interviews"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "interview_participants_userId_idx" ON "interview_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_participants_interviewId_userId_key" ON "interview_participants"("interviewId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_kits_interviewId_key" ON "interview_kits"("interviewId");

-- CreateIndex
CREATE INDEX "kit_sections_kitId_idx" ON "kit_sections"("kitId");

-- CreateIndex
CREATE INDEX "kit_items_kitId_idx" ON "kit_items"("kitId");

-- CreateIndex
CREATE INDEX "kit_items_sectionId_idx" ON "kit_items"("sectionId");

-- CreateIndex
CREATE INDEX "kit_item_notes_participantId_idx" ON "kit_item_notes"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "kit_item_notes_kitItemId_participantId_key" ON "kit_item_notes"("kitItemId", "participantId");

-- CreateIndex
CREATE INDEX "interviewer_feedback_interviewerId_idx" ON "interviewer_feedback"("interviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "interviewer_feedback_interviewId_interviewerId_key" ON "interviewer_feedback"("interviewId", "interviewerId");

-- CreateIndex
CREATE INDEX "criterion_scores_criterionId_idx" ON "criterion_scores"("criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "criterion_scores_feedbackId_criterionId_key" ON "criterion_scores"("feedbackId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_token_key" ON "assessments"("token");

-- CreateIndex
CREATE INDEX "assessments_applicationId_idx" ON "assessments"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_questions_quizId_questionId_key" ON "quiz_questions"("quizId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_assessmentId_key" ON "evaluations"("assessmentId");

-- CreateIndex
CREATE INDEX "evaluations_candidateId_idx" ON "evaluations"("candidateId");

-- CreateIndex
CREATE INDEX "evaluations_positionId_idx" ON "evaluations"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "presets_name_key" ON "presets"("name");

-- CreateIndex
CREATE INDEX "reference_data_category_isActive_order_idx" ON "reference_data"("category", "isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "category_label" ON "reference_data"("category", "label");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorecards" ADD CONSTRAINT "scorecards_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scorecard_criteria" ADD CONSTRAINT "scorecard_criteria_scorecardId_fkey" FOREIGN KEY ("scorecardId") REFERENCES "scorecards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_guides" ADD CONSTRAINT "interview_guides_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_guides" ADD CONSTRAINT "interview_guides_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_sections" ADD CONSTRAINT "guide_sections_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "interview_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide_questions" ADD CONSTRAINT "guide_questions_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "guide_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "interview_guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_participants" ADD CONSTRAINT "interview_participants_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_participants" ADD CONSTRAINT "interview_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_kits" ADD CONSTRAINT "interview_kits_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_sections" ADD CONSTRAINT "kit_sections_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "interview_kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "interview_kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_items" ADD CONSTRAINT "kit_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "kit_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_item_notes" ADD CONSTRAINT "kit_item_notes_kitItemId_fkey" FOREIGN KEY ("kitItemId") REFERENCES "kit_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_item_notes" ADD CONSTRAINT "kit_item_notes_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "interview_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviewer_feedback" ADD CONSTRAINT "interviewer_feedback_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviewer_feedback" ADD CONSTRAINT "interviewer_feedback_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterion_scores" ADD CONSTRAINT "criterion_scores_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "interviewer_feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "criterion_scores" ADD CONSTRAINT "criterion_scores_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "scorecard_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

