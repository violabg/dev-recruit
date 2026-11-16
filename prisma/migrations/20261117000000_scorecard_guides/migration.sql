-- CreateEnum
CREATE TYPE "CriterionCategory" AS ENUM ('technical', 'soft', 'culture');

-- CreateEnum
CREATE TYPE "CriterionPriority" AS ENUM ('must', 'nice');

-- CreateEnum
CREATE TYPE "CriterionSource" AS ENUM ('skill', 'softSkill', 'custom');

-- CreateEnum
CREATE TYPE "GuideSectionKind" AS ENUM ('intro', 'experience', 'technical', 'behavioral', 'candidate_questions', 'closing');

-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN     "answerEvaluations" JSONB,
ADD COLUMN     "criteriaAssessment" JSONB;

-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN     "criterionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

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
