-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "promptHash" TEXT,
ADD COLUMN     "promptVersion" TEXT;

-- CreateTable
CREATE TABLE "score_overrides" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "score_overrides_evaluationId_idx" ON "score_overrides"("evaluationId");

-- AddForeignKey
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_overrides" ADD CONSTRAINT "score_overrides_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
