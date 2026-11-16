-- Phase 1: the Application becomes the hub.
-- Renames (never drop and recreate), new columns, backfill, verification and,
-- only at the end, removal of the old columns. Every existing row is kept.
-- The whole migration runs in one transaction: any failed check rolls it back.

BEGIN;

-- ============================================================================
-- 1. Emails: normalise, then refuse duplicates
-- ============================================================================

UPDATE "candidates" SET "email" = lower(trim("email"));

DO $$
DECLARE
  duplicated TEXT;
BEGIN
  SELECT string_agg("email", ', ' ORDER BY "email")
    INTO duplicated
    FROM (
      SELECT "email"
        FROM "candidates"
       GROUP BY "email"
      HAVING count(*) > 1
    ) AS d;

  IF duplicated IS NOT NULL THEN
    RAISE EXCEPTION 'Candidati duplicati per email: %', duplicated;
  END IF;
END $$;

-- ============================================================================
-- 2. Enums
-- ============================================================================

CREATE TYPE "ApplicationStage" AS ENUM ('applied', 'screening', 'assessment', 'interview', 'decision', 'offer', 'hired', 'rejected', 'withdrawn');

CREATE TYPE "PositionStatus" AS ENUM ('draft', 'open', 'closed');

ALTER TYPE "InterviewStatus" RENAME TO "AssessmentStatus";

-- ============================================================================
-- 3. Renames: tables, column, and every constraint and index that carries
--    the old name
-- ============================================================================

-- candidate_positions -> applications
ALTER TABLE "candidate_positions" RENAME TO "applications";
ALTER TABLE "applications" RENAME CONSTRAINT "candidate_positions_pkey" TO "applications_pkey";
ALTER TABLE "applications" RENAME CONSTRAINT "candidate_positions_candidateId_fkey" TO "applications_candidateId_fkey";
ALTER TABLE "applications" RENAME CONSTRAINT "candidate_positions_positionId_fkey" TO "applications_positionId_fkey";
ALTER INDEX "candidate_positions_candidateId_idx" RENAME TO "applications_candidateId_idx";
ALTER INDEX "candidate_positions_positionId_idx" RENAME TO "applications_positionId_idx";
ALTER INDEX "candidate_positions_candidateId_positionId_key" RENAME TO "applications_candidateId_positionId_key";

-- interviews -> assessments
ALTER TABLE "interviews" RENAME TO "assessments";
ALTER TABLE "assessments" RENAME CONSTRAINT "interviews_pkey" TO "assessments_pkey";
ALTER TABLE "assessments" RENAME CONSTRAINT "interviews_candidateId_fkey" TO "assessments_candidateId_fkey";
ALTER TABLE "assessments" RENAME CONSTRAINT "interviews_quizId_fkey" TO "assessments_quizId_fkey";
ALTER INDEX "interviews_token_key" RENAME TO "assessments_token_key";

-- evaluations.interviewId -> evaluations.assessmentId
ALTER TABLE "evaluations" RENAME COLUMN "interviewId" TO "assessmentId";
ALTER TABLE "evaluations" RENAME CONSTRAINT "evaluations_interviewId_fkey" TO "evaluations_assessmentId_fkey";
ALTER INDEX "evaluations_interviewId_key" RENAME TO "evaluations_assessmentId_key";

-- ============================================================================
-- 4. New columns
-- ============================================================================

ALTER TABLE "applications"
  ADD COLUMN "stage" "ApplicationStage" NOT NULL DEFAULT 'applied',
  ADD COLUMN "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "ownerId" TEXT,
  ADD COLUMN "decision" TEXT,
  ADD COLUMN "decisionRationale" TEXT,
  ADD COLUMN "decidedBy" TEXT,
  ADD COLUMN "decidedAt" TIMESTAMP(3),
  ADD COLUMN "decisionWeights" JSONB;

ALTER TABLE "positions"
  ADD COLUMN "status" "PositionStatus" NOT NULL DEFAULT 'draft';

ALTER TABLE "candidates"
  ADD COLUMN "doNotContact" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "doNotContactNote" TEXT;

-- Nullable until the backfill has filled it
ALTER TABLE "assessments"
  ADD COLUMN "applicationId" TEXT;

-- ============================================================================
-- 5. Backfill (before any column removal)
-- ============================================================================

-- Every existing position is open
UPDATE "positions" SET "status" = 'open';

-- Owner = the recruiter who entered the candidate; stage date = link date
UPDATE "applications" a
   SET "ownerId" = c."createdBy",
       "stageChangedAt" = a."createdAt"
  FROM "candidates" c
 WHERE c."id" = a."candidateId";

-- Primary application: stage from the candidate status
UPDATE "applications" a
   SET "stage" = (
     CASE c."status"
       WHEN 'pending' THEN 'applied'
       WHEN 'contacted' THEN 'screening'
       WHEN 'interviewing' THEN
         CASE WHEN EXISTS (
           SELECT 1
             FROM "assessments" s
             JOIN "quizzes" q ON q."id" = s."quizId"
            WHERE s."candidateId" = a."candidateId"
              AND q."positionId" = a."positionId"
         ) THEN 'assessment' ELSE 'interview' END
       WHEN 'hired' THEN 'hired'
       WHEN 'rejected' THEN 'rejected'
       ELSE 'applied'
     END
   )::"ApplicationStage"
  FROM "candidates" c
 WHERE c."id" = a."candidateId"
   AND a."isPrimary" = true;

-- Other applications: assessment when a test was sent, else applied
UPDATE "applications" a
   SET "stage" = (
     CASE WHEN EXISTS (
       SELECT 1
         FROM "assessments" s
         JOIN "quizzes" q ON q."id" = s."quizId"
        WHERE s."candidateId" = a."candidateId"
          AND q."positionId" = a."positionId"
     ) THEN 'assessment' ELSE 'applied' END
   )::"ApplicationStage"
 WHERE a."isPrimary" = false;

-- Tests whose application no longer exists: recreate it as withdrawn
INSERT INTO "applications" ("id", "candidateId", "positionId", "stage", "stageChangedAt", "createdAt")
SELECT 'app_' || md5(random()::text || clock_timestamp()::text || m."candidateId" || m."positionId"),
       m."candidateId",
       m."positionId",
       'withdrawn'::"ApplicationStage",
       m."firstAt",
       m."firstAt"
  FROM (
    SELECT s."candidateId",
           q."positionId",
           min(s."createdAt") AS "firstAt"
      FROM "assessments" s
      JOIN "quizzes" q ON q."id" = s."quizId"
     WHERE NOT EXISTS (
       SELECT 1
         FROM "applications" a
        WHERE a."candidateId" = s."candidateId"
          AND a."positionId" = q."positionId"
     )
     GROUP BY s."candidateId", q."positionId"
  ) AS m;

-- Every test belongs to the application of its candidate on its quiz position
UPDATE "assessments" s
   SET "applicationId" = a."id"
  FROM "quizzes" q, "applications" a
 WHERE q."id" = s."quizId"
   AND a."candidateId" = s."candidateId"
   AND a."positionId" = q."positionId";

-- ============================================================================
-- 6. Verification of the backfill
-- ============================================================================

DO $$
DECLARE
  missing INTEGER;
  unknown INTEGER;
  hired_mismatch INTEGER;
  rejected_mismatch INTEGER;
BEGIN
  SELECT count(*) INTO missing FROM "assessments" WHERE "applicationId" IS NULL;
  IF missing > 0 THEN
    RAISE EXCEPTION 'Test senza candidatura dopo il backfill: %', missing;
  END IF;

  SELECT count(*) INTO unknown
    FROM "candidates"
   WHERE "status" NOT IN ('pending', 'contacted', 'interviewing', 'hired', 'rejected');
  IF unknown > 0 THEN
    RAISE EXCEPTION 'Candidati con uno stato sconosciuto: %', unknown;
  END IF;

  SELECT count(*) INTO hired_mismatch
    FROM "applications" a
    JOIN "candidates" c ON c."id" = a."candidateId"
   WHERE a."isPrimary" = true
     AND c."status" = 'hired'
     AND a."stage" <> 'hired';
  IF hired_mismatch > 0 THEN
    RAISE EXCEPTION 'Candidature primarie di candidati assunti non in fase hired: %', hired_mismatch;
  END IF;

  SELECT count(*) INTO rejected_mismatch
    FROM "applications" a
    JOIN "candidates" c ON c."id" = a."candidateId"
   WHERE a."isPrimary" = true
     AND c."status" = 'rejected'
     AND a."stage" <> 'rejected';
  IF rejected_mismatch > 0 THEN
    RAISE EXCEPTION 'Candidature primarie di candidati scartati non in fase rejected: %', rejected_mismatch;
  END IF;
END $$;

-- ============================================================================
-- 7. Constraints and indexes
-- ============================================================================

ALTER TABLE "assessments" ALTER COLUMN "applicationId" SET NOT NULL;

ALTER TABLE "assessments" ADD CONSTRAINT "assessments_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "applications" ADD CONSTRAINT "applications_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "applications" ADD CONSTRAINT "applications_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "assessments_applicationId_idx" ON "assessments"("applicationId");

CREATE INDEX "applications_stage_idx" ON "applications"("stage");

CREATE INDEX "applications_ownerId_idx" ON "applications"("ownerId");

CREATE INDEX "positions_status_idx" ON "positions"("status");

CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- ============================================================================
-- 8. Removal of the columns the backfill read
-- ============================================================================

ALTER TABLE "candidates" DROP COLUMN "status";

ALTER TABLE "applications" DROP COLUMN "isPrimary";

COMMIT;
