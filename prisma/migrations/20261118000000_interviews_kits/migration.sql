-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "InterviewParticipantRole" AS ENUM ('lead', 'observer');

-- CreateEnum
CREATE TYPE "KitStatus" AS ENUM ('draft', 'ready');

-- CreateEnum
CREATE TYPE "KitItemOrigin" AS ENUM ('template', 'cv', 'resume_gap', 'quiz_answer', 'previous_round', 'manual');

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
